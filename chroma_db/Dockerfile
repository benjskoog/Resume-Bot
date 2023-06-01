# Use an official Python runtime as a base image
FROM python:3.8

# Set the working directory to /app
WORKDIR /chroma_db

# Install chroma
RUN pip install chromadb

# Create a directory for Chroma collections
RUN mkdir /chroma_db/vectordb

# Set this directory as a Docker volume
VOLUME /chroma_db/vectordb
