import sqlite3Original from "sqlite3";
import { fileURLToPath } from "url";
import { dirname } from "path";

const sqlite3 = sqlite3Original.verbose();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = fileURLToPath(new URL("yamlFiles.db", import.meta.url));

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database.");
    db.exec("PRAGMA foreign_keys = ON;");
  }
});


db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS chat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chain_id TEXT
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chain_id TEXT,
      message TEXT,
      timestamp TEXT,
      FOREIGN KEY (chain_id) REFERENCES chat(chain_id) ON DELETE CASCADE
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS resume (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS linkedIn (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT
    )`
  );

  db.run(`DROP TABLE IF EXISTS chains`);

});

async function getTableData(tableName) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

export { db, getTableData };
