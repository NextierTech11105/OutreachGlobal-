#!/bin/bash

# ============================================================
# NEXTIER DIGITALOCEAN SECURITY AUDIT SCRIPT
# Created: 2025-01-22
# Purpose: Audit and fix critical security vulnerabilities
# ============================================================

set -e

echo "🔒 NEXTIER DIGITALOCEAN SECURITY AUDIT"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo -e "${RED}❌ doctl CLI not found${NC}"
    echo "Install: https://docs.digitalocean.com/reference/doctl/how-to/install/"
    exit 1
fi

# Check if authenticated
if ! doctl account get &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with DigitalOcean${NC}"
    echo "Run: doctl auth init"
    exit 1
fi

echo -e "${GREEN}✅ DigitalOcean CLI authenticated${NC}"
echo ""

# ============================================================
# 1. DATABASE FIREWALL AUDIT
# ============================================================

echo "🔍 1. DATABASE FIREWALL AUDIT"
echo "=============================="
echo ""

# List all databases
echo "Fetching databases..."
DATABASES=$(doctl databases list --format ID,Name,Status --no-header)

if [ -z "$DATABASES" ]; then
    echo -e "${YELLOW}⚠️  No databases found${NC}"
else
    echo "$DATABASES" | while IFS=$'\t' read -r DB_ID DB_NAME DB_STATUS; do
        echo ""
        echo "Database: $DB_NAME (ID: $DB_ID)"
        echo "Status: $DB_STATUS"
        echo ""

        # Get firewall rules
        FIREWALL_RULES=$(doctl databases firewalls list "$DB_ID" --format Type,Value --no-header 2>/dev/null || echo "")

        if [ -z "$FIREWALL_RULES" ]; then
            echo -e "${RED}❌ CRITICAL: No firewall rules configured!${NC}"
            echo "   Database is WIDE OPEN to the internet!"
            echo ""
            echo "   FIX: Add firewall rules to restrict access"
            echo "   doctl databases firewalls append $DB_ID --rule ip_addr:YOUR_IP"
        else
            echo "Firewall Rules:"
            echo "$FIREWALL_RULES" | while IFS=$'\t' read -r RULE_TYPE RULE_VALUE; do
                if [ "$RULE_TYPE" == "ip_addr" ] && [ "$RULE_VALUE" == "0.0.0.0/0" ]; then
                    echo -e "  ${RED}❌ CRITICAL: $RULE_TYPE - $RULE_VALUE (ALLOWS ALL IPs!)${NC}"
                elif [ "$RULE_TYPE" == "ip_addr" ] && [[ "$RULE_VALUE" == *"/0" ]]; then
                    echo -e "  ${RED}❌ CRITICAL: $RULE_TYPE - $RULE_VALUE (Too permissive!)${NC}"
                else
                    echo -e "  ${GREEN}✅ $RULE_TYPE - $RULE_VALUE${NC}"
                fi
            done
        fi

        echo ""
        echo "Connection Info:"
        doctl databases connection "$DB_ID" --format URI | grep -i "sslmode" > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo -e "  ${GREEN}✅ SSL Mode: Enabled${NC}"
        else
            echo -e "  ${RED}❌ SSL Mode: Not enforced${NC}"
        fi

        echo ""
        echo "----------------------------------------"
    done
fi

echo ""

# ============================================================
# 2. APP PLATFORM SECURITY AUDIT
# ============================================================

echo "🔍 2. APP PLATFORM SECURITY AUDIT"
echo "=================================="
echo ""

# List all apps
echo "Fetching apps..."
APPS=$(doctl apps list --format ID,Spec.Name --no-header 2>/dev/null || echo "")

if [ -z "$APPS" ]; then
    echo -e "${YELLOW}⚠️  No apps found${NC}"
else
    echo "$APPS" | while IFS=$'\t' read -r APP_ID APP_NAME; do
        echo ""
        echo "App: $APP_NAME (ID: $APP_ID)"
        echo ""

        # Get app details
        APP_SPEC=$(doctl apps spec get "$APP_ID" --format json 2>/dev/null || echo "{}")

        # Check for exposed secrets in environment variables
        SECRETS_CHECK=$(echo "$APP_SPEC" | grep -i "password\|secret\|key" | grep -v "SECRET_KEY_BASE" || echo "")
        if [ -n "$SECRETS_CHECK" ]; then
            echo -e "${YELLOW}⚠️  Potential secrets in environment variables:${NC}"
            echo "$SECRETS_CHECK" | head -5
            echo "   Review and move to encrypted secrets"
        else
            echo -e "${GREEN}✅ No obvious secrets in plain text${NC}"
        fi

        # Check HTTPS enforcement
        HTTPS_CHECK=$(echo "$APP_SPEC" | grep -i "force_https" || echo "")
        if echo "$HTTPS_CHECK" | grep -q "true"; then
            echo -e "${GREEN}✅ HTTPS enforced${NC}"
        else
            echo -e "${RED}❌ HTTPS not enforced${NC}"
            echo "   FIX: Enable force_https in app spec"
        fi

        # Check for custom domains
        DOMAINS=$(doctl apps list-domains "$APP_ID" --format Domain,Type --no-header 2>/dev/null || echo "")
        if [ -n "$DOMAINS" ]; then
            echo ""
            echo "Custom Domains:"
            echo "$DOMAINS"
        fi

        echo ""
        echo "----------------------------------------"
    done
fi

echo ""

# ============================================================
# 3. SECRETS AUDIT
# ============================================================

echo "🔍 3. SECRETS AUDIT"
echo "==================="
echo ""

# Check for .env files in repo
if [ -f ".env" ]; then
    echo -e "${RED}❌ CRITICAL: .env file found in repository!${NC}"
    echo "   This may contain secrets. Add to .gitignore immediately!"
    echo ""
fi

# Check if .env is in .gitignore
if grep -q "^.env$" .gitignore 2>/dev/null; then
    echo -e "${GREEN}✅ .env is in .gitignore${NC}"
else
    echo -e "${RED}❌ .env not in .gitignore${NC}"
    echo "   FIX: Add .env to .gitignore"
fi

# Check for hardcoded credentials in code
echo ""
echo "Scanning for hardcoded credentials..."
HARDCODED_SECRETS=$(grep -r -i "password.*=.*['\"]" apps/api/src --include="*.ts" --include="*.js" | grep -v "node_modules" | grep -v ".example" | head -5 || echo "")
if [ -n "$HARDCODED_SECRETS" ]; then
    echo -e "${RED}❌ Potential hardcoded credentials found:${NC}"
    echo "$HARDCODED_SECRETS"
    echo ""
    echo "   FIX: Move all credentials to environment variables"
else
    echo -e "${GREEN}✅ No obvious hardcoded credentials${NC}"
fi

echo ""

# ============================================================
# 4. MONITORING & ALERTS AUDIT
# ============================================================

echo "🔍 4. MONITORING & ALERTS AUDIT"
echo "================================"
echo ""

# Check if monitoring is enabled
MONITORS=$(doctl monitoring alert-policy list --format Name,Enabled --no-header 2>/dev/null || echo "")
if [ -z "$MONITORS" ]; then
    echo -e "${YELLOW}⚠️  No monitoring alerts configured${NC}"
    echo "   Recommendation: Set up alerts for:"
    echo "   - Database CPU > 80%"
    echo "   - Database memory > 80%"
    echo "   - App deployment failures"
    echo "   - Database connection failures"
else
    echo "Configured Alerts:"
    echo "$MONITORS"
fi

echo ""

# ============================================================
# 5. BACKUP AUDIT
# ============================================================

echo "🔍 5. BACKUP AUDIT"
echo "=================="
echo ""

if [ -n "$DATABASES" ]; then
    echo "$DATABASES" | while IFS=$'\t' read -r DB_ID DB_NAME DB_STATUS; do
        echo "Database: $DB_NAME"

        # Check backup configuration
        BACKUPS=$(doctl databases backups list "$DB_ID" --format Created --no-header 2>/dev/null | head -5 || echo "")
        if [ -n "$BACKUPS" ]; then
            LATEST_BACKUP=$(echo "$BACKUPS" | head -1)
            echo -e "${GREEN}✅ Latest backup: $LATEST_BACKUP${NC}"
        else
            echo -e "${RED}❌ No backups found!${NC}"
            echo "   FIX: Enable automated backups"
        fi
        echo ""
    done
fi

# ============================================================
# SUMMARY & RECOMMENDATIONS
# ============================================================

echo ""
echo "=============================================="
echo "🎯 SECURITY AUDIT SUMMARY"
echo "=============================================="
echo ""

echo "CRITICAL FIXES REQUIRED:"
echo "1. Remove 0.0.0.0/0 from database firewall rules"
echo "2. Add specific IP allowlist (app cluster, trusted IPs)"
echo "3. Enable SSL enforcement on all databases"
echo "4. Move all secrets to environment variables"
echo "5. Add .env to .gitignore if not present"
echo ""

echo "RECOMMENDED IMPROVEMENTS:"
echo "1. Set up monitoring alerts (CPU, memory, failures)"
echo "2. Enable automated database backups (daily)"
echo "3. Enforce HTTPS on all apps"
echo "4. Review environment variables for exposed secrets"
echo "5. Implement secret rotation policy (90 days)"
echo ""

echo "NEXT STEPS:"
echo "1. Run the security fix script: ./scripts/security-fix.sh"
echo "2. Review and update database firewall rules manually"
echo "3. Set up monitoring alerts via DigitalOcean dashboard"
echo "4. Schedule regular security audits (monthly)"
echo ""

echo "=============================================="
echo "Audit completed at: $(date)"
echo "=============================================="
