from datetime import timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from src.appointment.schema import AppointmentCreateSchema, AppointmentReadSchema, AppointmentUpdateSchema
from src.appointment.dao import AppointmentDAO
from src.users.auth import get_current_user
from src.model import UserModel
from src.cache import cache_manager

router = APIRouter(prefix="/appointments", tags=["Показы"])


@router.post("/", response_model=AppointmentReadSchema, status_code=status.HTTP_201_CREATED)
async def create_appointment(payload: AppointmentCreateSchema, current_user: UserModel = Depends(get_current_user)):
    appointment_dict = payload.model_dump()
    appointment_dict["user_id"] = current_user.id
    
    start = appointment_dict["meeting_time"]
    duration = appointment_dict.get("duration_minutes", 60)
    end = start + timedelta(minutes=duration)
    
    overlapping = await AppointmentDAO.find_overlapping(current_user.id, start, end)
    if overlapping:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="У вас уже запланирован показ на это время")
    
    new_appointment = await AppointmentDAO.add(**appointment_dict)
    
    await cache_manager.delete_pattern(f"appointments:user:{current_user.id}")
    
    return AppointmentReadSchema.model_validate(new_appointment)


@router.get("/", response_model=List[AppointmentReadSchema])
async def list_my_appointments(current_user: UserModel = Depends(get_current_user)):
    cache_key = f"appointments:user:{current_user.id}"
    
    cached = await cache_manager.get(cache_key)
    if cached:
        return cached
    
    appointments = await AppointmentDAO.find_by_user(current_user.id)
    result = [AppointmentReadSchema.model_validate(a) for a in appointments]
    
    await cache_manager.set(cache_key, [r.model_dump() for r in result], expire=300)
    
    return result


@router.get("/{id}", response_model=AppointmentReadSchema)
async def get_appointment(id: int, current_user: UserModel = Depends(get_current_user)):
    cache_key = f"appointments:id:{id}"
    
    cached = await cache_manager.get(cache_key)
    if cached:
        return cached
    
    appointment = await AppointmentDAO.find_one_or_none(id=id, user_id=current_user.id)
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Показ не найден")
    
    result = AppointmentReadSchema.model_validate(appointment)
    await cache_manager.set(cache_key, result.model_dump(), expire=300)
    
    return result


@router.patch("/{appointment_id}", response_model=AppointmentReadSchema)
async def update_appointment(appointment_id: int, payload: AppointmentUpdateSchema, current_user: UserModel = Depends(get_current_user)):
    appointment = await AppointmentDAO.find_one_or_none(id=appointment_id, user_id=current_user.id)
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Показ не найден")
    
    update_data = payload.model_dump(exclude_unset=True)
    
    if "meeting_time" in update_data or "duration_minutes" in update_data:
        start = update_data.get("meeting_time", appointment.meeting_time)
        duration = update_data.get("duration_minutes", appointment.duration_minutes)
        end = start + timedelta(minutes=duration)
        
        overlapping = await AppointmentDAO.find_overlapping(current_user.id, start, end, exclude_id=appointment_id)
        if overlapping:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="У вас уже запланирован показ на это время")
    
    if update_data:
        await AppointmentDAO.update(filter_by={"id": appointment_id}, values=update_data)
    
    await cache_manager.delete(f"appointments:id:{appointment_id}")
    await cache_manager.delete_pattern(f"appointments:user:{current_user.id}")
    
    updated_appointment = await AppointmentDAO.find_one_or_none(id=appointment_id)
    return AppointmentReadSchema.model_validate(updated_appointment)


@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_appointment(id: int, current_user: UserModel = Depends(get_current_user)):
    appointment = await AppointmentDAO.find_one_or_none(id=id, user_id=current_user.id)
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Показ не найден")
    
    await AppointmentDAO.delete(id=id)
    
    await cache_manager.delete(f"appointments:id:{id}")
    await cache_manager.delete_pattern(f"appointments:user:{current_user.id}")
    
    return {"message": "Показ успешно удалён"}