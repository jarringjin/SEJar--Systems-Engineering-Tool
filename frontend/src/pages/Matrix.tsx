import { useEffect, useState } from "react";
import { useProject } from "../useProject";
import { api } from "../api";
import { MatrixRow } from "../types";
import StatusStamp from "../components/StatusStamp";

export default function Matrix() {
  const project = useProject();
  const [rows, setRows] = useState<MatrixRow[]>([]);

  useEffect(() => {
    api.get<MatrixRow[]>(`/api/matrix?project_id=${project.id}`).then(setRows);
  }, [project.id]);

  const refList = (arr: { display_id: string }[]) =>
    arr.length ? arr.map((a) => a.display_id).join(", ") : "—";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl">Traceability Matrix</h1>
        <a
          href={`http://127.0.0.1:8000/api/export/matrix?project_id=${project.id}`}
          className="font-mono text-xs border border-inkline/30 rounded px-2.5 py-1 text-inkline hover:border-ink hover:text-ink"
        >
          ⭳ EXPORT CSV
        </a>
      </div>
      <p className="sheet-label mb-6">REQUIREMENT × SYSTEM DESIGN × DETAILED DESIGN × TEST</p>

      <div className="panel rounded overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-6 text-sm text-inkline">No requirements yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left sheet-label border-b border-inkline/20">
                <th className="px-4 py-2">Requirement</th>
                <th className="px-4 py-2">System Design</th>
                <th className="px-4 py-2">Detailed Design</th>
                <th className="px-4 py-2">Test</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.requirement.id} className="border-b border-inkline/10 last:border-0">
                  <td className="px-4 py-2 font-mono">{r.requirement.display_id}</td>
                  <td className="px-4 py-2 font-mono text-inkline">{refList(r.system_design)}</td>
                  <td className="px-4 py-2 font-mono text-inkline">{refList(r.detailed_design)}</td>
                  <td className="px-4 py-2 font-mono text-inkline">{refList(r.test_cases)}</td>
                  <td className="px-4 py-2"><StatusStamp value={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
