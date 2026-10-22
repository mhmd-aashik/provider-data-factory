import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { NORMALIZED_DATABASE_NAME } from '../constants/location.constants.js';
import {
  IngestionRun,
  IngestionRunStatus,
} from './schemas/ingestion-run.schema.js';
import type { Model } from 'mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { run } from 'node:test';

@Injectable()
export class IngestionService {
  constructor(
    @InjectModel(IngestionRun.name, NORMALIZED_DATABASE_NAME)
    private readonly runModel: Model<IngestionRun>,

    @InjectQueue('ingestion')
    private readonly ingestionQueue: Queue,
  ) {}

  async createRun() {
    const run = await this.runModel.create({
      provider: 'xbite',
      status: IngestionRunStatus.PENDING,
    });

    try {
      await this.ingestionQueue.add(
        'process-locations',
        {
          runId: run.id,
        },
        {
          jobId: `locations-${run.id}`,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: false,
          removeOnFail: false,
        },
      );
    } catch (error) {
      await this.runModel.findByIdAndUpdate(run.id, {
        status: IngestionRunStatus.FAILED,
        completedAt: new Date(),
      });

      throw error;
    }
  }
}
