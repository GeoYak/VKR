import re
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from src.my_types import ClientType

class ClientCreateSchema(BaseModel):
    first_name: str
    last_name: str
    phone_number: str
    email: EmailStr
    notes: Optional[str] = None
    type: ClientType = ClientType.SELLER

    model_config = ConfigDict(extra='forbid')

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, v: str) -> str:
        import re
        if not re.match(r'^\+\d{1,15}$', v):
            raise ValueError('Номер телефона должен начинаться с "+" и содержать 1–15 цифр')
        return v

class ClientUpdateSchema(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    notes: Optional[str] = None
    type: Optional[ClientType] = None
    
    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: str) -> str:
        if not re.match(r'^\+\d{5,15}$', value):
            raise ValueError('Номер телефона должен начинаться с "+" и содержать от 5 до 15 цифр')
        return value

    model_config = ConfigDict(extra='forbid')

class ClientReadSchema(BaseModel):
    id: int
    first_name: str
    last_name: str
    phone_number: str
    email: EmailStr
    notes: Optional[str] = None
    type: ClientType
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, extra='forbid')