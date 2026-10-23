import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import type { Connection } from 'mongoose';
import { Redis } from 'ioredis';

type DependencyStatus = 'up' | 'down';

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection('raw')
    private readonly rawConnection: Connection,

    @InjectConnection('normalized')
    private readonly normalizedConnection: Connection,

    private readonly configService: ConfigService,
  ) {}

  private async checkMongo(connection: Connection): Promise<DependencyStatus> {
    try {
      if (connection.readyState !== 1 || !connection.db) {
        return 'down';
      }

      await connection.db.admin().ping();

      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    const redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST') ?? '127.0.0.1',
      port: Number(this.configService.get('REDIS_PORT') ?? 6379),
      connectTimeout: 2000,
      retryStrategy: () => null,
      lazyConnect: true,
    });

    try {
      await redis.connect();

      const result = await redis.ping();

      return result === 'PONG' ? 'up' : 'down';
    } catch {
      return 'down';
    } finally {
      redis.disconnect();
    }
  }

  async check() {
    const [rawMongo, normalizedMongo, redis] = await Promise.all([
      this.checkMongo(this.rawConnection),
      this.checkMongo(this.normalizedConnection),
      this.checkRedis(),
    ]);

    const healthy =
      rawMongo === 'up' && normalizedMongo === 'up' && redis === 'up';

    return {
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        mongodbRaw: rawMongo,
        mongodbNormalized: normalizedMongo,
        redis,
      },
    };
  }
}
