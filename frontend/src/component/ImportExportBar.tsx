import { useRef, useState } from "react";

const BASE = "http://127.0.0.1:8000";

export default function ImportExportBar({
  projectId,
  entity,
  onImported,
}: {
  projectId: string;
  entity: "needs" | "requirements";
  onImported: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [summary, setSummary] = useState<{ created: string[]; skipped: any[] } | null>(null);
  const [busy, setBusy] = useState(false);

  function exportUrl() {
    return `${BASE}/api/export/${entity}?project_id=${projectId}`;
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setSummary(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`${BASE}/api/import/${entity}?project_id=${projectId}`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      setSummary(data);
      onImported();
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-3 font-mono text-xs">
        <a href={exportUrl()} className="border border-inkline/30 rounded px-2.5 py-1 text-inkline hover:border-ink hover:text-ink">
          ⭳ EXPORT CSV
        </a>
        <button
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          className="border border-inkline/30 rounded px-2.5 py-1 text-inkline hover:border-ink hover:text-ink disabled:opacity-40"
        >
          {busy ? "IMPORTING…" : "⭱ IMPORT CSV"}
        </button>
        <input ref={fileInput} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      </div>
      {summary && (
        <div className="mt-2 text-xs font-mono">
          <span className="text-stampgreen">{summary.created.length} created</span>
          {summary.skipped.length > 0 && (
            <span className="text-stampred ml-3">
              {summary.skipped.length} skipped: {summary.skipped.map((s) => `row ${s.row} (${s.reason})`).join(", ")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
