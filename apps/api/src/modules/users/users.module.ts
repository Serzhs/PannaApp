import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../db/database.module.js';
import { ImagesModule } from '../images/images.module.js';

import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [DatabaseModule, ImagesModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
