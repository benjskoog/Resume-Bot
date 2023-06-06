import psycopg2
from psycopg2 import sql
from pathlib import Path
from dotenv import load_dotenv
import os

load_dotenv()

DB_URL = os.environ.get("DB_URL")

db_path = Path(__file__).resolve().parent / "data.db"

def setup_db():
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            first_name TEXT NOT NULL,
            last_name TEXT,
            job_title TEXT,
            location TEXT,
            email TEXT UNIQUE NOT NULL, 
            password TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS chat (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            chat_id TEXT,
            chat_name TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );

        CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            type TEXT,
            user_id INTEGER,
            chat_id INTEGER,
            message TEXT,
            timestamp TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (chat_id) REFERENCES chat(id) ON DELETE CASCADE
        );
        
        CREATE TABLE IF NOT EXISTS resume (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            section TEXT,
            content TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );
        
        CREATE TABLE IF NOT EXISTS interview_questions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            job_id INTEGER,
            question TEXT,
            answer TEXT,
            recommendation TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );

        CREATE TABLE IF NOT EXISTS jobs (
            id SERIAL PRIMARY KEY,
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
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            job_title TEXT,
            company_name TEXT,
            job_description TEXT,
            status TEXT,
            post_url TEXT,
            date_created TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );

        CREATE TABLE IF NOT EXISTS resume_versions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            job_id INTEGER,
            version_name TEXT,
            version_text TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (job_id) REFERENCES saved_jobs (id)
        );

        CREATE TABLE IF NOT EXISTS cover_letter (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            job_id INTEGER,
            cover_letter TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (job_id) REFERENCES saved_jobs (id)
        );

        CREATE TABLE IF NOT EXISTS resume_recommendations (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            job_id INTEGER,
            version_id INTEGER,
            recommendation TEXT,
            user_notes TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (job_id) REFERENCES saved_jobs (id),
            FOREIGN KEY (version_id) REFERENCES resume_versions (id)
        );

        CREATE TABLE IF NOT EXISTS linkedIn (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            content TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );

        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            token TEXT,
            expires_at TIMESTAMP WITH TIME ZONE, 
            FOREIGN KEY (user_id) REFERENCES users (id)
        );
        """
    )
    
    conn.commit()
    cursor.close()
    conn.close()

def get_table_data(table_name, user_id):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    print(user_id)

    if user_id == "1":
        cursor.execute(f"SELECT * FROM {table_name}")
    else:
        if table_name == "users":
            cursor.execute(f"SELECT * FROM {table_name} WHERE id = %s", (user_id,))
        else:
            cursor.execute(f"SELECT * FROM {table_name} WHERE user_id = %s", (user_id,))
    
    result = cursor.fetchall()
    columns = [desc[0] for desc in cursor.description]  # get column names

    cursor.close()
    conn.close()

    return [dict(zip(columns, row)) for row in result]  # create a dict for each row

def delete_row(table_name, row_id, user_id=None):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()

    if table_name == "chat":
        cursor.execute("SELECT id FROM chat WHERE id = %s AND user_id = %s", (row_id, user_id))
        chat_id = cursor.fetchone()
        if chat_id:
            cursor.execute("DELETE FROM messages WHERE chat_id = %s", (chat_id[0],))

    if table_name == "users":
        cursor.execute(f"DELETE FROM {table_name} WHERE id = %s", (row_id,))
    else:
        cursor.execute(f"DELETE FROM {table_name} WHERE id = %s AND user_id = %s", (row_id, user_id))
    
    count = cursor.execute(f"SELECT COUNT(*) FROM {table_name} WHERE id = %s", (row_id,))
    count = cursor.fetchone()[0]

    conn.commit()
    cursor.close()
    conn.close()

    return count == 0

def drop_all_tables():
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()

    cursor.execute(
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
    
    conn.commit()
    cursor.close()
    conn.close()

# Initialize the database when the module is loaded
setup_db()
