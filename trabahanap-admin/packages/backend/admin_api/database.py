import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from admin_api.models.documents import Admin, User, Job, Applicant, ApplicantJobSeeker, JobSeeker, ReportValidation, FinalReport, Achievement

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongodb:27017/ediskarte?replicaSet=rs0&directConnection=true")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "ediskarte")

async def init_db():
    client = AsyncIOMotorClient(MONGO_URI)
    await init_beanie(database=client[MONGO_DB_NAME], document_models=[Admin, User, Job, Applicant, ApplicantJobSeeker, JobSeeker, ReportValidation, FinalReport, Achievement])
