import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import parseaddr, formataddr

logger = logging.getLogger("campusconnect.email")

def get_smtp_config():
    from_name = os.getenv("SMTP_FROM_NAME", "CampusConnect")
    from_email = os.getenv("SMTP_FROM_EMAIL", os.getenv("SMTP_USERNAME", "no-reply@campusconnect.edu"))
    return {
        "host": os.getenv("SMTP_HOST", "smtp.gmail.com"),
        "port": int(os.getenv("SMTP_PORT", "587")),
        "username": os.getenv("SMTP_USERNAME", ""),
        "password": os.getenv("SMTP_PASSWORD", ""),
        "from_name": from_name,
        "from_email": from_email,
        "environment": os.getenv("ENVIRONMENT", os.getenv("APP_ENV", "development")).lower(),
    }

def send_otp_email(to_email: str, otp: str, expires_minutes: int = 10) -> bool:
    """
    Send a 6-digit OTP code to the recipient via SMTP.
    In local development without SMTP credentials, logs the OTP to stdout.
    In production, strictly sends via SMTP and never exposes OTP in logs.
    """
    config = get_smtp_config()
    is_dev = config["environment"] in ("development", "local", "test", "dev")

    subject = "CampusConnect Password Reset OTP"

    # Plain text version
    text_content = f"""CampusConnect Password Reset

Hello,

You recently requested to reset your password for your CampusConnect account.

Your password reset OTP is: {otp}

This OTP is valid for {expires_minutes} minutes.

Security notice: Never share this OTP with anyone. CampusConnect administrators will never ask for your OTP.

If you did not request a password reset, you can safely ignore this email.

— The CampusConnect Team
"""

    # HTML version
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F1EB; margin: 0; padding: 24px; color: #1C1B19; }}
    .container {{ max-width: 520px; margin: 0 auto; background: #FFFFFF; border: 2px solid #1C1B19; border-radius: 12px; box-shadow: 4px 4px 0 #1C1B19; overflow: hidden; }}
    .header {{ background: #2F6F4E; color: #FFFFFF; padding: 24px; text-align: center; }}
    .header h1 {{ margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }}
    .content {{ padding: 32px 24px; }}
    .otp-box {{ background: #FDF6E3; border: 2px dashed #E59F3C; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0; }}
    .otp-code {{ font-family: 'JetBrains Mono', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1C1B19; margin: 0; }}
    .notice {{ font-size: 13px; color: #6E695F; line-height: 1.5; margin-top: 16px; }}
    .footer {{ background: #F4F1EB; border-top: 1px solid #E2DCD2; padding: 16px; text-align: center; font-size: 12px; color: #6E695F; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CampusConnect</h1>
    </div>
    <div class="content">
      <h2 style="font-size: 18px; margin-top: 0;">Password Reset Request</h2>
      <p style="font-size: 14px; line-height: 1.5;">
        We received a request to reset the password for your CampusConnect account associated with <strong>{to_email}</strong>.
      </p>
      <div class="otp-box">
        <p style="font-size: 12px; text-transform: uppercase; font-weight: 700; color: #E59F3C; margin: 0 0 8px 0;">Verification Code</p>
        <p class="otp-code">{otp}</p>
      </div>
      <p style="font-size: 14px; line-height: 1.5;">
        This OTP is valid for <strong>{expires_minutes} minutes</strong>.
      </p>
      <div class="notice">
        <strong>Security Notice:</strong> Never share this code with anyone. CampusConnect administrators and faculty will never ask for your verification code.
      </div>
      <p style="font-size: 13px; color: #6E695F; margin-top: 24px;">
        If you did not make this request, you can safely ignore this email. Your password will remain unchanged.
      </p>
    </div>
    <div class="footer">
      &copy; CampusConnect Platform &bull; Professional Campus Community
    </div>
  </div>
</body>
</html>
"""

    # 1. Brevo HTTP REST API (Port 443 - HTTPS)
    # Sends to ANY recipient in the world without requiring a custom domain!
    brevo_api_key = os.getenv("BREVO_API_KEY", "").strip()
    if brevo_api_key:
        try:
            import httpx
            display_name = config.get("from_name") or "CampusConnect"
            sender_email = os.getenv("BREVO_FROM_EMAIL") or os.getenv("SMTP_FROM_EMAIL") or os.getenv("SMTP_USERNAME") or "praptidodal2@gmail.com"
            if "campusconnect.edu" in sender_email:
                sender_email = "praptidodal2@gmail.com"

            resp = httpx.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={
                    "api-key": brevo_api_key,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                json={
                    "sender": {"name": display_name, "email": sender_email},
                    "to": [{"email": to_email}],
                    "subject": subject,
                    "htmlContent": html_content,
                    "textContent": text_content,
                },
                timeout=10.0,
            )
            if resp.status_code in (200, 201):
                logger.info(f"Password reset email sent successfully via Brevo API to {to_email}")
                return True
            else:
                logger.error(f"Brevo API error: {resp.status_code} - {resp.text}")
                return False
        except Exception as e:
            logger.error(f"Failed to send email via Brevo API: {e}")
            return False

    # 2. Resend HTTP REST API (Port 443 - HTTPS)
    # By default with onboarding@resend.dev, sends to account owner's email address
    resend_api_key = os.getenv("RESEND_API_KEY", "").strip()
    if resend_api_key:
        try:
            import httpx
            display_name = config.get("from_name") or "CampusConnect"
            from_sender = os.getenv("RESEND_FROM_EMAIL", f"{display_name} <onboarding@resend.dev>")
            
            resp = httpx.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": from_sender,
                    "to": [to_email],
                    "subject": subject,
                    "html": html_content,
                    "text": text_content,
                },
                timeout=10.0,
            )
            if resp.status_code in (200, 201):
                logger.info(f"Password reset email sent successfully via Resend API to {to_email}")
                return True
            else:
                logger.error(f"Resend API error: {resp.status_code} - {resp.text}")
        except Exception as e:
            logger.error(f"Failed to send email via Resend API: {e}")

    # If SMTP is not configured or in development mode without live credentials
    if not config["username"] or not config["password"]:
        if is_dev:
            print("\n[DEV ONLY EMAIL LOG] ========================================")
            print(f"[DEV ONLY] To: {to_email}")
            print(f"[DEV ONLY] Subject: {subject}")
            print(f"[DEV ONLY] OTP Code: {otp}")
            print(f"[DEV ONLY] Expiration: {expires_minutes} minutes")
            print("[DEV ONLY EMAIL LOG] ========================================\n")
            return True
        else:
            logger.error("SMTP credentials not configured in production environment.")
            return False

    # Attempt live SMTP delivery
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        
        parsed_name, bare_email = parseaddr(config["from_email"])
        bare_sender = bare_email or config["username"]
        display_name = config.get("from_name") or parsed_name or "CampusConnect"
        msg["From"] = formataddr((display_name, bare_sender))
        msg["To"] = to_email

        part1 = MIMEText(text_content, "plain")
        part2 = MIMEText(html_content, "html")
        msg.attach(part1)
        msg.attach(part2)

        with smtplib.SMTP(config["host"], config["port"], timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(config["username"], config["password"])
            server.sendmail(bare_sender, [to_email], msg.as_string())

        logger.info(f"Password reset email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send password reset email to {to_email}: {e}")
        if is_dev:
            print(f"\n[DEV ONLY SMTP FALLBACK] Failed to send via SMTP ({e}). Logging OTP for development:")
            print(f"[DEV ONLY] To: {to_email}")
            print(f"[DEV ONLY] OTP Code: {otp}")
            print("[DEV ONLY SMTP FALLBACK] ========================================\n")
            return True
        return False
