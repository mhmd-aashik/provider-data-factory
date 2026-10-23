import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Job } from 'bullmq';
import type { Model } from 'mongoose';

import { LocationsService } from '../locations/locations.service.js';
import { RestaurantsService } from '../restaurants/restaurants.service.js';
import { MenusService } from '../menus/menus.service.js';

import {
  IngestionRun,
  IngestionRunStatus,
} from './schemas/ingestion-run.schema.js';

type IngestionJobData = {
  runId: string;
};

type IngestionResult = {
  read: number;
  written: number;
  invalid?: number;
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

    @Inject(MenusService)
    private readonly menusService: MenusService,

    @InjectModel(IngestionRun.name, 'normalized')
    private readonly runModel: Model<IngestionRun>,
  ) {
    super();
  }

  async process(job: Job<IngestionJobData>): Promise<IngestionResult> {
    const { runId } = job.data;

    const run = await this.runModel.findById(runId);

    if (!run) {
      throw new Error(`Ingestion run ${runId} not found`);
    }

    await this.runModel.findByIdAndUpdate(runId, {
      status: IngestionRunStatus.RUNNING,
      startedAt: run.startedAt ?? new Date(),
      completedAt: null,
    });

    try {
      this.logger.log(`Starting ${job.name}: ${job.id}`);

      let result: IngestionResult;

      switch (job.name) {
        case 'process-locations':
          result = await this.locationsService.processLocations();
          break;

        case 'process-restaurant-listings':
          result = await this.restaurantsService.processRestaurantListings();
          break;

        case 'process-menus':
          result = await this.menusService.processMenus(runId);
          break;

        default:
          throw new Error(`Unknown job name: ${job.name}`);
      }

      // Preserve cumulative counters for menu ingestion.
      const completedAt = new Date();

      const completedRun = await this.runModel.findById(runId);

      const durationMs = completedRun?.startedAt
        ? Math.max(
            0,
            completedAt.getTime() - new Date(completedRun.startedAt).getTime(),
          )
        : 0;

      await this.runModel.findByIdAndUpdate(runId, {
        status: IngestionRunStatus.COMPLETED,
        completedAt,
        durationMs,

        ...(job.name === 'process-menus'
          ? {}
          : {
              processed: result.read,
              succeeded: result.written,
              failed: result.invalid ?? 0,
            }),
      });

      this.logger.log(
        `Finished ${job.name}: ` +
          `read=${result.read}, ` +
          `written=${result.written}, ` +
          `invalid=${result.invalid ?? 0}, ` +
          `durationMs=${durationMs}`,
      );

      return result;
    } catch (error) {
      const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);

      const completedAt = isFinalAttempt ? new Date() : null;

      const durationMs =
        completedAt && run.startedAt
          ? Math.max(
              0,
              completedAt.getTime() - new Date(run.startedAt).getTime(),
            )
          : 0;

      await this.runModel.findByIdAndUpdate(runId, {
        status: isFinalAttempt
          ? IngestionRunStatus.FAILED
          : IngestionRunStatus.PENDING,
        completedAt,
        ...(isFinalAttempt ? { durationMs } : {}),
      });

      this.logger.error(
        `Job ${job.id} failed on attempt ${job.attemptsMade + 1}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    }
  }
}
