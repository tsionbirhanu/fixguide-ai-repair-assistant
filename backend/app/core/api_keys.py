"""Backend-only API key rotation helpers."""

from itertools import cycle
from threading import Lock
from typing import Iterable, Optional

from app.core.config import settings


class RoundRobinKeyRing:
    """Thread-safe round-robin key selector."""

    def __init__(self, keys: Iterable[str]):
        self._keys = [key for key in keys if key]
        self._cycle = cycle(self._keys) if self._keys else None
        self._lock = Lock()

    @property
    def available(self) -> bool:
        return bool(self._keys)

    def next(self) -> Optional[str]:
        if not self._cycle:
            return None
        with self._lock:
            return next(self._cycle)


_gemini_keys = RoundRobinKeyRing(settings.gemini_api_keys_list)
_tavily_keys = RoundRobinKeyRing(settings.tavily_api_keys_list)
_ifixit_app_ids = RoundRobinKeyRing(settings.ifixit_app_ids_list)


def get_next_gemini_api_key() -> Optional[str]:
    """Return the next configured Gemini API key."""
    return _gemini_keys.next()


def get_next_tavily_api_key() -> Optional[str]:
    """Return the next configured Tavily API key."""
    return _tavily_keys.next()


def get_next_ifixit_app_id() -> Optional[str]:
    """Return the next optional iFixit App ID."""
    return _ifixit_app_ids.next()


def has_gemini_api_key() -> bool:
    return _gemini_keys.available


def has_tavily_api_key() -> bool:
    return _tavily_keys.available


def has_ifixit_app_id() -> bool:
    return _ifixit_app_ids.available
