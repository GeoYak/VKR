from sqlalchemy import select
from src.dao.base import BaseDAO
from src.model import PropertyModel, ClientModel


class PropertyDAO(BaseDAO):
    model = PropertyModel

    @classmethod
    async def find_for_user(cls, user_id: int):
        from src.database import new_session
        async with new_session() as s:
            q = (
                select(PropertyModel)
                .join(ClientModel, PropertyModel.owner_id == ClientModel.id)
                .where(ClientModel.user_id == user_id)
            )
            res = await s.execute(q)
            return res.scalars().all()
