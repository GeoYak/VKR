from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

from src.my_types import PropertyType


class PropertyCreateSchema(BaseModel):
    description: Optional[str] = None
    type: PropertyType = PropertyType.FLAT
    address: str
    price: float
    area: float
    rooms: int
    owner_id: int
    is_active: bool = True
    is_for_viewing: bool = False 

    model_config = ConfigDict(extra="forbid")


class PropertyUpdateSchema(BaseModel):
    description: Optional[str] = None
    type: Optional[PropertyType] = None
    address: Optional[str] = None
    price: Optional[float] = None
    area: Optional[float] = None
    rooms: Optional[int] = None
    is_active: Optional[bool] = None
    is_for_viewing: Optional[bool] = None  
    owner_id: Optional[int] = None
    photos: Optional[List[str]] = None

    model_config = ConfigDict(extra="forbid")


class PropertyReadSchema(BaseModel):
    id: int
    description: Optional[str] = None
    type: PropertyType
    is_active: bool
    is_for_viewing: bool 
    address: str
    price: float
    area: float
    rooms: int
    owner_id: int
    photos: Optional[List[str]] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, extra="forbid")


class PropertyPhotoResponse(BaseModel):
    filename: str
    url: str
    
    model_config = ConfigDict(extra="forbid")