import { Injectable } from '@nestjs/common';
import type { SessionUser, UpdateMeBody } from '@panna/shared';
import { eq } from 'drizzle-orm';

import { DatabaseService } from '../../db/database.service.js';
import { users } from '../../db/schema/index.js';
import { SESSION_USER_COLUMNS } from '../auth/auth.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Stores the preference and nothing more. The server never resolves a null against
   * the device, because the device is the one thing it cannot see.
   */
  async update(id: string, body: UpdateMeBody): Promise<SessionUser | undefined> {
    const [row] = await this.database.db
      .update(users)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning(SESSION_USER_COLUMNS);
    return row;
  }
}
