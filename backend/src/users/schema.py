import re
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

class UserLoginSchema(BaseModel):
    email: EmailStr
    password: str

class UserRegisterSchema(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone_number: str


class UserCreateSchema(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone_number: str
    model_config = ConfigDict(extra='forbid')

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: str) -> str:
        if not re.match(r'^\+\d{5,15}$', value):
            raise ValueError('Номер телефона должен начинаться с "+" и содержать от 5 до 15 цифр')
        return value

class UserUpdateSchema(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_user: Optional[bool] = None
    is_admin: Optional[bool] = None
    phone_number: Optional[str] = None

    model_config = ConfigDict(extra='forbid')

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: str) -> str:
        if not re.match(r'^\+\d{5,15}$', value):
            raise ValueError('Номер телефона должен начинаться с "+" и содержать от 5 до 15 цифр')
        return value
    
class UserReadSchema(BaseModel):
    id: int
    email: EmailStr
    first_name: str
    last_name: str
    is_active: bool
    is_user: bool
    is_admin: bool
    phone_number: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, extra='forbid')