import { randomBytes } from 'node:crypto';
import { copyFile, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ERROR_CODES, imageKeySchema } from '@panna/shared';
import sharp from 'sharp';

import { AppException } from '../../common/app-exception.js';
import type { Env } from '../../config/env.js';

/** Long enough for any phone screen, small enough that a list of them scrolls. */
const LONG_SIDE = 1600;
const JPEG_QUALITY = 82;

/**
 * Files on disk, keys in the database, per the Images section of CLAUDE.md. Every
 * upload is turned upright, shrunk and re-encoded, and the original is not kept: a phone
 * photo is 3 to 12 MB and carries the GPS coordinates of the kitchen it was taken in.
 */
@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);
  private readonly dir: string;

  constructor(config: ConfigService<Env, true>) {
    this.dir = config.get('IMAGE_DIR', { infer: true });
  }

  /** Root and name apart: Express refuses a dotfile anywhere in a path it is handed whole, and ~/.panna is one. */
  get root(): string {
    return this.dir;
  }

  fileNameOf(key: string): string {
    return `${key}.jpg`;
  }

  pathOf(key: string): string {
    return join(this.dir, this.fileNameOf(key));
  }

  async store(bytes: Buffer): Promise<string> {
    let out: Buffer;
    try {
      // rotate() with no argument applies the orientation tag, and without
      // withMetadata() nothing else from the original survives the re-encode.
      out = await sharp(bytes, { failOn: 'error' })
        .rotate()
        .resize({ width: LONG_SIDE, height: LONG_SIDE, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toBuffer();
    } catch {
      throw new AppException(400, ERROR_CODES.IMAGE_UNSUPPORTED, 'Not an image this API can read');
    }
    await mkdir(this.dir, { recursive: true });
    const key = randomBytes(16).toString('hex');
    await writeFile(this.pathOf(key), out, { flag: 'wx' });
    return key;
  }

  /** A second file under a new key (0017), so two recipes never share one. Null when the source is gone. */
  async duplicate(key: string): Promise<string | null> {
    if (!(await this.exists(key))) return null;
    const fresh = randomBytes(16).toString('hex');
    await copyFile(this.pathOf(key), this.pathOf(fresh));
    return fresh;
  }

  async exists(key: string): Promise<boolean> {
    if (!imageKeySchema.safeParse(key).success) return false;
    try {
      return (await stat(this.pathOf(key))).isFile();
    } catch {
      return false;
    }
  }

  /** Best effort: a file that is already gone is not an error worth a failed request. */
  async remove(keys: readonly (string | null)[]): Promise<void> {
    for (const key of keys) {
      if (key === null || !imageKeySchema.safeParse(key).success) continue;
      try {
        await rm(this.pathOf(key), { force: true });
      } catch (error: unknown) {
        this.logger.warn(`Could not delete image ${key}: ${String(error)}`);
      }
    }
  }
}
