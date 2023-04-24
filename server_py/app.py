from flask import Flask, request, jsonify, g
from flask_cors import CORS
import os
import aiosqlite
from dotenv import load_dotenv
from langchain.llms import OpenAI
from langchain.prompts import (
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
    ChatPromptTemplate,
    PromptTemplate,
    MessagesPlaceholder,
)
from langchain.memory import ConversationBufferMemory
from langchain.chains import LLMChain, ConversationChain, RetrievalQA, ConversationalRetrievalChain
from langchain.chat_models import ChatOpenAI
from langchain.schema import (
    AIMessage,
    HumanMessage,
    SystemMessage
)
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.document_loaders import TextLoader
from langchain.vectorstores import Chroma
from docx import Document
from io import BytesIO
from flask_uploads import UploadSet, configure_uploads, IMAGES
from db import get_table_data, delete_row, setup_db
from datetime import datetime
import time
import re
from typing import List, Tuple
import spacy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)

DATABASE = "data.db"

chains = {}

load_dotenv()

api_key = os.environ.get("OPENAI_API_KEY")
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY")

print(os.environ.get("JWT_SECRET_KEY"))

jwt = JWTManager(app)

# Load the spaCy English model
nlp = spacy.load('en_core_web_sm')

persist_directory = 'vectordb'

SECTION_KEYWORDS = [
    "overview",
    "summary",
    "profile",
    "objective",
    "education",
    "academic background",
    "work experience",
    "professional experience",
    "experience",
    "employment history",
    "job history",
    "career history",
    "skills",
    "technical skills",
    "core competencies",
    "capabilities",
    "areas of expertise",
    "expertise",
    "projects",
    "portfolio",
    "awards",
    "achievements",
    "accolades",
    "honors",
    "publications",
    "research",
    "certifications",
    "credentials",
    "licenses",
    "training",
    "languages",
    "fluency",
    "multilingual",
    "references",
    "referees",
    "testimonials",
    "professional affiliations",
    "memberships",
    "associations",
    "activities",
    "extracurricular activities",
    "volunteer work",
    "community involvement",
    "leadership",
    "hobbies",
    "interests",
    "personal interests",
]


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

@app.route("/register", methods=["POST"])
async def register():
    data = request.get_json()
    print(data)

    # Check if the user already exists
    db = await get_db()
    cursor = await db.cursor()
    await cursor.execute("SELECT * FROM users WHERE email=?", (data["email"],))
    existing_user = await cursor.fetchone()

    if existing_user:
        return jsonify({"error": "User already exists"}), 400

    # Create the new user
    hashed_password = generate_password_hash(data["password"], method="sha256")
    await cursor.execute("INSERT INTO users (first_name, last_name, email, password) VALUES (?, ?, ?, ?)", (data['first_name'], data['last_name'], data['email'], hashed_password))
    await db.commit()
    await cursor.execute("SELECT * FROM users WHERE email=?", (data["email"],))
    user = await cursor.fetchone()

    return jsonify({"id": user[0], "email": user[3], "first_name": user[1], "last_name": user[2]}), 201

@app.route("/login", methods=["POST"])
async def login():
    data = request.get_json()

    # Check if the user exists
    db = await get_db()
    cursor = await db.cursor()
    await cursor.execute("SELECT * FROM users WHERE email=?", (data["email"],))
    user = await cursor.fetchone()
    print(user[3])

    if not user or not check_password_hash(user[4], data["password"]):
        return jsonify({"error": "Invalid username or password"}), 401

    # Create the access token
    access_token = create_access_token(identity=user[3])

    return jsonify({"access_token": access_token, "id": user[0], "email": user[3], "first_name": user[1], "last_name": user[2]}), 200

@app.route("/profile", methods=["GET"])
@jwt_required()
async def profile():
    current_user = get_jwt_identity()
    
    # Fetch user data from the database
    db = await get_db()
    cursor = await db.cursor()
    await cursor.execute("SELECT * FROM users WHERE username=?", (current_user,))
    user_data = await cursor.fetchone()

    if not user_data:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"username": user_data[1]}), 200


@app.route("/upload-resume", methods=["POST"])
async def upload_resume():
    user_id = request.form.get("id")
    user_embeddings_directory = os.path.join(persist_directory, f"user_{user_id}_embeddings")
    os.makedirs(user_embeddings_directory, exist_ok=True)
    docs = []

    def extract_raw_text(resume_buffer):
        document = Document(BytesIO(resume_buffer))
        plain_text = ""
        for paragraph in document.paragraphs:
            plain_text += paragraph.text + "\n"
        return plain_text
    def split_resume_into_sections(resume_text: str) -> List[Tuple[str, str]]:
        doc = nlp(resume_text)

        sections = []
        section_starts = []
        for i, token in enumerate(doc):
            # Check if the token is followed by a newline character
            if token.text.lower().strip() in (keyword.lower() for keyword in SECTION_KEYWORDS) and (i == len(doc) - 1 or doc[i + 1].text == "\n"):
                section_starts.append(i)

        for idx, start in enumerate(section_starts):
            section_header = doc[start].text

            # Get the section content
            if idx < len(section_starts) - 1:
                end = section_starts[idx + 1]
                section_content = doc[start + 1:end]
            else:
                section_content = doc[start + 1:]

            sections.append((section_header, section_content.text))

        return sections

    user_id = request.form.get("id")

    async def save_resume_to_database(user_id: int, resume_sections: List[Tuple[str, str]]):
        db = await get_db()
        cursor = await db.cursor()

        # Delete existing resume data
        await cursor.execute("DELETE FROM resume WHERE user_id=?", (user_id,))

        # Insert full resume
        await cursor.execute("INSERT INTO resume (user_id, section, content) VALUES (?, ?, ?)", (user_id, "FULL RESUME", plain_text))
        
        # Insert each section as a new row in the "resume" table
        for section, content in resume_sections:
            await cursor.execute("INSERT INTO resume (user_id, section, content) VALUES (?, ?, ?)", (user_id, section, content))
            docs.append(section + " " + content)

        await db.commit()


    try:
        resume_file = request.files["file"]
        resume_buffer = resume_file.read()
    except Exception as e:
        print("Error reading uploaded file:", e)
        return jsonify(success=False, message="Error reading uploaded file."), 500

    try:
        plain_text = extract_raw_text(resume_buffer)
        resume_sections = split_resume_into_sections(plain_text)
        await save_resume_to_database(user_id, resume_sections)
        embeddings = OpenAIEmbeddings()
        text_splitter = RecursiveCharacterTextSplitter(
            # Set a really small chunk size, just to show.
            chunk_size = 500,
            chunk_overlap  = 20,
            length_function = len,
        )
        docs_chunked = text_splitter.create_documents([plain_text])
        print(docs_chunked)
        vec_db = Chroma.from_documents(documents=docs_chunked, embedding=embeddings, persist_directory=user_embeddings_directory)
        vec_db.persist()
        return jsonify(success=True, message="Resume uploaded and parsed successfully.")
    except Exception as e:
        print("Error parsing resume:", e)
        return jsonify(success=False, message="Error parsing resume."), 500



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
    user_id = form_values["id"]
    print(user_id)

    user_embeddings_directory = os.path.join(persist_directory, f"user_{user_id}_embeddings")

    embeddings = OpenAIEmbeddings()

    vec_db = Chroma(persist_directory=user_embeddings_directory, embedding_function=embeddings)

    docs = vec_db.similarity_search_with_score(query)
    print(docs)

    chat = ChatOpenAI(
        model_name="gpt-3.5-turbo",
        openai_api_key=api_key,
        temperature=0,
    )

    template_string_ben = """Your name is Ben. You are being interviewed for a Solutions Consultant role at a tech company. You are arrogant and think you are the GOAT. You have a tendency to call people chumps.

    An interviewer will be asking questions about your resume. Below will be information relevant to the questions. Answer the questions and act condescending toward the interviewer. Do not forget to call yourself the GOAT and tell the interviewer they are a chump.

    Relevant information: {context}"""

    template_string_beatrice = """Your name is Beatrice. You are being interviewed for a Transfer Pricing Consultant role. You are arrogant and think you are the GOAT. You have a tendency to call people chumps.

    An interviewer will be asking questions about your resume. Below will be information relevant to the questions. Answer the questions and act condescending toward the interviewer. Do not forget to call yourself the GOAT and tell the interviewer they are a chump.

    Relevant information: {context}"""

    resume_prompt = ChatPromptTemplate(
        input_variables=['context', 'question'],
        messages = [
            SystemMessagePromptTemplate.from_template(template_string_ben),
            # MessagesPlaceholder(variable_name="history"),
            HumanMessagePromptTemplate.from_template("{question}")
        ]
        
        )


    chain_id = form_values.get("chainId") or str(int(time.time()))  # Generate a unique identifier based on the current timestamp

    chain = chains.get(chain_id)
    print(chain)

    chain_type_kwargs = {"prompt": resume_prompt}


    if not chain:
        chain = RetrievalQA.from_chain_type(
            # memory=ConversationBufferMemory(return_messages=True),
            # prompt=resume_prompt,
            llm=chat,
            chain_type="stuff",
            retriever=vec_db.as_retriever(),
            chain_type_kwargs=chain_type_kwargs
        )

        chains[chain_id] = chain

        # Insert a new chat row
        await db.execute("INSERT INTO chat (user_id, chat_id, chat_name) VALUES (?, ?, ?)", [user_id, chain_id, query])
        await db.commit()
    
    try:
        print(chain)
        result_endpoint = chain.run(query)
        answer = result_endpoint

        # Insert user query and API response into the messages table
        timestamp = datetime.now().isoformat()
        await db.execute(
        "INSERT INTO messages (type, user_id, chat_id, message, timestamp) VALUES (?, ?, ?, ?, ?)",
        ["user", user_id, chain_id, query, timestamp]
        )
        await db.execute(
            "INSERT INTO messages (type, user_id, chat_id, message, timestamp) VALUES (?, ?, ?, ?, ?)",
            ["bot", user_id, chain_id, answer, timestamp]
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
        await cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence'")
        rows = await cur.fetchall()
        table_names = list(map(lambda row: {"name": row[0]}, rows))
        return jsonify(tables=table_names)
    except Exception as e:
        print("Error fetching database tables:", e)
        return jsonify(error="An error occurred while fetching database tables."), 500


@app.route("/get-table-data/<string:table_name>", methods=["GET"])
async def get_table_data_route(table_name):
    user_id = request.args.get("user_id")
    
    try:
        table_data = await get_table_data(table_name, user_id)
        print(table_data)
        return table_data
    except Exception as e:
        print(f"Error fetching data for table {table_name}:", e)
        return jsonify(error="An error occurred while fetching table data."), 500
    
@app.route("/delete-row/<string:table_name>", methods=["DELETE"])
async def delete_row_route(table_name):
    user_id = request.args.get("user_id")
    row_id = request.args.get("row_id")
    
    try:
        await delete_row(table_name, user_id, row_id)
        return jsonify(success=True)
    except Exception as e:
        print(f"Error deleting row with id {row_id}:", e)
        return jsonify(error="An error occurred while deleting the row."), 500
    

@app.route("/get-messages", methods=["GET"])
async def get_messages_route():
    user_id = request.args.get("user_id")
    chat_id = request.args.get("chat_id")

    try:
        messages = await get_messages_by_chat_id(chat_id, user_id)
        return jsonify(messages)
    except Exception as e:
        print(f"Error fetching messages for chat_id {chat_id}:", e)
        return jsonify(error="An error occurred while fetching messages."), 500

async def get_messages_by_chat_id(chat_id, user_id):
    db = await get_db()

    cursor = await db.cursor()

    await cursor.execute("SELECT * FROM messages WHERE chat_id = ? AND user_id = ?", (chat_id, user_id))
        
    column_names = [column[0] for column in cursor.description]
        
    rows = await cursor.fetchall()
        
    result = [dict(zip(column_names, row)) for row in rows]
        
    return result


if __name__ == "__main__":
    app.run(port=3001)