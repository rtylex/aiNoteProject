from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from app.core.config import settings


supabase_client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

security = HTTPBearer()


def _fetch_user_from_supabase(token: str) -> dict | None:
    try:
        user_response = supabase_client.auth.get_user(token)
    except Exception as e:
        print(f"DEBUG: Supabase auth.get_user failed - {type(e).__name__}: {str(e)}")
        return None

    if not user_response or not user_response.user:
        print("DEBUG: Supabase user_response is empty")
        return None

    user = user_response.user
    result = {
        "sub": user.id, 
        "email": user.email,
        "user_metadata": user.user_metadata  # Include user_metadata for full_name etc.
    }
    print(f"DEBUG: Supabase auth successful, sub: {result.get('sub')}, metadata keys: {list(user.user_metadata.keys()) if user.user_metadata else 'None'}")
    return result


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    print(f"DEBUG: Attempting to authenticate with token (first 20 chars): {token[:20]}...")

    user = _fetch_user_from_supabase(token)
    if user:
        print(f"DEBUG: Auth successful via Supabase, returning user: {user.get('sub')}")
        return user

    print("ERROR: Supabase auth failed!")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
