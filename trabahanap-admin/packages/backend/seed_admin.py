import asyncio
from admin_api.database import init_db
from admin_api.models.documents import Admin
from admin_api.utils.security import get_password_hash

async def main():
    await init_db()
    email = "admin@ediskarte.com"
    existing = await Admin.find_one(Admin.email == email)
    if existing:
        print(f"Admin {email} already exists!")
        existing.password = get_password_hash("adminpassword123")
        await existing.save()
        print("Updated existing admin password to adminpassword123")
    else:
        hashed = get_password_hash("adminpassword123")
        adm = Admin(full_name="Super Admin", email=email, password=hashed)
        await adm.insert()
        print(f"Successfully created admin account: {email} / adminpassword123")

if __name__ == "__main__":
    asyncio.run(main())
