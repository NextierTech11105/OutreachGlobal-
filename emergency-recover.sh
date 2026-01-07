#!/bin/bash
# Emergency Recovery Script for OutreachGlobal on DigitalOcean
# 
# This script helps diagnose and recover from critical production issues
# by testing connections, retrieving logs, and providing fix instructions.

set -e

APP_ID="c61ce74c-eb13-4eaa-b856-f632849111c9"
API_URL="${API_URL:-https://nextier-bxrzn.ondigitalocean.app}"

echo "🚨 OutreachGlobal Emergency Recovery"
echo "===================================="
echo ""
echo "App ID: $APP_ID"
echo "API URL: $API_URL"
echo ""

# Color codes for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Function to make a safe curl request
safe_curl() {
    local url="$1"
    local method="${2:-GET}"
    
    if command_exists curl; then
        if [ "$method" = "POST" ]; then
            curl -s -X POST "$url" 2>/dev/null || echo '{"error": "Failed to connect"}'
        else
            curl -s "$url" 2>/dev/null || echo '{"error": "Failed to connect"}'
        fi
    else
        echo '{"error": "curl not installed"}'
    fi
}

# 1. Check if DigitalOcean CLI is installed
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Checking Prerequisites"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! command_exists doctl; then
    echo -e "${RED}❌ doctl not found${NC}"
    echo ""
    echo "Install DigitalOcean CLI:"
    echo "  → macOS: brew install doctl"
    echo "  → Linux: snap install doctl"
    echo "  → Manual: https://docs.digitalocean.com/reference/doctl/how-to/install/"
    echo ""
    DOCTL_AVAILABLE=false
else
    echo -e "${GREEN}✅ doctl installed${NC}"
    DOCTL_AVAILABLE=true
fi

if ! command_exists curl; then
    echo -e "${RED}❌ curl not found${NC}"
    echo "Please install curl to use this script"
    exit 1
else
    echo -e "${GREEN}✅ curl installed${NC}"
fi

echo ""

# 2. Test Admin Endpoints
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Testing Admin Dashboard"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Testing health endpoint..."
HEALTH_RESPONSE=$(safe_curl "$API_URL/admin/health")

if echo "$HEALTH_RESPONSE" | grep -q "timestamp"; then
    echo -e "${GREEN}✅ Admin dashboard is accessible${NC}"
    echo ""
    echo "Health Check Results:"
    echo "$HEALTH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$HEALTH_RESPONSE"
else
    echo -e "${RED}❌ Cannot access admin dashboard${NC}"
    echo "Response: $HEALTH_RESPONSE"
fi

echo ""

# 3. Show app status (if doctl is available)
if [ "$DOCTL_AVAILABLE" = true ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "3️⃣  DigitalOcean App Status"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    echo "Fetching app info..."
    if doctl apps get "$APP_ID" 2>/dev/null; then
        echo -e "${GREEN}✅ App info retrieved${NC}"
    else
        echo -e "${YELLOW}⚠️  Could not get app info. You may need to authenticate:${NC}"
        echo "  → Run: doctl auth init"
    fi
    echo ""
fi

# 4. Show recent logs (if doctl is available)
if [ "$DOCTL_AVAILABLE" = true ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "4️⃣  Recent API Logs"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    echo "Fetching recent logs (last 50 lines)..."
    if doctl apps logs "$APP_ID" nextier --type run --tail 50 2>/dev/null; then
        echo -e "${GREEN}✅ Logs retrieved${NC}"
    else
        echo -e "${YELLOW}⚠️  Could not get logs. You may need to authenticate:${NC}"
        echo "  → Run: doctl auth init"
    fi
    echo ""
fi

# 5. Test database connection
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Testing Services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Calling system status endpoint..."
STATUS_RESPONSE=$(safe_curl "$API_URL/admin/status")

if echo "$STATUS_RESPONSE" | grep -q "app"; then
    echo -e "${GREEN}✅ System status retrieved${NC}"
    echo ""
    echo "System Status:"
    echo "$STATUS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$STATUS_RESPONSE"
else
    echo -e "${RED}❌ Cannot get system status${NC}"
    echo "Response: $STATUS_RESPONSE"
fi

echo ""

# 6. Test Spaces connection
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  Testing DigitalOcean Spaces"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Running Spaces diagnostic..."
SPACES_RESPONSE=$(safe_curl "$API_URL/admin/fix-spaces" "POST")

if echo "$SPACES_RESPONSE" | grep -q "currentConfig"; then
    echo -e "${GREEN}✅ Spaces diagnostic complete${NC}"
    echo ""
    echo "Spaces Status:"
    echo "$SPACES_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$SPACES_RESPONSE"
else
    echo -e "${RED}❌ Cannot run Spaces diagnostic${NC}"
    echo "Response: $SPACES_RESPONSE"
fi

echo ""
echo ""

# 7. Provide fix instructions
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 QUICK FIX GUIDE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 COMMON FIXES:"
echo ""
echo "1. Fix DigitalOcean Spaces Credentials:"
echo "   → Generate keys: https://cloud.digitalocean.com/account/api/spaces"
echo "   → Update app env: https://cloud.digitalocean.com/apps/$APP_ID/settings"
echo "   → Set: DO_SPACES_KEY and DO_SPACES_SECRET"
echo ""
echo "2. Run Database Migrations:"
echo "   → From project root: pnpm nx run api:db:migrate"
echo "   → Or via doctl: doctl apps create-deployment $APP_ID --force-rebuild"
echo ""
echo "3. Check Admin Dashboard:"
echo "   → Health: $API_URL/admin/health"
echo "   → Status: $API_URL/admin/status"
echo "   → Fix Spaces: curl -X POST $API_URL/admin/fix-spaces"
echo ""
echo "4. View Live Logs:"
echo "   → doctl apps logs $APP_ID nextier --type run --follow"
echo ""
echo "5. Redeploy Application:"
echo "   → doctl apps create-deployment $APP_ID --force-rebuild"
echo "   → Or use DigitalOcean web console"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 For detailed recovery instructions, see:"
echo "   → EMERGENCY_RECOVERY.md in the project root"
echo ""
echo "🆘 Still having issues?"
echo "   → Check deployment logs in DigitalOcean console"
echo "   → Verify all environment variables are set"
echo "   → Review ENVIRONMENT_VARIABLES.md for required vars"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
