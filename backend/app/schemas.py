"""Request payload validation (mirrors the Mongoose validators of the original app)."""
from datetime import datetime, timedelta
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class Coordinates(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None


class CrowdfundingIn(BaseModel):
    enabled: bool = False
    targetAmount: Optional[float] = Field(default=None, ge=100, le=500000)
    purpose: Optional[str] = Field(default=None, max_length=200)


class IssueCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str = Field(min_length=10, max_length=120)
    description: str = Field(min_length=30, max_length=2000)
    category: str = Field(min_length=1)
    customFlair: Optional[str] = None
    location: str = Field(min_length=1)
    area: str = Field(min_length=1)
    coordinates: Coordinates = Coordinates()
    images: List[str] = Field(min_length=1, max_length=5)
    incidentDate: datetime
    isAnonymous: bool = False
    crowdfunding: CrowdfundingIn = CrowdfundingIn()
    urgency: str = "low"

    @field_validator("title")
    @classmethod
    def not_all_caps(cls, v: str) -> str:
        if v == v.upper() and any(c.isalpha() for c in v):
            raise ValueError("Title must not be all-caps")
        return v

    @field_validator("customFlair")
    @classmethod
    def flair_words(cls, v: Optional[str]) -> Optional[str]:
        if v and not 1 <= len(v.split()) <= 7:
            raise ValueError("Custom flair must be 1 to 7 words")
        return v or None

    @field_validator("urgency")
    @classmethod
    def urgency_ok(cls, v: str) -> str:
        return v if v in ("low", "medium", "high", "emergency") else "low"

    @model_validator(mode="after")
    def date_window(self):
        d = self.incidentDate.replace(tzinfo=None)
        now = datetime.utcnow()
        # one day of slack so "today" picked in a timezone ahead of UTC is accepted
        if d > now + timedelta(days=1) or d < now - timedelta(days=90):
            raise ValueError("Date cannot be in the future or older than 90 days")
        return self


class IssueEdit(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: Optional[str] = Field(default=None, min_length=10, max_length=120)
    description: Optional[str] = Field(default=None, min_length=30, max_length=2000)
    category: Optional[str] = None
    customFlair: Optional[str] = None
    location: Optional[str] = None
    area: Optional[str] = None
    coordinates: Optional[Coordinates] = None
    images: Optional[List[str]] = Field(default=None, min_length=1, max_length=5)
    isAnonymous: Optional[bool] = None


class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=1000)
    parentCommentId: Optional[str] = None

    @field_validator("body")
    @classmethod
    def strip_body(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Comment cannot be empty")
        return v


class PollOptionIn(BaseModel):
    text: str = Field(min_length=1, max_length=200)


class PollCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    question: str = Field(min_length=3, max_length=300)
    type: str
    options: List[PollOptionIn] = Field(min_length=2, max_length=8)
    category: str = "general"
    endsAt: Optional[datetime] = None
    allowAnonymous: bool = False


class VoteRequest(BaseModel):
    optionIds: List[str] = Field(min_length=1)


class UserUpsert(BaseModel):
    """Profile fields a client may write. Role / points are never client-writable."""

    model_config = ConfigDict(extra="ignore")

    name: Optional[str] = Field(default=None, max_length=120)
    photoURL: Optional[str] = None
    coverPhoto: Optional[str] = None
    phone: Optional[str] = Field(default=None, max_length=40)
    area: Optional[str] = Field(default=None, max_length=120)
    streetAddress: Optional[str] = Field(default=None, max_length=200)
    apartmentNumber: Optional[str] = Field(default=None, max_length=60)
    bio: Optional[str] = Field(default=None, max_length=500)


class UploadIn(BaseModel):
    name: str
    base64: str


class PublicIncidentIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str = Field(min_length=1, max_length=160)
    area: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=2000)
    category: str = "General Waste"
    reporterName: Optional[str] = None


Json = Any
