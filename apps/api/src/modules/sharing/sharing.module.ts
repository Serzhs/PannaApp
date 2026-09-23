import { Module } from '@nestjs/common';

import { RecipesModule } from '../recipes/recipes.module.js';

import { SharingController } from './sharing.controller.js';

@Module({
  imports: [RecipesModule],
  controllers: [SharingController],
})
export class SharingModule {}
