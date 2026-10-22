import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { NORMALIZED_DATABASE_NAME } from '../constants/location.constants.js';
import {
  IngestionRun,
  IngestionRunStatus,
} from './schemas/ingestion-run.schema.js';
import { Types, type Model } from 'mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { IngestionError } from './schemas/ingestion-error.schema.js';

@Injectable()
export class IngestionService {
  constructor(
    @InjectModel(IngestionRun.name, NORMALIZED_DATABASE_NAME)
    private readonly runModel: Model<IngestionRun>,

    @InjectQueue('ingestion')
    private readonly ingestionQueue: Queue,

    @InjectModel(IngestionError.name, 'normalized')
    private readonly errorModel: Model<IngestionError>,
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

  async getRunById(runId: string) {
    const run = await this.runModel.findById(runId).lean();

    if (!run) {
      throw new NotFoundException(`Ingestion run ${runId} not found`);
    }

    return {
      runId: String(run._id),
      provider: run.provider,
      status: run.status,
      processed: run.processed,
      succeeded: run.succeeded,
      failed: run.failed,
      startedAt: run.startedAt ?? null,
      completedAt: run.completedAt ?? null,
      createdAt: run.createdAt,
    };
  }

  async getRunErrors(runId: string, page = 1, limit = 10) {
    if (!Types.ObjectId.isValid(runId)) {
      throw new BadRequestException('Invalid run ID');
    }

    await this.getRunById(runId);

    const skip = (page - 1) * limit;

    const [errors, total] = await Promise.all([
      this.errorModel
        .find({ runId })
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      this.errorModel.countDocuments({ runId }),
    ]);

    return {
      runId,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      errors,
    };
  }
}
