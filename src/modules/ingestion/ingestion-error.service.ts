import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
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
  ) {
    return this.errorModel.create({
      runId,
      provider,
      stage,
      reason,
    });
  }
}
