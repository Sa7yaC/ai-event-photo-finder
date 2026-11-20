"""Account authentication: signup, login, email verification, and Google sign-in."""

from __future__ import annotations

import logging
from typing import Annotated, Optional

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import (
    AuthSessionResponse,
    LoginRequest,
    SignupRequest,
    SignupResponse,
    SupabaseAuthRequest,
    UserResponse,
    VerifyEmailRequest,
)
from app.services.auth_service import AuthService, normalize_email, verify_password

logger = logging.getLogger(__name__)
router = APIRouter()


def _to_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        email_verified=user.email_verified,
        provider="google" if user.google_sub else "password",
    )


async def get_current_user(
    authorization: Annotated[Optional[str], Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in to continue.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    raw_token = authorization.split(" ", 1)[1].strip()
    user = await AuthService.resolve_access_token(db, raw_token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session expired. Sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_optional_user(
    authorization: Annotated[Optional[str], Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    return await AuthService.resolve_access_token(db, authorization.split(" ", 1)[1].strip())


@router.post(
    "/signup",
    response_model=SignupResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an account with email and password",
)
async def signup(payload: SignupRequest, db: AsyncSession = Depends(get_db)) -> SignupResponse:
    existing = await AuthService.get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Sign in instead.",
        )

    user = await AuthService.create_user(
        db,
        email=payload.email,
        name=payload.name,
        password=payload.password,
        email_verified=False,
    )
    verification_token = await AuthService.create_verification_token(db, user)

    # Without SMTP configured, the verification link is logged and returned so local
    # development can complete the flow. Production configures SMTP.
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"
    if settings.SMTP_HOST:
        logger.info("Queued verification email for %s", user.email)
    else:
        logger.info("Email verification link for %s: %s", user.email, verify_url)

    return SignupResponse(
        user=_to_user_response(user),
        verification_required=True,
        verification_token=None if settings.SMTP_HOST else verification_token,
    )


@router.post("/verify-email", response_model=AuthSessionResponse, summary="Verify an email address")
async def verify_email(payload: VerifyEmailRequest, db: AsyncSession = Depends(get_db)) -> AuthSessionResponse:
    user = await AuthService.consume_verification_token(db, payload.token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification link is invalid or has expired. Request a new one.",
        )

    access_token = await AuthService.issue_access_token(db, user)
    return AuthSessionResponse(
        access_token=access_token,
        user=_to_user_response(user),
        verification_required=False,
    )


@router.post("/login", response_model=AuthSessionResponse, summary="Sign in with email and password")
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> AuthSessionResponse:
    user = await AuthService.get_user_by_email(db, payload.email)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect.",
        )

    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verify your email before signing in. Check your inbox for the link.",
        )

    access_token = await AuthService.issue_access_token(db, user)
    return AuthSessionResponse(access_token=access_token, user=_to_user_response(user))


@router.post(
    "/supabase",
    response_model=AuthSessionResponse,
    summary="Exchange a Supabase OAuth session for an app session",
)
async def supabase_sign_in(
    payload: SupabaseAuthRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthSessionResponse:
    """
    Complete a Supabase OAuth sign-in.

    The browser verifies the Google account with Supabase, then sends the resulting
    Supabase access token here. We validate it against Supabase Auth, upsert the
    local user, and issue the app's own access token.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase sign-in is not configured for this deployment.",
        )

    userinfo_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                userinfo_url,
                headers={
                    "apikey": settings.SUPABASE_ANON_KEY,
                    "Authorization": f"Bearer {payload.access_token}",
                },
            )
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not reach Supabase to verify the sign-in. Try again.",
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Supabase session could not be verified. Sign in again.",
        )

    claims = response.json()
    email = normalize_email(claims.get("email") or "")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google did not return an email address for this account.",
        )

    metadata = claims.get("user_metadata") or {}
    display_name = (
        metadata.get("full_name")
        or metadata.get("name")
        or metadata.get("preferred_username")
        or email.split("@")[0]
    )
    supabase_user_id = claims.get("id")
    verified = bool(claims.get("email_confirmed_at")) or bool(claims.get("confirmed_at"))

    user = await AuthService.get_user_by_email(db, email)
    if not user:
        user = await AuthService.create_user(
            db,
            email=email,
            name=display_name,
            google_sub=supabase_user_id,
            email_verified=True,
        )
    else:
        changed = False
        if supabase_user_id and user.google_sub != supabase_user_id:
            user.google_sub = supabase_user_id
            changed = True
        if verified and not user.email_verified:
            user.email_verified = True
            changed = True
        if changed:
            await db.commit()

    access_token = await AuthService.issue_access_token(db, user)
    return AuthSessionResponse(
        access_token=access_token,
        user=_to_user_response(user),
        verification_required=False,
    )


@router.get("/me", response_model=UserResponse, summary="Current signed-in account")
async def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return _to_user_response(current_user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Revoke the current session")
async def logout(
    authorization: Annotated[Optional[str], Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> Response:
    if authorization and authorization.lower().startswith("bearer "):
        await AuthService.revoke_access_token(db, authorization.split(" ", 1)[1].strip())
    return Response(status_code=status.HTTP_204_NO_CONTENT)
