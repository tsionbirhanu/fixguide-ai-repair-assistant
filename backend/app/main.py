"""
FixGuideAI Backend - Main Application Entry Point
FastAPI server for AI-powered repair assistant
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import chat

# Initialize FastAPI app
app = FastAPI(
    title="FixGuideAI",
    description="AI-powered repair assistant backend",
    version="0.1.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router, prefix="/api", tags=["chat"])


@app.get("/health")
async def health_check():
    """
    Health check endpoint to verify service is running
    """
    return {
        "status": "healthy",
        "service": "FixGuideAI Backend",
        "version": "0.1.0"
    }


@app.get("/")
async def root():
    """
    Root endpoint with API information
    """
    return {
        "message": "FixGuideAI Backend API",
        "docs": "/docs",
        "health": "/health"
    }
