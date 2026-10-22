import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Location, LocationSchema } from './schemas/location.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature(
      [{ name: Location.name, schema: LocationSchema }],
      'normalized',
    ),
  ],
  exports: [MongooseModule],
})
export class LocationsModule {}
