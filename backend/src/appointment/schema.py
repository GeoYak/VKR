from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

from src.my_types import AppointmentType

class AppointmentCreateSchema(BaseModel):
    property_id: int
    client_id: int
    type: AppointmentType = AppointmentType.SCHEDULED
    meeting_time: datetime
    duration_minutes: Optional[int] = 60
    notes: Optional[str] = None  

    model_config = ConfigDict(extra='forbid')

class AppointmentUpdateSchema(BaseModel):
    property_id: Optional[int] = None
    client_id: Optional[int] = None
    type: Optional[AppointmentType] = None
    meeting_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None

    model_config = ConfigDict(extra='forbid')

class TypeUpdateSchema(BaseModel):
    type: AppointmentType
    model_config = ConfigDict(extra="forbid")

class AppointmentReadSchema(BaseModel):
    id: int
    property_id: int
    client_id: int
    user_id: int
    type: AppointmentType
    meeting_time: datetime
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None  
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, extra='forbid')