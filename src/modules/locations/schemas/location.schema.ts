import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LocationDocument = HydratedDocument<Location>;

@Schema({
  collection: 'locations',
  timestamps: true,
})
export class Location {
  @Prop({ required: true })
  provider!: string;

  @Prop({ required: true })
  providerLocationId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  slug!: string;
}

export const LocationSchema = SchemaFactory.createForClass(Location);

LocationSchema.index({ provider: 1, providerLocationId: 1 }, { unique: true });
