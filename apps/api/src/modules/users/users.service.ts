import { Injectable } from '@nestjs/common';
import { ERROR_CODES, type SessionUser, type UpdateMeBody } from '@panna/shared';
import { eq } from 'drizzle-orm';

import { AppException } from '../../common/app-exception.js';
import { DatabaseService } from '../../db/database.service.js';
import { users } from '../../db/schema/index.js';
import { SESSION_USER_COLUMNS } from '../auth/auth.service.js';
import { ImagesService } from '../images/images.service.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly images: ImagesService,
  ) {}

  /**
   * Stores the preference and nothing more. The server never resolves a null against
   * the device, because the device is the one thing it cannot see. An avatar key with
   * no file behind it is refused by field, like a recipe photo (0018), and the file a
   * new key or a null replaces is removed only once the row holds the change.
   */
  async update(id: string, body: UpdateMeBody): Promise<SessionUser | undefined> {
    if (body.avatarImageKey != null && !(await this.images.exists(body.avatarImageKey))) {
      throw new AppException(
        400,
        ERROR_CODES.VALIDATION_FAILED,
        'A key names an image that does not exist',
        { avatarImageKey: 'UNKNOWN_IMAGE' },
      );
    }
    const [before] = await this.database.db
      .select({ avatarImageKey: users.avatarImageKey })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    const [row] = await this.database.db
      .update(users)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning(SESSION_USER_COLUMNS);
    const previous = before?.avatarImageKey ?? null;
    if (row !== undefined && previous !== null && previous !== row.avatarImageKey) {
      await this.images.remove([previous]);
    }
    return row;
  }
}
