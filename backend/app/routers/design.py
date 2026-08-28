from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..artifact_utils import create_artifact, get_or_404

router = APIRouter(tags=["design"])


# ------------------------------------------------------------ system design

@router.get("/api/system-design", response_model=list[schemas.SystemDesignOut])
def list_system_design(project_id: str, db: Session = Depends(get_db)):
    q = (
        db.query(models.SystemDesignElement)
        .join(models.Artifact, models.Artifact.id == models.SystemDesignElement.id)
        .filter(models.Artifact.project_id == project_id)
    )
    return [_serialize_sys(e, db) for e in q.all()]


@router.post("/api/system-design", response_model=schemas.SystemDesignOut, status_code=201)
def create_system_design(payload: schemas.SystemDesignCreate, db: Session = Depends(get_db)):
    artifact = create_artifact(db, payload.project_id, "system_design", payload.display_id)
    elem = models.SystemDesignElement(
        id=artifact.id,
        name=payload.name,
        description=payload.description,
        element_type=payload.element_type,
        parent_id=payload.parent_id,
        responsibilities=payload.responsibilities,
    )
    db.add(elem)
    db.commit()
    db.refresh(elem)
    return _serialize_sys(elem, db)


@router.get("/api/system-design/{elem_id}", response_model=schemas.SystemDesignOut)
def get_system_design(elem_id: str, db: Session = Depends(get_db)):
    elem = get_or_404(db, models.SystemDesignElement, elem_id, "System design element")
    return _serialize_sys(elem, db)


@router.delete("/api/system-design/{elem_id}", status_code=204)
def delete_system_design(elem_id: str, db: Session = Depends(get_db)):
    elem = get_or_404(db, models.SystemDesignElement, elem_id, "System design element")
    artifact = db.query(models.Artifact).filter_by(id=elem_id).first()
    db.delete(elem)
    if artifact:
        db.delete(artifact)
    db.commit()


@router.patch("/api/system-design/{elem_id}", response_model=schemas.SystemDesignOut)
def update_system_design(elem_id: str, payload: schemas.SystemDesignUpdate, db: Session = Depends(get_db)):
    elem = get_or_404(db, models.SystemDesignElement, elem_id, "System design element")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(elem, field, value)
    db.commit()
    db.refresh(elem)
    return _serialize_sys(elem, db)


def _serialize_sys(elem: models.SystemDesignElement, db: Session) -> schemas.SystemDesignOut:
    artifact = db.query(models.Artifact).filter_by(id=elem.id).first()
    return schemas.SystemDesignOut(
        id=elem.id,
        display_id=artifact.display_id,
        name=elem.name,
        description=elem.description,
        element_type=elem.element_type,
        parent_id=elem.parent_id,
        responsibilities=elem.responsibilities,
    )


# ---------------------------------------------------------- detailed design

@router.get("/api/detailed-design", response_model=list[schemas.DetailedDesignOut])
def list_detailed_design(project_id: str, db: Session = Depends(get_db)):
    q = (
        db.query(models.DetailedDesignElement)
        .join(models.Artifact, models.Artifact.id == models.DetailedDesignElement.id)
        .filter(models.Artifact.project_id == project_id)
    )
    return [_serialize_det(e, db) for e in q.all()]


@router.post("/api/detailed-design", response_model=schemas.DetailedDesignOut, status_code=201)
def create_detailed_design(payload: schemas.DetailedDesignCreate, db: Session = Depends(get_db)):
    artifact = create_artifact(db, payload.project_id, "detailed_design", payload.display_id)
    elem = models.DetailedDesignElement(
        id=artifact.id,
        name=payload.name,
        description=payload.description,
        element_type=payload.element_type,
        parent_sys_design_id=payload.parent_sys_design_id,
        implementation_owner=payload.implementation_owner,
    )
    db.add(elem)
    db.commit()
    db.refresh(elem)
    return _serialize_det(elem, db)


@router.get("/api/detailed-design/{elem_id}", response_model=schemas.DetailedDesignOut)
def get_detailed_design(elem_id: str, db: Session = Depends(get_db)):
    elem = get_or_404(db, models.DetailedDesignElement, elem_id, "Detailed design element")
    return _serialize_det(elem, db)


@router.delete("/api/detailed-design/{elem_id}", status_code=204)
def delete_detailed_design(elem_id: str, db: Session = Depends(get_db)):
    elem = get_or_404(db, models.DetailedDesignElement, elem_id, "Detailed design element")
    artifact = db.query(models.Artifact).filter_by(id=elem_id).first()
    db.delete(elem)
    if artifact:
        db.delete(artifact)
    db.commit()


@router.patch("/api/detailed-design/{elem_id}", response_model=schemas.DetailedDesignOut)
def update_detailed_design(elem_id: str, payload: schemas.DetailedDesignUpdate, db: Session = Depends(get_db)):
    elem = get_or_404(db, models.DetailedDesignElement, elem_id, "Detailed design element")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(elem, field, value)
    db.commit()
    db.refresh(elem)
    return _serialize_det(elem, db)


def _serialize_det(elem: models.DetailedDesignElement, db: Session) -> schemas.DetailedDesignOut:
    artifact = db.query(models.Artifact).filter_by(id=elem.id).first()
    return schemas.DetailedDesignOut(
        id=elem.id,
        display_id=artifact.display_id,
        name=elem.name,
        description=elem.description,
        element_type=elem.element_type,
        parent_sys_design_id=elem.parent_sys_design_id,
        implementation_owner=elem.implementation_owner,
    )
