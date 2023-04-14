import aiosqlite
import asyncio
from pathlib import Path

db_path = Path(__file__).resolve().parent / "data.db"


async def setup_db():
    async with aiosqlite.connect(db_path) as db:
        await db.execute("PRAGMA foreign_keys = ON;")
        await db.executescript(
            """
            CREATE TABLE IF NOT EXISTS chat (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chain_id TEXT
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chain_id TEXT,
                message TEXT,
                timestamp TEXT,
                FOREIGN KEY (chain_id) REFERENCES chat(chain_id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS resume (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT
            );

            CREATE TABLE IF NOT EXISTS linkedIn (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT
            );

            DROP TABLE IF EXISTS chains;
            """
        )
        await db.commit()


async def get_table_data(table_name):
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.cursor()
        await cursor.execute(f"SELECT * FROM {table_name}")
        
        # Fetch column names from the cursor description
        column_names = [column[0] for column in cursor.description]
        
        rows = await cursor.fetchall()
        
        # Convert rows to a list of dictionaries with column names as keys
        result = [dict(zip(column_names, row)) for row in rows]
        
        return result


# Initialize the database when the module is loaded
asyncio.run(setup_db())
