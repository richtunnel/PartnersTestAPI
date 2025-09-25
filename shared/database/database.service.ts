import sql from 'mssql';
import { Demographics } from '../types/demographics';
import { ApiKey } from '../types/apiKey';
import { logger } from '../utils/logger';
import { getPool } from './connection';

export interface DemographicsFilters {
  claimanttype?: string;
  status?: string;
  search?: string;
}

export class DatabaseService {
  async getPool(): Promise<sql.ConnectionPool> {
    return getPool();
  }

  // Demographics operations
  async createDemographic(demographic: Demographics): Promise<void> {
    const pool = await this.getPool();
    const request = pool.request();

    const query = `
      INSERT INTO Demographics (
        id, partitionKey, law_firm, firstname, lastname, email, phone, 
        primarylawfirm, claimanttype, ethnicity, city, state, zipcode,
        created_at, updated_at, created_by, status
      ) VALUES (
        @id, @partitionKey, @law_firm, @firstname, @lastname, @email, @phone,
        @primarylawfirm, @claimanttype, @ethnicity, @city, @state, @zipcode,
        @created_at, @updated_at, @created_by, @status
      )
    `;

    request.input('id', sql.UniqueIdentifier, demographic.id);
    request.input('partitionKey', sql.VarChar(75), demographic.partitionKey);
    request.input('law_firm', sql.VarChar(55), demographic.law_firm);
    request.input('firstname', sql.VarChar(55), demographic.firstname || null);
    request.input('lastname', sql.VarChar(75), demographic.lastname || null);
    request.input('email', sql.VarChar(100), demographic.email);
    request.input('phone', sql.VarChar(11), demographic.phone);
    request.input('primarylawfirm', sql.VarChar(75), demographic.primarylawfirm);
    request.input('claimanttype', sql.VarChar(35), demographic.claimanttype);
    request.input('ethnicity', sql.VarChar(11), demographic.ethnicity);
    request.input('city', sql.VarChar(55), demographic.city || null);
    request.input('state', sql.VarChar(2), demographic.state || null);
    request.input('zipcode', sql.VarChar(25), demographic.zipcode || null);
    request.input('created_at', sql.DateTime2, new Date(demographic.created_at));
    request.input('updated_at', sql.DateTime2, new Date(demographic.updated_at));
    request.input('created_by', sql.UniqueIdentifier, demographic.created_by);
    request.input('status', sql.VarChar(20), demographic.status);

    await request.query(query);
    logger.info('Demographic created', { id: demographic.id, law_firm: demographic.law_firm });
  }

  async getDemographicById(id: string, lawFirm: string): Promise<Demographics | null> {
    const pool = await this.getPool();
    const request = pool.request();

    const result = await request
      .input('id', sql.UniqueIdentifier, id)
      .input('partitionKey', sql.VarChar(75), lawFirm)
      .query(`
        SELECT * FROM Demographics 
        WHERE id = @id AND partitionKey = @partitionKey
      `);

    return result.recordset.length > 0 ? result.recordset[0] as Demographics : null;
  }

  async getDemographicsByLawFirm(
    lawFirm: string,
    limit: number = 50,
    offset: number = 0,
    filters?: DemographicsFilters
  ): Promise<Demographics[]> {
    const pool = await this.getPool();
    const request = pool.request();

    let whereClause = 'WHERE partitionKey = @partitionKey AND status != @deletedStatus';
    let orderClause = 'ORDER BY created_at DESC';

    request.input('partitionKey', sql.VarChar(75), lawFirm);
    request.input('deletedStatus', sql.VarChar(20), 'deleted');
    request.input('limit', sql.Int, limit);
    request.input('offset', sql.Int, offset);

    if (filters?.claimanttype) {
      whereClause += ' AND claimanttype = @claimanttype';
      request.input('claimanttype', sql.VarChar(35), filters.claimanttype);
    }

    if (filters?.status) {
      whereClause += ' AND status = @status';
      request.input('status', sql.VarChar(20), filters.status);
    }

    if (filters?.search) {
      whereClause += ' AND (firstname LIKE @search OR lastname LIKE @search OR email LIKE @search)';
      request.input('search', sql.VarChar(255), `%${filters.search}%`);
    }

    const query = `
      SELECT * FROM Demographics 
      ${whereClause}
      ${orderClause}
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const result = await request.query(query);
    return result.recordset as Demographics[];
  }

  async updateDemographic(id: string, demographic: Partial<Demographics>): Promise<void> {
    const pool = await this.getPool();
    const request = pool.request();

    const updateFields = Object.keys(demographic)
      .filter(key => key !== 'id' && key !== 'partitionKey' && key !== 'created_at')
      .map(key => `${key} = @${key}`)
      .join(', ');

    if (!updateFields) {
      throw new Error('No fields to update');
    }

    const query = `UPDATE Demographics SET ${updateFields}, updated_at = @updated_at WHERE id = @id`;

    request.input('id', sql.UniqueIdentifier, id);
    request.input('updated_at', sql.DateTime2, new Date());

    Object.entries(demographic).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'partitionKey' && key !== 'created_at') {
        if (key.includes('date') || key.includes('dob') || key.includes('dod')) {
          request.input(key, sql.DateTime2, value ? new Date(value as string) : null);
        } else if (typeof value === 'number') {
          request.input(key, sql.Decimal(15, 4), value);
        } else {
          request.input(key, sql.NVarChar, value);
        }
      }
    });

    await request.query(query);
    logger.info('Demographic updated', { id });
  }

  async softDeleteDemographic(id: string, lawFirm: string): Promise<void> {
    const pool = await this.getPool();
    const request = pool.request();

    await request
      .input('id', sql.UniqueIdentifier, id)
      .input('partitionKey', sql.VarChar(75), lawFirm)
      .input('updated_at', sql.DateTime2, new Date())
      .query(`
        UPDATE Demographics 
        SET status = 'deleted', updated_at = @updated_at
        WHERE id = @id AND partitionKey = @partitionKey
      `);

    logger.info('Demographic soft deleted', { id });
  }

  // API Key operations
  async createApiKey(apiKey: ApiKey): Promise<void> {
    const pool = await this.getPool();
    const request = pool.request();

    const query = `
      INSERT INTO ApiKeys (
        id, partitionKey, key_id, key_hash, name, description, law_firm, created_by,
        rate_limits, scopes, status, usage_count, expires_at, created_at, updated_at
      ) VALUES (
        @id, @partitionKey, @key_id, @key_hash, @name, @description, @law_firm, @created_by,
        @rate_limits, @scopes, @status, @usage_count, @expires_at, @created_at, @updated_at
      )
    `;

    request.input('id', sql.UniqueIdentifier, apiKey.id);
    request.input('partitionKey', sql.VarChar(75), apiKey.partitionKey);
    request.input('key_id', sql.VarChar(50), apiKey.key_id);
    request.input('key_hash', sql.VarChar(255), apiKey.key_hash);
    request.input('name', sql.VarChar(100), apiKey.name);
    request.input('description', sql.VarChar(500), apiKey.description);
    request.input('law_firm', sql.VarChar(60), apiKey.law_firm);
    request.input('created_by', sql.UniqueIdentifier, apiKey.created_by);
    request.input('rate_limits', sql.NVarChar(sql.MAX), JSON.stringify(apiKey.rate_limits));
    request.input('scopes', sql.NVarChar(sql.MAX), JSON.stringify(apiKey.scopes));
    request.input('status', sql.VarChar(20), apiKey.status);
    request.input('usage_count', sql.Int, apiKey.usage_count);
    request.input('expires_at', sql.DateTime2, apiKey.expires_at ? new Date(apiKey.expires_at) : null);
    request.input('created_at', sql.DateTime2, new Date(apiKey.created_at));
    request.input('updated_at', sql.DateTime2, new Date(apiKey.updated_at));

    await request.query(query);
  }

  async getApiKeyByHash(keyHash: string): Promise<ApiKey | null> {
    const pool = await this.getPool();
    const request = pool.request();

    const result = await request
      .input('key_hash', sql.VarChar(255), keyHash)
      .query(`SELECT * FROM ApiKeys WHERE key_hash = @key_hash AND status != 'revoked'`);

    if (result.recordset.length === 0) return null;

    const row = result.recordset[0];
    return {
      ...row,
      rate_limits: JSON.parse(row.rate_limits),
      scopes: JSON.parse(row.scopes),
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
      expires_at: row.expires_at ? row.expires_at.toISOString() : null,
      last_used_at: row.last_used_at ? row.last_used_at.toISOString() : null,
    } as ApiKey;
  }

  async updateApiKeyUsage(apiKeyId: string, ipAddress: string): Promise<void> {
    const pool = await this.getPool();
    const request = pool.request();

    await request
      .input('id', sql.UniqueIdentifier, apiKeyId)
      .input('last_used_ip', sql.VarChar(45), ipAddress)
      .query(`
        UPDATE ApiKeys 
        SET usage_count = usage_count + 1,
            last_used_at = GETUTCDATE(),
            last_used_ip = @last_used_ip,
            updated_at = GETUTCDATE()
        WHERE id = @id
      `);
  }
}

export const databaseService = new DatabaseService();