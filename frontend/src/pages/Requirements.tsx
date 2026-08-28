import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useProject } from "../useProject";
import { api } from "../api";
import { Requirement } from "../types";
import StatusStamp from "../components/StatusStamp";
import ImportExportBar from "../components/ImportExportBar";

const empty = {
  display_id: "",
  title: "",
  req_text: "",
  req_type: "system",
  priority: "",
  author: "",
};

export default function Requirements() {
  const project = useProject();
  const [reqs, setReqs] = useState<Requirement[]>([]);
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Requirement>>({});

  function load() {
    const q = filterStatus ? `&status=${filterStatus}` : "";
    api.get<Requirement[]>(`/api/requirements?project_id=${project.id}${q}`).then(setReqs);
  }

  useEffect(load, [project.id, filterStatus]);

  async function submit() {
    setError(null);
    try {
      await api.post("/api/requirements", { project_id: project.id, ...form, tags: [] });
      setForm(empty);
      setShowForm(false);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function startEdit(r: Requirement) {
    setEditingId(r.id);
    setEditForm({
      title: r.title,
      req_type: r.req_type,
      priority: r.priority || "",
      status: r.status,
      author: r.author || "",
    });
  }

  async function saveEdit(id: string) {
    setError(null);
    try {
      await api.patch(`/api/requirements/${id}`, editForm);
      setEditingId(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function removeReq(id: string) {
    if (!confirm("Delete this requirement? This can't be undone.")) return;
    setError(null);
    try {
      await api.del(`/api/requirements/${id}`);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl">Requirements</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="font-mono text-sm border border-ink px-3 py-1.5 rounded hover:bg-ink hover:text-white transition-colors"
        >
          {showForm ? "CANCEL" : "+ NEW REQUIREMENT"}
        </button>
      </div>
      <p className="sheet-label mb-4">STAKEHOLDER / SYSTEM / SUBSYSTEM / COMPONENT REQUIREMENTS</p>

      <ImportExportBar projectId={project.id} entity="requirements" onImported={load} />

      {error && !showForm && !editingId && (
        <div className="text-sm text-stampred mb-4">{error}</div>
      )}

      {showForm && (
        <div className="panel rounded p-5 mb-6 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <input
              placeholder="ID (e.g. REQ-SYS-001)"
              className="border border-inkline/30 rounded px-3 py-1.5 font-mono text-sm"
              value={form.display_id}
              onChange={(e) => setForm({ ...form, display_id: e.target.value })}
            />
            <input
              placeholder="Title"
              className="col-span-2 border border-inkline/30 rounded px-3 py-1.5 text-sm"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <textarea
            placeholder="Requirement text - e.g. 'The system shall...'"
            className="w-full border border-inkline/30 rounded px-3 py-1.5 text-sm"
            rows={2}
            value={form.req_text}
            onChange={(e) => setForm({ ...form, req_text: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-3">
            <select
              className="border border-inkline/30 rounded px-3 py-1.5 text-sm"
              value={form.req_type}
              onChange={(e) => setForm({ ...form, req_type: e.target.value })}
            >
              <option value="stakeholder">Stakeholder</option>
              <option value="system">System</option>
              <option value="subsystem">Subsystem</option>
              <option value="component">Component</option>
            </select>
            <input
              placeholder="Priority"
              className="border border-inkline/30 rounded px-3 py-1.5 text-sm"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            />
            <input
              placeholder="Author"
              className="border border-inkline/30 rounded px-3 py-1.5 text-sm"
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
            />
          </div>
          {error && <div className="text-sm text-stampred">{error}</div>}
          <button
            onClick={submit}
            disabled={!form.display_id || !form.title || !form.req_text}
            className="font-mono text-sm bg-ink text-white px-4 py-1.5 rounded disabled:opacity-30"
          >
            CREATE REQUIREMENT
          </button>
        </div>
      )}

      <div className="flex gap-2 mb-3">
        {["", "draft", "review", "approved", "baselined", "obsolete"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`font-mono text-xs px-2.5 py-1 rounded border ${
              filterStatus === s ? "bg-ink text-white border-ink" : "border-inkline/30 text-inkline"
            }`}
          >
            {s === "" ? "ALL" : s.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="panel rounded overflow-hidden">
        {reqs.length === 0 ? (
          <div className="p-6 text-sm text-inkline">No requirements yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left sheet-label border-b border-inkline/20">
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Verification</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {reqs.map((r) =>
                editingId === r.id ? (
                  <tr key={r.id} className="border-b border-inkline/10 last:border-0 bg-paper/60">
                    <td className="px-4 py-2 font-mono text-inkline">{r.display_id}</td>
                    <td colSpan={5} className="px-4 py-3">
                      <div className="space-y-2">
                        <input className="w-full border border-inkline/30 rounded px-2 py-1 text-sm" placeholder="Title"
                          value={editForm.title || ""} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                        <div className="grid grid-cols-4 gap-2">
                          <select className="border border-inkline/30 rounded px-2 py-1 text-sm"
                            value={editForm.req_type || "system"} onChange={(e) => setEditForm({ ...editForm, req_type: e.target.value })}>
                            <option value="stakeholder">Stakeholder</option>
                            <option value="system">System</option>
                            <option value="subsystem">Subsystem</option>
                            <option value="component">Component</option>
                          </select>
                          <select className="border border-inkline/30 rounded px-2 py-1 text-sm"
                            value={editForm.status || "draft"} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                            {["draft", "review", "approved", "baselined", "obsolete"].map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <input className="border border-inkline/30 rounded px-2 py-1 text-sm" placeholder="Priority"
                            value={editForm.priority || ""} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })} />
                          <input className="border border-inkline/30 rounded px-2 py-1 text-sm" placeholder="Author"
                            value={editForm.author || ""} onChange={(e) => setEditForm({ ...editForm, author: e.target.value })} />
                        </div>
                        <div className="text-xs text-inkline">
                          To edit the requirement text itself (which bumps the version), open the requirement's detail page.
                        </div>
                        {error && <div className="text-xs text-stampred">{error}</div>}
                        <div className="flex gap-2 font-mono text-xs">
                          <button onClick={() => saveEdit(r.id)} className="bg-ink text-white px-3 py-1 rounded">SAVE</button>
                          <button onClick={() => { setEditingId(null); setError(null); }} className="text-inkline">CANCEL</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={r.id} className="border-b border-inkline/10 last:border-0 hover:bg-paper/60 group">
                    <td className="px-4 py-2 font-mono">
                      <Link to={`/requirements/${r.id}`} className="hover:underline">
                        {r.display_id}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{r.title}</td>
                    <td className="px-4 py-2 text-inkline capitalize">{r.req_type}</td>
                    <td className="px-4 py-2"><StatusStamp value={r.status} /></td>
                    <td className="px-4 py-2"><StatusStamp value={r.verification_status} /></td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex gap-2 font-mono text-xs opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        <button onClick={() => startEdit(r)} className="text-inkline hover:underline">EDIT</button>
                        <button onClick={() => removeReq(r.id)} className="text-stampred hover:underline">DELETE</button>
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
