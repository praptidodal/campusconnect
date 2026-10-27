from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.auth import (
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse,
    UserDetail,
)
from app.schemas.password_reset import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    VerifyResetOtpRequest,
    VerifyResetOtpResponse,
    ResendResetOtpRequest,
    ResendResetOtpResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
)
from app.services.auth_service import register_user, login_user
from app.services import password_reset_service
from app.auth.jwt_handler import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=RegisterResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new user.

    - **name**: Full name (required)
    - **email**: Unique email address (required)
    - **password**: Minimum 8 characters (required)
    - **role**: student | faculty | club | admin (default: student)
    """
    result = register_user(payload, db)
    return result


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate and receive a JWT access token.

    Returns 401 for invalid credentials and 403 if the account is suspended.
    """
    result = login_user(payload.email, payload.password, db)
    return result


@router.get("/me", response_model=UserDetail)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Return the currently authenticated user's profile.

    Requires a valid Bearer token in the Authorization header.
    """
    return current_user


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """
    Request a 6-digit password reset OTP sent via email.
    Always returns a generic success response to prevent account enumeration.
    """
    client_ip = request.client.host if request.client else None
    return password_reset_service.request_password_reset(payload.email, db, client_ip)


@router.post("/verify-reset-otp", response_model=VerifyResetOtpResponse)
def verify_reset_otp(payload: VerifyResetOtpRequest, db: Session = Depends(get_db)):
    """
    Verify the 6-digit OTP and receive a single-use password reset token.
    """
    return password_reset_service.verify_reset_otp(payload.email, payload.otp, db)


@router.post("/resend-reset-otp", response_model=ResendResetOtpResponse)
def resend_reset_otp(payload: ResendResetOtpRequest, request: Request, db: Session = Depends(get_db)):
    """
    Resend the password reset OTP with rate limiting and a 60-second cooldown.
    """
    client_ip = request.client.host if request.client else None
    return password_reset_service.resend_password_reset_otp(payload.email, db, client_ip)


@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Reset user password using the single-use reset token.
    """
    return password_reset_service.reset_password_with_token(payload.reset_token, payload.new_password, db)


@router.get("/smtp-diagnostics")
def smtp_diagnostics():
    """
    Diagnostic endpoint to test live email connectivity (Brevo / Resend / SMTP).
    """
    import os
    import smtplib
    import httpx
    from app.services.email_service import get_smtp_config

    config = get_smtp_config()
    brevo_key = os.getenv("BREVO_API_KEY", "").strip()
    resend_key = os.getenv("RESEND_API_KEY", "").strip()
    username = config.get("username", "")
    password = config.get("password", "")

    diag = {
        "active_provider": "none",
        "brevo": {
            "configured": bool(brevo_key),
            "key_length": len(brevo_key),
            "key_prefix": brevo_key[:8] + "..." if brevo_key else "",
            "test_status": "not_tested",
        },
        "resend": {
            "configured": bool(resend_key),
            "key_length": len(resend_key),
        },
        "smtp": {
            "has_username": bool(username),
            "has_password": bool(password),
        }
    }

    if brevo_key:
        diag["active_provider"] = "Brevo HTTP REST API"
        try:
            r = httpx.get("https://api.brevo.com/v3/account", headers={"api-key": brevo_key}, timeout=8.0)
            if r.status_code == 200:
                data = r.json()
                diag["brevo"]["test_status"] = f"SUCCESS: Valid Brevo API key! Account email: {data.get('email')}"
            else:
                diag["brevo"]["test_status"] = f"FAILED: HTTP {r.status_code} - {r.text}"
        except Exception as e:
            diag["brevo"]["test_status"] = f"FAILED: {e}"
        return diag

    if resend_key:
        diag["active_provider"] = "Resend HTTP REST API"
        return diag

    diag["active_provider"] = "Gmail SMTP (Will fail on Render Free tier)"
    if not username:
        diag["smtp"]["test_status"] = "SMTP_USERNAME is empty"
    return diag
