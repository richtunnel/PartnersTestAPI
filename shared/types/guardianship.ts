// src/shared/types/guardianship.ts
import { z } from 'zod';

// Enums from Demographics API - matching your data model
export const ClaimantTypeSchema = z.enum([
  'Adult',
  'Minor', 
  'Incapacitated Adult',
  'Decedent',
  'Alternate',
  'Municipality'
]);

export const AlternateClaimantTypeSchema = z.enum([
  'Personal Representative (POA)',
  'Trustee',
  'Estate Representative', 
  'Heir',
  'Other'
]);

export const GuardianTypeSchema = z.enum([
  'Legal Guardian',
  'Court Appointed Guardian',
  'Power of Attorney',
  'Trustee',
  'Estate Representative',
  'Parent/Natural Guardian',
  'Conservator'
]);

// Document validation schemas (existing)
const GuardianIdDocumentTypeSchema = z.enum([
  'Valid Drivers License',
  'Valid State-Issued ID',
  'Valid US Passport',
  'Valid US Military ID'
]);

const GuardianRelationshipDocumentTypeSchema = z.enum([
  'Birth Certificate',
  'Custodial Document',
  'Adoption Order',
  'Guardianship Document',
  'Court Order',
  'Power of Attorney Document',
  'Death Certificate',
  'Other Guardian Document'
]);

// Enhanced document schema
export const DocumentSchema = z.object({
  documentType: z.union([GuardianIdDocumentTypeSchema, GuardianRelationshipDocumentTypeSchema]),
  fileName: z.string().min(1),
  fileSize: z.number().positive(),
  mimeType: z.string(),
  category: z.enum(['guardian_id', 'guardian_relationship']),
  status: z.enum(['pending', 'verified', 'rejected', 'pending_review']).optional(),
  uploadDate: z.string().optional(),
  verifiedDate: z.string().optional(),
  notes: z.string().optional()
});

// Guardian information schema
export const GuardianInformationSchema = z.object({
  signingPriority: z.number().int().positive(),
  guardianType: GuardianTypeSchema,
  relationshipToClaimant: z.string().min(1),
  courtOrderNumber: z.string().optional(),
  courtOrderDate: z.string().optional(), // ISO date string
  courtJurisdiction: z.string().optional(),
  appointmentStartDate: z.string().optional(),
  appointmentEndDate: z.string().optional(),
  limitations: z.string().optional(), // Any limitations on guardianship
  emergencyContact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    relationship: z.string().optional()
  }).optional()
});

// Alternate claimant information (from demographics model)
export const AlternateClaimantSchema = z.object({
  type: AlternateClaimantTypeSchema,
  sf_id: z.string().max(50).optional(),
  ml_id: z.string().max(50).optional(),
  firstName: z.string().max(55),
  lastName: z.string().max(75),
  honorific: z.string().max(10).optional(),
  dob: z.string().max(10).optional(), // YYYY-MM-DD
  ssn: z.string().max(11).optional(),
  address: z.object({
    address1: z.string().max(75).optional(),
    address2: z.string().max(75).optional(),
    city: z.string().max(55).optional(),
    state: z.string().max(2).optional(),
    region: z.string().max(50).optional(),
    zipcode: z.string().max(25).optional(),
    country: z.string().max(55).optional()
  }).optional(),
  contactInfo: z.object({
    email: z.string().max(75).optional(),
    phone: z.string().max(20).optional()
  }).optional(),
  relationshipToClaimant: z.string().optional()
});

// Main guardianship intake schema (for document uploads)
export const GuardianshipIntakeSchema = z.object({
  claimantGUID: z.string().uuid(),
  representativeGUID: z.string().uuid(),
  caseId: z.string().min(1), // Single case ID, not array
  otherId1: z.string().optional(),
  otherId2: z.string().optional(),
  guardianInformation: GuardianInformationSchema,
  alternateClaimant: AlternateClaimantSchema.optional(),
  documentation: z.array(DocumentSchema).min(1),
  notes: z.string().optional()
});

// Schema for CRUD operations - more comprehensive claimant data
export const GuardianshipClaimantSchema = z.object({
  claimantGUID: z.string().uuid(),
  caseId: z.string().min(1),
  claimantType: ClaimantTypeSchema,
  
  // Basic claimant info (from demographics)
  firstName: z.string().max(55).optional(),
  lastName: z.string().max(75).optional(),
  
  // Guardianship-specific information
  guardianInformation: GuardianInformationSchema,
  alternateClaimant: AlternateClaimantSchema.optional(),
  
  // Document tracking
  documentation: z.object({
    guardianIdDocuments: z.array(DocumentSchema).optional(),
    guardianRelationshipDocuments: z.array(DocumentSchema).optional()
  }).optional(),
  
  // Status and metadata
  status: z.enum(['active', 'inactive', 'pending_verification', 'suspended', 'terminated']),
  verificationStatus: z.enum(['pending', 'verified', 'rejected', 'under_review']).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string().uuid().optional(),
  lastModifiedBy: z.string().uuid().optional(),
  
  // Additional tracking
  notes: z.string().optional(),
  tags: z.array(z.string()).optional()
});

// Schema for updating guardianship information
export const GuardianshipUpdateSchema = z.object({
  guardianInformation: GuardianInformationSchema.partial().optional(),
  alternateClaimant: AlternateClaimantSchema.partial().optional(),
  status: z.enum(['active', 'inactive', 'pending_verification', 'suspended', 'terminated']).optional(),
  verificationStatus: z.enum(['pending', 'verified', 'rejected', 'under_review']).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional()
});

// Document upload response schema
export type ProcessedDocument = {
  originalName: string;
  storedName: string;
  blobUrl: string;
  documentId: string;
  category: 'guardian_id' | 'guardian_relationship';
  documentType: string;
  uploadTimestamp: string;
  status?: 'pending' | 'verified' | 'rejected' | 'pending_review';
  verificationNotes?: string;
};

// Enhanced processed intake for service bus
export type ProcessedIntake = GuardianshipIntake & {
  intakeId: string;
  processedDocuments: ProcessedDocument[];
  timestamp: string;
  status: 'processed';
  blobStorageLocation: string;
  processingNotes?: string;
};

// Database entity schemas for MilestoneDB integration
export const GuardianshipEntitySchema = z.object({
  id: z.string().uuid(),
  claimantGUID: z.string().uuid(),
  caseId: z.string(),
  intakeId: z.string().uuid().optional(),
  
  // Guardian details
  guardianType: GuardianTypeSchema,
  relationshipToClaimant: z.string(),
  signingPriority: z.number().int(),
  
  // Court information
  courtOrderNumber: z.string().optional(),
  courtOrderDate: z.date().optional(),
  courtJurisdiction: z.string().optional(),
  
  // Alternate claimant
  alternateClaimantType: AlternateClaimantTypeSchema.optional(),
  alternateClaimantName: z.string().optional(),
  alternateClaimantContact: z.string().optional(),
  
  // Status and tracking
  status: z.string(),
  verificationStatus: z.string().optional(),
  documentsUploaded: z.number().int().default(0),
  documentsVerified: z.number().int().default(0),
  
  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
  verifiedAt: z.date().optional()
});

// Type exports
export type GuardianshipIntake = z.infer<typeof GuardianshipIntakeSchema>;
export type GuardianshipClaimant = z.infer<typeof GuardianshipClaimantSchema>;
export type GuardianshipUpdate = z.infer<typeof GuardianshipUpdateSchema>;
export type GuardianshipEntity = z.infer<typeof GuardianshipEntitySchema>;
export type ClaimantType = z.infer<typeof ClaimantTypeSchema>;
export type AlternateClaimantType = z.infer<typeof AlternateClaimantTypeSchema>;
export type GuardianType = z.infer<typeof GuardianTypeSchema>;
export type DocumentType = z.infer<typeof DocumentSchema>;

// Allowed file types for uploads
export const allowedTypes = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'application/pdf',
  'image/tiff',
  'image/bmp'
] as const;

// Helper functions for validation
export function isMinorClaimant(claimantType: ClaimantType): boolean {
  return claimantType === 'Minor';
}

export function requiresGuardianship(claimantType: ClaimantType): boolean {
  return ['Minor', 'Incapacitated Adult', 'Decedent'].includes(claimantType);
}

export function isAlternateClaimant(claimantType: ClaimantType): boolean {
  return claimantType === 'Alternate';
}