import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type RestaurantDocument = HydratedDocument<Restaurant>;

@Schema({
  collection: 'restaurants',
  timestamps: true,
})
export class Restaurant {
  @Prop({ required: true })
  provider!: string;

  @Prop({ required: true })
  providerRestaurantId!: string;

  @Prop()
  outletCode?: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  logo?: string;

  @Prop()
  city?: string;

  @Prop()
  address?: string;

  @Prop()
  contact?: string;

  @Prop({ type: Number })
  latitude?: number;

  @Prop({ type: Number })
  longitude?: number;

  @Prop({ type: Number })
  rating?: number;

  @Prop({ type: Number })
  totalReviews?: number;

  @Prop({ type: Number })
  totalRatings?: number;

  @Prop({ type: Number })
  deliveryFee?: number;

  @Prop({ type: Number })
  minimumOrder?: number;

  @Prop()
  deliveryTime?: string;
}

export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);

RestaurantSchema.index(
  { provider: 1, providerRestaurantId: 1 },
  { unique: true },
);

RestaurantSchema.index({ city: 1 });
