import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { IngestionErrorService } from './ingestion-error.service.js';
import {
  IngestionError,
  IngestionErrorSchema,
} from './schemas/ingestion-error.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        {
          name: IngestionError.name,
          schema: IngestionErrorSchema,
        },
      ],
      'normalized',
    ),
  ],
  providers: [IngestionErrorService],
  exports: [IngestionErrorService],
})
export class IngestionErrorsModule {}
