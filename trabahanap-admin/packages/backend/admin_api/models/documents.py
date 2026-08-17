from pydantic import BaseModel, EmailStr, Field, field_validator
from beanie import Document, Link, PydanticObjectId
from beanie.odm.fields import PydanticObjectId
from datetime import datetime
import enum
from typing import List, Optional, Any

class Admin(Document):
   full_name: str
   email: EmailStr = Field(index=True, unique=True)
   password: str
   is_admin: bool = True
   createdAt: datetime = Field(default_factory=datetime.now)
   
   class Settings:
       name = "admins" 


class AdminCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    

class LoginRequest(BaseModel):
    email: EmailStr
    password: str   


class Achievement(Document):
    achievement_name: str = Field(..., alias="achievementName")
    description: str
    date_achieved: datetime = Field(default_factory=datetime.now, alias="dateAchieved")
    job_required: Optional[str] = Field(default="None", alias="jobRequired")
    required_job_count: Optional[int] = Field(default=0, alias="requiredJobCount")
    user_id: PydanticObjectId = Field(..., alias="userId") # Store as plain ObjectId

    class Settings:
        name = "achievements"

    class Config:
        populate_by_name = True


class User(Document):
    achievements: List[Link["Achievement"]] = Field(default_factory=list)
    first_name: str = Field(alias="firstName")
    middle_name: str | None = Field(default=None, alias="middleName")
    last_name: str = Field(alias="lastName")
    suffix_name: str | None = Field(default=None, alias="suffixName")
    gender: str
    birth_date: datetime = Field(alias="birthday")
    age: int
    email: EmailStr = Field(alias="emailAddress")
    password: str
    profile_picture: str | None = Field(default=None, alias="profileImage")
    barangay: str
    street: str
    house_number: str | None = Field(default=None, alias="houseNumber")
    user_type: str = Field(alias="userType")
    id_validation_front_image: str | None = Field(default=None, alias="idValidationFrontImage")
    id_validation_back_image: str | None = Field(default=None, alias="idValidationBackImage")
    id_type: str | None = Field(default=None, alias="idType")
    jobs_done: int = Field(default=0, alias="jobsDone")
    joined_at: datetime = Field(alias="joinedAt")
    verification_status: str = Field(alias="verificationStatus")
    verified_at: datetime | None = Field(default=None, alias="verifiedAt") # Set when verified
    account_status: str = Field(default="active", alias="accountStatus") # "active", "suspended", "banned"
    ban_reason: str | None = Field(default=None, alias="banReason")
    suspend_reason: str | None = Field(default=None, alias="suspendReason")
    suspended_until: datetime | None = Field(default=None, alias="suspendedUntil")

    class Settings:
        name = "users"


class TotalUsers(BaseModel):
    total_users: int

class JobStatusEnum(str, enum.Enum):
    OPEN = "open"
    PENDING = "pending"  # e.g., awaiting applicant, client review
    COMPLETED = "completed"
    REVIEWED = "reviewed" # e.g., after completion, client has reviewed

class Job(Document):
    client_id: PydanticObjectId = Field(alias="clientId")
    applicant_count: int = Field(default=0, alias="applicantCount")

    job_title: str = Field(alias="jobTitle")
    job_description: str = Field(alias="jobDescription")
    category: str
    job_location: str = Field(alias="jobLocation")
    job_status: JobStatusEnum = Field(alias="jobStatus") 
    budget: str 
    job_duration: str = Field(alias="jobDuration") 
    job_image: List[str] = Field(default_factory=list, alias="jobImage") 
    date_posted: datetime = Field(alias="datePosted")

    accepted_at: Optional[datetime] = Field(default=None, alias="acceptedAt")
    completed_at: Optional[datetime] = Field(default=None, alias="completedAt")
    verified_at: Optional[datetime] = Field(default=None, alias="verifiedAt") 

    job_rating: Optional[int] = Field(default=None, alias="jobRating")
    job_review: Optional[str] = Field(default=None, alias="jobReview")
    job_seeker_id: Optional[PydanticObjectId] = Field(default=None, alias="jobSeekerId") 
    offer: Optional[str] = Field(default=None) 

    class Settings:
        name = "jobrequest"


class TotalJobs(BaseModel):
    total_jobs: int


class Applicant(Document):
    first_name: str | None = Field(default="N/A", alias="firstName")
    middle_name: str | None = Field(default=None, alias="middleName")
    last_name: str | None = Field(default="N/A", alias="lastName")
    suffix_name: str | None = Field(default=None, alias="suffixName")
    gender: str | None = Field(default="unspecified")
    birth_date: datetime | None = Field(default_factory=datetime.utcnow, alias="birthday")
    age: int | None = Field(default=0)
    email: str | None = Field(default="unknown@example.com", alias="emailAddress")
    password: str | None = Field(default="")
    phone_number: str | None = Field(default=None, alias="phoneNumber")
    profile_picture: str | None = Field(default=None, alias="profileImage")
    bio: str | None = Field(default=None)
    barangay: str | None = Field(default="N/A")
    street: str | None = Field(default="N/A")
    house_number: str | None = Field(default=None, alias="houseNumber")
    user_type: str | None = Field(default="client", alias="userType")
    id_validation_front_image: str | None = Field(default=None, alias="idValidationFrontImage")
    id_validation_back_image: str | None = Field(default=None, alias="idValidationBackImage")
    id_type: str | None = Field(default=None, alias="idType")
    jobs_done: int = Field(default=0, alias="jobsDone")
    joined_at: datetime | None = Field(default_factory=datetime.utcnow, alias="joinedAt")
    verification_status: str | None = Field(default="pending", alias="verificationStatus")
    account_status: str = Field(default="active", alias="accountStatus")
    ban_reason: str | None = Field(default=None, alias="banReason")
    suspend_reason: str | None = Field(default=None, alias="suspendReason")
    suspended_until: datetime | None = Field(default=None, alias="suspendedUntil")

    class Settings:
        name = "applicants"


class TotalApplicants(BaseModel):
    total_applicants: int


class MonthlyData(BaseModel):
    monthly_data: list[int]


class JobTag(str, enum.Enum):
    PLUMBING = "plumbing"
    ELECTRICAL_REPAIRS = "electricalRepairs"
    CARPENTRY = "carpentry"
    ROOF_REPAIR = "roofRepair"
    PAINTING = "paintingServices"
    WELDING = "welding"
    GLASS_INSTALLATION = "glassInstallation"
    AIRCON_REPAIR = "airconRepairAndCleaning"
    APPLIANCE_REPAIR = "applianceRepair"
    PEST_CONTROL = "pestControlServices"
    AUTO_MECHANIC = "autoMechanic"
    CAR_WASH = "carWash"
    MOTORCYCLE_REPAIR = "motorcycleRepair"
    CAR_AIRCON = "carAirconRepair"
    WINDOW_TINTING = "windowTinting"
    CAREGIVER = "caregiver"
    PERSONAL_DRIVER = "personalDriver"
    MASSAGE = "massageTherapy"
    PET_GROOMING = "petGroomingAndPetCare"
    HOME_CLEANING = "homeCleaningServices"
    LAUNDRY = "laundryServices"
    GARDENING = "gardening"
    OTHERS = "others"


class ApplicantJobSeeker(Document):
    applicantId: str | None = Field(default=None)
    joinedAt: datetime | None = Field(default=None)
    availability: bool = Field(default=True)
    hourlyRate: str = Field(default="0")
    credentials: Any | None = Field(default=None)
    jobTags: list[str] = Field(default=[])
    
    class Settings:
        name = "applicant_jobseeker"


class JobSeeker(Document):
    user_id: PydanticObjectId = Field(alias="userId")
    joined_at: datetime = Field(default_factory=datetime.utcnow, alias="joinedAt")
    availability: bool = Field(default=True)
    hourly_rate: str = Field(default="0", alias="hourlyRate")
    credentials: Any | None = Field(default=None)
    rate: float | None = Field(default=None)
    job_tags: list[str] = Field(default=[], alias="jobTags")
    
    class Settings:
        name = "jobseekers"


class ReportValidation(Document):
    reported_object_id: PydanticObjectId | str = Field(alias="reportedObjectId")
    reporter: PydanticObjectId | str
    reason: str
    status: str = Field(default="pending")  # e.g., pending, approved, rejected, warning
    image_evidence: Optional[str] = Field(default=None, alias="imageEvidence")
    date_reported: datetime = Field(default_factory=datetime.utcnow, alias="dateReported")
    date_approved: Optional[datetime] = Field(default=None, alias="dateApproved")

    class Settings:
        name = "report_validation"


class FinalReport(Document):
    original_report_id: str = Field(alias="originalReportId")
    reported_object_id: str = Field(alias="reportedObjectId")
    reporter: str
    reason: str
    date_reported: datetime = Field(alias="dateReported")
    date_approved: datetime = Field(default_factory=datetime.utcnow, alias="dateApproved")

    class Settings:
        name = "final_reports"


class ReportResponse(BaseModel):
    id: str 
    reported_object_id: str = Field(alias="reportedObjectId") 
    reporter: str 
    reason: str
    status: str
    image_evidence: Optional[str] = Field(default=None, alias="imageEvidence")
    date_reported: datetime = Field(alias="dateReported")
    date_approved: Optional[datetime] = Field(default=None, alias="dateApproved")
    reporter_name: Optional[str] = Field(default=None, alias="reporterName") 
    reported_object_name: Optional[str] = Field(default=None, alias="reportedObjectName")

    @field_validator('id', 'reported_object_id', 'reporter', mode='before')
    @classmethod
    def convert_ids_to_str(cls, v):
        if isinstance(v, PydanticObjectId):
            return str(v)
        if v is None:
            return "MISSING_ID"
        if isinstance(v, dict) and not v:  
            return "INVALID_ID_EMPTY_OBJECT" 
        return str(v) 

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat() if dt else None,
        }


class JobTagItem(Document):
    tag_id: str = Field(alias="tagId")
    label: str
    category: str = Field(default="General")
    description: Optional[str] = None
    is_active: bool = Field(default=True, alias="isActive")
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")

    class Settings:
        name = "job_tags"