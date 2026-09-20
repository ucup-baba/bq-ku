import fs from 'fs';
import path from 'path';
import { isSupabaseServerConfigured } from '@/lib/supabase/server';

let _db: any = null;

export function getDb(): any {
  if (isSupabaseServerConfigured) {
    // When Supabase is configured, SQLite should not be used
    return null;
  }

  if (!_db) {
    // Lazy require to avoid importing better-sqlite3 native bindings in serverless/Vercel environments
    const Database = require('better-sqlite3');
    const dbPath = process.env.DATABASE_PATH || (process.env.NODE_ENV === 'test' ? ':memory:' : './data/santri.db');

    if (dbPath !== ':memory:') {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
        } catch (e) {
          // Ignore if directory cannot be created in read-only environment
        }
      }
    }

    _db = new Database(dbPath);
    _db.pragma('foreign_keys = ON');
    if (dbPath !== ':memory:') {
      _db.pragma('journal_mode = WAL');
    }

    const schemaPath = path.join(process.cwd(), 'lib/db/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      _db.exec(schema);
      try {
        _db.exec("ALTER TABLE santri ADD COLUMN statusSosial TEXT DEFAULT 'REGULER'");
      } catch (e) {
        // Column already exists
      }
      try {
        _db.exec("ALTER TABLE santri ADD COLUMN tahunMasuk INTEGER DEFAULT 2026");
      } catch (e) {
        // Column already exists
      }
    }

    // Auto seed initial data if running in non-test and table is empty
    if (dbPath !== ':memory:' && process.env.NODE_ENV !== 'test') {
      try {
        const row = _db.prepare('SELECT COUNT(*) as count FROM santri').get() as { count: number };
        if (row && row.count === 0) {
          import('./seed').then(m => m.runSeed()).catch(e => console.error('Seed trigger error:', e));
        }
      } catch (err) {
        // Ignore if table not ready
      }
    }
  }

  return _db;
}

export const db: any = new Proxy({}, {
  get(target, prop) {
    const instance = getDb();
    if (!instance) {
      throw new Error('SQLite database is not initialized (Supabase is active or database initialization failed)');
    }
    const val = instance[prop];
    return typeof val === 'function' ? val.bind(instance) : val;
  }
});

