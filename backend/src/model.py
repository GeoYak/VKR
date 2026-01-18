from datetime import datetime
from sqlalchemy import JSON, DateTime, Enum, ForeignKey, String, Text, text
from src.database import Base, str_uniq, float_base, int_base, int_pk, str_base, bool_d_t, bool_d_f, datetime_base, createtime_base, updatetime_base
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.my_types import ClientType, PropertyType, AppointmentType, DealType, DealOperationType


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[int_pk]
    first_name: Mapped[str_base]
    last_name: Mapped[str_base] 
    phone_number: Mapped[str_uniq]
    email: Mapped[str_uniq]
    password: Mapped[str_base]

    is_active: Mapped[bool_d_t]
    is_user: Mapped[bool_d_t]
    is_admin: Mapped[bool_d_f]

    created_at: Mapped[createtime_base]

    clients_assigned = relationship("ClientModel", back_populates="agent", foreign_keys="ClientModel.user_id")
    appointments = relationship("AppointmentModel", back_populates="agent", foreign_keys="AppointmentModel.user_id")
    deals = relationship("DealModel", back_populates="agent", foreign_keys="DealModel.user_id")
    documents_uploaded = relationship("DocumentModel", back_populates="uploader", foreign_keys="DocumentModel.uploaded_by")

    @property
    def full_name(self) -> str:
        return " ".join((self.last_name, self.first_name))

    def __str__(self):
        return f"{self.__class__.__name__}(id={self.id})"
    
    def __repr__(self):
        return str(self)

class ClientModel(Base):
    __tablename__ = "clients"

    id: Mapped[int_pk]
    first_name: Mapped[str_base]
    last_name: Mapped[str_base]
    phone_number: Mapped[str_uniq]
    email: Mapped[str_uniq]
    notes: Mapped[str | None]
    type: Mapped[ClientType] = mapped_column(Enum(ClientType, values_callable=lambda x: [e.value for e in x]), nullable=False, server_default=ClientType.SELLER)
    created_at: Mapped[createtime_base]
    updated_at: Mapped[updatetime_base]
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    agent = relationship("UserModel", back_populates="clients_assigned", foreign_keys=[user_id])
    properties = relationship("PropertyModel", back_populates="owner")
    appointments = relationship("AppointmentModel", back_populates="client")
    documents = relationship("DocumentModel", back_populates="client")

    @property
    def full_name(self) -> str:
        return " ".join((self.last_name, self.first_name))

    def __str__(self):
        return f"{self.__class__.__name__}(id={self.id})"
    
    def __repr__(self):
        return str(self)
    
class PropertyModel(Base):
    __tablename__ = "properties"

    id: Mapped[int_pk]
    description: Mapped[str]
    type: Mapped[PropertyType] = mapped_column(Enum(PropertyType, values_callable=lambda x: [e.value for e in x]), nullable=False, server_default=PropertyType.FLAT)
    is_active: Mapped[bool_d_t]
    is_for_viewing: Mapped[bool_d_f]
    address: Mapped[str_base]
    price: Mapped[float_base]
    area: Mapped[float]
    rooms: Mapped[int_base]
    owner_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), nullable=False)
    photos: Mapped[list[str] | None] = mapped_column(JSON)
    created_at: Mapped[createtime_base]
    updated_at: Mapped[updatetime_base]

    owner = relationship("ClientModel", back_populates="properties", foreign_keys=[owner_id])
    appointments = relationship("AppointmentModel", back_populates="property_obj")
    deals = relationship("DealModel", back_populates="property_obj")
    documents = relationship("DocumentModel", back_populates="property_obj", foreign_keys="DocumentModel.property_id")

    def __str__(self):
        return f"{self.__class__.__name__}(id={self.id})"
    
    def __repr__(self):
        return str(self)
    
class AppointmentModel(Base):
    __tablename__ = "appointments"
    
    id: Mapped[int_pk]
    property_id: Mapped[int] = mapped_column(ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    type: Mapped[AppointmentType] = mapped_column(Enum(AppointmentType, values_callable=lambda x: [e.value for e in x]), nullable=False, server_default=AppointmentType.SCHEDULED)
    meeting_time: Mapped[datetime_base]
    duration_minutes: Mapped[int_base]
    notes: Mapped[str| None] 
    created_at: Mapped[createtime_base]

    property_obj = relationship("PropertyModel", back_populates="appointments", foreign_keys=[property_id])
    client = relationship("ClientModel", back_populates="appointments", foreign_keys=[client_id])
    agent = relationship("UserModel", back_populates="appointments", foreign_keys=[user_id])

    def __str__(self):
        return f"{self.__class__.__name__}(id={self.id})"
    
    def __repr__(self):
        return str(self)
    

class DocumentModel(Base):
    __tablename__ = "documents"
    
    id: Mapped[int_pk]
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int_base]
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    client_id: Mapped[int | None] = mapped_column(ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)
    property_id: Mapped[int | None] = mapped_column(ForeignKey("properties.id", ondelete="SET NULL"), nullable=True)
    deal_id: Mapped[int | None] = mapped_column(ForeignKey("deals.id", ondelete="SET NULL"), nullable=True)
    folder: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[createtime_base]

    uploader = relationship("UserModel", back_populates="documents_uploaded", foreign_keys=[uploaded_by])
    client = relationship("ClientModel", back_populates="documents", foreign_keys=[client_id])
    property_obj = relationship("PropertyModel", back_populates="documents", foreign_keys=[property_id])
    deal = relationship("DealModel", back_populates="documents", foreign_keys=[deal_id])
    
    def __str__(self):
        return f"{self.__class__.__name__}(id={self.id}, filename={self.original_filename})"
    
    def __repr__(self):
        return str(self)

class DealModel(Base):
    __tablename__ = "deals"
    
    id: Mapped[int_pk]
    property_id: Mapped[int] = mapped_column(ForeignKey("properties.id"), nullable=False)
    operation_type: Mapped[DealOperationType] = mapped_column(
        Enum(DealOperationType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=DealOperationType.PURCHASE,
    )
    buyer_id: Mapped[int | None] = mapped_column(ForeignKey("clients.id"), nullable=True)
    buyer_name: Mapped[str | None]
    seller_id: Mapped[int | None] = mapped_column(ForeignKey("clients.id"), nullable=True)
    seller_name: Mapped[str | None]
    deal_amount: Mapped[float_base]
    fixed_payment: Mapped[float] = mapped_column(nullable=False, default=0.0, server_default=text('0.0'))
    agency_commission_rate: Mapped[int_base]
    agency_commission_amount: Mapped[float_base]
    agent_commission_rate: Mapped[int_base]
    agent_commission_amount: Mapped[float_base]
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False) 
    deal_date: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    type: Mapped[DealType] = mapped_column(
        Enum(DealType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=DealType.PENDING,
    )
    created_at: Mapped[createtime_base] 

    property_obj = relationship("PropertyModel", back_populates="deals", foreign_keys=[property_id])
    buyer = relationship("ClientModel", foreign_keys=[buyer_id])
    seller = relationship("ClientModel", foreign_keys=[seller_id])
    agent = relationship("UserModel", back_populates="deals", foreign_keys=[user_id])
    documents = relationship("DocumentModel", back_populates="deal", foreign_keys="DocumentModel.deal_id")
    
    def __str__(self):
        return f"{self.__class__.__name__}(id={self.id})"
    
    def __repr__(self):
        return str(self)