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
            
api_key = os.environ.get("OPENAI_API_KEY")

embeddings = embedding_functions.OpenAIEmbeddingFunction(
    api_key=api_key,
    model_name="text-embedding-ada-002"
)

chroma_client = chromadb.Client(Settings(
    chroma_db_impl="duckdb+parquet",
    persist_directory="vectordb/user_1_embeddings"
))

resume_col = chroma_client.get_collection(name="resume", embedding_function=embeddings)

jobs_col = chroma_client.get_collection(name="jobs", embedding_function=embeddings)

# questions_col = chroma_client.get_collection(name="questions", embedding_function=embeddings)

resume_docs = resume_col.get()

jobs_docs = jobs_col.query(
    query_texts=["Google"],
    n_results=4,

)

# questions_docs = questions_col.get()

print(f"""Resume docs: {resume_docs} """)

print(f"""Jobs docs: {jobs_docs} """)

# print(f"""Questions docs: {questions_docs} """)