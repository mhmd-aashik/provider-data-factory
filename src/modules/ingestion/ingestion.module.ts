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
import { IngestionController } from './ingestion.controller.js';
import { IngestionService } from './ingestion.service.js';
import {
  IngestionError,
  IngestionErrorSchema,
} from './schemas/ingestion-error.schema.js';
import { RestaurantsModule } from '../restaurants/restaurants.module.js';
import { MenusModule } from '../menus/menus.module.js';
import { IngestionErrorsModule } from './ingestion-errors.module.js';

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
      [
        { name: IngestionRun.name, schema: IngestionRunSchema },
        { name: IngestionError.name, schema: IngestionErrorSchema },
      ],
      NORMALIZED_DATABASE_NAME,
    ),

    LocationsModule,
    RestaurantsModule,
    IngestionErrorsModule,
    MenusModule,
  ],
  controllers: [IngestionController],
  providers: [IngestionProcessor, IngestionService],
  exports: [IngestionProcessor],
})
export class IngestionModule {}
