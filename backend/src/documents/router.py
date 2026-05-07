import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
import aiofiles
from pathlib import Path
import uuid

from src.model import UserModel
from src.documents.dao import DocumentDAO
from src.documents.schema import DocumentReadSchema, DocumentUpdateSchema, FolderSchema
from src.users.auth import get_current_user
from src.exceptions import NotFoundException

router = APIRouter(prefix="/documents", tags=["Документы"])

UPLOAD_DIR = Path(r"C:\Users\Georgy\PycharmProjects\pythonProject\VKR\documents_uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', 
    '.jpg', '.jpeg', '.png', '.txt', '.zip', '.rar'
}

MAX_FILE_SIZE = 10 * 1024 * 1024


def get_file_extension(filename: str) -> str:
    return Path(filename).suffix.lower()


def is_allowed_file(filename: str) -> bool:
    return get_file_extension(filename) in ALLOWED_EXTENSIONS


def generate_unique_filename(original_filename: str) -> str:
    ext = get_file_extension(original_filename)
    return f"{uuid.uuid4()}{ext}"


@router.post("/upload", response_model=DocumentReadSchema, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    folder: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    client_id: Optional[int] = Form(None),
    property_id: Optional[int] = Form(None),
    deal_id: Optional[int] = Form(None),
    current_user: UserModel = Depends(get_current_user)
):
    
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Имя файла не указано"
        )
    
    if not is_allowed_file(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Недопустимый тип файла. Разрешены: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    unique_filename = generate_unique_filename(file.filename)
    

    if folder:
        folder_path = UPLOAD_DIR / folder
        folder_path.mkdir(exist_ok=True)
        file_path = folder_path / unique_filename
    else:
        file_path = UPLOAD_DIR / unique_filename
    
    file_size = 0
    try:
        async with aiofiles.open(file_path, 'wb') as f:
            while chunk := await file.read(8192):
                file_size += len(chunk)
                
                # Проверка размера
                if file_size > MAX_FILE_SIZE:
                    await f.close()
                    os.remove(file_path)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Файл слишком большой. Максимальный размер: {MAX_FILE_SIZE / (1024*1024)} МБ"
                    )
                
                await f.write(chunk)
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при сохранении файла: {str(e)}"
        )
    
    document_data = {
        "filename": unique_filename,
        "original_filename": file.filename,
        "file_path": str(file_path),
        "file_size": file_size,
        "mime_type": file.content_type or "application/octet-stream",
        "folder": folder,
        "description": description,
        "client_id": client_id,
        "property_id": property_id,
        "deal_id": deal_id,
        "uploaded_by": current_user.id
    }
    
    document = await DocumentDAO.add(**document_data)
    return DocumentReadSchema.model_validate(document)


@router.get("/", response_model=List[DocumentReadSchema])
async def get_all_documents(
    folder: Optional[str] = None,
    client_id: Optional[int] = None,
    property_id: Optional[int] = None,
    deal_id: Optional[int] = None,
    current_user: UserModel = Depends(get_current_user)
):
    
    if folder:
        documents = await DocumentDAO.find_by_folder(folder)
    elif client_id or property_id or deal_id:
        documents = await DocumentDAO.find_by_entity(
            client_id=client_id,
            property_id=property_id,
            deal_id=deal_id
        )
    else:
        if current_user.is_admin:
            documents = await DocumentDAO.find_all()
        else:
            documents = await DocumentDAO.find_all(uploaded_by=current_user.id)
    
    return [DocumentReadSchema.model_validate(doc) for doc in documents]


@router.get("/folders", response_model=List[FolderSchema])
async def get_folders(current_user: UserModel = Depends(get_current_user)):
    folders = await DocumentDAO.get_folders()
    return [FolderSchema(name=folder, count=count) for folder, count in folders]


@router.get("/{document_id}", response_model=DocumentReadSchema)
async def get_document(
    document_id: int,
    current_user: UserModel = Depends(get_current_user)
):
    document = await DocumentDAO.find_one_or_none(id=document_id)
    
    if not document:
        raise NotFoundException("Документ не найден")
    
    if not current_user.is_admin and document.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав на просмотр документа"
        )
    
    return DocumentReadSchema.model_validate(document)


@router.get("/{document_id}/download")
async def download_document(
    document_id: int,
    current_user: UserModel = Depends(get_current_user)
):
    document = await DocumentDAO.find_one_or_none(id=document_id)
    
    if not document:
        raise NotFoundException("Документ не найден")
    
    if not current_user.is_admin and document.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав на скачивание документа"
        )
    
    file_path = Path(document.file_path)
    if not file_path.exists():
        raise NotFoundException("Файл не найден на диске")
    
    return FileResponse(
        path=file_path,
        filename=document.original_filename,
        media_type=document.mime_type
    )


@router.patch("/{document_id}", response_model=DocumentReadSchema)
async def update_document(
    document_id: int,
    payload: DocumentUpdateSchema,
    current_user: UserModel = Depends(get_current_user)
):
    document = await DocumentDAO.find_one_or_none(id=document_id)
    
    if not document:
        raise NotFoundException("Документ не найден")
    
    if not current_user.is_admin and document.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав на редактирование документа"
        )
    
    update_data = payload.model_dump(exclude_unset=True)
    
    if 'folder' in update_data and update_data['folder'] != document.folder:
        old_path = Path(document.file_path)
        
        if update_data['folder']:
            new_folder = UPLOAD_DIR / update_data['folder']
            new_folder.mkdir(exist_ok=True)
            new_path = new_folder / document.filename
        else:
            new_path = UPLOAD_DIR / document.filename
        
        try:
            shutil.move(str(old_path), str(new_path))
            update_data['file_path'] = str(new_path)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ошибка при перемещении файла: {str(e)}"
            )
    
    await DocumentDAO.update(filter_by={"id": document_id}, values=update_data)
    
    updated_document = await DocumentDAO.find_one_or_none(id=document_id)
    return DocumentReadSchema.model_validate(updated_document)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: int,
    current_user: UserModel = Depends(get_current_user)
):
    document = await DocumentDAO.find_one_or_none(id=document_id)
    
    if not document:
        raise NotFoundException("Документ не найден")
    
    if not current_user.is_admin and document.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав на удаление документа"
        )
    
    file_path = Path(document.file_path)
    if file_path.exists():
        try:
            os.remove(file_path)
            
            if document.folder:
                folder_path = file_path.parent
                if folder_path.exists() and not any(folder_path.iterdir()):
                    folder_path.rmdir()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ошибка при удалении файла: {str(e)}"
            )
    
    await DocumentDAO.delete(id=document_id)