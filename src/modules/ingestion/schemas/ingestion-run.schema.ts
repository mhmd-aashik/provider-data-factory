import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type IngestionRunDocument = HydratedDocument<IngestionRun>;

export enum IngestionRunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Schema({
  collection: 'ingestion_runs',
  timestamps: true,
})
export class IngestionRun {
  @Prop({ required: true })
  provider!: string;

  @Prop({
    type: String,
    enum: Object.values(IngestionRunStatus),
    default: IngestionRunStatus.PENDING,
  })
  status!: IngestionRunStatus;

  @Prop({ default: 0 })
  processed!: number;

  @Prop({ default: 0 })
  succeeded!: number;

  @Prop({ default: 0 })
  failed!: number;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Date, default: Date.now })
  createdAt!: Date;
}

export const IngestionRunSchema = SchemaFactory.createForClass(IngestionRun);
