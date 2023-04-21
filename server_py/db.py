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
                user_id INTEGER,
                chain_id TEXT
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                chain_id TEXT,
                message TEXT,
                timestamp TEXT,
                FOREIGN KEY (chain_id) REFERENCES chat(chain_id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS resume (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                section TEXT,
                content TEXT
            );

            CREATE TABLE IF NOT EXISTS linkedIn (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT
            );

            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name TEXT NOT NULL,
                last_name TEXT,
                email TEXT UNIQUE NOT NULL, 
                password TEXT NOT NULL
            );

            DROP TABLE IF EXISTS chains;
            """
        )
        
        cursor = await db.cursor()
        await cursor.execute("PRAGMA table_info(resume);")
        column_names = [row[1] for row in await cursor.fetchall()]
        
        # Add the section column if it does not exist
        if "section" not in column_names:
            await db.execute("ALTER TABLE resume ADD COLUMN section TEXT;")

        await db.commit()


async def get_table_data(table_name, user_id):
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.cursor()

        if table_name == "users":
            # Filter rows by user_id only for the "users" table
            await cursor.execute(f"SELECT * FROM {table_name} WHERE id = ?", (user_id,))
        else:
            # No filtering for other tables
            await cursor.execute(f"SELECT * FROM {table_name} WHERE user_id = ?", (user_id,))
        
        # Fetch column names from the cursor description
        column_names = [column[0] for column in cursor.description]
        
        rows = await cursor.fetchall()
        
        # Convert rows to a list of dictionaries with column names as keys
        result = [dict(zip(column_names, row)) for row in rows]
        
        return result


# Initialize the database when the module is loaded
asyncio.run(setup_db())
