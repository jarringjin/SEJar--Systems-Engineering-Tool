from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from .. import models, schemas
from ..database import get_db
from ..artifact_utils import create_artifact, get_or_404

router = APIRouter(prefix="/api/needs", tags=["needs"])


@router.get("", response_model=list[schemas.NeedOut])
def list_needs(project_id: str, status: Optional[str] = None, db: Session = Depends(get_db)):
    q = (
        db.query(models.Need)
        .join(models.Artifact, models.Artifact.id == models.Need.id)
        .filter(models.Artifact.project_id == project_id)
    )
    if status:
        q = q.filter(models.Need.status == status)
    needs = q.all()
    return [_serialize(n, db) for n in needs]


@router.post("", response_model=schemas.NeedOut, status_code=201)
def create_need(payload: schemas.NeedCreate, db: Session = Depends(get_db)):
    artifact = create_artifact(db, payload.project_id, "need", payload.display_id)
    need = models.Need(
        id=artifact.id,
        title=payload.title,
        description=payload.description,
        source=payload.source,
        stakeholder=payload.stakeholder,
        rationale=payload.rationale,
        status=payload.status,
        priority=payload.priority,
        author=payload.author,
    )
    db.add(need)
    db.commit()
    db.refresh(need)
    return _serialize(need, db)


@router.get("/{need_id}", response_model=schemas.NeedOut)
def get_need(need_id: str, db: Session = Depends(get_db)):
    need = get_or_404(db, models.Need, need_id, "Need")
    return _serialize(need, db)


@router.patch("/{need_id}", response_model=schemas.NeedOut)
def update_need(need_id: str, payload: schemas.NeedUpdate, db: Session = Depends(get_db)):
    need = get_or_404(db, models.Need, need_id, "Need")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(need, field, value)
    db.commit()
    db.refresh(need)
    return _serialize(need, db)


@router.delete("/{need_id}", status_code=204)
def delete_need(need_id: str, db: Session = Depends(get_db)):
    need = get_or_404(db, models.Need, need_id, "Need")
    artifact = db.query(models.Artifact).filter_by(id=need_id).first()
    db.delete(need)
    if artifact:
        db.delete(artifact)
    db.commit()


def _serialize(need: models.Need, db: Session) -> schemas.NeedOut:
    artifact = db.query(models.Artifact).filter_by(id=need.id).first()
    return schemas.NeedOut(
        id=need.id,
        display_id=artifact.display_id,
        title=need.title,
        description=need.description,
        source=need.source,
        stakeholder=need.stakeholder,
        rationale=need.rationale,
        status=need.status,
        priority=need.priority,
        version=need.version,
        author=need.author,
        created_at=need.created_at,
        modified_at=need.modified_at,
    )
