import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useProject } from "../useProject";
import { api } from "../api";
import { IssueItem } from "../types";

const ISSUE_LABEL: Record<string, string> = {
  no_parent_need: "Missing parent need",
  no_design_allocation: "Not allocated to design",
  no_verification: "No linked test case",
  design_no_requirement: "Satisfies no requirement",
  test_no_requirement: "Verifies no requirement",
};

export default function Issues() {
  const project = useProject();
  const [issues, setIssues] = useState<IssueItem[]>([]);

  useEffect(() => {
    api.get<IssueItem[]>(`/api/issues?project_id=${project.id}`).then(setIssues);
  }, [project.id]);

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Issues</h1>
      <p className="sheet-label mb-6">TRACEABILITY PROBLEMS — ORPHANS &amp; BROKEN LINKS</p>

      {issues.length === 0 ? (
        <div className="panel rounded p-6 text-sm text-stampgreen font-mono">
          No issues found. Every requirement, design element, and test case is fully linked.
        </div>
      ) : (
        <div className="panel rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left sheet-label border-b border-inkline/20">
                <th className="px-4 py-2">Artifact</th>
                <th className="px-4 py-2">Issue</th>
                <th className="px-4 py-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((iss, idx) => (
                <tr key={idx} className="border-b border-inkline/10 last:border-0">
                  <td className="px-4 py-2 font-mono">
                    {iss.artifact.artifact_type === "requirement" ? (
                      <Link to={`/requirements/${iss.artifact.id}`} className="hover:underline">
                        {iss.artifact.display_id}
                      </Link>
                    ) : (
                      iss.artifact.display_id
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className="stamp stamp-red">{ISSUE_LABEL[iss.issue_type] || iss.issue_type}</span>
                  </td>
                  <td className="px-4 py-2 text-inkline">{iss.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
