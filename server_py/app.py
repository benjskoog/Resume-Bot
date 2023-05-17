from flask import Flask, request, jsonify, g
from flask_cors import CORS
import os
import aiosqlite
import json
import secrets
from dotenv import load_dotenv
from langchain.llms import OpenAI
from langchain.prompts import (
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
    ChatPromptTemplate,
    PromptTemplate,
    MessagesPlaceholder,
)
from langchain.memory import ConversationBufferMemory, ConversationBufferWindowMemory
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
import uuid
import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions
from email_sending import send_email
from typing import Optional
import pdfplumber
import mimetypes
from job_search import search_jobs

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

    user_embeddings_directory = os.path.join(persist_directory, f"user_{user[0]}_embeddings")
    os.makedirs(user_embeddings_directory, exist_ok=True)

    chroma_client = chromadb.Client(Settings(
        chroma_db_impl="duckdb+parquet",
        persist_directory=user_embeddings_directory
    ))

    embeddings = embedding_functions.OpenAIEmbeddingFunction(
        api_key=api_key,
        model_name="text-embedding-ada-002"
    )

    chroma_client.create_collection(name="resume", embedding_function=embeddings)

    chroma_client.create_collection(name="jobs", embedding_function=embeddings)

    chroma_client.create_collection(name="questions", embedding_function=embeddings)

    return jsonify({"id": user[0], "email": user[3], "first_name": user[1], "last_name": user[2]}), 201

@app.route("/login", methods=["POST"])
async def login():
    data = request.get_json()

    # Check if the user exists
    db = await get_db()
    cursor = await db.cursor()
    await cursor.execute("SELECT * FROM users WHERE email=?", (data["email"],))
    user = await cursor.fetchone()

    if not user or not check_password_hash(user[4], data["password"]):
        return jsonify({"error": "Invalid username or password"}), 401

    # Create the access token
    access_token = create_access_token(identity=user[3])

    return jsonify({"access_token": access_token, "id": user[0], "email": user[3], "first_name": user[1], "last_name": user[2]}), 200

@app.route("/forgot-password", methods=["POST"])
async def forgot_password():
    data = request.get_json()
    email = data.get("email")

    if not email:
        return jsonify({"error": "Email is required"}), 400

    db = await get_db()
    cursor = await db.cursor()
    await cursor.execute("SELECT * FROM users WHERE email=?", (email,))
    user = await cursor.fetchone()

    if not user:
        return jsonify({"error": "No user found with the provided email"}), 404

    # Generate a password reset token
    reset_token = secrets.token_hex(16)

    # Save the token in the database with an expiration time
    await cursor.execute("INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, datetime('now', '+1 hour'))", (user[0], reset_token))
    await db.commit()

    # Send the password reset email
    reset_link = f"http://localhost:3000/reset-password?token={reset_token}"
    email_subject = "Password Reset Request"
    email_body = f"Please click the following link to reset your password: {reset_link}"
    
    send_email(email_subject, email_body, email)  # Customize this according to your email sending function

    return jsonify({"message": "A password reset link has been sent to your email address"}), 200

@app.route("/reset-password", methods=["POST"])
async def reset_password():
    data = request.get_json()
    token = data.get("token")
    new_password = data.get("password")
    print(token)
    print(new_password)

    if not token or not new_password:
        return jsonify({"error": "Token and new password are required"}), 400

    db = await get_db()
    cursor = await db.cursor()

    # Find the password reset token in the database
    await cursor.execute("SELECT * FROM password_reset_tokens WHERE token=? AND expires_at > datetime('now')", (token,))
    token_entry = await cursor.fetchone()

    if not token_entry:
        return jsonify({"error": "Invalid or expired token"}), 400

    # Update the user's password
    hashed_password = generate_password_hash(new_password, method="sha256")
    await cursor.execute("UPDATE users SET password=? WHERE id=?", (hashed_password, token_entry[1]))
    await db.commit()

    # Delete the used password reset token
    await cursor.execute("DELETE FROM password_reset_tokens WHERE token=?", (token,))
    await db.commit()

    return jsonify({"message": "Password has been successfully reset"}), 200


@app.route("/update-password", methods=["PUT"])
async def update_password():
    data = request.get_json()
    email = data.get("email")
    new_password = data.get("newPassword")

    if not email or not new_password:
        return jsonify({"type" : "error", "message": "Email and new password are required"}), 400

    db = await get_db()
    cursor = await db.cursor()

    # Find the user by email
    await cursor.execute("SELECT * FROM users WHERE email=?", (email,))
    user = await cursor.fetchone()

    if not user:
        return jsonify({"type" : "error", "message": "User not found"}), 404

    # Update the user's password
    hashed_password = generate_password_hash(new_password, method="sha256")
    await cursor.execute("UPDATE users SET password=? WHERE id=?", (hashed_password, user[0]))
    await db.commit()

    return jsonify({"type": "success", "message": "Password has been successfully updated"}), 200



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

    def extract_raw_text(resume_buffer, content_type):
        plain_text = ""
        if content_type == "application/pdf":
            with pdfplumber.open(BytesIO(resume_buffer)) as pdf:
                for page in pdf.pages:
                    plain_text += page.extract_text() + "\n"
        elif content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            document = Document(BytesIO(resume_buffer))
            for paragraph in document.paragraphs:
                plain_text += paragraph.text + "\n"
        else:
            raise ValueError("Unsupported file type")
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
        content_type, _ = mimetypes.guess_type(resume_file.filename)
        resume_buffer = resume_file.read()
    except Exception as e:
        print("Error reading uploaded file:", e)
        return jsonify(success=False, message="Error reading uploaded file."), 500

    try:
        plain_text = extract_raw_text(resume_buffer, content_type)
        resume_sections = split_resume_into_sections(plain_text)
        await save_resume_to_database(user_id, resume_sections)

        embeddings = embedding_functions.OpenAIEmbeddingFunction(
                api_key=api_key,
                model_name="text-embedding-ada-002"
        )
        text_splitter = RecursiveCharacterTextSplitter(
            # Set a really small chunk size, just to show.
            chunk_size = 500,
            chunk_overlap  = 20,
            length_function = len,
        )
        docs_chunked = text_splitter.create_documents([plain_text])
        docs_text = [doc.page_content for doc in docs_chunked]
        print(docs_text)

        doc_ids = [str(uuid.uuid4()) for _ in docs_chunked]
        metadatas = [{"type": "resume"} for _ in docs_chunked]

        chroma_client = chromadb.Client(Settings(
            chroma_db_impl="duckdb+parquet",
            persist_directory=user_embeddings_directory
        ))

        chroma_collection = chroma_client.get_or_create_collection(name="resume", embedding_function=embeddings)

        chroma_collection.delete(
            where={"type": "resume"}
        )

        chroma_collection.add(
            documents=docs_text,
            metadatas=metadatas,
            ids=doc_ids
        )

        print(chroma_collection.peek())
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
    first_name = form_values["first_name"]
    print(user_id)

    user_embeddings_directory = os.path.join(persist_directory, f"user_{user_id}_embeddings")

    embeddings = embedding_functions.OpenAIEmbeddingFunction(
        api_key=api_key,
        model_name="text-embedding-ada-002"
    )

    chroma_client = chromadb.Client(Settings(
        chroma_db_impl="duckdb+parquet",
        persist_directory=user_embeddings_directory
    ))

    try:
        
        chroma_collection_resume = chroma_client.get_collection(name="resume", embedding_function=embeddings)

        resume_docs = chroma_collection_resume.query(
            query_texts=[query],
            n_results=2,

        )

        resume_docs_texts = resume_docs["documents"]

        resume_docs_texts_flat = [doc for docs in resume_docs_texts for doc in docs]

        resume_docs_str = "\n\n".join(resume_docs_texts_flat)

    except:

        resume_docs_str = ""

    try:
        
        chroma_collection_jobs = chroma_client.get_collection(name="jobs", embedding_function=embeddings)

        jobs_docs = chroma_collection_jobs.query(
            query_texts=[query],
            n_results=4,

        )

        jobs_docs_texts = jobs_docs["documents"]

        jobs_docs_texts_flat = [doc for docs in jobs_docs_texts for doc in docs]

        jobs_docs_str = "\n\n".join(jobs_docs_texts_flat)

        context = f"""\nInformation from {first_name}'s resume:\n {resume_docs_str}""" + f"""\nInformation from {first_name}'s job applications:\n {jobs_docs_str}"""

    except:

        context = f"""\nInformation from {first_name}'s resume:\n {resume_docs_str}"""

    try:

        chroma_collection_questions = chroma_client.get_collection(name="questions", embedding_function=embeddings)

        if chroma_collection_questions.count() < 2:
            q_num = chroma_collection_questions.count()
        else:
            q_num = 2

        questions_docs = chroma_collection_questions.query(
            query_texts=[query],
            n_results=q_num,

        )

        questions_docs_texts = questions_docs["documents"]
        questions_docs_texts_flat = [doc for docs in questions_docs_texts for doc in docs]
        questions_docs_str = "\n\n".join(questions_docs_texts_flat)

        context = context + f"""\nInterview questions that have been answered by {first_name}:\n {questions_docs_str}"""

    except:
        
        context = context


    print(chroma_collection_resume.peek())

    chat = ChatOpenAI(
        model_name="gpt-3.5-turbo",
        openai_api_key=api_key,
        temperature=0,
    )

    template_chat_1 = f"""You are an intelligent career personal assistant and your job is to help {first_name} with all things career related. You may be asked to help improve their resume, help with their job applications, prepare for interviews, answer recruiter questions and more. Below is relevant information you can use to answer any questions {first_name} may have. Do not make anything up.\n""" 

    template_chat = template_chat_1 + f"""Relevant information:\n {context}\n"""

    final_template = template_chat + """{history}\n User question: {input}\n Assistant:"""


    resume_prompt = PromptTemplate(
        input_variables=['history','input'],
        template=final_template      
        )

    chain_id = form_values.get("chainId") or str(int(time.time()))  # Generate a unique identifier based on the current timestamp

    chain = chains.get(chain_id)
    print(chain)

    if not chain:
        chain = ConversationChain(
            llm=chat,
            prompt=resume_prompt,
            verbose=True,
            memory=ConversationBufferWindowMemory(k=2),
        )

        chains[chain_id] = chain

        await db.execute("INSERT INTO chat (user_id, chat_id, chat_name) VALUES (?, ?, ?)", [user_id, chain_id, query])
        await db.commit()
    
    try:
        print(chain)
        result_endpoint = chain.predict(input=query)
        answer = result_endpoint
        print(answer)

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

@app.route("/get-answer-help", methods=["POST"])
async def get_answer_help():
    db = await get_db()
    form_values = request.json
    query = form_values["query"]
    user_id = form_values["id"]
    question_id = form_values["question_id"]
    question_answer = form_values.get("question_answer")
    job_id = form_values.get("job_id")
    print(user_id)

    user_embeddings_directory = os.path.join(persist_directory, f"user_{user_id}_embeddings")

    embeddings = embedding_functions.OpenAIEmbeddingFunction(
        api_key=api_key,
        model_name="text-embedding-ada-002"
    )

    chroma_client = chromadb.Client(Settings(
        chroma_db_impl="duckdb+parquet",
        persist_directory=user_embeddings_directory
    ))


    chroma_collection_jobs = chroma_client.get_or_create_collection(name="jobs", embedding_function=embeddings)

    chroma_collection_resume = chroma_client.get_or_create_collection(name="resume", embedding_function=embeddings)

    chroma_collection_questions = chroma_client.get_or_create_collection(name="questions", embedding_function=embeddings)

    resume_docs = chroma_collection_resume.query(
        query_texts=[query],
        n_results=2
    )

    resume_docs_texts = resume_docs["documents"]
    resume_docs_texts_flat = [doc for docs in resume_docs_texts for doc in docs]
    resume_docs_str = "\n\n".join(resume_docs_texts_flat)

    try:
        questions_docs = chroma_collection_questions.query(
            query_texts=[query],
            n_results=2
        )
        
        questions_docs_texts = questions_docs["documents"]
        questions_docs_texts_flat = [doc for docs in questions_docs_texts for doc in docs]
        questions_docs_str = "\n\n".join(questions_docs_texts_flat)
    except:
        questions_docs_str = ""

    chat = ChatOpenAI(
        model_name="gpt-3.5-turbo",
        openai_api_key=api_key,
        temperature=0,
    )

    if question_answer:

        template_base = """You are an intelligent career bot and your job is to help users improve their resume, speak more effectively about their work experience, and provide career guidance. In this case, the user is trying to prepare answers to interview questions specific to their role.

        Please improve the user's answer based on the information below and provide a recommendation to them on how they can better answer the question. 
        
        Your response must be in JSON with the following properties: "answer": "" , "recommendation": "". Relevant information is provided below. Do not make anything up.\n""" + f"""User's current answer: {question_answer}\n"""
    else:

        template_base = """You are an intelligent career bot and your job is to help users improve their resume, speak more effectively about their work experience, and provide career guidance. In this case, the user is trying to prepare answers to interview questions specific to their role.

        Please answer the question from the user's perspective and provide a recommendation to the user on what they need to include to improve the answer you provided. Your response must be in JSON with the following properties: "answer" : "", "recommendation": "". Relevant information is provided below. Do not make anything up.\n"""

    if job_id:

        job_docs = chroma_collection_jobs.query(
            query_texts=[query],
            n_results=2,
            where={"job_id": job_id}  # directly convert job_id to string
        )

        job_docs_texts = job_docs["documents"]
        job_docs_texts_flat = [doc for docs in job_docs_texts for doc in docs]
        job_docs_str = "\n\n".join(job_docs_texts_flat)

        template_help = template_base + f"""Information from a job post the user is applying to:\n {job_docs_str}""" + f"""\nInformation from the users resume:\n {resume_docs_str}""" + f"""\nInterview questions that have been answered by the user:\n {questions_docs_str}"""

    else:

        template_help = template_base + f"""\nInformation from the users resume:\n {resume_docs_str}""" + f"""\nInterview questions that have been answered by the user:\n {questions_docs_str}"""

    template_final = template_help + """\nInterview question: {context}"""

    print(template_final)


    chain = LLMChain(
        llm=chat,
        prompt=PromptTemplate.from_template(template_final)
    )
    
    try:
        result_endpoint = chain.run(query)
        print(result_endpoint)
        answer = json.loads(result_endpoint)
        print(answer)

        db = await get_db()
        cursor = await db.cursor()

        await cursor.execute(
            "UPDATE interview_questions SET recommendation = ? WHERE id = ?",
            (answer["recommendation"], question_id),
        )

        await db.commit()  # Commit the changes to the database

        return jsonify(answer)
    except Exception as e:
        print(e)
        return jsonify(success=False, message="Error fetching GPT-3.5 API"), 500

@app.route("/generate-interview-questions", methods=["POST"])
async def generate_interview_questions():
    form_values = request.json
    print(form_values)
    user_id = form_values["user_id"]
    job_id = form_values.get("job_id")
    question_type = form_values["type"]

    chat = ChatOpenAI(
        model_name="gpt-3.5-turbo",
        openai_api_key=api_key,
        temperature=0,
    )

    db = await get_db()
    cursor = await db.cursor()

    await cursor.execute(f"SELECT * FROM interview_questions WHERE user_id = ?", (user_id,))

    existing_questions = await cursor.fetchall()
    questions_list = [row[2] for row in existing_questions]
    questions_str = ', '.join(f'"{question}"' for question in questions_list)

    if question_type == 'WorkExperience':
        type_string = "specific to their work experience"
    
    if question_type =="RoleBased":
        type_string = "specific to their industry and role"

    if question_type =="Technical":
        type_string = "specific to their technical capabilities"

    user_embeddings_directory = os.path.join(persist_directory, f"user_{user_id}_embeddings")

    embeddings = embedding_functions.OpenAIEmbeddingFunction(
        api_key=api_key,
        model_name="text-embedding-ada-002"
    )

    chroma_client = chromadb.Client(Settings(
        chroma_db_impl="duckdb+parquet",
        persist_directory=user_embeddings_directory
    ))

    chroma_collection_resume = chroma_client.get_or_create_collection(name="resume", embedding_function=embeddings)

    resume_docs = chroma_collection_resume.query(
        query_texts=[type_string],
        n_results=4
    )

    resume_docs_texts = resume_docs["documents"]
    resume_docs_texts_flat = [doc for docs in resume_docs_texts for doc in docs]
    resume_docs_str = "\n\n".join(resume_docs_texts_flat)
 
    if job_id:

        resume = resume_docs_str

        await cursor.execute(f"SELECT * FROM saved_jobs WHERE id = ? AND user_id = ?", (job_id, user_id,))

        job = await cursor.fetchall()

        print(job)

        template_questions_base = f"""Below is a user's resume and the description for a job they are applying to. Please return 3 interview questions {type_string} that they might be asked during an interview for this job. Please return the questions separated by newlines.
        
        Job Description: {job[0][4]}
        """

    else:
        template_questions_base = f"""Below is a user's resume. Please return 3 interview questions {type_string} that they might be asked during an interview. Please return the questions separated by newlines."""

        await cursor.execute(f"SELECT * FROM resume WHERE section = ? AND user_id = ?", ("FULL RESUME",user_id,))
        resume = await cursor.fetchall()

    if existing_questions:
        exclude_similar = f"""These questions have already been asked: [{questions_str}]"""
    else:
        exclude_similar = ""

    template_final = template_questions_base + """Resume: {context} """ + exclude_similar


    chain = LLMChain(
        llm=chat,
        prompt=PromptTemplate.from_template(template_final)
    )

    chain_id = str(int(time.time()))  # Generate a unique identifier based on the current timestamp

    try:
        questions_response = chain(resume)
        print(questions_response)
        # Convert the questions string into a Python list
        questions_string = questions_response['text']
        questions_list = [re.sub(r'^\d+\.\s*', '', i) for i in questions_string.split('\n')]
        # Save the questions to the interview_questions table
        for question in questions_list:
            await cursor.execute(
                "INSERT INTO interview_questions (user_id, job_id, question) VALUES (?, ?, ?)",
                (user_id, job_id, question),
            )

        # Commit the changes to the database
        await db.commit()

        return jsonify(questions=questions_list, chainId=chain_id)
    except Exception as e:
        print(e)
        return jsonify(success=False, message="Error fetching GPT-3.5 API"), 500


@app.route("/get-interview-questions", methods=["POST"])
async def get_interview_questions():
    db = await get_db()
    data = request.json
    user_id = data["user_id"]
    job_id = data.get("job_id")  # Get job_id if it exists in the request

    cursor = await db.cursor()

    if job_id:
        # Filter interview questions by user_id and job_id
        await cursor.execute("SELECT * FROM interview_questions WHERE user_id = ? AND job_id = ?", (user_id, job_id))
    else:
        # Filter interview questions only by user_id
        await cursor.execute("SELECT * FROM interview_questions WHERE user_id = ?", (user_id,))

    interview_questions = await cursor.fetchall()

    questions = [
        {
            "id": question[0],
            "user_id": question[1],
            "question": question[3],
            "answer": question[4],
            "job_id": question[2],
            "recommendation": question[5]
        }
        for question in interview_questions
    ]

    return jsonify(questions=questions)

@app.route("/delete-interview-question", methods=["POST"])
async def delete_interview_question():
    db = await get_db()
    data = request.json
    user_id = data["user_id"]
    question_id = data["question_id"]

    user_embeddings_directory = os.path.join(persist_directory, f"user_{user_id}_embeddings")
    os.makedirs(user_embeddings_directory, exist_ok=True)

    cursor = await db.cursor()
    try:
        embeddings = embedding_functions.OpenAIEmbeddingFunction(
            api_key=api_key,
            model_name="text-embedding-ada-002"
        )

        chroma_client = chromadb.Client(Settings(
            chroma_db_impl="duckdb+parquet",
            persist_directory=user_embeddings_directory
        ))

        chroma_collection = chroma_client.get_or_create_collection(name="questions", embedding_function=embeddings)

        chroma_collection.delete(
            ids=[str(question_id)]
        )

        await cursor.execute("DELETE FROM interview_questions WHERE id = ? AND user_id = ?", (question_id, user_id))
        await db.commit()
        return jsonify(success=True, message="Interview question deleted successfully")
    except Exception as e:
        print(e)
        return jsonify(success=False, message="Error deleting the interview question")


@app.route("/save-answer", methods=["POST"])
async def save_answer():

    db = await get_db()
    data = request.json
    user_id = data["user_id"]
    question_id = data["question_id"]
    question = data["question"]
    answer = data["answer"]

    user_embeddings_directory = os.path.join(persist_directory, f"user_{user_id}_embeddings")
    os.makedirs(user_embeddings_directory, exist_ok=True)

    try:
        cursor = await db.cursor()
        await cursor.execute(
            "UPDATE interview_questions SET answer = ? WHERE id = ?",
            (answer, question_id),
        )
        await db.commit()

        embeddings = embedding_functions.OpenAIEmbeddingFunction(
            api_key=api_key,
            model_name="text-embedding-ada-002"
        )

        chroma_client = chromadb.Client(Settings(
            chroma_db_impl="duckdb+parquet",
            persist_directory=user_embeddings_directory
        ))

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size = 5000,
            chunk_overlap  = 20,
            length_function = len,
        )
        docs_chunked = text_splitter.create_documents([f"Question: {question}, Answer: {answer}"])
        docs_text = [doc.page_content for doc in docs_chunked]
        doc_ids = [f"{question_id}"]

        metadatas = [{"type": "question_answers"} for _ in docs_chunked]

        chroma_client = chromadb.Client(Settings(
            chroma_db_impl="duckdb+parquet",
            persist_directory=user_embeddings_directory
        ))

        try:
            chroma_collection = chroma_client.get_or_create_collection(name="questions", embedding_function=embeddings)

        except:
            chroma_collection = chroma_client.create_collection(name="questions", embedding_function=embeddings)
        
        if answer.strip():

            chroma_collection.add(
                documents=docs_text,
                metadatas=metadatas,
                ids=doc_ids
            )

        return jsonify(success=True)
    except Exception as e:
        print(e)
        return jsonify(success=False, message="Error updating answer"), 500
    
@app.route("/edit-answer", methods=["POST"])
async def edit_answer():
    db = await get_db()
    data = request.json
    user_id = data["user_id"]
    question_id = data["question_id"]
    question = data["question"]
    answer = data["answer"]

    user_embeddings_directory = os.path.join(persist_directory, f"user_{user_id}_embeddings")
    os.makedirs(user_embeddings_directory, exist_ok=True)

    try:
        cursor = await db.cursor()
        await cursor.execute(
            "UPDATE interview_questions SET answer = ? WHERE id = ?",
            (answer, question_id),
        )
        await db.commit()

        embeddings = embedding_functions.OpenAIEmbeddingFunction(
            api_key=api_key,
            model_name="text-embedding-ada-002"
        )
        
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=5000,
            chunk_overlap=20,
            length_function=len,
        )
        docs_chunked = text_splitter.create_documents([f"Question: {question}, Answer: {answer}"])
        docs_text = [doc.page_content for doc in docs_chunked]

        doc_ids = [f"{question_id}"]

        chroma_client = chromadb.Client(Settings(
            chroma_db_impl="duckdb+parquet",
            persist_directory=user_embeddings_directory
        ))

        try:
            chroma_collection = chroma_client.get_or_create_collection(name="questions", embedding_function=embeddings)
            print(chroma_collection)

        except KeyError:
            chroma_collection = chroma_client.create_collection(name="questions", embedding_function=embeddings)

        if answer.strip():
            chroma_collection.update(
                documents=docs_text,
                ids=doc_ids
            )

        # vec_db = Chroma.from_documents(documents=docs_chunked, embedding=embeddings, persist_directory=user_embeddings_directory)
        # vec_db.persist()

        return jsonify(success=True)
    except Exception as e:
        print(e)
        return jsonify(success=False, message="Error updating answer"), 500

@app.route("/generate-recommendations", methods=["POST"])
async def generate_recommendations():
    db = await get_db()
    data = request.json
    user_id = data["user_id"]
    job_id = data.get("job_id")
    version_id = data.get("version_id")

    chat = ChatOpenAI(
        model_name="gpt-3.5-turbo",
        openai_api_key=api_key,
        temperature=0,
    )

    user_embeddings_directory = os.path.join(persist_directory, f"user_{user_id}_embeddings")

    cursor = await db.cursor()

    await cursor.execute(f"SELECT * FROM saved_jobs WHERE id = ? AND user_id = ?", (job_id, user_id,))

    job = await cursor.fetchall()

    await cursor.execute(f"SELECT * FROM resume WHERE section = ? AND user_id = ?", ("FULL RESUME",user_id,))
    
    resume = await cursor.fetchall()

    await cursor.execute(f"SELECT * FROM resume_recommendations WHERE user_id = ? AND job_id = ?", (user_id, job_id,))

    existing_recommendations = await cursor.fetchall()
    recommendations_list = [row[2] for row in existing_recommendations]
    recommendations_str = ', '.join(f'"{question}"' for question in recommendations_list)

    embeddings = embedding_functions.OpenAIEmbeddingFunction(
        api_key=api_key,
        model_name="text-embedding-ada-002"
    )

    chroma_client = chromadb.Client(Settings(
        chroma_db_impl="duckdb+parquet",
        persist_directory=user_embeddings_directory
    ))

    chroma_collection_jobs = chroma_client.get_or_create_collection(name="jobs", embedding_function=embeddings)

    chroma_collection_resume = chroma_client.get_or_create_collection(name="resume", embedding_function=embeddings)

    jobs_docs = chroma_collection_jobs.query(
        query_texts=["What are the important responsibilities, qualifications, skills, and requirements for this job?"],
        n_results=4
    )

    resume_docs = chroma_collection_resume.query(
        query_texts=["What are the important responsibilities, qualifications, skills, and requirements outlined in this resume?"],
        n_results=4
    )

    jobs_docs_texts = jobs_docs["documents"]
    jobs_docs_texts_flat = [doc for docs in jobs_docs_texts for doc in docs]
    jobs_docs_str = "\n\n".join(jobs_docs_texts_flat)

    resume_docs_texts = resume_docs["documents"]
    resume_docs_texts_flat = [doc for docs in resume_docs_texts for doc in docs]
    resume_docs_str = "\n\n".join(resume_docs_texts_flat)

    template_questions_base = f"""Below is relevant information from a user's resume and the description of a job they are applying to. Please provide 5 recommendations to the user on how they can update their resume to increase their chances of landing an interview. Please return the recommendations separated by newlines.
        
    Job Description Information: {jobs_docs_str}"""

    if existing_recommendations:
        exclude_similar = f"""These recommendations have already been provided: [{recommendations_str}]"""
    else:
        exclude_similar = ""

    template_final = template_questions_base + """\nResume: {context}\n """ + exclude_similar


    chain = LLMChain(
        llm=chat,
        verbose=True,
        prompt=PromptTemplate.from_template(template_final)
    )

    try:
        recommendation_response = chain(resume_docs_str)
        print(recommendation_response)
        # Convert the questions string into a Python list
        recommendation_string = recommendation_response['text']
        recommendation_list = [re.sub(r'^\d+\.\s*', '', i) for i in recommendation_string.split('\n')]

        # Save the questions to the interview_questions table
        for recommendation in recommendation_list:
            await cursor.execute(
                "INSERT INTO resume_recommendations (user_id, job_id, version_id, recommendation) VALUES (?, ?, ?, ?)",
                (user_id, job_id, version_id ,recommendation),
            )

        # Commit the changes to the database
        await db.commit()

        return jsonify(recommendations=recommendation_list)
    except Exception as e:
        print(e)
        return jsonify(success=False, message="Error fetching GPT-3.5 API"), 500

@app.route("/get-recommendations", methods=["POST"])
async def get_recommendations():
    db = await get_db()
    data = request.json
    user_id = data["user_id"]
    version_id = data.get("version_id")
    job_id = data.get("job_id")

    print(data)

    cursor = await db.cursor()

    # Fetch recommendations based on user_id and version_id
    # Replace 'recommendations' with the appropriate table name and columns

    if version_id:

        await cursor.execute("SELECT * FROM resume_recommendations WHERE user_id = ? AND version_id = ?", (user_id, version_id))

    elif job_id:
        
        await cursor.execute("SELECT * FROM resume_recommendations WHERE user_id = ? AND job_id = ?", (user_id, job_id))
        
    recommendations = await cursor.fetchall()

    print("Recommendations fetched:", recommendations) 

    recommendations_data = [
        {
            "id": rec[0],
            "user_id": rec[1],
            "version_id": rec[2],
            "recommendation" : rec[4]

        }
        for rec in recommendations
    ]

    return jsonify(recommendations=recommendations_data)


@app.route("/delete-recommendation", methods=["POST"])
async def delete_recommendation():
    db = await get_db()
    data = request.json
    user_id = data["user_id"]
    recommendation_id = data["recommendation_id"]

    cursor = await db.cursor()
    try:
        # Delete the recommendation based on recommendation_id and user_id
        # Replace 'recommendations' with the appropriate table name
        await cursor.execute("DELETE FROM resume_recommendations WHERE id = ? AND user_id = ?", (recommendation_id, user_id))
        await db.commit()
        return jsonify(success=True, message="Recommendation deleted successfully")
    except Exception as e:
        print(e)
        return jsonify(success=False, message="Error deleting the recommendation")


@app.route("/get-jobs", methods=["POST"])
async def get_jobs():
    db = await get_db()
    data = request.json
    user_id = data["user_id"]
    page = int(data.get("page", 1))
    items_per_page = int(data.get("itemsPerPage", 10))

    cursor = await db.cursor()
    await cursor.execute("SELECT * FROM saved_jobs WHERE user_id = ? ORDER BY date_created DESC LIMIT ? OFFSET ?", (user_id, items_per_page, (page - 1) * items_per_page))
    saved_jobs = await cursor.fetchall()

    jobs = [
        {
            "id": job[0],
            "user_id": job[1],
            "job_title": job[2],
            "company_name": job[3],
            "job_description": job[4],
            "status": job[5],
            "date_added": job[6],
            "post_url": job[7],
        }
        for job in saved_jobs
    ]

    return jsonify(jobs=jobs, headers=["Job Title/Role", "Company Name", "Job Description", "Status"])

@app.route("/create-job", methods=["POST"])
async def create_job():
    db = await get_db()
    data = request.json
    user_id = data["user_id"]
    job_title = data["job_title"]
    company_name = data["company_name"]
    job_description = data["job_description"]
    status = data["status"]
    post_url = data["post_url"]
    date_created = datetime.utcnow()

    user_embeddings_directory = os.path.join(persist_directory, f"user_{user_id}_embeddings")
    os.makedirs(user_embeddings_directory, exist_ok=True)

    cursor = await db.cursor()
    await cursor.execute(
        "INSERT INTO saved_jobs (user_id, job_title, company_name, job_description, status, post_url, date_created) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (user_id, job_title, company_name, job_description, status, post_url, date_created),
    )

    await db.commit()

    job_id = cursor.lastrowid

    job_string = f"""
    Job Title: {job_title}

    Company Name: {company_name}

    Job Description: {job_description}

    Status: {status}

    Post URL: {post_url}

    Date Created: {date_created}
    """

    try:

        await db.commit()

        embeddings = embedding_functions.OpenAIEmbeddingFunction(
            api_key=api_key,
            model_name="text-embedding-ada-002"
        )

        text_splitter = RecursiveCharacterTextSplitter(
            # Set a really small chunk size, just to show.
            chunk_size = 500,
            chunk_overlap  = 20,
            length_function = len,
        )

        docs_chunked = text_splitter.create_documents([job_string])
        docs_text = [doc.page_content for doc in docs_chunked]
        print(docs_text)

        doc_ids = [str(uuid.uuid4()) for _ in docs_chunked]
        metadatas = [{"job_id": job_id} for _ in docs_chunked]
   
        chroma_client = chromadb.Client(Settings(
            chroma_db_impl="duckdb+parquet",
            persist_directory=user_embeddings_directory
        ))


        try:
            chroma_collection = chroma_client.get_or_create_collection(name="jobs", embedding_function=embeddings)

        except:
            chroma_collection = chroma_client.create_collection(name="jobs", embedding_function=embeddings)

        chroma_collection.add(
            documents=docs_text,
            metadatas=metadatas,
            ids=doc_ids
        )

        print(chroma_collection.get(
            where={"job_id": job_id}
        ))

        return jsonify(
            success=True,
            id=job_id,
            user_id=user_id,
            job_title=job_title,
            company_name=company_name,
            job_description=job_description,
            status=status,
            post_url=post_url,
            date_created=date_created
        )

    except Exception as e:
        print(e)
        return jsonify(success=False, message="Error updating answer"), 500


@app.route("/edit-job/<int:job_id>", methods=["PUT"])
async def edit_joblication(job_id):
    db = await get_db()
    data = request.json
    user_id = data["user_id"]
    job_title = data["job_title"]
    company_name = data["company_name"]
    job_description = data["job_description"]
    status = data["status"]
    post_url = data["post_url"]

    cursor = await db.cursor()
    await cursor.execute(
        "UPDATE saved_jobs SET user_id = ?, job_title = ?, company_name = ?, job_description = ?, status = ?, post_url = ? WHERE id = ?",
        (user_id, job_title, company_name, job_description, status, post_url, job_id),
    )
    await db.commit()

    return jsonify(success=True, job_id=job_id)

@app.route("/delete-job/<int:job_id>", methods=["DELETE"])
async def delete_joblication(job_id):
    # Retrieve the user_id from the request body
    user_id = request.json.get('user_id')

    user_embeddings_directory = os.path.join(persist_directory, f"user_{user_id}_embeddings")
    os.makedirs(user_embeddings_directory, exist_ok=True)

    db = await get_db()

    cursor = await db.cursor()
    # Update the SQL DELETE statement to delete the record that matches both user_id and job_id
    await cursor.execute(
        "DELETE FROM saved_jobs WHERE id = ? AND user_id = ?", (job_id, user_id)
    )
    await db.commit()

    embeddings = embedding_functions.OpenAIEmbeddingFunction(
        api_key=api_key,
        model_name="text-embedding-ada-002"
    )
        
    chroma_client = chromadb.Client(Settings(  
        chroma_db_impl="duckdb+parquet",
        persist_directory=user_embeddings_directory
    ))

    chroma_collection = chroma_client.get_or_create_collection(name="jobs", embedding_function=embeddings)

    chroma_collection.delete(
        where={"job_id": job_id}
    )

    return jsonify(success=True)

@app.route("/get-resume-versions", methods=["POST"])
async def get_resume_versions():
    db = await get_db()
    data = request.json
    user_id = data["user_id"]
    job_id = data.get("job_id")
    page = int(data.get("page", 1))
    items_per_page = int(data.get("itemsPerPage", 10))

    cursor = await db.cursor()

    if job_id:
        await cursor.execute("SELECT * FROM resume_versions WHERE user_id = ? AND job_id = ?", (user_id, job_id,))
    else:
        await cursor.execute("SELECT * FROM resume_versions WHERE user_id = ? LIMIT ? OFFSET ?", (user_id, items_per_page, (page - 1) * items_per_page))
    
    resume_versions = await cursor.fetchall()

    versions = []

    for version in resume_versions:
        job_id = version[2]
        await cursor.execute("SELECT * FROM saved_jobs WHERE id = ?", (job_id,))
        job = await cursor.fetchone()

        versions.append({
            "id": version[0],
            "user_id": version[1],
            "job_id": job_id,
            "job_title": job[2],
            "company_name": job[3],
            "version_name": version[3],
            "version_text": version[4]
        })

    return jsonify(versions=versions, headers=["Job Title/Role", "Company Name", "Job Description", "Status"])


@app.route("/create-resume-version", methods=["POST"])
async def create_resume_version():
    db = await get_db()
    data = request.json
    user_id = data["user_id"]
    job_id = data["job_id"]
    version_name = data.get("version_name")

    chat = ChatOpenAI(
        model_name="gpt-3.5-turbo",
        openai_api_key=api_key,
        temperature=0,
    )

    cursor = await db.cursor()

    await cursor.execute(f"SELECT * FROM saved_jobs WHERE id = ? AND user_id = ?", (job_id, user_id,))

    job = await cursor.fetchone()

    await cursor.execute(f"SELECT * FROM resume WHERE section = ? AND user_id = ?", ("FULL RESUME",user_id,))
    
    resume = await cursor.fetchall()

    user_embeddings_directory = os.path.join(persist_directory, f"user_{user_id}_embeddings")

    embeddings = embedding_functions.OpenAIEmbeddingFunction(
        api_key=api_key,
        model_name="text-embedding-ada-002"
    )

    chroma_client = chromadb.Client(Settings(
        chroma_db_impl="duckdb+parquet",
        persist_directory=user_embeddings_directory
    ))

    chroma_collection_jobs = chroma_client.get_or_create_collection(name="jobs", embedding_function=embeddings)

    chroma_collection_resume = chroma_client.get_or_create_collection(name="resume", embedding_function=embeddings)

    jobs_docs = chroma_collection_jobs.query(
        query_texts=["What are the important responsibilities, qualifications, skills, and requirements for this job?"],
        n_results=4
    )

    resume_docs = chroma_collection_resume.query(
        query_texts=["What are the important responsibilities, qualifications, skills, and requirements outlined in this resume?"],
        n_results=4
    )

    jobs_docs_texts = jobs_docs["documents"]
    jobs_docs_texts_flat = [doc for docs in jobs_docs_texts for doc in docs]
    jobs_docs_str = "\n\n".join(jobs_docs_texts_flat)

    resume_docs_texts = resume_docs["documents"]
    resume_docs_texts_flat = [doc for docs in resume_docs_texts for doc in docs]
    resume_docs_str = "\n\n".join(resume_docs_texts_flat)

    template_questions_base = f"""Below is relevant information from a user's resume and the description of a job they are applying to. Please provide 5 recommendations to the user on how they can update their resume to increase their chances of landing an interview. Please return the recommendations separated by newlines.
            
    Job Description Information: {jobs_docs_str}"""

    template_final = template_questions_base + """Resume Information: {context} """



    chain = LLMChain(
        llm=chat,
        prompt=PromptTemplate.from_template(template_final)
    )

    try:
        recommendation_response = chain(resume_docs_str)
        print(recommendation_response)
        # Convert the questions string into a Python list
        recommendation_string = recommendation_response['text']
        recommendation_list = [re.sub(r'^\d+\.\s*', '', i) for i in recommendation_string.split('\n')]

        await cursor.execute(
            "INSERT INTO resume_versions (user_id, job_id, version_name) VALUES (?, ?, ?)",
            (user_id, job_id, version_name),
        )

        version_id = cursor.lastrowid

        # Save the questions to the interview_questions table
        for recommendation in recommendation_list:
            await cursor.execute(
                "INSERT INTO resume_recommendations (user_id, job_id, version_id, recommendation) VALUES (?, ?, ?, ?)",
                (user_id, job_id, version_id ,recommendation),
            )

        # Commit the changes to the database
        await db.commit()

        return jsonify({"id": version_id, "user_id": user_id, "job_id": job_id, "version_name": version_name, "job_title": job[2], "company_name": job[3]})
    
    except Exception as e:
        print(e)
        return jsonify(success=False, message="Error fetching GPT-3.5 API"), 500



@app.route("/edit-resume-version/<int:resume_version_id>", methods=["PUT"])
async def edit_resume_version(resume_version_id):
    db = await get_db()
    data = request.json
    user_id = data["user_id"]
    job_id = data["job_id"]
    version_name = data["version_name"]

    cursor = await db.cursor()
    await cursor.execute(
        "UPDATE resume_versions SET user_id = ?, job_id = ?, version_name = ? WHERE id = ?",
        (user_id, job_id, version_name, resume_version_id),
    )
    await db.commit()

    return jsonify(success=True, resume_version_id=resume_version_id)


@app.route("/delete-resume-version/<int:resume_version_id>", methods=["DELETE"])
async def delete_resume_version(resume_version_id):
    db = await get_db()

    cursor = await db.cursor()
    await cursor.execute(
        "DELETE FROM resume_versions WHERE id = ?", (resume_version_id,)
    )
    await db.commit()

    return jsonify(success=True)

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
    
@app.route("/delete-row/<string:table_name>/<int:row_id>", methods=["DELETE"])
async def delete_row_route(table_name, row_id):
    user_id = request.args.get("user_id")
    
    try:
        deleted_rows = await delete_row(table_name, user_id, row_id)
        return jsonify(deleted_rows=deleted_rows)
    except Exception as e:
        print(f"Error deleting row {row_id} from table {table_name}:", e)
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