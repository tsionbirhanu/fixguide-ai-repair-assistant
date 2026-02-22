"""
Supabase Authentication Service
Handles user signup, login, and session management
"""

from typing import Optional, Dict
from supabase import create_client, Client
from app.core.config import settings


class AuthService:
    """Supabase authentication service"""
    
    def __init__(self):
        if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
            raise ValueError("Supabase credentials not configured in .env")
        
        self.client: Client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_ANON_KEY
        )
    
    async def signup(self, email: str, password: str) -> Dict:
        """
        Create a new user account
        
        Args:
            email: User's email address
            password: User's password (min 6 characters)
        
        Returns:
            Dict with user data and session
        """
        try:
            response = self.client.auth.sign_up({
                "email": email,
                "password": password
            })
            
            return {
                "success": True,
                "user": response.user.model_dump() if response.user else None,
                "session": response.session.model_dump() if response.session else None,
                "message": "Signup successful. Please check your email for verification."
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": "Signup failed"
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
        try:
            response = self.client.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            return {
                "success": True,
                "user": response.user.model_dump() if response.user else None,
                "session": response.session.model_dump() if response.session else None,
                "access_token": response.session.access_token if response.session else None,
                "message": "Login successful"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": "Login failed. Please check your credentials."
            }
    
    async def logout(self, access_token: str) -> Dict:
        """
        Logout the current user
        
        Args:
            access_token: JWT access token from session
        
        Returns:
            Dict with success status
        """
        try:
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
            access_token: JWT access token
        
        Returns:
            User data or None
        """
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
