import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProject } from "../useProject";
import { api } from "../api";
import {
  Requirement,
  RequirementVersion,
  TraceResult,
  Need,
  DesignElement,
  TestCase,
} from "../types";
import StatusStamp from "../components/StatusStamp";
import TraceGraph from "../components/TraceGraph";

const STATUSES = ["draft", "review", "approved", "baselined", "obsolete"];
const VERIF_METHODS = ["test", "analysis", "inspection", "demonstration"];

export default function RequirementDetail() {
  const { id } = useParams();
  const project = useProject();
  const navigate = useNavigate();
  const [req, setReq] = useState<Requirement | null>(null);
  const [versions, setVersions] = useState<RequirementVersion[]>([]);
  const [trace, setTrace] = useState<TraceResult | null>(null);

  const [needs, setNeeds] = useState<Need[]>([]);
  const [designs, setDesigns] = useState<DesignElement[]>([]);
  const [tests, setTests] = useState<TestCase[]>([]);

  const [editingText, setEditingText] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [changeDesc, setChangeDesc] = useState("");
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaForm, setMetaForm] = useState<Partial<Requirement>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    api.get<Requirement>(`/api/requirements/${id}`).then(setReq);
    api.get<RequirementVersion[]>(`/api/requirements/${id}/versions`).then(setVersions);
    api.get<TraceResult>(`/api/trace/${id}`).then(setTrace);
  }, [id]);

  useEffect(load, [load]);

  useEffect(() => {
    api.get<Need[]>(`/api/needs?project_id=${project.id}`).then(setNeeds);
    api.get<DesignElement[]>(`/api/system-design?project_id=${project.id}`).then(setDesigns);
    api.get<TestCase[]>(`/api/test-cases?project_id=${project.id}`).then(setTests);
  }, [project.id]);

  if (!req) return <div className="text-inkline">Loading…</div>;

  const linkedNeedIds = new Set(
    (trace?.upstream || [])
      .filter((n) => n.relationship_type === "derives_from")
      .map((n) => n.artifact.id)
  );
  const linkedDesignIds = new Set(
    (trace?.downstream || [])
      .filter((n) => n.relationship_type === "satisfies")
      .map((n) => n.artifact.id)
  );
  const linkedTestIds = new Set(
    (trace?.downstream || [])
      .filter((n) => n.relationship_type === "verifies")
      .map((n) => n.artifact.id)
  );

  async function updateField(field: string, value: string) {
    setError(null);
    try {
      await api.patch(`/api/requirements/${id}`, { [field]: value });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function saveText() {
    setError(null);
    try {
      await api.patch(`/api/requirements/${id}`, {
        req_text: draftText,
        change_description: changeDesc || "Text updated",
      });
      setEditingText(false);
      setChangeDesc("");
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function saveMeta() {
    setError(null);
    try {
      await api.patch(`/api/requirements/${id}`, metaForm);
      setEditingMeta(false);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function deleteRequirement() {
    if (!req) return;
    if (!confirm(`Delete ${req.display_id}? This can't be undone.`)) return;
    setError(null);
    try {
      await api.del(`/api/requirements/${id}`);
      navigate("/requirements");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function linkToNeed(needId: string) {
    if (!needId || !req) return;
    setError(null);
    try {
      await api.post("/api/links", { source_id: req.id, target_id: needId, relationship_type: "derives_from" });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function linkToDesign(designId: string) {
    if (!designId || !req) return;
    setError(null);
    try {
      await api.post("/api/links", { source_id: designId, target_id: req.id, relationship_type: "satisfies" });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function linkToTest(testId: string) {
    if (!testId || !req) return;
    setError(null);
    try {
      await api.post("/api/links", { source_id: testId, target_id: req.id, relationship_type: "verifies" });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-2xl">{req.display_id}</h1>
          <StatusStamp value={req.status} />
        </div>
        <button
          onClick={deleteRequirement}
          className="font-mono text-xs text-stampred/70 hover:text-stampred"
        >
          DELETE REQUIREMENT
        </button>
      </div>
      <p className="sheet-label mb-6">{req.title}</p>
      {error && <div className="text-sm text-stampred mb-4">{error}</div>}

      <div className="grid grid-cols-3 gap-6">
        {/* Requirement information */}
        <div className="col-span-2 space-y-6">
          <section className="panel rounded p-5">
            <div className="sheet-label mb-3">REQUIREMENT TEXT (v{req.version})</div>
            {editingText ? (
              <div className="space-y-2">
                <textarea
                  className="w-full border border-inkline/30 rounded px-3 py-2 text-sm"
                  rows={3}
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                />
                <input
                  placeholder="Change description"
                  className="w-full border border-inkline/30 rounded px-3 py-1.5 text-sm"
                  value={changeDesc}
                  onChange={(e) => setChangeDesc(e.target.value)}
                />
                <div className="flex gap-2 font-mono text-xs">
                  <button onClick={saveText} className="bg-ink text-white px-3 py-1.5 rounded">SAVE (v{req.version + 1})</button>
                  <button onClick={() => setEditingText(false)} className="text-inkline">CANCEL</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start gap-4">
                <p className="text-sm">{req.req_text}</p>
                <button
                  onClick={() => { setDraftText(req.req_text); setEditingText(true); }}
                  className="font-mono text-xs text-inkline hover:underline shrink-0"
                >
                  EDIT
                </button>
              </div>
            )}
          </section>

          <section className="panel rounded p-5">
            <div className="sheet-label mb-3">TRACEABILITY CHAIN</div>
            <TraceGraph
              center={{ artifact_type: "requirement", display_id: req.display_id, title: req.title, status: req.status }}
              upstream={trace?.upstream || []}
              downstream={trace?.downstream || []}
            />
          </section>

          <section className="panel rounded p-5">
            <div className="sheet-label mb-3">CHANGE HISTORY</div>
            <div className="space-y-2">
              {versions.map((v) => (
                <div key={v.version} className="text-sm border-l-2 border-inkline/30 pl-3">
                  <div className="font-mono text-xs text-inkline">
                    v{v.version} &middot; {new Date(v.changed_at).toLocaleString()} {v.changed_by && `· ${v.changed_by}`}
                  </div>
                  <div className="text-xs text-inkline/80 mb-1">{v.change_description}</div>
                  <div className="text-xs">{v.req_text_snapshot}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar: metadata + allocation + verification */}
        <div className="space-y-6">
          <section className="panel rounded p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="sheet-label">METADATA</div>
              {!editingMeta && (
                <button
                  onClick={() => {
                    setMetaForm({ title: req.title, priority: req.priority || "", author: req.author || "", reviewer: req.reviewer || "" });
                    setEditingMeta(true);
                  }}
                  className="font-mono text-xs text-inkline hover:underline"
                >
                  EDIT
                </button>
              )}
            </div>
            {editingMeta ? (
              <div className="space-y-2">
                <input className="w-full border border-inkline/30 rounded px-2 py-1 text-sm" placeholder="Title"
                  value={metaForm.title || ""} onChange={(e) => setMetaForm({ ...metaForm, title: e.target.value })} />
                <input className="w-full border border-inkline/30 rounded px-2 py-1 text-sm" placeholder="Priority"
                  value={metaForm.priority || ""} onChange={(e) => setMetaForm({ ...metaForm, priority: e.target.value })} />
                <input className="w-full border border-inkline/30 rounded px-2 py-1 text-sm" placeholder="Author"
                  value={metaForm.author || ""} onChange={(e) => setMetaForm({ ...metaForm, author: e.target.value })} />
                <input className="w-full border border-inkline/30 rounded px-2 py-1 text-sm" placeholder="Reviewer"
                  value={metaForm.reviewer || ""} onChange={(e) => setMetaForm({ ...metaForm, reviewer: e.target.value })} />
                <div className="flex gap-2 font-mono text-xs">
                  <button onClick={saveMeta} className="bg-ink text-white px-3 py-1 rounded">SAVE</button>
                  <button onClick={() => { setEditingMeta(false); setError(null); }} className="text-inkline">CANCEL</button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <Row label="Type" value={req.req_type} />
                <Row label="Priority" value={req.priority || "—"} />
                <Row label="Author" value={req.author || "—"} />
                <Row label="Reviewer" value={req.reviewer || "—"} />
              </div>
            )}
            <div className="space-y-2 text-sm mt-2">
              <div>
                <div className="text-xs text-inkline mb-1">Status</div>
                <select
                  className="w-full border border-inkline/30 rounded px-2 py-1 text-sm"
                  value={req.status}
                  onChange={(e) => updateField("status", e.target.value)}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <div className="text-xs text-inkline mb-1">Verification method</div>
                <select
                  className="w-full border border-inkline/30 rounded px-2 py-1 text-sm"
                  value={req.verification_method || ""}
                  onChange={(e) => updateField("verification_method", e.target.value)}
                >
                  <option value="">—</option>
                  {VERIF_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </section>

          <section className="panel rounded p-5">
            <div className="sheet-label mb-3">LINK TO NEED</div>
            <LinkPicker items={needs.filter((n) => !linkedNeedIds.has(n.id))} onSelect={linkToNeed} labelKey="display_id" sub="title" />
            {needs.length > 0 && needs.every((n) => linkedNeedIds.has(n.id)) && (
              <div className="text-xs text-inkline mt-2">All available needs are already linked.</div>
            )}
          </section>

          <section className="panel rounded p-5">
            <div className="sheet-label mb-3">ALLOCATE TO SYSTEM DESIGN</div>
            <LinkPicker items={designs.filter((d) => !linkedDesignIds.has(d.id))} onSelect={linkToDesign} labelKey="display_id" sub="name" />
            {designs.length > 0 && designs.every((d) => linkedDesignIds.has(d.id)) && (
              <div className="text-xs text-inkline mt-2">All available design elements are already linked.</div>
            )}
          </section>

          <section className="panel rounded p-5">
            <div className="sheet-label mb-3">LINK VERIFICATION TEST</div>
            <LinkPicker items={tests.filter((t) => !linkedTestIds.has(t.id))} onSelect={linkToTest} labelKey="display_id" sub="title" />
            {tests.length > 0 && tests.every((t) => linkedTestIds.has(t.id)) && (
              <div className="text-xs text-inkline mt-2">All available test cases are already linked.</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-inkline">{label}</span>
      <span className="capitalize">{value}</span>
    </div>
  );
}

function LinkPicker<T extends { id: string; display_id: string }>({
  items,
  onSelect,
  labelKey,
  sub,
}: {
  items: T[];
  onSelect: (id: string) => void;
  labelKey: keyof T;
  sub: keyof T;
}) {
  const [val, setVal] = useState("");
  return (
    <div className="flex gap-2">
      <select
        className="flex-1 border border-inkline/30 rounded px-2 py-1.5 text-sm"
        value={val}
        onChange={(e) => setVal(e.target.value)}
      >
        <option value="">Select…</option>
        {items.map((it) => (
          <option key={it.id} value={it.id}>
            {String(it[labelKey])} — {String(it[sub] ?? "")}
          </option>
        ))}
      </select>
      <button
        disabled={!val}
        onClick={() => { onSelect(val); setVal(""); }}
        className="font-mono text-xs bg-ink text-white px-3 rounded disabled:opacity-30"
      >
        LINK
      </button>
    </div>
  );
}
