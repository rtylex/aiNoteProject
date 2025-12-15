"""
Query limit service for tracking and enforcing daily query limits.
"""
import datetime
from sqlalchemy.orm import Session
from app.models.user import UserProfile

# Daily query limit per user
DAILY_QUERY_LIMIT = 10


def check_query_limit(user_profile: UserProfile, db: Session) -> dict:
    """
    Check if user has remaining queries and return status.
    
    Returns:
        dict with 'allowed', 'remaining', 'limit', 'reset_time'
    """
    today = datetime.date.today()
    
    # Reset counter if it's a new day
    if user_profile.last_query_date != today:
        user_profile.daily_query_count = 0
        user_profile.last_query_date = today
        db.commit()
    
    remaining = DAILY_QUERY_LIMIT - user_profile.daily_query_count
    
    return {
        "allowed": remaining > 0,
        "remaining": max(0, remaining),
        "limit": DAILY_QUERY_LIMIT,
        "used": user_profile.daily_query_count
    }


def increment_query_count(user_profile: UserProfile, db: Session) -> dict:
    """
    Increment the user's query count and return updated status.
    Should be called AFTER a successful AI query.
    
    Returns:
        dict with 'remaining', 'limit', 'used'
    """
    today = datetime.date.today()
    
    # Reset counter if it's a new day
    if user_profile.last_query_date != today:
        user_profile.daily_query_count = 0
        user_profile.last_query_date = today
    
    user_profile.daily_query_count += 1
    db.commit()
    
    remaining = DAILY_QUERY_LIMIT - user_profile.daily_query_count
    
    return {
        "remaining": max(0, remaining),
        "limit": DAILY_QUERY_LIMIT,
        "used": user_profile.daily_query_count
    }


def get_query_status(user_profile: UserProfile) -> dict:
    """
    Get current query status without modifying anything.
    """
    today = datetime.date.today()
    
    # Check if counter should be reset (but don't actually reset)
    if user_profile.last_query_date != today:
        return {
            "remaining": DAILY_QUERY_LIMIT,
            "limit": DAILY_QUERY_LIMIT,
            "used": 0
        }
    
    remaining = DAILY_QUERY_LIMIT - user_profile.daily_query_count
    
    return {
        "remaining": max(0, remaining),
        "limit": DAILY_QUERY_LIMIT,
        "used": user_profile.daily_query_count
    }
