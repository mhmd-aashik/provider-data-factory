import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Job } from 'bullmq';
import type { Model } from 'mongoose';

import { LocationsService } from '../locations/locations.service.js';
import { RestaurantsService } from '../restaurants/restaurants.service.js';

import {
  IngestionRun,
  IngestionRunStatus,
} from './schemas/ingestion-run.schema.js';

type IngestionJobData = {
  runId: string;
};

@Injectable()
@Processor('ingestion', {
  concurrency: 2,
})
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(
    @Inject(LocationsService)
    private readonly locationsService: LocationsService,

    @Inject(RestaurantsService)
    private readonly restaurantsService: RestaurantsService,

    @InjectModel(IngestionRun.name, 'normalized')
    private readonly runModel: Model<IngestionRun>,
  ) {
    super();
  }

  async process(job: Job<IngestionJobData>) {
    const { runId } = job.data;

    const run = await this.runModel.findById(runId);

    if (!run) {
      throw new Error(`Ingestion run ${runId} not found`);
    }

    await this.runModel.findByIdAndUpdate(runId, {
      status: IngestionRunStatus.RUNNING,
      startedAt: new Date(),
    });

    try {
      this.logger.log(`Starting ${job.name}: ${job.id}`);

      let result: {
        read: number;
        written: number;
        invalid?: number;
      };

      switch (job.name) {
        case 'process-locations':
          result = await this.locationsService.processLocations();
          break;

        case 'process-restaurant-listings':
          result = await this.restaurantsService.processRestaurantListings();
          break;

        default:
          throw new Error(`Unknown job name: ${job.name}`);
      }

      await this.runModel.findByIdAndUpdate(runId, {
        status: IngestionRunStatus.COMPLETED,
        processed: result.read,
        succeeded: result.written,
        failed: result.invalid ?? 0,
        completedAt: new Date(),
      });

      this.logger.log(
        `Finished ${job.name}: read=${result.read}, written=${result.written}, invalid=${result.invalid ?? 0}`,
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
