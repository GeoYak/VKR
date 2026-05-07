from enum import Enum

class ClientType(str, Enum):
    SELLER = "ПРОДАВЕЦ"
    BUYER = "ПОКУПАТЕЛЬ"


class AppointmentType(str, Enum):
    SCHEDULED = "ЗАПЛАНИРОВАНО"
    COMPLETED = "ЗАВЕРШЕНО"
    CANCELED = "ОТМЕНЕНО"

class PropertyType(str, Enum):
    FLAT = "КВАРТИРА"
    HOUSE = "ДОМ"

class DocumentType(str, Enum):
    COMMISSION_AGREEMENT = "СОГЛАШЕНИЕ_КОМИССИИ"
    SALE_AGREEMENT = "ДОГОВОР_ПРОДАЖИ"

class DealType(str, Enum):
    COMPLETE = "ЗАВЕРШЕНО"
    PAID = "ОПЛАЧЕНО"
    CANCELED = "ОТМЕНЕНО"
    PENDING = "АКТИВНО"

class DealOperationType(str, Enum):
    PURCHASE = "ПОКУПКА"
    SALE = "ПРОДАЖА"