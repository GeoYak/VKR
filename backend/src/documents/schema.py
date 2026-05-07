from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class DocumentUploadSchema(BaseModel):
    client_id: Optional[int] = None
    property_id: Optional[int] = None
    deal_id: Optional[int] = None
    folder: Optional[str] = None
    description: Optional[str] = None

    model_config = ConfigDict(extra='forbid')


class DocumentReadSchema(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_path: str
    file_size: int
    mime_type: str
    client_id: Optional[int] = None
    property_id: Optional[int] = None
    deal_id: Optional[int] = None
    folder: Optional[str] = None
    description: Optional[str] = None
    uploaded_by: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentUpdateSchema(BaseModel):
    folder: Optional[str] = None
    description: Optional[str] = None
    client_id: Optional[int] = None
    property_id: Optional[int] = None
    deal_id: Optional[int] = None

    model_config = ConfigDict(extra='forbid')


class FolderSchema(BaseModel):
    name: str
    count: int