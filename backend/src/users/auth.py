from fastapi import Depends, Request
from passlib.context import CryptContext
from passlib.exc import UnknownHashError
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from pydantic import EmailStr

from src.config import get_auth_data
from src.model import UserModel
from src.users.dao import UserDAO
from src.exceptions import UnauthorizedException, ForbiddenException

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
auth_data = get_auth_data()


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_pwd: str, hashed_pwd: str) -> bool:
    try:
        return pwd_context.verify(plain_pwd, hashed_pwd)
    except (UnknownHashError, ValueError):
        return False


async def authenticate_user(email: EmailStr, password: str) -> UserModel | None:
    user = await UserDAO.find_one_or_none(email=email)
    if not user:
        return None
    
    if not verify_password(password, user.password):
        return None
    
    return user


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=120)
    to_encode.update({"exp": expire})
    encode_jwt = jwt.encode(to_encode, auth_data['secret_key'], algorithm=auth_data['algorithm'])
    return encode_jwt


def get_token(request: Request) -> str:
    token = request.cookies.get('users_access_token')
    if not token:
        raise UnauthorizedException('Требуется авторизация')
    return token


async def get_current_user(token: str = Depends(get_token)) -> UserModel:
    try:
        payload = jwt.decode(token, auth_data['secret_key'], algorithms=[auth_data['algorithm']])
    except JWTError:
        raise UnauthorizedException('Неверный токен')
    
    user_id = payload.get('sub')
    if not user_id:
        raise UnauthorizedException('Неверный формат токена')
    
    user = await UserDAO.find_one_or_none(id=int(user_id))
    
    if not user:
        raise UnauthorizedException('Пользователь не найден')
    
    if not user.is_active:
        raise ForbiddenException('Аккаунт деактивирован')
    
    return user


async def get_current_admin_user(current_user: UserModel = Depends(get_current_user)) -> UserModel:
    if not current_user.is_admin:
        raise ForbiddenException('Требуются права администратора')
    return current_user