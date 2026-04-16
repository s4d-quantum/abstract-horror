#!/bin/bash

# Login and get token
echo "Logging in..."
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.accessToken')

echo "Token: ${TOKEN:0:30}..."
echo ""

# Test metrics
echo "=== Dashboard Metrics ==="
curl -s http://localhost:3001/api/dashboard/metrics \
  -H "Authorization: Bearer $TOKEN" | jq '.metrics'
echo ""

# Test recent purchase orders
echo "=== Recent Purchase Orders ==="
curl -s http://localhost:3001/api/dashboard/recent-purchase-orders \
  -H "Authorization: Bearer $TOKEN" | jq '.orders | length'
echo ""

# Test recent sales orders
echo "=== Recent Sales Orders ==="
curl -s http://localhost:3001/api/dashboard/recent-sales-orders \
  -H "Authorization: Bearer $TOKEN" | jq '.orders | length'
echo ""

echo "✓ Dashboard API tests complete"
