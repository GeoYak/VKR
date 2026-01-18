from sqlalchemy import select, update, delete
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from src.database import new_session, reset_sequence
from src.exceptions import ConflictException


class BaseDAO:
    model = None  
    
    def __new__(cls, *args, **kwargs):
        if cls.model is None:
            raise ValueError(f'В {cls.__name__} model не должен быть None')
        return super().__new__(cls)

    @classmethod
    async def _find(cls, **filter_by):
        async with new_session() as s:
            query = select(cls.model).filter_by(**filter_by) # type: ignore
            result = await s.execute(query)
        return result
    
    @classmethod
    async def find_all(cls, **filter_by):
        result = await cls._find(**filter_by)
        return result.scalars().all()

    @classmethod
    async def find_one_or_none(cls, **filter_by):
        result = await cls._find(**filter_by)
        return result.scalar_one_or_none()

    @classmethod
    async def find_filtered(cls, filter_obj):
        async with new_session() as s:
            query = select(cls.model) # type: ignore
            query = filter_obj.filter(query)
            result = await s.execute(query)
            return result.scalars().all()

    @classmethod
    async def add(cls, **values):
        async with new_session() as s:
            obj = cls.model(**values) # type: ignore
            s.add(obj)
            try:
                await s.commit()
                await s.refresh(obj)
                return obj
            except IntegrityError as e:
                await s.rollback()
                error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
                
                if "unique constraint" in error_msg.lower():
                    raise ConflictException("Запись с такими данными уже существует")
                elif "foreign key constraint" in error_msg.lower():
                    raise ConflictException("Связанная запись не найдена")
                raise
            except SQLAlchemyError as e:
                await s.rollback()
                raise
         
    @classmethod
    async def update(cls, filter_by: dict, values: dict):
        async with new_session() as s:
            async with s.begin():
                query = (
                    update(cls.model) # type: ignore
                    .where(*[getattr(cls.model, k) == v for k, v in filter_by.items()])
                    .values(**values)
                    .execution_options(synchronize_session="fetch")
                )
                try:
                    result = await s.execute(query)
                    await s.commit()
                    return result.rowcount
                except IntegrityError as e:
                    await s.rollback()
                    error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
                    
                    if "unique constraint" in error_msg.lower():
                        raise ConflictException("Запись с такими данными уже существует")
                    elif "foreign key constraint" in error_msg.lower():
                        raise ConflictException("Связанная запись не найдена")
                    raise
                except SQLAlchemyError as e:
                    await s.rollback()
                    raise
    
    @classmethod
    async def delete(cls, **filter_by):
        try:
            async with new_session() as session:
                query = delete(cls.model).filter_by(**filter_by) # type: ignore
                result = await session.execute(query)
                await session.commit()
                
                if result.rowcount > 0:
                    table_name = cls.model.__tablename__ # type: ignore
                    await reset_sequence(table_name)
                
                return result.rowcount
        except IntegrityError as e:
            raise ConflictException("Невозможно удалить: существуют связанные записи")
        except SQLAlchemyError as e:
            raise