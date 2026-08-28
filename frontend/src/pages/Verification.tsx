import { useEffect, useState } from "react";
import { useProject } from "../useProject";
import { api } from "../api";
import { TestCase } from "../types";
import StatusStamp from "../components/StatusStamp";

const empty = { display_id: "", title: "", objective: "", procedure: "", expected_result: "", verification_method: "test", author: "" };

export default function Verification() {
  const project = useProject();
  const [items, setItems] = useState<TestCase[]>([]);
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TestCase>>({});

  function load() {
    api.get<TestCase[]>(`/api/test-cases?project_id=${project.id}`).then(setItems);
  }
  useEffect(load, [project.id]);

  async function submit() {
    setError(null);
    try {
      await api.post("/api/test-cases", { project_id: project.id, ...form });
      setForm(empty);
      setShowForm(false);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function recordResult(tcId: string, result: "pass" | "fail") {
    setError(null);
    try {
      await api.post(`/api/test-cases/${tcId}/results`, { result, run_by: project.name });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function startEdit(tc: TestCase) {
    setEditingId(tc.id);
    setEditForm({
      title: tc.title,
      objective: tc.objective || "",
      procedure: tc.procedure || "",
      expected_result: tc.expected_result || "",
      verification_method: tc.verification_method || "test",
      author: tc.author || "",
    });
  }

  async function saveEdit(id: string) {
    setError(null);
    try {
      await api.patch(`/api/test-cases/${id}`, editForm);
      setEditingId(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function removeItem(id: string) {
    if (!confirm("Delete this test case? This can't be undone.")) return;
    setError(null);
    try {
      await api.del(`/api/test-cases/${id}`);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl">Verification</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="font-mono text-sm border border-ink px-3 py-1.5 rounded hover:bg-ink hover:text-white transition-colors"
        >
          {showForm ? "CANCEL" : "+ NEW TEST CASE"}
        </button>
      </div>
      <p className="sheet-label mb-6">TEST CASES &amp; VERIFICATION RESULTS</p>

      {error && !showForm && !editingId && (
        <div className="text-sm text-stampred mb-4">{error}</div>
      )}

      {showForm && (
        <div className="panel rounded p-5 mb-6 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <input placeholder="ID (e.g. TEST-027)" className="border border-inkline/30 rounded px-3 py-1.5 font-mono text-sm"
              value={form.display_id} onChange={(e) => setForm({ ...form, display_id: e.target.value })} />
            <input placeholder="Title" className="col-span-2 border border-inkline/30 rounded px-3 py-1.5 text-sm"
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <textarea placeholder="Objective" className="w-full border border-inkline/30 rounded px-3 py-1.5 text-sm" rows={2}
            value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} />
          <textarea placeholder="Procedure" className="w-full border border-inkline/30 rounded px-3 py-1.5 text-sm" rows={2}
            value={form.procedure} onChange={(e) => setForm({ ...form, procedure: e.target.value })} />
          <input placeholder="Expected result" className="w-full border border-inkline/30 rounded px-3 py-1.5 text-sm"
            value={form.expected_result} onChange={(e) => setForm({ ...form, expected_result: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <select className="border border-inkline/30 rounded px-3 py-1.5 text-sm"
              value={form.verification_method} onChange={(e) => setForm({ ...form, verification_method: e.target.value })}>
              <option value="test">Test</option>
              <option value="analysis">Analysis</option>
              <option value="inspection">Inspection</option>
              <option value="demonstration">Demonstration</option>
            </select>
            <input placeholder="Author" className="border border-inkline/30 rounded px-3 py-1.5 text-sm"
              value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
          </div>
          {error && <div className="text-sm text-stampred">{error}</div>}
          <button onClick={submit} disabled={!form.display_id || !form.title}
            className="font-mono text-sm bg-ink text-white px-4 py-1.5 rounded disabled:opacity-30">
            CREATE TEST CASE
          </button>
        </div>
      )}

      <div className="panel rounded overflow-hidden">
        {items.length === 0 ? (
          <div className="p-6 text-sm text-inkline">No test cases yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left sheet-label border-b border-inkline/20">
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Method</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Record Result</th>
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
                        <input className="w-full border border-inkline/30 rounded px-2 py-1 text-sm" placeholder="Title"
                          value={editForm.title || ""} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                        <textarea className="w-full border border-inkline/30 rounded px-2 py-1 text-sm" rows={2} placeholder="Objective"
                          value={editForm.objective || ""} onChange={(e) => setEditForm({ ...editForm, objective: e.target.value })} />
                        <textarea className="w-full border border-inkline/30 rounded px-2 py-1 text-sm" rows={2} placeholder="Procedure"
                          value={editForm.procedure || ""} onChange={(e) => setEditForm({ ...editForm, procedure: e.target.value })} />
                        <input className="w-full border border-inkline/30 rounded px-2 py-1 text-sm" placeholder="Expected result"
                          value={editForm.expected_result || ""} onChange={(e) => setEditForm({ ...editForm, expected_result: e.target.value })} />
                        <div className="grid grid-cols-2 gap-2">
                          <select className="border border-inkline/30 rounded px-2 py-1 text-sm"
                            value={editForm.verification_method || "test"} onChange={(e) => setEditForm({ ...editForm, verification_method: e.target.value })}>
                            <option value="test">Test</option>
                            <option value="analysis">Analysis</option>
                            <option value="inspection">Inspection</option>
                            <option value="demonstration">Demonstration</option>
                          </select>
                          <input className="border border-inkline/30 rounded px-2 py-1 text-sm" placeholder="Author"
                            value={editForm.author || ""} onChange={(e) => setEditForm({ ...editForm, author: e.target.value })} />
                        </div>
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
                    <td className="px-4 py-2">{it.title}</td>
                    <td className="px-4 py-2 text-inkline">{it.verification_method || "—"}</td>
                    <td className="px-4 py-2"><StatusStamp value={it.status} /></td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2 font-mono text-xs">
                        <button onClick={() => recordResult(it.id, "pass")} className="text-stampgreen hover:underline">PASS</button>
                        <button onClick={() => recordResult(it.id, "fail")} className="text-stampred hover:underline">FAIL</button>
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
