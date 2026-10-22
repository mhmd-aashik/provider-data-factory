import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Job } from 'bullmq';
import type { Model } from 'mongoose';

import { LocationsService } from '../locations/locations.service.js';
import {
  IngestionRun,
  IngestionRunStatus,
} from './schemas/ingestion-run.schema.js';

@Injectable()
@Processor('ingestion', {
  concurrency: 2,
})
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(
    @Inject(LocationsService)
    private readonly locationsService: LocationsService,

    @InjectModel(IngestionRun.name, 'normalized')
    private readonly runModel: Model<IngestionRun>,
  ) {
    super();
  }

  async process(job: Job<{ runId: string }>): Promise<unknown> {
    if (job.name !== 'process-locations') {
      throw new Error(`Unknown job name: ${job.name}`);
    }

    const { runId } = job.data;

    await this.runModel.findByIdAndUpdate(runId, {
      status: IngestionRunStatus.RUNNING,
      startedAt: new Date(),
    });

    try {
      this.logger.log(`Starting job ${job.id}`);

      const result = await this.locationsService.processLocations();

      await this.runModel.findByIdAndUpdate(runId, {
        status: IngestionRunStatus.COMPLETED,
        processed: result.read,
        succeeded: result.written,
        failed: 0,
        completedAt: new Date(),
      });

      this.logger.log(
        `Finished job ${job.id}: read=${result.read}, written=${result.written}`,
      );

      return result;
    } catch (error) {
      await this.runModel.findByIdAndUpdate(runId, {
        status: IngestionRunStatus.FAILED,
        completedAt: new Date(),
      });

      this.logger.error(`Job ${job.id} failed`);

      throw error;
    }
  }
}
