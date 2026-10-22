import { Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { IngestionService } from './ingestion.service.js';
import { ParseObjectIdPipe } from '@nestjs/mongoose';

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

  @Get(':id')
  getRun(@Param('id', ParseObjectIdPipe) id: string) {
    return this.ingestionService.getRunById(id);
  }
}
