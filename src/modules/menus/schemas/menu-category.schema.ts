import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type MenuCategoryDocument = HydratedDocument<MenuCategory>;

@Schema({
  collection: 'menu_categories',
  timestamps: true,
})
export class MenuCategory {
  @Prop({ required: true })
  provider!: string;

  @Prop({ required: true })
  providerRestaurantId!: string;

  @Prop({ required: true })
  providerCategoryId!: string;

  @Prop({ required: true })
  name!: string;
}

export const MenuCategorySchema = SchemaFactory.createForClass(MenuCategory);

MenuCategorySchema.index(
  {
    provider: 1,
    providerRestaurantId: 1,
    providerCategoryId: 1,
  },
  { unique: true },
);
