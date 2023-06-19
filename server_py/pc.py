import pinecone
import os
from langchain.embeddings.openai import OpenAIEmbeddings
from dotenv import load_dotenv

load_dotenv()

pinecone_api_key = os.environ.get("PINECONE_API_KEY")
openai_api_key = os.environ.get("OPENAI_API_KEY")

pinecone.init(api_key=pinecone_api_key, environment="us-west4-gcp")
index = pinecone.Index("resume-bot")

embeddings = OpenAIEmbeddings(
    openai_api_key=openai_api_key,
    model="text-embedding-ada-002"
)


query_jobs = embeddings.embed_query("What are the important responsibilities, qualifications, skills, and requirements for this job?")

print(query_jobs)

jobs_docs = index.query(
    vector=query_jobs,
    filter={
        "type": {"$eq": "jobs"},
        "job_id": 17,
        "user": f"""{1}"""
    },
    top_k=4,
    include_metadata=True
)

print(jobs_docs)

index.delete(
    filter={
        "type": {"$eq": "jobs"},
        "job_id": 16,
        "user": f"""{1}"""
    },
)