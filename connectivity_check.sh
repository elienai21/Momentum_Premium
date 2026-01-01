#!/bin/bash

# connectivity_check.sh
# Usage: ./connectivity_check.sh [ID_TOKEN] [TENANT_ID]

BASE_URL="https://momentum-premium.web.app/api"
ID_TOKEN=$1
TENANT_ID=$2

echo "--- 🏥 Public Health Check ---"
curl -s -X GET "$BASE_URL/health" -H "Content-Type: application/json" | grep -q "ok" && echo "✅ Public Health OK" || echo "❌ Public Health FAILED"

if [ -z "$ID_TOKEN" ]; then
  echo "⚠️ Skipping authenticated tests. Usage: ./connectivity_check.sh [ID_TOKEN] [TENANT_ID]"
  exit 0
fi

echo -e "\n--- 🔐 Authenticated CFO Summary Check ---"
if [ -z "$TENANT_ID" ]; then
  echo "❌ TENANT_ID missing for CFO check"
else
  RESPONSE=$(curl -s -X GET "$BASE_URL/cfo/summary" \
    -H "Content-Type: application/json" \
    -H "x-id-token: $ID_TOKEN" \
    -H "x-tenant-id: $TENANT_ID")
  
  if [[ $RESPONSE == *"status"* ]]; then
    echo "✅ Authenticated CFO Check OK"
    echo "$RESPONSE"
  else
    echo "❌ Authenticated CFO Check FAILED"
    echo "$RESPONSE"
  fi
fi

echo -e "\n--- 🏥 Public Signup (Protected via Token) ---"
# Note: This might fail if the user already has a tenant, but we check if the token is accepted
RESPONSE=$(curl -s -X POST "$BASE_URL/public/signup" \
  -H "Content-Type: application/json" \
  -H "x-id-token: $ID_TOKEN" \
  -d '{"companyName": "Test Audit Corp", "vertical": "finance"}')

if [[ $RESPONSE == *"status"* ]] || [[ $RESPONSE == *"error"* ]]; then
  echo "✅ Public Signup Endpoint reached (Response: $(echo $RESPONSE | cut -c1-50)...)"
else
  echo "❌ Public Signup Endpoint UNREACHABLE"
fi
