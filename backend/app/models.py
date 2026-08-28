"""
SQLAlchemy models.

Notes on choices:
- IDs are stored as TEXT (str(uuid4())) rather than a native UUID type,
  since SQLite has no UUID column - this keeps the models portable to
  Postgres later without change (Postgres will just treat it as text
  unless you later migrate the column type).
- `Artifact` is the universal registry every traceable object rows into
  first. `TraceLink` only points at Artifact ids, which is what lets one
  generic link table represent every relationship type in section 20
  of the spec without a matrix of per-type join tables.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Text, DateTime, Integer, ForeignKey, UniqueConstraint,
    JSON, Boolean
)
from sqlalchemy.orm import relationship

from .database import Base


def gen_id() -> str:
    return str(uuid.uuid4())


def now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------- project

class Project(Base):
    __tablename__ = "project"
    id = Column(String(36), primary_key=True, default=gen_id)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=now)


# --------------------------------------------------------- artifact registry

class Artifact(Base):
    """
    Every traceable object (Need, Requirement, SystemDesignElement,
    DetailedDesignElement, TestCase) gets exactly one row here.
    TraceLink.source_id / target_id reference this table, not the
    type-specific tables directly, so links stay generic while still
    being validated against something real.
    """
    __tablename__ = "artifact"
    id = Column(String(36), primary_key=True, default=gen_id)
    artifact_type = Column(String(30), nullable=False)  # need|requirement|system_design|detailed_design|test_case
    display_id = Column(String(30), nullable=False)      # e.g. "REQ-SYS-001"
    project_id = Column(String(36), ForeignKey("project.id"), nullable=False)
    created_at = Column(DateTime, default=now)

    __table_args__ = (UniqueConstraint("project_id", "display_id", name="uq_artifact_display_id"),)


# ------------------------------------------------------------------- need

class Need(Base):
    __tablename__ = "need"
    id = Column(String(36), ForeignKey("artifact.id"), primary_key=True)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=False)
    source = Column(String(200))
    stakeholder = Column(String(200))
    rationale = Column(Text)
    status = Column(String(20), default="draft")
    priority = Column(String(10))
    version = Column(Integer, default=1)
    author = Column(String(100))
    created_at = Column(DateTime, default=now)
    modified_at = Column(DateTime, default=now, onupdate=now)


# ------------------------------------------------------------- requirement

class Requirement(Base):
    __tablename__ = "requirement"
    id = Column(String(36), ForeignKey("artifact.id"), primary_key=True)
    title = Column(String(300), nullable=False)
    req_text = Column(Text, nullable=False)
    req_type = Column(String(20), nullable=False)  # stakeholder|system|subsystem|component
    parent_req_id = Column(String(36), ForeignKey("requirement.id"), nullable=True)
    rationale = Column(Text)
    priority = Column(String(10))
    status = Column(String(20), default="draft")  # draft|review|approved|baselined|obsolete
    verification_method = Column(String(20))       # test|analysis|inspection|demonstration
    verification_status = Column(String(20), default="unverified")
    version = Column(Integer, default=1)
    author = Column(String(100))
    reviewer = Column(String(100))
    tags = Column(JSON, default=list)
    created_at = Column(DateTime, default=now)
    modified_at = Column(DateTime, default=now, onupdate=now)

    versions = relationship("RequirementVersion", back_populates="requirement", cascade="all, delete-orphan")


class RequirementVersion(Base):
    __tablename__ = "requirement_version"
    id = Column(String(36), primary_key=True, default=gen_id)
    requirement_id = Column(String(36), ForeignKey("requirement.id"), nullable=False)
    version = Column(Integer, nullable=False)
    req_text_snapshot = Column(Text, nullable=False)
    change_description = Column(Text)
    changed_by = Column(String(100))
    changed_at = Column(DateTime, default=now)

    requirement = relationship("Requirement", back_populates="versions")


# ---------------------------------------------------------- system design

class SystemDesignElement(Base):
    __tablename__ = "system_design_element"
    id = Column(String(36), ForeignKey("artifact.id"), primary_key=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    element_type = Column(String(30))  # system|subsystem|ecu|sensor|actuator|interface|sw_component|...
    parent_id = Column(String(36), ForeignKey("system_design_element.id"), nullable=True)
    responsibilities = Column(Text)
    created_at = Column(DateTime, default=now)
    modified_at = Column(DateTime, default=now, onupdate=now)


# -------------------------------------------------------- detailed design

class DetailedDesignElement(Base):
    __tablename__ = "detailed_design_element"
    id = Column(String(36), ForeignKey("artifact.id"), primary_key=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    element_type = Column(String(30))
    parent_sys_design_id = Column(String(36), ForeignKey("system_design_element.id"), nullable=True)
    implementation_owner = Column(String(200))
    created_at = Column(DateTime, default=now)
    modified_at = Column(DateTime, default=now, onupdate=now)


# --------------------------------------------------------------- test case

class TestCase(Base):
    __tablename__ = "test_case"
    id = Column(String(36), ForeignKey("artifact.id"), primary_key=True)
    title = Column(String(300), nullable=False)
    objective = Column(Text)
    preconditions = Column(Text)
    procedure = Column(Text)
    expected_result = Column(Text)
    verification_method = Column(String(20))
    status = Column(String(20), default="not_run")  # not_run|pass|fail|blocked
    author = Column(String(100))
    reviewer = Column(String(100))
    created_at = Column(DateTime, default=now)
    modified_at = Column(DateTime, default=now, onupdate=now)

    results = relationship("TestResult", back_populates="test_case", cascade="all, delete-orphan")


class TestResult(Base):
    __tablename__ = "test_result"
    id = Column(String(36), primary_key=True, default=gen_id)
    test_case_id = Column(String(36), ForeignKey("test_case.id"), nullable=False)
    result = Column(String(10), nullable=False)  # pass|fail
    evidence_url = Column(Text)
    run_by = Column(String(100))
    run_at = Column(DateTime, default=now)
    notes = Column(Text)

    test_case = relationship("TestCase", back_populates="results")


# --------------------------------------------------------------- trace link

class TraceLink(Base):
    """
    The generic relationship table. relationship_type follows a fixed
    canonical direction per type (see architecture doc section 4) so
    forward/backward traversal is just querying source_id vs target_id
    on the same rows - never store the inverse relationship separately.
    """
    __tablename__ = "trace_link"
    id = Column(String(36), primary_key=True, default=gen_id)
    source_id = Column(String(36), ForeignKey("artifact.id"), nullable=False)
    target_id = Column(String(36), ForeignKey("artifact.id"), nullable=False)
    relationship_type = Column(String(30), nullable=False)
    created_by = Column(String(100))
    created_at = Column(DateTime, default=now)

    __table_args__ = (
        UniqueConstraint("source_id", "target_id", "relationship_type", name="uq_trace_link"),
    )


# ------------------------------------------------------------------ baseline

class Baseline(Base):
    __tablename__ = "baseline"
    id = Column(String(36), primary_key=True, default=gen_id)
    project_id = Column(String(36), ForeignKey("project.id"))
    name = Column(String(100), nullable=False)
    description = Column(Text)
    snapshot = Column(JSON, nullable=False)
    created_by = Column(String(100))
    created_at = Column(DateTime, default=now)


# --------------------------------------------------------------------- issue

class Issue(Base):
    __tablename__ = "issue"
    id = Column(String(36), primary_key=True, default=gen_id)
    artifact_id = Column(String(36), ForeignKey("artifact.id"))
    issue_type = Column(String(30))
    description = Column(Text)
    status = Column(String(20), default="open")
    detected_at = Column(DateTime, default=now)


# ------------------------------------------------------------------- comment

class Comment(Base):
    __tablename__ = "comment"
    id = Column(String(36), primary_key=True, default=gen_id)
    artifact_id = Column(String(36), ForeignKey("artifact.id"))
    author = Column(String(100))
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=now)
