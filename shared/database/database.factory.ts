// src/shared/database/mockDatabase.service.ts
import { Demographics } from '../types/demographics';
import { ApiKey } from '../types/apiKey';
import { logger } from '../utils/logger';
import { IDatabaseService} from '../database/database.interface';


export class MockDatabaseService implements IDatabaseService {
  private demographics: Map<string, Demographics> = new Map();
  private apiKeys: Map<string, ApiKey> = new Map();
  private connected = false;

  constructor() {
    // Simulate connection
    setTimeout(() => {
      this.connected = true;
      logger.info('Mock database connected');
    }, 100);
  }

  async getPool(): Promise<any> {
    if (!this.connected) {
      throw new Error('Mock database not connected');
    }
    return { connected: true, mock: true };
  }

  // Demographics operations
  async createDemographic(demographic: Demographics): Promise<void> {
    await this.simulateDelay(50); // Simulate database latency
    
    if (this.demographics.has(demographic.id)) {
      throw new Error('Demographic already exists');
    }
    
    this.demographics.set(demographic.id, { ...demographic });
    
    logger.info('Mock: Demographics created', {
      id: demographic.id,
      lawFirm: demographic.law_firm,
      totalRecords: this.demographics.size
    });
  }

  async getDemographicById(id: string, lawFirm: string): Promise<Demographics | null> {
    await this.simulateDelay(25);
    
    const demographic = this.demographics.get(id);
    if (!demographic || demographic.partitionKey !== lawFirm) {
      return null;
    }
    
    return { ...demographic };
  }

  async getDemographicsByLawFirm(
    lawFirm: string,
    limit: number = 50,
    offset: number = 0,
    filters?: any
  ): Promise<Demographics[]> {
    await this.simulateDelay(75);
    
    let results = Array.from(this.demographics.values())
      .filter(d => d.partitionKey === lawFirm);

    // Apply filters
    if (filters?.claimanttype) {
      results = results.filter(d => d.claimanttype === filters.claimanttype);
    }
    
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      results = results.filter(d => 
        d.firstname?.toLowerCase().includes(search) ||
        d.lastname?.toLowerCase().includes(search) ||
        d.email?.toLowerCase().includes(search)
      );
    }

    // Apply pagination
    return results
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(offset, offset + limit);
  }

  async updateDemographic(id: string, demographic: Partial<Demographics>): Promise<void> {
    await this.simulateDelay(50);
    
    const existing = this.demographics.get(id);
    if (!existing) {
      throw new Error('Demographic not found');
    }
    
    const updated = {
      ...existing,
      ...demographic,
      updated_at: new Date().toISOString()
    };
    
    this.demographics.set(id, updated);
    logger.info('Mock: Demographics updated', { id });
  }

  async softDeleteDemographic(id: string, lawFirm: string): Promise<void> {
    await this.simulateDelay(25);
    
    const demographic = this.demographics.get(id);
    if (!demographic || demographic.partitionKey !== lawFirm) {
      throw new Error('Demographic not found');
    }
    
    demographic.status = 'deleted';
    demographic.updated_at = new Date().toISOString();
    
    logger.info('Mock: Demographics soft deleted', { id });
  }

  // API Key operations
  async createApiKey(apiKey: ApiKey): Promise<void> {
    await this.simulateDelay(50);
    
    this.apiKeys.set(apiKey.key_hash, { ...apiKey });
    logger.info('Mock: API key created', { keyId: apiKey.key_id });
  }

  async getApiKeyByHash(keyHash: string): Promise<ApiKey | null> {
    await this.simulateDelay(25);
    
    const apiKey = this.apiKeys.get(keyHash);
    return apiKey ? { ...apiKey } : null;
  }

  async updateApiKeyUsage(apiKeyId: string, ipAddress: string): Promise<void> {
    await this.simulateDelay(10);
    
    // Find by ID and update usage
    for (const [hash, apiKey] of this.apiKeys.entries()) {
      if (apiKey.id === apiKeyId) {
        apiKey.usage_count = (apiKey.usage_count || 0) + 1;
        apiKey.last_used_at = new Date().toISOString();
        apiKey.last_used_ip = ipAddress;
        apiKey.updated_at = new Date().toISOString();
        break;
      }
    }
  }

  // Batch operations
  async createDemographicsBatch(demographics: Demographics[]): Promise<void> {
    await this.simulateDelay(100);
    
    for (const demographic of demographics) {
      await this.createDemographic(demographic);
    }
  }

  // Mock-specific utilities
  private async simulateDelay(ms: number): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      return; // No delay in tests
    }
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Test utilities
  clearAll(): void {
    this.demographics.clear();
    this.apiKeys.clear();
    logger.info('Mock database cleared');
  }

  getStats() {
    return {
      demographics: this.demographics.size,
      apiKeys: this.apiKeys.size,
      connected: this.connected
    };
  }

  // Seed test data
  async seedTestData(): Promise<void> {
    const testApiKey: ApiKey = {
      id: 'test-api-key-id',
      partitionKey: 'Test Law Firm',
      key_id: 'ak_test123',
      key_hash: 'test-hash-123',
      name: 'Test API Key',
      description: 'Mock API key for testing',
      law_firm: 'Test Law Firm',
      created_by: 'test-user-id',
      rate_limits: {
        requests_per_minute: 100,
        requests_per_hour: 5000,
        requests_per_day: 50000,
        burst_limit: 200
      },
      scopes: ['demographics:read', 'demographics:write', 'demographics:admin'],
      status: 'active',
      usage_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await this.createApiKey(testApiKey);

    const testDemographic: Demographics = {
      id: 'test-demographic-id',
      partitionKey: 'Test Law Firm',
      law_firm: 'Test Law Firm',
      firstname: 'John',
      lastname: 'TestUser',
      email: 'john@test.com',
      phone: '5551234567',
      primarylawfirm: 'Test Law Firm',
      claimanttype: 'Adult',
      ethnicity: 'Not Specified',
      city: 'Dallas',
      state: 'TX',
      zipcode: '75001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'test-user-id',
      status: 'active'
    };

    await this.createDemographic(testDemographic);
    
    logger.info('Mock database seeded with test data');
  }
}

export const mockDatabaseService = new MockDatabaseService();