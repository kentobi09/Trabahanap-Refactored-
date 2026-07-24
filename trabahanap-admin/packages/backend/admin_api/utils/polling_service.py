import asyncio
import logging
from datetime import datetime, timezone
from typing import Callable, Coroutine, Any, Dict

from admin_api.models.documents import Applicant, ReportValidation, User

logger = logging.getLogger(__name__)

# Initialize with timezone-aware UTC datetime
last_applicant_timestamp: datetime = datetime.now(timezone.utc)
last_report_timestamp: datetime = datetime.now(timezone.utc)

def _ensure_utc_aware(dt: datetime) -> datetime:
    """Ensures a datetime object is timezone-aware and in UTC."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

async def poll_new_applicants(
    broadcast_func: Callable[[str, str, Dict[str, Any]], Coroutine[Any, Any, None]]
):
    """Polls for new pending applicants and broadcasts notifications."""
    global last_applicant_timestamp
    # Ensure last_applicant_timestamp is UTC aware for consistent comparison
    # This should already be the case due to initialization and updates
    # but as a safeguard if it were ever to become naive.
    safe_last_applicant_ts = _ensure_utc_aware(last_applicant_timestamp)

    logger.info(f"[POLL_APPLICANTS] Starting poll. Querying for joined_at > {safe_last_applicant_ts.isoformat()}")
    try:
        new_applicants = await Applicant.find(
            Applicant.verification_status == "pending",
            Applicant.joined_at > safe_last_applicant_ts
        ).sort(+Applicant.joined_at).to_list()

        if new_applicants:
            logger.info(f"[POLL_APPLICANTS] Found {len(new_applicants)} new applicant(s).")
            max_ts_in_batch = safe_last_applicant_ts
            
            for app in new_applicants:
                app_joined_at_utc = _ensure_utc_aware(app.joined_at)
                logger.info(f"[POLL_APPLICANTS] Processing applicant ID {app.id}, Email: {app.email}, joined_at_utc: {app_joined_at_utc.isoformat()}")
                
                await broadcast_func(
                    type="new_verification_request",
                    message=f"New verification request from {app.email}.",
                    details={"applicantId": str(app.id), "email": app.email, "userType": app.user_type, "joinedAt": app_joined_at_utc.isoformat()}
                )
                
                if app_joined_at_utc > max_ts_in_batch:
                    max_ts_in_batch = app_joined_at_utc
            
            # Update global timestamp only if new max is greater
            if max_ts_in_batch > last_applicant_timestamp: # Compare with original global to prevent re-setting if only tz changed
                last_applicant_timestamp = max_ts_in_batch
                logger.info(f"[POLL_APPLICANTS] Updated last_applicant_timestamp to: {last_applicant_timestamp.isoformat()}")
            # else:
                # logger.info(f"[POLL_APPLICANTS] No update to last_applicant_timestamp needed. max_ts_in_batch: {max_ts_in_batch.isoformat()}, current: {last_applicant_timestamp.isoformat()}")

        # else:
            # logger.info("[POLL_APPLICANTS] No new applicants found.") # Can be noisy

    except Exception as e:
        logger.error(f"[POLL_APPLICANTS] Error: {e}", exc_info=True)

async def poll_new_reports(
    broadcast_func: Callable[[str, str, Dict[str, Any]], Coroutine[Any, Any, None]]
):
    """Polls for new pending reports and broadcasts notifications."""
    global last_report_timestamp
    safe_last_report_ts = _ensure_utc_aware(last_report_timestamp)

    logger.info(f"[POLL_REPORTS] Starting poll. Querying for date_reported > {safe_last_report_ts.isoformat()}")
    try:
        new_reports = await ReportValidation.find(
            ReportValidation.status == "pending",
            ReportValidation.date_reported > safe_last_report_ts
        ).sort(+ReportValidation.date_reported).to_list()

        if new_reports:
            logger.info(f"[POLL_REPORTS] Found {len(new_reports)} new report(s).")
            max_ts_in_batch = safe_last_report_ts

            for report in new_reports:
                report_date_utc = _ensure_utc_aware(report.date_reported)
                logger.info(f"[POLL_REPORTS] Processing report ID {report.id}, date_reported_utc: {report_date_utc.isoformat()}")
                
                reported_entity_display = f"ID: {str(report.reported_object_id)}" # Default display
                try:
                    if report.reported_object_id:
                        # Attempt to fetch as User, similar to get_pending_reports
                        reported_user = await User.get(report.reported_object_id)
                        if reported_user:
                            name_parts = []
                            if reported_user.first_name: name_parts.append(reported_user.first_name)
                            if reported_user.middle_name: name_parts.append(reported_user.middle_name)
                            if reported_user.last_name: name_parts.append(reported_user.last_name)
                            if reported_user.suffix_name: name_parts.append(reported_user.suffix_name)
                            name = " ".join(name_parts).strip()
                            if name:
                                reported_entity_display = name
                            else:
                                reported_entity_display = f"User (ID: {str(reported_user.id)})"
                        else:
                            # Potentially try fetching as Job or other entity types if needed in future
                            logger.warning(f"[POLL_REPORTS] Reported object ID {report.reported_object_id} not found as User.")
                except Exception as e_fetch:
                    logger.error(f"[POLL_REPORTS] Error fetching reported entity details for ID {report.reported_object_id}: {e_fetch}")

                await broadcast_func(
                    type="new_report_filed",
                    message=f"New report filed regarding: {reported_entity_display}.",
                    details={
                        "reportId": str(report.id),
                        "reportedObjectId": str(report.reported_object_id),
                        "reportedObjectName": reported_entity_display, # Add resolved name to details
                        "reporterId": str(report.reporter),
                        "reason": report.reason,
                        "dateReported": report_date_utc.isoformat()
                    }
                )
                if report_date_utc > max_ts_in_batch:
                    max_ts_in_batch = report_date_utc

            if max_ts_in_batch > last_report_timestamp:
                last_report_timestamp = max_ts_in_batch
                logger.info(f"[POLL_REPORTS] Updated last_report_timestamp to: {last_report_timestamp.isoformat()}")
            # else:
                # logger.info(f"[POLL_REPORTS] No update to last_report_timestamp needed. max_ts_in_batch: {max_ts_in_batch.isoformat()}, current: {last_report_timestamp.isoformat()}")
        # else:
            # logger.info("[POLL_REPORTS] No new reports found.") # Can be noisy
            
    except Exception as e:
        logger.error(f"[POLL_REPORTS] Error: {e}", exc_info=True)

async def start_polling(
    broadcast_func: Callable[[str, str, Dict[str, Any]], Coroutine[Any, Any, None]],
    interval_seconds: int = 10
):
    """Starts the polling loop for applicants and reports."""
    logger.info(f"Polling service started. Interval: {interval_seconds} seconds.")
    # Initialize timestamps just before the loop starts to get the most current time
    global last_applicant_timestamp, last_report_timestamp
    last_applicant_timestamp = datetime.now(timezone.utc)
    last_report_timestamp = datetime.now(timezone.utc)
    logger.info(f"Initial last_applicant_timestamp: {last_applicant_timestamp.isoformat()}")
    logger.info(f"Initial last_report_timestamp: {last_report_timestamp.isoformat()}")

    while True:
        await poll_new_applicants(broadcast_func)
        await poll_new_reports(broadcast_func)
        await asyncio.sleep(interval_seconds)
