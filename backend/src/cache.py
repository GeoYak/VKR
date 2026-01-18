import json
from typing import Optional, Any
import redis.asyncio as aioredis
from src.config import settings

class CacheManager:
    def __init__(self):
        self.redis: Optional[aioredis.Redis] = None
    
    async def connect(self):
        try:
            self.redis = await aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            self.redis.ping()
            print("Redis успешно подключен")
        except Exception as e:
            print(f"Ошибка подключения к Redis: {e}")
            print("Приложение будет работать без кэширования")
            self.redis = None
    
    async def close(self):
        if self.redis:
            await self.redis.close()
            print("Соединение с Redis закрыто")
    
    async def get(self, key: str) -> Optional[Any]:
        if not self.redis:
            return None
        
        try:
            value = await self.redis.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            print(f"Ошибка получения из кэша: {e}")
        
        return None
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        expire: int = 300
    ) -> bool:
        if not self.redis:
            return False
        
        try:
            serialized = json.dumps(value, ensure_ascii=False, default=str)
            await self.redis.setex(key, expire, serialized)
            return True
        except Exception as e:
            print(f"Ошибка записи в кэш: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        if not self.redis:
            return False
        
        try:
            await self.redis.delete(key)
            return True
        except Exception as e:
            print(f"Ошибка удаления из кэша: {e}")
            return False
    
    async def delete_pattern(self, pattern: str) -> bool:
        if not self.redis:
            return False
        
        try:
            keys = []
            async for key in self.redis.scan_iter(match=pattern):
                keys.append(key)
            
            if keys:
                await self.redis.delete(*keys)
            return True
        except Exception as e:
            print(f"Ошибка удаления по шаблону: {e}")
            return False

cache_manager = CacheManager()