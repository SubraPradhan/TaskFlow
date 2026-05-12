const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'taskflow.db');

let db;

function persistDb() {
  if (db) {
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  }
}

async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member',
      avatar TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
      color TEXT DEFAULT '#6366f1', owner_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS project_members (
      project_id TEXT NOT NULL, user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member', joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (project_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'todo', priority TEXT NOT NULL DEFAULT 'medium',
      project_id TEXT NOT NULL, assignee_id TEXT, creator_id TEXT NOT NULL,
      due_date TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY, content TEXT NOT NULL, task_id TEXT NOT NULL,
      user_id TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  persistDb();
  setInterval(persistDb, 30000);
  return db;
}

function prepare(sql) {
  return {
    get: (...params) => {
      try {
        const stmt = db.prepare(sql);
        const flat = params.flat();
        if (flat.length) stmt.bind(flat);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      } catch(e) { throw e; }
    },
    all: (...params) => {
      const results = [];
      const stmt = db.prepare(sql);
      const flat = params.flat();
      if (flat.length) stmt.bind(flat);
      while (stmt.step()) results.push(stmt.getAsObject());
      stmt.free();
      return results;
    },
    run: (...params) => {
      const flat = params.flat();
      db.run(sql, flat);
      persistDb();
      return { changes: db.getRowsModified() };
    }
  };
}

function exec(sql) { db.exec(sql); persistDb(); }

module.exports = { initDb, prepare, exec, persistDb };
