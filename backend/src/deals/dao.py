from sqlalchemy import select, func
from datetime import date, datetime

from src.dao.base import BaseDAO
from src.model import DealModel
from src.database import new_session


class DealDAO(BaseDAO):
    model = DealModel

    @classmethod
    async def find_by_agent(cls, user_id: int):
        return await cls.find_all(user_id=user_id)

    @classmethod
    async def find_by_property(cls, property_id: int):
        return await cls.find_all(property_id=property_id)

    @classmethod
    async def find_by_client(cls, client_id: int):
        async with new_session() as s:
            stmt = select(cls.model).where(
                (cls.model.buyer_id == client_id) | (cls.model.seller_id == client_id)
            )
            res = await s.execute(stmt)
            return res.scalars().all()

    @classmethod
    async def find_by_period(cls, start_date: date, end_date: date):
        async with new_session() as s:
            stmt = select(cls.model).where(
                cls.model.deal_date >= datetime.combine(start_date, datetime.min.time()),
                cls.model.deal_date <= datetime.combine(end_date, datetime.max.time()),
            )
            res = await s.execute(stmt)
            return res.scalars().all()

    @classmethod
    async def count_deals_by_status(cls, deal_type: str) -> int:
        async with new_session() as s:
            stmt = select(func.count(cls.model.id)).where(cls.model.type == deal_type)
            res = await s.execute(stmt)
            return res.scalar() or 0

    @classmethod
    async def find_all_by_agent_and_period(cls, user_id: int, start_date: date, end_date: date):
        async with new_session() as s:
            stmt = select(cls.model).where(
                cls.model.user_id == user_id,
                cls.model.deal_date >= datetime.combine(start_date, datetime.min.time()),
                cls.model.deal_date <= datetime.combine(end_date, datetime.max.time()),
            )
            res = await s.execute(stmt)
            return res.scalars().all()

    @classmethod
    async def update_deal(cls, deal_id: int, **values):
        async with new_session() as s:
            deal = await s.get(cls.model, deal_id)
            if not deal:
                return None
            for key, value in values.items():
                setattr(deal, key, value)
            await s.commit()
            await s.refresh(deal)
            return deal