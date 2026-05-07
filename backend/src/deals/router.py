from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from src.model import UserModel
from src.deals.dao import DealDAO
from src.deals import service as deals_service
from src.deals.schema import (
    DealCreateSchema, 
    DealReadSchema, 
    DealUpdateSchema,
    AgentCommissionItem,
    TopAgentItem,
    AgencyRevenueSummary
)
from src.users.auth import get_current_user
from src.cache import cache_manager

router = APIRouter(prefix="/deals", tags=["Сделки"])


def make_naive(dt: datetime) -> datetime:
    if dt.tzinfo is not None:
        return dt.replace(tzinfo=None)
    return dt

def calculate_commissions(deal_amount: float, agency_rate: float, agent_rate: float, fixed_payment: float):
    agency_commission = (deal_amount * agency_rate / 100)
    total_agency_revenue = agency_commission + fixed_payment
    agent_commission = total_agency_revenue * agent_rate / 100
    return {
        "agency_commission_amount": round(agency_commission, 2),
        "agent_commission_amount": round(agent_commission, 2)
    }

@router.post("/", response_model=DealReadSchema, status_code=status.HTTP_201_CREATED)
async def create_deal(payload: DealCreateSchema, current_user: UserModel = Depends(get_current_user)):
    deal_dict = payload.model_dump()
    deal_dict["user_id"] = current_user.id
    deal_dict["deal_date"] = make_naive(payload.deal_date)
    
    commissions = calculate_commissions(
        deal_dict['deal_amount'],
        deal_dict['agency_commission_rate'],
        deal_dict['agent_commission_rate'],
        deal_dict['fixed_payment']
    )
    deal_dict.update(commissions)
    
    new_deal = await DealDAO.add(**deal_dict)
    
    await cache_manager.delete_pattern("deals:*")
    await cache_manager.delete_pattern("analytics:*")
    
    return DealReadSchema.model_validate(new_deal)


@router.get("/", response_model=List[DealReadSchema])
async def list_deals(current_user: UserModel = Depends(get_current_user)):
    cache_key = f"deals:user:{current_user.id}"
    
    cached = await cache_manager.get(cache_key)
    if cached:
        return cached
    
    deals = await DealDAO.find_by_agent(current_user.id)
    result = [DealReadSchema.model_validate(d) for d in deals]
    
    await cache_manager.set(cache_key, [r.model_dump() for r in result], expire=300)
    
    return result


@router.get("/{id}", response_model=DealReadSchema)
async def get_deal(id: int, current_user: UserModel = Depends(get_current_user)):
    cache_key = f"deals:id:{id}"
    
    cached = await cache_manager.get(cache_key)
    if cached:
        return cached
    
    deal = await DealDAO.find_one_or_none(id=id, user_id=current_user.id)
    if not deal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Сделка не найдена")
    
    result = DealReadSchema.model_validate(deal)
    await cache_manager.set(cache_key, result.model_dump(), expire=300)
    
    return result


@router.patch("/{id}", response_model=DealReadSchema)
async def update_deal(id: int, payload: DealUpdateSchema, current_user: UserModel = Depends(get_current_user)):
    deal = await DealDAO.find_one_or_none(id=id, user_id=current_user.id)
    if not deal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Сделка не найдена")
    
    update_data = payload.model_dump(exclude_unset=True)
    
    if "deal_date" in update_data:
        update_data["deal_date"] = make_naive(update_data["deal_date"])
    
    if any(key in update_data for key in ["deal_amount", "agency_commission_rate", "agent_commission_rate", "fixed_payment"]):
        amount = update_data.get("deal_amount", deal.deal_amount)
        agency_rate = update_data.get("agency_commission_rate", deal.agency_commission_rate)
        agent_rate = update_data.get("agent_commission_rate", deal.agent_commission_rate)
        fixed = update_data.get("fixed_payment", deal.fixed_payment)
        
        commissions = calculate_commissions(amount, agency_rate, agent_rate, fixed)
        update_data.update(commissions)
    
    if update_data:
        await DealDAO.update(filter_by={"id": id}, values=update_data)
    
    await cache_manager.delete(f"deals:id:{id}")
    await cache_manager.delete_pattern(f"deals:user:{current_user.id}")
    await cache_manager.delete_pattern("analytics:*")
    
    updated_deal = await DealDAO.find_one_or_none(id=id)
    return DealReadSchema.model_validate(updated_deal)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deal(id: int, current_user: UserModel = Depends(get_current_user)):
    deal = await DealDAO.find_one_or_none(id=id, user_id=current_user.id)
    if not deal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Сделка не найдена")
    
    await DealDAO.delete(id=id)
    
    await cache_manager.delete(f"deals:id:{id}")
    await cache_manager.delete_pattern(f"deals:user:{current_user.id}")
    await cache_manager.delete_pattern("analytics:*")
    
    return None


@router.get("/reports/commissions", response_model=List[AgentCommissionItem])
async def get_my_commissions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: UserModel = Depends(get_current_user)
):
    cache_key = f"analytics:commissions:user:{current_user.id}:{start_date}:{end_date}"
    
    cached = await cache_manager.get(cache_key)
    if cached:
        return cached
    
    start = datetime.fromisoformat(start_date).date() if start_date and start_date.strip() else None
    end = datetime.fromisoformat(end_date).date() if end_date and end_date.strip() else None
    result = await deals_service.commissions_by_agent(start, end, current_user.id)
    
    await cache_manager.set(cache_key, result, expire=300)
    
    return result


@router.get("/reports/commissions/admin", response_model=List[AgentCommissionItem])
async def get_all_commissions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: UserModel = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Доступно только администратору")
    
    cache_key = f"analytics:commissions:all:{start_date}:{end_date}"
    
    cached = await cache_manager.get(cache_key)
    if cached:
        return cached

    start = datetime.fromisoformat(start_date).date() if start_date and start_date.strip() else None
    end = datetime.fromisoformat(end_date).date() if end_date and end_date.strip() else None
    result = await deals_service.commissions_by_agent(start, end)
    
    await cache_manager.set(cache_key, result, expire=300)
    
    return result


@router.get("/reports/top-agents", response_model=List[TopAgentItem])
async def get_top_agents(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: UserModel = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Доступно только администратору")
    
    cache_key = f"analytics:top_agents:{start_date}:{end_date}"
    
    cached = await cache_manager.get(cache_key)
    if cached:
        return cached
    
    start = datetime.fromisoformat(start_date).date() if start_date and start_date.strip() else None
    end = datetime.fromisoformat(end_date).date() if end_date and end_date.strip() else None
    result = await deals_service.top_agents_by_commission(start, end)
    
    await cache_manager.set(cache_key, result, expire=300)
    
    return result


@router.get("/reports/revenue", response_model=AgencyRevenueSummary)
async def get_agency_revenue(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: UserModel = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Доступно только администратору")
    
    cache_key = f"analytics:revenue:{start_date}:{end_date}"
    
    cached = await cache_manager.get(cache_key)
    if cached:
        return cached
    
    start = datetime.fromisoformat(start_date).date() if start_date and start_date.strip() else None
    end = datetime.fromisoformat(end_date).date() if end_date and end_date.strip() else None
    result = await deals_service.agency_revenue_summary(start, end)
    
    await cache_manager.set(cache_key, result, expire=300)
    
    return result