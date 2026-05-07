from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from src.model import UserModel
from src.clients.dao import ClientDAO
from src.clients.schema import ClientCreateSchema, ClientUpdateSchema, ClientReadSchema
from src.users.auth import get_current_user
from src.cache import cache_manager

router = APIRouter(prefix="/clients", tags=["Клиенты"])


@router.get("/", response_model=List[ClientReadSchema])
async def list_clients(current_user: UserModel = Depends(get_current_user)):
    cache_key = f"clients:user:{current_user.id}"
    
    cached = await cache_manager.get(cache_key)
    if cached:
        return cached
    
    clients = await ClientDAO.find_all(user_id=current_user.id)
    result = [ClientReadSchema.model_validate(c) for c in clients]
    
    await cache_manager.set(cache_key, [r.model_dump() for r in result], expire=300)
    
    return result


@router.get("/{id}", response_model=ClientReadSchema)
async def get_client(id: int, current_user: UserModel = Depends(get_current_user)):
    cache_key = f"clients:id:{id}"
    
    cached = await cache_manager.get(cache_key)
    if cached:
        return cached
    
    client = await ClientDAO.find_one_or_none(id=id, user_id=current_user.id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Клиент не найден")
    
    result = ClientReadSchema.model_validate(client)
    await cache_manager.set(cache_key, result.model_dump(), expire=300)
    
    return result


@router.post("/", response_model=ClientReadSchema, status_code=status.HTTP_201_CREATED)
async def create_client(payload: ClientCreateSchema, current_user: UserModel = Depends(get_current_user)):
    client_dict = payload.model_dump()
    client_dict["user_id"] = current_user.id
    new_client = await ClientDAO.add(**client_dict)
    
    await cache_manager.delete_pattern(f"clients:user:{current_user.id}")
    
    return ClientReadSchema.model_validate(new_client)


@router.patch("/{id}", response_model=ClientReadSchema)
async def update_client(id: int, payload: ClientUpdateSchema, current_user: UserModel = Depends(get_current_user)):
    client = await ClientDAO.find_one_or_none(id=id, user_id=current_user.id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Клиент не найден")
    
    update_data = payload.model_dump(exclude_unset=True)
    if update_data:
        await ClientDAO.update(filter_by={"id": id}, values=update_data)
    
    await cache_manager.delete(f"clients:id:{id}")
    await cache_manager.delete_pattern(f"clients:user:{current_user.id}")
    
    updated_client = await ClientDAO.find_one_or_none(id=id)
    return ClientReadSchema.model_validate(updated_client)


@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_client(id: int, current_user: UserModel = Depends(get_current_user)):
    client = await ClientDAO.find_one_or_none(id=id, user_id=current_user.id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Клиент не найден")
    
    await ClientDAO.delete(id=id)
    
    await cache_manager.delete(f"clients:id:{id}")
    await cache_manager.delete_pattern(f"clients:user:{current_user.id}")
    
    return {"message": "Клиент успешно удалён"}