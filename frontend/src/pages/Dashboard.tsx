import { useEffect, useState } from "react";
import { useProject } from "../useProject";
import { api } from "../api";
import { Coverage, Need, Requirement, IssueItem } from "../types";

function Bar({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-mono text-inkline mb-1">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 bg-white border border-inkline/30 rounded-sm overflow-hidden">
        <div
          className="h-full bg-ink"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const project = useProject();
  const [needs, setNeeds] = useState<Need[]>([]);
  const [reqs, setReqs] = useState<Requirement[]>([]);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [issues, setIssues] = useState<IssueItem[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<Need[]>(`/api/needs?project_id=${project.id}`),
      api.get<Requirement[]>(`/api/requirements?project_id=${project.id}`),
      api.get<Coverage>(`/api/coverage?project_id=${project.id}`),
      api.get<IssueItem[]>(`/api/issues?project_id=${project.id}`),
    ]).then(([n, r, c, i]) => {
      setNeeds(n);
      setReqs(r);
      setCoverage(c);
      setIssues(i);
    });
  }, [project.id]);

  const byStatus = (list: Requirement[]) =>
    list.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

  const statuses = byStatus(reqs);

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">{project.name}</h1>
      <p className="sheet-label mb-6">DASHBOARD</p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Needs", value: needs.length },
          { label: "Requirements", value: reqs.length },
          { label: "Open Issues", value: issues.length },
          {
            label: "Approved / Baselined",
            value: (statuses["approved"] || 0) + (statuses["baselined"] || 0),
          },
        ].map((s) => (
          <div key={s.label} className="panel rounded p-4">
            <div className="sheet-label mb-1">{s.label}</div>
            <div className="font-display text-3xl">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="panel rounded p-5">
          <div className="sheet-label mb-4">TRACEABILITY COVERAGE</div>
          {coverage ? (
            <div className="space-y-4">
              <Bar label="Requirement → Design" pct={coverage.requirement_to_design_pct} />
              <Bar label="Design → Requirement" pct={coverage.design_to_requirement_pct} />
              <Bar label="Requirement → Verification" pct={coverage.requirement_to_verification_pct} />
              <Bar label="End-to-End Chain Complete" pct={coverage.end_to_end_traceability_pct} />
            </div>
          ) : (
            <div className="text-inkline text-sm">Loading…</div>
          )}
        </div>

        <div className="panel rounded p-5">
          <div className="sheet-label mb-4">REQUIREMENTS BY STATUS</div>
          {Object.keys(statuses).length === 0 ? (
            <div className="text-sm text-inkline">No requirements yet.</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(statuses).map(([status, count]) => (
                <div key={status} className="flex justify-between font-mono text-sm">
                  <span className="capitalize">{status.replace(/_/g, " ")}</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
