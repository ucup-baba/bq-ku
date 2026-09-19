import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// For tests, process.env.NODE_ENV is typically 'test', use in-memory DB or test DB path
const dbPath = process.env.DATABASE_PATH || (process.env.NODE_ENV === 'test' ? ':memory:' : './data/santri.db');

// Ensure directory exists if not using memory
if (dbPath !== ':memory:') {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');
// Enable WAL mode for better performance
if (dbPath !== ':memory:') {
  db.pragma('journal_mode = WAL');
}

// Run schema
const schemaPath = path.join(process.cwd(), 'lib/db/schema.sql');
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
}

export function getDb() {
  return db;
}

// Auto seed initial data if running in non-test and table is empty
if (dbPath !== ':memory:' && process.env.NODE_ENV !== 'test') {
  try {
    const row = db.prepare('SELECT COUNT(*) as count FROM santri').get() as { count: number };
    if (row.count === 0) {
      // Lazy load seed to avoid circular dependency
      import('./seed').then(m => m.runSeed()).catch(e => console.error('Seed trigger error:', e));
    }
  } catch (err) {
    // Ignore if table not yet initialized
  }
}

// Handle cleanup
process.on('exit', () => db.close());
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));

