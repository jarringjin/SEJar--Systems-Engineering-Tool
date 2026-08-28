"""
This router is the core of the whole application: the generic
TraceLink table plus everything derived from it (traversal, matrix,
coverage %, orphan detection). Every one of these endpoints is a pure
read over trace_link + artifact - no relationship type has its own
storage, which is what section 4/9/10/11 of the architecture doc require.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from .. import models, schemas
from ..database import get_db
from ..artifact_utils import get_or_404

router = APIRouter(tags=["trace"])

MAX_TRAVERSAL_DEPTH = 10  # guard against runaway/cyclic graphs

# canonical direction + display title lookup per artifact type,
# used to build human-readable trace nodes without a big switch in every endpoint
_TYPE_MODEL = {
    "need": models.Need,
    "requirement": models.Requirement,
    "system_design": models.SystemDesignElement,
    "detailed_design": models.DetailedDesignElement,
    "test_case": models.TestCase,
}
_TYPE_TITLE_FIELD = {
    "need": "title",
    "requirement": "title",
    "system_design": "name",
    "detailed_design": "name",
    "test_case": "title",
}


def _artifact_ref(db: Session, artifact_id: str) -> schemas.ArtifactRef:
    artifact = db.query(models.Artifact).filter_by(id=artifact_id).first()
    if not artifact:
        return schemas.ArtifactRef(id=artifact_id, artifact_type="unknown", display_id="?")
    model = _TYPE_MODEL.get(artifact.artifact_type)
    title = None
    status = None
    if model:
        obj = db.query(model).filter_by(id=artifact_id).first()
        if obj:
            title = getattr(obj, _TYPE_TITLE_FIELD[artifact.artifact_type], None)
            status = getattr(obj, "status", None)
    return schemas.ArtifactRef(
        id=artifact.id, artifact_type=artifact.artifact_type,
        display_id=artifact.display_id, title=title, status=status,
    )


# -------------------------------------------------------------------- links

@router.post("/api/links", response_model=schemas.TraceLinkOut, status_code=201)
def create_link(payload: schemas.TraceLinkCreate, db: Session = Depends(get_db)):
    get_or_404(db, models.Artifact, payload.source_id, "Source artifact")
    get_or_404(db, models.Artifact, payload.target_id, "Target artifact")
    if payload.source_id == payload.target_id:
        raise HTTPException(status_code=400, detail="An artifact cannot link to itself")

    existing = (
        db.query(models.TraceLink)
        .filter_by(
            source_id=payload.source_id,
            target_id=payload.target_id,
            relationship_type=payload.relationship_type,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="This link already exists")

    link = models.TraceLink(**payload.model_dump())
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


@router.get("/api/links", response_model=list[schemas.TraceLinkOut])
def list_links(
    source_id: Optional[str] = None,
    target_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.TraceLink)
    if source_id:
        q = q.filter(models.TraceLink.source_id == source_id)
    if target_id:
        q = q.filter(models.TraceLink.target_id == target_id)
    return q.all()


@router.delete("/api/links/{link_id}", status_code=204)
def delete_link(link_id: str, db: Session = Depends(get_db)):
    link = get_or_404(db, models.TraceLink, link_id, "Trace link")
    db.delete(link)
    db.commit()


# ------------------------------------------------------------ trace traversal

def _walk(db: Session, artifact_id: str, direction: str, depth: int, visited: set) -> list[schemas.TraceNode]:
    """direction: 'forward' walks source->target edges outward, 'backward' walks target->source."""
    if depth >= MAX_TRAVERSAL_DEPTH or artifact_id in visited:
        return []
    visited = visited | {artifact_id}

    if direction == "forward":
        edges = db.query(models.TraceLink).filter_by(target_id=artifact_id).all()
        neighbor_attr = "source_id"
    else:
        edges = db.query(models.TraceLink).filter_by(source_id=artifact_id).all()
        neighbor_attr = "target_id"

    nodes = []
    for edge in edges:
        neighbor_id = getattr(edge, neighbor_attr)
        nodes.append(
            schemas.TraceNode(
                artifact=_artifact_ref(db, neighbor_id),
                relationship_type=edge.relationship_type,
                children=_walk(db, neighbor_id, direction, depth + 1, visited),
            )
        )
    return nodes


@router.get("/api/trace/{artifact_id}")
def get_trace(artifact_id: str, db: Session = Depends(get_db)):
    """
    Returns the full chain in both directions from a given artifact.
    'upstream' = things this artifact depends on / traces back to
                 (e.g. from a Requirement: its Need)
    'downstream' = things that satisfy/implement/verify this artifact
                 (e.g. from a Requirement: its Design, Detailed Design, Tests)

    Direction convention: for every relationship type, 'source' is the more
    downstream/detailed artifact and 'target' is the more upstream one -
    derives_from (Requirement->Need), satisfies (SystemDesign->Requirement),
    implemented_by (DetailedDesign->SystemDesign), and verifies
    (TestCase->Requirement) all follow this rule. That consistency is what
    lets a single generic walk (source_id edges = upstream neighbor via
    target_id, target_id edges = downstream neighbor via source_id) work
    for every artifact type without type-specific logic - a relationship
    stored in the opposite direction would silently misclassify which side
    of the chain it belongs on.
    """
    get_or_404(db, models.Artifact, artifact_id, "Artifact")
    return {
        "artifact": _artifact_ref(db, artifact_id),
        "upstream": _walk(db, artifact_id, "backward", 0, set()),
        "downstream": _walk(db, artifact_id, "forward", 0, set()),
    }


# ----------------------------------------------------------------- matrix

@router.get("/api/matrix")
def get_traceability_matrix(project_id: str, db: Session = Depends(get_db)):
    """
    One row per requirement in the project: which system design,
    detailed design, and test case(s) it connects to, and an overall
    status. This directly implements architecture doc section 9.
    """
    reqs = (
        db.query(models.Requirement)
        .join(models.Artifact, models.Artifact.id == models.Requirement.id)
        .filter(models.Artifact.project_id == project_id)
        .all()
    )

    rows = []
    for req in reqs:
        design_links = db.query(models.TraceLink).filter_by(
            target_id=req.id, relationship_type="satisfies"
        ).all()
        design_ids = [l.source_id for l in design_links]

        detailed_ids = []
        for d_id in design_ids:
            impl_links = db.query(models.TraceLink).filter_by(
                target_id=d_id, relationship_type="implemented_by"
            ).all()
            detailed_ids.extend([l.source_id for l in impl_links])

        test_links = db.query(models.TraceLink).filter_by(
            target_id=req.id, relationship_type="verifies"
        ).all()
        test_ids = [l.source_id for l in test_links]

        if not design_ids and not test_ids:
            status = "orphan"
        elif design_ids and test_ids:
            status = "complete"
        else:
            status = "partial"

        rows.append({
            "requirement": _artifact_ref(db, req.id),
            "system_design": [_artifact_ref(db, i) for i in design_ids],
            "detailed_design": [_artifact_ref(db, i) for i in detailed_ids],
            "test_cases": [_artifact_ref(db, i) for i in test_ids],
            "status": status,
        })
    return rows


# --------------------------------------------------------------- coverage

@router.get("/api/coverage")
def get_coverage(project_id: str, db: Session = Depends(get_db)):
    """Implements the 5 coverage metrics from architecture doc section 10."""
    reqs = (
        db.query(models.Requirement)
        .join(models.Artifact, models.Artifact.id == models.Requirement.id)
        .filter(models.Artifact.project_id == project_id)
        .all()
    )
    sys_designs = (
        db.query(models.SystemDesignElement)
        .join(models.Artifact, models.Artifact.id == models.SystemDesignElement.id)
        .filter(models.Artifact.project_id == project_id)
        .all()
    )
    total_reqs = len(reqs)
    total_designs = len(sys_designs)

    req_with_design = 0
    req_with_verification = 0
    req_end_to_end = 0

    for req in reqs:
        design_links = db.query(models.TraceLink).filter_by(
            target_id=req.id, relationship_type="satisfies"
        ).all()
        test_links = db.query(models.TraceLink).filter_by(
            target_id=req.id, relationship_type="verifies"
        ).all()
        has_design = len(design_links) > 0
        has_test = len(test_links) > 0

        if has_design:
            req_with_design += 1
        if has_test:
            req_with_verification += 1

        has_detailed = False
        for l in design_links:
            impl = db.query(models.TraceLink).filter_by(
                target_id=l.source_id, relationship_type="implemented_by"
            ).first()
            if impl:
                has_detailed = True
                break

        if has_design and has_detailed and has_test:
            req_end_to_end += 1

    design_with_req = 0
    for d in sys_designs:
        links = db.query(models.TraceLink).filter_by(
            source_id=d.id, relationship_type="satisfies"
        ).first()
        if links:
            design_with_req += 1

    def pct(n, d):
        return round((n / d) * 100, 1) if d else 0.0

    return {
        "requirement_to_design_pct": pct(req_with_design, total_reqs),
        "design_to_requirement_pct": pct(design_with_req, total_designs),
        "requirement_to_verification_pct": pct(req_with_verification, total_reqs),
        "end_to_end_traceability_pct": pct(req_end_to_end, total_reqs),
        "total_requirements": total_reqs,
        "total_system_design_elements": total_designs,
    }


# ----------------------------------------------------------------- issues

@router.get("/api/issues")
def get_issues(project_id: str, db: Session = Depends(get_db)):
    """
    Computed on demand (not stored) for MVP simplicity - the Issue table
    exists in the schema for Phase 2 persistence/dismissal workflow, but
    for now this endpoint recalculates orphans fresh every call, which is
    cheap at the scale a single local project will realistically reach.
    """
    issues = []

    reqs = (
        db.query(models.Requirement)
        .join(models.Artifact, models.Artifact.id == models.Requirement.id)
        .filter(models.Artifact.project_id == project_id)
        .all()
    )
    for req in reqs:
        ref = _artifact_ref(db, req.id)
        has_need = db.query(models.TraceLink).filter_by(
            source_id=req.id, relationship_type="derives_from"
        ).first()
        has_design = db.query(models.TraceLink).filter_by(
            target_id=req.id, relationship_type="satisfies"
        ).first()
        has_test = db.query(models.TraceLink).filter_by(
            target_id=req.id, relationship_type="verifies"
        ).first()

        if not has_need and req.req_type != "stakeholder":
            issues.append({"artifact": ref, "issue_type": "no_parent_need",
                            "description": "Requirement has no linked parent need"})
        if not has_design:
            issues.append({"artifact": ref, "issue_type": "no_design_allocation",
                            "description": "Requirement is not allocated to any system design element"})
        if not has_test:
            issues.append({"artifact": ref, "issue_type": "no_verification",
                            "description": "Requirement has no linked test case"})

    sys_designs = (
        db.query(models.SystemDesignElement)
        .join(models.Artifact, models.Artifact.id == models.SystemDesignElement.id)
        .filter(models.Artifact.project_id == project_id)
        .all()
    )
    for d in sys_designs:
        has_req = db.query(models.TraceLink).filter_by(
            source_id=d.id, relationship_type="satisfies"
        ).first()
        if not has_req:
            issues.append({"artifact": _artifact_ref(db, d.id), "issue_type": "design_no_requirement",
                            "description": "Design element satisfies no requirement"})

    test_cases = (
        db.query(models.TestCase)
        .join(models.Artifact, models.Artifact.id == models.TestCase.id)
        .filter(models.Artifact.project_id == project_id)
        .all()
    )
    for t in test_cases:
        has_req = db.query(models.TraceLink).filter_by(
            source_id=t.id, relationship_type="verifies"
        ).first()
        if not has_req:
            issues.append({"artifact": _artifact_ref(db, t.id), "issue_type": "test_no_requirement",
                            "description": "Test case verifies no requirement"})

    return issues
