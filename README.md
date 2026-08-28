# SEJar--System-Engineer-Tool
It's a tool for local systems engineering project. You can add needs, requirement, pre designs, detailed designs and the test cases with tracebility.

# SEJar

A lightweight, local-first systems engineering requirements traceability tool.
Inspired by INCOSE / ISO 15288 / ISO 29148 principles, without the weight of
DOORS/Polarion/Jama - built for one engineer running one project at a time.

No AI features, by design: every requirement, link, and status change is
entered and approved by hand, so the tool's engineering relationships stay
fully under your control.

## Structure

- `backend/` - FastAPI + SQLite. See `backend/README.md` to run it.
- `frontend/` - React + TypeScript + Tailwind. See `frontend/README.md` to run it.
- `architecture-proposal.md` - the design doc this build follows (schema, API, traceability model).

## Quick start

**Windows:** double-click `run.bat`. First run installs everything
automatically (Python venv + pip packages, npm packages) - this takes a
minute or two. Every run after that starts instantly. It opens two
console windows (backend + frontend) and your browser to
http://localhost:5173. Close those two windows to stop SEJar.

**macOS/Linux:** run `./run.sh` from a terminal in this folder. Same
first-run behavior; press Ctrl+C in that terminal to stop both servers.

Requires Python 3.10+ and Node.js LTS to already be installed and on
your PATH - `run.bat`/`run.sh` will tell you clearly if either is missing,
with a link to get it.

### Manual start (if you'd rather run each piece yourself)

```bash
# terminal 1
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# terminal 2
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 - create a project, then start adding Needs,
Requirements, System Design, Detailed Design, and Test Cases, and link them
together to build out the traceability chain.

## What's built (MVP - complete)

- Full CRUD for Needs, Requirements (with version history), System Design,
  Detailed Design, Test Cases + Results
- Generic, typed trace-link model - one table represents every relationship
  (derives_from, satisfies, implemented_by, verified_by, ...)
- Bidirectional traceability chain view (Need ↔ Requirement ↔ Design ↔
  Detailed Design ↔ Test), rendered as a schematic diagram
- Traceability matrix, coverage percentages, and orphan/issue detection
- CSV import/export for Needs and Requirements, CSV export of the matrix
- Project switcher, capped at 5 local projects

## Not yet built (Phase 2 scope, deferred on purpose)

- Baselines, review workflow, change impact analysis
- No AI features anywhere - all data entry, linking, and status changes
  are manual by design
