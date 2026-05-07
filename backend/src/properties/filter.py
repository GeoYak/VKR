from fastapi_filter.contrib.sqlalchemy import Filter
from src.model import PropertyModel
from typing import Optional, List
from pydantic import Field


class PropertyFilter(Filter):
    type_id__not_in: Optional[List[int]] = Field(default=None, alias="excluded_types")
    is_active: Optional[bool] = Field(default=None, alias="active")
    is_for_viewing: Optional[bool] = Field(default=None, alias="for_viewing")  # Новый фильтр
    address__ilike: Optional[str] = Field(default=None, alias="address_search")
    price__gte: Optional[float] = Field(default=None, alias="min_price")
    price__lte: Optional[float] = Field(default=None, alias="max_price")
    area__gte: Optional[float] = Field(default=None, alias="min_area")
    area__lte: Optional[float] = Field(default=None, alias="max_area")
    rooms__gte: Optional[int] = Field(default=None, alias="min_rooms")
    rooms__lte: Optional[int] = Field(default=None, alias="max_rooms")
    owner_id: Optional[int] = Field(default=None, alias="owner_id")
    owner_id__in: Optional[List[int]] = Field(default=None, alias="owners")
    assigned_agent_id__in: Optional[List[int]] = Field(default=None, alias="agents")

    class Constants(Filter.Constants):
        model = PropertyModel

    class Config:
        populate_by_name = True