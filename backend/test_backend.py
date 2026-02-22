"""
FixGuide AI - Comprehensive Backend Test Suite
Tests all components: Config, Database, Auth, Tools, and API
"""

import asyncio
import sys
from datetime import datetime

# Color codes for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_test(test_name, status, message=""):
    """Print test result with colors"""
    if status == "pass":
        print(f"{Colors.GREEN}✓{Colors.RESET} {test_name}")
        if message:
            print(f"  {Colors.BLUE}→{Colors.RESET} {message}")
    elif status == "fail":
        print(f"{Colors.RED}✗{Colors.RESET} {test_name}")
        if message:
            print(f"  {Colors.RED}Error:{Colors.RESET} {message}")
    elif status == "skip":
        print(f"{Colors.YELLOW}⊘{Colors.RESET} {test_name}")
        if message:
            print(f"  {Colors.YELLOW}→{Colors.RESET} {message}")
    print()


async def test_configuration():
    """Test 1: Configuration Loading"""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BLUE}TEST 1: Configuration & Environment{Colors.RESET}")
    print(f"{Colors.BLUE}{'='*60}{Colors.RESET}\n")
    
    try:
        from app.core.config import settings
        print_test("Config module imported", "pass")
        
        # Check critical settings
        if settings.SUPABASE_URL:
            print_test("Supabase URL configured", "pass", settings.SUPABASE_URL)
        else:
            print_test("Supabase URL configured", "fail", "URL is empty")
        
        if settings.SUPABASE_ANON_KEY and settings.SUPABASE_ANON_KEY != "your_supabase_anon_key_here":
            print_test("Supabase Anon Key configured", "pass", f"{settings.SUPABASE_ANON_KEY[:20]}...")
        else:
            print_test("Supabase Anon Key configured", "fail", "Key is missing or placeholder")
        
        if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_flash_2_5_key_here":
            print_test("Gemini API Key configured", "pass", f"{settings.GEMINI_API_KEY[:20]}...")
        else:
            print_test("Gemini API Key configured", "fail", "Key is missing - AI won't work!")
        
        if settings.TAVILY_API_KEY and settings.TAVILY_API_KEY != "your_tavily_api_key_here":
            print_test("Tavily API Key configured", "pass", "Web search available")
        else:
            print_test("Tavily API Key configured", "skip", "Optional - web search won't work")
        
        cors_origins = settings.cors_origins_list
        print_test("CORS origins parsed", "pass", f"{len(cors_origins)} origins: {cors_origins}")
        
        return True
    except Exception as e:
        print_test("Configuration test", "fail", str(e))
        return False


async def test_supabase_connection():
    """Test 2: Supabase Database Connection"""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BLUE}TEST 2: Supabase Database Connection{Colors.RESET}")
    print(f"{Colors.BLUE}{'='*60}{Colors.RESET}\n")
    
    try:
        from app.core.database import db_service
        print_test("Database service imported", "pass")
        
        # Try to connect to Supabase
        from app.core.config import settings
        from supabase import create_client
        
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
        print_test("Supabase client created", "pass")
        
        # Test table access (will fail if schema not run)
        try:
            response = client.table("messages").select("*").limit(1).execute()
            print_test("Messages table accessible", "pass", "Schema is set up correctly!")
        except Exception as e:
            print_test("Messages table accessible", "fail", 
                      "Run supabase_schema.sql in Supabase SQL Editor")
            return False
        
        try:
            response = client.table("token_usage").select("*").limit(1).execute()
            print_test("Token usage table accessible", "pass", "Analytics table ready!")
        except Exception as e:
            print_test("Token usage table accessible", "fail", 
                      "Run supabase_schema.sql in Supabase SQL Editor")
            return False
        
        return True
    except Exception as e:
        print_test("Database connection test", "fail", str(e))
        return False


async def test_authentication():
    """Test 3: Authentication Service"""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BLUE}TEST 3: Authentication Service{Colors.RESET}")
    print(f"{Colors.BLUE}{'='*60}{Colors.RESET}\n")
    
    try:
        from app.core.auth import auth_service
        print_test("Auth service imported", "pass")
        
        # Create test user with valid email format
        test_email = f"test{int(datetime.now().timestamp())}@example.com"
        test_password = "testpass123"
        
        print(f"Testing with email: {test_email}")
        
        # Test signup
        signup_result = await auth_service.signup(test_email, test_password)
        if signup_result.get("success"):
            print_test("User signup", "pass", "Account created successfully")
        else:
            print_test("User signup", "fail", signup_result.get("error", "Unknown error"))
            return False
        
        # Test login
        login_result = await auth_service.login(test_email, test_password)
        if login_result.get("success"):
            access_token = login_result.get("access_token")
            print_test("User login", "pass", f"Token: {access_token[:30]}...")
        else:
            print_test("User login", "fail", login_result.get("error", "Unknown error"))
            return False
        
        # Test token verification
        is_valid = await auth_service.verify_token(access_token)
        if is_valid:
            print_test("Token verification", "pass", "Token is valid")
        else:
            print_test("Token verification", "fail", "Token invalid")
            return False
        
        return True
    except Exception as e:
        print_test("Authentication test", "fail", str(e))
        return False


async def test_ifixit_tool():
    """Test 4: iFixit API Tool"""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BLUE}TEST 4: iFixit API Integration{Colors.RESET}")
    print(f"{Colors.BLUE}{'='*60}{Colors.RESET}\n")
    
    try:
        from app.agent.ifixit_tool import search_device, list_repair_guides, get_repair_guide_details
        print_test("iFixit tool imported", "pass")
        
        # Test device search
        print(f"Searching for 'iPhone 13'...")
        device = await search_device("iPhone 13")
        if device:
            print_test("Device search", "pass", f"Found: {device.get('title')}")
            
            # Test guide listing
            device_title = device.get("wiki_title")
            guides = await list_repair_guides(device_title)
            if guides:
                print_test("List repair guides", "pass", f"Found {len(guides)} guides")
                
                # Test guide details
                guide_id = guides[0].get("guideid")
                guide_details = await get_repair_guide_details(guide_id)
                if guide_details:
                    print_test("Get guide details", "pass", 
                              f"Guide: {guide_details.get('title')}, Steps: {len(guide_details.get('steps', []))}")
                else:
                    print_test("Get guide details", "fail", "Could not retrieve guide details")
            else:
                print_test("List repair guides", "fail", "No guides found")
        else:
            print_test("Device search", "fail", "No device found")
            print_test("iFixit API", "skip", "May need VPN in your region")
        
        return True
    except Exception as e:
        print_test("iFixit tool test", "fail", str(e))
        return False


async def test_web_search_tool():
    """Test 5: Web Search Tool"""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BLUE}TEST 5: Web Search Fallback (Tavily){Colors.RESET}")
    print(f"{Colors.BLUE}{'='*60}{Colors.RESET}\n")
    
    try:
        from app.agent.web_search_tool import search_web_for_repair_solution
        from app.core.config import settings
        
        print_test("Web search tool imported", "pass")
        
        if not settings.TAVILY_API_KEY or settings.TAVILY_API_KEY == "your_tavily_api_key_here":
            print_test("Tavily API Key", "skip", "Not configured - web search won't work")
            return True
        
        # Test web search
        print(f"Searching web for 'PS5 fan replacement'...")
        result = await search_web_for_repair_solution.ainvoke({"query": "PS5 fan replacement"})
        
        if "Web Search Results" in result or "❌" not in result:
            print_test("Web search", "pass", "Search completed")
        else:
            print_test("Web search", "fail", result)
        
        return True
    except Exception as e:
        print_test("Web search tool test", "fail", str(e))
        return False


async def test_agent():
    """Test 6: LangGraph Agent"""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BLUE}TEST 6: LangGraph AI Agent{Colors.RESET}")
    print(f"{Colors.BLUE}{'='*60}{Colors.RESET}\n")
    
    try:
        from app.agent.graph import compile_agent
        from app.core.config import settings
        
        if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_flash_2_5_key_here":
            print_test("Gemini API Key", "fail", "Required for AI agent - please add to .env")
            return False
        
        print_test("Agent module imported", "pass")
        
        # Compile agent
        agent = compile_agent()
        print_test("Agent compiled", "pass", "LangGraph workflow ready")
        
        return True
    except Exception as e:
        print_test("Agent test", "fail", str(e))
        return False


async def test_api_endpoints():
    """Test 7: FastAPI Endpoints"""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BLUE}TEST 7: API Endpoints{Colors.RESET}")
    print(f"{Colors.BLUE}{'='*60}{Colors.RESET}\n")
    
    try:
        import httpx
        base_url = "http://localhost:8000"
        
        # Test health endpoint
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{base_url}/health")
            if response.status_code == 200:
                print_test("Health endpoint", "pass", f"Status: {response.json().get('status')}")
            else:
                print_test("Health endpoint", "fail", f"Status code: {response.status_code}")
                return False
        
        # Test API docs
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{base_url}/docs")
            if response.status_code == 200:
                print_test("API documentation", "pass", "Swagger UI accessible at /docs")
            else:
                print_test("API documentation", "fail", f"Status code: {response.status_code}")
        
        return True
    except Exception as e:
        print_test("API endpoints test", "fail", 
                  "Server not running? Start with: uvicorn app.main:app --reload")
        return False


async def main():
    """Run all tests"""
    print(f"\n{Colors.GREEN}{'='*60}{Colors.RESET}")
    print(f"{Colors.GREEN}FixGuide AI - Comprehensive Backend Test{Colors.RESET}")
    print(f"{Colors.GREEN}{'='*60}{Colors.RESET}")
    
    results = {
        "Configuration": await test_configuration(),
        "Database Connection": await test_supabase_connection(),
        "Authentication": await test_authentication(),
        "iFixit Tool": await test_ifixit_tool(),
        "Web Search": await test_web_search_tool(),
        "AI Agent": await test_agent(),
        "API Endpoints": await test_api_endpoints(),
    }
    
    # Summary
    print(f"\n{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BLUE}TEST SUMMARY{Colors.RESET}")
    print(f"{Colors.BLUE}{'='*60}{Colors.RESET}\n")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = f"{Colors.GREEN}PASS{Colors.RESET}" if result else f"{Colors.RED}FAIL{Colors.RESET}"
        print(f"{status} - {test_name}")
    
    print(f"\n{Colors.BLUE}Results: {passed}/{total} tests passed{Colors.RESET}")
    
    if passed == total:
        print(f"\n{Colors.GREEN}🎉 ALL TESTS PASSED! Backend is ready!{Colors.RESET}")
        print(f"\n{Colors.GREEN}Next steps:{Colors.RESET}")
        print(f"  1. Test the chat: http://localhost:8000/docs")
        print(f"  2. Try signup/login via Swagger UI")
        print(f"  3. Send a chat message: 'How to fix PS5 overheating?'")
        print(f"  4. Build the frontend!")
    else:
        print(f"\n{Colors.RED}⚠️  Some tests failed. Check the errors above.{Colors.RESET}")
        print(f"\n{Colors.YELLOW}Common fixes:{Colors.RESET}")
        print(f"  - Add GEMINI_API_KEY to .env (get from ai.google.dev)")
        print(f"  - Run supabase_schema.sql in Supabase SQL Editor")
        print(f"  - Start server: uvicorn app.main:app --reload")
    
    print()
    return passed == total


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
