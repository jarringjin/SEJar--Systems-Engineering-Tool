from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..artifact_utils import create_artifact, get_or_404

router = APIRouter(prefix="/api/test-cases", tags=["test-cases"])


@router.get("", response_model=list[schemas.TestCaseOut])
def list_test_cases(project_id: str, db: Session = Depends(get_db)):
    q = (
        db.query(models.TestCase)
        .join(models.Artifact, models.Artifact.id == models.TestCase.id)
        .filter(models.Artifact.project_id == project_id)
    )
    return [_serialize(t, db) for t in q.all()]


@router.post("", response_model=schemas.TestCaseOut, status_code=201)
def create_test_case(payload: schemas.TestCaseCreate, db: Session = Depends(get_db)):
    artifact = create_artifact(db, payload.project_id, "test_case", payload.display_id)
    tc = models.TestCase(
        id=artifact.id,
        title=payload.title,
        objective=payload.objective,
        preconditions=payload.preconditions,
        procedure=payload.procedure,
        expected_result=payload.expected_result,
        verification_method=payload.verification_method,
        author=payload.author,
    )
    db.add(tc)
    db.commit()
    db.refresh(tc)
    return _serialize(tc, db)


@router.get("/{tc_id}", response_model=schemas.TestCaseOut)
def get_test_case(tc_id: str, db: Session = Depends(get_db)):
    tc = get_or_404(db, models.TestCase, tc_id, "Test case")
    return _serialize(tc, db)


@router.patch("/{tc_id}", response_model=schemas.TestCaseOut)
def update_test_case(tc_id: str, payload: schemas.TestCaseUpdate, db: Session = Depends(get_db)):
    tc = get_or_404(db, models.TestCase, tc_id, "Test case")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(tc, field, value)
    db.commit()
    db.refresh(tc)
    return _serialize(tc, db)


@router.post("/{tc_id}/results", status_code=201)
def add_test_result(tc_id: str, payload: schemas.TestResultCreate, db: Session = Depends(get_db)):
    tc = get_or_404(db, models.TestCase, tc_id, "Test case")
    result = models.TestResult(
        test_case_id=tc_id,
        result=payload.result,
        evidence_url=payload.evidence_url,
        run_by=payload.run_by,
        notes=payload.notes,
    )
    db.add(result)
    # keep the test case's own status in sync with its most recent result
    tc.status = payload.result
    db.commit()
    return {"id": result.id, "result": result.result, "run_at": result.run_at}


@router.delete("/{tc_id}", status_code=204)
def delete_test_case(tc_id: str, db: Session = Depends(get_db)):
    tc = get_or_404(db, models.TestCase, tc_id, "Test case")
    artifact = db.query(models.Artifact).filter_by(id=tc_id).first()
    db.query(models.TestResult).filter_by(test_case_id=tc_id).delete()
    db.delete(tc)
    if artifact:
        db.delete(artifact)
    db.commit()


def _serialize(tc: models.TestCase, db: Session) -> schemas.TestCaseOut:
    artifact = db.query(models.Artifact).filter_by(id=tc.id).first()
    return schemas.TestCaseOut(
        id=tc.id,
        display_id=artifact.display_id,
        title=tc.title,
        objective=tc.objective,
        preconditions=tc.preconditions,
        procedure=tc.procedure,
        expected_result=tc.expected_result,
        verification_method=tc.verification_method,
        status=tc.status,
        author=tc.author,
    )
