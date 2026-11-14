import { openDB, type DBSchema } from "idb";
import type { Chunk, RelayDocument } from "./types";

interface RelayDatabase extends DBSchema {
  documents: { key: string; value: RelayDocument };
  chunks: { key: string; value: Chunk; indexes: { byDocument: string } };
}

const database = () => openDB<RelayDatabase>("the-relay-rag", 1, {
  upgrade(db) {
    db.createObjectStore("documents", { keyPath: "id" });
    const chunks = db.createObjectStore("chunks", { keyPath: "id" });
    chunks.createIndex("byDocument", "documentId");
  }
});

export async function listDocuments(): Promise<RelayDocument[]> {
  const db = await database();
  return (await db.getAll("documents")).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveDocument(document: RelayDocument, chunks: Chunk[]): Promise<void> {
  const db = await database();
  const transaction = db.transaction(["documents", "chunks"], "readwrite");
  await transaction.objectStore("documents").put(document);
  for (const chunk of chunks) await transaction.objectStore("chunks").put(chunk);
  await transaction.done;
}

export async function removeDocument(documentId: string): Promise<void> {
  const db = await database();
  const transaction = db.transaction(["documents", "chunks"], "readwrite");
  await transaction.objectStore("documents").delete(documentId);
  const index = transaction.objectStore("chunks").index("byDocument");
  let cursor = await index.openKeyCursor(IDBKeyRange.only(documentId));
  while (cursor) {
    await transaction.objectStore("chunks").delete(cursor.primaryKey);
    cursor = await cursor.continue();
  }
  await transaction.done;
}

export async function listChunks(documentIds?: string[]): Promise<Chunk[]> {
  const db = await database();
  if (!documentIds?.length) return db.getAll("chunks");
  const transaction = db.transaction("chunks");
  const index = transaction.store.index("byDocument");
  const groups = await Promise.all(documentIds.map((id) => index.getAll(id)));
  return groups.flat();
}
