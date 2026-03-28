import postgres from 'postgres';
import { building } from '$app/environment';

let _sql: postgres.Sql | undefined;

function createSql(): postgres.Sql {
  if (_sql) return _sql;

  // During build, return a dummy — server code is never actually executed at build time
  if (building) {
    return {} as postgres.Sql;
  }

  // Dynamically import env at runtime to avoid build-time evaluation
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  _sql = postgres(DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return _sql;
}

export const sql = new Proxy((() => {}) as unknown as postgres.Sql, {
  get(_target, prop) {
    return (createSql() as Record<string | symbol, unknown>)[prop];
  },
  apply(_target, _thisArg, args) {
    const db = createSql();
    return (db as unknown as (...a: unknown[]) => unknown)(...args);
  },
});
