"""
CSV import/export for the two core traceable entities.

Import is a plain bulk-create, not an AI extraction step: every row in
a correctly-columned CSV becomes a real Need/Requirement immediately.
That's different from the AI-extraction flow described in the original
spec (section 4), which required user approval per candidate because an
AI was guessing at classification - there's no AI here, so there's no
guess to approve. A row that fails (duplicate display_id, missing
required field) is reported back and skipped; nothing partially writes.
"""
import csv
import io
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..artifact_utils import create_artifact

router = APIRouter(prefix="/api", tags=["import-export"])

NEED_COLUMNS = ["display_id", "title", "description", "stakeholder", "source", "priority", "status", "author", "rationale"]
REQ_COLUMNS = ["display_id", "title", "req_text", "req_type", "priority", "status", "verification_method", "author", "rationale"]


def _csv_response(rows: list[dict], columns: list[str], filename: str) -> StreamingResponse:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=columns)
    writer.writeheader()
    for row in rows:
        writer.writerow({c: row.get(c, "") or "" for c in columns})
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ------------------------------------------------------------------ export

@router.get("/export/needs")
def export_needs(project_id: str, db: Session = Depends(get_db)):
    needs = (
        db.query(models.Need, models.Artifact.display_id)
        .join(models.Artifact, models.Artifact.id == models.Need.id)
        .filter(models.Artifact.project_id == project_id)
        .all()
    )
    rows = [
        {
            "display_id": display_id, "title": n.title, "description": n.description,
            "stakeholder": n.stakeholder, "source": n.source, "priority": n.priority,
            "status": n.status, "author": n.author, "rationale": n.rationale,
        }
        for n, display_id in needs
    ]
    return _csv_response(rows, NEED_COLUMNS, "needs.csv")


@router.get("/export/requirements")
def export_requirements(project_id: str, db: Session = Depends(get_db)):
    reqs = (
        db.query(models.Requirement, models.Artifact.display_id)
        .join(models.Artifact, models.Artifact.id == models.Requirement.id)
        .filter(models.Artifact.project_id == project_id)
        .all()
    )
    rows = [
        {
            "display_id": display_id, "title": r.title, "req_text": r.req_text,
            "req_type": r.req_type, "priority": r.priority, "status": r.status,
            "verification_method": r.verification_method, "author": r.author, "rationale": r.rationale,
        }
        for r, display_id in reqs
    ]
    return _csv_response(rows, REQ_COLUMNS, "requirements.csv")


@router.get("/export/matrix")
def export_matrix(project_id: str, db: Session = Depends(get_db)):
    # Reuse the same computation as /api/matrix rather than duplicating trace logic.
    from .trace import get_traceability_matrix
    matrix = get_traceability_matrix(project_id, db)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["requirement", "title", "system_design", "detailed_design", "test_cases", "status"])
    for row in matrix:
        writer.writerow([
            row["requirement"].display_id,
            row["requirement"].title or "",
            ", ".join(d.display_id for d in row["system_design"]),
            ", ".join(d.display_id for d in row["detailed_design"]),
            ", ".join(t.display_id for t in row["test_cases"]),
            row["status"],
        ])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]), media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="traceability_matrix.csv"'},
    )


# ------------------------------------------------------------------ import

@router.post("/import/needs")
async def import_needs(project_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))
    created, skipped = [], []
    for i, row in enumerate(reader, start=2):  # row 1 is the header
        display_id = (row.get("display_id") or "").strip()
        title = (row.get("title") or "").strip()
        description = (row.get("description") or "").strip()
        if not display_id or not title or not description:
            skipped.append({"row": i, "reason": "missing display_id, title, or description"})
            continue
        try:
            artifact = create_artifact(db, project_id, "need", display_id)
        except HTTPException:
            db.rollback()
            skipped.append({"row": i, "display_id": display_id, "reason": "display_id already exists"})
            continue
        need = models.Need(
            id=artifact.id, title=title, description=description,
            stakeholder=row.get("stakeholder") or None, source=row.get("source") or None,
            priority=row.get("priority") or None, status=row.get("status") or "draft",
            author=row.get("author") or None, rationale=row.get("rationale") or None,
        )
        db.add(need)
        db.commit()
        created.append(display_id)
    return {"created": created, "skipped": skipped}


@router.post("/import/requirements")
async def import_requirements(project_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))
    created, skipped = [], []
    for i, row in enumerate(reader, start=2):
        display_id = (row.get("display_id") or "").strip()
        title = (row.get("title") or "").strip()
        req_text = (row.get("req_text") or "").strip()
        req_type = (row.get("req_type") or "").strip() or "system"
        if not display_id or not title or not req_text:
            skipped.append({"row": i, "reason": "missing display_id, title, or req_text"})
            continue
        try:
            artifact = create_artifact(db, project_id, "requirement", display_id)
        except HTTPException:
            db.rollback()
            skipped.append({"row": i, "display_id": display_id, "reason": "display_id already exists"})
            continue
        req = models.Requirement(
            id=artifact.id, title=title, req_text=req_text, req_type=req_type,
            priority=row.get("priority") or None, status=row.get("status") or "draft",
            verification_method=row.get("verification_method") or None,
            author=row.get("author") or None, rationale=row.get("rationale") or None,
        )
        db.add(req)
        db.flush()
        db.add(models.RequirementVersion(
            requirement_id=req.id, version=1, req_text_snapshot=req.req_text,
            change_description="Imported from CSV", changed_by=row.get("author"),
        ))
        db.commit()
        created.append(display_id)
    return {"created": created, "skipped": skipped}
