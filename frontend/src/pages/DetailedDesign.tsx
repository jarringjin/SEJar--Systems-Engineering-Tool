import { useEffect, useState } from "react";
import { useProject } from "../useProject";
import { api } from "../api";
import { DetailedDesignElement, DesignElement } from "../types";

const empty = { display_id: "", name: "", description: "", element_type: "", implementation_owner: "" };
const TYPES = ["sw_module", "hw_component", "algorithm", "interface", "parameter", "state_machine", "data_structure", "mechanical"];

export default function DetailedDesign() {
  const project = useProject();
  const [items, setItems] = useState<DetailedDesignElement[]>([]);
  const [sysDesigns, setSysDesigns] = useState<DesignElement[]>([]);
  const [form, setForm] = useState(empty);
  const [parentSysId, setParentSysId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkPick, setLinkPick] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<DetailedDesignElement>>({});

  function load() {
    api.get<DetailedDesignElement[]>(`/api/detailed-design?project_id=${project.id}`).then(setItems);
    api.get<DesignElement[]>(`/api/system-design?project_id=${project.id}`).then(setSysDesigns);
  }
  useEffect(load, [project.id]);

  async function submit() {
    setError(null);
    try {
      await api.post("/api/detailed-design", {
        project_id: project.id,
        ...form,
        parent_sys_design_id: parentSysId || null,
      });
      setForm(empty);
      setParentSysId("");
      setShowForm(false);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function startEdit(it: DetailedDesignElement) {
    setEditingId(it.id);
    setEditForm({
      name: it.name,
      description: it.description || "",
      element_type: it.element_type || "",
      implementation_owner: it.implementation_owner || "",
    });
  }

  async function saveEdit(id: string) {
    setError(null);
    try {
      await api.patch(`/api/detailed-design/${id}`, editForm);
      setEditingId(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function removeItem(id: string) {
    if (!confirm("Delete this element? This can't be undone.")) return;
    setError(null);
    try {
      await api.del(`/api/detailed-design/${id}`);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function linkImplements(detailedId: string, sysId: string) {
    if (!sysId) return;
    setError(null);
    try {
      await api.post("/api/links", { source_id: detailedId, target_id: sysId, relationship_type: "implemented_by" });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const sysName = (id?: string | null) => sysDesigns.find((s) => s.id === id)?.display_id || "—";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl">Detailed Design</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="font-mono text-sm border border-ink px-3 py-1.5 rounded hover:bg-ink hover:text-white transition-colors"
        >
          {showForm ? "CANCEL" : "+ NEW ELEMENT"}
        </button>
      </div>
      <p className="sheet-label mb-6">SOFTWARE / HARDWARE / ALGORITHM IMPLEMENTATION DETAIL</p>

      {error && !showForm && (
        <div className="text-sm text-stampred mb-4">{error}</div>
      )}

      {showForm && (
        <div className="panel rounded p-5 mb-6 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <input placeholder="ID (e.g. DET-DES-014)" className="border border-inkline/30 rounded px-3 py-1.5 font-mono text-sm"
              value={form.display_id} onChange={(e) => setForm({ ...form, display_id: e.target.value })} />
            <input placeholder="Name" className="col-span-2 border border-inkline/30 rounded px-3 py-1.5 text-sm"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <textarea placeholder="Description" className="w-full border border-inkline/30 rounded px-3 py-1.5 text-sm" rows={2}
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-3 gap-3">
            <select className="border border-inkline/30 rounded px-3 py-1.5 text-sm"
              value={form.element_type} onChange={(e) => setForm({ ...form, element_type: e.target.value })}>
              <option value="">Element type…</option>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="border border-inkline/30 rounded px-3 py-1.5 text-sm"
              value={parentSysId} onChange={(e) => setParentSysId(e.target.value)}>
              <option value="">Parent system design (optional)…</option>
              {sysDesigns.map((s) => <option key={s.id} value={s.id}>{s.display_id} — {s.name}</option>)}
            </select>
            <input placeholder="Implementation owner" className="border border-inkline/30 rounded px-3 py-1.5 text-sm"
              value={form.implementation_owner} onChange={(e) => setForm({ ...form, implementation_owner: e.target.value })} />
          </div>
          {error && <div className="text-sm text-stampred">{error}</div>}
          <button onClick={submit} disabled={!form.display_id || !form.name}
            className="font-mono text-sm bg-ink text-white px-4 py-1.5 rounded disabled:opacity-30">
            CREATE ELEMENT
          </button>
        </div>
      )}

      <div className="panel rounded overflow-hidden">
        {items.length === 0 ? (
          <div className="p-6 text-sm text-inkline">No detailed design elements yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left sheet-label border-b border-inkline/20">
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Parent (SysDesign)</th>
                <th className="px-4 py-2">Link "implemented_by" →</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) =>
                editingId === it.id ? (
                  <tr key={it.id} className="border-b border-inkline/10 last:border-0 bg-paper/60">
                    <td className="px-4 py-2 font-mono text-inkline">{it.display_id}</td>
                    <td colSpan={5} className="px-4 py-3">
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input className="border border-inkline/30 rounded px-2 py-1 text-sm" placeholder="Name"
                            value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                          <select className="border border-inkline/30 rounded px-2 py-1 text-sm"
                            value={editForm.element_type || ""} onChange={(e) => setEditForm({ ...editForm, element_type: e.target.value })}>
                            <option value="">Element type…</option>
                            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <textarea className="w-full border border-inkline/30 rounded px-2 py-1 text-sm" rows={2} placeholder="Description"
                          value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                        <input className="w-full border border-inkline/30 rounded px-2 py-1 text-sm" placeholder="Implementation owner"
                          value={editForm.implementation_owner || ""} onChange={(e) => setEditForm({ ...editForm, implementation_owner: e.target.value })} />
                        {error && <div className="text-xs text-stampred">{error}</div>}
                        <div className="flex gap-2 font-mono text-xs">
                          <button onClick={() => saveEdit(it.id)} className="bg-ink text-white px-3 py-1 rounded">SAVE</button>
                          <button onClick={() => { setEditingId(null); setError(null); }} className="text-inkline">CANCEL</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={it.id} className="border-b border-inkline/10 last:border-0 group">
                    <td className="px-4 py-2 font-mono">{it.display_id}</td>
                    <td className="px-4 py-2">{it.name}</td>
                    <td className="px-4 py-2 text-inkline">{it.element_type || "—"}</td>
                    <td className="px-4 py-2 font-mono text-inkline">{sysName(it.parent_sys_design_id)}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <select
                          className="border border-inkline/30 rounded px-2 py-1 text-xs"
                          value={linkPick[it.id] || ""}
                          onChange={(e) => setLinkPick({ ...linkPick, [it.id]: e.target.value })}
                        >
                          <option value="">Select system design…</option>
                          {sysDesigns.map((s) => <option key={s.id} value={s.id}>{s.display_id}</option>)}
                        </select>
                        <button
                          disabled={!linkPick[it.id]}
                          onClick={() => linkImplements(it.id, linkPick[it.id])}
                          className="font-mono text-xs bg-ink text-white px-2 rounded disabled:opacity-30"
                        >
                          LINK
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex gap-2 font-mono text-xs opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        <button onClick={() => startEdit(it)} className="text-inkline hover:underline">EDIT</button>
                        <button onClick={() => removeItem(it.id)} className="text-stampred hover:underline">DELETE</button>
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
