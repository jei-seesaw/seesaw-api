import 'reflect-metadata';

import { MikroORM } from '@mikro-orm/mariadb';
import mikroOrmConfig from './mikro-orm.config';

async function runMigrations(): Promise<void> {
  const orm = await MikroORM.init(
    mikroOrmConfig as unknown as Parameters<typeof MikroORM.init>[0],
  );

  try {
    await orm.migrator.up();
  } finally {
    await orm.close(true);
  }
}

runMigrations().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
