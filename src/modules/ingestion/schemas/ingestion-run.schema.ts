import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type IngestionRunDocument = HydratedDocument<IngestionRun>;

export enum IngestionRunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum IngestionType {
  LOCATIONS = 'locations',
  RESTAURANT_LISTINGS = 'restaurant-listings',
  MENUS = 'menus',
}

@Schema({
  collection: 'ingestion_runs',
  timestamps: true,
})
export class IngestionRun {
  @Prop({ required: true })
  provider!: string;

  // Type of ingestion requested
  @Prop({
    type: String,
    enum: Object.values(IngestionType),
  })
  type?: IngestionType;

  @Prop({
    type: String,
    enum: Object.values(IngestionRunStatus),
    default: IngestionRunStatus.PENDING,
  })
  status!: IngestionRunStatus;

  // Existing cumulative counters
  @Prop({ type: Number, default: 0 })
  processed!: number;

  @Prop({ type: Number, default: 0 })
  succeeded!: number;

  @Prop({ type: Number, default: 0 })
  failed!: number;

  @Prop({ type: Number, default: 0 })
  skipped!: number;

  @Prop({ type: Number, default: 0 })
  restaurants!: number;

  @Prop({ type: Number, default: 0 })
  categories!: number;

  @Prop({ type: Number, default: 0 })
  items!: number;

  // Existing sequential-ingestion checkpoint.
  // Do not use this as a shared checkpoint for
  // concurrently executing batch jobs.
  @Prop({ type: String, default: null })
  lastProcessedId!: string | null;

  @Prop({ type: Number, default: 0 })
  batchNumber!: number;

  // New batch orchestration counters
  @Prop({ type: Number, default: 0 })
  totalBatches!: number;

  @Prop({ type: Number, default: 0 })
  completedBatches!: number;

  @Prop({ type: Number, default: 0 })
  failedBatches!: number;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Number, default: 0 })
  durationMs!: number;

  @Prop({ type: Date, default: Date.now })
  createdAt!: Date;
}

export const IngestionRunSchema = SchemaFactory.createForClass(IngestionRun);

IngestionRunSchema.index({ status: 1, createdAt: -1 });
IngestionRunSchema.index({ provider: 1, type: 1, createdAt: -1 });
