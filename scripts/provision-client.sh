#!/bin/bash

# ============================================================
# NEXTIER CLIENT PROVISIONING AUTOMATION
# Created: 2025-01-22
# Purpose: Automate new client instance creation (2-4 hours → 10 minutes)
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🚀 NEXTIER CLIENT PROVISIONING"
echo "==============================="
echo ""

# Check prerequisites
if ! command -v doctl &> /dev/null; then
    echo -e "${RED}❌ doctl CLI not found${NC}"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql not found (PostgreSQL client required)${NC}"
    exit 1
fi

if ! doctl account get &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with DigitalOcean${NC}"
    exit 1
fi

# ============================================================
# COLLECT CLIENT INFORMATION
# ============================================================

echo -e "${BLUE}📋 CLIENT INFORMATION${NC}"
echo ""

read -p "Client name (lowercase, no spaces, e.g., 'hasaas'): " CLIENT_NAME
read -p "Client domain (e.g., 'hasaas.app'): " CLIENT_DOMAIN
read -p "Company name (e.g., 'Hasaas Real Estate'): " COMPANY_NAME
read -p "Admin email: " ADMIN_EMAIL
read -p "Admin name: " ADMIN_NAME
read -p "Plan tier (starter/pro/enterprise): " PLAN_TIER

echo ""
echo -e "${BLUE}REVIEW CLIENT DETAILS:${NC}"
echo "----------------------"
echo "Client Name: $CLIENT_NAME"
echo "Domain: $CLIENT_DOMAIN"
echo "Company: $COMPANY_NAME"
echo "Admin: $ADMIN_NAME <$ADMIN_EMAIL>"
echo "Plan: $PLAN_TIER"
echo ""

read -p "Proceed with provisioning? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""

# ============================================================
# DETERMINE RESOURCE ALLOCATION BY PLAN
# ============================================================

case "$PLAN_TIER" in
    starter)
        DB_SIZE="db-s-1vcpu-1gb"
        DB_NODES=1
        APP_SIZE="basic"
        echo -e "${BLUE}Plan: Starter ($15/mo DB + $12/mo App = $27/mo)${NC}"
        ;;
    pro)
        DB_SIZE="db-s-2vcpu-4gb"
        DB_NODES=2
        APP_SIZE="professional"
        echo -e "${BLUE}Plan: Pro ($60/mo DB + $24/mo App = $84/mo)${NC}"
        ;;
    enterprise)
        DB_SIZE="db-s-4vcpu-8gb"
        DB_NODES=3
        APP_SIZE="professional"
        echo -e "${BLUE}Plan: Enterprise ($180/mo DB + $50/mo App = $230/mo)${NC}"
        ;;
    *)
        echo -e "${RED}Invalid plan tier${NC}"
        exit 1
        ;;
esac

echo ""

# ============================================================
# STEP 1: CREATE DATABASE
# ============================================================

echo -e "${BLUE}🗄️  STEP 1: CREATING DATABASE${NC}"
echo "============================="
echo ""

DB_NAME="${CLIENT_NAME}-db"

echo "Creating database: $DB_NAME"
echo "Size: $DB_SIZE"
echo "Nodes: $DB_NODES"
echo "Region: nyc3"
echo ""

# Create database
DB_CREATE_OUTPUT=$(doctl databases create "$DB_NAME" \
    --engine pg \
    --version 16 \
    --size "$DB_SIZE" \
    --region nyc3 \
    --num-nodes "$DB_NODES" \
    --format ID,Name,Status \
    --no-header)

DB_ID=$(echo "$DB_CREATE_OUTPUT" | awk '{print $1}')

echo -e "${GREEN}✅ Database created: $DB_NAME (ID: $DB_ID)${NC}"
echo ""

# Wait for database to be ready
echo "Waiting for database to be ready (this may take 5-10 minutes)..."
while true; do
    DB_STATUS=$(doctl databases get "$DB_ID" --format Status --no-header)
    if [ "$DB_STATUS" == "online" ]; then
        echo -e "${GREEN}✅ Database is online${NC}"
        break
    fi
    echo "Status: $DB_STATUS - waiting..."
    sleep 30
done

echo ""

# Get database connection details
DB_URI=$(doctl databases connection "$DB_ID" --format URI --no-header)
DB_HOST=$(doctl databases connection "$DB_ID" --format Host --no-header)
DB_PORT=$(doctl databases connection "$DB_ID" --format Port --no-header)
DB_USER=$(doctl databases connection "$DB_ID" --format User --no-header)
DB_PASSWORD=$(doctl databases connection "$DB_ID" --format Password --no-header)
DB_DATABASE=$(doctl databases connection "$DB_ID" --format Database --no-header)

echo "Database Connection Details:"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "User: $DB_USER"
echo "Database: $DB_DATABASE"
echo ""

# ============================================================
# STEP 2: CONFIGURE DATABASE FIREWALL
# ============================================================

echo -e "${BLUE}🔒 STEP 2: CONFIGURING DATABASE FIREWALL${NC}"
echo "=========================================="
echo ""

# Get the source app (template)
SOURCE_APP_ID=$(doctl apps list --format ID,Spec.Name --no-header | grep "monkfish-app" | head -1 | awk '{print $1}')

if [ -z "$SOURCE_APP_ID" ]; then
    echo -e "${RED}❌ Source app not found (monkfish-app-mb7h3)${NC}"
    exit 1
fi

# Add source app to firewall temporarily (will update after new app is created)
doctl databases firewalls append "$DB_ID" --rule app:"$SOURCE_APP_ID"

echo -e "${GREEN}✅ Database firewall configured${NC}"
echo ""

# ============================================================
# STEP 3: CLONE APP PLATFORM APPLICATION
# ============================================================

echo -e "${BLUE}📦 STEP 3: CLONING APP PLATFORM APPLICATION${NC}"
echo "============================================="
echo ""

APP_NAME="${CLIENT_NAME}-app"

echo "Cloning app from: $SOURCE_APP_ID"
echo "New app name: $APP_NAME"
echo ""

# Get source app spec
SOURCE_SPEC=$(doctl apps spec get "$SOURCE_APP_ID")

# Create new app spec with modified values
NEW_SPEC=$(echo "$SOURCE_SPEC" | jq \
    --arg name "$APP_NAME" \
    --arg dburl "$DB_URI" \
    --arg appurl "https://api.${CLIENT_DOMAIN}" \
    --arg fronturl "https://app.${CLIENT_DOMAIN}" \
    --arg secret "$(openssl rand -hex 32)" \
    '
    .name = $name |
    .services[0].envs = [
        {key: "DATABASE_URL", value: $dburl, type: "SECRET"},
        {key: "APP_URL", value: $appurl},
        {key: "FRONTEND_URL", value: $fronturl},
        {key: "APP_SECRET", value: $secret, type: "SECRET"},
        {key: "NODE_ENV", value: "production"},
        {key: "CLIENT_ID", value: $name},
        {key: "CLIENT_TIER", value: "'$PLAN_TIER'"}
    ]
    ')

# Save spec to temp file
TMP_SPEC="/tmp/${CLIENT_NAME}-app-spec.json"
echo "$NEW_SPEC" > "$TMP_SPEC"

# Create app
APP_CREATE_OUTPUT=$(doctl apps create --spec "$TMP_SPEC" --format ID,Spec.Name --no-header)
NEW_APP_ID=$(echo "$APP_CREATE_OUTPUT" | awk '{print $1}')

echo -e "${GREEN}✅ App created: $APP_NAME (ID: $NEW_APP_ID)${NC}"
echo ""

# Update database firewall with new app
echo "Updating database firewall with new app..."
doctl databases firewalls append "$DB_ID" --rule app:"$NEW_APP_ID"

echo -e "${GREEN}✅ Database firewall updated with new app${NC}"
echo ""

# Wait for deployment
echo "Waiting for initial deployment (this may take 5-10 minutes)..."
while true; do
    DEPLOYMENT_STATUS=$(doctl apps list-deployments "$NEW_APP_ID" --format Phase --no-header | head -1)
    if [ "$DEPLOYMENT_STATUS" == "ACTIVE" ]; then
        echo -e "${GREEN}✅ Deployment successful${NC}"
        break
    elif [ "$DEPLOYMENT_STATUS" == "ERROR" ]; then
        echo -e "${RED}❌ Deployment failed${NC}"
        echo "Check logs: doctl apps logs $NEW_APP_ID"
        exit 1
    fi
    echo "Status: $DEPLOYMENT_STATUS - waiting..."
    sleep 30
done

echo ""

# Get app URL
APP_URL=$(doctl apps get "$NEW_APP_ID" --format DefaultIngress --no-header)

echo "App URL: $APP_URL"
echo ""

# ============================================================
# STEP 4: CONFIGURE CUSTOM DOMAINS
# ============================================================

echo -e "${BLUE}🌐 STEP 4: CONFIGURING CUSTOM DOMAINS${NC}"
echo "======================================="
echo ""

echo "Adding custom domains to app..."

# Add api subdomain
doctl apps create-domain "$NEW_APP_ID" --domain "api.${CLIENT_DOMAIN}"

# Add app subdomain
doctl apps create-domain "$NEW_APP_ID" --domain "app.${CLIENT_DOMAIN}"

echo -e "${GREEN}✅ Custom domains added${NC}"
echo ""
echo "DNS CONFIGURATION REQUIRED:"
echo "Add these CNAME records to your DNS provider for $CLIENT_DOMAIN:"
echo ""
echo "Type  | Name | Value"
echo "------|------|------------------"
echo "CNAME | api  | $APP_URL"
echo "CNAME | app  | $APP_URL"
echo ""

# ============================================================
# STEP 5: INITIALIZE DATABASE
# ============================================================

echo -e "${BLUE}🗃️  STEP 5: INITIALIZING DATABASE${NC}"
echo "=================================="
echo ""

echo "Running database migrations..."

# Run migrations via psql
MIGRATION_SQL=$(cat <<EOF
-- Create team
INSERT INTO teams (id, name, slug, created_at, updated_at)
VALUES (gen_random_uuid(), '${COMPANY_NAME}', '${CLIENT_NAME}', NOW(), NOW())
RETURNING id;

-- Save team ID to variable
DO \$\$
DECLARE
    team_id_var UUID;
    user_id_var UUID;
BEGIN
    -- Get team ID
    SELECT id INTO team_id_var FROM teams WHERE slug = '${CLIENT_NAME}';

    -- Create admin user
    INSERT INTO users (id, email, password, name, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        '${ADMIN_EMAIL}',
        '\$2b\$10\$' || encode(gen_random_bytes(22), 'base64'),  -- Temporary password (will be emailed)
        '${ADMIN_NAME}',
        NOW(),
        NOW()
    )
    RETURNING id INTO user_id_var;

    -- Add user to team as owner
    INSERT INTO team_members (team_id, user_id, role, created_at, updated_at)
    VALUES (team_id_var, user_id_var, 'OWNER', NOW(), NOW());

    -- Create team settings
    INSERT INTO team_settings (team_id, created_at, updated_at)
    VALUES (team_id_var, NOW(), NOW());
END \$\$;
EOF
)

echo "$MIGRATION_SQL" | psql "$DB_URI" -v ON_ERROR_STOP=1

echo -e "${GREEN}✅ Database initialized${NC}"
echo ""

# ============================================================
# STEP 6: VERIFY HEALTH
# ============================================================

echo -e "${BLUE}🏥 STEP 6: VERIFYING HEALTH${NC}"
echo "============================"
echo ""

echo "Checking app health endpoint..."

HEALTH_URL="https://api.${CLIENT_DOMAIN}/health"

# Wait a bit for DNS propagation
sleep 10

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")

if [ "$HTTP_STATUS" == "200" ]; then
    echo -e "${GREEN}✅ App is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Health check returned: $HTTP_STATUS${NC}"
    echo "   DNS may still be propagating (can take up to 48 hours)"
    echo "   Try: curl https://$APP_URL/health"
fi

echo ""

# ============================================================
# STEP 7: GENERATE WELCOME EMAIL
# ============================================================

echo -e "${BLUE}📧 STEP 7: GENERATING WELCOME EMAIL${NC}"
echo "===================================="
echo ""

WELCOME_EMAIL=$(cat <<EOF
Subject: Welcome to Nextier Global!

Hi ${ADMIN_NAME},

Your Nextier instance is ready!

🔗 Access your dashboard: https://app.${CLIENT_DOMAIN}
📧 Admin email: ${ADMIN_EMAIL}
🔑 Temporary password: (will be sent separately for security)

Your Plan: ${PLAN_TIER^}

Next steps:
1. Log in and change your password
2. Configure your SendGrid API key (Settings → Integrations)
3. Add team members (Team → Members)
4. Import your first leads (Leads → Import)
5. Create your first campaign (Campaigns → New)

Infrastructure Details:
- App ID: $NEW_APP_ID
- Database ID: $DB_ID
- Region: NYC3
- Monthly Cost: \$$(case $PLAN_TIER in starter) echo "27";; pro) echo "84";; enterprise) echo "230";; esac)

Need help? Contact support@nextier.com

Welcome aboard!

---
Nextier Global
Real Estate Lead Automation
EOF
)

echo "$WELCOME_EMAIL"
echo ""

# Save welcome email to file
WELCOME_FILE="client-welcome-${CLIENT_NAME}.txt"
echo "$WELCOME_EMAIL" > "$WELCOME_FILE"

echo -e "${GREEN}✅ Welcome email saved to: $WELCOME_FILE${NC}"
echo ""

# ============================================================
# PROVISIONING COMPLETE
# ============================================================

echo ""
echo "=============================================="
echo -e "${GREEN}🎉 CLIENT PROVISIONING COMPLETE${NC}"
echo "=============================================="
echo ""

echo -e "${GREEN}✅ CREATED:${NC}"
echo "1. Database: $DB_NAME (ID: $DB_ID)"
echo "2. App: $APP_NAME (ID: $NEW_APP_ID)"
echo "3. Admin user: $ADMIN_EMAIL"
echo "4. Team: $COMPANY_NAME"
echo ""

echo -e "${YELLOW}⚠️  MANUAL STEPS REQUIRED:${NC}"
echo "1. Add DNS records (see above)"
echo "2. Send welcome email to: $ADMIN_EMAIL"
echo "3. Generate and send temporary password"
echo "4. Configure SendGrid API key in app settings"
echo "5. Set up monitoring alerts"
echo ""

echo -e "${BLUE}📋 CLIENT INFORMATION:${NC}"
echo "Client: $COMPANY_NAME"
echo "Domain: $CLIENT_DOMAIN"
echo "Plan: $PLAN_TIER"
echo "Admin: $ADMIN_NAME <$ADMIN_EMAIL>"
echo "App URL: https://app.${CLIENT_DOMAIN}"
echo "API URL: https://api.${CLIENT_DOMAIN}"
echo "App ID: $NEW_APP_ID"
echo "Database ID: $DB_ID"
echo ""

echo -e "${BLUE}💰 BILLING:${NC}"
case "$PLAN_TIER" in
    starter)
        echo "Monthly cost: \$27/mo infrastructure"
        echo "Client pays: \$99/mo"
        echo "Your margin: \$72/mo (73%)"
        ;;
    pro)
        echo "Monthly cost: \$84/mo infrastructure"
        echo "Client pays: \$299/mo"
        echo "Your margin: \$215/mo (72%)"
        ;;
    enterprise)
        echo "Monthly cost: \$230/mo infrastructure"
        echo "Client pays: \$999/mo"
        echo "Your margin: \$769/mo (77%)"
        ;;
esac

echo ""

echo "=============================================="
echo "Provisioning completed at: $(date)"
echo "=============================================="

# Save client info to JSON
CLIENT_INFO_FILE="clients/${CLIENT_NAME}-info.json"
mkdir -p clients

cat > "$CLIENT_INFO_FILE" <<EOF
{
  "clientName": "$CLIENT_NAME",
  "domain": "$CLIENT_DOMAIN",
  "companyName": "$COMPANY_NAME",
  "adminEmail": "$ADMIN_EMAIL",
  "adminName": "$ADMIN_NAME",
  "plan": "$PLAN_TIER",
  "appId": "$NEW_APP_ID",
  "databaseId": "$DB_ID",
  "appUrl": "https://app.${CLIENT_DOMAIN}",
  "apiUrl": "https://api.${CLIENT_DOMAIN}",
  "provisionedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "active"
}
EOF

echo -e "${GREEN}✅ Client info saved to: $CLIENT_INFO_FILE${NC}"
echo ""
