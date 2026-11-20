import re
from typing import Optional
import uuid
from pydantic import BaseModel, Field, field_validator

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s.]+\.[^@\s]+$")


def _validate_email(value: str) -> str:
    cleaned = value.strip().lower()
    if not EMAIL_PATTERN.match(cleaned):
        raise ValueError("Enter a valid email address")
    return cleaned


class SignupRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., max_length=320)
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Name cannot be empty")
        return cleaned

    @field_validator("email")
    @classmethod
    def clean_email(cls, value: str) -> str:
        return _validate_email(value)


class LoginRequest(BaseModel):
    email: str = Field(..., max_length=320)
    password: str = Field(..., min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def clean_email(cls, value: str) -> str:
        return _validate_email(value)


class SupabaseAuthRequest(BaseModel):
    access_token: str = Field(
        ...,
        min_length=10,
        description="Supabase Auth access token returned after the Google OAuth code exchange.",
    )


class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    email_verified: bool
    provider: str

    model_config = {"from_attributes": True}


class AuthSessionResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    verification_required: bool = False


class SignupResponse(BaseModel):
    user: UserResponse
    verification_required: bool = True
    verification_token: Optional[str] = Field(
        None,
        description="Single-use email verification token. Returned directly while email delivery is not configured.",
    )


class VerifyEmailRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=256)


class MessageResponse(BaseModel):
    message: str
