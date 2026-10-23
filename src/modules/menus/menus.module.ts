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

const RawMenuSchema = new Schema(
  {},
  {
    strict: false,
    collection: 'raw_menus',
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
      ],
      'normalized',
    ),

    IngestionErrorsModule,
  ],
  providers: [MenusService],
  exports: [MenusService],
})
export class MenusModule {}
