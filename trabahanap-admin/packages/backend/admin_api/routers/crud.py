from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, Query, BackgroundTasks, Response
from ..models.documents import User, Applicant, Admin, AdminCreate, LoginRequest, TotalUsers, Job, TotalJobs, TotalApplicants, ApplicantJobSeeker, JobSeeker, MonthlyData, ReportValidation, FinalReport, Achievement, ReportResponse
from admin_api.utils.security import get_password_hash, verify_password, create_access_token, create_refresh_token, get_current_active_admin
from datetime import datetime, timedelta
from beanie import PydanticObjectId
from typing import List, Dict, Any, Optional
import logging
import json
import csv
import io
import re
from ..services.email_service import send_email_async, get_verification_email_body, get_report_email_body, get_notification_for_reported_user_body, get_sanction_email_body

# Configure basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"New WebSocket connection: {websocket.client}. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket disconnected: {websocket.client}. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: str):
        disconnected_sockets = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to {connection.client}: {e}. Marking for disconnect.")
                disconnected_sockets.append(connection)
        
        for ws in disconnected_sockets:
            self.disconnect(ws)

manager = ConnectionManager()

async def broadcast_notification(type: str, message: str, details: Dict[str, Any] = None):
    payload = {"type": type, "message": message, "details": details or {}}
    logger.info(f"Broadcasting notification: {payload}")
    await manager.broadcast(json.dumps(payload))

async def get_admin_from_query_token(token: str = Query(None)):
    if not token:
        # Allow anonymous access for now if no token, or raise WebSocketDisconnect
        logger.warning("WebSocket connection attempt without token.")
        # raise WebSocketDisconnect(code=403, reason="Token required") 
        return {"token_user": "anonymous_websocket_user"} # Or handle as unauthenticated
    
    logger.info(f"WebSocket attempting connection with token: {token[:10]}...")
    # In a real app, you would validate the token and fetch the admin user.
    # from admin_api.auth.auth_utils import get_current_active_admin_from_token # Example
    # admin = await get_current_active_admin_from_token(token)
    # if not admin:
    #     raise WebSocketDisconnect(code=403, reason="Invalid token or admin not found")
    # return admin
    return {"token_user": "admin_placeholder_ws"} # Return a placeholder admin object

router = APIRouter(
    # prefix="/admin", 
    tags=["admin"]    
)


@router.post("/create", response_model=Admin)
async def create_admin(admin_data: AdminCreate):
    hashed_password = get_password_hash(admin_data.password)
    admin_doc = Admin(
        full_name=admin_data.full_name,
        email=admin_data.email,
        password=hashed_password
    )
    await admin_doc.insert()
    return admin_doc

@router.post("/login")
async def login(login_data: LoginRequest):
    admin = await Admin.find_one(Admin.email == login_data.email)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(login_data.password, admin.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token_data = {"sub": admin.email} 
    access_token = create_access_token(data=access_token_data)
    refresh_token_data = {"sub": admin.email}
    refresh_token = create_refresh_token(data=refresh_token_data)
    
    
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


@router.get("/get_total_users", response_model=TotalUsers)
async def get_total_users():
    total_users = await User.count()
    return {"total_users": total_users}


@router.get("/get_total_jobs", response_model=TotalJobs)
async def get_total_jobs():
    total_jobs = await Job.count()
    return {"total_jobs": total_jobs}


@router.get("/get_total_applicants", response_model=TotalApplicants)
async def get_total_applicants():
    total_applicants = await Applicant.count()
    return {"total_applicants": total_applicants}


@router.get("/get_all_applicants")
async def get_all_applicants():
    all_applicants = await Applicant.find_all().to_list()
    print(all_applicants)
    return all_applicants


@router.get("/get_applicant/{applicant_id}")
async def get_applicant(applicant_id: str):
    try:
        applicant = await Applicant.get(applicant_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Applicant not found")
        return applicant
    except Exception as e:
        print(f"Error fetching applicant {applicant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching applicant: {str(e)}")


@router.put("/update_verification_status/{applicant_id}")
async def update_verification_status(applicant_id: str, status: str, background_tasks: BackgroundTasks):
    applicant = await Applicant.get(applicant_id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    
    if status not in ["pending", "verified", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status value")
    
    previous_status = applicant.verification_status # Store previous status
    applicant.verification_status = status
    await applicant.save()
    
    applicant_name = f"{applicant.first_name} {applicant.last_name if applicant.last_name else ''}".strip()
    email_subject = ""
    email_body = ""

    if status == "rejected" and previous_status != "rejected":
        await broadcast_notification(
            type="verification_rejected", 
            message=f"Applicant {applicant.email} has been rejected.", 
            details={"applicantId": str(applicant.id), "status": "rejected"}
        )
        email_subject = "Update on Your Trabahanap Application"
        email_body = get_verification_email_body(name=applicant_name, status="rejected")
        background_tasks.add_task(send_email_async, email_subject, [applicant.email], email_body)
        return {"status": "success", "message": f"Applicant verification rejected"}
    
    if status == "verified" and previous_status != "verified":
        # Check if user already exists
        user = await User.find_one(User.email == applicant.email)
        if not user:
            # Create the "Created First Account" achievement
            # 1. Create the User document first
            user = User(
                first_name=applicant.first_name,
                middle_name=applicant.middle_name,
                last_name=applicant.last_name,
                suffix_name=applicant.suffix_name,
                gender=applicant.gender,
                birth_date=applicant.birth_date,
                age=applicant.age,
                email=applicant.email,
                password=applicant.password,
                profile_picture=applicant.profile_picture,
                barangay=applicant.barangay,
                street=applicant.street,
                house_number=applicant.house_number,
                user_type=applicant.user_type,
                id_validation_front_image=applicant.id_validation_front_image,
                id_validation_back_image=applicant.id_validation_back_image,
                id_type=applicant.id_type,
                jobs_done=0,
                joined_at=datetime.now(),
                verification_status="verified",
                verified_at=datetime.now(),
                achievements=[] # Initialize with empty list
            )
            await user.insert()

            # 2. Create the Achievement document, linking it to the new user
            first_account_achievement = Achievement(
                achievementName="Created First Account",
                description="Successfully created your first account",
                date_achieved=datetime.now(),
                job_required="None",
                required_job_count=0,
                user_id=user.id  # Link to the user
            )
            await first_account_achievement.insert()

            # 3. Update the User document with the Link to the new achievement
            user.achievements.append(first_account_achievement) # Beanie handles Link conversion
            await user.save()
            
            # NOTE: Further logic for specific user_types (e.g., job-seeker)
            # from MEMORY[9249b8ce-6e7a-4441-be4c-d4404feecf53] should be preserved
            # if it exists after this block. This change focuses on User creation.

        else: # User already exists
            user.verification_status = "verified"
            user.verified_at = datetime.now() # Update verified_at if re-verified
            # If user was created before this achievement system, they won't get this achievement retroactively
            # unless specific logic is added. This adheres to "when successfully creating the user".
            await user.save()
        
        email_subject = "Congratulations! Your Trabahanap Application is Approved!"
        email_body = get_verification_email_body(name=applicant_name, status="verified")
        background_tasks.add_task(send_email_async, email_subject, [applicant.email], email_body)

        # Handle JobSeeker specific logic
        if applicant.user_type.lower() == "job-seeker":
            db = ApplicantJobSeeker.get_motor_collection().database
            applicant_job_seeker_data = await db.applicant_jobseeker.find_one({"applicantId": str(applicant.id)})
            if not applicant_job_seeker_data: # Fallback for older records if applicantId was stored as ObjectId
                 applicant_job_seeker_data = await db.applicant_jobseeker.find_one({"applicantId": PydanticObjectId(applicant.id)})

            job_seeker_exists = await JobSeeker.find_one(JobSeeker.user_id == user.id)
            if not job_seeker_exists:
                job_seeker_payload = {
                    "user_id": user.id,
                    "joined_at": datetime.utcnow(),
                    "availability": True,
                    "hourly_rate": "0",
                    "credentials": None,
                    "job_tags": []
                }
                if applicant_job_seeker_data:
                    job_seeker_payload.update({
                        "joined_at": applicant_job_seeker_data.get('joinedAt', datetime.utcnow()),
                        "availability": applicant_job_seeker_data.get('availability', True),
                        "hourly_rate": applicant_job_seeker_data.get('hourlyRate', "0"),
                        "credentials": applicant_job_seeker_data.get('credentials'),
                        "job_tags": applicant_job_seeker_data.get('jobTags', [])
                    })
                
                job_seeker = JobSeeker(**job_seeker_payload)
                await job_seeker.insert()
                msg = "Job-seeker verification approved, user and job-seeker profiles created."
                if not applicant_job_seeker_data:
                    msg += " (Note: specific job seeker details like tags were not found from applicant_jobseeker collection)."
            else:
                msg = "Job-seeker verification approved. User profile updated. Job-seeker profile already exists."

            await broadcast_notification(
                type="verification_approved", 
                message=f"Applicant {applicant.email} (Job Seeker) has been verified.", 
                details={"applicantId": str(applicant.id), "status": "verified", "userType": "job-seeker"}
            )
            return {"status": "success", "message": msg}
        
        # For client or other non-job-seeker types
        await broadcast_notification(
            type="verification_approved", 
            message=f"Applicant {applicant.email} ({applicant.user_type}) has been verified.", 
            details={"applicantId": str(applicant.id), "status": "verified", "userType": applicant.user_type}
        )
        return {"status": "success", "message": f"{applicant.user_type.capitalize()} verification approved, user profile created/updated."}
    
    # Fallback for cases where status doesn't change or is just set to pending
    return {"status": "success", "message": f"Applicant status updated to {status}. No notification sent as status is '{status}' or unchanged."}

@router.get("/get_monthly_applications", response_model=MonthlyData)
async def get_monthly_applications():
    try:
        current_date = datetime.now()
        
        monthly_counts = [0] * 12
        
        all_applicants = await Applicant.find_all().to_list()
        print(f"Total applicants found: {len(all_applicants)}")
        
        for i in range(12):
            month = (current_date.month - i - 1) % 12 + 1
            year = current_date.year if current_date.month > i else current_date.year - 1
            
            start_date = datetime(year, month, 1, 0, 0, 0)
            
            if month == 12:
                end_date = datetime(year + 1, 1, 1, 0, 0, 0)
            else:
                end_date = datetime(year, month + 1, 1, 0, 0, 0)
            
            count = 0
            for applicant in all_applicants:
                if applicant.joined_at and start_date <= applicant.joined_at < end_date:
                    count += 1
            
            monthly_counts[month - 1] = count
        
        return {"monthly_data": monthly_counts}
        
    except Exception as e:
        print(f"Error getting monthly applications: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting monthly applications: {str(e)}")


@router.get("/get_monthly_users", response_model=MonthlyData)
async def get_monthly_users():
    try:
        current_date = datetime.now()
        
        monthly_counts = [0] * 12
        
        all_users = await User.find_all().to_list()
        print(f"Total users found: {len(all_users)}")
        
        for i in range(12):
            month = (current_date.month - i - 1) % 12 + 1
            year = current_date.year if current_date.month > i else current_date.year - 1
            
            start_date = datetime(year, month, 1, 0, 0, 0)
            
            if month == 12:
                end_date = datetime(year + 1, 1, 1, 0, 0, 0)
            else:
                end_date = datetime(year, month + 1, 1, 0, 0, 0)
            
            count = 0
            for user in all_users:
                if hasattr(user, 'verified_at') and user.verified_at and start_date <= user.verified_at < end_date:
                    count += 1
                    
            print(f"Month {month}/{year}: {count} verified users")
            
            monthly_counts[month - 1] = count
        
        return {"monthly_data": monthly_counts}
        
    except Exception as e:
        print(f"Error getting monthly users: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting monthly users: {str(e)}")


@router.get("/me", response_model=Admin)
async def read_admin_me(current_admin: Admin = Depends(get_current_active_admin)):
    return current_admin


# Helper functions to resolve display names for reports
async def _resolve_user_name(user_id_or_obj) -> Optional[str]:
    if not user_id_or_obj:
        return None
    try:
        user_doc = await User.get(user_id_or_obj)
        if user_doc:
            name_parts = [p for p in [user_doc.first_name, user_doc.middle_name, user_doc.last_name, user_doc.suffix_name] if p]
            full = " ".join(name_parts).strip()
            if full:
                return full
    except Exception:
        pass

    try:
        from bson import ObjectId
        db = User.get_motor_collection().database
        str_id = str(user_id_or_obj)
        query = [{"_id": str_id}]
        try:
            query.append({"_id": ObjectId(str_id)})
        except Exception:
            pass
        user_raw = await db["users"].find_one({"$or": query})
        if user_raw:
            fn = user_raw.get("firstName") or user_raw.get("first_name") or ""
            ln = user_raw.get("lastName") or user_raw.get("last_name") or ""
            full = f"{fn} {ln}".strip()
            if full:
                return full
    except Exception as e:
        logger.error(f"Error in _resolve_user_name: {e}")
    return None

async def resolve_reported_object_display_name(reported_object_id) -> str:
    if not reported_object_id:
        return "N/A"
    
    str_id = str(reported_object_id)

    # 1. Check if reported_object_id is a User
    user_name = await _resolve_user_name(reported_object_id)
    if user_name:
        return user_name

    # 2. Check if reported_object_id is a Community Post
    try:
        from bson import ObjectId
        db = User.get_motor_collection().database
        query = [{"_id": str_id}]
        try:
            query.append({"_id": ObjectId(str_id)})
        except Exception:
            pass
        post_raw = await db["post"].find_one({"$or": query})
        if post_raw:
            author_name = None
            if post_raw.get("clientId"):
                author_name = await _resolve_user_name(post_raw.get("clientId"))
            elif post_raw.get("jobSeekerId"):
                seeker_query = [{"_id": post_raw.get("jobSeekerId")}]
                if isinstance(post_raw.get("jobSeekerId"), str) and len(post_raw.get("jobSeekerId")) == 24:
                    try:
                        seeker_query.append({"_id": ObjectId(post_raw.get("jobSeekerId"))})
                    except Exception:
                        pass
                seeker_raw = await db["jobseekers"].find_one({"$or": seeker_query})
                if seeker_raw and seeker_raw.get("userId"):
                    author_name = await _resolve_user_name(seeker_raw.get("userId"))
            
            if author_name:
                return author_name
            
            snippet = post_raw.get("postContent", "")[:30]
            return f"Post: \"{snippet}...\"" if snippet else str_id
    except Exception as e:
        logger.error(f"Error resolving post: {e}")

    return f"Object ID: {str_id}"

# --- Report Management Endpoints --- 

@router.get("/api/reports/pending", response_model=List[ReportResponse], summary="Get Pending User Reports")
async def get_pending_reports(current_admin: Admin = Depends(get_current_active_admin)):
    pending_reports_docs = await ReportValidation.find(ReportValidation.status == "pending").to_list()
    
    response_reports = []
    for report_doc in pending_reports_docs:
        reporter_name_str = "N/A"
        reported_object_name_str = "N/A"

        if report_doc.reporter:
            r_name = await _resolve_user_name(report_doc.reporter)
            reporter_name_str = r_name if r_name else f"User ID: {str(report_doc.reporter)}"

        if report_doc.reported_object_id:
            reported_object_name_str = await resolve_reported_object_display_name(report_doc.reported_object_id)
        
        report_response_entry = ReportResponse(
            id=report_doc.id,
            reportedObjectId=report_doc.reported_object_id,
            reporter=report_doc.reporter,
            reason=report_doc.reason,
            status=report_doc.status,
            imageEvidence=report_doc.image_evidence,
            dateReported=report_doc.date_reported,
            dateApproved=report_doc.date_approved,
            reporterName=reporter_name_str,
            reportedObjectName=reported_object_name_str
        )
        response_reports.append(report_response_entry)
            
    return response_reports

@router.get("/api/reports/all", response_model=List[ReportResponse], summary="Get All User Reports")
async def get_all_reports(current_admin: Admin = Depends(get_current_active_admin)):
    all_report_docs = await ReportValidation.find_all().to_list()
    response_reports: List[ReportResponse] = []

    for report_doc in all_report_docs:
        reporter_name_str = "N/A"
        reported_object_name_str = "N/A"

        if report_doc.reporter:
            r_name = await _resolve_user_name(report_doc.reporter)
            reporter_name_str = r_name if r_name else f"User ID: {str(report_doc.reporter)}"

        if report_doc.reported_object_id:
            reported_object_name_str = await resolve_reported_object_display_name(report_doc.reported_object_id)
        
        report_response_entry = ReportResponse(
            id=report_doc.id,
            reportedObjectId=report_doc.reported_object_id,
            reporter=report_doc.reporter,
            reason=report_doc.reason,
            status=report_doc.status,
            imageEvidence=report_doc.image_evidence,
            dateReported=report_doc.date_reported,
            dateApproved=report_doc.date_approved,
            reporterName=reporter_name_str,
            reportedObjectName=reported_object_name_str
        )
        response_reports.append(report_response_entry)
            
    return response_reports

@router.put("/api/reports/{report_id}/approve", response_model=ReportValidation, summary="Approve a User Report")
async def approve_report(
    report_id: PydanticObjectId, 
    background_tasks: BackgroundTasks, 
    action: Optional[str] = Query("none"),
    days: int = Query(7),
    current_admin: Admin = Depends(get_current_active_admin)
):
    report_to_approve = await ReportValidation.get(report_id)

    if not report_to_approve:
        logger.error(f"Approve_report: Report with id {report_id} not found by admin {current_admin.email}")
        raise HTTPException(status_code=404, detail=f"Report with id {report_id} not found")

    if report_to_approve.status != "pending":
        logger.warning(f"Approve_report: Report {report_id} already processed. Status: {report_to_approve.status}. Attempt by admin {current_admin.email}")
        raise HTTPException(status_code=400, detail=f"Report {report_id} already processed. Status: {report_to_approve.status}")

    report_to_approve.status = "warning" if action == "warn" else "approved"
    report_to_approve.date_approved = datetime.utcnow()
    await report_to_approve.save()
    logger.info(f"Report {report_id} processed with status {report_to_approve.status} by admin {current_admin.email}")

    final_report_entry = FinalReport(
        original_report_id=str(report_to_approve.id), 
        reported_object_id=str(report_to_approve.reported_object_id), 
        reporter=str(report_to_approve.reporter), 
        reason=report_to_approve.reason,
        date_reported=report_to_approve.date_reported,
        date_approved=report_to_approve.date_approved 
    )
    await final_report_entry.insert()

    # Execute sanction on reported user if requested
    if action == "ban":
        try:
            await ban_user(str(report_to_approve.reported_object_id), reason=report_to_approve.reason, background_tasks=background_tasks, current_admin=current_admin)
        except Exception as e:
            logger.error(f"Failed to ban reported user: {e}")
    elif action == "suspend":
        try:
            await suspend_user(str(report_to_approve.reported_object_id), days=days, reason=report_to_approve.reason, background_tasks=background_tasks, current_admin=current_admin)
        except Exception as e:
            logger.error(f"Failed to suspend reported user: {e}")
    elif action == "warn":
        reported_user = await User.get(report_to_approve.reported_object_id)
        if reported_user and reported_user.email:
            warn_name = f"{reported_user.first_name} {reported_user.last_name or ''}".strip()
            warn_body = f"""
            <p>Dear {warn_name},</p>
            <p>This is an <strong>Official Warning</strong> regarding a report submitted about your activity on Trabahanap.</p>
            <p>Please review our community guidelines to ensure all interactions remain safe and respectful.</p>
            <p>Further policy violations may result in account suspension or a permanent ban.</p>
            <p>Sincerely,<br>The Trabahanap Team</p>
            """
            background_tasks.add_task(send_email_async, "Official Warning - Trabahanap Community Guidelines", [reported_user.email], warn_body)

    # Send email to REPORTER
    reporter_user = await User.get(report_to_approve.reporter) 
    if reporter_user and reporter_user.email:
        reporter_name = f"{reporter_user.first_name} {reporter_user.last_name or ''}".strip()
        email_subject_to_reporter = "Update on Your Report - Trabahanap"
        action_desc = "account banned" if action == "ban" else f"account suspended for {days} days" if action == "suspend" else "an official warning issued" if action == "warn" else "action taken"
        email_body_to_reporter = get_report_email_body(
            reporter_name=reporter_name,
            report_status="approved",
            reported_item_info=f"Report regarding {report_to_approve.reported_object_id}",
            reason=f"Our team reviewed your report and took the following action: {action_desc}."
        )
        background_tasks.add_task(send_email_async, email_subject_to_reporter, [reporter_user.email], email_body_to_reporter)

    await broadcast_notification(
        type="report_approved", 
        message=f"Report ID {str(report_to_approve.id)} has been processed.", 
        details={"reportId": str(report_to_approve.id), "status": report_to_approve.status, "action": action}
    )

    return report_to_approve

@router.put("/api/reports/{report_id}/reject", response_model=ReportValidation, summary="Reject a User Report")
async def reject_report(report_id: PydanticObjectId, background_tasks: BackgroundTasks, current_admin: Admin = Depends(get_current_active_admin)):
    report_to_reject = await ReportValidation.get(report_id)

    if not report_to_reject:
        logger.error(f"Reject_report: Report with id {report_id} not found by admin {current_admin.email}")
        raise HTTPException(status_code=404, detail=f"Report with id {report_id} not found")

    if report_to_reject.status != "pending":
        logger.warning(f"Reject_report: Report {report_id} already processed. Status: {report_to_reject.status}. Attempt by admin {current_admin.email}")
        raise HTTPException(status_code=400, detail=f"Report {report_id} already processed. Status: {report_to_reject.status}")

    report_to_reject.status = "rejected"
    await report_to_reject.save()
    logger.info(f"Report {report_id} rejected by admin {current_admin.email}")

    # Send email to reporter
    reporter_user = await User.get(report_to_reject.reporter) 
    if reporter_user:
        if reporter_user.email:
            reporter_name = f"{reporter_user.first_name} {reporter_user.last_name if reporter_user.last_name else ''}".strip()
            email_subject = "Update on Your Recent Report to Trabahanap"
            email_body = get_report_email_body(
                reporter_name=reporter_name,
                report_status="rejected",
                reported_item_info=f"Report ID {str(report_to_reject.id)} concerning object ID {str(report_to_reject.reported_object_id)}"
            )
            background_tasks.add_task(send_email_async, email_subject, [reporter_user.email], email_body)
        else:
            logger.warning(f"Reporter user {reporter_user.id} found, but no email address is present. Cannot send rejection notification for report {report_id}.")
    else:
        logger.warning(f"Reporter user with ID {report_to_reject.reporter} not found. Cannot send rejection notification for report {report_id}.")

    await broadcast_notification(
        type="report_rejected", 
        message=f"Report ID {str(report_to_reject.id)} has been rejected.", 
        details={"reportId": str(report_to_reject.id), "status": "rejected"}
    )

    return report_to_reject

# --- User Management (Ban / Suspend / Unban) Endpoints ---
@router.put("/api/users/{user_id}/ban", summary="Ban a User")
async def ban_user(
    user_id: str,
    reason: Optional[str] = Query("Violation of Terms of Service"),
    background_tasks: BackgroundTasks = None,
    current_admin: Admin = Depends(get_current_active_admin)
):
    try:
        target_email = None
        user_name = "User"
        user = await User.get(user_id)
        if not user:
            try:
                user = await User.find_one(User.id == PydanticObjectId(user_id))
            except Exception:
                user = None
        
        applicant = await Applicant.get(user_id)
        if not applicant:
            try:
                applicant = await Applicant.find_one(Applicant.id == PydanticObjectId(user_id))
            except Exception:
                applicant = None

        if user:
            target_email = user.email
            user_name = f"{user.first_name} {user.last_name or ''}".strip()
            user.account_status = "banned"
            user.ban_reason = reason
            await user.save()

        if applicant:
            target_email = target_email or applicant.email
            if user_name == "User":
                user_name = f"{applicant.first_name} {applicant.last_name or ''}".strip()
            applicant.account_status = "banned"
            applicant.ban_reason = reason
            await applicant.save()

        if target_email:
            if not user:
                user = await User.find_one(User.email == target_email)
                if user:
                    user.account_status = "banned"
                    user.ban_reason = reason
                    await user.save()
            if not applicant:
                applicant = await Applicant.find_one(Applicant.email == target_email)
                if applicant:
                    applicant.account_status = "banned"
                    applicant.ban_reason = reason
                    await applicant.save()

        if not user and not applicant:
            raise HTTPException(status_code=404, detail="User or Applicant not found")

        # Directly sync native Mongo fields `accountStatus`, `isBanned`, `banReason`
        if target_email:
            db_user = User.get_motor_collection().database
            await db_user.users.update_many(
                {"emailAddress": target_email},
                {"$set": {"accountStatus": "banned", "isBanned": True, "banReason": reason}}
            )
            await db_user.applicants.update_many(
                {"emailAddress": target_email},
                {"$set": {"accountStatus": "banned", "isBanned": True, "banReason": reason}}
            )
            if background_tasks:
                email_body = get_sanction_email_body(user_name=user_name, action_type="banned")
                background_tasks.add_task(send_email_async, "Account Security Update - Trabahanap", [target_email], email_body)

        await broadcast_notification(
            type="user_banned",
            message=f"User {target_email} has been banned.",
            details={"userId": user_id, "reason": reason}
        )
        return {"status": "success", "message": f"User {target_email} has been banned", "accountStatus": "banned"}
    except Exception as e:
        logger.error(f"Error banning user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error banning user: {str(e)}")

@router.put("/api/users/{user_id}/suspend", summary="Suspend a User")
async def suspend_user(
    user_id: str,
    days: int = Query(7, ge=1, le=365),
    reason: Optional[str] = Query("Temporary suspension due to report"),
    background_tasks: BackgroundTasks = None,
    current_admin: Admin = Depends(get_current_active_admin)
):
    try:
        suspended_until = datetime.utcnow() + timedelta(days=days)
        target_email = None
        user_name = "User"

        user = await User.get(user_id)
        if not user:
            try:
                user = await User.find_one(User.id == PydanticObjectId(user_id))
            except Exception:
                user = None

        applicant = await Applicant.get(user_id)
        if not applicant:
            try:
                applicant = await Applicant.find_one(Applicant.id == PydanticObjectId(user_id))
            except Exception:
                applicant = None

        if user:
            target_email = user.email
            user_name = f"{user.first_name} {user.last_name or ''}".strip()
            user.account_status = "suspended"
            user.suspend_reason = reason
            user.suspended_until = suspended_until
            await user.save()

        if applicant:
            target_email = target_email or applicant.email
            if user_name == "User":
                user_name = f"{applicant.first_name} {applicant.last_name or ''}".strip()
            applicant.account_status = "suspended"
            applicant.suspend_reason = reason
            applicant.suspended_until = suspended_until
            await applicant.save()

        if target_email:
            if not user:
                user = await User.find_one(User.email == target_email)
                if user:
                    user.account_status = "suspended"
                    user.suspend_reason = reason
                    user.suspended_until = suspended_until
                    await user.save()
            if not applicant:
                applicant = await Applicant.find_one(Applicant.email == target_email)
                if applicant:
                    applicant.account_status = "suspended"
                    applicant.suspend_reason = reason
                    applicant.suspended_until = suspended_until
                    await applicant.save()

        if not user and not applicant:
            raise HTTPException(status_code=404, detail="User or Applicant not found")

        # Directly sync native Mongo fields `accountStatus`, `isSuspended`, `suspendReason`, `suspendedUntil`
        if target_email:
            db_user = User.get_motor_collection().database
            await db_user.users.update_many(
                {"emailAddress": target_email},
                {"$set": {"accountStatus": "suspended", "isSuspended": True, "suspendReason": reason, "suspendedUntil": suspended_until}}
            )
            await db_user.applicants.update_many(
                {"emailAddress": target_email},
                {"$set": {"accountStatus": "suspended", "isSuspended": True, "suspendReason": reason, "suspendedUntil": suspended_until}}
            )
            if background_tasks:
                email_body = get_sanction_email_body(user_name=user_name, action_type="suspended", days=days)
                background_tasks.add_task(send_email_async, "Account Security Update - Trabahanap", [target_email], email_body)

        await broadcast_notification(
            type="user_suspended",
            message=f"User {target_email} suspended for {days} days.",
            details={"userId": user_id, "suspendedUntil": suspended_until.isoformat(), "reason": reason}
        )
        return {
            "status": "success",
            "message": f"User {target_email} suspended for {days} days",
            "accountStatus": "suspended",
            "suspendedUntil": suspended_until
        }
    except Exception as e:
        logger.error(f"Error suspending user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error suspending user: {str(e)}")

@router.put("/api/users/{user_id}/unban", summary="Unban / Unsuspend a User")
async def unban_user(
    user_id: str,
    background_tasks: BackgroundTasks = None,
    current_admin: Admin = Depends(get_current_active_admin)
):
    try:
        target_email = None
        user_name = "User"

        user = await User.get(user_id)
        if not user:
            try:
                user = await User.find_one(User.id == PydanticObjectId(user_id))
            except Exception:
                user = None

        applicant = await Applicant.get(user_id)
        if not applicant:
            try:
                applicant = await Applicant.find_one(Applicant.id == PydanticObjectId(user_id))
            except Exception:
                applicant = None

        if user:
            target_email = user.email
            user_name = f"{user.first_name} {user.last_name or ''}".strip()
            user.account_status = "active"
            user.ban_reason = None
            user.suspend_reason = None
            user.suspended_until = None
            await user.save()

        if applicant:
            target_email = target_email or applicant.email
            if user_name == "User":
                user_name = f"{applicant.first_name} {applicant.last_name or ''}".strip()
            applicant.account_status = "active"
            applicant.ban_reason = None
            applicant.suspend_reason = None
            applicant.suspended_until = None
            await applicant.save()

        if target_email:
            db_user = User.get_motor_collection().database
            await db_user.users.update_many(
                {"emailAddress": target_email},
                {"$set": {"accountStatus": "active", "isBanned": False, "isSuspended": False}, "$unset": {"banReason": "", "suspendReason": "", "suspendedUntil": ""}}
            )
            await db_user.applicants.update_many(
                {"emailAddress": target_email},
                {"$set": {"accountStatus": "active", "isBanned": False, "isSuspended": False}, "$unset": {"banReason": "", "suspendReason": "", "suspendedUntil": ""}}
            )
            if background_tasks:
                email_body = get_sanction_email_body(user_name=user_name, action_type="active")
                background_tasks.add_task(send_email_async, "Account Restored - Trabahanap", [target_email], email_body)

        if not user and not applicant:
            raise HTTPException(status_code=404, detail="User or Applicant not found")

        await broadcast_notification(
            type="user_unbanned",
            message=f"User {target_email} status reset to active.",
            details={"userId": user_id}
        )
        return {"status": "success", "message": f"User {target_email} is now active", "accountStatus": "active"}
    except Exception as e:
        logger.error(f"Error unbanning user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error unbanning user: {str(e)}")

# --- Job Request Endpoints ---
@router.get("/api/job_requests/", response_model=List[Job])
async def get_all_job_requests(
    current_admin: Admin = Depends(get_current_active_admin)
):
    jobs = await Job.find_all().to_list()
    return jobs

def get_plain_rate(budget: Any) -> int:
    try:
        b_num = float(str(budget or 0).replace('₱', '').replace(',', '').strip())
        return int(round(b_num))
    except Exception:
        return 0

@router.get("/api/job_requests/export/csv", summary="Export Job Requests as CSV for PESO")
async def export_job_requests_csv(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    jobs = await Job.find_all().to_list()
    
    # Filter by category if provided
    if category and category.strip() and category.lower() != "all":
        jobs = [j for j in jobs if (j.category or "").lower() == category.lower()]
        
    # Filter by status if provided
    if status and status.strip() and status.lower() != "all":
        jobs = [j for j in jobs if (j.job_status.value if hasattr(j.job_status, 'value') else str(j.job_status)).lower() == status.lower()]
        
    # Filter by date range if provided
    if start_date:
        try:
            sd = datetime.strptime(start_date, "%Y-%m-%d")
            jobs = [j for j in jobs if j.date_posted and j.date_posted >= sd]
        except Exception:
            pass
            
    if end_date:
        try:
            ed = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            jobs = [j for j in jobs if j.date_posted and j.date_posted <= ed]
        except Exception:
            pass

    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write PESO-ready CSV Header
    writer.writerow([
        "Job Reference ID", "Job Title", "Category", "Employer Name", "Employer Email", 
        "Location / Barangay", "Rate (Depends on duration)", "Job Duration", "Job Status", "Applicant Count", "Date Posted"
    ])
    
    for job in jobs:
        client_name = "N/A"
        client_email = "N/A"
        if job.client_id:
            try:
                client_user = await User.get(job.client_id)
                if client_user:
                    names = [client_user.first_name, client_user.last_name]
                    client_name = " ".join([n for n in names if n]).strip() or str(job.client_id)
                    client_email = client_user.email or "N/A"
            except Exception:
                client_name = str(job.client_id)

        plain_rate = get_plain_rate(job.budget)

        writer.writerow([
            str(job.id),
            job.job_title,
            job.category,
            client_name,
            client_email,
            job.job_location,
            plain_rate,
            job.job_duration or "",
            job.job_status.value if hasattr(job.job_status, 'value') else str(job.job_status),
            job.applicant_count,
            job.date_posted.strftime("%Y-%m-%d %H:%M:%S") if job.date_posted else ""
        ])
    
    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=peso_job_requests_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

@router.get("/api/job_requests/{job_id}", response_model=Job)
async def get_job_request_by_id(
    job_id: PydanticObjectId,
    current_admin: Admin = Depends(get_current_active_admin)
):
    job = await Job.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job request with ID {job_id} not found")
    return job
# --- End Job Request Endpoints ---


@router.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket, admin: dict = Depends(get_admin_from_query_token)):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text() # Keep connection alive, listen for client messages
            logger.info(f"Received message from {websocket.client} on /ws/notifications: {data}")
            # Optionally process client messages here
    except WebSocketDisconnect as e:
        logger.info(f"WebSocket {websocket.client} disconnected from /ws/notifications with code {e.code}: {e.reason}")
    except Exception as e:
        logger.error(f"Unexpected error with WebSocket {websocket.client} on /ws/notifications: {e}")
    finally:
        manager.disconnect(websocket)
