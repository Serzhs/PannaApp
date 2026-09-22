import {
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ERROR_CODES, imageKeySchema, nestPath, type ResponseOf } from '@panna/shared';
import type { Response } from 'express';
import { memoryStorage } from 'multer';

import { AppException } from '../../common/app-exception.js';
import { AuthGuard } from '../auth/auth.guard.js';

import { ImagesService } from './images.service.js';

/** A phone photo is 3 to 12 MB; anything larger is not a photo of dinner. */
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

@Controller()
export class ImagesController {
  constructor(private readonly images: ImagesService) {}

  @Post(nestPath('uploadImage'))
  @HttpCode(201)
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async upload(@UploadedFile() file?: Express.Multer.File): Promise<ResponseOf<'uploadImage'>> {
    if (file === undefined) {
      throw new AppException(400, ERROR_CODES.IMAGE_UNSUPPORTED, 'No file field in the upload');
    }
    return { key: await this.images.store(file.buffer) };
  }

  /**
   * Unauthenticated on purpose: the key is 128 bits of randomness, which is the
   * permission check, and an <Image> tag cannot carry a bearer token anyway.
   */
  @Get('images/:key')
  async serve(@Param('key') key: string, @Res() res: Response): Promise<void> {
    if (!imageKeySchema.safeParse(key).success || !(await this.images.exists(key))) {
      throw new AppException(404, ERROR_CODES.IMAGE_NOT_FOUND, 'No such image');
    }
    // The bytes behind a key never change, so a client may keep them for as long as it likes.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.type('image/jpeg');
    await new Promise<void>((resolve, reject) => {
      res.sendFile(this.images.pathOf(key), (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}
