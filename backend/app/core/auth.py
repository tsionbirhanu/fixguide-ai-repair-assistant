"""
Supabase Authentication Service
Handles user signup, login, and session management
"""

import re
import uuid
import base64
from typing import Optional, Dict
from supabase import create_client, Client
from app.core.config import settings

# In-memory store for demo auth users (token -> user dict)
_demo_users: Dict[str, Dict] = {}


def _encode_demo_email(email: str) -> str:
    encoded = base64.urlsafe_b64encode(email.encode("utf-8")).decode("ascii")
    return encoded.rstrip("=")


def _decode_demo_email(encoded: str) -> Optional[str]:
    try:
        padding = "=" * (-len(encoded) % 4)
        return base64.urlsafe_b64decode(f"{encoded}{padding}").decode("utf-8")
    except Exception:
        return None


def _create_demo_user(email: str) -> Dict:
    """Create a demo user with a reload-tolerant token."""
    demo_token = f"demo_{_encode_demo_email(email)}.{uuid.uuid4().hex}"
    demo_user = {"id": demo_token, "email": email}
    _demo_users[demo_token] = demo_user
    return demo_user


def _recover_demo_user(access_token: str) -> Dict:
    """Recover enough demo identity from an existing token after server reload."""
    encoded_email = access_token.removeprefix("demo_").rsplit(".", 1)[0]
    email = _decode_demo_email(encoded_email) or "demo@local.dev"
    demo_user = {"id": access_token, "email": email}
    _demo_users[access_token] = demo_user
    return demo_user


def _serialize_obj(obj) -> Optional[dict]:
    """Safely serialize Supabase response objects to dict."""
    if obj is None:
        return None
    try:
        return obj.model_dump() if hasattr(obj, "model_dump") else obj.dict()
    except Exception:
        return {"id": getattr(obj, "id", None), "email": getattr(obj, "email", None)}


def _extract_error_message(exc: Exception) -> str:
    """Extract user-friendly error message from auth exceptions."""
    msg = ""
    if hasattr(exc, "msg") and exc.msg:
        msg = str(exc.msg)
    elif hasattr(exc, "message") and exc.message:
        msg = str(exc.message)
    else:
        msg = str(exc)

    normalized = msg.lower()

    # Network/DNS errors (getaddrinfo failed = cannot resolve hostname or no internet)
    if "getaddrinfo failed" in normalized or "11001" in msg or "errno 11001" in normalized:
        return "Cannot connect to Supabase. Check your internet connection and that SUPABASE_URL in .env is correct (e.g. https://xxx.supabase.co)."
    if "connection" in normalized and ("refused" in normalized or "failed" in normalized or "reset" in normalized):
        return "Cannot reach Supabase. Please check your internet connection."

    # Common Supabase error patterns - make them more user-friendly
    if "already registered" in normalized or "already been registered" in normalized or "already exists" in normalized:
        return "This email is already registered. Please sign in instead."
    if "email not confirmed" in normalized or "email_not_confirmed" in normalized or "confirm" in normalized:
        return "Please confirm your email address before signing in. Check your inbox or spam folder."
    if "invalid login" in normalized or "invalid_credentials" in normalized or "invalid email or password" in normalized:
        return "Email or password is incorrect. If you just signed up, confirm your email first, then sign in."
    if "signup" in normalized and "disabled" in normalized:
        return "New account signup is currently disabled for this project."
    if "email" in normalized and ("invalid" in normalized or "not valid" in normalized):
        return "Please enter a valid email address."
    if "password" in normalized and ("short" in normalized or "least" in normalized):
        return "Password must be at least 6 characters long."
    return msg if msg else "Authentication failed. Please try again."




class AuthService:
    """Supabase authentication service"""
    
    def __init__(self):
        self._client: Optional[Client] = None
        self._admin_client: Optional[Client] = None
    
    @property
    def client(self) -> Client:
        if self._client is None:
            if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
                raise ValueError(
                    "Supabase credentials not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to .env"
                )
            self._client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_ANON_KEY
            )
        return self._client

    @property
    def admin_client(self) -> Client:
        if self._admin_client is None:
            if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
                raise ValueError(
                    "Supabase service credentials not configured. Add SUPABASE_SERVICE_KEY to .env"
                )
            self._admin_client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_KEY
            )
        return self._admin_client
    
    async def signup(self, email: str, password: str) -> Dict:
        """
        Create a new user account
        
        Args:
            email: User's email address
            password: User's password (min 6 characters)
        
        Returns:
            Dict with user data and session
        """
        # Input validation
        email = (email or "").strip()
        if not email:
            return {"success": False, "error": "Email is required", "message": "Please enter your email."}
        if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
            return {"success": False, "error": "Invalid email format", "message": "Please enter a valid email address."}
        if not password or len(password) < 6:
            return {"success": False, "error": "Password too short", "message": "Password must be at least 6 characters long."}

        # Demo auth - bypass Supabase when unreachable (local dev, no internet)
        if settings.DEMO_AUTH:
            demo_user = _create_demo_user(email)
            demo_token = demo_user["id"]
            return {
                "success": True,
                "user": demo_user,
                "session": {"access_token": demo_token},
                "access_token": demo_token,
                "message": "Signup successful (demo mode)."
            }

        try:
            response = self.client.auth.sign_up({
                "email": email,
                "password": password
            })
            
            access_token = response.session.access_token if response.session else None
            return {
                "success": True,
                "user": _serialize_obj(response.user),
                "session": _serialize_obj(response.session),
                "access_token": access_token,
                "message": "Signup successful. Please check your email for verification."
            }
        except Exception as e:
            return {
                "success": False,
                "error": _extract_error_message(e),
                "message": _extract_error_message(e)
            }
    
    async def login(self, email: str, password: str) -> Dict:
        """
        Login an existing user
        
        Args:
            email: User's email
            password: User's password
        
        Returns:
            Dict with user data and session token
        """
        # Input validation
        email = (email or "").strip()
        if not email:
            return {"success": False, "error": "Email is required", "message": "Please enter your email."}
        if not password:
            return {"success": False, "error": "Password is required", "message": "Please enter your password."}

        # Demo auth - bypass Supabase when unreachable
        if settings.DEMO_AUTH:
            demo_user = _create_demo_user(email)
            demo_token = demo_user["id"]
            return {
                "success": True,
                "user": demo_user,
                "session": {"access_token": demo_token},
                "access_token": demo_token,
                "message": "Login successful (demo mode)."
            }

        try:
            response = self.client.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            access_token = response.session.access_token if response.session else None
            return {
                "success": True,
                "user": _serialize_obj(response.user),
                "session": _serialize_obj(response.session),
                "access_token": access_token,
                "message": "Login successful"
            }
        except Exception as e:
            return {
                "success": False,
                "error": _extract_error_message(e),
                "message": _extract_error_message(e)
            }
    
    async def logout(self, access_token: str) -> Dict:
        """
        Logout the current user
        
        Args:
            access_token: JWT access token from session
        
        Returns:
            Dict with success status
        """
        if settings.DEMO_AUTH and access_token and access_token.startswith("demo_"):
            _demo_users.pop(access_token, None)
            return {"success": True, "message": "Logout successful"}
        
        try:
            if settings.SUPABASE_SERVICE_KEY:
                self.admin_client.auth.admin.sign_out(access_token)
            else:
                self.client.auth.sign_out()
            return {
                "success": True,
                "message": "Logout successful"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": "Logout failed"
            }
    
    async def get_user(self, access_token: str) -> Optional[Dict]:
        """
        Get current user from access token
        
        Args:
            access_token: JWT access token or demo token
        
        Returns:
            User data or None
        """
        # Demo auth - accept demo tokens
        if settings.DEMO_AUTH and access_token and access_token.startswith("demo_"):
            return _demo_users.get(access_token) or _recover_demo_user(access_token)
        
        try:
            response = self.client.auth.get_user(access_token)
            return response.user.model_dump() if response.user else None
        except Exception as e:
            print(f"Error getting user: {e}")
            return None
    
    async def verify_token(self, access_token: str) -> bool:
        """
        Verify if an access token is valid
        
        Args:
            access_token: JWT access token to verify
        
        Returns:
            True if valid, False otherwise
        """
        user = await self.get_user(access_token)
        return user is not None
    
    async def refresh_session(self, refresh_token: str) -> Dict:
        """
        Refresh an expired session
        
        Args:
            refresh_token: Refresh token from previous session
        
        Returns:
            New session data
        """
        try:
            response = self.client.auth.refresh_session(refresh_token)
            return {
                "success": True,
                "session": response.session.model_dump() if response.session else None,
                "access_token": response.session.access_token if response.session else None
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": "Session refresh failed"
            }


# Global auth service instance
auth_service = AuthService()
