import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../db/database.module.js';

import { RecipeOwnerGuard } from './recipe-owner.guard.js';
import { RecipesController } from './recipes.controller.js';
import { RecipesService } from './recipes.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [RecipesController],
  providers: [RecipesService, RecipeOwnerGuard],
})
export class RecipesModule {}
