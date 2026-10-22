import { Controller, Inject, Post } from '@nestjs/common';
import { IngestionService } from './ingestion.service.js';

@Controller('runs')
export class IngestionController {
  constructor(
    @Inject(IngestionService)
    private readonly ingestionService: IngestionService,
  ) {}

  @Post()
  createRun() {
    return this.ingestionService.createRun();
  }
}
