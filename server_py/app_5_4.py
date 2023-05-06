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
import uuid
import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions
from email_sending import send_email
from typing import Optional


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

        collection_name = "langchain"

        try:
            chroma_collection = chroma_client.get_collection(name=collection_name, embedding_function=embeddings)

            chroma_collection.delete(
                where={"type": "resume"}
            )

        except:
            chroma_collection = chroma_client.create_collection(name=collection_name, embedding_function=embeddings)
       
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
    request_type = form_values["type"]
    print(user_id)

    user_embeddings_directory = os.path.join(persist_directory, f"user_{user_id}_embeddings")

    embeddings = embedding_functions.OpenAIEmbeddingFunction(
        api_key=api_key,
        model_name="text-embedding-ada-002"
    )

    embeddings_langchain = OpenAIEmbeddings()

    chroma_client = chromadb.Client(Settings(
        chroma_db_impl="duckdb+parquet",
        persist_directory=user_embeddings_directory
    ))

    collection_name = "langchain"

    try:
        chroma_collection = chroma_client.get_collection(name=collection_name, embedding_function=embeddings)

    except KeyError:
        chroma_collection = chroma_client.create_collection(name=collection_name, embedding_function=embeddings)

    print(chroma_collection.peek())

    docs = chroma_collection.query(
        query_texts=[query],
        n_results=3
    )
    print(docs)

    vec_db = Chroma(persist_directory=user_embeddings_directory, embedding_function=embeddings_langchain)

    chat = ChatOpenAI(
        model_name="gpt-3.5-turbo",
        openai_api_key=api_key,
        temperature=0,
    )

    template_help = """You are an intelligent career bot and your job is to help users improve their resume, speak more effectively about their work experience, and provide career guidance. In this case, the user is trying to prepare answers to interview questions specific to their role.

    Please answer the question from the user's perspective and limit your answer to one paragraph. Relevant information from the user's resume is provided below. In a paragraph below the answer, provide a recommendation to them on how they can improve the answer. Do not make anything up.

    Relevant information: {context}"""

    template_chat_1 = f"""You are an intelligent career personal assistant and your job is to help {first_name} with all things career related. You may be asked to help improve their resume, answer interview questions, prepare for interview, answer recruiter questions and more. 
    
    Below is relevant information you can use to answer any questions {first_name} may have. Do not make anything up.""" 

    template_chat = template_chat_1 + """Relevant information: {context}"""

    if request_type == 'chat':
        final_template = template_chat
    else:
        final_template = template_help


    resume_prompt = ChatPromptTemplate(
        input_variables=['context', 'question'],
        messages = [
            SystemMessagePromptTemplate.from_template(final_template),
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

        if request_type == 'chat':
            await db.execute("INSERT INTO chat (user_id, chat_id, chat_name) VALUES (?, ?, ?)", [user_id, chain_id, query])
            await db.commit()
    
    try:
        print(chain)
        result_endpoint = chain.run(query)
        answer = result_endpoint

        # Insert user query and API response into the messages table
        if request_type == 'chat':
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

@app.route("/generate-interview-questions", methods=["POST"])
async def generate_interview_questions():
    form_values = request.json
    print(form_values)
    user_id = form_values["id"]
    job_app_id = form_values["job_app_id"]
    question_type = form_values["type"]

    chat = ChatOpenAI(
        model_name="gpt-3.5-turbo",
        openai_api_key=api_key,
        temperature=0,
    )

    db = await get_db()
    cursor = await db.cursor()
    await cursor.execute(f"SELECT * FROM resume WHERE section = ? AND user_id = ?", ("FULL RESUME",user_id,))
    resume = await cursor.fetchall()

    await cursor.execute(f"SELECT * FROM interview_questions WHERE user_id = ?", (user_id,))

    existing_questions = await cursor.fetchall()
    questions_list = [row[2] for row in existing_questions]
    questions_str = ', '.join(f'"{question}"' for question in questions_list)

    if job_app_id:
        user_embeddings_directory = os.path.join(persist_directory, f"user_{user_id}_embeddings")

        embeddings = embedding_functions.OpenAIEmbeddingFunction(
            api_key=api_key,
            model_name="text-embedding-ada-002"
        )

        chroma_client = chromadb.Client(Settings(
            chroma_db_impl="duckdb+parquet",
            persist_directory=user_embeddings_directory
        ))

        collection_name = "langchain"

        try:
            chroma_collection = chroma_client.get_collection(name=collection_name, embedding_function=embeddings)

        except KeyError:
            chroma_collection = chroma_client.create_collection(name=collection_name, embedding_function=embeddings)

        print(chroma_collection.peek())

        qualifications = chroma_collection.get(
            where={
                    "$and": [
                        {
                            "section": {
                                "$eq": "qualifications"
                            }
                        },
                        {
                            "job_app_id": {
                                "$eq": job_app_id
                            }
                        }
                    ]
                }
        )

        responsibilities = chroma_collection.get(
            where={
                    "$and": [
                        {
                            "section": {
                                "$eq": "responsibilities"
                            }
                        },
                        {
                            "job_app_id": {
                                "$eq": job_app_id
                            }
                        }
                    ]
                }
        )

        company_description = chroma_collection.get(
            where={
                    "$and": [
                        {
                            "section": {
                                "$eq": "company_description"
                            }
                        },
                        {
                            "job_app_id": {
                                "$eq": job_app_id
                            }
                        }
                    ]
                }
        )

        print(qualifications)
        print(company_description)

        template_questions_resume_base = """Below is a user's resume. Please return 3 interview questions specific to their work experience that they might be asked during an interview. Please return the questions in the following format: ['question1','question2','question3','question4','question5']

        Resume: {context}"""

        template_questions_job_base = """Below is a user's resume. Please return 3 interview questions specific to their industry and role that they might be asked during an interview. These questions would be asked of every candidate. Please return the questions in the following format: ['question1','question2','question3','question4','question5']

        Resume: {context}"""

    else:
        template_questions_resume_base = """Below is a user's resume. Please return 3 interview questions specific to their work experience that they might be asked during an interview. Please return the questions in the following format: ['question1','question2','question3','question4','question5']

        Resume: {context}"""

        template_questions_job_base = """Below is a user's resume. Please return 3 interview questions specific to their industry and role that they might be asked during an interview. These questions would be asked of every candidate. Please return the questions in the following format: ['question1','question2','question3','question4','question5']

        Resume: {context}"""

    if existing_questions:
        exclude_similar = f"""Do not include questions similar to these: [{questions_str}]"""
    else:
        exclude_similar = ""

    template_questions_resume = template_questions_resume_base + exclude_similar
    template_questions_job = template_questions_job_base + exclude_similar
    
    if question_type == 'WorkExperience':
        selected_template = template_questions_resume
    else:
        selected_template = template_questions_job

    chain = LLMChain(
        llm=chat,
        prompt=PromptTemplate.from_template(selected_template)
    )

    chain_id = str(int(time.time()))  # Generate a unique identifier based on the current timestamp

    try:
        questions_response = chain(resume)
        print(questions_response)
        # Convert the questions string into a Python list
        questions_string = questions_response['text'].replace("'", "\"")
        questions_list = json.loads(questions_string)

        # Save the questions to the interview_questions table
        for question in questions_list:
            await cursor.execute(
                "INSERT INTO interview_questions (user_id, job_app_id, question) VALUES (?, ?, ?)",
                (user_id, job_app_id, question),
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
    job_app_id = data.get("job_app_id")  # Get job_app_id if it exists in the request

    cursor = await db.cursor()

    if job_app_id:
        # Filter interview questions by user_id and job_app_id
        await cursor.execute("SELECT * FROM interview_questions WHERE user_id = ? AND job_app_id = ?", (user_id, job_app_id))
    else:
        # Filter interview questions only by user_id
        await cursor.execute("SELECT * FROM interview_questions WHERE user_id = ?", (user_id,))

    interview_questions = await cursor.fetchall()

    questions = [
        {
            "id": question[0],
            "user_id": question[1],
            "question": question[2],
            "answer": question[3],
            "job_app_id": question[4]  # Assuming job_app_id is the 5th column in the interview_questions table
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

        collection_name = "langchain"

        chroma_collection = chroma_client.get_collection(name=collection_name, embedding_function=embeddings)

        chroma_collection.delete(
            ids=[question_id]
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

        collection_name = "langchain"

        try:
            chroma_collection = chroma_client.get_collection(name=collection_name, embedding_function=embeddings)

        except KeyError:
            chroma_collection = chroma_client.create_collection(name=collection_name, embedding_function=embeddings)

        chroma_collection.add(
            documents=docs_text,
            metadatas=metadatas,
            ids=doc_ids
        )

        print(chroma_collection.get(
            where={"type": "question_answers"}
        ))

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

        collection_name = "langchain"

        try:
            chroma_collection = chroma_client.get_collection(name=collection_name, embedding_function=embeddings)
            print(chroma_collection)

        except KeyError:
            chroma_collection = chroma_client.create_collection(name=collection_name, embedding_function=embeddings)


        chroma_collection.update(
            documents=docs_text,
            ids=doc_ids
        )

        print(chroma_collection.get(
            where={"type": "resume"}
        ))

        # vec_db = Chroma.from_documents(documents=docs_chunked, embedding=embeddings, persist_directory=user_embeddings_directory)
        # vec_db.persist()

        return jsonify(success=True)
    except Exception as e:
        print(e)
        return jsonify(success=False, message="Error updating answer"), 500
    

@app.route("/get-job-applications", methods=["POST"])
async def get_job_applications():
    db = await get_db()
    data = request.json
    user_id = data["user_id"]

    cursor = await db.cursor()
    await cursor.execute("SELECT * FROM job_applications WHERE user_id = ?", (user_id,))
    job_applications = await cursor.fetchall()

    applications = [
        {
            "id": application[0],
            "user_id": application[1],
            "job_title": application[2],
            "company_name": application[3],
            "job_description": application[4],
            "status": application[5],
            "date_added": application[6],
            "post_url": application[7]
        }
        for application in job_applications
    ]

    return jsonify(applications=applications, headers=["Job Title/Role", "Company Name", "Job Description", "Status"])

@app.route("/create-job-application", methods=["POST"])
async def create_job_application():
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
        "INSERT INTO job_applications (user_id, job_title, company_name, job_description, status, post_url, date_created) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (user_id, job_title, company_name, job_description, status, post_url, date_created),
    )

    await db.commit()

    application_id = cursor.lastrowid

    chat = ChatOpenAI(
        model_name="gpt-3.5-turbo",
        openai_api_key=api_key,
        temperature=0,
    )

    job_sections_template = """Below is a job description. Please break down the content of the description into sections and return them in a python dictionary. Do not remove any information during this process and do not paraphrase. Here are the sections and the format (please return wrapped in curly brackets):

    "company_description": "", "job_description": "", "responsibilities": "", "qualifications": "", "compensation": ""

    Job description: {context}"""

    chain = LLMChain(
        llm=chat,
        prompt=PromptTemplate.from_template(job_sections_template)
    )

    try:
        job_sections = chain(job_description)
        job_sections_string = job_sections['text']
        job_section_dict = json.loads(job_sections_string)
        print(job_section_dict)

        for section, content in job_section_dict.items():
            await cursor.execute(
                "INSERT INTO job_app_sections (user_id, job_app_id, section, content) VALUES (?, ?, ?, ?)",
                (user_id, application_id, section, content)
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

        metadatas = [{"section": key, "job_app_id": application_id} for key in job_section_dict]
        job_section_list = [{"section": value} for value in job_section_dict.values()]

        chroma_client = chromadb.Client(Settings(
            chroma_db_impl="duckdb+parquet",
            persist_directory=user_embeddings_directory
        ))

        collection_name = "langchain"

        try:
            chroma_collection = chroma_client.get_collection(name=collection_name, embedding_function=embeddings)

        except KeyError:
            chroma_collection = chroma_client.create_collection(name=collection_name, embedding_function=embeddings)

        chroma_collection.add(
            documents=job_section_list,
            metadatas=metadatas
        )

        print(chroma_collection.get(
            where={"section": "company_description", "job_app_id": application_id}
        ))

        return jsonify(success=True, application_id=application_id)

    except Exception as e:
        print(e)
        return jsonify(success=False, message="Error updating answer"), 500


@app.route("/edit-job-application/<int:application_id>", methods=["PUT"])
async def edit_job_application(application_id):
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
        "UPDATE job_applications SET user_id = ?, job_title = ?, company_name = ?, job_description = ?, status = ?, post_url = ? WHERE id = ?",
        (user_id, job_title, company_name, job_description, status, post_url, application_id),
    )
    await db.commit()

    return jsonify(success=True, application_id=application_id)

@app.route("/delete-job-application/<int:application_id>", methods=["DELETE"])
async def delete_job_application(application_id):
    db = await get_db()

    cursor = await db.cursor()
    await cursor.execute(
        "DELETE FROM job_applications WHERE id = ?", (application_id,)
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