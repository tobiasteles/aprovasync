import { neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { env } from '@/lib/env';
import * as schema from './schema';

// Node < 22 não tem WebSocket global; o driver do Neon precisa de um construtor.
neonConfig.webSocketConstructor = ws;

function createDb() {
  return drizzle(new Pool({ connectionString: env('DATABASE_URL') }), { schema });
}

const globalForDb = globalThis as unknown as { __aprovasyncDb?: ReturnType<typeof createDb> };

/** Lazy: não exige DATABASE_URL durante o build. Usa Pool (WebSocket) → suporta transações. */
export function getDb() {
  return (globalForDb.__aprovasyncDb ??= createDb());
}

export type Db = ReturnType<typeof getDb>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
