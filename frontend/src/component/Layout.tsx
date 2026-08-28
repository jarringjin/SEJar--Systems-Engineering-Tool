import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api";
import { Project } from "../types";

const NAV = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/needs", label: "Needs" },
  { to: "/requirements", label: "Requirements" },
  { to: "/system-design", label: "System Design" },
  { to: "/detailed-design", label: "Detailed Design" },
  { to: "/verification", label: "Verification" },
  { to: "/matrix", label: "Matrix" },
  { to: "/issues", label: "Issues" },
];

const MAX_PROJECTS = 5;

export default function Layout({
  project,
  projects,
  onSwitchProject,
  onProjectsChanged,
}: {
  project: Project | null;
  projects: Project[];
  onSwitchProject: (p: Project) => void;
  onProjectsChanged: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const navigate = useNavigate();

  async function deleteProject() {
    if (!project) return;
    setError(null);
    try {
      await api.del(`/api/projects/${project.id}`);
      setConfirmingDelete(false);
      onProjectsChanged();
      navigate("/");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function createProject() {
    setError(null);
    if (!name.trim()) return;
    try {
      const p = await api.post<Project>("/api/projects", { name: name.trim() });
      setName("");
      setCreating(false);
      onProjectsChanged();
      onSwitchProject(p);
      navigate("/");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Drafting-toolbar sidebar */}
      <aside className="w-60 shrink-0 bg-darkpaper text-paper flex flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="font-display text-xl font-700 tracking-tight">SEJar</div>
          <div className="sheet-label mt-1 text-white/50">TRACEABILITY TOOL</div>
        </div>

        <div className="px-5 py-4 border-b border-white/10">
          <div className="sheet-label text-white/40 mb-2">PROJECT</div>
          {project ? (
            <select
              className="w-full bg-transparent border border-white/25 rounded px-2 py-1.5 text-sm font-mono"
              value={project.id}
              onChange={(e) => {
                const p = projects.find((pr) => pr.id === e.target.value);
                if (p) onSwitchProject(p);
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="text-ink">
                  {p.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-sm text-white/50">No project yet</div>
          )}

          {!creating ? (
            <button
              onClick={() => setCreating(true)}
              disabled={projects.length >= MAX_PROJECTS}
              className="mt-2 text-xs font-mono text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {projects.length >= MAX_PROJECTS ? `LIMIT ${MAX_PROJECTS} REACHED` : "+ NEW PROJECT"}
            </button>
          ) : (
            <div className="mt-2 space-y-1.5">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createProject()}
                placeholder="Project name"
                className="w-full bg-white/5 border border-white/25 rounded px-2 py-1 text-sm"
              />
              <div className="flex gap-2 text-xs font-mono">
                <button onClick={createProject} className="text-stampgreen hover:underline">
                  CREATE
                </button>
                <button
                  onClick={() => { setCreating(false); setError(null); }}
                  className="text-white/40 hover:underline"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}

          {project && !creating && (
            <div className="mt-2">
              {!confirmingDelete ? (
                <button
                  onClick={() => setConfirmingDelete(true)}
                  className="text-xs font-mono text-stampred/70 hover:text-stampred"
                >
                  DELETE THIS PROJECT
                </button>
              ) : (
                <div className="space-y-1.5">
                  <div className="text-xs text-stampred">
                    Delete "{project.name}" and everything in it? This can't be undone.
                  </div>
                  <div className="flex gap-2 text-xs font-mono">
                    <button onClick={deleteProject} className="text-stampred hover:underline">
                      CONFIRM DELETE
                    </button>
                    <button
                      onClick={() => { setConfirmingDelete(false); setError(null); }}
                      className="text-white/40 hover:underline"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <div className="text-xs text-stampred mt-2">{error}</div>}
        </div>

        <nav className="flex-1 py-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block px-5 py-2 text-sm font-mono tracking-wide border-l-2 ${
                  isActive
                    ? "border-white text-white bg-white/5"
                    : "border-transparent text-white/50 hover:text-white/80"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main sheet area */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-8 overflow-y-auto">
          {project ? (
            <Outlet context={{ project }} />
          ) : (
            <div className="text-inkline">Create a project to get started.</div>
          )}
        </main>

        {/* Title block, styled after a drawing sheet's info strip */}
        <footer className="title-block flex">
          <div className="field">
            PROJECT <b>{project ? project.name.toUpperCase() : "—"}</b>
          </div>
          <div className="field">
            SHEET <b>MVP</b>
          </div>
          <div className="field">
            REV <b>0.3</b>
          </div>
          <div className="field ml-auto">
            SEJar &mdash; local, single-user, no AI-assisted writes
          </div>
        </footer>
      </div>
    </div>
  );
}
