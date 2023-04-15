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
from db import get_table_data, setup_db
from datetime import datetime
import time
import re
from typing import List, Tuple
import spacy


app = Flask(__name__)
CORS(app)

DATABASE = "data.db"

chains = {}

api_key = os.environ.get("OPENAI_API_KEY")

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

@app.route("/upload-resume", methods=["POST"])
async def upload_resume():
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


    async def save_resume_to_database(resume_sections: List[Tuple[str, str]]):
        db = await get_db()
        cursor = await db.cursor()

        # Delete existing resume data
        await cursor.execute("DELETE FROM resume")

        # Insert each section as a new row in the "resume" table
        for section, content in resume_sections:
            await cursor.execute("INSERT INTO resume (section, content) VALUES (?, ?)", [section, content])
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
        await save_resume_to_database(resume_sections)
        embeddings = OpenAIEmbeddings()
        text_splitter = RecursiveCharacterTextSplitter(
            # Set a really small chunk size, just to show.
            chunk_size = 500,
            chunk_overlap  = 20,
            length_function = len,
        )
        docs_chunked = text_splitter.create_documents([plain_text])
        print(docs_chunked)
        vec_db = Chroma.from_documents(documents=docs_chunked, embedding=embeddings, persist_directory=persist_directory)
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

    embeddings = OpenAIEmbeddings()

    vec_db = Chroma(persist_directory=persist_directory, embedding_function=embeddings)

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
            SystemMessagePromptTemplate.from_template(template_string_beatrice),
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
        await db.execute("INSERT INTO chat (chain_id) VALUES (?)", [chain_id])
        await db.commit()
    
    try:
        print(chain)
        result_endpoint = chain.run(query)
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