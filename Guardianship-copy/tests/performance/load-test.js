import { check } from 'k6';
import http from 'k6/http';
import { FormData } from 'https://jslib.k6.io/formdata/0.0.2/index.js';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200
    { duration: '5m', target: 200 }, // Stay at 200
    { duration: '2m', target: 500 }, // Ramp up to 500
    { duration: '10m', target: 500 }, // Stay at 500
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.1'],     // Error rate under 10%
  },
};

const BASE_URL = 'https://legal-docs-api.azurewebsites.net';

export default function() {
  // Test health endpoint
  let healthResponse = http.get(`${BASE_URL}/health`);
  check(healthResponse, {
    'health check status is 200': (r) => r.status === 200,
  });

  // Test document upload
  let formData = new FormData();
  formData.append('claimantGUID', '123e4567-e89b-12d3-a456-426614174000');
  formData.append('representativeGUID', '123e4567-e89b-12d3-a456-426614174001');
  formData.append('caseProjectID', 'CASE-2024-001');
  formData.append('guardianInformation[signingPriority]', '1');
  
  // Simulate document upload
  let documentData = new Uint8Array(1024 * 100); // 100KB dummy file
  formData.append('documents', http.file(documentData, 'test-document.pdf', 'application/pdf'));

  let uploadResponse = http.post(`${BASE_URL}/api/guardianship`, formData.body(), {
    headers: { 'Content-Type': 'multipart/form-data; boundary=' + formData.boundary },
  });

  check(uploadResponse, {
    'upload status is 201': (r) => r.status === 201,
    'response has requestId': (r) => JSON.parse(r.body).requestId !== undefined,
  });
}