from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from .. import models, schemas
from ..database import get_db
from ..artifact_utils import create_artifact, get_or_404

router = APIRouter(prefix="/api/requirements", tags=["requirements"])


@router.get("", response_model=list[schemas.RequirementOut])
def list_requirements(
    project_id: str,
    status: Optional[str] = None,
    req_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = (
        db.query(models.Requirement)
        .join(models.Artifact, models.Artifact.id == models.Requirement.id)
        .filter(models.Artifact.project_id == project_id)
    )
    if status:
        q = q.filter(models.Requirement.status == status)
    if req_type:
        q = q.filter(models.Requirement.req_type == req_type)
    return [_serialize(r, db) for r in q.all()]


@router.post("", response_model=schemas.RequirementOut, status_code=201)
def create_requirement(payload: schemas.RequirementCreate, db: Session = Depends(get_db)):
    artifact = create_artifact(db, payload.project_id, "requirement", payload.display_id)
    req = models.Requirement(
        id=artifact.id,
        title=payload.title,
        req_text=payload.req_text,
        req_type=payload.req_type,
        parent_req_id=payload.parent_req_id,
        rationale=payload.rationale,
        priority=payload.priority,
        status=payload.status,
        verification_method=payload.verification_method,
        author=payload.author,
        tags=payload.tags,
    )
    db.add(req)
    db.flush()
    # seed version 1 history row
    db.add(
        models.RequirementVersion(
            requirement_id=req.id,
            version=1,
            req_text_snapshot=req.req_text,
            change_description="Initial creation",
            changed_by=payload.author,
        )
    )
    db.commit()
    db.refresh(req)
    return _serialize(req, db)


@router.get("/{req_id}", response_model=schemas.RequirementOut)
def get_requirement(req_id: str, db: Session = Depends(get_db)):
    req = get_or_404(db, models.Requirement, req_id, "Requirement")
    return _serialize(req, db)


@router.get("/{req_id}/versions", response_model=list[schemas.RequirementVersionOut])
def get_requirement_versions(req_id: str, db: Session = Depends(get_db)):
    get_or_404(db, models.Requirement, req_id, "Requirement")
    return (
        db.query(models.RequirementVersion)
        .filter_by(requirement_id=req_id)
        .order_by(models.RequirementVersion.version.desc())
        .all()
    )


@router.patch("/{req_id}", response_model=schemas.RequirementOut)
def update_requirement(req_id: str, payload: schemas.RequirementUpdate, db: Session = Depends(get_db)):
    req = get_or_404(db, models.Requirement, req_id, "Requirement")
    data = payload.model_dump(exclude_unset=True)

    text_changed = "req_text" in data and data["req_text"] != req.req_text

    for field in ("title", "req_text", "req_type", "rationale", "priority", "status",
                  "verification_method", "verification_status", "author", "reviewer", "tags"):
        if field in data:
            setattr(req, field, data[field])

    if text_changed:
        req.version += 1
        db.add(
            models.RequirementVersion(
                requirement_id=req.id,
                version=req.version,
                req_text_snapshot=req.req_text,
                change_description=data.get("change_description") or "Text updated",
                changed_by=data.get("changed_by"),
            )
        )

    db.commit()
    db.refresh(req)
    return _serialize(req, db)


@router.delete("/{req_id}", status_code=204)
def delete_requirement(req_id: str, db: Session = Depends(get_db)):
    req = get_or_404(db, models.Requirement, req_id, "Requirement")
    artifact = db.query(models.Artifact).filter_by(id=req_id).first()
    db.query(models.RequirementVersion).filter_by(requirement_id=req_id).delete()
    db.delete(req)
    if artifact:
        db.delete(artifact)
    db.commit()


def _serialize(req: models.Requirement, db: Session) -> schemas.RequirementOut:
    artifact = db.query(models.Artifact).filter_by(id=req.id).first()
    return schemas.RequirementOut(
        id=req.id,
        display_id=artifact.display_id,
        title=req.title,
        req_text=req.req_text,
        req_type=req.req_type,
        parent_req_id=req.parent_req_id,
        rationale=req.rationale,
        priority=req.priority,
        status=req.status,
        verification_method=req.verification_method,
        verification_status=req.verification_status,
        version=req.version,
        author=req.author,
        reviewer=req.reviewer,
        tags=req.tags or [],
        created_at=req.created_at,
        modified_at=req.modified_at,
    )
