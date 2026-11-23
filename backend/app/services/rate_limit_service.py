import time
from collections import defaultdict
from threading import Lock
from typing import Tuple
from backend.app.config import settings

class RateLimiter:
    def __init__(self, max_requests: int = 15, window_seconds: int = 3600):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = defaultdict(list)
        self.lock = Lock()

    def check_rate_limit(self, user_id: str) -> Tuple[bool, int]:
        """
        Check if user is allowed to make a request.
        Returns: (is_allowed: bool, retry_after_seconds: int)
        """
        now = time.time()
        with self.lock:
            # Clean expired timestamps
            cutoff = now - self.window_seconds
            self.requests[user_id] = [t for t in self.requests[user_id] if t > cutoff]

            if len(self.requests[user_id]) >= self.max_requests:
                oldest = self.requests[user_id][0]
                retry_after = int(self.window_seconds - (now - oldest))
                return False, max(1, retry_after)

            # Record this request
            self.requests[user_id].append(now)
            return True, 0

explain_rate_limiter = RateLimiter(
    max_requests=settings.MAX_EXPLANATIONS_PER_HOUR,
    window_seconds=3600
)
