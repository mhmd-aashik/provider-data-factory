import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { IngestionService } from './ingestion.service.js';
import { ParseObjectIdPipe } from '@nestjs/mongoose';

@Controller('runs')
export class IngestionController {
  constructor(
    @Inject(IngestionService)
    private readonly ingestionService: IngestionService,
  ) {}

  @Post()
  createRun(@Body() body?: { type?: string }) {
    const type = body?.type ?? 'locations';

    if (
      type !== 'locations' &&
      type !== 'restaurant-listings' &&
      type !== 'menus'
    ) {
      throw new BadRequestException(
        'type must be locations, restaurant-listings, or menus',
      );
    }

    return this.ingestionService.createRun(type);
  }

  @Get(':id')
  getRun(@Param('id', ParseObjectIdPipe) id: string) {
    return this.ingestionService.getRunById(id);
  }

  @Get(':id/errors')
  getRunErrors(
    @Param('id', ParseObjectIdPipe) id: string,

    @Query('page', new DefaultValuePipe(1), ParseIntPipe)
    page: number,

    @Query('limit', new DefaultValuePipe(10), ParseIntPipe)
    limit: number,
  ) {
    if (page < 1 || limit < 1 || limit > 100) {
      throw new BadRequestException(
        'Page must be >= 1 and limit must be between 1 and 100',
      );
    }

    return this.ingestionService.getRunErrors(id, page, limit);
  }
}
