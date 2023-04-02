const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const dbPath = path.join(__dirname, "yamlFiles.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database.");
  }
});

// Initialize database with tables to store YAML files and webhook markdown files
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS yaml_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT UNIQUE,
      content TEXT
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS webhook_md (
      section TEXT PRIMARY KEY,
      content TEXT
    )`,
    (err) => {
      if (err) {
        console.error("Error creating webhook_md table:", err);
      } else {
        console.log("webhook_md table created or already exists.");
      }
    }
  );
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

module.exports = {
  db,
  getTableData,
};
