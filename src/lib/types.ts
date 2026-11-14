export type DocumentStatus = "processing" | "ready" | "error";

export interface RelayDocument {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  chunkCount: number;
  createdAt: string;
  status: DocumentStatus;
  error?: string;
}

export interface PageText {
  page: number;
  text: string;
}

export interface Chunk {
  id: string;
  documentId: string;
  page: number;
  text: string;
  wordCount: number;
}

export interface RetrievalResult {
  chunk: Chunk;
  score: number;
}

export interface EvidenceSource {
  id: string;
  documentId: string;
  documentName: string;
  page: number;
  text: string;
}

export interface AskResponse {
  answer: string;
  refused: boolean;
  citations: string[];
  model: string;
}
