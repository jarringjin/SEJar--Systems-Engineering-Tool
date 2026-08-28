import { useEffect, useState } from "react";
import { useProject } from "../useProject";
import { api } from "../api";
import { Need } from "../types";
import StatusStamp from "../components/StatusStamp";
import ImportExportBar from "../components/ImportExportBar";

const empty = {
  display_id: "",
  title: "",
  description: "",
  stakeholder: "",
  source: "",
  rationale: "",
  priority: "",
  author: "",
};

export default function Needs() {
  const project = useProject();
  const [needs, setNeeds] = useState<Need[]>([]);
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Need>>({});

  function load() {
    api.get<Need[]>(`/api/needs?project_id=${project.id}`).then(setNeeds);
  }

  useEffect(load, [project.id]);

  async function submit() {
    setError(null);
    try {
      await api.post("/api/needs", { project_id: project.id, ...form });
      setForm(empty);
      setShowForm(false);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function startEdit(n: Need) {
    setEditingId(n.id);
    setEditForm({
      title: n.title,
      description: n.description,
      stakeholder: n.stakeholder || "",
      source: n.source || "",
      rationale: n.rationale || "",
      priority: n.priority || "",
      status: n.status,
    });
  }

  async function saveEdit(id: string) {
    setError(null);
    try {
      await api.patch(`/api/needs/${id}`, editForm);
      setEditingId(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function removeNeed(id: string) {
    if (!confirm("Delete this need? This can't be undone.")) return;
    setError(null);
    try {
      await api.del(`/api/needs/${id}`);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl">Needs</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="font-mono text-sm border border-ink px-3 py-1.5 rounded hover:bg-ink hover:text-white transition-colors"
        >
          {showForm ? "CANCEL" : "+ NEW NEED"}
        </button>
      </div>
      <p className="sheet-label mb-4">STAKEHOLDER / OPERATIONAL / BUSINESS NEEDS</p>

      <ImportExportBar projectId={project.id} entity="needs" onImported={load} />

      {showForm && (
        <div className="panel rounded p-5 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="ID (e.g. NEED-001)"
              className="border border-inkline/30 rounded px-3 py-1.5 font-mono text-sm"
              value={form.display_id}
              onChange={(e) => setForm({ ...form, display_id: e.target.value })}
            />
            <input
              placeholder="Title"
              className="border border-inkline/30 rounded px-3 py-1.5 text-sm"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <textarea
            placeholder="Description"
            className="w-full border border-inkline/30 rounded px-3 py-1.5 text-sm"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-3">
            <input
              placeholder="Stakeholder"
              className="border border-inkline/30 rounded px-3 py-1.5 text-sm"
              value={form.stakeholder}
              onChange={(e) => setForm({ ...form, stakeholder: e.target.value })}
            />
            <input
              placeholder="Source"
              className="border border-inkline/30 rounded px-3 py-1.5 text-sm"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
            />
            <input
              placeholder="Priority"
              className="border border-inkline/30 rounded px-3 py-1.5 text-sm"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            />
          </div>
          {error && <div className="text-sm text-stampred">{error}</div>}
          <button
            onClick={submit}
            disabled={!form.display_id || !form.title || !form.description}
            className="font-mono text-sm bg-ink text-white px-4 py-1.5 rounded disabled:opacity-30"
          >
            CREATE NEED
          </button>
        </div>
      )}

      <div className="panel rounded overflow-hidden">
        {needs.length === 0 ? (
          <div className="p-6 text-sm text-inkline">No needs yet. Add the first one above.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left sheet-label border-b border-inkline/20">
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Stakeholder</th>
                <th className="px-4 py-2">Priority</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {needs.map((n) =>
                editingId === n.id ? (
                  <tr key={n.id} className="border-b border-inkline/10 last:border-0 bg-paper/60">
                    <td className="px-4 py-2 font-mono text-inkline">{n.display_id}</td>
                    <td colSpan={5} className="px-4 py-3">
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input className="border border-inkline/30 rounded px-2 py-1 text-sm" placeholder="Title"
                            value={editForm.title || ""} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                          <select className="border border-inkline/30 rounded px-2 py-1 text-sm"
                            value={editForm.status || "draft"} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                            {["draft", "review", "approved", "baselined", "obsolete"].map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <textarea className="w-full border border-inkline/30 rounded px-2 py-1 text-sm" rows={2} placeholder="Description"
                          value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                        <div className="grid grid-cols-3 gap-2">
                          <input className="border border-inkline/30 rounded px-2 py-1 text-sm" placeholder="Stakeholder"
                            value={editForm.stakeholder || ""} onChange={(e) => setEditForm({ ...editForm, stakeholder: e.target.value })} />
                          <input className="border border-inkline/30 rounded px-2 py-1 text-sm" placeholder="Source"
                            value={editForm.source || ""} onChange={(e) => setEditForm({ ...editForm, source: e.target.value })} />
                          <input className="border border-inkline/30 rounded px-2 py-1 text-sm" placeholder="Priority"
                            value={editForm.priority || ""} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })} />
                        </div>
                        {error && <div className="text-xs text-stampred">{error}</div>}
                        <div className="flex gap-2 font-mono text-xs">
                          <button onClick={() => saveEdit(n.id)} className="bg-ink text-white px-3 py-1 rounded">SAVE</button>
                          <button onClick={() => { setEditingId(null); setError(null); }} className="text-inkline">CANCEL</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={n.id} className="border-b border-inkline/10 last:border-0 group">
                    <td className="px-4 py-2 font-mono">{n.display_id}</td>
                    <td className="px-4 py-2">{n.title}</td>
                    <td className="px-4 py-2 text-inkline">{n.stakeholder || "—"}</td>
                    <td className="px-4 py-2 text-inkline">{n.priority || "—"}</td>
                    <td className="px-4 py-2"><StatusStamp value={n.status} /></td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex gap-2 font-mono text-xs opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        <button onClick={() => startEdit(n)} className="text-inkline hover:underline">EDIT</button>
                        <button onClick={() => removeNeed(n.id)} className="text-stampred hover:underline">DELETE</button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
