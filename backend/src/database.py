from datetime import datetime
from typing import Annotated
from sqlalchemy import DateTime, func, text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncAttrs
from sqlalchemy.orm import DeclarativeBase, mapped_column

from src.config import get_db_url

DATABASE_URL = get_db_url()

engine = create_async_engine(DATABASE_URL)
new_session = async_sessionmaker(engine, expire_on_commit=False)

int_pk = Annotated[int, mapped_column(primary_key=True)]
int_base = Annotated[int, mapped_column(nullable=False)]
str_uniq = Annotated[str, mapped_column(unique=True, nullable=False)]
str_base = Annotated[str, mapped_column(nullable=False)]
float_base = Annotated[float, mapped_column(nullable=False)]

bool_d_t = Annotated[bool, mapped_column(default=True, server_default=text('true'), nullable=False)]
bool_d_f = Annotated[bool, mapped_column(default=False, server_default=text('false'), nullable=False)]

datetime_base = Annotated[datetime, mapped_column(DateTime(timezone=True), nullable=False)]
createtime_base = Annotated[datetime, mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)]
updatetime_base = Annotated[datetime, mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)]

class Base(DeclarativeBase, AsyncAttrs):
    __abstract__ = True

async def reset_sequence(table_name: str) -> None:
    async with engine.begin() as conn:
        result = await conn.execute(text(f"SELECT MAX(id) FROM {table_name}"))
        max_id = result.scalar() or 0
        
        seq_name = f"{table_name}_id_seq"
        await conn.execute(text(f"ALTER SEQUENCE {seq_name} RESTART WITH {max_id + 1}"))
