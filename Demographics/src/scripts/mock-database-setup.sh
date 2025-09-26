#!/bin/bash
# scripts/setup-mock-testing.sh - Setup script for mock database testing

set -e

echo "Setting up Mock Database Testing Environment"
# Create test directory if it doesn't exist
mkdir -p src/test

# Copy mock database JSON file
cat > src/test/mock-database.json << 'EOF'
{
  "demographics": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "partitionKey": "Smith & Associates",
      "law_firm": "Smith & Associates",
      "firstname": "John",
      "lastname": "Doe",
      "email": "john.doe@email.com",
      "phone": "5551234567",
      "primarylawfirm": "Smith & Associates",
      "claimanttype": "Adult",
      "city": "Dallas",
      "state": "TX",
      "zipcode": "75001",
      "basegrossaward": 100000.00,
      "totalgrossaward": 115000.00,
      "netclaimantpayment": 46550.00,
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z",
      "created_by": "550e8400-e29b-41d4-a716-446655440011",
      "status": "active"
    }
  ],
  "apiKeys": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440011",
      "partitionKey": "Smith & Associates",
      "key_id": "ak_dev_smith",
      "key_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYbp4QwI4GZvQ1y",
      "name": "Smith & Associates Development Key",
      "law_firm": "Smith & Associates",
      "created_by": "550e8400-e29b-41d4-a716-446655440021",
      "rate_limits": {
        "requests_per_minute": 1000,
        "requests_per_hour": 10000,
        "requests_per_day": 100000,
        "burst_limit": 500
      },
      "scopes": ["demographics:read", "demographics:write", "demographics:admin"],
      "status": "active",
      "usage_count": 0,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "environment": "development"
    }
  ],
  "lawFirms": [],
  "idempotency_records": [],
  "meta": {
    "version": "1.0.0",
    "created_at": "2024-01-15T00:00:00Z",
    "test_api_keys": {
      "smith": "ak_dev_smith_test123",
      "doe": "ak_dev_doe_test456",
      "test": "ak_test_key_test789"
    }
  }
}
EOF

# Copy environment file for mock testing
cp .env.mock .env

echo " Mock database JSON created at src/test/mock-database.json"
echo " Environment configured for mock database testing"
echo ""
echo " Available Test API Keys:"
echo "   - ak_dev_smith_test123 (Smith & Associates - Full Access)"
echo "   - ak_dev_doe_test456   (Doe Legal Group - Read/Write)"
echo "   - ak_test_key_test789  (Test Firm - Full Access)"
echo ""
echo " Start the server:"
echo "   npm run dev"
echo ""
echo " Test with curl:"
echo "   curl -H \"X-API-Key: ak_dev_smith_test123\" http://localhost:3000/api/v1/health"
echo "   curl -H \"X-API-Key: ak_dev_smith_test123\" http://localhost:3000/api/v1/demographics"

---

#!/bin/bash
# scripts/setup-real-database.sh - Setup script for real database

set -e

echo "🗄️  Setting up Real Database Environment"
echo "======================================="

# Copy environment file for real database
cp .env.real .env

echo "✅ Environment configured for real database"
echo ""
echo "🐳 Start Docker services:"
echo "   docker-compose up -d"
echo ""
echo "⏳ Wait for services to start, then:"
echo "   npm run dev"
echo ""
echo "🔑 You'll need to create API keys via the admin endpoint:"
echo "   curl -X POST http://localhost:3000/api/v1/admin/api-keys \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"name\":\"Test Key\",\"law_firm\":\"Test Firm\",\"created_by_email\":\"test@test.com\",\"scopes\":[\"demographics:read\",\"demographics:write\"]}'"

---

#!/bin/bash
# scripts/test-api.sh - Comprehensive API testing script

set -e

BASE_URL="http://localhost:3000/api/v1"
API_KEY="dev-key-test"  # Default test API key for mock mode

echo "Demographics API Test Suite"
echo "Base URL: $BASE_URL"
echo "API Key: $API_KEY"
echo ""

# Function to make API calls with error handling
api_call() {
  local method=$1
  local endpoint=$2
  local data=$3
  local extra_headers=$4
  
  echo "📡 $method $endpoint"
  
  if [ -n "$data" ]; then
    response=$(curl -s -X "$method" "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -H "X-API-Key: $API_KEY" \
      $extra_headers \
      -d "$data" \
      -w "\nHTTP_STATUS:%{http_code}")
  else
    response=$(curl -s -X "$method" "$BASE_URL$endpoint" \
      -H "X-API-Key: $API_KEY" \
      $extra_headers \
      -w "\nHTTP_STATUS:%{http_code}")
  fi
  
  http_code=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
  body=$(echo "$response" | sed '/HTTP_STATUS:/d')
  
  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo "Success ($http_code)"
    echo "$body" | jq . 2>/dev/null || echo "$body"
  else
    echo "Failed ($http_code)"
    echo "$body"
  fi
  
  echo ""
}

# Test 1: Health Check
echo "Test 1: Health Check"
api_call "GET" "/health"

# Test 2: Get Demographics List
echo "Test 2: Get Demographics List"
api_call "GET" "/demographics?limit=5"

# Test 3: Submit New Demographics
echo "Test 3: Submit Demographics"
DEMOGRAPHICS_DATA='{
  "law_firm": "Smith & Associates",
  "firstname": "API",
  "lastname": "TestUser",
  "email": "apitest@example.com",
  "phone": "5551112222",
  "primarylawfirm": "Smith & Associates",
  "claimanttype": "Adult",
  "city": "Austin",
  "state": "TX",
  "zipcode": "78701"
}'

IDEMPOTENCY_KEY=$(uuidgen 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())")
api_call "POST" "/demographics" "$DEMOGRAPHICS_DATA" "-H \"X-Idempotency-Key: $IDEMPOTENCY_KEY\""

# Test 4: Test Idempotency (same request again)
echo "Test 4: Test Idempotency (duplicate request)"
api_call "POST" "/demographics" "$DEMOGRAPHICS_DATA" "-H \"X-Idempotency-Key: $IDEMPOTENCY_KEY\""

# Test 5: Batch Submit
echo "Test 5: Batch Demographics Submission"
BATCH_DATA='{
  "demographics": [
    {
      "law_firm": "Smith & Associates",
      "firstname": "Batch1",
      "lastname": "User",
      "email": "batch1@test.com",
      "phone": "5553333333",
      "primarylawfirm": "Smith & Associates",
      "claimanttype": "Adult"
    },
    {
      "law_firm": "Smith & Associates", 
      "firstname": "Batch2",
      "lastname": "User",
      "email": "batch2@test.com",
      "phone": "5554444444",
      "primarylawfirm": "Smith & Associates",
      "claimanttype": "Minor"
    }
  ],
  "batch_options": {
    "priority": 8,
    "notify_on_completion": true
  }
}'

BATCH_IDEMPOTENCY_KEY=$(uuidgen 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())")
api_call "POST" "/demographics/batch" "$BATCH_DATA" "-H \"X-Idempotency-Key: $BATCH_IDEMPOTENCY_KEY\""

# Test 6: Document Upload URL Generation
echo "Test 6: Generate Document Upload URL"
UPLOAD_DATA='{
  "fileName": "test-document.pdf",
  "contentType": "application/pdf",
  "documentType": "demographics_form",
  "maxFileSizeMB": 5
}'
api_call "POST" "/documents/upload-url" "$UPLOAD_DATA"

# Test 7: Search Demographics
echo "Test 7: Search Demographics"
api_call "GET" "/demographics?search=API&limit=10"

# Test 8: Filter by Claimant Type
echo "Test 8: Filter by Claimant Type"
api_call "GET" "/demographics?filter_claimanttype=Adult&limit=10"

echo " API Testing Complete!"
echo ""
echo " Tips:"
echo "   - Check logs: docker-compose logs -f api (if using real DB)"
echo "   - View mock data: cat src/test/mock-database.json"
echo "   - Switch to real DB: ./scripts/setup-real-database.sh"
echo "   - Switch to mock DB: ./scripts/setup-mock-testing.sh"

---

#!/bin/bash
# scripts/switch-database-mode.sh - Switch between mock and real database

set -e

MODE=$1

if [ "$MODE" = "mock" ]; then
    echo "🧪 Switching to Mock Database Mode"
    cp .env.mock .env
    echo "Mock database environment activated"
    echo "   - No Docker services required"
    echo "   - Sample data pre-loaded"
    echo "   - Test API keys ready to use"
    echo ""
    echo "Start server: npm run dev"
    
elif [ "$MODE" = "real" ]; then
    echo "🗄️  Switching to Real Database Mode"
    cp .env.real .env
    echo "Real database environment activated"
    echo "   - Docker services required"
    echo "   - Database needs initialization"
    echo ""
    echo "Next steps:"
    echo "1. docker-compose up -d"
    echo "2. Wait for services to start"
    echo "3. npm run dev"
    
else
    echo "Invalid mode. Usage:"
    echo "   ./scripts/switch-database-mode.sh mock   # Use mock database"
    echo "   ./scripts/switch-database-mode.sh real   # Use real database"
    echo ""
    echo "Current mode: $([ "$USE_MOCK_DATABASE" = "true" ] && echo "Mock" || echo "Real")"
fi