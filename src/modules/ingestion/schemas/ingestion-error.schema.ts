import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type IngestionErrorDocument = HydratedDocument<IngestionError>;

@Schema({
  collection: 'ingestion_errors',
  timestamps: true,
})
export class IngestionError {
  @Prop({ required: true, index: true })
  runId!: string;

  @Prop({ required: true })
  provider!: string;

  @Prop({ required: true })
  stage!: string;

  @Prop({ required: true })
  reason!: string;

  @Prop({ type: Object })
  rawRecord?: Record<string, unknown>;

  createdAt!: Date;
  updatedAt!: Date;
}

export const IngestionErrorSchema =
  SchemaFactory.createForClass(IngestionError);

IngestionErrorSchema.index({
  runId: 1,
  createdAt: -1,
  _id: -1,
});
