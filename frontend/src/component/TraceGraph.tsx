import { TraceNode as TraceNodeT } from "../types";
import StatusStamp from "./StatusStamp";

const TYPE_LABEL: Record<string, string> = {
  need: "NEED",
  requirement: "REQ",
  system_design: "SYS-DESIGN",
  detailed_design: "DET-DESIGN",
  test_case: "TEST",
};

function Node({ node, dir }: { node: TraceNodeT; dir: "up" | "down" }) {
  return (
    <div className="flex items-center gap-2">
      {dir === "up" && <Connector />}
      <div className="panel rounded px-3 py-2 min-w-[180px]">
        <div className="sheet-label text-[10px]">{TYPE_LABEL[node.artifact.artifact_type] || node.artifact.artifact_type}</div>
        <div className="font-mono text-sm">{node.artifact.display_id}</div>
        {node.artifact.title && <div className="text-xs text-inkline truncate max-w-[220px]">{node.artifact.title}</div>}
        {node.artifact.status && <div className="mt-1"><StatusStamp value={node.artifact.status} /></div>}
        {node.relationship_type && (
          <div className="sheet-label text-[9px] mt-1 text-inkline/70">via {node.relationship_type}</div>
        )}
      </div>
      {dir === "down" && <Connector />}
      {node.children.length > 0 && (
        <div className="flex flex-col gap-3">
          {node.children.map((c, i) => (
            <Node key={c.artifact.id + i} node={c} dir={dir} />
          ))}
        </div>
      )}
    </div>
  );
}

function Connector() {
  return (
    <svg width="28" height="2" className="shrink-0">
      <line x1="0" y1="1" x2="28" y2="1" stroke="#4A7A9D" strokeWidth="2" />
    </svg>
  );
}

export default function TraceGraph({
  center,
  upstream,
  downstream,
}: {
  center: { artifact_type: string; display_id: string; title?: string | null; status?: string | null };
  upstream: TraceNodeT[];
  downstream: TraceNodeT[];
}) {
  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-2 py-4 min-w-max">
        {/* upstream chain, reading left to right toward center */}
        <div className="flex flex-col gap-3">
          {upstream.map((n, i) => (
            <Node key={n.artifact.id + i} node={n} dir="up" />
          ))}
        </div>
        {upstream.length > 0 && <Connector />}

        {/* center node, visually emphasized */}
        <div className="panel rounded px-4 py-3 border-2 border-ink min-w-[200px]">
          <div className="sheet-label text-[10px]">{TYPE_LABEL[center.artifact_type] || center.artifact_type}</div>
          <div className="font-mono text-base">{center.display_id}</div>
          {center.title && <div className="text-sm text-inkline">{center.title}</div>}
          {center.status && <div className="mt-1"><StatusStamp value={center.status} /></div>}
        </div>

        {downstream.length > 0 && <Connector />}
        <div className="flex flex-col gap-3">
          {downstream.map((n, i) => (
            <Node key={n.artifact.id + i} node={n} dir="down" />
          ))}
        </div>
      </div>
      {upstream.length === 0 && downstream.length === 0 && (
        <div className="text-sm text-inkline">No links yet - this artifact is isolated in the traceability graph.</div>
      )}
    </div>
  );
}
