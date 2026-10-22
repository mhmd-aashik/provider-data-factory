import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { LocationsService } from '../locations/locations.service.js';
import { Job } from 'bullmq';

@Injectable()
@Processor('ingestion', {
  concurrency: 2,
})
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(private readonly locationsService: LocationsService) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    switch (job.name) {
      case 'process-locations': {
        this.logger.log(`Starting job ${job.id}`);

        const result = await this.locationsService.processLocations();

        this.logger.log(`Finished job ${job.id}`);

        return result;
      }

      default: {
        throw new Error(`Unknown job name: ${job.name}`);
      }
    }
  }
}
