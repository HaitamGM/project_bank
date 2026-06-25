import os
from pathlib import Path
from typing import List, Dict

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from sentence_transformers import CrossEncoder

from .. import config

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
CHROMA_DB_DIR = BASE_DIR / "data" / "chroma_db"

class RagService:
    def __init__(self):
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        self.vectorstore = Chroma(
            persist_directory=str(CHROMA_DB_DIR),
            embedding_function=self.embeddings,
            collection_name="bank_documents"
        )
        self.cross_encoder = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

    def retrieve(self, query: str, top_k: int = 3) -> List[Dict]:
        """
        2-stage retrieval:
        1. Dense retrieval (top 10)
        2. Cross-encoder re-ranking (top k)
        """
        # Stage 1: Dense Retrieval
        initial_k = 10
        retriever = self.vectorstore.as_retriever(search_kwargs={"k": initial_k})
        docs = retriever.invoke(query)

        if not docs:
            return []

        # Stage 2: Cross-Encoder Re-ranking
        pairs = [[query, doc.page_content] for doc in docs]
        scores = self.cross_encoder.predict(pairs)

        # Combine docs and scores, then sort
        scored_docs = list(zip(docs, scores))
        scored_docs.sort(key=lambda x: x[1], reverse=True)

        # Take top k
        top_docs = scored_docs[:top_k]

        results = []
        for doc, score in top_docs:
            source_file = os.path.basename(doc.metadata.get("source", ""))
            results.append({
                "content": doc.page_content,
                "source": source_file,
                "score": float(score)
            })

        return results

    def generate_answer(self, query: str, context_docs: List[Dict]) -> str:
        """
        Uses Gemini to generate an answer based ONLY on the provided context docs.
        """
        if not config.GEMINI_API_KEY:
            return "Veuillez configurer la clé API Gemini pour obtenir une réponse générée."

        try:
            from google import genai
            client = genai.Client(api_key=config.GEMINI_API_KEY)

            context_text = "\n\n".join([f"Source ({doc['source']}):\n{doc['content']}" for doc in context_docs])

            prompt = f"""
Tu es un expert en conformité bancaire au Maroc.
Réponds à la question de l'utilisateur en utilisant UNIQUEMENT les documents de référence fournis ci-dessous.
Si les documents ne contiennent pas la réponse, dis "Je ne peux pas répondre basé sur les documents fournis."
Ne fais pas d'hallucinations. Ne cite pas d'informations extérieures à ces documents.
Sois précis et cite la source (le nom du document) quand tu affirmes une règle.

DOCUMENTS DE RÉFÉRENCE:
{context_text}

QUESTION DE L'UTILISATEUR:
{query}

RÉPONSE:
"""
            resp = client.models.generate_content(model=config.GEMINI_TEXT_MODEL, contents=prompt)
            return (getattr(resp, "text", "") or "").strip()
        except Exception as e:
            print(f"[RagService] Gemini indisponible : {e}")
            return "Erreur lors de la génération de la réponse avec l'IA."

rag_service = RagService()
