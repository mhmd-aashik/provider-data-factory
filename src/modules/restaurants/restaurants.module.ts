import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { RestaurantSchema } from './schemas/restaurant.schema.js';
import { RestaurantLocationSchema } from './schemas/restaurant-location.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        {
          name: 'Restaurant',
          schema: RestaurantSchema,
        },
        {
          name: 'RestaurantLocation',
          schema: RestaurantLocationSchema,
        },
      ],
      'normalized',
    ),
  ],
  exports: [MongooseModule],
})
export class RestaurantsModule {}
