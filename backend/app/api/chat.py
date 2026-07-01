"""
Chat API Endpoints
Handles authentication, conversation management, and streaming repair chat.
"""

from datetime import datetime, timezone
from typing import AsyncGenerator, Dict, List, Optional
import json
import re
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, HumanMessage
from pydantic import BaseModel

from app.agent.graph import compile_agent
from app.core.auth import auth_service
from app.core.config import settings

router = APIRouter()

# Demo/fallback mode: in-memory conversation storage when DB is unavailable.
_demo_conversations: Dict[str, Dict[str, List[Dict]]] = {}
_demo_conversation_titles: Dict[str, Dict[str, str]] = {}
_MARKDOWN_IMAGE_RE = re.compile(r"!\[([^\]]*)\]\((https?://[^)\s]+)\)")


def _get_db_service():
    try:
        from app.core.database import db_service

        return db_service
    except Exception:
        return None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _is_demo_user(user_id: str) -> bool:
    return settings.DEMO_AUTH and str(user_id).startswith("demo_")


def _title_from_content(content: str) -> str:
    title = (content or "").strip()
    if not title or title == "[Image]":
        title = "New chat"
    return title[:50]


class ChatRequest(BaseModel):
    """Request model for chat endpoint."""

    message: str = ""
    thread_id: Optional[str] = None
    images: Optional[List[str]] = None


class AuthRequest(BaseModel):
    """Request model for authentication."""

    email: str
    password: str


class ConversationUpdateRequest(BaseModel):
    """Request model for conversation updates."""

    title: str


class UserStatsResponse(BaseModel):
    """Response model for user statistics."""

    total_messages: int
    total_tokens: int
    total_conversations: int


async def get_current_user(authorization: Optional[str] = Header(None)):
    """Dependency to get current authenticated user."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = authorization.replace("Bearer ", "", 1)
    user = await auth_service.get_user(token)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = dict(user)
    user["_access_token"] = token
    return user


@router.post("/auth/signup")
async def signup(request: AuthRequest):
    """Sign up a new user."""
    try:
        result = await auth_service.signup(request.email, request.password)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", result.get("message", "Signup failed")))

    return result


@router.post("/auth/login")
async def login(request: AuthRequest):
    """Login an existing user."""
    try:
        result = await auth_service.login(request.email, request.password)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))

    if not result["success"]:
        error_msg = result.get("error", result.get("message", "Login failed"))
        status = 400 if "required" in error_msg.lower() or "enter" in error_msg.lower() else 401
        raise HTTPException(status_code=status, detail=error_msg)

    return result


@router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """Logout. Always returns 200 so the frontend can clear local auth state."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "", 1)
        try:
            await auth_service.logout(token)
        except Exception:
            pass
    return {"success": True, "message": "Logout successful"}


def _store_demo_message(user_id: str, thread_id: str, role: str, content: str):
    """Store message in demo/fallback in-memory storage."""
    _demo_conversations.setdefault(user_id, {})
    _demo_conversations[user_id].setdefault(thread_id, [])
    _demo_conversations[user_id][thread_id].append(
        {
            "role": role,
            "content": content,
            "created_at": _now(),
        }
    )

    if role == "user":
        _demo_conversation_titles.setdefault(user_id, {})
        _demo_conversation_titles[user_id].setdefault(thread_id, _title_from_content(content))


def _list_demo_conversations(user_id: str) -> List[Dict]:
    conversations = []
    for thread_id, messages in _demo_conversations.get(user_id, {}).items():
        first_message = messages[0] if messages else {}
        last_message = messages[-1] if messages else {}
        first_user = next((m for m in messages if m.get("role") == "user"), {})
        title = _demo_conversation_titles.get(user_id, {}).get(thread_id)
        if not title:
            title = _title_from_content(first_user.get("content") or "")

        conversations.append(
            {
                "thread_id": thread_id,
                "title": title,
                "created_at": first_message.get("created_at"),
                "updated_at": last_message.get("created_at"),
            }
        )

    conversations.sort(key=lambda item: item.get("updated_at") or "", reverse=True)
    return conversations


def _delete_demo_conversation(user_id: str, thread_id: str):
    if user_id in _demo_conversations:
        _demo_conversations[user_id].pop(thread_id, None)
    if user_id in _demo_conversation_titles:
        _demo_conversation_titles[user_id].pop(thread_id, None)


def _demo_stats(user_id: str) -> UserStatsResponse:
    threads = _demo_conversations.get(user_id, {})
    total_messages = sum(len(messages) for messages in threads.values())
    total_tokens = sum(
        len((message.get("content") or "").split())
        for messages in threads.values()
        for message in messages
    )
    return UserStatsResponse(
        total_messages=total_messages,
        total_tokens=total_tokens,
        total_conversations=len(threads),
    )


@router.get("/stats")
async def get_user_stats(current_user: dict = Depends(get_current_user)) -> UserStatsResponse:
    """Get usage statistics for the current user."""
    user_id = current_user["id"]
    access_token = current_user.get("_access_token")

    if _is_demo_user(user_id):
        return _demo_stats(user_id)

    db = _get_db_service()
    if db:
        stats = await db.get_user_stats(user_id, access_token)
        if any(stats.values()) or user_id not in _demo_conversations:
            return UserStatsResponse(**stats)

    return _demo_stats(user_id)


@router.get("/chat/conversations")
async def list_conversations(current_user: dict = Depends(get_current_user)):
    """List the current user's conversations."""
    user_id = current_user["id"]
    access_token = current_user.get("_access_token")

    if _is_demo_user(user_id):
        return {"conversations": _list_demo_conversations(user_id)}

    db = _get_db_service()
    if db:
        conversations = await db.list_conversations(user_id, access_token)
        if conversations or user_id not in _demo_conversations:
            return {"conversations": conversations}

    return {"conversations": _list_demo_conversations(user_id)}


@router.patch("/chat/conversations/{thread_id}")
async def rename_conversation(
    thread_id: str,
    request: ConversationUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Rename a conversation."""
    title = _title_from_content(request.title)
    if not title or title == "New chat":
        raise HTTPException(status_code=400, detail="Conversation title is required")

    user_id = current_user["id"]
    access_token = current_user.get("_access_token")

    if _is_demo_user(user_id):
        _demo_conversation_titles.setdefault(user_id, {})[thread_id] = title
        return {"success": True, "conversation": {"thread_id": thread_id, "title": title}}

    db = _get_db_service()
    if db and await db.rename_conversation(user_id, thread_id, title, access_token):
        return {"success": True, "conversation": {"thread_id": thread_id, "title": title}}

    if user_id in _demo_conversations and thread_id in _demo_conversations[user_id]:
        _demo_conversation_titles.setdefault(user_id, {})[thread_id] = title
        return {"success": True, "conversation": {"thread_id": thread_id, "title": title}}

    raise HTTPException(status_code=503, detail="Conversation storage is not available")


@router.delete("/chat/conversations/{thread_id}")
async def delete_conversation(
    thread_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a conversation."""
    user_id = current_user["id"]
    access_token = current_user.get("_access_token")

    if _is_demo_user(user_id):
        _delete_demo_conversation(user_id, thread_id)
        return {"success": True}

    db = _get_db_service()
    db_deleted = await db.delete_conversation(user_id, thread_id, access_token) if db else False
    _delete_demo_conversation(user_id, thread_id)

    if db_deleted or not db:
        return {"success": True}

    raise HTTPException(status_code=503, detail="Conversation storage is not available")


@router.get("/chat/conversations/{thread_id}/messages")
async def get_conversation_messages(
    thread_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get messages for a conversation."""
    user_id = current_user["id"]
    access_token = current_user.get("_access_token")

    if _is_demo_user(user_id):
        messages = _demo_conversations.get(user_id, {}).get(thread_id, [])
        return {"messages": [{"role": m.get("role"), "content": m.get("content", "")} for m in messages]}

    db = _get_db_service()
    if db:
        history = await db.get_conversation_history(user_id, thread_id, access_token=access_token)
        if history:
            return {"messages": [{"role": m["role"], "content": m["content"]} for m in history]}

    messages = _demo_conversations.get(user_id, {}).get(thread_id, [])
    return {"messages": [{"role": m.get("role"), "content": m.get("content", "")} for m in messages]}


def _build_human_message(content: str, images: Optional[List[str]] = None) -> HumanMessage:
    """Build HumanMessage with optional image content for multimodal input."""
    if not images:
        return HumanMessage(content=content)

    parts = [{"type": "text", "text": content or "What can you tell me about this image?"}]
    for img_data in images[:4]:
        if img_data and img_data.startswith("data:image"):
            parts.append({"type": "image_url", "image_url": {"url": img_data}})
    return HumanMessage(content=parts)


def _content_to_text(value) -> str:
    """Convert LangChain event content into plain text."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        parts = []
        for item in value:
            if isinstance(item, dict):
                parts.append(str(item.get("text") or item.get("content") or ""))
            else:
                parts.append(_content_to_text(item))
        return "".join(parts)
    if hasattr(value, "content"):
        return _content_to_text(value.content)
    return str(value)


def _extract_markdown_images(text: str, limit: int = 8) -> List[str]:
    """Return unique Markdown image lines from tool output."""
    images = []
    seen_urls = set()
    for alt, url in _MARKDOWN_IMAGE_RE.findall(text or ""):
        if url in seen_urls:
            continue
        seen_urls.add(url)
        safe_alt = alt.strip() or "Repair image"
        images.append(f"![{safe_alt}]({url})")
        if len(images) >= limit:
            break
    return images


def _missing_image_section(response: str, tool_outputs: List[str]) -> str:
    """Build a reference-image section when the model omitted source images."""
    tool_images = _extract_markdown_images("\n".join(tool_outputs))
    if not tool_images:
        return ""

    response_urls = {url for _, url in _MARKDOWN_IMAGE_RE.findall(response or "")}
    missing_images = []
    for image in tool_images:
        match = _MARKDOWN_IMAGE_RE.search(image)
        if match and match.group(2) not in response_urls:
            missing_images.append(image)

    if not missing_images:
        return ""

    return "\n\n## Reference Images\n\n" + "\n\n".join(missing_images) + "\n\n"


async def _load_history_messages(user_id: str, thread_id: str, access_token: Optional[str]) -> List:
    """Load saved thread history as LangChain messages for the next agent turn."""
    rows: List[Dict] = []

    if not _is_demo_user(user_id):
        db = _get_db_service()
        if db:
            rows = await db.get_conversation_history(user_id, thread_id, limit=20, access_token=access_token)

    if not rows:
        rows = _demo_conversations.get(user_id, {}).get(thread_id, [])[-20:]

    messages = []
    for row in rows:
        role = row.get("role")
        content = row.get("content") or ""
        if role == "user":
            messages.append(HumanMessage(content=content))
        elif role == "assistant":
            messages.append(AIMessage(content=content))
    return messages


async def _save_user_message(
    user_id: str,
    thread_id: str,
    message: str,
    access_token: Optional[str],
):
    content = message or "[Image]"
    if _is_demo_user(user_id):
        _store_demo_message(user_id, thread_id, "user", content)
        return

    db = _get_db_service()
    if db:
        result = await db.save_message(
            user_id,
            thread_id,
            "user",
            content,
            tokens=len(message.split()),
            access_token=access_token,
        )
        if result.get("success"):
            return

    _store_demo_message(user_id, thread_id, "user", content)


async def _save_assistant_message(
    user_id: str,
    thread_id: str,
    message: str,
    access_token: Optional[str],
):
    tokens = len((message or "").split())
    if _is_demo_user(user_id):
        _store_demo_message(user_id, thread_id, "assistant", message)
        return

    db = _get_db_service()
    if db:
        result = await db.save_message(
            user_id,
            thread_id,
            "assistant",
            message,
            tokens=tokens,
            access_token=access_token,
        )
        if result.get("success"):
            await db.increment_token_usage(user_id, thread_id, tokens, access_token)
            return

    _store_demo_message(user_id, thread_id, "assistant", message)


async def stream_chat_response(
    message: str,
    thread_id: str,
    user_id: str,
    access_token: Optional[str],
    images: Optional[List[str]] = None,
) -> AsyncGenerator[str, None]:
    """Stream chat response from LangGraph agent as SSE."""
    try:
        thread_id = thread_id or str(uuid.uuid4())
        history_messages = await _load_history_messages(user_id, thread_id, access_token)
        await _save_user_message(user_id, thread_id, message, access_token)

        agent = compile_agent(checkpointer=None)
        config = {"configurable": {"thread_id": thread_id}}
        human_msg = _build_human_message(message, images)
        messages_for_agent = history_messages + [human_msg]

        yield f"data: {json.dumps({'type': 'status', 'content': 'Searching for repair guide...'})}\n\n"

        full_response = ""
        tool_outputs: List[str] = []

        async for event in agent.astream_events(
            {"messages": messages_for_agent},
            config=config,
            version="v2",
        ):
            kind = event.get("event")

            if kind == "on_chat_model_stream":
                raw = event.get("data", {}).get("chunk", {}).content
                if raw:
                    if isinstance(raw, list):
                        parts = []
                        for item in raw:
                            if isinstance(item, dict) and item.get("type") == "text":
                                parts.append(item.get("text", ""))
                            elif isinstance(item, str):
                                parts.append(item)
                        content = "".join(parts)
                    elif isinstance(raw, str):
                        content = raw
                    else:
                        content = str(raw)

                    if content:
                        full_response += content
                        yield f"data: {json.dumps({'type': 'token', 'content': content})}\n\n"

            elif kind == "on_tool_start":
                tool_name = event.get("name", "tool")
                yield f"data: {json.dumps({'type': 'status', 'content': f'Using {tool_name}...'})}\n\n"

            elif kind == "on_tool_end":
                tool_output = event.get("data", {}).get("output")
                tool_output_text = _content_to_text(tool_output)
                if tool_output_text:
                    tool_outputs.append(tool_output_text)
                yield f"data: {json.dumps({'type': 'status', 'content': 'Processing results...'})}\n\n"

        image_section = _missing_image_section(full_response, tool_outputs)
        if image_section:
            full_response += image_section
            yield f"data: {json.dumps({'type': 'token', 'content': image_section})}\n\n"

        await _save_assistant_message(user_id, thread_id, full_response, access_token)
        yield f"data: {json.dumps({'type': 'done', 'thread_id': thread_id})}\n\n"

    except Exception as e:
        raw = str(e)
        if "429" in raw or "RESOURCE_EXHAUSTED" in raw or "quota" in raw.lower():
            error_message = "API rate limit reached. Please wait a minute and try again, or check your Gemini API quota at ai.google.dev."
        elif "404" in raw or "NOT_FOUND" in raw:
            error_message = "The AI model is temporarily unavailable. Please try again later."
        else:
            error_message = raw

        fallback_thread_id = thread_id or str(uuid.uuid4())
        _store_demo_message(user_id, fallback_thread_id, "assistant", f"I encountered an error: {error_message}")
        yield f"data: {json.dumps({'type': 'error', 'content': error_message, 'thread_id': fallback_thread_id})}\n\n"


@router.post("/chat/stream")
async def stream_chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """Stream chat responses from the AI agent. Requires authentication."""
    user_id = current_user["id"]
    access_token = current_user.get("_access_token")
    thread_id = request.thread_id or str(uuid.uuid4())

    return StreamingResponse(
        stream_chat_response(request.message, thread_id, user_id, access_token, request.images),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
