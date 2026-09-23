import { Module } from '@nestjs/common';

import { RecipesModule } from '../recipes/recipes.module.js';

import { FeaturedController } from './featured.controller.js';

@Module({
  imports: [RecipesModule],
  controllers: [FeaturedController],
})
export class FeaturedModule {}
