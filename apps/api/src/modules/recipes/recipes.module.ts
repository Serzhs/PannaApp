import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../db/database.module.js';
import { ImagesModule } from '../images/images.module.js';

import { RecipeOwnerGuard } from './recipe-owner.guard.js';
import { RecipesController } from './recipes.controller.js';
import { RecipesService } from './recipes.service.js';

@Module({
  imports: [DatabaseModule, ImagesModule],
  controllers: [RecipesController],
  providers: [RecipesService, RecipeOwnerGuard],
  exports: [RecipesService],
})
export class RecipesModule {}
