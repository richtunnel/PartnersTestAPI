const axios = require('axios');
const fs = require('fs');
const path = require('path');

class MockDatabaseTester {
  constructor() {
    this.baseUrl = 'http://localhost:3000/api/v1';
    this.testApiKeys = {
      smith: 'ak_dev_smith_test123',
      doe: 'ak_dev_doe_test456',
      test: 'ak_test_key_test789'
    };
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runTest(testName, testFunction) {
    console.log(`${testName}...`);
    try {
      await testFunction();
      console.log(`${testName} PASSED`);
      this.results.passed++;
      this.results.tests.push({ name: testName, status: 'PASSED' });
    } catch (error) {
      console.log(`${testName} FAILED: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'FAILED', error: error.message });
    }
    console.log('');
  }

  async testApiConnection() {
    const response = await axios.get(`${this.baseUrl}/health`);
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }
    if (!response.data.status) {
      throw new Error('Health check response missing status');
    }
  }

  async testMockDatabaseIndicator() {
    const response = await axios.get(`${this.baseUrl}/health`);
    // In mock mode, we expect the database check to be successful but use mock data
    if (response.data.status !== 'healthy') {
      throw new Error('Expected healthy status from mock database');
    }
  }

  async testPreloadedData() {
    const response = await axios.get(`${this.baseUrl}/demographics`, {
      headers: { 'X-API-Key': this.testApiKeys.smith }
    });

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    if (!response.data.data || !Array.isArray(response.data.data)) {
      throw new Error('Expected demographics array in response');
    }

    // Should have at least the preloaded John Doe record
    const johnDoe = response.data.data.find(d => 
      d.firstname === 'John' && d.lastname === 'Doe'
    );

    if (!johnDoe) {
      throw new Error('Preloaded John Doe record not found');
    }
  }

  async testCreateDemographic() {
    const newDemographic = {
      law_firm: 'Test Firm',
      firstname: 'Test',
      lastname: 'CreateUser',
      email: 'test.create@example.com',
      phone: '5559999999',
      primarylawfirm: 'Test Firm',
      claimanttype: 'Adult',
      city: 'Test City',
      state: 'TX',
      zipcode: '12345'
    };

    const response = await axios.post(`${this.baseUrl}/demographics`, newDemographic, {
      headers: {
        'X-API-Key': this.testApiKeys.test,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': this.generateUUID()
      }
    });

    if (response.status !== 201) {
      throw new Error(`Expected 201, got ${response.status}`);
    }

    if (!response.data.data.id) {
      throw new Error('Response missing demographic ID');
    }

    return response.data.data.id;
  }

  async testGetDemographicById() {
    // First create a demographic to test with
    const demographicId = await this.testCreateDemographic();

    // Now retrieve it
    const response = await axios.get(`${this.baseUrl}/demographics/${demographicId}`, {
      headers: { 'X-API-Key': this.testApiKeys.test }
    });

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    if (response.data.data.id !== demographicId) {
      throw new Error('Retrieved demographic ID does not match');
    }
  }

  async testApiKeyValidation() {
    // Test with invalid API key
    try {
      await axios.get(`${this.baseUrl}/demographics`, {
        headers: { 'X-API-Key': 'invalid_key' }
      });
      throw new Error('Expected request to fail with invalid API key');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        // This is expected
        return;
      }
      throw error;
    }
  }

  async testBatchSubmission() {
    const batchData = {
      demographics: [
        {
          law_firm: 'Test Firm',
          firstname: 'Batch1',
          lastname: 'User',
          email: 'batch1@test.com',
          phone: '5551111111',
          primarylawfirm: 'Test Firm',
          claimanttype: 'Adult'
        },
        {
          law_firm: 'Test Firm',
          firstname: 'Batch2',
          lastname: 'User',
          email: 'batch2@test.com',
          phone: '5552222222',
          primarylawfirm: 'Test Firm',
          claimanttype: 'Minor'
        }
      ]
    };

    const response = await axios.post(`${this.baseUrl}/demographics/batch`, batchData, {
      headers: {
        'X-API-Key': this.testApiKeys.test,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': this.generateUUID()
      }
    });

    if (response.status !== 202) {
      throw new Error(`Expected 202, got ${response.status}`);
    }

    if (!response.data.data || response.data.data.length !== 2) {
      throw new Error('Expected 2 demographics in batch response');
    }
  }

  async testSearchAndFilter() {
    // Test search functionality
    const searchResponse = await axios.get(`${this.baseUrl}/demographics?search=John`, {
      headers: { 'X-API-Key': this.testApiKeys.smith }
    });

    if (searchResponse.status !== 200) {
      throw new Error(`Search request failed with status ${searchResponse.status}`);
    }

    // Should find the preloaded John Doe record
    const found = searchResponse.data.data.some(d => d.firstname === 'John');
    if (!found) {
      throw new Error('Search did not return expected results');
    }

    // Test filter by claimant type
    const filterResponse = await axios.get(`${this.baseUrl}/demographics?filter_claimanttype=Adult`, {
      headers: { 'X-API-Key': this.testApiKeys.smith }
    });

    if (filterResponse.status !== 200) {
      throw new Error(`Filter request failed with status ${filterResponse.status}`);
    }

    // All returned records should be Adult type
    const allAdults = filterResponse.data.data.every(d => d.claimanttype === 'Adult');
    if (!allAdults) {
      throw new Error('Filter results contain non-Adult records');
    }
  }

  async testDataPersistence() {
    // Check that the mock database file exists and contains data
    const mockDbPath = path.join(__dirname, 'mock-database.json');
    
    if (!fs.existsSync(mockDbPath)) {
      throw new Error('Mock database file does not exist');
    }

    const data = JSON.parse(fs.readFileSync(mockDbPath, 'utf8'));
    
    if (!data.demographics || !Array.isArray(data.demographics)) {
      throw new Error('Mock database missing demographics array');
    }

    if (!data.apiKeys || !Array.isArray(data.apiKeys)) {
      throw new Error('Mock database missing apiKeys array');
    }

    if (data.demographics.length === 0) {
      throw new Error('Mock database has no demographics data');
    }
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async runAllTests() {
    console.log('🧪 Mock Database Test Suite');
    console.log('===========================');
    console.log(`Base URL: ${this.baseUrl}`);
    console.log('');

    // Wait a moment for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    await this.runTest('API Connection', () => this.testApiConnection());
    await this.runTest('Mock Database Indicator', () => this.testMockDatabaseIndicator());
    await this.runTest('Preloaded Data', () => this.testPreloadedData());
    await this.runTest('Create Demographic', () => this.testCreateDemographic());
    await this.runTest('Get Demographic by ID', () => this.testGetDemographicById());
    await this.runTest('API Key Validation', () => this.testApiKeyValidation());
    await this.runTest('Batch Submission', () => this.testBatchSubmission());
    await this.runTest('Search and Filter', () => this.testSearchAndFilter());
    await this.runTest('Data Persistence', () => this.testDataPersistence());

    this.printSummary();
  }

  printSummary() {
    console.log('');
    console.log('📊 TEST RESULTS');
    console.log('================');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(2)}%`);
    
    if (this.results.failed > 0) {
      console.log('');
      console.log('❌ Failed Tests:');
      this.results.tests
        .filter(t => t.status === 'FAILED')
        .forEach(t => console.log(`   - ${t.name}: ${t.error}`));
    }

    console.log('');
    
    if (this.results.failed === 0) {
      console.log(' All tests passed! Mock database is working correctly.');
      console.log('');
      console.log(' Next steps:');
      console.log('   - Use REST Client extension with test-api.http');
      console.log('   - Run load tests: node src/test/load-test-100.js');
      console.log('   - Switch to real DB: ./scripts/setup-real-database.sh');
    } else {
      console.log('  Some tests failed. Check the errors above.');
      process.exit(1);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new MockDatabaseTester();
  tester.runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { MockDatabaseTester };