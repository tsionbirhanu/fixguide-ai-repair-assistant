"""
Chat API Endpoints
Handles streaming chat interactions with the AI repair assistant
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, AsyncGenerator
import asyncio
import json
import uuid
from langchain_core.messages import HumanMessage
from app.agent.graph import compile_agent
from app.core.auth import auth_service
from app.core.database import db_service

router = APIRouter()


class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    message: str
    thread_id: Optional[str] = None


class AuthRequest(BaseModel):
    """Request model for authentication"""
    email: str
    password: str


class UserStatsResponse(BaseModel):
    """Response model for user statistics"""
    total_messages: int
    total_tokens: int
    total_conversations: int


async def get_current_user(authorization: str = Header(None)):
    """Dependency to get current authenticated user"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    user = await auth_service.get_user(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return user


@router.post("/auth/signup")
async def signup(request: AuthRequest):
    """Sign up a new user"""
    result = await auth_service.signup(request.email, request.password)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Signup failed"))
    
    return result


@router.post("/auth/login")
async def login(request: AuthRequest):
    """Login an existing user"""
    result = await auth_service.login(request.email, request.password)
    
    if not result["success"]:
        raise HTTPException(status_code=401, detail=result.get("error", "Login failed"))
    
    return result


@router.post("/auth/logout")
async def logout(current_user: dict = Depends(get_current_user), authorization: str = Header(None)):
    """Logout the current user"""
    token = authorization.replace("Bearer ", "")
    result = await auth_service.logout(token)
    return result


@router.get("/stats")
async def get_user_stats(current_user: dict = Depends(get_current_user)) -> UserStatsResponse:
    """Get usage statistics for the current user"""
    user_id = current_user["id"]
    stats = await db_service.get_user_stats(user_id)
    return UserStatsResponse(**stats)


async def stream_chat_response(message: str, thread_id: str, user_id: str) -> AsyncGenerator[str, None]:
    """
    Stream chat response from LangGraph agent
    Yields Server-Sent Events (SSE) format
    """
    try:
        # Compile the agent
        agent = compile_agent()
        
        # Create thread ID if not provided
        if not thread_id:
            thread_id = str(uuid.uuid4())
        
        # Configuration for the agent
        config = {
            "configurable": {"thread_id": thread_id}
        }
        
        # Save user message to database
        await db_service.save_message(user_id, thread_id, "user", message, tokens=len(message.split()))
        
        # Send status update
        yield f"data: {json.dumps({'type': 'status', 'content': 'Searching for repair guide...'})}\n\n"
        
        # Stream the agent's response
        full_response = ""
        token_count = 0
        
        async for event in agent.astream_events(
            {"messages": [HumanMessage(content=message)]},
            config=config,
            version="v2"
        ):
            kind = event.get("event")
            
            # Handle different event types
            if kind == "on_chat_model_stream":
                # Stream tokens from the model
                content = event.get("data", {}).get("chunk", {}).content
                if content:
                    full_response += content
                    token_count += 1
                    yield f"data: {json.dumps({'type': 'token', 'content': content})}\n\n"
            
            elif kind == "on_tool_start":
                # Tool execution started
                tool_name = event.get("name", "tool")
                yield f"data: {json.dumps({'type': 'status', 'content': f'Using {tool_name}...'})}\n\n"
            
            elif kind == "on_tool_end":
                # Tool execution completed
                yield f"data: {json.dumps({'type': 'status', 'content': 'Processing results...'})}\n\n"
        
        # Save assistant response to database
        await db_service.save_message(user_id, thread_id, "assistant", full_response, tokens=token_count)
        
        # Save token usage
        await db_service.increment_token_usage(user_id, thread_id, token_count)
        
        # Send completion event
        yield f"data: {json.dumps({'type': 'done', 'thread_id': thread_id})}\n\n"
        
    except Exception as e:
        error_message = f"Error: {str(e)}"
        yield f"data: {json.dumps({'type': 'error', 'content': error_message})}\n\n"


@router.post("/chat/stream")
async def stream_chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Stream chat responses from the AI agent
    Requires authentication
    """
    user_id = current_user["id"]
    thread_id = request.thread_id or str(uuid.uuid4())
    
    return StreamingResponse(
        stream_chat_response(request.message, thread_id, user_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )

