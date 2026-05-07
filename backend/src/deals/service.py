from datetime import date
from typing import List, Dict, Any, Optional

from sqlalchemy import select, func, desc
from sqlalchemy.sql import label

from src.database import new_session
from src.model import DealModel, UserModel


async def commissions_by_agent(
    start_date: Optional[date] = None, 
    end_date: Optional[date] = None, 
    user_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    
    async with new_session() as s:
        agency_comm = label("agency_commission", func.coalesce(func.sum(DealModel.agency_commission_amount), 0))
        fixed_pay = label("fixed_payment", func.coalesce(func.sum(DealModel.fixed_payment), 0))
        agent_comm = label("agent_commission", func.coalesce(func.sum(DealModel.agent_commission_amount), 0))
        total_amount = label("total_amount", func.coalesce(func.sum(DealModel.deal_amount), 0))
        deals_cnt = label("deals_count", func.count(DealModel.id))

        agent_name = func.concat(
            UserModel.last_name, " ", UserModel.first_name
        ).label("agent_name")

        stmt = (
            select(
                DealModel.user_id,
                agent_name,
                agency_comm,
                fixed_pay,
                agent_comm,
                deals_cnt,
                total_amount,
            )
            .join(UserModel, UserModel.id == DealModel.user_id)
            .group_by(DealModel.user_id, agent_name)
            .order_by(desc(agent_comm))
        )

        if start_date is not None:
            stmt = stmt.where(DealModel.deal_date >= start_date)
        if end_date is not None:
            stmt = stmt.where(DealModel.deal_date <= end_date)

        if user_id is not None:
            stmt = stmt.where(DealModel.user_id == user_id)

        res = await s.execute(stmt)
        rows = res.all()
        return [
            {
                "user_id": int(row.user_id),
                "agent_name": row.agent_name,
                "agency_commission": float(row.agency_commission),
                "fixed_payment": float(row.fixed_payment),
                "agency_total": float(row.agency_commission) + float(row.fixed_payment),
                "agent_commission": float(row.agent_commission),
                "deals_count": int(row.deals_count),
                "total_amount": float(row.total_amount),
            }
            for row in rows
        ]


async def top_agents_by_commission(
    start_date: Optional[date] = None, 
    end_date: Optional[date] = None, 
    limit: int = 10
) -> List[Dict[str, Any]]:
    async with new_session() as s:
        agent_comm = label("agent_commission", func.coalesce(func.sum(DealModel.agent_commission_amount), 0))
        deals_cnt = label("deals_count", func.count(DealModel.id))

        agent_name = func.concat(
            UserModel.last_name, " ", UserModel.first_name
        ).label("agent_name")

        stmt = (
            select(
                DealModel.user_id,
                agent_name,
                agent_comm,
                deals_cnt,
            )
            .join(UserModel, UserModel.id == DealModel.user_id)
            .group_by(DealModel.user_id, agent_name)
            .order_by(desc(agent_comm))
            .limit(limit)
        )

        # Применить фильтр по датам только если они указаны
        if start_date is not None:
            stmt = stmt.where(DealModel.deal_date >= start_date)
        if end_date is not None:
            stmt = stmt.where(DealModel.deal_date <= end_date)

        res = await s.execute(stmt)
        rows = res.all()
        return [
            {
                "user_id": int(row.user_id),
                "agent_name": row.agent_name,
                "agent_commission": float(row.agent_commission),
                "deals_count": int(row.deals_count),
            }
            for row in rows
        ]


async def agency_revenue_summary(
    start_date: Optional[date] = None, 
    end_date: Optional[date] = None
) -> Dict[str, Any]:
    async with new_session() as s:
        agency_comm = label("agency_commission", func.coalesce(func.sum(DealModel.agency_commission_amount), 0))
        fixed_pay = label("fixed_payment", func.coalesce(func.sum(DealModel.fixed_payment), 0))
        agent_comm = label("agent_commission", func.coalesce(func.sum(DealModel.agent_commission_amount), 0))
        total_deals = label("total_deals", func.count(DealModel.id))
        total_volume = label("total_volume", func.coalesce(func.sum(DealModel.deal_amount), 0))

        stmt = select(agency_comm, fixed_pay, agent_comm, total_deals, total_volume)

        # Применить фильтр по датам только если они указаны
        if start_date is not None:
            stmt = stmt.where(DealModel.deal_date >= start_date)
        if end_date is not None:
            stmt = stmt.where(DealModel.deal_date <= end_date)

        res = await s.execute(stmt)
        row = res.first()
        
        agency_total = float(row.agency_commission) if row else 0.0
        fixed_total = float(row.fixed_payment) if row else 0.0
        agent_total = float(row.agent_commission) if row else 0.0
        agency_revenue = agency_total + fixed_total
        
        return {
            "agency_commission_total": agency_total,
            "fixed_payment_total": fixed_total,
            "agency_total_revenue": agency_revenue,
            "agent_commission_total": agent_total,
            "net_profit": agency_revenue - agent_total,
            "total_deals": int(row.total_deals) if row else 0,
            "total_volume": float(row.total_volume) if row else 0.0,
        }