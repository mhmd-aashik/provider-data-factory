import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuCategorySchema } from './schemas/menu-category.schema.js';
import { MenuItemSchema } from './schemas/menu-item.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        {
          name: 'MenuCategory',
          schema: MenuCategorySchema,
        },
        {
          name: 'MenuItem',
          schema: MenuItemSchema,
        },
      ],
      'normalized',
    ),
  ],
  exports: [MongooseModule],
})
export class MenusModule {}
