import { Body, Controller, Patch, Req, UseGuards } from '@nestjs/common';
import {
  ERROR_CODES,
  nestPath,
  updateMeBodySchema,
  type ResponseOf,
  type UpdateMeBody,
} from '@panna/shared';

import { AppException } from '../../common/app-exception.js';
import { ZodBody } from '../../common/zod-body.pipe.js';
import { AuthGuard, type AuthedRequest } from '../auth/auth.guard.js';

import { UsersService } from './users.service.js';

@Controller()
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch(nestPath('updateMe'))
  async updateMe(
    @Req() request: AuthedRequest,
    @Body(new ZodBody(updateMeBodySchema)) body: UpdateMeBody,
  ): Promise<ResponseOf<'updateMe'>> {
    const updated =
      request.userId === undefined ? undefined : await this.users.update(request.userId, body);
    if (updated === undefined) {
      throw new AppException(401, ERROR_CODES.AUTH_TOKEN_INVALID, 'Token names no user');
    }
    return updated;
  }
}
