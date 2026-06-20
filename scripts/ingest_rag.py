import os
import glob
from pathlib import Path
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

# Paths
ROOT_DIR = Path(__file__).resolve().parent.parent
RAG_DOCS_DIR = ROOT_DIR / "rag_docs"
CHROMA_DB_DIR = ROOT_DIR / "data" / "chroma_db"

def main():
    print(f"Starting ingestion from {RAG_DOCS_DIR}...")

    # Load all documents
    docs = []
    doc_paths = glob.glob(str(RAG_DOCS_DIR / "*"))
    for path in doc_paths:
        if os.path.isfile(path):
            print(f"Loading {path}...")
            loader = TextLoader(path, encoding="utf-8")
            docs.extend(loader.load())

    if not docs:
        print("No documents found to ingest.")
        return

    # Split documents into chunks
    print("Splitting documents into chunks...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", " ", ""]
    )
    splits = text_splitter.split_documents(docs)
    print(f"Created {len(splits)} chunks.")

    # Initialize Embeddings
    print("Initializing embedding model all-MiniLM-L6-v2...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    # Store in ChromaDB
    print(f"Storing chunks in ChromaDB at {CHROMA_DB_DIR}...")
    vectorstore = Chroma.from_documents(
        documents=splits,
        embedding=embeddings,
        persist_directory=str(CHROMA_DB_DIR),
        collection_name="bank_documents"
    )
    print("Ingestion complete!")

if __name__ == "__main__":
    main()
