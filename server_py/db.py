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
                chat_id TEXT,
                chat_name TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT,
                user_id INTEGER,
                chat_id TEXT,
                message TEXT,
                timestamp TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (chat_id) REFERENCES chat(chat_id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS resume (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                section TEXT,
                content TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );
            
            CREATE TABLE IF NOT EXISTS interview_questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                job_id INTEGER,
                question TEXT,
                answer TEXT,
                recommendation TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );

            CREATE TABLE IF NOT EXISTS jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT,
                company_name TEXT,
                location TEXT,
                description TEXT,
                job_highlights TEXT,
                source TEXT,
                extensions TEXT,
                saved BOOLEAN,
                date_added TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );

            CREATE TABLE IF NOT EXISTS saved_jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                job_title TEXT,
                company_name TEXT,
                job_description TEXT,
                status TEXT,
                post_url TEXT,
                date_created DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );

            CREATE TABLE IF NOT EXISTS resume_versions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                job_id INTEGER,
                version_name TEXT,
                version_text TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (job_id) REFERENCES job_applications (id)
            );

            CREATE TABLE IF NOT EXISTS resume_recommendations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                job_id INTEGER,
                version_id TEXT,
                recommendation TEXT,
                user_notes TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (job_id) REFERENCES job_applications (id),
                FOREIGN KEY (version_id) REFERENCES resume_versions (id)
            );

            CREATE TABLE IF NOT EXISTS linkedIn (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                content TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );

            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name TEXT NOT NULL,
                last_name TEXT,
                job_title TEXT,
                location TEXT,
                email TEXT UNIQUE NOT NULL, 
                password TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                token TEXT,
                expires_at TEXT, 
                FOREIGN KEY (user_id) REFERENCES users (id)
            );

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
            await cursor.execute(f"SELECT * FROM {table_name}")
        else:
            # No filtering for other tables
            await cursor.execute(f"SELECT * FROM {table_name} WHERE user_id = ?", (user_id,))
        
        # Fetch column names from the cursor description
        column_names = [column[0] for column in cursor.description]
        
        rows = await cursor.fetchall()
        
        # Convert rows to a list of dictionaries with column names as keys
        result = [dict(zip(column_names, row)) for row in rows]
        
        return result
    
async def delete_row(table_name, row_id, user_id=None):
    async with aiosqlite.connect(db_path) as db:
        if table_name == "chat":
            cursor = await db.execute("SELECT chat_id FROM chat WHERE id = ? AND user_id = ?", (row_id, user_id))
            chat_id = await cursor.fetchone()
            if chat_id:
                await db.execute("DELETE FROM messages WHERE chat_id = ?", (chat_id[0],))
                await db.commit()

        # Special case for the users table
        if table_name == "users":
            await db.execute(f"DELETE FROM {table_name} WHERE id = ?", (row_id,))
        else:
            await db.execute(f"DELETE FROM {table_name} WHERE id = ? AND user_id = ?", (row_id, user_id))
        
        await db.commit()

        cursor = await db.execute(f"SELECT COUNT(*) FROM {table_name} WHERE id = ?", (row_id,))
        count = await cursor.fetchone()

        return count[0] == 0

async def drop_all_tables():
    async with aiosqlite.connect(db_path) as db:
        # Disable foreign key constraints temporarily
        await db.execute("PRAGMA foreign_keys = OFF;")
        
        # Drop all tables
        await db.executescript(
            """
            DROP TABLE IF EXISTS password_reset_tokens;
            DROP TABLE IF EXISTS linkedIn;
            DROP TABLE IF EXISTS resume_recommendations;
            DROP TABLE IF EXISTS resume_versions;
            DROP TABLE IF EXISTS saved_jobs;
            DROP TABLE IF EXISTS interview_questions;
            DROP TABLE IF EXISTS resume;
            DROP TABLE IF EXISTS messages;
            DROP TABLE IF EXISTS chat;
            DROP TABLE IF EXISTS jobs;
            DROP TABLE IF EXISTS users;
            """
        )
        
        # Re-enable foreign key constraints
        await db.execute("PRAGMA foreign_keys = ON;")
        
        await db.commit()


# Initialize the database when the module is loaded
asyncio.run(setup_db())