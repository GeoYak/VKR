from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from src.my_types import DealOperationType, DealType


class DealCreateSchema(BaseModel):
    property_id: int
    operation_type: DealOperationType = DealOperationType.SALE
    buyer_id: Optional[int] = None
    buyer_name: Optional[str] = None
    seller_id: Optional[int] = None
    seller_name: Optional[str] = None
    deal_amount: float
    fixed_payment: float = 0.0
    agency_commission_rate: int = 3
    agent_commission_rate: int = 50
    deal_date: datetime
    type: DealType = DealType.PENDING

    model_config = ConfigDict(extra="forbid")
    
    @field_validator("deal_date", mode="before")
    @classmethod
    def parse_deal_date(cls, value):
        if isinstance(value, str):
            return datetime.fromisoformat(value.replace('Z', '+00:00'))
        return value

    @model_validator(mode='after')
    def validate_seller_buyer(self):
        if self.operation_type == DealOperationType.SALE:
            if not self.seller_id:
                raise ValueError("Для продажи необходимо указать seller_id (нашего клиента)")
            if not self.buyer_name:
                raise ValueError("Для продажи необходимо указать buyer_name (внешнего покупателя)")
        elif self.operation_type == DealOperationType.PURCHASE:
            if not self.buyer_id:
                raise ValueError("Для покупки необходимо указать buyer_id (нашего клиента)")
            if not self.seller_name:
                raise ValueError("Для покупки необходимо указать seller_name (внешнего продавца)")
        return self


class DealUpdateSchema(BaseModel):
    property_id: Optional[int] = None
    operation_type: Optional[DealOperationType] = None
    seller_id: Optional[int] = None
    seller_name: Optional[str] = None
    buyer_id: Optional[int] = None
    buyer_name: Optional[str] = None
    deal_amount: Optional[float] = None
    fixed_payment: Optional[float] = None
    type: Optional[DealType] = None
    deal_date: Optional[datetime] = None
    agency_commission_rate: Optional[float] = None
    agent_commission_rate: Optional[float] = None

    model_config = ConfigDict(extra='forbid')


class DealReadSchema(BaseModel):
    id: int
    property_id: int
    operation_type: DealOperationType
    buyer_id: Optional[int] = None
    buyer_name: Optional[str] = None
    seller_id: Optional[int] = None
    seller_name: Optional[str] = None
    deal_amount: float
    fixed_payment: float
    agency_commission_rate: int
    agency_commission_amount: float
    agent_commission_rate: int
    agent_commission_amount: float
    user_id: int
    deal_date: datetime
    type: DealType
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, extra="forbid")


class DateRangeReq(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None

    model_config = ConfigDict(extra="forbid")


class TopAgentsRequest(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    limit: int = 10

    model_config = ConfigDict(extra="forbid")


class TotalSumResp(BaseModel):
    total: float


class AgentCommissionItem(BaseModel):
    user_id: int
    agent_name: str
    agency_commission: float
    fixed_payment: float
    agency_total: float
    agent_commission: float
    deals_count: int
    total_amount: float


class TopAgentItem(BaseModel):
    user_id: int
    agent_name: str
    agent_commission: float
    deals_count: int

class AgencyRevenueSummary(BaseModel):
    agency_commission_total: float
    fixed_payment_total: float
    agency_total_revenue: float
    agent_commission_total: float
    net_profit: float
    total_deals: int
    total_volume: float