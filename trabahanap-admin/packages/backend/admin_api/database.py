import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from admin_api.models.documents import Admin, User, Job, Applicant, ApplicantJobSeeker, JobSeeker, ReportValidation, FinalReport, Achievement, JobTagItem

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongodb:27017/ediskarte")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "ediskarte")

async def init_db():
    client = AsyncIOMotorClient(MONGO_URI)
    db_name = MONGO_DB_NAME or "ediskarte"
    db = client.get_database(db_name)
    await init_beanie(database=db, document_models=[Admin, User, Job, Applicant, ApplicantJobSeeker, JobSeeker, ReportValidation, FinalReport, Achievement, JobTagItem])
