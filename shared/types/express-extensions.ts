import { Request } from 'express';

export interface ApiKey {
  id: string;
  partitionKey: string;
  key_id: string;
  key_hash: string;
  name: string;
  description?: string;
  law_firm: string;
  created_by: string;
  rate_limits: {
    requests_per_minute: number;
    requests_per_hour: number;
    requests_per_day: number;
    burst_limit: number;
  };
  scopes: string[];
  status: 'active' | 'suspended' | 'revoked';
  usage_count: number;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
  last_used_ip?: string;
  allowed_ips?: string[];
  allowed_domains?: string[];
  environment?: string;
}

export interface AuthContext {
  apiKey: ApiKey;
  lawFirm: string;
  keyId: string;
  scopes: string[];
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      rawBody?: string;
      auth?: AuthContext; // Optional since some routes allow anonymous access
    }
  }
}

export interface AuthenticatedRequest extends Request {
  auth: AuthContext; // Required auth context for authenticated routes
}

export interface AuthMiddlewareOptions {
  requiredScopes?: string[];
  skipRateLimit?: boolean;
  allowAnonymous?: boolean;
}