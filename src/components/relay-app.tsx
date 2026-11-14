"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp, BookOpen, Check, ChevronRight, CircleAlert, Database, FileText,
  Files, Info, Library, LoaderCircle, Menu, MessageCircle,
  Moon, Plus, Search, ShieldCheck, Sun, Trash2, Upload, X, Zap
} from "lucide-react";
import { chunkPages } from "@/lib/chunking";
import { toEvidence } from "@/lib/evidence";
import { promptExamples } from "@/lib/prompt-examples";
import { inspectPdfFile } from "@/lib/pdf-policy";
import { parsePdf } from "@/lib/pdf";
import { retrieve } from "@/lib/retrieval";
import { listChunks, listDocuments, removeDocument, saveDocument } from "@/lib/storage";
import type { AskResponse, EvidenceSource, RelayDocument } from "@/lib/types";

type View = "ask" | "library" | "activity";
type Theme = "light" | "dark" | "black";
type Activity = { id: string; label: string; detail: string; time: string; tone: "good" | "neutral" | "bad" };
type ChatItem = { id: string; question: string; answer: string; refused: boolean; evidence: EvidenceSource[] };

const MAX_DOCUMENTS = 30;
const MAX_TOTAL_CHUNKS = 20_000;

const themes: Array<{ id: Theme; icon: typeof Sun; label: string }> = [
  { id: "light", icon: Sun, label: "Light" },
  { id: "dark", icon: Moon, label: "Dark" },
  { id: "black", icon: Database, label: "Black" }
];

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function nowLabel() {
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

export function RelayApp() {
  const [view, setView] = useState<View>("ask");
  const [theme, setTheme] = useState<Theme>("black");
  const [documents, setDocuments] = useState<RelayDocument[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedTheme = localStorage.getItem("relay-theme") as Theme | null;
      if (savedTheme && themes.some((item) => item.id === savedTheme)) setTheme(savedTheme);
    }, 0);
    void listDocuments().then((stored) => {
      setDocuments(stored);
      setSelected(new Set(stored.filter((document) => document.status === "ready").map((document) => document.id)));
    });
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("relay-theme", theme);
  }, [theme]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const readyDocuments = useMemo(() => documents.filter((document) => document.status === "ready"), [documents]);

  function addActivity(label: string, detail: string, tone: Activity["tone"] = "neutral") {
    setActivity((current) => [{ id: crypto.randomUUID(), label, detail, time: nowLabel(), tone }, ...current].slice(0, 30));
  }

  function chooseTheme(next: Theme) {
    setTheme(next);
  }

  async function ingest(files: FileList | File[]) {
    const queue = Array.from(files).slice(0, 8);
    if (!queue.length) return;
    setUploading(true);
    setNotice(null);
    let importedDocuments = 0;
    let importedChunks = 0;
    for (const file of queue) {
      if (documents.length + importedDocuments >= MAX_DOCUMENTS) {
        setNotice(`Library limit reached (${MAX_DOCUMENTS} documents). Remove a document before adding another.`);
        addActivity("Upload rejected", `${file.name} — document limit reached`, "bad");
        continue;
      }
      const inspection = await inspectPdfFile(file);
      if (!inspection.ok) {
        setNotice(`${file.name}: ${inspection.reason}`);
        addActivity("Upload rejected", `${file.name} — ${inspection.reason}`, "bad");
        continue;
      }
      try {
        const parsed = await parsePdf(file);
        const characters = parsed.pages.reduce((sum, page) => sum + page.text.length, 0);
        if (characters < 100) throw new Error("No usable text layer found. OCR-only scans are not supported yet.");
        const id = crypto.randomUUID();
        const chunks = chunkPages(id, parsed.pages);
        if (!chunks.length) throw new Error("The PDF did not contain enough extractable text.");
        const existingChunks = documents.reduce((sum, document) => sum + document.chunkCount, 0);
        if (existingChunks + importedChunks + chunks.length > MAX_TOTAL_CHUNKS) {
          throw new Error(`Library passage limit exceeded (${MAX_TOTAL_CHUNKS.toLocaleString()}).`);
        }
        const document: RelayDocument = {
          id,
          name: file.name,
          size: file.size,
          pageCount: parsed.pageCount,
          chunkCount: chunks.length,
          createdAt: new Date().toISOString(),
          status: "ready"
        };
        await saveDocument(document, chunks);
        importedDocuments += 1;
        importedChunks += chunks.length;
        setDocuments((current) => [document, ...current]);
        setSelected((current) => new Set(current).add(id));
        addActivity("Document indexed", `${file.name} · ${parsed.pageCount} pages · ${chunks.length} passages`, "good");
      } catch (error) {
        const reason = error instanceof Error ? error.message : "The PDF could not be processed.";
        setNotice(`${file.name}: ${reason}`);
        addActivity("Indexing failed", `${file.name} — ${reason}`, "bad");
      }
    }
    setUploading(false);
  }

  async function deleteDocument(document: RelayDocument) {
    await removeDocument(document.id);
    setDocuments((current) => current.filter((item) => item.id !== document.id));
    setSelected((current) => {
      const next = new Set(current);
      next.delete(document.id);
      return next;
    });
    addActivity("Document removed", document.name);
  }

  async function ask() {
    const cleanQuestion = question.trim();
    if (cleanQuestion.length < 3 || busy) return;
    if (!selected.size) {
      setNotice("Select at least one document before asking a question.");
      return;
    }
    setQuestion("");
    setNotice(null);
    setBusy(true);
    try {
      const chunks = await listChunks([...selected]);
      const matches = retrieve(cleanQuestion, chunks, { limit: 8 });
      const evidence = toEvidence(matches, documents);
      if (!evidence.length) {
        setMessages((current) => [...current, {
          id: crypto.randomUUID(),
          question: cleanQuestion,
          answer: "I couldn't find supporting passages in the selected documents. Try different wording or choose another document.",
          refused: true,
          evidence: []
        }]);
        addActivity("Question refused", "No relevant local evidence was found.");
        return;
      }
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: cleanQuestion, evidence })
      });
      const body = await response.json() as AskResponse & { error?: string };
      if (!response.ok) throw new Error(body.error || "The answer service is unavailable.");
      setMessages((current) => [...current, {
        id: crypto.randomUUID(), question: cleanQuestion, answer: body.answer,
        refused: body.refused, evidence: body.citations.length ? evidence.filter((source) => body.citations.includes(source.id)) : []
      }]);
      addActivity(body.refused ? "Question refused" : "Evidence linked", `${evidence.length} passages retrieved`, body.refused ? "neutral" : "good");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      setQuestion(cleanQuestion);
      setNotice(message);
      addActivity("Answer failed", message, "bad");
    } finally {
      setBusy(false);
    }
  }

  function toggleSelection(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const navigation: Array<{ id: View; label: string; icon: typeof MessageCircle; count?: number }> = [
    { id: "ask", label: "Ask", icon: MessageCircle },
    { id: "library", label: "Library", icon: Library, count: documents.length },
    { id: "activity", label: "Activity", icon: Zap, count: activity.length }
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu /></button>
        <button className="brand" onClick={() => setView("ask")}><span className="brand-mark"><Files /></span><span>The Relay <b>RAG</b></span></button>
        <div className="privacy-pill"><ShieldCheck /> Local-first document storage</div>
        <div className="theme-control" aria-label="Choose appearance">
          {themes.map(({ id, icon: Icon, label }) => <button key={id} className={theme === id ? "active" : ""} onClick={() => chooseTheme(id)} title={label}><Icon /><span>{label}</span></button>)}
        </div>
      </header>

      <aside className={`rail ${mobileOpen ? "mobile-open" : ""}`}>
        <button className="close-mobile icon-button" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X /></button>
        <nav>
          {navigation.map(({ id, label, icon: Icon, count }) => (
            <button key={id} className={view === id ? "active" : ""} onClick={() => { setView(id); setMobileOpen(false); }}>
              <Icon /><span>{label}</span>{typeof count === "number" && count > 0 && <em>{count}</em>}
            </button>
          ))}
        </nav>
        <div className="rail-bottom"><div className="status-dot" />Browser storage ready</div>
      </aside>

      <aside className="workspace-panel">
        <div className="eyebrow">Workspace</div>
        <h2>Your research library</h2>
        <p className="panel-copy">Choose the documents The Relay can use for its next answer.</p>

        <label className={`upload-button ${uploading ? "disabled" : ""}`} htmlFor="relay-pdf-input" aria-disabled={uploading}>
          {uploading ? <LoaderCircle className="spin" /> : <Plus />}<span>{uploading ? "Indexing…" : "Add PDFs"}</span>
        </label>
        <input
          id="relay-pdf-input"
          className="native-file-input"
          type="file"
          accept="application/pdf,.pdf"
          multiple
          disabled={uploading}
          onChange={(event) => {
            const files = event.currentTarget.files;
            if (files?.length) void ingest(files);
            event.currentTarget.value = "";
          }}
        />

        <div className="source-heading"><span>Sources</span><span>{selected.size}/{readyDocuments.length} selected</span></div>
        <div className="source-list">
          {readyDocuments.length === 0 ? <div className="mini-empty"><BookOpen /><span>No documents yet</span></div> : readyDocuments.map((document) => (
            <button key={document.id} className={`source-row ${selected.has(document.id) ? "selected" : ""}`} onClick={() => toggleSelection(document.id)}>
              <span className="source-check">{selected.has(document.id) && <Check />}</span>
              <span className="source-name"><strong>{document.name}</strong><small>{document.pageCount} pages · {document.chunkCount} passages</small></span>
            </button>
          ))}
        </div>

        <div className="privacy-note"><Info /><span>PDFs stay in this browser. Only retrieved text passages are sent for answering.</span></div>
      </aside>

      <main className="main-area">
        <div className="context-bar"><span>Research workspace</span><ChevronRight /><strong>{navigation.find((item) => item.id === view)?.label}</strong></div>

        {notice && <div className="notice" role="alert"><CircleAlert /><span>{notice}</span><button onClick={() => setNotice(null)} aria-label="Dismiss"><X /></button></div>}

        {view === "ask" && (
          <section className="ask-view">
            <div className="conversation">
              {messages.length === 0 ? (
                <div className="hero-empty">
                  <span className="hero-icon"><Search /></span>
                  <div className="eyebrow">Grounded document intelligence</div>
                  <h1>Ask your documents.<br />See the evidence.</h1>
                  <p>Upload text-based PDFs, select your sources, then ask a specific question. Unsupported claims are refused instead of guessed.</p>
                  <div className="prompt-examples">
                    {promptExamples(selected.size).map((prompt) => (
                      <button key={prompt} onClick={() => { setNotice(null); setQuestion(prompt); }}>{prompt}<ArrowUp /></button>
                    ))}
                  </div>
                </div>
              ) : messages.map((message) => (
                <article className="exchange" key={message.id}>
                  <div className="user-message">{message.question}</div>
                  <div className={`relay-answer ${message.refused ? "refused" : ""}`}>
                    <div className="answer-author"><span className="mini-brand"><Files /></span><div><strong>The Relay</strong><small>{message.refused ? "Evidence was insufficient" : "Claim quotes checked against source text"}</small></div></div>
                    <p>{message.answer}</p>
                    {message.evidence.length > 0 && <div className="evidence-grid">
                      {message.evidence.map((source) => <details key={source.id}><summary><span>{source.id}</span>{source.documentName}<small>p. {source.page}</small></summary><p>{source.text}</p></details>)}
                    </div>}
                  </div>
                </article>
              ))}
              {busy && <div className="thinking"><LoaderCircle className="spin" /><span><strong>Retrieving and verifying</strong><small>Checking the selected documents</small></span></div>}
              <div ref={bottom} />
            </div>
            <div className="composer-wrap">
              <div className="composer">
                <textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void ask(); } }} placeholder={readyDocuments.length ? "Ask a question about the selected documents" : "Add a PDF to begin"} disabled={!readyDocuments.length || busy} maxLength={2000} rows={2} />
                <div className="composer-meta"><span>{selected.size} source{selected.size === 1 ? "" : "s"} selected</span><button onClick={() => void ask()} disabled={!question.trim() || !selected.size || busy} aria-label="Send question"><ArrowUp /></button></div>
              </div>
              <small className="disclaimer">Answers can be incomplete. Verify important claims in the cited pages.</small>
            </div>
          </section>
        )}

        {view === "library" && (
          <section className="page-view">
            <div className="page-title"><div><div className="eyebrow">Private by default</div><h1>Document library</h1><p>Indexed locally in this browser. Nothing is uploaded to a document server.</p></div><label className="primary-action" htmlFor="relay-pdf-input"><Upload />Upload PDFs</label></div>
            <div className={`drop-zone ${dragging ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void ingest(event.dataTransfer.files); }}>
              <Upload /><strong>Drop PDFs here</strong><span>Text-based PDF · up to 25 MB · max 8 at a time</span>
            </div>
            <div className="document-table">
              <div className="table-head"><span>Document</span><span>Index</span><span>Added</span><span /></div>
              {documents.length === 0 ? <div className="table-empty"><FileText /><strong>Your library is empty</strong><span>Add a PDF to create a searchable local index.</span></div> : documents.map((document) => (
                <div className="document-row" key={document.id}>
                  <span className="document-cell"><span className="file-icon"><FileText /></span><span><strong>{document.name}</strong><small>{formatBytes(document.size)} · {document.pageCount} pages</small></span></span>
                  <span><b className="ready-badge"><Check />Ready</b><small>{document.chunkCount} passages</small></span>
                  <span>{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(document.createdAt))}</span>
                  <button className="delete-button" onClick={() => void deleteDocument(document)} aria-label={`Delete ${document.name}`}><Trash2 /></button>
                </div>
              ))}
            </div>
          </section>
        )}

        {view === "activity" && (
          <section className="page-view">
            <div className="page-title"><div><div className="eyebrow">This session</div><h1>Activity</h1><p>A lightweight local record of indexing, retrieval, and answer outcomes.</p></div></div>
            <div className="activity-list">
              {activity.length === 0 ? <div className="table-empty"><Zap /><strong>No activity yet</strong><span>Uploads and questions will appear here.</span></div> : activity.map((item) => (
                <div className="activity-row" key={item.id}><span className={`activity-state ${item.tone}`} /> <span><strong>{item.label}</strong><small>{item.detail}</small></span><time>{item.time}</time></div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
