"""
LangGraph Agent for Repair Assistant
Uses Gemini AI with iFixit and web search tools
"""

from typing import Literal
from langgraph.graph import StateGraph, MessagesState, START, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage
from app.core.config import settings
from app.agent.ifixit_tool import search_ifixit_repair_guide
from app.agent.web_search_tool import search_web_for_repair_solution


# System prompt for the agent
SYSTEM_PROMPT = """You are FixGuide AI, an expert repair assistant that helps users fix electronics.

**Your primary goal:** Find verified, official repair guides from iFixit.com

**How you work:**
1. **First Priority - iFixit Search:** ALWAYS try searching iFixit for official repair guides first using the search_ifixit_repair_guide tool
2. **Fallback - Web Search:** ONLY if iFixit returns no results or says "not found", then use the search_web_for_repair_solution tool
3. **Never Hallucinate:** Do NOT make up repair steps. Always rely on the tools to provide information
4. **Be Clear:** Explain what you're doing ("Searching iFixit for...", "No iFixit guide found, searching the web...")

**Important Rules:**
- Never invent repair steps or procedures
- Always cite your sources (iFixit or web)
- If both tools fail, admit you don't have information
- Present repair steps clearly with proper formatting
- Warn users about safety concerns when applicable

**Response Style:**
- Be concise but thorough
- Use proper Markdown formatting
- Include images from repair guides when available
- Provide step-by-step instructions clearly
"""


class AgentState(MessagesState):
    """Extended state for tracking token usage and metadata"""
    token_count: int = 0
    user_id: str = ""


_DEFAULT_CHECKPOINTER = MemorySaver()
_DEFAULT_COMPILED_AGENT = None
_NO_CHECKPOINT_COMPILED_AGENT = None
_USE_DEFAULT_CHECKPOINTER = object()


def create_agent():
    """
    Create the LangGraph agent with tools
    """
    # Initialize Gemini model
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_flash_2_5_key_here":
        raise ValueError("GEMINI_API_KEY not configured in .env file")
    
    model = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.2,  # Lower temperature for more factual responses
        streaming=True
    )
    
    # Bind tools to the model
    tools = [search_ifixit_repair_guide, search_web_for_repair_solution]
    model_with_tools = model.bind_tools(tools)
    
    # Define the agent logic
    def should_continue(state: AgentState) -> Literal["tools", "end"]:
        """Determine if the agent should continue with tool calls or end"""
        messages = state["messages"]
        last_message = messages[-1]
        
        # If there are tool calls, continue to tools
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "tools"
        
        # Otherwise, end
        return "end"
    
    def call_model(state: AgentState):
        """Call the model with the current state"""
        messages = state["messages"]
        
        # Add system prompt if this is the first message
        if len(messages) == 1 or not any(isinstance(m, SystemMessage) for m in messages):
            messages = [SystemMessage(content=SYSTEM_PROMPT)] + messages
        
        response = model_with_tools.invoke(messages)
        return {"messages": [response]}
    
    # Build the graph
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("agent", call_model)
    workflow.add_node("tools", ToolNode(tools))
    
    # Add edges
    workflow.add_edge(START, "agent")
    workflow.add_conditional_edges(
        "agent",
        should_continue,
        {
            "tools": "tools",
            "end": END
        }
    )
    workflow.add_edge("tools", "agent")
    
    return workflow


async def get_checkpointer():
    """Return the process-local checkpointer used by default."""
    return _DEFAULT_CHECKPOINTER


def compile_agent(checkpointer=_USE_DEFAULT_CHECKPOINTER):
    """
    Compile the agent workflow.

    By default the compiled graph uses a process-local MemorySaver. Passing
    checkpointer=None compiles a graph without checkpointing, which is useful
    when the caller explicitly supplies persisted message history.
    """
    global _DEFAULT_COMPILED_AGENT, _NO_CHECKPOINT_COMPILED_AGENT

    if checkpointer is _USE_DEFAULT_CHECKPOINTER:
        if _DEFAULT_COMPILED_AGENT is None:
            _DEFAULT_COMPILED_AGENT = create_agent().compile(checkpointer=_DEFAULT_CHECKPOINTER)
        return _DEFAULT_COMPILED_AGENT

    if checkpointer is None:
        if _NO_CHECKPOINT_COMPILED_AGENT is None:
            _NO_CHECKPOINT_COMPILED_AGENT = create_agent().compile()
        return _NO_CHECKPOINT_COMPILED_AGENT

    return create_agent().compile(checkpointer=checkpointer)
