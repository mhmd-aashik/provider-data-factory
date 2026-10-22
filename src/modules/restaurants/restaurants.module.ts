import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Restaurant, RestaurantSchema } from './schemas/restaurant.schema.js';
import {
  RestaurantLocation,
  RestaurantLocationSchema,
} from './schemas/restaurant-location.schema.js';
import { RestaurantsService } from './restaurants.service.js';
import { Schema } from 'mongoose';

const RawRestaurantSchema = new Schema(
  {},
  {
    strict: false,
    collection: 'raw_restaurants',
  },
);

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        {
          name: Restaurant.name,
          schema: RestaurantSchema,
        },
        {
          name: RestaurantLocation.name,
          schema: RestaurantLocationSchema,
        },
      ],
      'normalized',
    ),
    MongooseModule.forFeature(
      [
        {
          name: 'RawRestaurant',
          schema: RawRestaurantSchema,
        },
      ],
      'raw',
    ),
  ],
  providers: [RestaurantsService],
  // controllers: [RestaurantsController],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}
