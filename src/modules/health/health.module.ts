import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ingestion',
    }),
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
