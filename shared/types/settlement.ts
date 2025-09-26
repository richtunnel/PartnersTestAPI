import { z } from 'zod';

// EXACT field names from your specifications - NO ADDITIONS
export interface AttorneyFees {
  FirmName: string;                    // Your field name
  AttorneyFeeDescription: string;      // Your field name
  AttorneyFeeAmount: number;           // Your field name
  AttorneyFeePercentage: number;       // Your field name
}

export interface AttorneyCosts {
  FirmName: string;                    // Your field name
  AttorneyCostDescription: string;     // Your field name
  AttorneyCostAmount: number;          // Your field name
}

export interface VendorFees {
  VendorName: string;                  // Your field name
  VendorType: string;                  // Your field name
  VendorFeeDescription: string;        // Your field name
  VendorFeeAmount: number;             // Your field name
  VendorFeePercentage: number;         // Your field name
}

export interface VendorCosts {
  VendorName: string;                  // Your field name
  VendorType: string;                  // Your field name
  VendorCostDescription: string;       // Your field name
  VendorCostAmount: number;            // Your field name
}

export interface Settlement {
  ClaimantGUID: string;                // Your field name
  CaseProjectID: string;               // Your field name
  OtherID1?: string;                   // Your field name
  OtherID2?: string;                   // Your field name
  BaseGrossAwardAmount: number;        // Your field name
  EIFAwardAmount?: number;             // Your field name
  AppealAwardAmount?: number;          // Your field name
  AttorneyFees: AttorneyFees[];        // Your field name - array for multiple firms
  AttorneyCosts: AttorneyCosts[];      // Your field name - array for multiple costs
  VendorFees: VendorFees[];            // Your field name - array for multiple vendors
  VendorCosts: VendorCosts[];          // Your field name - array for multiple costs
}

export const SettlementSchema = z.object({
  ClaimantGUID: z.string(),
  CaseProjectID: z.string(),
  OtherID1: z.string().optional(),
  OtherID2: z.string().optional(),
  BaseGrossAwardAmount: z.number(),
  EIFAwardAmount: z.number().optional(),
  AppealAwardAmount: z.number().optional(),
  AttorneyFees: z.array(z.object({
    FirmName: z.string(),
    AttorneyFeeDescription: z.string(),
    AttorneyFeeAmount: z.number(),
    AttorneyFeePercentage: z.number()
  })),
  AttorneyCosts: z.array(z.object({
    FirmName: z.string(),
    AttorneyCostDescription: z.string(),
    AttorneyCostAmount: z.number()
  })),
  VendorFees: z.array(z.object({
    VendorName: z.string(),
    VendorType: z.string(),
    VendorFeeDescription: z.string(),
    VendorFeeAmount: z.number(),
    VendorFeePercentage: z.number()
  })),
  VendorCosts: z.array(z.object({
    VendorName: z.string(),
    VendorType: z.string(),
    VendorCostDescription: z.string(),
    VendorCostAmount: z.number()
  }))
});