import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function run() {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  const fs = await import('fs');
  const path = await import('path');
  const dir = path.dirname(new URL(import.meta.url).pathname);
  const files = fs.readdirSync(dir)
    .filter((f: string) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const [applied] = await sql`SELECT name FROM _migrations WHERE name = ${file}`;
    if (applied) {
      console.log(`  skip: ${file} (already applied)`);
      continue;
    }

    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    console.log(`  apply: ${file}`);
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`INSERT INTO _migrations (name) VALUES (${file})`;
    });
  }

  console.log('Migrations complete.');
  await sql.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
