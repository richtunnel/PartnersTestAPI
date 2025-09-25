import sql from 'mssql';
import { Demographics } from '../types/demographics';
import { ApiKey } from '../types/apiKey';

export interface DemographicsFilters {
  claimanttype?: string;
  status?: string;
  search?: string;
}

export interface IDatabaseService {
  getPool(): Promise<sql.ConnectionPool>;
  
  // Demographics operations
  createDemographic(demographic: Demographics): Promise<void>;
  getDemographicById(id: string, lawFirm: string): Promise<Demographics | null>;
  getDemographicsByLawFirm(
    lawFirm: string,
    limit?: number,
    offset?: number,
    filters?: DemographicsFilters
  ): Promise<Demographics[]>;
  updateDemographic(id: string, demographic: Partial<Demographics>): Promise<void>;
  softDeleteDemographic(id: string, lawFirm: string): Promise<void>;
  createDemographicsBatch(demographics: Demographics[]): Promise<void>;
  
  // API Key operations
  createApiKey(apiKey: ApiKey): Promise<void>;
  getApiKeyByHash(keyHash: string): Promise<ApiKey | null>;
  updateApiKeyUsage(apiKeyId: string, ipAddress: string): Promise<void>;
}