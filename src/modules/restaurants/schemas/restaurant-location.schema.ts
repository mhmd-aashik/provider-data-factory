import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type RestaurantLocationDocument = HydratedDocument<RestaurantLocation>;

@Schema({
  collection: 'restaurant_locations',
  timestamps: true,
})
export class RestaurantLocation {
  @Prop({ required: true })
  provider!: string;

  @Prop({ required: true })
  providerRestaurantId!: string;

  @Prop({ required: true })
  providerLocationId!: string;
}

export const RestaurantLocationSchema =
  SchemaFactory.createForClass(RestaurantLocation);

RestaurantLocationSchema.index(
  {
    provider: 1,
    providerRestaurantId: 1,
    providerLocationId: 1,
  },
  { unique: true },
);
