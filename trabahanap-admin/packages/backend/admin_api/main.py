from fastapi import FastAPI
from contextlib import asynccontextmanager
import asyncio
from admin_api.database import init_db
from admin_api.routers import crud
from admin_api.utils.polling_service import start_polling
from admin_api.routers.crud import broadcast_notification
from fastapi.middleware.cors import CORSMiddleware


polling_task = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global polling_task
    await init_db()
    
    # Auto-seed default admin if no admin exists
    from admin_api.models.documents import Admin, JobTagItem
    from admin_api.utils.security import get_password_hash
    admin_count = await Admin.count()
    if admin_count == 0:
        default_email = "admin@ediskarte.com"
        hashed = get_password_hash("adminpassword123")
        adm = Admin(full_name="Super Admin", email=default_email, password=hashed)
        await adm.insert()
        print(f"Auto-created default admin account: {default_email} / adminpassword123")

    # Auto-seed default job tags if none exist
    tags_count = await JobTagItem.count()
    if tags_count == 0:
        default_tags = [
            {"tagId": "plumbing", "label": "Plumbing", "category": "Home Repairs & Construction", "description": "Pipe repair, installation, and drainage services"},
            {"tagId": "electricalRepairs", "label": "Electrical Repairs", "category": "Home Repairs & Construction", "description": "Wiring, fixture installation, and breaker repairs"},
            {"tagId": "carpentry", "label": "Carpentry", "category": "Home Repairs & Construction", "description": "Furniture repair, woodworking, and framing"},
            {"tagId": "roofRepair", "label": "Roof Repair", "category": "Home Repairs & Construction", "description": "Roof leak repair and sheet replacement"},
            {"tagId": "paintingServices", "label": "Painting Services", "category": "Home Repairs & Construction", "description": "Interior and exterior painting"},
            {"tagId": "welding", "label": "Welding", "category": "Home Repairs & Construction", "description": "Metal fabrication and gate welding"},
            {"tagId": "glassInstallation", "label": "Glass Installation", "category": "Home Repairs & Construction", "description": "Window glass and aluminum fitting"},
            {"tagId": "airconRepairAndCleaning", "label": "Aircon Repair & Cleaning", "category": "Appliance & HVAC", "description": "Air conditioner servicing, re-freon, and cleaning"},
            {"tagId": "applianceRepair", "label": "Appliance Repair", "category": "Appliance & HVAC", "description": "Refrigerator, washing machine, and stove repair"},
            {"tagId": "pestControlServices", "label": "Pest Control", "category": "Cleaning & Maintenance", "description": "Termite treatment and pest extermination"},
            {"tagId": "autoMechanic", "label": "Auto Mechanic", "category": "Automotive Services", "description": "Engine diagnostics and car repairs"},
            {"tagId": "carWash", "label": "Car Wash", "category": "Automotive Services", "description": "Car detailing and vehicle washing"},
            {"tagId": "motorcycleRepair", "label": "Motorcycle Repair", "category": "Automotive Services", "description": "Motorcycle tune-up and chain replacement"},
            {"tagId": "carAirconRepair", "label": "Car Aircon Repair", "category": "Automotive Services", "description": "Vehicle AC freon refill and compressor repair"},
            {"tagId": "windowTinting", "label": "Window Tinting", "category": "Automotive Services", "description": "Vehicle and home window film tinting"},
            {"tagId": "caregiver", "label": "Caregiver", "category": "Personal & Care Services", "description": "Elderly and patient caregiving"},
            {"tagId": "personalDriver", "label": "Personal Driver", "category": "Personal & Care Services", "description": "Private driving and vehicle transport"},
            {"tagId": "massageTherapy", "label": "Massage Therapy", "category": "Personal & Care Services", "description": "Home service body massage and therapy"},
            {"tagId": "petGroomingAndPetCare", "label": "Pet Grooming & Care", "category": "Personal & Care Services", "description": "Pet bath, haircut, and dog walking"},
            {"tagId": "homeCleaningServices", "label": "Home Cleaning", "category": "Cleaning & Maintenance", "description": "Deep house cleaning and sanitation"},
            {"tagId": "laundryServices", "label": "Laundry Services", "category": "Cleaning & Maintenance", "description": "Washing, folding, and ironing"},
            {"tagId": "gardening", "label": "Gardening", "category": "Cleaning & Maintenance", "description": "Lawn mowing, plant care, and landscaping"},
            {"tagId": "others", "label": "Others / Custom Skills", "category": "General", "description": "Specialized and custom job skills"},
        ]
        for t in default_tags:
            item = JobTagItem(
                tagId=t["tagId"],
                label=t["label"],
                category=t["category"],
                description=t["description"],
                isActive=True
            )
            await item.insert()
        print(f"Auto-seeded {len(default_tags)} default job tags.")

    polling_task = asyncio.create_task(start_polling(broadcast_notification, interval_seconds=10))
    try:
        yield
    finally:
        if polling_task:
            polling_task.cancel()
            try:
                await polling_task
            except asyncio.CancelledError:
                print("Polling task cancelled successfully.")


app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://localhost:8000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(crud.router, prefix="/admin", tags=["admin"])
