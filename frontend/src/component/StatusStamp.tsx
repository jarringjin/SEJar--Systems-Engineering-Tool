const GREEN = new Set(["approved", "baselined", "verified", "complete", "pass"]);
const RED = new Set(["obsolete", "orphan", "fail", "unverified"]);
const AMBER = new Set(["draft", "review", "partial", "not_run", "blocked"]);

export default function StatusStamp({ value }: { value?: string | null }) {
  if (!value) return null;
  const v = value.toLowerCase();
  let cls = "stamp-neutral";
  if (GREEN.has(v)) cls = "stamp-green";
  else if (RED.has(v)) cls = "stamp-red";
  else if (AMBER.has(v)) cls = "stamp-amber";

  return <span className={`stamp ${cls}`}>{value.replace(/_/g, " ")}</span>;
}
