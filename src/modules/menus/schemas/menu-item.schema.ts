import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type MenuItemDocument = HydratedDocument<MenuItem>;

@Schema({
  collection: 'menu_items',
  timestamps: true,
})
export class MenuItem {
  @Prop({ required: true })
  provider!: string;

  @Prop({ required: true })
  providerRestaurantId!: string;

  @Prop({ required: true })
  providerCategoryId!: string;

  @Prop({ required: true })
  providerItemId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  description?: string;

  @Prop({ type: Number })
  price?: number;

  @Prop({ type: Number })
  rating?: number;

  @Prop()
  image?: string;
}

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);

MenuItemSchema.index(
  {
    provider: 1,
    providerRestaurantId: 1,
    providerCategoryId: 1,
    providerItemId: 1,
  },
  { unique: true },
);

MenuItemSchema.index({
  provider: 1,
  providerRestaurantId: 1,
  providerCategoryId: 1,
});
