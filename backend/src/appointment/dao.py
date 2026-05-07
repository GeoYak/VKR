from typing import Optional
from sqlalchemy import Interval, and_, cast, literal, select, update

from src.dao.base import BaseDAO
from src.model import AppointmentModel, AppointmentType
from src.database import new_session


class AppointmentDAO(BaseDAO):
    model = AppointmentModel

    @classmethod
    async def find_by_user(cls, user_id: int):
        return await cls.find_all(user_id=user_id)

    @classmethod
    async def find_overlapping(cls, user_id: int, start, end, exclude_id: Optional[int] = None):
        async with new_session() as s:
            duration_interval = cast(
                cls.model.duration_minutes.op("||")(literal(" minutes")),
                Interval,
            )

            q = (
                select(cls.model)
                .where(
                    and_(
                        cls.model.user_id == user_id,
                        cls.model.meeting_time < end,
                        (cls.model.meeting_time + duration_interval) > start,
                    )
                )
            )
            
            if exclude_id is not None:
                q = q.where(cls.model.id != exclude_id)

            res = await s.execute(q)
            return res.scalars().all()

    @classmethod
    async def update_status(cls, appointment_id: int, new_status: str):
        if isinstance(new_status, str):
            try:
                new_status = AppointmentType[new_status]
            except KeyError:
                try:
                    new_status = AppointmentType(new_status)
                except ValueError:
                    raise ValueError(f"Недопустимый статус: {new_status}")

        async with new_session() as s:
            async with s.begin():
                query = (
                    update(cls.model)
                    .where(cls.model.id == appointment_id)
                    .values(type=new_status)
                    .execution_options(synchronize_session="fetch")
                )
                result = await s.execute(query)
                return result.rowcount