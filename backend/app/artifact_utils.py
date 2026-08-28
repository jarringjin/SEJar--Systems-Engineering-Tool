"""
Every typed table (Need, Requirement, ...) shares its primary key with a
row in Artifact. These helpers keep that invariant in one place instead
of repeating it in every router.
"""
from fastapi import HTTPException
from sqlalchemy.orm import Session

from . import models


def create_artifact(db: Session, project_id: str, artifact_type: str, display_id: str) -> models.Artifact:
    existing = (
        db.query(models.Artifact)
        .filter_by(project_id=project_id, display_id=display_id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"display_id '{display_id}' already used in this project",
        )
    artifact = models.Artifact(
        artifact_type=artifact_type, display_id=display_id, project_id=project_id
    )
    db.add(artifact)
    db.flush()  # get artifact.id without committing yet
    return artifact


def get_or_404(db: Session, model, obj_id: str, label: str):
    obj = db.query(model).filter_by(id=obj_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"{label} '{obj_id}' not found")
    return obj
