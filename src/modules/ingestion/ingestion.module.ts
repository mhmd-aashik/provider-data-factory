import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { IngestionProcessor } from './ingestion.processor.js';
import { LocationsModule } from '../locations/locations.module.js';
import { MongooseModule } from '@nestjs/mongoose';
import {
  IngestionRun,
  IngestionRunSchema,
} from './schemas/ingestion-run.schema.js';
import { NORMALIZED_DATABASE_NAME } from '../constants/location.constants.js';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: new Redis({
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
          maxRetriesPerRequest: null,
        }),
      }),
    }),
    BullModule.registerQueue({
      name: 'ingestion',
    }),

    MongooseModule.forFeature(
      [{ name: IngestionRun.name, schema: IngestionRunSchema }],
      NORMALIZED_DATABASE_NAME,
    ),

    LocationsModule,
  ],
  providers: [IngestionProcessor],
  exports: [IngestionProcessor],
})
export class IngestionModule {}
