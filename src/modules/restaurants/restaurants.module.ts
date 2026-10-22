import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { RestaurantSchema } from './schemas/restaurant.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        {
          name: 'Restaurant',
          schema: RestaurantSchema,
        },
      ],
      'normalized',
    ),
  ],
  exports: [MongooseModule],
})
export class RestaurantsModule {}
