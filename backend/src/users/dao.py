
from src.dao.base import BaseDAO
from src.model import UserModel


class UserDAO(BaseDAO):
    model = UserModel # type: ignore

    