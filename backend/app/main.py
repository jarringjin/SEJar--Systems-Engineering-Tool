from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import projects, needs, requirements, design, tests, trace, io_router

# Single-user local tool: no auth, so we create tables on startup rather
# than requiring a separate `alembic upgrade` step for a first run.
# Once the schema stabilizes, switch to Alembic migrations (scaffold is
# in backend/alembic/ - not wired in yet) so future schema changes don't
# risk the data file.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SEJar", version="0.1.0-mvp")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(needs.router)
app.include_router(requirements.router)
app.include_router(design.router)
app.include_router(tests.router)
app.include_router(trace.router)
app.include_router(io_router.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
