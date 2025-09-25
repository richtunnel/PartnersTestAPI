import { z } from 'zod';

// Validation schemas
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
  'Other Guardian Document'
]);

export const DocumentSchema = z.object({
  documentType: z.union([GuardianIdDocumentTypeSchema, GuardianRelationshipDocumentTypeSchema]),
  fileName: z.string().min(1),
  fileSize: z.number().positive(),
  mimeType: z.string(),
  category: z.enum(['guardian_id', 'guardian_relationship'])
});

export const GuardianInformationSchema = z.object({
  signingPriority: z.number().int().positive()
});

export const GuardianshipIntakeSchema = z.object({
  claimantGUID: z.string().uuid(),
  representativeGUID: z.string().uuid(),
  caseProjectId: z.string().min(1),
  otherId1: z.string().optional(),
  otherId2: z.string().optional(),
  guardianInformation: GuardianInformationSchema,
  documentation: z.array(DocumentSchema).min(1)
});

// Types
export type GuardianshipIntake = z.infer<typeof GuardianshipIntakeSchema>;

export type ProcessedDocument = {
  originalName: string;
  storedName: string;
  blobUrl: string;
  documentId: string;
  category: string;
  documentType: string;
  uploadTimestamp: string;
};

export type ProcessedIntake = GuardianshipIntake & {
  intakeId: string;
  processedDocuments: ProcessedDocument[];
  timestamp: string;
  status: 'processed';
  blobStorageLocation: string;
};