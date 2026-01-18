from typing import Optional
from src.dao.base import BaseDAO
from src.model import DocumentModel
from sqlalchemy import select, func
from src.database import new_session


class DocumentDAO(BaseDAO):
    model = DocumentModel

    @classmethod
    async def get_folders(cls):
        async with new_session() as s:
            query = (
                select(
                    cls.model.folder,
                    func.count(cls.model.id).label('count')
                )
                .filter(cls.model.folder.isnot(None))
                .group_by(cls.model.folder)
            )
            result = await s.execute(query)
            return result.all()

    @classmethod
    async def find_by_folder(cls, folder: str):
        async with new_session() as s:
            query = select(cls.model).filter_by(folder=folder)
            result = await s.execute(query)
            return result.scalars().all()

    @classmethod
    async def find_by_entity(cls, client_id: Optional[int] = None, property_id: Optional[int] = None, deal_id: Optional[int] = None):
        filters = {}
        if client_id:
            filters['client_id'] = client_id
        if property_id:
            filters['property_id'] = property_id
        if deal_id:
            filters['deal_id'] = deal_id
        
        return await cls.find_all(**filters)