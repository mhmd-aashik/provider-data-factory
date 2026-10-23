import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { LocationsModule } from './modules/locations/locations.module.js';
import { RestaurantsModule } from './modules/restaurants/restaurants.module.js';
import { MenusModule } from './modules/menus/menus.module.js';
import { IngestionModule } from './modules/ingestion/ingestion.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      connectionName: 'raw',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGO_RAW_URI'),
      }),
    }),
    MongooseModule.forRootAsync({
      connectionName: 'normalized',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGO_TARGET_URI'),
      }),
    }),

    LocationsModule,
    RestaurantsModule,
    MenusModule,
    IngestionModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
