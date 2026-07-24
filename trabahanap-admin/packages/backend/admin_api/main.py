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
