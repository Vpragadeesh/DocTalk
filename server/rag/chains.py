from langchain_groq import ChatGroq
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from rag.retriever import get_retriever
import os
from dotenv import load_dotenv
load_dotenv()

MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")


def get_rag_chain(user_id: str):
    llm = ChatGroq(
        model=MODEL,
        temperature=0,
        groq_api_key=GROQ_API_KEY
    )

    prompt = PromptTemplate(
        input_variables=["context", "question"],
        template="""
You are an AI assistant. Answer ONLY using the provided context. The context may come from MULTIPLE documents — cover information from ALL of them.

If the answer is not in the context, say: "Answer not found in uploaded documents."

FORMAT your response using markdown:
- Use ## headers for sections
- Use **bold** for key terms
- Use bullet points for lists
- Use markdown tables for numerical/metric data

Context:
{context}

Question:
{question}

Answer (well-formatted markdown):
"""
    )

    retriever = get_retriever(user_id)

    chain = RetrievalQA.from_chain_type(
        llm=llm,
        retriever=retriever,
        chain_type="stuff",
        chain_type_kwargs={"prompt": prompt},
        return_source_documents=True
    )

    return chain
