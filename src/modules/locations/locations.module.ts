import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LocationSchema } from './schemas/location.schema.js';
import { Schema } from 'mongoose';
import {
  LOCATION_MODEL_TOKEN,
  NORMALIZED_DATABASE_NAME,
  RAW_DATABASE_NAME,
  RAW_LOCATION_MODEL_TOKEN,
} from '../constants/location.constants.js';
import { LocationsService } from './locations.service.js';

const RawLocationSchema = new Schema(
  {},
  {
    strict: false,
    collection: 'raw_locations',
  },
);

@Module({
  imports: [
    MongooseModule.forFeature(
      [{ name: LOCATION_MODEL_TOKEN, schema: LocationSchema }],
      NORMALIZED_DATABASE_NAME,
    ),
    MongooseModule.forFeature(
      [{ name: RAW_LOCATION_MODEL_TOKEN, schema: RawLocationSchema }],
      RAW_DATABASE_NAME,
    ),
  ],
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}
