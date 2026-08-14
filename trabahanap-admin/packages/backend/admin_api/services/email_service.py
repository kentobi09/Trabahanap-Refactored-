from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import EmailStr
from typing import List, Optional
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", "trabahanap.works@gmail.com"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", "gcujuzaxismdullp"),
    MAIL_FROM=os.getenv("MAIL_FROM", "trabahanap.works@gmail.com"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_STARTTLS=os.getenv("MAIL_STARTTLS", "True").lower() == "true",
    MAIL_SSL_TLS=os.getenv("MAIL_SSL_TLS", "False").lower() == "true",
    USE_CREDENTIALS=os.getenv("MAIL_USE_CREDENTIALS", "True").lower() == "true",
    VALIDATE_CERTS=os.getenv("MAIL_VALIDATE_CERTS", "True").lower() == "true"
)

fm = FastMail(conf)

async def send_email_async(subject: str, recipients: List[EmailStr], body: str):
    message = MessageSchema(
        subject=subject,
        recipients=recipients,
        body=body,
        subtype="html"  # Send emails as HTML
    )
    try:
        await fm.send_message(message)
        print(f"Email sent to {recipients} with subject: {subject}")
    except Exception as e:
        print(f"Failed to send email: {e}")

def get_verification_email_body(name: str, status: str, reason: Optional[str] = None) -> str:
    """Generates HTML email body for application verification status."""
    status_action = "approved" if status == "verified" else status
    
    html_body = f"""
    <p>Dear {name},</p>
    """
    if status == "verified":
        html_body += f"""
        <p>Congratulations! Your application for Trabahanap has been <strong>{status_action}</strong>.</p>
        <p>You can now log in and access all features available to verified users.</p>
        """
    elif status == "rejected":
        html_body += f"""
        <p>We regret to inform you that your application for Trabahanap has been <strong>{status_action}</strong>.</p>
        """
        if reason:
            html_body += f"<p>Reason: {reason}</p>"
        html_body += "<p>If you believe this was a mistake or have further questions, please contact our support team.</p>"
    
    html_body += """
    <p>Thank you for your interest in Trabahanap.</p>
    <p>Regards,<br>The Trabahanap Team</p>
    """
    return html_body

def get_report_email_body(reporter_name: str, report_status: str, reported_item_info: str, reason: Optional[str] = None) -> str:
    """Generates HTML email body for user report status."""
    action_taken_text = "taken appropriate action based on your report" if report_status == "approved" else "decided not to take action at this time"
    
    html_body = f"""
    <p>Dear {reporter_name},</p>
    <p>Thank you for your report regarding: <strong>{reported_item_info}</strong>.</p>
    <p>We have reviewed your report. After careful consideration, we have <strong>{action_taken_text}</strong>.</p>
    """
    
    if report_status == "rejected" and reason:
        html_body += f"<p>Reason for this decision: {reason}</p>"
    elif report_status == "approved" and reason: # Optional: provide reason for approval action
        html_body += f"<p>Details regarding the action taken: {reason}</p>"

    html_body += """
    <p>Your efforts help us maintain a safe and respectful community on Trabahanap. If you have further concerns, please don't hesitate to reach out.</p>
    <p>Regards,<br>The Trabahanap Team</p>
    """
    return html_body

def get_notification_for_reported_user_body(reported_user_name: str, reported_item_info: str, report_reason: str) -> str:
    """
    Generates the HTML email body for a user who was reported, after the report against them has been approved.
    Does not reveal the identity of the reporter.
    """
    html_content = f"""
    <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }}
                .container {{ background-color: #f9f9f9; padding: 20px; border-radius: 5px; }}
                .header {{ color: #2c3e50; }}
                .content p {{ line-height: 1.6; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h2 class="header">Notification Regarding Your Account/Content on Trabahanap</h2>
                <div class="content">
                    <p>Dear {reported_user_name},</p>
                    <p>This email is to inform you that action has been taken regarding a report concerning your account or content on Trabahanap. Specifically, a report related to: <strong>{reported_item_info}</strong> for the following reason: <em>{report_reason}</em>.</p>
                    <p>Our team has reviewed the report and has taken appropriate action in accordance with our community guidelines and terms of service.</p>
                    <p>We encourage you to review our policies to ensure a safe and respectful environment for all users. If you have questions or believe there has been a misunderstanding, please contact our support team through the app.</p>
                    <p>Thank you for your understanding and cooperation.</p>
                    <p>Sincerely,<br>The Trabahanap Team</p>
                </div>
            </div>
        </body>
    </html>
    """
    return html_content

def get_sanction_email_body(user_name: str, action_type: str, days: Optional[int] = None) -> str:
    """Generates HTML email body for user account sanction (ban, suspend, unban)."""
    if action_type == "banned":
        title = "Notice of Account Ban"
        content = "<p>Your account on Trabahanap has been <strong>banned</strong> due to a policy or report violation.</p><p>You will no longer be able to log in or use Trabahanap services.</p>"
    elif action_type == "suspended":
        title = f"Notice of Account Suspension ({days or 7} Days)"
        content = f"<p>Your account on Trabahanap has been <strong>suspended for {days or 7} days</strong> due to a user report review.</p><p>During this period, your access to Trabahanap will be temporarily restricted.</p>"
    else:
        title = "Account Access Restored"
        content = "<p>Your account status on Trabahanap has been reset to <strong>Active</strong>.</p><p>You can now log in and resume using all Trabahanap features.</p>"

    html_content = f"""
    <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }}
                .container {{ background-color: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0; }}
                .header {{ color: #1e3a8a; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h2 class="header">{title}</h2>
                <div class="content">
                    <p>Dear {user_name},</p>
                    {content}
                    <p>If you have any questions, please contact our support team.</p>
                    <p>Sincerely,<br>The Trabahanap Team</p>
                </div>
            </div>
        </body>
    </html>
    """
    return html_content
