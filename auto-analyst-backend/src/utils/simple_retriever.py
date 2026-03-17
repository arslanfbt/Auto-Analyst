"""
Lightweight TF-IDF based retriever to replace llama-index VectorStoreIndex.
Uses scikit-learn (already a dependency) — no heavyweight RAG framework needed.
"""

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


class TextNode:
    """Minimal node wrapper matching the llama-index retrieval result interface."""

    def __init__(self, text: str):
        self.text = text


class Document:
    """Minimal document wrapper matching the llama-index Document interface."""

    def __init__(self, text: str):
        self.text = text


class SimpleRetriever:
    """
    TF-IDF cosine-similarity retriever that mirrors the subset of the
    llama-index VectorStoreIndex / BaseRetriever interface actually used:

        index  = SimpleRetriever.from_documents([Document(text=x) for x in docs])
        ret    = index.as_retriever(similarity_top_k=1)
        nodes  = ret.retrieve(query)   # -> list[TextNode]
        text   = nodes[0].text
    """

    def __init__(self, texts: list[str]):
        self._docs = texts
        self._top_k = 1
        self._vectorizer = TfidfVectorizer()
        if texts:
            self._matrix = self._vectorizer.fit_transform(texts)
        else:
            self._matrix = None

    @classmethod
    def from_documents(cls, documents) -> "SimpleRetriever":
        """Build a retriever from a list of Document objects."""
        texts = [doc.text for doc in documents]
        return cls(texts)

    def as_retriever(self, similarity_top_k: int = 1) -> "SimpleRetriever":
        """Configure top-k and return self (mirrors llama-index fluent API)."""
        self._top_k = similarity_top_k
        return self

    def retrieve(self, query: str) -> list[TextNode]:
        """Return the top-k most similar nodes for a query."""
        if not self._docs or self._matrix is None:
            return [TextNode("")]

        query_vec = self._vectorizer.transform([query])
        scores = cosine_similarity(query_vec, self._matrix)[0]
        top_indices = np.argsort(scores)[::-1][: self._top_k]
        return [TextNode(self._docs[i]) for i in top_indices]
