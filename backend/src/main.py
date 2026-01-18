from typing import AsyncIterator
from fastapi import FastAPI
from fastapi.concurrency import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError
from pydantic import ValidationError
import uvicorn

from src.users.router import router as users_router
from src.clients.router import router as clients_router
from src.properties.router import router as property_router
from src.appointment.router import router as appointment_router
from src.documents.router import router as documents_router
from src.deals.router import router as deals_router
from fastapi_pagination import add_pagination
from src.cache import cache_manager

from src.exceptions import (
    AppException,
    app_exception_handler,
    http_exception_handler,
    sqlalchemy_exception_handler,
    validation_exception_handler,
    general_exception_handler
)
from fastapi.exceptions import HTTPException

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    await cache_manager.connect()
    yield
    await cache_manager.close()

app = FastAPI(title="Real Estate Agency API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
app.add_exception_handler(ValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

app.include_router(router=users_router)
app.include_router(router=clients_router)
app.include_router(router=property_router)
app.include_router(router=appointment_router)
app.include_router(router=documents_router)
app.include_router(router=deals_router)

add_pagination(app)

if __name__ == "__main__":
    uvicorn.run("main:app", reload=True)