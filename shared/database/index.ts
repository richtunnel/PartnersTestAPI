import { DatabaseService, DemographicsFilters  } from './database.service';
import { MockDatabaseService } from '../database/database.factory';
import { IDatabaseService } from '../database/database.interface';

export const databaseService: IDatabaseService = process.env.USE_MOCK_DB === 'true' 
  ? new MockDatabaseService()
  : new DatabaseService();

export type { IDatabaseService, DemographicsFilters };