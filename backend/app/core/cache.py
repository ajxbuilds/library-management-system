import time
import json
import logging
from typing import Optional, Any
from app.core.config import settings

logger = logging.getLogger("cache")

class InMemoryCache:
    """Thread-safe in-memory cache with TTL support when Redis is unreachable."""
    def __init__(self):
        self._store = {}
        self._hits = 0
        self._misses = 0

    def get(self, key: str) -> Optional[str]:
        item = self._store.get(key)
        if not item:
            self._misses += 1
            return None
        val, expiry = item
        if expiry and time.time() > expiry:
            del self._store[key]
            self._misses += 1
            return None
        self._hits += 1
        return val

    def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        expiry = time.time() + ex if ex else None
        self._store[key] = (value, expiry)
        return True

    def delete(self, key: str) -> bool:
        if key in self._store:
            del self._store[key]
            return True
        return False

    def flush(self) -> bool:
        self._store.clear()
        return True

    def keys(self, pattern: str = "*") -> list:
        # Simple prefix or all matching
        now = time.time()
        valid_keys = []
        for k, (v, exp) in list(self._store.items()):
            if exp and now > exp:
                del self._store[k]
                continue
            if pattern == "*" or pattern.rstrip("*") in k:
                valid_keys.append(k)
        return valid_keys

    def stats(self) -> dict:
        return {
            "type": "In-Memory LRU/TTL Cache (Zero-friction local mode)",
            "keys_count": len(self._store),
            "hits": self._hits,
            "misses": self._misses,
            "hit_ratio": round(self._hits / (self._hits + self._misses), 3) if (self._hits + self._misses) > 0 else 0.0
        }

class CacheManager:
    def __init__(self):
        self.client = None
        self.is_redis = False
        self.fallback = InMemoryCache()
        self._init_connection()

    def _init_connection(self):
        try:
            import redis
            r = redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1)
            r.ping()
            self.client = r
            self.is_redis = True
            logger.info("Connected to Redis server successfully.")
        except Exception as e:
            self.is_redis = False
            self.client = self.fallback
            logger.warning(f"Redis not available ({e}). Using in-memory fallback cache engine.")

    def get(self, key: str) -> Optional[str]:
        try:
            return self.client.get(key)
        except Exception:
            return self.fallback.get(key)

    def get_json(self, key: str) -> Optional[Any]:
        raw = self.get(key)
        if raw:
            try:
                return json.loads(raw)
            except Exception:
                return raw
        return None

    def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        try:
            return bool(self.client.set(key, value, ex=ex))
        except Exception:
            return self.fallback.set(key, value, ex=ex)

    def set_json(self, key: str, value: Any, ex: Optional[int] = None) -> bool:
        try:
            raw = json.dumps(value)
            return self.set(key, raw, ex=ex)
        except Exception:
            return False

    def delete(self, key: str) -> bool:
        try:
            return bool(self.client.delete(key))
        except Exception:
            return self.fallback.delete(key)

    def flush(self) -> bool:
        try:
            if self.is_redis:
                self.client.flushdb()
                return True
            return self.fallback.flush()
        except Exception:
            return self.fallback.flush()

    def get_info(self) -> dict:
        if self.is_redis:
            try:
                info = self.client.info("stats")
                return {
                    "type": "Redis Server",
                    "connected": True,
                    "total_connections_received": info.get("total_connections_received", 0),
                    "keyspace_hits": info.get("keyspace_hits", 0),
                    "keyspace_misses": info.get("keyspace_misses", 0)
                }
            except Exception:
                pass
        return self.fallback.stats()

cache = CacheManager()
