import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MenuCategory,
  MenuCategorySchema,
} from './schemas/menu-category.schema.js';
import { MenuItem, MenuItemSchema } from './schemas/menu-item.schema.js';
import { Schema } from 'mongoose';
import {
  Restaurant,
  RestaurantSchema,
} from '../restaurants/schemas/restaurant.schema.js';
import { MenusService } from './menus.service.js';
import { IngestionErrorsModule } from '../ingestion/ingestion-errors.module.js';
import {
  IngestionRun,
  IngestionRunSchema,
} from '../ingestion/schemas/ingestion-run.schema.js';

const RawMenuSchema = new Schema(
  {},
  {
    strict: false,
    collection: 'raw_restaurant_details',
  },
);

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        {
          name: 'RawMenu',
          schema: RawMenuSchema,
        },
      ],
      'raw',
    ),
    MongooseModule.forFeature(
      [
        {
          name: Restaurant.name,
          schema: RestaurantSchema,
        },
        {
          name: MenuCategory.name,
          schema: MenuCategorySchema,
        },
        {
          name: MenuItem.name,
          schema: MenuItemSchema,
        },
        {
          name: IngestionRun.name,
          schema: IngestionRunSchema,
        },
      ],
      'normalized',
    ),

    IngestionErrorsModule,
  ],
  providers: [MenusService],
  exports: [MenusService],
})
export class MenusModule {}
