import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'node:crypto';
import type { Model } from 'mongoose';

import { IngestionError } from './schemas/ingestion-error.schema.js';

@Injectable()
export class IngestionErrorService {
  constructor(
    @InjectModel(IngestionError.name, 'normalized')
    private readonly errorModel: Model<IngestionError>,
  ) {}

  async saveError(
    runId: string,
    provider: string,
    stage: string,
    reason: string,
    sourceId: string,
    recordPath: string,
  ) {
    const errorKey = createHash('sha256')
      .update(
        JSON.stringify({
          provider,
          stage,
          sourceId,
          recordPath,
          reason,
        }),
      )
      .digest('hex');

    await this.errorModel.updateOne(
      { runId, errorKey },
      {
        $setOnInsert: {
          runId,
          provider,
          stage,
          reason,
          errorKey,
        },
      },
      { upsert: true },
    );
  }
}
