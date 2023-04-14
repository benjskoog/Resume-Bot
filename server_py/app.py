from flask import Flask, request, jsonify, g
from flask_cors import CORS
import os
import aiosqlite
from langchain.llms import OpenAI
from langchain.prompts import (
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
    ChatPromptTemplate,
    PromptTemplate,
    MessagesPlaceholder,
)
from langchain.memory import ConversationBufferMemory
from langchain.chains import LLMChain, ConversationChain
from langchain.chat_models import ChatOpenAI
from langchain.schema import (
    AIMessage,
    HumanMessage,
    SystemMessage
)
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.text_splitter import CharacterTextSplitter
from langchain.vectorstores import Milvus
from langchain.document_loaders import TextLoader
import mistune
from docx import Document
from io import BytesIO
from flask_uploads import UploadSet, configure_uploads, IMAGES
from db import get_table_data, setup_db
from datetime import datetime
import time


app = Flask(__name__)
CORS(app)

DATABASE = "data.db"

chains = {}

api_key = os.environ.get("OPENAI_API_KEY")


@app.before_first_request
async def create_tables():
    await setup_db()


async def get_db():
    if "db" not in g:
        g.db = await aiosqlite.connect(DATABASE)
    return g.db

async def close_db(e=None):
    db = g.pop("db", None)
    if db is not None:
        await db.close()

app.teardown_appcontext(close_db)

@app.route("/upload-resume", methods=["POST"])
async def upload_resume():
    def extract_raw_text(resume_buffer):
        document = Document(BytesIO(resume_buffer))
        plain_text = ""
        for paragraph in document.paragraphs:
            plain_text += paragraph.text + "\n"
        return plain_text

    async def save_resume_to_database(resume_text):
        db = await get_db()
        cursor = await db.cursor()
        await cursor.execute("SELECT COUNT(*) as count FROM resume")
        row = await cursor.fetchone()
        if row is not None and row[0] == 0:
            await cursor.execute("INSERT INTO resume (content) VALUES (?)", [resume_text])
        else:
            await cursor.execute("UPDATE resume SET content = ?", [resume_text])
        await db.commit()

    try:
        resume_file = request.files["file"]
        resume_buffer = resume_file.read()
        plain_text = extract_raw_text(resume_buffer)
        await save_resume_to_database(plain_text)
        return jsonify(success=True, message="Resume uploaded and parsed successfully.")
    except Exception as e:
        print("Error uploading and parsing resume:", e)
        return jsonify(success=False, message="Error uploading and parsing resume."), 500


@app.route("/get-linkedIn", methods=["GET"])
def get_linkedIn():
    pass


@app.route("/fetch-experience-data", methods=["GET"])
async def fetch_experience_data():
    try:
        db = await get_db()
        cursor = await db.cursor()
        await cursor.execute("SELECT content FROM resume")
        rows = await cursor.fetchall()
        return jsonify(resume=rows)
    except Exception as e:
        print("Error fetching resume data:", e)
        return jsonify(success=False, message="Error fetching resume data."), 500


@app.route("/gpt-api-call", methods=["POST"])
async def gpt_api_call():
    db = await get_db()
    form_values = request.json
    query = form_values["query"]
    resume = form_values["resume"][0]

    chat = ChatOpenAI(
        model_name="gpt-3.5-turbo",
        openai_api_key=api_key,
        temperature=0,
    )

    template_string = """Your name is Ben. You are being interviewed for a Solutions Consultant role at at tech company. You are arrogant and think you are the GOAT. You have a tendency to call people chumps.

    An interviewer will be asking questions about your resume, which is below. Answer the questions and act condescending toward the interviewer. Do not forget to call yourself the GOAT and tell the interviewer they are a chump.

    Your resume:""" + resume

    resume_prompt = ChatPromptTemplate.from_messages([
        # SystemMessagePromptTemplate.from_template(template_string),
        MessagesPlaceholder(variable_name="history"),
        HumanMessagePromptTemplate.from_template("{input}")
    ])

    print(resume_prompt)

    chain_id = form_values.get("chainId") or str(int(time.time()))  # Generate a unique identifier based on the current timestamp

    chain = chains.get(chain_id)

    if not chain:
        chain = ConversationChain(
            memory=ConversationBufferMemory(return_messages=True),
            prompt=resume_prompt,
            llm=chat,
        )

        chains[chain_id] = chain

        # Insert a new chat row
        await db.execute("INSERT INTO chat (chain_id) VALUES (?)", [chain_id])
        await db.commit()

    try:
        result_endpoint = chain.run(input=query)
        answer = result_endpoint

        # Insert user query and API response into the messages table
        timestamp = datetime.now().isoformat()
        await db.execute(
        "INSERT INTO messages (chain_id, message, timestamp) VALUES (?, ?, ?)",
        [chain_id, query, timestamp]
        )
        await db.execute(
            "INSERT INTO messages (chain_id, message, timestamp) VALUES (?, ?, ?)",
            [chain_id, answer, timestamp]
        )
        await db.commit()

        return jsonify(answer=answer, chainId=chain_id)
    except Exception as e:
        print(e)
        return jsonify(success=False, message="Error fetching GPT-3.5 API"), 500

@app.route("/get-database-tables", methods=["GET"])
async def get_database_tables():
    try:
        db = await get_db()
        cur = await db.cursor()
        await cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        rows = await cur.fetchall()
        table_names = list(map(lambda row: {"name": row[0]}, rows))
        return jsonify(tables=table_names)
    except Exception as e:
        print("Error fetching database tables:", e)
        return jsonify(error="An error occurred while fetching database tables."), 500


@app.route("/get-table-data/<string:table_name>", methods=["GET"])
async def get_table_data_route(table_name):
    try:
        table_data = await get_table_data(table_name)
        print(table_data)
        return table_data
    except Exception as e:
        print(f"Error fetching data for table {table_name}:", e)
        return jsonify(error="An error occurred while fetching table data."), 500


if __name__ == "__main__":
    app.run(port=3001)