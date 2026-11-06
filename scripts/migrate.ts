import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const migrationsDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'database',
  'migrations',
);

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Defina DATABASE_URL no arquivo .env ou no ambiente antes de executar a migração.');
  }

  const pool = new Pool({ connectionString, connectionTimeoutMillis: 10_000 });
  try {
    const migrations = (await readdir(migrationsDirectory))
      .filter((file) => file.endsWith('.sql'))
      .sort();
    for (const migration of migrations) {
      const sql = await readFile(path.join(migrationsDirectory, migration), 'utf8');
      await pool.query(sql);
      console.log(`Migração aplicada: ${migration}`);
    }
  } finally {
    await pool.end();
  }
}

void migrate().catch((error: unknown) => {
  console.error('Falha ao aplicar migração PostgreSQL:', error);
  process.exitCode = 1;
});
