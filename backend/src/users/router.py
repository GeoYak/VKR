from fastapi import APIRouter, Depends, HTTPException, Response, status
from typing import List

from src.model import UserModel
from src.users.dao import UserDAO
from src.users.schema import UserLoginSchema, UserRegisterSchema, UserUpdateSchema, UserReadSchema
from src.users.auth import (
    authenticate_user,
    create_access_token,
    get_current_admin_user,
    get_current_user,
    get_password_hash,
)

router = APIRouter(prefix="/users", tags=["Пользователи"])


@router.post("/register", response_model=UserReadSchema, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserRegisterSchema):
    existing = await UserDAO.find_one_or_none(email=user_data.email)
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Пользователь уже существует")
    
    user_dict = user_data.model_dump()
    user_dict["password"] = get_password_hash(user_data.password)
    obj = await UserDAO.add(**user_dict)
    return UserReadSchema.model_validate(obj)


@router.post("/login")
async def auth_user(response: Response, user_data: UserLoginSchema):
    user = await authenticate_user(user_data.email, user_data.password)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Неверная почта или пароль")
    
    access_token = create_access_token({"sub": str(user.id)})
    response.set_cookie("users_access_token", access_token, httponly=True, samesite="lax")
    return {"access_token": access_token, "user": UserReadSchema.model_validate(user)}


@router.post("/logout")
async def logout_user(response: Response):
    response.delete_cookie("users_access_token")
    return {"message": "Пользователь успешно вышел из системы"}


@router.get("/me", response_model=UserReadSchema)
async def get_current_user_info(user_data: UserModel = Depends(get_current_user)):
    return UserReadSchema.model_validate(user_data)


@router.get("/", response_model=List[UserReadSchema])
async def list_users(admin: UserModel = Depends(get_current_admin_user)):
    users = await UserDAO.find_all()
    return [UserReadSchema.model_validate(u) for u in users]


@router.get("/{id}", response_model=UserReadSchema)
async def get_user_by_id(id: int, admin: UserModel = Depends(get_current_admin_user)):
    user = await UserDAO.find_one_or_none(id=id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Пользователь не найден")
    return UserReadSchema.model_validate(user)


@router.patch("/{id}", response_model=UserReadSchema)
async def update_user(id: int, update_data: UserUpdateSchema, user_data: UserModel = Depends(get_current_user)):
    if user_data.id != id and not user_data.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для редактирования этого пользователя"
        )
    update_dict = update_data.model_dump(exclude_unset=True)
    if "password" in update_dict and update_dict["password"]:
        update_dict["password"] = get_password_hash(update_dict["password"])

    if not user_data.is_admin:
        update_dict.pop('is_admin', None)
        update_dict.pop('is_active', None)

    updated_count = await UserDAO.update(filter_by={"id": id}, values=update_dict)
    if updated_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Пользователь не найден")
    
    user = await UserDAO.find_one_or_none(id=id)
    return UserReadSchema.model_validate(user)


@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_user(id: int, user_data: UserModel = Depends(get_current_admin_user)):
    if user_data.id != id and not user_data.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для удаления этого пользователя"
        )
    deleted_count = await UserDAO.delete(id=id)
    if deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Пользователь не найден")
    return {"success": True}