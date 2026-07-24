import asyncio
from admin_api.database import init_db
from admin_api.models.documents import Admin, User, Applicant

async def main():
    await init_db()
    admin_count = await Admin.count()
    user_count = await User.count()
    applicant_count = await Applicant.count()
    print(f"DATABASE CHECK STATUS: SUCCESS")
    print(f"Total Admins: {admin_count}")
    print(f"Total Users: {user_count}")
    print(f"Total Applicants: {applicant_count}")

if __name__ == "__main__":
    asyncio.run(main())
