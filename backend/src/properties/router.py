from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from pathlib import Path
import uuid
import os
import aiofiles

from src.model import UserModel
from src.properties.dao import PropertyDAO
from src.properties.schema import PropertyUpdateSchema, PropertyReadSchema, PropertyPhotoResponse
from src.properties.filter import PropertyFilter
from src.users.auth import get_current_user
from src.cache import cache_manager
from src.my_types import PropertyType

router = APIRouter(prefix="/properties", tags=["Недвижимость"])

PROPERTY_PHOTOS_DIR = Path(r"C:\Users\Georgy\PycharmProjects\pythonProject\VKR\property_photos")
PROPERTY_PHOTOS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
MAX_PHOTO_SIZE = 5 * 1024 * 1024  # 5 MB


def get_file_extension(filename: str) -> str:
    return Path(filename).suffix.lower()


def is_allowed_image(filename: str) -> bool:
    return get_file_extension(filename) in ALLOWED_IMAGE_EXTENSIONS


def generate_unique_photo_name(original_filename: str) -> str:
    ext = get_file_extension(original_filename)
    return f"{uuid.uuid4()}{ext}"


async def save_uploaded_file(file: UploadFile) -> str:
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Имя файла не указано")
    
    if not is_allowed_image(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Недопустимый формат. Разрешены: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )
    
    unique_filename = generate_unique_photo_name(file.filename)
    file_path = PROPERTY_PHOTOS_DIR / unique_filename
    
    file_size = 0
    try:
        async with aiofiles.open(file_path, 'wb') as f:
            while chunk := await file.read(8192):
                file_size += len(chunk)
                if file_size > MAX_PHOTO_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Размер файла превышает {MAX_PHOTO_SIZE / (1024*1024)} МБ"
                    )
                await f.write(chunk)
    except HTTPException:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при сохранении файла: {str(e)}"
        )
    
    return unique_filename


@router.get("/", response_model=List[PropertyReadSchema])
async def list_properties(current_user: UserModel = Depends(get_current_user)):
    cache_key = f"properties:user:{current_user.id}"
    
    if cache_manager.redis:
        cached = await cache_manager.get(cache_key)
        if cached:
            return cached
    
    properties = await PropertyDAO.find_for_user(current_user.id)
    result = [PropertyReadSchema.model_validate(p) for p in properties]
    
    if cache_manager.redis:
        await cache_manager.set(cache_key, [r.model_dump() for r in result], expire=300)
    
    return result


@router.get("/filter", response_model=List[PropertyReadSchema])
async def list_filtered_properties(
    property_filter: PropertyFilter = Depends(PropertyFilter), 
    current_user: UserModel = Depends(get_current_user)
):
    items = await PropertyDAO.find_filtered(property_filter)
    return [PropertyReadSchema.model_validate(i) for i in items]


@router.get("/{id}", response_model=PropertyReadSchema)
async def get_property(id: int, current_user: UserModel = Depends(get_current_user)):
    cache_key = f"properties:id:{id}"
    
    if cache_manager.redis:
        cached = await cache_manager.get(cache_key)
        if cached:
            return cached
    
    property_obj = await PropertyDAO.find_one_or_none(id=id)
    if not property_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Объект недвижимости не найден")
    
    result = PropertyReadSchema.model_validate(property_obj)
    
    if cache_manager.redis:
        await cache_manager.set(cache_key, result.model_dump(), expire=300)
    
    return result


@router.post("/", response_model=PropertyReadSchema, status_code=status.HTTP_201_CREATED)
async def create_property(
    description: Optional[str] = Form(None),
    type: PropertyType = Form(PropertyType.FLAT),
    address: str = Form(...),
    price: float = Form(...),
    area: float = Form(...),
    rooms: int = Form(...),
    owner_id: int = Form(...),
    is_active: bool = Form(True),
    is_for_viewing: bool = Form(False),
    photos: List[UploadFile] = File(default=[]),
    current_user: UserModel = Depends(get_current_user)
):
    
    photo_names = []
    for photo in photos:
        if photo.filename: 
            try:
                photo_name = await save_uploaded_file(photo)
                photo_names.append(photo_name)
            except Exception as e:
                for saved_photo in photo_names:
                    photo_path = PROPERTY_PHOTOS_DIR / saved_photo
                    if photo_path.exists():
                        os.remove(photo_path)
                raise
    
    property_dict = {
        'description': description,
        'type': type,
        'address': address,
        'price': price,
        'area': area,
        'rooms': rooms,
        'owner_id': owner_id,
        'is_active': is_active,
        'is_for_viewing': is_for_viewing,
        'photos': photo_names
    }
    
    try:
        new_property = await PropertyDAO.add(**property_dict)
    except Exception as e:
        for photo in photo_names:
            photo_path = PROPERTY_PHOTOS_DIR / photo
            if photo_path.exists():
                os.remove(photo_path)
        raise
    
    if cache_manager.redis:
        await cache_manager.delete(f"properties:user:{current_user.id}")
    
    return PropertyReadSchema.model_validate(new_property)


@router.patch("/{id}", response_model=PropertyReadSchema)
async def update_property(id: int, payload: PropertyUpdateSchema, current_user: UserModel = Depends(get_current_user)):
    property_obj = await PropertyDAO.find_one_or_none(id=id)
    if not property_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Объект недвижимости не найден")
    
    update_data = payload.model_dump(exclude_unset=True)
    if update_data:
        await PropertyDAO.update(filter_by={"id": id}, values=update_data)
    
    if cache_manager.redis:
        await cache_manager.delete(f"properties:id:{id}")
        await cache_manager.delete(f"properties:user:{current_user.id}")
    
    updated_property = await PropertyDAO.find_one_or_none(id=id)
    return PropertyReadSchema.model_validate(updated_property)


@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_property(id: int, current_user: UserModel = Depends(get_current_user)):
    property_obj = await PropertyDAO.find_one_or_none(id=id)
    if not property_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Объект недвижимости не найден")
    
    if property_obj.photos:
        for photo in property_obj.photos:
            photo_path = PROPERTY_PHOTOS_DIR / photo
            if photo_path.exists():
                try:
                    os.remove(photo_path)
                except Exception as e:
                    print(f"Ошибка удаления фото {photo}: {e}")
    
    await PropertyDAO.delete(id=id)
    
    if cache_manager.redis:
        await cache_manager.delete(f"properties:id:{id}")
        await cache_manager.delete(f"properties:user:{current_user.id}")
    
    return {"message": "Объект недвижимости успешно удалён"}


@router.post("/{property_id}/photos", response_model=PropertyPhotoResponse, status_code=status.HTTP_201_CREATED)
async def upload_property_photo(
    property_id: int,
    file: UploadFile = File(...),
    current_user: UserModel = Depends(get_current_user)
):
    property_obj = await PropertyDAO.find_one_or_none(id=property_id)
    if not property_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Объект недвижимости не найден")
    
    photo_name = await save_uploaded_file(file)
    
    current_photos = property_obj.photos or []
    current_photos.append(photo_name)
    
    await PropertyDAO.update(
        filter_by={"id": property_id},
        values={"photos": current_photos}
    )
    
    if cache_manager.redis:
        await cache_manager.delete(f"properties:id:{property_id}")
        await cache_manager.delete(f"properties:user:{current_user.id}")
    
    return PropertyPhotoResponse(
        filename=photo_name,
        url=f"/properties/{property_id}/photos/{photo_name}"
    )


@router.get("/{property_id}/photos/{photo_name}")
async def get_property_photo(property_id: int, photo_name: str, current_user: UserModel = Depends(get_current_user)):
    """Получить фото недвижимости"""
    property_obj = await PropertyDAO.find_one_or_none(id=property_id)
    if not property_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Объект недвижимости не найден")
    
    if not property_obj.photos or photo_name not in property_obj.photos:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Фото не найдено")
    
    photo_path = PROPERTY_PHOTOS_DIR / photo_name
    if not photo_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Файл не найден на диске")
    
    return FileResponse(photo_path)


@router.delete("/{property_id}/photos/{photo_name}", status_code=status.HTTP_200_OK)
async def delete_property_photo(
    property_id: int,
    photo_name: str,
    current_user: UserModel = Depends(get_current_user)
):
    """Удалить фото недвижимости"""
    property_obj = await PropertyDAO.find_one_or_none(id=property_id)
    if not property_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Объект недвижимости не найден")
    
    if not property_obj.photos or photo_name not in property_obj.photos:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Фото не найдено")
    
    photo_path = PROPERTY_PHOTOS_DIR / photo_name
    if photo_path.exists():
        try:
            os.remove(photo_path)
        except Exception as e:
            print(f"Ошибка удаления файла: {e}")

    current_photos = property_obj.photos.copy()
    current_photos.remove(photo_name)
    
    await PropertyDAO.update(
        filter_by={"id": property_id},
        values={"photos": current_photos}
    )

    if cache_manager.redis:
        await cache_manager.delete(f"properties:id:{property_id}")
        await cache_manager.delete(f"properties:user:{current_user.id}")
    
    return {"message": "Фото успешно удалено"}