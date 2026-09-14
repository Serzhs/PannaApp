import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env.js';

import { createDatabase, type Database } from './client.js';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly connection;
  readonly db: Database;

  constructor(config: ConfigService<Env, true>) {
    this.connection = createDatabase(config.get('DATABASE_URL', { infer: true }));
    this.db = this.connection.db;
  }

  async onModuleDestroy(): Promise<void> {
    await this.connection.sql.end();
  }
}
