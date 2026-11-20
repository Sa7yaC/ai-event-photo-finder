"""Authentication primitives: password hashing, token issuance, and user lookup."""

from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import AccessToken, EmailVerificationToken, User

ACCESS_TOKEN_TTL = timedelta(days=30)
VERIFICATION_TOKEN_TTL = timedelta(hours=24)
_PBKDF2_ROUNDS = 260_000


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), _PBKDF2_ROUNDS)
    return f"pbkdf2_sha256${_PBKDF2_ROUNDS}${salt}${digest.hex()}"


def verify_password(password: str, stored: Optional[str]) -> bool:
    if not stored:
        return False
    try:
        algorithm, rounds, salt, digest = stored.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), int(rounds))
        return hmac.compare_digest(candidate.hex(), digest)
    except (ValueError, TypeError):
        return False


def normalize_email(email: str) -> str:
    return email.strip().lower()


class AuthService:
    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.email == normalize_email(email)))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def create_user(
        db: AsyncSession,
        *,
        email: str,
        name: str,
        password: Optional[str] = None,
        google_sub: Optional[str] = None,
        email_verified: bool = False,
    ) -> User:
        user = User(
            email=normalize_email(email),
            name=name.strip() or email.split("@")[0],
            password_hash=hash_password(password) if password else None,
            google_sub=google_sub,
            email_verified=email_verified,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def issue_access_token(db: AsyncSession, user: User) -> str:
        now = datetime.now(timezone.utc)
        token = AccessToken(
            user_id=user.id,
            token=secrets.token_urlsafe(48),
            expires_at=now + ACCESS_TOKEN_TTL,
            created_at=now,
        )
        db.add(token)
        await db.commit()
        return token.token

    @staticmethod
    async def resolve_access_token(db: AsyncSession, raw_token: Optional[str]) -> Optional[User]:
        if not raw_token:
            return None
        result = await db.execute(select(AccessToken).where(AccessToken.token == raw_token))
        token = result.scalar_one_or_none()
        if not token:
            return None

        now = datetime.now(timezone.utc)
        expires_at = token.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < now:
            await db.delete(token)
            await db.commit()
            return None

        token.last_used_at = now
        await db.commit()
        return await AuthService.get_user_by_id(db, token.user_id)

    @staticmethod
    async def revoke_access_token(db: AsyncSession, raw_token: Optional[str]) -> None:
        if not raw_token:
            return
        result = await db.execute(select(AccessToken).where(AccessToken.token == raw_token))
        token = result.scalar_one_or_none()
        if token:
            await db.delete(token)
            await db.commit()

    @staticmethod
    async def create_verification_token(db: AsyncSession, user: User) -> str:
        now = datetime.now(timezone.utc)
        record = EmailVerificationToken(
            user_id=user.id,
            token=secrets.token_urlsafe(32),
            expires_at=now + VERIFICATION_TOKEN_TTL,
            created_at=now,
        )
        db.add(record)
        await db.commit()
        return record.token

    @staticmethod
    async def consume_verification_token(db: AsyncSession, raw_token: str) -> Optional[User]:
        result = await db.execute(
            select(EmailVerificationToken).where(EmailVerificationToken.token == raw_token)
        )
        record = result.scalar_one_or_none()
        if not record or record.used_at is not None:
            return None

        now = datetime.now(timezone.utc)
        expires_at = record.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < now:
            return None

        record.used_at = now
        user = await AuthService.get_user_by_id(db, record.user_id)
        if user:
            user.email_verified = True
        await db.commit()
        return user
