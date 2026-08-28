from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


# ------------------------------------------------------------------ project

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectOut(ProjectCreate):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime


# --------------------------------------------------------------------- need

class NeedCreate(BaseModel):
    project_id: str
    display_id: str
    title: str
    description: str
    source: Optional[str] = None
    stakeholder: Optional[str] = None
    rationale: Optional[str] = None
    status: str = "draft"
    priority: Optional[str] = None
    author: Optional[str] = None


class NeedUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None
    stakeholder: Optional[str] = None
    rationale: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None


class NeedOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    display_id: str
    title: str
    description: str
    source: Optional[str] = None
    stakeholder: Optional[str] = None
    rationale: Optional[str] = None
    status: str
    priority: Optional[str] = None
    version: int
    author: Optional[str] = None
    created_at: datetime
    modified_at: datetime


# ------------------------------------------------------------- requirement

class RequirementCreate(BaseModel):
    project_id: str
    display_id: str
    title: str
    req_text: str
    req_type: str  # stakeholder|system|subsystem|component
    parent_req_id: Optional[str] = None
    rationale: Optional[str] = None
    priority: Optional[str] = None
    status: str = "draft"
    verification_method: Optional[str] = None
    author: Optional[str] = None
    tags: List[str] = []


class RequirementUpdate(BaseModel):
    title: Optional[str] = None
    req_text: Optional[str] = None
    req_type: Optional[str] = None
    rationale: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    verification_method: Optional[str] = None
    verification_status: Optional[str] = None
    author: Optional[str] = None
    reviewer: Optional[str] = None
    tags: Optional[List[str]] = None
    change_description: Optional[str] = None  # required if req_text changes, for version history
    changed_by: Optional[str] = None


class RequirementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    display_id: str
    title: str
    req_text: str
    req_type: str
    parent_req_id: Optional[str] = None
    rationale: Optional[str] = None
    priority: Optional[str] = None
    status: str
    verification_method: Optional[str] = None
    verification_status: str
    version: int
    author: Optional[str] = None
    reviewer: Optional[str] = None
    tags: List[str] = []
    created_at: datetime
    modified_at: datetime


class RequirementVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    version: int
    req_text_snapshot: str
    change_description: Optional[str] = None
    changed_by: Optional[str] = None
    changed_at: datetime


# ------------------------------------------------------------ design elems

class SystemDesignCreate(BaseModel):
    project_id: str
    display_id: str
    name: str
    description: Optional[str] = None
    element_type: Optional[str] = None
    parent_id: Optional[str] = None
    responsibilities: Optional[str] = None


class SystemDesignOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    display_id: str
    name: str
    description: Optional[str] = None
    element_type: Optional[str] = None
    parent_id: Optional[str] = None
    responsibilities: Optional[str] = None


class SystemDesignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    element_type: Optional[str] = None
    parent_id: Optional[str] = None
    responsibilities: Optional[str] = None


class DetailedDesignCreate(BaseModel):
    project_id: str
    display_id: str
    name: str
    description: Optional[str] = None
    element_type: Optional[str] = None
    parent_sys_design_id: Optional[str] = None
    implementation_owner: Optional[str] = None


class DetailedDesignOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    display_id: str
    name: str
    description: Optional[str] = None
    element_type: Optional[str] = None
    parent_sys_design_id: Optional[str] = None
    implementation_owner: Optional[str] = None


class DetailedDesignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    element_type: Optional[str] = None
    parent_sys_design_id: Optional[str] = None
    implementation_owner: Optional[str] = None


# ---------------------------------------------------------------- test case

class TestCaseCreate(BaseModel):
    project_id: str
    display_id: str
    title: str
    objective: Optional[str] = None
    preconditions: Optional[str] = None
    procedure: Optional[str] = None
    expected_result: Optional[str] = None
    verification_method: Optional[str] = None
    author: Optional[str] = None


class TestCaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    display_id: str
    title: str
    objective: Optional[str] = None
    preconditions: Optional[str] = None
    procedure: Optional[str] = None
    expected_result: Optional[str] = None
    verification_method: Optional[str] = None
    status: str
    author: Optional[str] = None


class TestCaseUpdate(BaseModel):
    title: Optional[str] = None
    objective: Optional[str] = None
    preconditions: Optional[str] = None
    procedure: Optional[str] = None
    expected_result: Optional[str] = None
    verification_method: Optional[str] = None
    author: Optional[str] = None


class TestResultCreate(BaseModel):
    result: str  # pass|fail
    evidence_url: Optional[str] = None
    run_by: Optional[str] = None
    notes: Optional[str] = None


# -------------------------------------------------------------- trace links

class TraceLinkCreate(BaseModel):
    source_id: str
    target_id: str
    relationship_type: str
    created_by: Optional[str] = None


class TraceLinkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    source_id: str
    target_id: str
    relationship_type: str
    created_at: datetime


class ArtifactRef(BaseModel):
    """Minimal artifact info used when returning a trace graph node."""
    id: str
    artifact_type: str
    display_id: str
    title: Optional[str] = None
    status: Optional[str] = None


class TraceNode(BaseModel):
    artifact: ArtifactRef
    relationship_type: Optional[str] = None  # relationship that led to this node from its parent
    children: List["TraceNode"] = []


TraceNode.model_rebuild()
