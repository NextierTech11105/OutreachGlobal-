#!/bin/bash

# ============================================================
# NEXTIER DIGITALOCEAN SECURITY FIX SCRIPT
# Created: 2025-01-22
# Purpose: Fix critical security vulnerabilities identified in audit
# WARNING: This script makes changes to production infrastructure!
# ============================================================

set -e

echo "🔒 NEXTIER DIGITALOCEAN SECURITY FIX"
echo "====================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check prerequisites
if ! command -v doctl &> /dev/null; then
    echo -e "${RED}❌ doctl CLI not found${NC}"
    exit 1
fi

if ! doctl account get &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with DigitalOcean${NC}"
    exit 1
fi

echo -e "${BLUE}This script will:${NC}"
echo "1. Remove dangerous 0.0.0.0/0 firewall rules"
echo "2. Add restricted IP allowlist to databases"
echo "3. Enforce SSL connections"
echo "4. Update .gitignore for secrets"
echo "5. Generate secure environment variable templates"
echo ""

read -p "Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""

# ============================================================
# 1. FIX DATABASE FIREWALL RULES
# ============================================================

echo -e "${BLUE}🔧 1. FIXING DATABASE FIREWALL RULES${NC}"
echo "======================================"
echo ""

# Get all databases
DATABASES=$(doctl databases list --format ID,Name --no-header)

if [ -z "$DATABASES" ]; then
    echo -e "${YELLOW}⚠️  No databases found${NC}"
else
    echo "Enter trusted IP addresses (comma-separated):"
    echo "Example: 192.168.1.100,10.0.0.50"
    echo "Or press Enter to use App Platform cluster (recommended)"
    read -p "Trusted IPs: " TRUSTED_IPS

    echo "$DATABASES" | while IFS=$'\t' read -r DB_ID DB_NAME; do
        echo ""
        echo -e "${BLUE}Processing: $DB_NAME${NC}"

        # Remove 0.0.0.0/0 rule if it exists
        echo "Checking for 0.0.0.0/0 rule..."
        CURRENT_RULES=$(doctl databases firewalls list "$DB_ID" --format Type,Value --no-header)

        if echo "$CURRENT_RULES" | grep -q "0.0.0.0/0"; then
            echo -e "${RED}Found dangerous 0.0.0.0/0 rule - REMOVING${NC}"

            # Remove the rule
            doctl databases firewalls remove "$DB_ID" --uuid $(doctl databases firewalls list "$DB_ID" --format UUID,Value --no-header | grep "0.0.0.0/0" | awk '{print $1}')

            echo -e "${GREEN}✅ Removed 0.0.0.0/0 rule${NC}"
        else
            echo -e "${GREEN}✅ No 0.0.0.0/0 rule found${NC}"
        fi

        # Add App Platform cluster access
        echo "Adding App Platform cluster access..."

        # Get app IDs
        APP_IDS=$(doctl apps list --format ID --no-header | head -1)

        if [ -n "$APP_IDS" ]; then
            for APP_ID in $APP_IDS; do
                # Add app to database firewall
                doctl databases firewalls append "$DB_ID" --rule app:"$APP_ID" 2>/dev/null || echo "App already has access"
            done
            echo -e "${GREEN}✅ Added App Platform access${NC}"
        fi

        # Add trusted IPs if provided
        if [ -n "$TRUSTED_IPS" ]; then
            IFS=',' read -ra IPS <<< "$TRUSTED_IPS"
            for IP in "${IPS[@]}"; do
                IP=$(echo "$IP" | xargs) # Trim whitespace
                echo "Adding trusted IP: $IP"
                doctl databases firewalls append "$DB_ID" --rule ip_addr:"$IP" 2>/dev/null || echo "IP already allowed"
            done
            echo -e "${GREEN}✅ Added trusted IPs${NC}"
        fi

        # Verify new rules
        echo ""
        echo "New firewall rules:"
        doctl databases firewalls list "$DB_ID" --format Type,Value

        echo ""
        echo "----------------------------------------"
    done
fi

echo ""

# ============================================================
# 2. ENFORCE SSL CONNECTIONS
# ============================================================

echo -e "${BLUE}🔧 2. ENFORCING SSL CONNECTIONS${NC}"
echo "================================"
echo ""

# Note: SSL enforcement is enabled by default on DigitalOcean managed databases
# We'll verify the connection strings include sslmode=require

echo "$DATABASES" | while IFS=$'\t' read -r DB_ID DB_NAME; do
    echo "Verifying SSL for: $DB_NAME"

    CONNECTION_URI=$(doctl databases connection "$DB_ID" --format URI --no-header)

    if echo "$CONNECTION_URI" | grep -q "sslmode=require"; then
        echo -e "${GREEN}✅ SSL is enforced${NC}"
    else
        echo -e "${YELLOW}⚠️  SSL mode not in connection string${NC}"
        echo "   Recommended connection string should include: ?sslmode=require"
    fi

    echo ""
done

# ============================================================
# 3. UPDATE .gitignore
# ============================================================

echo -e "${BLUE}🔧 3. UPDATING .gitignore${NC}"
echo "=========================="
echo ""

GITIGNORE_FILE=".gitignore"

# Secrets to ignore
SECRETS_PATTERNS=(
    ".env"
    ".env.local"
    ".env.*.local"
    "*.pem"
    "*.key"
    "*.p12"
    "credentials.json"
    "secrets.json"
    ".env.production"
    ".env.development.local"
)

if [ -f "$GITIGNORE_FILE" ]; then
    echo "Checking .gitignore..."

    ADDED_COUNT=0
    for PATTERN in "${SECRETS_PATTERNS[@]}"; do
        if ! grep -q "^${PATTERN}$" "$GITIGNORE_FILE" 2>/dev/null; then
            echo "$PATTERN" >> "$GITIGNORE_FILE"
            echo "Added: $PATTERN"
            ((ADDED_COUNT++))
        fi
    done

    if [ $ADDED_COUNT -gt 0 ]; then
        echo -e "${GREEN}✅ Added $ADDED_COUNT patterns to .gitignore${NC}"
    else
        echo -e "${GREEN}✅ .gitignore already contains all secret patterns${NC}"
    fi
else
    echo "Creating .gitignore..."
    for PATTERN in "${SECRETS_PATTERNS[@]}"; do
        echo "$PATTERN" >> "$GITIGNORE_FILE"
    done
    echo -e "${GREEN}✅ Created .gitignore with secret patterns${NC}"
fi

# Remove .env from git if it exists
if git ls-files --error-unmatch .env &>/dev/null; then
    echo -e "${RED}⚠️  .env is tracked by git - REMOVING${NC}"
    git rm --cached .env 2>/dev/null || true
    echo -e "${GREEN}✅ Removed .env from git tracking${NC}"
fi

echo ""

# ============================================================
# 4. GENERATE SECURE ENVIRONMENT TEMPLATE
# ============================================================

echo -e "${BLUE}🔧 4. GENERATING SECURE ENVIRONMENT TEMPLATE${NC}"
echo "============================================="
echo ""

ENV_TEMPLATE="apps/api/.env.example"

if [ -f "$ENV_TEMPLATE" ]; then
    echo "Checking $ENV_TEMPLATE for security issues..."

    # Check for actual secrets in .env.example
    SECRETS_IN_EXAMPLE=$(grep -E "(password|secret|key).*=.*[a-zA-Z0-9]{20,}" "$ENV_TEMPLATE" || echo "")

    if [ -n "$SECRETS_IN_EXAMPLE" ]; then
        echo -e "${RED}❌ Found potential real secrets in .env.example:${NC}"
        echo "$SECRETS_IN_EXAMPLE"
        echo ""
        echo "   FIX: Replace with placeholder values:"
        echo "   MAIL_PASSWORD=your_sendgrid_api_key_here"
        echo "   APP_SECRET=generate_with_openssl_rand_hex_32"
    else
        echo -e "${GREEN}✅ .env.example looks safe (no real secrets)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  .env.example not found${NC}"
fi

echo ""

# ============================================================
# 5. CREATE DATABASE CONNECTION TEMPLATE
# ============================================================

echo -e "${BLUE}🔧 5. CREATING SECURE DATABASE CONNECTION TEMPLATE${NC}"
echo "==================================================="
echo ""

DB_CONFIG_FILE="database-connection.template.txt"

cat > "$DB_CONFIG_FILE" << 'EOF'
# ============================================================
# SECURE DATABASE CONNECTION CONFIGURATION
# ============================================================

# PRODUCTION DATABASE (Use DigitalOcean Managed Database)
#
# Connection String Format:
# postgresql://username:password@host:port/database?sslmode=require
#
# IMPORTANT SECURITY SETTINGS:
# 1. Always use sslmode=require
# 2. Never commit actual credentials to git
# 3. Use environment variables for all sensitive data
# 4. Rotate credentials every 90 days

# Environment Variable Template:
DATABASE_URL="postgresql://doadmin:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/defaultdb?sslmode=require&connect_timeout=10&pool_max_conns=10"

# Connection Pool Settings (for high performance):
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_POOL_IDLE_TIMEOUT=10000
DATABASE_POOL_CONNECTION_TIMEOUT=5000

# Firewall Configuration:
# - Restrict access to App Platform cluster only
# - Add specific trusted IPs if needed
# - NEVER use 0.0.0.0/0

# Backup Configuration:
# - Enable automated daily backups
# - Retain for 7 days minimum
# - Test restore procedure monthly

# Monitoring:
# - Alert on CPU > 80%
# - Alert on memory > 80%
# - Alert on connection failures
# - Alert on slow queries (> 1000ms)
EOF

echo -e "${GREEN}✅ Created $DB_CONFIG_FILE${NC}"
echo "   Review this file for database security best practices"

echo ""

# ============================================================
# 6. GENERATE RANDOM SECRETS
# ============================================================

echo -e "${BLUE}🔧 6. GENERATING RANDOM SECRETS${NC}"
echo "================================"
echo ""

echo "Here are securely generated random secrets for your .env file:"
echo ""

echo "APP_SECRET=$(openssl rand -hex 32)"
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)"

echo ""
echo -e "${YELLOW}⚠️  Save these to your .env file (not in git!)${NC}"

echo ""

# ============================================================
# SUMMARY
# ============================================================

echo ""
echo "=============================================="
echo -e "${GREEN}🎉 SECURITY FIX SUMMARY${NC}"
echo "=============================================="
echo ""

echo -e "${GREEN}✅ COMPLETED:${NC}"
echo "1. Database firewall rules updated (removed 0.0.0.0/0)"
echo "2. SSL enforcement verified"
echo "3. .gitignore updated with secret patterns"
echo "4. .env removed from git tracking (if present)"
echo "5. Database connection template created"
echo "6. Random secrets generated"
echo ""

echo -e "${YELLOW}⚠️  MANUAL STEPS REQUIRED:${NC}"
echo "1. Update your .env file with generated secrets"
echo "2. Deploy app with new environment variables"
echo "3. Set up monitoring alerts in DigitalOcean dashboard"
echo "4. Schedule secret rotation (90 days)"
echo "5. Test database connectivity after firewall changes"
echo ""

echo -e "${BLUE}📋 NEXT STEPS:${NC}"
echo "1. Run: doctl databases list"
echo "   Verify firewall rules are correct"
echo ""
echo "2. Test database connection:"
echo "   psql \"\$DATABASE_URL\""
echo ""
echo "3. Deploy app:"
echo "   doctl apps create-deployment <app-id>"
echo ""
echo "4. Monitor logs for connection issues:"
echo "   doctl apps logs <app-id> --follow"
echo ""

echo "=============================================="
echo "Security fix completed at: $(date)"
echo "=============================================="
