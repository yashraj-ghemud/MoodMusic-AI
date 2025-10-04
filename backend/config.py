import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Application configuration sourced from environment variables."""

    GEMINI_API_KEY = os.getenv("AIzaSyCEREzbEckLJelJmjxAwWRypXrvp7LbwYg")
    YOUTUBE_API_KEY = os.getenv("AIzaSyAYL3duABk7mvYKMCRY6INN07Bie3IcCSc")
    SPOTIFY_CLIENT_ID = os.getenv("00248fac8bde4e13babe59c32b6c3389")
    SPOTIFY_CLIENT_SECRET = os.getenv("e007816059524a6591ac94c8b07278d7")

    DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "5000"))
