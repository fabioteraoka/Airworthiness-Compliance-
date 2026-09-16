/**
 * Airworthiness Compliance Intelligence - Core Types
 * Supporting Continuing Airworthiness Management & AD Analysis
 */

export type SourceType = 
  | 'AD' // Airworthiness Directive (Active in MVP)
  | 'SB' // Service Bulletin (Future)
  | 'AMP' // Aircraft Maintenance Program (Future)
  | 'MANUFACTURER' // Manufacturer Requirement (Future)
  | 'REGULATION' // Authority Regulation (Future)
  | 'EO' // Engineering Order (Future)
  | 'OTHER';

export type IssuingAuthority = 'FAA' | 'EASA' | 'ANAC' | 'TCCA' | 'UK CAA' | 'DGAC' | 'OTHER';

export type AssessmentResult = 'APPLICABLE' | 'NOT_APPLICABLE' | 'REVIEW_REQUIRED';

export type ApplicabilityStatus = 'APPLICABLE' | 'NOT_APPLICABLE' | 'REVIEW_REQUIRED' | 'EXEMPT';

export type DocumentProcessingStatus = 
  | 'UPLOADED'
  | 'EXTRACTING'
  | 'EXTRACTION_FAILED'
  | 'EXTRACTION_REVIEW_REQUIRED'
  | 'EXTRACTED'
  | 'VALIDATED'
  | 'ASSESSED';

export type RequirementStatus = 
  | 'DRAFT'
  | 'EXTRACTED'
  | 'EXTRACTION_REVIEW_REQUIRED'
  | 'EXTRACTION_FAILED'
  | 'UNDER_REVIEW'
  | 'ASSESSED'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUPERSEDED';

export type PipelineStageStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'WARNING';

export interface Stage1FileReceived {
  stageNumber: 1;
  stageName: 'FILE RECEIVED';
  status: PipelineStageStatus;
  originalFileName: string;
  mimeType: string;
  fileSize: number; // in bytes
  uploadTimestamp: string;
  fileBytesReceived: boolean;
  message?: string;
}

export interface Stage2SourceContentExtraction {
  stageNumber: 2;
  stageName: 'SOURCE CONTENT EXTRACTION';
  status: PipelineStageStatus;
  pdfTextExtractionSucceeded: boolean;
  extractedTextCharCount: number;
  extractedPageCount?: number | null;
  first500Chars: string;
  extractionError?: string | null;
  textExtractionError?: string | null;
  message?: string;
}

export interface Stage3AiExtractionRequest {
  stageNumber: 3;
  stageName: 'AI EXTRACTION REQUEST';
  status: PipelineStageStatus;
  aiRequestSent: boolean;
  requestTimestamp: string;
  modelInvocationSuccess: boolean;
  requestSize: number;
  modelName: string;
  apiError?: string | null;
  aiInvocationError?: string | null;
  message?: string;
}

export interface Stage4RawAiResponse {
  stageNumber: 4;
  stageName: 'RAW AI RESPONSE';
  status: PipelineStageStatus;
  aiReturnedResponse: boolean;
  rawResponseLength: number;
  rawResponseCharCount?: number;
  first1000Chars: string;
  containsAdNumber: boolean;
  adNumberSnippet?: string | null;
  containsIssuingAuthority: boolean;
  issuingAuthoritySnippet?: string | null;
  containsApplicability: boolean;
  applicabilitySnippet?: string | null;
  containsComplianceActions: boolean;
  complianceActionsSnippet?: string | null;
  message?: string;
}

export interface Stage5StructuredDataParsing {
  stageNumber: 5;
  stageName: 'STRUCTURED DATA PARSING';
  status: PipelineStageStatus;
  jsonParsingSucceeded: boolean;
  exactJsonParsingError?: string | null;
  parsedFieldNames: string[];
  requiredFieldsMissing: string[];
  schemaValidationErrors: string[];
  message?: string;
}

export interface ValidationRuleCheck {
  ruleName: string;
  passed: boolean;
  field: string;
  expected: string;
  actual?: string | null;
  details?: string;
}

export interface Stage6AdValidation {
  stageNumber: 6;
  stageName: 'AD VALIDATION';
  status: PipelineStageStatus;
  validationRules: ValidationRuleCheck[];
  failedValidationRules: string[];
  adNumberPresent: boolean;
  issuingAuthorityPresent: boolean;
  adTitlePresent: boolean;
  effectiveDatePresent: boolean;
  applicabilityContainsSourceData: boolean;
  complianceRequirementsExist: boolean;
  message?: string;
}

export interface Stage7Persistence {
  stageNumber: 7;
  stageName: 'PERSISTENCE';
  status: PipelineStageStatus;
  adObjectSaved: boolean;
  savedRecordId: string;
  adNumberStored: string;
  authorityStored: string;
  extractedRequirementsStoredCount: number;
  applicabilityRulesStoredCount: number;
  persistedTimestamp: string;
  persistenceTimestamp?: string;
  message?: string;
}

export interface Stage8RuleEngineInput {
  stageNumber: 8;
  stageName: 'RULE ENGINE INPUT';
  status: PipelineStageStatus;
  adNumberReceived: string;
  aircraftModelsExtracted: string[];
  msnRangesExtracted: string;
  componentApplicabilityCriteria: string[];
  complianceRequirementsCount: number;
  fleetEntitiesEvaluatedCount: number;
  applicabilityEvaluationTriggered?: boolean;
  evaluationTimestamp?: string;
  assessmentsProducedCount?: number;
  applicableCount?: number;
  notApplicableCount?: number;
  reviewRequiredCount?: number;
  message?: string;
}

export interface FirstFailingStageInfo {
  stageNumber: number;
  stageName: string;
  reason: string;
}

export interface StageSummaryItem {
  stageNumber: number;
  name: string;
  status: PipelineStageStatus;
  message: string;
}

export interface Stage9FinalResult {
  stageNumber: 9;
  stageName: 'FINAL RESULT';
  pipelineResult: 'EXTRACTED' | 'EXTRACTION_REVIEW_REQUIRED' | 'EXTRACTION_FAILED';
  firstFailingStage: FirstFailingStageInfo | null;
  stoppingReason: string;
  stageSummaries: StageSummaryItem[];
  checklistFormattedText: string;
  failureStage?: number | null;
  diagnosticSummary?: string;
  completedAt?: string;
}

export interface ExtractionPipelineDiagnostics {
  id: string;
  complianceRequirementId: string;
  createdAt: string;
  stage1: Stage1FileReceived;
  stage2: Stage2SourceContentExtraction;
  stage3: Stage3AiExtractionRequest;
  stage4: Stage4RawAiResponse;
  stage5: Stage5StructuredDataParsing;
  stage6: Stage6AdValidation;
  stage7: Stage7Persistence;
  stage8: Stage8RuleEngineInput;
  stage9: Stage9FinalResult;
}

export interface ExtractionDiagnostics {
  sourceFileReceived: boolean;
  textExtracted: boolean;
  extractedCharCount: number;
  geminiInvoked: boolean;
  geminiReturnedResponse: boolean;
  geminiReturnedValidJson: boolean;
  jsonPassedSchemaValidation: boolean;
  missingRequiredFields: string[];
  exactErrorMessage: string;
  rawTechnicalExtractionResponse?: string;
  pipelineDiagnostics?: ExtractionPipelineDiagnostics;
}

export interface ExtractionFailureRecord {
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  uploadTimestamp: string;
  extractionTimestamp: string;
  extractionErrorMessage: string;
  geminiResponseStatus?: string;
  rawModelResponse?: string;
  jsonParsingError?: string;
  validationErrors: string[];
  extractedRawTextLength: number;
  documentHash?: string;
  missingRequiredFields: string[];
  diagnostics: ExtractionDiagnostics;
  pipelineDiagnostics?: ExtractionPipelineDiagnostics;
}

export type ProvenanceSourceType = 
  | 'AD_DOCUMENT'
  | 'REFERENCED_DOCUMENT'
  | 'FLEET_DATABASE'
  | 'KNOWLEDGE_FACT'
  | 'RULE_ENGINE_INFERENCE'
  | 'USER_INPUT'
  | 'UNKNOWN';

export interface ProvenanceField<T = any> {
  value: T;
  status: 'EXTRACTED' | 'INFERRED' | 'USER_PROVIDED' | 'DATABASE_RECORD' | 'NOT_EXTRACTED' | 'EXTRACTION_FAILED' | 'UNKNOWN';
  sourceType: ProvenanceSourceType;
  sourceReference?: string;
  evidenceText?: string;
  paragraphReference?: string;
  pageReference?: number;
  confidence: number; // 0 - 100
}

export interface ReferencedDocument {
  id: string;
  complianceRequirementId: string;
  documentReference: string; // e.g. "Boeing Alert Service Bulletin 737-27A1305"
  revision?: string;
  relationshipToAD: 'ACCOMPLISHMENT_INSTRUCTIONS' | 'DEFINES_EFFECTIVITY' | 'TERMINATING_ACTION' | 'PARTS_LIST' | 'OTHER';
  requiredForEvaluation: boolean;
  availabilityStatus: 'AVAILABLE' | 'NOT_AVAILABLE' | 'PENDING_UPLOAD';
  citedParagraph?: string;
  purpose?: string;
  notes?: string;
  provenance?: ProvenanceField;
}

export interface ComplianceAction {
  id: string;
  complianceRequirementId: string;
  sequence: number;
  paragraphReference?: string; // e.g. "Paragraph (g)(1)"
  actionName: string; // e.g. "Initial Detailed Visual & Ultrasonic Inspection"
  actionType: 'INSPECTION' | 'MODIFICATION' | 'REPLACEMENT' | 'DEACTIVATION' | 'OPERATIONAL_PROCEDURE' | 'TERMINATING_ACTION' | 'LIMITATION' | 'OTHER';
  condition?: string;
  fullInstruction: string; // Full complete extracted instruction text
  technicalReference?: string; // Referenced SB / AMM / AOT
  complianceTime?: string;
  initialThreshold?: string;
  repetitiveInterval?: string;
  repeatConditions?: string;
  requiredInspection?: string;
  modification?: string;
  replacement?: string;
  terminatingAction?: string;
  requiredParts?: string[];
  requiredTools?: string[];
  requiredDocumentation?: string;
  amoc?: string;
  operationalLimitations?: string;
  exceptions?: string;
  notes?: string;
  provenance?: ProvenanceField;
}

export type ComponentType = 
  | 'AVIONICS'
  | 'HYDRAULIC'
  | 'STRUCTURE'
  | 'LANDING_GEAR'
  | 'FLIGHT_CONTROLS'
  | 'FUEL_SYSTEM'
  | 'ENGINE_ACCESSORY'
  | 'APPLIANCE'
  | 'ELECTRICAL'
  | 'CABIN'
  | 'OTHER';

export interface Operator {
  id: string;
  name: string;
  icaoCode: string;
  country: string;
  status: 'ACTIVE' | 'INACTIVE';
  camoCertificate: string;
}

export type AircraftOperationalStatus = 
  | 'OPERATIONAL' 
  | 'MAINTENANCE' 
  | 'AOG' 
  | 'STORED' 
  | 'DECOMMISSIONED' 
  | 'RETIRED' 
  | 'INACTIVE';

export interface Aircraft {
  id: string;
  operatorId: string;
  registration: string; // e.g. "PR-GUO"
  msn: string; // Manufacturer Serial Number e.g. "38124"
  manufacturer: string; // "Boeing"
  model: string; // "737-800"
  series?: string; // "Next Generation"
  aircraftType: string; // "Commercial Transport"
  status: AircraftOperationalStatus;
  statusReason?: string;
  decommissionDate?: string;
  notes?: string;
  totalFlightHours: number;
  totalCycles: number;
  totalLandings: number;
  variableNumber?: string;
  lineNo?: string;
  manufactureDate?: string;
  updatedAt?: string;
}

export interface Engine {
  id: string;
  aircraftId?: string; // null if spare in shop
  manufacturer: string; // "CFM International"
  model: string; // "CFM56-7B26"
  engineFamily?: string; // e.g. "CFM56-7B", "LEAP-1B", "CFM56-5B", "V2500"
  serialNumber: string; // "894120"
  position: string; // "Pos 1 - Left" | "Pos 2 - Right" | "Spare"
  totalHours: number;
  totalCycles: number;
  status: 'INSTALLED' | 'IN_SHOP' | 'STORED' | 'UNSERVICEABLE';
}

export interface Component {
  id: string;
  manufacturer: string;
  partNumber: string; // e.g. "12345-01"
  serialNumber: string; // e.g. "456789"
  componentType: ComponentType;
  description: string;
  status: 'SERVICEABLE' | 'UNSERVICEABLE' | 'QUARANTINE';
  totalHours?: number;
  totalCycles?: number;
}

export interface ComponentInstallation {
  id: string;
  componentId: string;
  component?: Component;
  aircraftId?: string;
  aircraftRegistration?: string;
  engineId?: string;
  engineSerialNumber?: string;
  position: string; // e.g. "Elevator Tab Control Rod", "Left Main Gear Actuator"
  installationDate: string;
  removalDate?: string;
  installationHours: number;
  installationCycles: number;
  currentStatus: 'INSTALLED' | 'REMOVED' | 'IN_STORE';
  installedBy?: string;
  workOrderRef?: string;
}

export interface InstalledSoftwareRecord {
  id: string;
  aircraftId: string;

  lruIdentifier: string;
  lruPosition: string;
  targetSystem?: string;

  softwarePartNumber: string;
  softwareVersion?: string;
  softwareDescription?: string;

  status: 'INSTALLED' | 'REMOVED' | 'SUPERSEDED';

  installationDate: string;
  installationFlightHours?: number;
  installationCycles?: number;
  workOrderReference?: string;

  evidenceId?: string;
  componentInstallationId?: string;

  source:
    | 'MANUAL_ENTRY'
    | 'ACARS_DOWNLINK'
    | 'TECHLOG_IMPORT'
    | 'MRO_INTEGRATION';

  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceActionAccomplishment {
  id: string;

  aircraftId: string;
  complianceRequirementId: string;
  mandatedActionId: string;

  eventStatus: 'EXECUTED_VALID' | 'VOIDED';

  accomplishmentDate: string;
  accomplishmentFlightHours: number;
  accomplishmentCycles: number;

  workOrderReference: string;
  taskCardReference?: string;
  maintenanceReleaseReference?: string;
  maintenanceProvider?: string;

  evidenceIds: string[];

  installedSoftwareId?: string;
  componentInstallationId?: string;

  supersededByAccomplishmentId?: string;

  technicianName?: string;
  inspectorSignoff?: string;
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export type ApplicabilityCriterionStatus = 
  | 'REQUIRED' 
  | 'NOT_REQUIRED' 
  | 'NOT_EXTRACTED' 
  | 'UNKNOWN_FLEET_DATA';

export interface CriterionEvidenceReference {
  text?: string;
  paragraph?: string;
  page?: number;
  sourceDocRef?: string;
  citedDocument?: string;
}

export interface DynamicApplicabilityCriteria {
  aircraftModel: {
    status: ApplicabilityCriterionStatus;
    values: string[];
    sourceEvidence?: CriterionEvidenceReference;
    confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
    reasoning?: string;
  };
  aircraftMSN: {
    status: ApplicabilityCriterionStatus;
    ranges?: Array<{ from?: string; to?: string; list?: string[]; excluded?: string[]; description?: string }>;
    list?: string[];
    description?: string;
    sourceEvidence?: CriterionEvidenceReference;
    confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
    reasoning?: string;
  };
  aircraftConfiguration: {
    status: ApplicabilityCriterionStatus;
    conditions: string[];
    sourceEvidence?: CriterionEvidenceReference;
    confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
    reasoning?: string;
  };
  engineModel: {
    status: ApplicabilityCriterionStatus;
    values: string[];
    sourceEvidence?: CriterionEvidenceReference;
    confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
    reasoning?: string;
  };
  enginePartNumber: {
    status: ApplicabilityCriterionStatus;
    values: string[];
    sourceEvidence?: CriterionEvidenceReference;
    confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
    reasoning?: string;
  };
  engineSerialNumber: {
    status: ApplicabilityCriterionStatus;
    ranges?: Array<{ from?: string; to?: string; list?: string[]; description?: string }>;
    list?: string[];
    description?: string;
    sourceEvidence?: CriterionEvidenceReference;
    confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
    reasoning?: string;
  };
  componentIdentity: {
    status: ApplicabilityCriterionStatus;
    values: string[];
    sourceEvidence?: CriterionEvidenceReference;
    confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
    reasoning?: string;
  };
  componentPartNumber: {
    status: ApplicabilityCriterionStatus;
    values: string[];
    sourceEvidence?: CriterionEvidenceReference;
    confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
    reasoning?: string;
  };
  componentSerialNumber: {
    status: ApplicabilityCriterionStatus;
    ranges?: Array<{ from?: string; to?: string; list?: string[]; description?: string }>;
    list?: string[];
    description?: string;
    sourceEvidence?: CriterionEvidenceReference;
    confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
    reasoning?: string;
  };
  modificationStatus: {
    status: ApplicabilityCriterionStatus;
    conditions: string[];
    sourceEvidence?: CriterionEvidenceReference;
    confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
    reasoning?: string;
  };
  softwareConfiguration: {
    status: ApplicabilityCriterionStatus;
    conditions: string[];
    values?: string[];
    sourceEvidence?: CriterionEvidenceReference;
    confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
    reasoning?: string;
  };
  otherConditions?: Array<{
    name: string;
    status: ApplicabilityCriterionStatus;
    description: string;
    sourceEvidence?: CriterionEvidenceReference;
    confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
}

export interface ApplicabilityRule {
  id: string;
  complianceRequirementId: string;
  aircraftManufacturers: string[];
  aircraftModels: string[];
  aircraftSerialRanges?: {
    from?: string;
    to?: string;
    list?: string[];
    excluded?: string[];
    description?: string;
  };
  engineManufacturers?: string[];
  engineModels?: string[];
  engineSerialRanges?: {
    from?: string;
    to?: string;
    list?: string[];
    description?: string;
  };
  componentPartNumbers: string[];
  componentSerialRanges?: {
    from?: string;
    to?: string;
    list?: string[];
    allSerialsAffected?: boolean;
    description?: string;
  };
  affectedConfiguration?: string;
  otherEffectivityCriteria?: string;
  rawText: string;

  // Evolução CAMO: Critérios Dinâmicos e Desacoplados (Phase 1 & Phase 2)
  applicabilityCriteria?: DynamicApplicabilityCriteria;
  externalEffectivityDocuments?: ExternalEffectivityReference[];
  isExternalDocumentBasedEffectivity?: boolean;
  isMsnExplicitlyAll?: boolean;
  softwareCriteria?: SoftwareRequirement[];
  hardwareCriteria?: {
    partNumber?: string;
    serialNumber?: string;
    description?: string;
    location?: string;
  }[];
  provenance?: ProvenanceField;
}

export type MandatedActionType = 
  | 'AVIONICS_SOFTWARE_LOAD'
  | 'HARDWARE_MODIFICATION'
  | 'HARDWARE_REPLACEMENT'
  | 'REPETITIVE_INSPECTION'
  | 'ONE_TIME_INSPECTION'
  | 'FUNCTIONAL_TEST'
  | 'AFM_REVISION'
  | 'MEL_OPERATIONAL_PROVISION'
  | 'WIRING_INTEGRITY_CHECK'
  | 'OPERATIONAL_PROCEDURE'
  | 'DOCUMENT_REVIEW'
  | 'OTHER';

export interface SoftwareRequirement {
  id?: string;
  softwarePartNumber: string;
  softwareVersion?: string;
  targetSystem: string; // e.g. "Flight Control Computer (FCC)", "FMS", "EEC"
  targetLru?: string; // e.g. "FCC-A", "FCC-B", "LRU P/N 2274-COL-AC2"
  installationPosition?: string; // e.g. "FCC Position 1 / Position 2", "E1 Rack"
  currentlyInstalledSoftware?: string[]; // Current software versions
  prohibitedSoftware?: string[]; // Software versions prohibited/affected by the AD
  mandatedSoftware?: string; // Software version/PN mandated to be loaded
  verificationMethod?: 'ON_BOARD_DATA_LOAD' | 'BENCH_LOAD' | 'CROSS_FCC_BITE_TEST' | 'PART_NUMBER_VERIFICATION' | 'OTHER';
  notes?: string;
  provenance?: ProvenanceField;
}

export interface ExternalEffectivityReference {
  id?: string;
  documentReference: string; // e.g. "Boeing Alert Requirements Bulletin 737-22A1011 RB"
  revision?: string;
  purpose: string; // e.g. "Defines affected aircraft serial numbers and configuration groups"
  requiredForApplicability: boolean;
  availabilityStatus: 'AVAILABLE' | 'NOT_AVAILABLE' | 'PENDING_UPLOAD';
  effectivityVerified: boolean;
  verificationStatus: 'NOT_VERIFIED' | 'VERIFIED_IN_SCOPE' | 'VERIFIED_OUT_OF_SCOPE' | 'REQUIRES_MANUAL_AUDIT';
  citedParagraph?: string;
  notes?: string;
  provenance?: ProvenanceField;
}

export interface MandatedAction {
  id: string;
  paragraphReference?: string; // e.g. "Paragraph (g)", "Paragraph (h)"
  actionType: MandatedActionType;
  description: string;
  sequence?: number;
  targetEntity?: {
    type: 'AIRCRAFT' | 'ENGINE' | 'AVIONICS_LRU' | 'COMPONENT' | 'DOCUMENTATION' | 'FLEET';
    identifier?: string;
    description?: string;
  };
  accomplishmentReference?: {
    documentReference?: string;
    revision?: string;
    title?: string;
    sectionOrParagraph?: string;
  };
  complianceThreshold?: {
    thresholdType?: 'BEFORE_FURTHER_FLIGHT' | 'FLIGHT_HOURS' | 'FLIGHT_CYCLES' | 'CALENDAR_DAYS' | 'SPECIFIC_DATE' | 'OTHER';
    thresholdValue?: number;
    thresholdDate?: string;
    rawDescription?: string;
  };
  repetitiveInterval?: {
    intervalType?: 'FLIGHT_HOURS' | 'FLIGHT_CYCLES' | 'CALENDAR_DAYS' | 'OTHER';
    intervalValue?: number;
    rawDescription?: string;
  };
  isTerminatingAction?: boolean;
  terminatesMandatedActionIds?: string[];
  softwareRequirement?: SoftwareRequirement;
  notes?: string;
  provenance?: ProvenanceField;
}

export type ComplianceStatus = 
  | 'NOT_REQUIRED'
  | 'OPEN'
  | 'COMPLIED'
  | 'PARTIALLY_COMPLIED'
  | 'REVIEW_REQUIRED'
  | 'OVERDUE'
  | 'UNKNOWN';

export interface ActionComplianceAssessment {
  id: string;
  complianceRequirementId: string;
  aircraftId?: string;
  entityId: string;
  mandatedActionId: string;
  applicabilityStatus: 'APPLICABLE' | 'NOT_APPLICABLE' | 'REVIEW_REQUIRED' | 'EXEMPT';
  complianceStatus: ComplianceStatus;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string[];
  evidence?: Evidence[];
  missingInformation?: string[];
  assessedBy: string;
  assessmentDate: string;
}

export interface RawExtractionPayload {
  id?: string;
  rawJsonText?: string;
  rawParsedJson?: Record<string, any>;
  extractionTimestamp: string;
  modelProvider: string; // e.g. "Google Gemini (gemini-3.7-flash)"
  sourceFileName: string;
  sourceFileHash?: string;
  extractionStatus: 'SUCCESS' | 'EXTRACTION_REVIEW_REQUIRED' | 'EXTRACTION_FAILED';
  rawPromptTokens?: number;
  rawCompletionTokens?: number;
  extractionErrorMessage?: string;
}

export interface ComplianceRequirementDetails {
  initialThreshold?: string | null;
  complianceTime?: string | null;
  repetitiveInterval?: string | null;
  requiredInspection?: string | null;
  modification?: string | null;
  replacement?: string | null;
  optionalMethod?: string | null;
  terminatingAction?: string | null;
  requiredParts?: string[];
  requiredDocumentation?: string | null;
}

export interface ComplianceRequirement {
  id: string;
  sourceType: SourceType; // 'AD'
  sourceNumber: string; // e.g. "FAA AD 2024-12-05" or empty string when extraction fails
  revision: string; // e.g. "Original"
  title: string;
  issuingAuthority: IssuingAuthority;
  issueDate: string;
  effectiveDate: string | null;
  emergencyAd: boolean;
  docketNumber?: string;
  technicalSummary?: string;
  supersedes?: string | null;
  supersededBy?: string | null;
  sourceDocument?: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    fileData?: string; // base64 or storage url
    rawExtractedText?: string;
    documentHash?: string;
  };
  applicabilityRule?: ApplicabilityRule;
  requirementDetails?: ComplianceRequirementDetails;
  actions?: ComplianceAction[];
  referencedDocuments?: ReferencedDocument[];
  provenanceMap?: Record<string, ProvenanceField>;
  documentProcessingStatus?: DocumentProcessingStatus;
  extractionStatus?: 'SUCCESS' | 'EXTRACTION_REVIEW_REQUIRED' | 'EXTRACTION_FAILED';
  extractionError?: string;
  missingFields?: string[];
  extractionFailureRecord?: ExtractionFailureRecord;
  diagnostics?: ExtractionDiagnostics;
  pipelineDiagnostics?: ExtractionPipelineDiagnostics;
  status: RequirementStatus;

  // Evolução CAMO: Propriedades opcionais desacopladas de nova geração (compatibilidade 100% retroativa)
  applicabilityCriteria?: DynamicApplicabilityCriteria;
  applicabilityRules?: ApplicabilityRule[];
  mandatedActions?: MandatedAction[];
  softwareRequirements?: SoftwareRequirement[];
  externalEffectivityReferences?: ExternalEffectivityReference[];
  rawExtraction?: RawExtractionPayload;
  adNumber?: string;
  officialPdfUrl?: string;
  sourceUrl?: string;
  documentHash?: string;
  isSuperseded?: boolean;
  supersededByAdNumber?: string;
  targetAircraftModel?: string;

  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  approvedBy?: string;
  approvalDate?: string;
}

export interface AssessmentCriteriaMatch {
  matched: boolean;
  status: 'CONFIRMED' | 'MISSING_DATA' | 'NOT_PRESENT' | 'EXCLUDED';
  detail: string;
  confidence: number;
  evidenceRef?: string;
}

export interface ComplianceAssessment {
  id: string;
  complianceRequirementId: string;
  entityType: 'AIRCRAFT' | 'ENGINE' | 'COMPONENT' | 'FLEET';
  entityId: string;
  entityRegistration?: string;
  entityMsn?: string;
  entityModel?: string;
  entityLabel: string;
  result: AssessmentResult;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string[];

  // Evolução CAMO: Separação explícita de Aplicabilidade e Cumprimento (compatibilidade 100% retroativa)
  applicabilityStatus?: 'APPLICABLE' | 'NOT_APPLICABLE' | 'REVIEW_REQUIRED' | 'EXEMPT';
  complianceStatus?: ComplianceStatus;
  actionAssessments?: ActionComplianceAssessment[];

  matchedCriteria: {
    aircraftModelMatch: AssessmentCriteriaMatch;
    serialRangeMatch?: AssessmentCriteriaMatch;
    engineMatch?: AssessmentCriteriaMatch;
    componentMatch?: AssessmentCriteriaMatch;
    configurationMatch?: AssessmentCriteriaMatch;
  };
  missingInformationNotes?: string[];
  assessedBy: string; // "Rule Engine v1.0 + CAMO Logic"
  assessmentDate: string;
  approvedBy?: string;
  approvalDate?: string;
  status: 'PRELIMINARY' | 'PENDING_USER_INPUT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  userNotes?: string;
}

export type EvidenceType = 
  // Phase 6.3 Controlled Catalog:
  | 'MAINTENANCE_RECORD'
  | 'WORK_ORDER'
  | 'TASK_CARD'
  | 'INSPECTION_RECORD'
  | 'SERVICE_BULLETIN_RECORD'
  | 'COMPONENT_CHANGE_RECORD'
  | 'COMPONENT_INSTALLATION_RECORD'
  | 'COMPONENT_REMOVAL_RECORD'
  | 'AIRCRAFT_LOGBOOK'
  | 'ENGINE_LOGBOOK'
  | 'LIFE_LIMIT_RECORD'
  | 'AUTHORIZED_RELEASE'
  | 'FORM'
  | 'CERTIFICATE'
  | 'PHOTO'
  | 'TEST_RESULT'
  | 'MEASUREMENT'
  | 'OPERATOR_RECORD'
  | 'OTHER'
  // Backward compatibility:
  | 'AD_DOCUMENT'
  | 'TECH_LOG'
  | 'INSTALLATION_RECORD'
  | 'COMPONENT_TAG_8130'
  | 'EASA_FORM_ONE'
  | 'AIRCRAFT_STATUS_REPORT'
  | 'USER_DECLARATION'
  | 'SB_ACCOMPLISHMENT'
  | 'MANUAL_INSPECTION'
  | 'IPC_EXTRACT';

export type EvidenceVerificationStatus = 
  | 'SUBMITTED'
  | 'RECEIVED'
  | 'PENDING_VALIDATION'
  | 'VALID'
  | 'INVALID'
  | 'INSUFFICIENT'
  | 'REVIEW_REQUIRED'
  | 'SUPERSEDED'
  | 'REVOKED';

export type EvidenceStatus = EvidenceVerificationStatus;

export type EvidenceReviewReasonCode = 
  | 'WRONG_ENTITY'
  | 'ENTITY_MISMATCH'
  | 'INCORRECT_PART_NUMBER'
  | 'INCORRECT_SERIAL_NUMBER'
  | 'MISSING_IDENTIFIER'
  | 'MISSING_EVENT_DATE'
  | 'MISSING_FH'
  | 'MISSING_FC'
  | 'MISSING_ACTION_RESULT'
  | 'AMBIGUOUS_ACTION'
  | 'INSUFFICIENT_DOCUMENT'
  | 'CONFLICTING_RECORDS'
  | 'CONFLICTING_EVIDENCE'
  | 'DOCUMENT_INTEGRITY_FAILURE'
  | 'TAMPERING_SUSPECTED'
  | 'REQUIREMENT_MISMATCH'
  | 'TEMPORAL_INCONSISTENCY'
  | 'FUTURE_DATE'
  | 'COUNTER_REGRESSION'
  | 'FH_COUNTER_ROLLBACK'
  | 'FC_COUNTER_ROLLBACK'
  | 'EXECUTION_PRIOR_TO_INSTALLATION'
  | 'EXECUTION_AFTER_REMOVAL'
  | 'DATA_INTEGRITY_REVIEW'
  | 'UNKNOWN_EVIDENCE_TYPE'
  | 'INSUFFICIENT_EVIDENCE'
  | 'OVERDUE_COMPLIANCE'
  | 'EXPIRED_CERTIFICATE'
  | 'OTHER';

export interface EvidenceAuditTrailEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorRole?: string;
  previousStatus?: EvidenceVerificationStatus;
  newStatus: EvidenceVerificationStatus;
  action: string;
  reason: string;
  inputHash?: string;
  details?: Record<string, any>;
}

export interface Evidence {
  id: string;
  aircraftId?: string;
  obligationId?: string;
  complianceAssessmentId?: string;
  complianceRequirementId?: string;
  requirementId?: string;
  factId?: string;
  type?: EvidenceType;
  evidenceType?: EvidenceType;
  description: string;
  documentReference?: string;
  sourceReference?: string;
  source: string;
  sourceAgency?: string;
  documentId?: string;
  documentHash?: string;
  entityId?: string;
  targetEntity?: {
    entityType?: string;
    entityId?: string;
    registration?: string;
    serialNumber?: string;
    partNumber?: string;
  };
  eventDate?: string;
  date?: string; // compatibility
  accomplishmentDate?: string;
  accomplishmentFlightHours?: number;
  accomplishmentFlightCycles?: number;
  eventFlightHours?: number;
  eventFlightCycles?: number;
  submittedAt?: string;
  submittedBy?: string;
  createdAt?: string;
  createdBy?: string;
  verificationStatus?: EvidenceVerificationStatus;
  verificationReasons?: string[];
  structuredReviewReasons?: EvidenceReviewReasonCode[];
  verificationTimestamp?: string;
  verifiedBy?: string;
  verified?: boolean; // compatibility: true if verificationStatus === 'VALID'
  isVerified?: boolean;
  metadata?: Record<string, any>;
  auditTrail?: EvidenceAuditTrailEntry[];
  version?: number;
  verificationHash?: string;
  hashTimestamp?: string;
  uploadedFileName?: string;
  uploadedFileData?: string;
}

export interface UserQuestion {
  id: string;
  complianceAssessmentId: string;
  complianceRequirementId: string;
  targetEntity: {
    type: 'AIRCRAFT' | 'ENGINE' | 'COMPONENT' | 'FLEET';
    id: string;
    label: string;
  };
  partNumberInQuestion?: string;
  question: string;
  reason: string;
  questionType: 'YES_NO_UNKNOWN' | 'SELECT_AIRCRAFT' | 'COMPONENT_SERIAL' | 'CONFIG_MOD_STATUS' | 'FREE_TEXT';
  options?: string[];
  answer?: string;
  answerData?: {
    installed?: boolean;
    partNumber?: string;
    serialNumber?: string;
    position?: string;
    aircraftId?: string;
    engineId?: string;
    modStatus?: string;
    evidenceNotes?: string;
    documentRef?: string;
  };
  answeredBy?: string;
  answerDate?: string;
  status: 'PENDING' | 'ANSWERED' | 'DISMISSED';
}

export interface KnowledgeFact {
  id: string;
  title: string;
  factType: 
    | 'COMPONENT_INSTALLED'
    | 'COMPONENT_NOT_INSTALLED'
    | 'SERIAL_BELONGS_TO_PART'
    | 'AIRCRAFT_MOD_STATUS'
    | 'ENGINE_CONFIG'
    | 'FLEET_EXCLUSION';
  subjectType: 'AIRCRAFT' | 'ENGINE' | 'COMPONENT' | 'OPERATOR';
  subjectId: string;
  subjectLabel: string;
  predicate: string;
  objectValue: string;
  details?: Record<string, any>;
  source: string; // e.g. "Answered by CAMO Engineer on AD 2024-12-05 review"
  evidenceId?: string;
  evidenceSummary: string;
  confidence: number; // 0-100
  createdDate: string;
  createdBy: string;
  lastVerified: string;
  verifiedBy: string;
  isRejected?: boolean;
  usageCount: number;
}

export interface AuditTrailEntry {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: 
    | 'CREATE'
    | 'ACCESS'
    | 'EXTRACT'
    | 'EXTRACTION_RETRY'
    | 'RULE_EVALUATION'
    | 'QUESTION_GENERATED'
    | 'QUESTION_ANSWERED'
    | 'RECALCULATION'
    | 'APPROVAL'
    | 'REJECTION'
    | 'FACT_RECORDED'
    | 'MANUAL_OVERRIDE'
    | 'EVIDENCE_ATTACHED'
    | 'SOFTWARE_RECORDED'
    | 'ACCOMPLISHMENT_RECORDED'
    | 'ACCOMPLISHMENT_VOIDED'
    | 'DISCOVERY_SCAN'
    | 'DISCOVERY_RECORD'
    | 'FLEET_SCREENING'
    | 'PIPELINE_EXECUTION'
    | 'BATCH_PIPELINE'
    | 'PIPELINE_RETRY'
    | 'OBLIGATION_CREATED'
    | 'OBLIGATION_TRANSITION'
    | 'OBLIGATION_EVIDENCE_ATTACHED'
    | 'OBLIGATION_REVIEWED'
    | 'OBLIGATION_SUPERSEDED'
    | 'OBLIGATION_EVALUATION'
    | 'EVIDENCE_REVOKED'
    | 'EVIDENCE_VALIDATED'
    | 'AIRWORTHINESS_EVALUATION'
    | 'COMPLIANCE_STATUS_CONSOLIDATION'
    | 'REGULATORY_KNOWLEDGE_COMPILED'
    | 'CONFIGURATION_DATA_RESOLVED'
    | 'REGULATORY_SEARCH_EXECUTED'
    | 'REGULATORY_RESULT_IMPORTED'
    | 'REGULATORY_REGISTER_ANALYSIS'
    | 'UPDATE'
    | 'STATUS_CHANGE'
    | 'DELETE'
    | 'SYSTEM_DELETE'
    | 'SYSTEM_RESET';
  entityType: string;
  entityId: string;
  details: string | Record<string, any>;
  previousState?: any;
  newState?: any;
}

export interface FAPTDocument {
  id: string;
  complianceRequirementId: string;
  documentNumber: string; // e.g. "FAPT-2024-AD-12-05"
  revision: string;
  dateCreated: string;
  
  // Section 1: AD Identification
  adNumber: string;
  adRevision: string;
  authority: IssuingAuthority;
  issueDate: string;
  effectiveDate: string;
  title: string;
  emergency: boolean;

  // Section 2: Fleet Applicability Summary
  affectedFleetCount: number;
  notApplicableCount: number;
  reviewRequiredCount: number;
  applicabilityMatrix: Array<{
    aircraftRegistration: string;
    msn: string;
    model: string;
    installedEngine?: string;
    affectedComponentsFound: string[];
    result: AssessmentResult;
    applicabilityStatus?: ApplicabilityStatus;
    complianceStatus?: ComplianceStatus;
    reasoningSummary: string;
  }>;

  // Section 3: Compliance Action Plan
  initialThreshold: string;
  complianceTime: string;
  repetitiveInterval: string;
  requiredInspection: string;
  modification: string;
  replacement: string;
  terminatingAction: string;
  requiredParts: string[];
  requiredDocumentation: string;

  // Section 4: Evidence & Knowledge Citations
  evidenceReferences: string[];
  knowledgeFactsApplied: string[];

  // Section 5: CAMO Sign-off
  preparedBy: string;
  preparedDate: string;
  reviewedBy?: string;
  reviewedDate?: string;
  approvedBy?: string;
  approvalDate?: string;
  status: 'DRAFT' | 'REVIEWED' | 'APPROVED' | 'REJECTED';
  signatureHash?: string;
  comments?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'CHIEF_CAMO_ENGINEER' | 'AIRWORTHINESS_INSPECTOR' | 'FLEET_MANAGER' | 'AUDITOR';
  licenseNumber: string;
  signatureStamp: string;
}

// ============================================================================
// PHASE 3 — REGULATORY DATA CONNECTOR TYPES
// ============================================================================

export type RegulatorySourceType = 
  | 'FEDERAL_REGISTER'
  | 'FAA_DRS'
  | 'EASA_PORTAL'
  | 'ANAC_PORTAL'
  | 'INTERNAL_PDF'
  | 'OFFICIAL_REPO'
  | 'ANAC_SISAC';

export type RegulatorySourceCapability = 
  | 'SEARCH'
  | 'DOCUMENT_LOOKUP'
  | 'METADATA'
  | 'DOCUMENT_REFERENCE';

export interface RegulatorySource {
  sourceId: string;
  sourceName: string;
  authority: IssuingAuthority;
  sourceType: RegulatorySourceType;
  baseUrl: string;
  isOfficial: boolean;
  isActive: boolean;
  apiConfirmed: boolean;
  statusMessage?: string;
  lastSuccessfulSync?: string;
  lastError?: string;
  capabilities: RegulatorySourceCapability[];
  notes?: string;
}

export type ProvenanceOriginType = 
  | 'SOURCE_METADATA'        // Official structured metadata returned directly by authority API
  | 'DERIVED_METADATA'       // Derived by system from text parsing (regex/heuristics) on title/abstract
  | 'EXTRACTED_BY_AI'        // Extracted via Gemini Document Intelligence from PDF/raw text
  | 'SYSTEM_DERIVATION';     // Calculated deterministically by CAMO internal engine

export interface RegulatoryFact<T> {
  value: T;
  source: RegulatorySourceType;
  sourceReference: string;
  originType: ProvenanceOriginType;
  derivationRule?: string;
  confidence: number;
  retrievedAt: string;
}

export interface SourceProvenance<T> {
  value: T;
  source: RegulatorySourceType;
  sourceReference: string;
  originType?: ProvenanceOriginType;
  derivationRule?: string;
  retrievedAt: string;
  confidence?: number;
}

export interface RegulatoryFieldProvenanceMap {
  documentNumber: RegulatoryFact<string>;
  adNumber?: RegulatoryFact<string>;
  publicationDate?: RegulatoryFact<string>;
  effectiveDate?: RegulatoryFact<string>;
  docketNumber?: RegulatoryFact<string>;
  citation?: RegulatoryFact<string>;
  pdfUrl?: RegulatoryFact<string>;
  htmlUrl?: RegulatoryFact<string>;
  make?: RegulatoryFact<string>;
  models?: RegulatoryFact<string[]>;
  productType?: RegulatoryFact<string>;
}

export type DocumentRetrievalStatus = 
  | 'PENDING'
  | 'DOWNLOADING'
  | 'DOWNLOADED'
  | 'VALIDATED'
  | 'REJECTED'
  | 'FAILED'
  | 'DUPLICATE';

export type DocumentValidationStatus = 
  | 'VALID'
  | 'INVALID_FILE_TYPE'
  | 'INVALID_SIGNATURE'
  | 'EMPTY_DOCUMENT'
  | 'SOURCE_NOT_OFFICIAL'
  | 'HASH_FAILED'
  | 'UNAUTHORIZED_DOMAIN'
  | 'DOWNLOAD_FAILED';

export interface OfficialDocumentProvenance {
  authority: IssuingAuthority;
  source: RegulatorySourceType;
  sourceReference: string;
  originalUrl: string;
  finalUrl: string;
  retrievedAt: string;
  sha256: string;
  validationStatus: DocumentValidationStatus;
  originType: ProvenanceOriginType;
}

export interface OfficialDocumentRecord {
  id: string;
  regulatoryDocumentId?: string;
  adNumber?: string;
  documentNumber?: string;
  source: RegulatorySourceType;
  authority?: IssuingAuthority;
  sourceReference: string;
  originalUrl: string;
  finalUrl: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  sha256: string;
  retrievedAt: string;
  retrievalStatus: DocumentRetrievalStatus;
  validationStatus: DocumentValidationStatus;
  httpStatus?: number;
  contentDisposition?: string;
  isOfficialSource: boolean;
  storagePath?: string;
  fileData?: string; // base64 representation of PDF bytes
  rawExtractedText?: string;
  documentProvenance?: OfficialDocumentProvenance;
  pipelineIntegrationStatus?: 'NOT_SUBMITTED' | 'PROCESSING' | 'ANALYZED' | 'FAILED';
  linkedRequirementId?: string;
  previousDocumentId?: string;
  validationErrors?: string[];
  createdAt: string;
  // Legacy backward-compatibility fields
  url?: string;
  format?: 'PDF' | 'HTML' | 'XML' | 'TEXT';
  contentHash?: string;
  status?: 'AVAILABLE' | 'DOCUMENT_NOT_AVAILABLE';
}

export interface RegulatorySourceRecord {
  source: RegulatorySourceType;
  authority: IssuingAuthority;
  documentNumber: string;
  adNumber?: string;
  title: string;
  publicationDate?: string;
  effectiveDate?: string;
  docketNumber?: string;
  cfrReferences?: Array<{ title?: number; part?: string; chapter?: string | null }>;
  htmlUrl?: string;
  pdfUrl?: string;
  bodyHtmlUrl?: string;
  rawTextUrl?: string;
  rawSourceReference?: string;
  abstract?: string;
  action?: string;
  citation?: string;
  topics?: string[];
  make?: string;
  models?: string[];
  productType?: string;
  productSubtype?: string;
  affectedADs?: string[];
  supersededADs?: string[];
  supersededBy?: string;
  provenanceMap?: RegulatoryFieldProvenanceMap;
  isPartialModelExtraction?: boolean;
  modelDerivationNote?: string;
  retrievedAt: string;
}

export interface RegulatoryDocumentMetadata {
  adNumber: SourceProvenance<string>;
  documentNumber: SourceProvenance<string>;
  authority: SourceProvenance<IssuingAuthority>;
  documentType: SourceProvenance<string>;
  title: SourceProvenance<string>;
  subject?: SourceProvenance<string>;
  status: SourceProvenance<string>;
  publicationDate?: SourceProvenance<string>;
  effectiveDate?: SourceProvenance<string>;
  make?: SourceProvenance<string>;
  models?: SourceProvenance<string[]>;
  productType?: SourceProvenance<string>;
  productSubtype?: SourceProvenance<string>;
  docketNumber?: SourceProvenance<string>;
  cfrReferences?: SourceProvenance<string[]>;
  affectedADs?: SourceProvenance<string[]>;
  supersededADs?: SourceProvenance<string[]>;
  supersededBy?: SourceProvenance<string>;
  officialDocumentUrls: OfficialDocumentRecord[];
  sourceRecords: RegulatorySourceRecord[];
  lastSourceCheck: string;
  sourceRetrievedAt: string;
}

export type SourceConsistencyStatus = 
  | 'CONSISTENT'
  | 'PARTIALLY_CONSISTENT'
  | 'SOURCE_CONFLICT'
  | 'INSUFFICIENT_DATA'
  | 'NOT_COMPARABLE';

export interface SourceReconciliationFieldComparison {
  fieldName: string;
  sourceA: { source: RegulatorySourceType; value: any };
  sourceB: { source: RegulatorySourceType; value: any };
  status: SourceConsistencyStatus;
  reason: string;
}

export interface SourceReconciliationResult {
  adNumber: string;
  overallStatus: SourceConsistencyStatus;
  summary: string;
  fieldComparisons: SourceReconciliationFieldComparison[];
  reconciledAt: string;
}

export type RegulatoryScreeningStatus = 
  | 'POTENTIAL_MATCH'
  | 'NO_MATCH'
  | 'INSUFFICIENT_METADATA';

export interface AircraftScreeningAssessment {
  aircraftId: string;
  registration: string;
  msn: string;
  aircraftModel: string;
  canonicalModel: string;
  status: RegulatoryScreeningStatus;
  reason: string;
  confidence: number;
  details: {
    makeMatch?: boolean;
    modelMatch?: boolean;
    isAmbiguous?: boolean;
  };
}

export interface FleetRegulatoryScreeningReport {
  adNumber: string;
  sourceAuthority: string;
  screenedAt: string;
  totalScreened: number;
  potentialMatches: number;
  noMatches: number;
  insufficientMetadata: number;
  disclaimer: string;
  assessments: AircraftScreeningAssessment[];
}

// ============================================================================
// PHASE 5.1: REGULATORY DISCOVERY ENGINE TYPES
// ============================================================================

export type DiscoveryStatus = 
  | 'NEW'
  | 'SEEN'
  | 'ALREADY_KNOWN'
  | 'INVALID'
  | 'ERROR';

export interface RegulatoryDiscoveryRecord {
  id: string;
  authority: IssuingAuthority;
  issuingAuthority?: IssuingAuthority;
  source: RegulatorySourceType;
  documentNumber: string;
  adNumber?: string | null;
  title: string;
  subject?: string;
  publicationDate?: string | null;
  effectiveDate?: string | null;
  docketNumber?: string | null;
  citation?: string | null;
  htmlUrl?: string | null;
  pdfUrl?: string | null;
  sourceUrl?: string | null;
  documentHash?: string | null;
  cfrReferences?: Array<{ title?: number; part?: string; chapter?: string | null }>;
  make?: string | null;
  models?: string[] | null;
  productType?: string | null;
  firstDiscoveredAt: string;
  lastSeenAt: string;
  discoveryStatus: DiscoveryStatus;
  provenanceMap: RegulatoryFieldProvenanceMap;
  sourcePayloadReference: string;
  topics?: string[];
  abstract?: string;
  action?: string;
}

export interface RegulatoryDiscoveryScanOptions {
  startDate?: string;
  endDate?: string;
  incremental?: boolean;
  page?: number;
  maxPages?: number;
  perPage?: number;
}

export interface RegulatoryDiscoveryScanSummary {
  scanId: string;
  scannedAt: string;
  startDate: string;
  endDate: string;
  isIncremental: boolean;
  totalDocumentsScanned: number;
  newDiscoveriesCount: number;
  alreadyKnownCount: number;
  errorsCount: number;
  executionTimeMs: number;
  authority: IssuingAuthority;
  cfrTitle: number;
  cfrPart: string;
  pagesScanned: number;
}

// ============================================================================
// PHASE 5.2: AUTOMATED FLEET REGULATORY SCREENING TYPES
// ============================================================================

export interface RegulatoryScreeningAssessment {
  id: string;
  discoveryRecordId: string;
  aircraftId: string;
  registration: string;
  msn: string;
  aircraftModel: string;
  result: RegulatoryScreeningStatus; // 'POTENTIAL_MATCH' | 'NO_MATCH' | 'INSUFFICIENT_METADATA'
  reason: string;
  matchedManufacturer?: string;
  matchedModel?: string;
  fleetCanonicalModel: string;
  regulatoryCanonicalModel?: string;
  confidence: number;
  evaluatedAt: string;
  engineVersion: string; // e.g. "5.2.0"
  productType?: string;
  provenance: {
    manufacturer?: { value?: string; origin?: string; confidence?: number };
    models?: { value?: string[]; origin?: string; confidence?: number };
    fleetModel: { value: string; origin: string };
    canonicalFamily: { value: string; derivation: string };
    ruleApplied: string;
    derivationNote?: string;
  };
  details?: {
    makeMatch?: boolean;
    modelMatch?: boolean;
    isAmbiguous?: boolean;
    isSameFamily?: boolean;
  };
}

export interface RegulatoryScreeningSummary {
  discoveryRecordId: string;
  documentNumber: string;
  adNumber?: string;
  screenedAt: string;
  totalScreened: number;
  potentialMatches: number;
  noMatches: number;
  insufficientMetadata: number;
  engineVersion: string;
  executionTimeMs: number;
  disclaimer: string;
  assessments: RegulatoryScreeningAssessment[];
}

// ============================================================================
// PHASE 5.3: AUTOMATED END-TO-END REGULATORY COMPLIANCE PIPELINE TYPES
// ============================================================================

export type PipelineStageKey = 
  | 'DISCOVERY'
  | 'FLEET_SCREENING'
  | 'OFFICIAL_ACQUISITION'
  | 'DOCUMENT_INTELLIGENCE'
  | 'REQUIREMENT_STRUCTURING'
  | 'CAMO_RULE_ENGINE'
  | 'FLEET_ASSESSMENT_CONSOLIDATION'
  | 'HUMAN_REVIEW_GATEWAY';

export type PipelineExecutionStatus = 
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'COMPLETED_NO_MATCH'
  | 'REVIEW_REQUIRED'
  | 'FAILED'
  | 'CANCELLED';

export type StageExecutionStatus = 
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED'
  | 'SKIPPED'
  | 'WARNING';

export interface PipelineStageExecutionDetail {
  stageKey: PipelineStageKey;
  stageName: string;
  stageNumber: number;
  status: StageExecutionStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  message?: string;
  details?: Record<string, any>;
  error?: string;
}

export interface CompliancePipelineExecution {
  id: string; // e.g. "pipe-exec-1725200000000-abcd"
  discoveryRecordId: string;
  documentNumber: string;
  adNumber?: string;
  title?: string;
  authority: IssuingAuthority;
  status: PipelineExecutionStatus;
  currentStage: PipelineStageKey;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  triggeredBy: 'AUTOMATED_SCAN' | 'MANUAL_TRIGGER' | 'BATCH_RUNNER' | 'RETRY' | 'CRON_SCHEDULER';
  
  // Phase 5.3.1 Hardening & Decision Versioning Metadata
  pipelineVersion: string; // e.g. "5.3.1"
  ruleEngineVersion: string; // e.g. "2.1.0"
  screeningEngineVersion: string; // e.g. "5.2.1"
  acquisitionEngineVersion: string; // e.g. "4.1.1"
  extractorVersion: string; // e.g. "3.7.1"
  modelId?: string;
  promptVersion?: string;
  schemaVersion?: string;
  configHash?: string;
  isFallbackExtraction?: boolean;
  effectiveDateStatus?: 'FUTURE_EFFECTIVE' | 'CURRENT_EFFECTIVE' | 'NOT_SPECIFIED';
  supersedesAdNumbers?: string[];
  supersededByAdNumbers?: string[];

  // Stages trace
  stages: Record<PipelineStageKey, PipelineStageExecutionDetail>;
  
  // Artifacts linked to this execution
  screeningSummary?: RegulatoryScreeningSummary;
  acquiredDocumentId?: string;
  acquiredDocumentHash?: string;
  complianceRequirementId?: string;
  faptId?: string;
  
  // Compliance Metrics
  assessmentsProducedCount?: number;
  applicableCount?: number;
  notApplicableCount?: number;
  reviewRequiredCount?: number;
  generatedQuestionsCount?: number;
  
  // Human Review Gateway
  humanReviewRequired: boolean;
  humanReviewReasons: string[];
  
  // Execution Control & Resilience
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  auditTrail: string[];
}

export interface PipelineExecutionOptions {
  forceFreshDownload?: boolean;
  forceFullRun?: boolean; // If true, proceeds past NO_MATCH screening
  maxRetries?: number;
  triggeredBy?: 'AUTOMATED_SCAN' | 'MANUAL_TRIGGER' | 'BATCH_RUNNER' | 'RETRY' | 'CRON_SCHEDULER';
  skipScreening?: boolean;
}

export interface BatchPipelineExecutionSummary {
  batchId: string;
  startedAt: string;
  completedAt: string;
  totalRequested: number;
  completedCount: number;
  completedNoMatchCount: number;
  reviewRequiredCount: number;
  failedCount: number;
  executionIds: string[];
  durationMs: number;
}

// ============================================================================
// PHASE 6.1: COMPLIANCE LIFECYCLE CORE & OBLIGATION STATE MACHINE TYPES
// ============================================================================

export type ComplianceObligationStatus = 
  | 'IDENTIFIED'
  | 'APPLICABILITY_PENDING'
  | 'APPLICABLE'
  | 'NOT_YET_EFFECTIVE'
  | 'OPEN'
  | 'DUE_SOON'
  | 'OVERDUE'
  | 'COMPLIED'
  | 'NEXT_CYCLE_OPEN'
  | 'NOT_APPLICABLE'
  | 'REVIEW_REQUIRED'
  | 'SUPERSEDED'
  | 'CANCELLED';

export type ObligationStatus = ComplianceObligationStatus;

export interface ObligationStateTransition {
  id: string;
  fromStatus: ComplianceObligationStatus;
  toStatus: ComplianceObligationStatus;
  reason: string;
  timestamp: string;
  ruleResponsible: string; // e.g. "RULE_EFFECTIVE_DATE_FUTURE", "RULE_COMPLIANCE_EVIDENCE_VALIDATED", "RULE_THRESHOLD_OVERDUE", "HUMAN_OVERRIDE_GATEWAY"
  actor: string; // user name or system engine e.g. "ComplianceObligationEngine v6.1.0", "Eng. Fábio Teraoka"
  actorRole?: string;
  details?: Record<string, any>;
  evidenceId?: string;
}

export interface ObligationEvidenceLink {
  evidenceId: string;
  evidenceType: EvidenceType | string;
  documentReference: string;
  sourceReference?: string;
  description: string;
  accomplishmentDate?: string;
  accomplishmentFH?: number;
  accomplishmentFC?: number;
  recordedAt: string;
  recordedBy: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationStatus?: EvidenceVerificationStatus;
  verificationReasons?: string[];
  structuredReviewReasons?: EvidenceReviewReasonCode[];
  documentHash?: string;
  verificationHash?: string;
  notes?: string;
}

export type TemporalOperator = 
  | 'WITHIN' 
  | 'BEFORE' 
  | 'AFTER' 
  | 'NO_LATER_THAN' 
  | 'AT' 
  | 'UPON' 
  | 'FOLLOWING' 
  | 'SINCE' 
  | 'UNTIL';

export type CompositionOperator = 
  | 'NONE'
  | 'AND' 
  | 'OR' 
  | 'WHICHEVER_OCCURS_FIRST' 
  | 'WHICHEVER_OCCURS_LATER' 
  | 'NO_LATER_THAN';

export type TemporalReferenceEvent = 
  | 'EFFECTIVE_DATE' 
  | 'LAST_COMPLIANCE' 
  | 'AIRCRAFT_DELIVERY' 
  | 'MANUFACTURE_DATE'
  | 'COMPONENT_INSTALLATION' 
  | 'EVENT_DATE' 
  | 'SPECIFIC_DATE' 
  | 'NEXT_SCHEDULED_INSPECTION'
  | 'UNKNOWN';

export type ControllingLimitType = 
  | 'FLIGHT_HOURS' 
  | 'FLIGHT_CYCLES' 
  | 'CALENDAR_DAYS' 
  | 'FIXED_DATE' 
  | 'MULTIPLE' 
  | 'NONE';

export type DueDateCalculationStatus = 
  | 'SUCCESS' 
  | 'INSUFFICIENT_DATA' 
  | 'DATA_INTEGRITY_REVIEW' 
  | 'TERMINATED' 
  | 'SUPERSEDED';

export interface CalendarLimitConfig {
  value: number;
  unit: 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';
  operator?: TemporalOperator;
  referenceEvent?: TemporalReferenceEvent;
  noLaterThanDate?: string;
}

export interface ObligationThresholdConfig {
  thresholdType?: 'BEFORE_FURTHER_FLIGHT' | 'FLIGHT_HOURS' | 'FLIGHT_CYCLES' | 'CALENDAR_DAYS' | 'SPECIFIC_DATE' | 'OTHER';
  thresholdValue?: number;
  thresholdDate?: string;
  thresholdFH?: number;
  thresholdFC?: number;
  description?: string;

  // Phase 6.2: Advanced Multi-condition and Operator Model
  operator?: TemporalOperator;
  referenceEvent?: TemporalReferenceEvent;
  referenceEventDate?: string;
  compositionOperator?: CompositionOperator;
  calendarLimit?: CalendarLimitConfig;
  fhLimit?: { value: number; operator?: TemporalOperator; isAccumulatedAirframe?: boolean };
  fcLimit?: { value: number; operator?: TemporalOperator; isAccumulatedAirframe?: boolean };
  noLaterThanCalendar?: CalendarLimitConfig;
  customReferenceName?: string;
}

export interface ObligationIntervalConfig {
  isRepetitive: boolean;
  intervalType?: 'FLIGHT_HOURS' | 'FLIGHT_CYCLES' | 'CALENDAR_DAYS' | 'OTHER';
  intervalValue?: number;
  intervalFH?: number;
  intervalFC?: number;
  intervalDays?: number;
  intervalWeeks?: number;
  intervalMonths?: number;
  intervalYears?: number;
  description?: string;

  // Phase 6.2: Repetitive operators & composition
  operator?: TemporalOperator;
  compositionOperator?: CompositionOperator;
  calendarInterval?: CalendarLimitConfig;
  fhInterval?: { value: number };
  fcInterval?: { value: number };
}

export interface OperationalAlertWindowConfig {
  alertWindowDays?: number; // e.g. 30 days
  alertWindowFH?: number;   // e.g. 100 FH
  alertWindowFC?: number;   // e.g. 50 FC
}

export interface DueDateCalculationExplanation {
  referenceDescription: string;
  requirementDescription: string;
  currentStatusDescription: string;
  calculatedDueDescription: string;
  remainingDescription: string;
  controllingRule: string;
  summary: string;
}

export interface DueDateCalculationResult {
  obligationId?: string;
  calculationStatus: DueDateCalculationStatus;
  controllingLimit: ControllingLimitType;
  controllingReason: string;
  triggeredBy?: string;
  
  calendarLimit?: {
    dueDate?: string;
    remainingDays?: number;
    isOverdue: boolean;
    isDueSoon: boolean;
    referenceDate?: string;
    limitValue?: number;
    unit?: string;
  };
  flightHoursLimit?: {
    dueFH?: number;
    remainingFH?: number;
    isOverdue: boolean;
    isDueSoon: boolean;
    referenceFH?: number;
    intervalFH?: number;
  };
  flightCyclesLimit?: {
    dueFC?: number;
    remainingFC?: number;
    isOverdue: boolean;
    isDueSoon: boolean;
    referenceFC?: number;
    intervalFC?: number;
  };
  fixedDateLimit?: {
    dueDate?: string;
    remainingDays?: number;
    isOverdue: boolean;
    isDueSoon: boolean;
  };

  composition: {
    operator: CompositionOperator;
    earliestLimit?: { parameter: ControllingLimitType; value: string | number; remaining: number };
    latestLimit?: { parameter: ControllingLimitType; value: string | number; remaining: number };
    triggeredBy?: string;
    alternativeLimits: Array<{ parameter: string; due: string | number; remaining: number }>;
  };

  reference: {
    event: TemporalReferenceEvent;
    referenceDate?: string;
    referenceFH?: number;
    referenceFC?: number;
    description: string;
  };

  counters: ObligationTemporalCounters;
  explanation: string;
  structuredExplanation: DueDateCalculationExplanation;

  audit: {
    engineVersion: string; // "6.2.0"
    calculationTimestamp: string;
    calculationInputHash: string;
    ruleApplied: string;
  };

  reviewRequired: boolean;
  reviewReason?: string;
}

export interface ObligationTemporalCounters {
  effectiveDate?: string | null;
  complianceDueDate?: string | null;
  dueDate?: string; // Phase 6.2 & 6.3 alias
  lastComplianceDate?: string;
  lastComplianceFH?: number;
  lastComplianceFC?: number;
  nextDueDate?: string;
  nextDueFH?: number;
  nextDueFC?: number;
  dueFH?: number; // Phase 6.2 & 6.3 alias
  dueFC?: number; // Phase 6.2 & 6.3 alias
  currentAirframeFH?: number;
  currentAirframeFC?: number;
  remainingDays?: number;
  remainingFH?: number;
  remainingFC?: number;
  cycleCount?: number;
  isOverdue?: boolean;
  isDueSoon?: boolean;

  // Phase 6.2 Deterministic Due Date Engine attributes
  controllingLimit?: ControllingLimitType;
  controllingReason?: string;
  calculationStatus?: DueDateCalculationStatus;
  calculationExplanation?: DueDateCalculationExplanation;
  alertWindow?: OperationalAlertWindowConfig;
  earliestDue?: { parameter: string; value: string | number };
  latestDue?: { parameter: string; value: string | number };
  calculationInputHash?: string;
  lastCalculatedAt?: string;
}

export interface ComplianceObligation {
  id: string; // e.g. "obl-req-2024-12-05-ac-01" or "obl-1725200000000-abcd"
  complianceRequirementId: string;
  requirementId?: string; // alias
  adNumber: string;
  documentNumber?: string; // alias
  adRevision?: string;
  adTitle: string;
  mandatedActionTitle?: string; // alias
  issuingAuthority: IssuingAuthority;
  
  // Subject Entity
  targetEntity: {
    entityType: 'AIRCRAFT' | 'ENGINE' | 'COMPONENT' | 'INSTALLATION' | 'SOFTWARE' | 'FLEET';
    entityId: string;
    aircraftId: string;
    aircraftRegistration?: string;
    aircraftMsn?: string;
    aircraftModel?: string;
    serialNumber?: string;
    partNumber?: string;
    position?: string;
  };
  targetEntityId?: string; // alias
  targetEntityType?: string; // alias
  targetEntityLabel?: string; // alias
  aircraftId?: string; // alias

  // Applicability & Mandated Action
  applicabilityStatus: 'APPLICABLE' | 'NOT_APPLICABLE' | 'REVIEW_REQUIRED' | 'EXEMPT';
  applicabilityReasoning: string[];
  applicabilityAssessmentId?: string;
  mandatedActionId?: string;
  mandatedActionParagraph?: string;
  actionDescription?: string;

  // Lifecycle State Machine
  status: ComplianceObligationStatus;
  previousStatus?: ComplianceObligationStatus;
  statusReason: string;
  lifecycleStatus?: string; // alias
  requiresHumanReview?: boolean; // alias
  humanReviewReason?: string; // alias

  // Temporal & Thresholds
  threshold?: ObligationThresholdConfig;
  interval?: ObligationIntervalConfig;
  temporalCounters: ObligationTemporalCounters;
  effectiveDate?: string; // alias
  cycleCount?: number; // alias
  isTerminated?: boolean; // alias

  // Evidence & Accomplishment
  evidence: ObligationEvidenceLink[];
  evidenceLinks?: ObligationEvidenceLink[]; // alias
  lastAccomplishmentId?: string;

  // Terminating Action
  terminatingAction?: {
    hasTerminatingAction: boolean;
    isTerminated: boolean;
    terminatingActionId?: string;
    terminatingParagraph?: string;
    terminationEvidenceId?: string;
    terminationDate?: string;
  };

  // Supersedence
  supersedence?: {
    isSuperseded: boolean;
    supersededByRequirementId?: string;
    supersededByAdNumber?: string;
    supersededDate?: string;
    reason?: string;
    previousObligationId?: string;
    successorObligationId?: string;
  };

  // Human Review
  reviewState: {
    requiresHumanReview: boolean;
    reviewReasons: string[];
    reviewedBy?: string;
    reviewedAt?: string;
    humanDecision?: 'CONFIRMED' | 'OVERRIDDEN' | 'DISMISSED';
    humanJustification?: string;
    originalAutoStatus?: ComplianceObligationStatus;
  };

  // Audit History & Traceability (Append-only state transitions)
  stateTransitions: ObligationStateTransition[];
  
  // Metadata & Versions
  controllingLimit?: any;
  engineVersion: string; // "6.1.0"
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  version: number;
}

export interface ObligationQueryFilter {
  complianceRequirementId?: string;
  aircraftId?: string;
  aircraftRegistration?: string;
  status?: ComplianceObligationStatus | ComplianceObligationStatus[];
  isOverdue?: boolean;
  isDueSoon?: boolean;
  requiresHumanReview?: boolean;
  adNumber?: string;
  isRepetitive?: boolean;
  isSuperseded?: boolean;
}

export interface ObligationEvaluationSummary {
  evaluatedAt: string;
  totalObligations: number;
  statusCounts: Record<ComplianceObligationStatus, number>;
  transitionsExecuted: number;
  overdueCount: number;
  dueSoonCount: number;
  reviewRequiredCount: number;
  compliedCount: number;
}

// =============================================================================
// CAMO PHASE 6.4 — COMPLIANCE STATUS & FLEET AIRWORTHINESS CONTROL ENGINE TYPES
// =============================================================================

export type AirworthinessSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type AircraftComplianceStatus = 
  | 'COMPLIANT'
  | 'ATTENTION_REQUIRED'
  | 'PENDING_REVIEW'
  | 'NON_COMPLIANT'
  | 'NOT_APPLICABLE'
  | 'SUPERSEDED';

export type OperationalDecisionSource = 
  | 'REGULATORY_REQUIREMENT'
  | 'APPROVED_CAMO_PROCEDURE'
  | 'AUTHORITY_DECISION'
  | 'APPROVED_OPERATOR_RULE'
  | 'HUMAN_REVIEW_DECISION'
  | 'NOT_DETERMINED';

export type AircraftAirworthinessStatus = 
  | 'AIRWORTHY'
  | 'AIRWORTHY_WITH_WARNINGS'
  | 'MAINTENANCE_HOLD'
  | 'GROUNDED'
  | 'NOT_DETERMINED';

export interface OperationalAirworthinessRule {
  ruleId: string;
  source: OperationalDecisionSource;
  ruleName: string;
  sourceReference: string;
  description?: string;
  overdueConsequence?: 'GROUNDED' | 'MAINTENANCE_HOLD' | 'NOT_DETERMINED';
  reviewRequiredConsequence?: 'MAINTENANCE_HOLD' | 'GROUNDED' | 'NOT_DETERMINED';
  nonCompliantConsequence?: 'GROUNDED' | 'MAINTENANCE_HOLD' | 'NOT_DETERMINED';
  authorizedBy?: string;
}

export type FleetComplianceStatus = 
  | 'FLEET_COMPLIANT'
  | 'FLEET_ATTENTION'
  | 'FLEET_RESTRICTED'
  | 'FLEET_CRITICAL_NON_COMPLIANT';

export type RequirementComplianceStatus = 
  | 'FULLY_COMPLIANT'
  | 'PARTIALLY_COMPLIANT'
  | 'NON_COMPLIANT'
  | 'ATTENTION_REQUIRED'
  | 'NOT_APPLICABLE'
  | 'SUPERSEDED';

export interface ObligationComplianceAssessment {
  obligationId: string;
  complianceRequirementId: string;
  adNumber: string;
  targetEntityId: string;
  targetEntityType: string;
  aircraftId?: string;
  aircraftRegistration?: string;
  status: ComplianceObligationStatus;
  severity: AirworthinessSeverity;
  isAirworthy: boolean;
  isBlocking: boolean;
  controllingLimit?: string;
  remainingDays?: number;
  remainingFH?: number;
  remainingFC?: number;
  dueSoon: boolean;
  overdue: boolean;
  evidenceSummary: {
    total: number;
    valid: number;
    insufficient: number;
    revoked: number;
    latestAccomplishmentDate?: string;
  };
  blockingReasons: string[];
  warningReasons: string[];
  explanation: string;
  structuredReasonCodes: string[];
  auditHash: string;
  assessedAt: string;
}

export interface RequirementComplianceAssessment {
  complianceRequirementId: string;
  adNumber: string;
  adTitle?: string;
  issuingAuthority: string;
  status: RequirementComplianceStatus;
  severity: AirworthinessSeverity;
  totalObligations: number;
  applicableObligations: number;
  compliedObligations: number;
  overdueObligations: number;
  dueSoonObligations: number;
  openObligations: number;
  reviewRequiredObligations: number;
  notApplicableObligations: number;
  supersededObligations: number;
  complianceRate: number;
  isBlocking: boolean;
  blockingReasons: string[];
  warningReasons: string[];
  affectedAircraft: string[];
  nonCompliantAircraft: string[];
  obligations: ObligationComplianceAssessment[];
  auditHash: string;
  assessedAt: string;
}

export interface AircraftControllingDeadlines {
  nextDueDate?: string;
  daysRemaining?: number;
  nextDueFH?: number;
  fhRemaining?: number;
  nextDueFC?: number;
  fcRemaining?: number;
  controllingObligationId?: string;
  controllingAdNumber?: string;
}

export interface AircraftAirworthinessAssessment {
  aircraftId: string;
  registration: string;
  model: string;
  msn: string;
  currentFH: number;
  currentFC: number;
  complianceStatus: AircraftComplianceStatus;
  status: AircraftAirworthinessStatus;
  airworthinessStatus: AircraftAirworthinessStatus;
  severity: AirworthinessSeverity;
  canFly: boolean | null;
  isGrounded: boolean;
  decisionSource: OperationalDecisionSource;
  decisionRule: string;
  decisionReason: string;
  sourceReference?: string;
  totalObligations: number;
  applicableObligations: number;
  compliedObligations: number;
  overdueObligations: number;
  dueSoonObligations: number;
  openObligations: number;
  reviewRequiredObligations: number;
  notApplicableObligations: number;
  supersededObligations: number;
  controllingDeadlines: AircraftControllingDeadlines;
  blockingObligations: ObligationComplianceAssessment[];
  warningObligations: ObligationComplianceAssessment[];
  blockingReasons: string[];
  warningReasons: string[];
  summary: string;
  auditHash: string;
  assessedAt: string;
}

export interface FleetBlockingObligationItem {
  obligationId: string;
  adNumber: string;
  aircraftRegistration: string;
  reason: string;
  overdueSinceDate?: string;
  overdueFH?: number;
  overdueFC?: number;
}

export interface FleetAirworthinessAssessment {
  fleetComplianceStatus: 'FLEET_COMPLIANT' | 'FLEET_ATTENTION' | 'FLEET_PENDING_REVIEW' | 'FLEET_NON_COMPLIANT';
  fleetStatus: FleetComplianceStatus;
  severity: AirworthinessSeverity;
  totalAircraft: number;
  airworthyAircraftCount: number;
  airworthyWithWarningsCount: number;
  maintenanceHoldCount: number;
  groundedAircraftCount: number;
  undeterminedAirworthinessCount: number;
  compliantAircraftCount: number;
  nonCompliantAircraftCount: number;
  pendingReviewAircraftCount: number;
  attentionAircraftCount: number;
  fleetAirworthinessRate: number;
  totalObligations: number;
  fleetCompliedObligations: number;
  fleetOverdueObligations: number;
  fleetDueSoonObligations: number;
  fleetOpenObligations: number;
  fleetReviewRequiredObligations: number;
  fleetComplianceRate: number;
  groundedAircraftRegistrations: string[];
  restrictedAircraftRegistrations: string[];
  undeterminedAircraftRegistrations: string[];
  nonCompliantAircraftRegistrations: string[];
  blockingObligationsSummary: FleetBlockingObligationItem[];
  authorityBreakdown: Record<string, {
    total: number;
    complied: number;
    overdue: number;
    dueSoon: number;
  }>;
  aircraftAssessments: AircraftAirworthinessAssessment[];
  summary: string;
  auditHash: string;
  engineVersion: string;
  assessedAt: string;
}

// =============================================================================
// CAMO PHASE 7 — AIRCRAFT ACQUISITION & DELIVERY COMPLIANCE TYPES
// =============================================================================

export type DeliveryAssessmentStatus = 
  | 'NOT_STARTED'
  | 'DISCOVERY_IN_PROGRESS'
  | 'DISCOVERY_COMPLETE'
  | 'ANALYSIS_IN_PROGRESS'
  | 'DOCUMENT_RECONCILIATION'
  | 'REVIEW_REQUIRED'
  | 'READY_FOR_FINAL_REVIEW'
  | 'COMPLETED'
  | 'CANCELLED';

export type DeliveryAssessmentType = 
  | 'ACQUISITION'
  | 'DELIVERY'
  | 'LEASE_TRANSITION'
  | 'FLEET_ENTRY'
  | 'RE_ENTRY';

export type DeliveryOperationalPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type DeliveryApplicabilityStatus = 
  | 'IDENTIFIED'
  | 'POTENTIALLY_APPLICABLE'
  | 'APPLICABILITY_CONFIRMED'
  | 'NOT_APPLICABLE'
  | 'REVIEW_REQUIRED'
  | 'NOT_DETERMINED';

export type LessorConfrontationStatus = 
  | 'MATCH'
  | 'DISCREPANCY'
  | 'PENDING_DOCUMENTATION'
  | 'PENDING_ANALYSIS'
  | 'UNVERIFIED';

export interface LessorDeclarationRecord {
  complianceStatus: 'COMPLIED' | 'NOT_APPLICABLE' | 'OPEN' | 'NOT_RECORDED';
  accomplishmentDate?: string;
  accomplishmentFH?: number;
  accomplishmentFC?: number;
  methodOfCompliance?: string;
  documentReferences?: string[];
  notes?: string;
  lastUpdated?: string;
}

export interface DeliveryAdItem {
  id: string;
  adNumber: string;
  issuingAuthority: IssuingAuthority;
  title: string;
  issueDate?: string;
  effectiveDate?: string;
  sourceUrl?: string;
  sourceReference?: string;
  documentHash?: string;
  
  // Knowledge reuse
  isKnownInCamo: boolean;
  camoRequirementId?: string;
  complianceRequirementId?: string;
  knownRequirementVersion?: number;
  
  // Applicability scoping & confirmation
  applicabilityStatus: DeliveryApplicabilityStatus;
  applicabilityReason: string;
  
  // Aircraft-specific Obligation link (isolated per aircraft)
  obligationId?: string;
  regulatoryComplianceStatus?: ComplianceObligationStatus;
  controllingDueDate?: string;
  controllingLimitReason?: string;
  
  // Operational priority
  operationalPriority: DeliveryOperationalPriority;
  
  // Lessor reconciliation
  lessorDeclaration?: LessorDeclarationRecord;
  confrontationStatus: LessorConfrontationStatus;
  confrontationNotes?: string;
  
  // Probatory Evidence Summary (specific to this physical aircraft)
  evidenceSummary: {
    total: number;
    valid: number;
    insufficient: number;
    revoked: number;
  };
  
  // Supersedence & versioning
  isSuperseded?: boolean;
  supersededByAdNumber?: string;
  
  // CAMO Regulatory Register integration
  camoRegisterId?: string;
  registerAnalysisStatus?: RegulatoryRegisterAnalysisStatus;
  ataChapter?: string;
  
  analyzedAt?: string;
  analyzedBy?: string;
}

export interface DeliveryAssessmentMetrics {
  totalIdentified: number;
  potentiallyApplicable: number;
  analyzedCount: number;
  pendingCount: number;
  reviewRequiredCount: number;
  complianceBreakdown: {
    complied: number;
    open: number;
    overdue: number;
    dueSoon: number;
    reviewRequired: number;
    notApplicable: number;
    superseded: number;
  };
  confrontationBreakdown: {
    matchCount: number;
    discrepancyCount: number;
    pendingDocCount: number;
    pendingAnalysisCount: number;
  };
  criticalBlockersCount: number;
}

export interface DeliveryAircraftConfig {
  id?: string;
  manufacturer: string;
  model: string;
  family?: string;
  series?: string;
  variant?: string;
  lineVariation?: string;
  msn: string;
  serialNumber?: string;
  registration: string;
  manufactureDate?: string;
  originalDeliveryDate?: string;
  currentOperator?: string;
  lessor?: string;
  targetDeliveryDate?: string;
  totalFlightHours: number;
  totalCycles: number;
  totalLandings?: number;
  totalAirframeHours?: number;
  totalAirframeCycles?: number;
  engineModel?: string;
  currentModifications?: string[];
  apu?: any;
  engines: Array<{
    position: string;
    manufacturer: string;
    model: string;
    serialNumber: string;
    partNumber?: string;
    totalHours: number;
    totalCycles: number;
  }>;
  components?: Array<{
    position: string;
    description: string;
    partNumber: string;
    serialNumber: string;
  }>;
  stcs?: string[];
  knownModifications?: string[];
}

export interface DeliveryAssessmentSnapshot {
  snapshotId: string;
  assessmentId: string;
  aircraftRegistration: string;
  aircraftMsn: string;
  aircraftModel: string;
  finalStatus: DeliveryAssessmentStatus;
  complianceSummary: {
    totalAds: number;
    complied: number;
    open: number;
    overdue: number;
    dueSoon: number;
    reviewRequired: number;
    notApplicable: number;
    superseded: number;
    pendingAnalysis?: number;
  };
  confrontationSummary: {
    matches: number;
    discrepancies: number;
    pendingDoc: number;
  };
  blockingIssues: string[];
  warningIssues: string[];
  engineVersions: {
    discoveryEngine: string;
    screeningEngine: string;
    ruleEngine: string;
    obligationEngine: string;
    dueDateEngine: string;
    evidenceEngine: string;
    airworthinessEngine: string;
    deliveryEngine: string;
  };
  finalizedAt: string;
  finalizedBy: string;
  disclaimer: string;
  auditHash: string; // Verifiable SHA-256 integrity hash
}

export interface AircraftDeliveryAssessment {
  id: string;
  title: string;
  aircraftId: string;
  aircraftRegistration?: string;
  aircraftMsn?: string;
  aircraftModel?: string;
  isPreDeliveryAircraft: boolean;
  aircraftConfig: DeliveryAircraftConfig;
  assessmentType: DeliveryAssessmentType;
  status: DeliveryAssessmentStatus;
  targetDeliveryDate?: string;
  lessor: string;
  operator: string;
  notes?: string;
  discoverySummary?: {
    totalDiscovered: number;
    knownInCamo: number;
    newDiscovered: number;
    potentiallyApplicable: number;
    notApplicable: number;
    lastDiscoveryDate: string;
    sourcesConsulted: string[];
  };
  adItems: DeliveryAdItem[];
  metrics: DeliveryAssessmentMetrics;
  finalSnapshot?: DeliveryAssessmentSnapshot;
  auditHash: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface CreateDeliveryAssessmentInput {
  title?: string;
  aircraftId?: string; // If existing aircraft in fleet
  isPreDeliveryAircraft?: boolean;
  aircraftConfig: DeliveryAircraftConfig;
  assessmentType: DeliveryAssessmentType;
  targetDeliveryDate?: string;
  lessor: string;
  operator: string;
  notes?: string;
  actor?: string;
}

export type AircraftDeliveryAssessmentInput = CreateDeliveryAssessmentInput;

export interface ReconcileLessorInput {
  assessmentId: string;
  adNumber: string;
  declaration: LessorDeclarationRecord;
  actor?: string;
}

export interface AnalyzeDeliveryAdInput {
  assessmentId: string;
  adNumber: string;
  actor?: string;
}

export interface HelpCenterArticle {
  id: string;
  title: string;
  category: 'GETTING_STARTED' | 'DELIVERY_ASSESSMENT' | 'COMPLIANCE_STATUS' | 'AUDIT_INTEGRITY';
  summary: string;
  content: string;
  version: string;
  lastUpdated: string;
  relatedFields?: string[];
}

// =============================================================================
// PHASE 9 — ETAPA 4: REGULATORY INTELLIGENCE, KNOWLEDGE BASE & CONFIGURATION COMPLETENESS
// =============================================================================

export type ProgressiveApplicabilityState = 
  | 'POTENTIALLY_APPLICABLE' 
  | 'INSUFFICIENT_DATA' 
  | 'REVIEW_REQUIRED' 
  | 'APPLICABLE' 
  | 'NOT_APPLICABLE';

export type ConfigurationParameterCategory = 
  | 'AIRFRAME' 
  | 'ENGINE' 
  | 'COMPONENT' 
  | 'SOFTWARE' 
  | 'MODIFICATION';

export type ConfigurationEvaluationStatus = 
  | 'AVAILABLE' 
  | 'MISSING' 
  | 'INCONSISTENT';

export interface RequiredConfigurationParameter {
  id: string;
  parameterKey: 
    | 'AIRCRAFT_MODEL'
    | 'AIRCRAFT_MSN'
    | 'AIRCRAFT_VARIABLE_NUMBER'
    | 'AIRCRAFT_LINE_NUMBER'
    | 'ENGINE_FAMILY'
    | 'ENGINE_MODEL'
    | 'ENGINE_SERIAL_NUMBER'
    | 'COMPONENT_PART_NUMBER'
    | 'COMPONENT_SERIAL_NUMBER'
    | 'COMPONENT_INSTALLATION_STATUS'
    | 'SOFTWARE_PART_NUMBER'
    | 'SOFTWARE_VERSION'
    | 'MODIFICATION_STC_STATUS'
    | 'SERVICE_BULLETIN_STATUS';
  label: string;
  category: ConfigurationParameterCategory;
  statusInAd: 'EXPLICITLY_REQUIRED' | 'CONDITIONAL';
  targetValues?: string[];
  targetRanges?: string;
  description?: string;
  traceability: {
    adNumber: string;
    requirementId?: string;
    authority: IssuingAuthority;
    ruleCitation?: string;
    sourceExcerpt?: string;
  };
}

export interface RegulatoryAdCandidate {
  id: string;
  adNumber: string;
  authority: IssuingAuthority;
  title: string;
  issueDate: string;
  effectiveDate: string;
  manufacturer: string;
  family: string;
  modelScope: string[];
  rawApplicabilityText: string;
  sourceUrl?: string;
  docketNumber?: string;
  source: RegulatorySourceType;
  status: 'DISCOVERED' | 'SCREENED' | 'ARCHIVED';
  analysisStatus: RegulatoryRegisterAnalysisStatus | 'FAILED';
  analyzedRequirementId?: string;
  discoveryTimestamp: string;
  retrievedAt?: string;
  lifecycleStatus?: string;
  searchQuery?: string;
  summary?: string;
  operationalPriority?: 'CRITICAL_URGENT' | 'HIGH' | 'NORMAL';
}

export interface RegulatoryKnowledgeItem {
  id: string;
  requirementId: string;
  adNumber: string;
  authority: IssuingAuthority;
  title: string;
  effectiveDate: string;
  manufacturer: string;
  family: string;
  modelScope: string[];
  engineScope?: string[];
  componentScope?: string[];
  softwareScope?: string[];
  modificationScope?: string[];
  requiredConfigurationData: RequiredConfigurationParameter[];
  complianceThresholdSummary: string;
  isRepetitive: boolean;
  hasTerminatingAction: boolean;
  applicabilityRuleSummary: string;
  analyzedAt: string;
  documentSha256?: string;
  provenance: {
    source: string;
    citation?: string;
    documentNumber?: string;
  };
}

export interface ParameterEvaluationItem {
  parameterKey: string;
  label: string;
  category: ConfigurationParameterCategory;
  evaluationStatus: ConfigurationEvaluationStatus;
  currentValue?: any;
  expectedConstraint?: string;
  detail: string;
  requiredByAdCount: number;
  requiredByAds: Array<{
    adNumber: string;
    requirementId: string;
    authority: IssuingAuthority;
    title: string;
  }>;
}

export interface OperationalMissingItem {
  id: string;
  label: string;
  category: ConfigurationParameterCategory;
  parameterKey: string;
  severity: 'CRITICAL_BLOCKER' | 'RECOMMENDED';
  adImpactCount: number;
  adReferences: string[];
  traceabilityPath: string; // e.g. "Required Data -> Applicability Rule -> AD 2024-15-08 -> FAA"
  resolved: boolean;
  resolvedValue?: string;
}

export interface AircraftConfigurationAssessment {
  id: string;
  aircraftId?: string;
  registration?: string;
  manufacturer: string;
  family: string;
  model: string;
  msn: string;
  isCandidateAircraft: boolean;
  assessedAt: string;
  completionPercentage: number;
  totalParametersRequired: number;
  satisfiedParametersCount: number;
  missingParametersCount: number;
  inconsistentParametersCount: number;
  parameterEvaluations: ParameterEvaluationItem[];
  operationalMissingList: OperationalMissingItem[];
  applicabilityBreakdown: {
    totalEvaluatedAds: number;
    potentiallyApplicable: number;
    insufficientData: number;
    reviewRequired: number;
    applicable: number;
    notApplicable: number;
  };
}

export type RegulatorySourceConnectionStatus = 'CONNECTED' | 'OFFICIAL_REPO' | 'UNAVAILABLE' | 'NOT_CONFIRMED';

export interface AuthorityDiscoveryDiagnostic {
  authority: IssuingAuthority;
  sourceName: string;
  sourceStatus: RegulatorySourceConnectionStatus;
  rawRetrieved: number;
  normalized: number;
  candidatesBeforeFilter: number;
  candidatesAfterFilter: number;
  duplicatesRemoved: number;
  finalCandidates: number;
  pagesScanned?: number;
  totalAuthorityRecords?: number;
  authorityTotalPages?: number;
  notes?: string;
}

export interface RegulatoryDiscoveryDiagnostic {
  query: string;
  family?: string;
  model?: string;
  manufacturer?: string;
  timestamp: string;
  authorities: {
    FAA: AuthorityDiscoveryDiagnostic;
    EASA: AuthorityDiscoveryDiagnostic;
    ANAC: AuthorityDiscoveryDiagnostic;
  };
  totals: {
    rawRetrieved: number;
    normalized: number;
    candidatesBeforeFilter: number;
    candidatesAfterFilter: number;
    duplicatesRemoved: number;
    finalCandidates: number;
    totalAuthorityRecords?: number;
  };
  diagnosticReportText: string;
}

// ============================================================================
// FASE 9 — ETAPA 5: CAMO REGULATORY REGISTER, INTAKE & ANALYSIS QUEUE TYPES
// ============================================================================

export type RegulatoryDeltaClassification =
  | 'NEW'
  | 'UNCHANGED'
  | 'UPDATED'
  | 'SUPERSEDED'
  | 'REVOKED'
  | 'REVIEW_REQUIRED';

export type RegulatoryRegisterAnalysisStatus =
  | 'PENDING_ANALYSIS'
  | 'ANALYSIS_IN_PROGRESS'
  | 'ANALYSIS_FAILED'
  | 'REVIEW_REQUIRED'
  | 'ANALYZED'
  | 'FAILED';

export type AnalysisStepKey =
  | 'IDENTIFICATION'
  | 'DOCUMENT_RETRIEVAL'
  | 'EXTRACTION_INTELLIGENCE'
  | 'APPLICABILITY_STRUCTURING'
  | 'MANDATED_ACTIONS'
  | 'KNOWLEDGE_COMPILATION'
  | 'FLEET_EVALUATION'
  | 'AUDIT_LINKAGE';

export type AnalysisStepStatus =
  | 'SUCCESS'
  | 'RUNNING'
  | 'FAILED'
  | 'ERROR'
  | 'INCOMPLETE'
  | 'REVIEW_REQUIRED'
  | 'PENDING';

export interface AnalysisStepEvaluation {
  stepKey: AnalysisStepKey;
  stepName: string;
  isMandatory: boolean;
  status: AnalysisStepStatus;
  message: string;
  error?: string;
  completedAt?: string;
  details?: Record<string, any>;
}

export interface AnalysisCompletenessResult {
  isComplete: boolean;
  effectiveStatus: RegulatoryRegisterAnalysisStatus;
  summary: string;
  completedStepsCount: number;
  totalMandatorySteps: number;
  steps: AnalysisStepEvaluation[];
  failedSteps: AnalysisStepEvaluation[];
  reviewSteps: AnalysisStepEvaluation[];
  missingRequirement: boolean;
  canTransitionToAnalyzed: boolean;
  evaluatedAt: string;
}

export interface RegulatoryRegisterVersionHistory {
  version: number;
  changedAt: string;
  changedBy: string;
  changesSummary: string;
  previousSha256?: string;
  previousPayload?: any;
  previousAnalysisStatus?: RegulatoryRegisterAnalysisStatus;
  reReviewRequired: boolean;
}

export interface CamoRegulatoryRecord {
  id: string; // Deterministic canonical ID: reg-{authority}-{adNumberClean}
  canonicalAdId?: string;
  authority: IssuingAuthority;
  adNumber: string; // Official AD identifier (e.g. "2024-12-05", "2024-0120")
  officialDocumentNumber?: string;
  title: string;
  manufacturer: string;
  family: string;
  modelScope: string[];
  ataChapter?: string; // e.g. "32", "27", "57", "72"
  issueDate?: string;
  publicationDate?: string;
  effectiveDate?: string;
  officialStatus?: 'ACTIVE' | 'SUPERSEDED' | 'REVOKED' | 'CANCELLED';
  sourceUrl?: string;
  sourceType: string;
  sourceIdentifier: string;
  originalPayload?: any;
  sha256?: string; // Content integrity verification hash
  firstSeenAt: string;
  lastSeenAt: string;
  lastChangedAt: string;
  retrievedAt: string;
  searchContext?: {
    family?: string;
    model?: string;
    manufacturer?: string;
    query?: string;
    variant?: string;
    engine?: string;
  };
  version: number;
  versionHistory?: RegulatoryRegisterVersionHistory[];
  deltaStatus?: RegulatoryDeltaClassification;
  analysisStatus: RegulatoryRegisterAnalysisStatus; // Default strictly PENDING_ANALYSIS
  analysisCompleteness?: AnalysisCompletenessResult;
  analysisError?: string;
  analysisStartedAt?: string;
  analysisCompletedAt?: string;
  analysisId?: string; // ComplianceRequirement ID when analyzed
  analyzedRequirementId?: string;
  knowledgeId?: string; // RegulatoryKnowledgeItem ID when analyzed
  rawApplicabilityText?: string;
  operationalPriority?: 'CRITICAL_URGENT' | 'HIGH' | 'NORMAL';
  auditTrail?: Array<{
    timestamp: string;
    action: string;
    actor: string;
    details: string;
  }>;
}

export interface DiscoveredRegulatoryAd extends RegulatoryAdCandidate {
  canonicalAdId?: string;
  deltaStatus: RegulatoryDeltaClassification;
  deltaClassification?: RegulatoryDeltaClassification;
  inRegister: boolean;
  registerId?: string;
  registerAnalysisStatus?: RegulatoryRegisterAnalysisStatus;
  ataChapter?: string;
  sha256?: string;
}

export interface FleetRegulatoryIntakeParams {
  query?: string;
  manufacturer?: string;
  family?: string;
  model?: string;
  variant?: string;
  engine?: string;
  engineFamily?: string;
  registration?: string;
  msn?: string;
  authority?: IssuingAuthority | 'ALL';
  page?: number;
  perPage?: number;
  maxPages?: number;
  autoPaginate?: boolean;
}

export interface FleetRegulatoryIntakeResult {
  candidates: DiscoveredRegulatoryAd[];
  totalCount: number;
  authorityTotalCount?: number;
  authorityTotalPages?: number;
  authorityCurrentPage?: number;
  authorityPerPage?: number;
  downloadedCount?: number;
  importedCount?: number;
  notImportedCount?: number;
  pendingAnalysisCount?: number;
  analyzedCount?: number;
  newCount: number;
  unchangedCount: number;
  updatedCount: number;
  supersededCount: number;
  revokedCount: number;
  reviewRequiredCount: number;
  fleetContext: {
    manufacturer?: string;
    family?: string;
    model?: string;
    variant?: string;
    engine?: string;
    registration?: string;
    msn?: string;
    rawQuery?: string;
  };
  sourcesConsulted: string[];
  diagnostic: RegulatoryDiscoveryDiagnostic;
  diagnosticReportText: string;
  timestamp: string;
}

export interface ImportToRegisterInput {
  candidates?: RegulatoryAdCandidate[];
  candidateIds?: string[];
  importAll?: boolean;
  searchParams?: FleetRegulatoryIntakeParams;
  actor?: string;
  operationalPriority?: 'CRITICAL_URGENT' | 'HIGH' | 'NORMAL';
}

export interface ImportToRegisterResult {
  totalConsidered: number;
  importedNew: number;
  importedCount?: number;
  skippedExisting: number;
  unchangedCount?: number;
  updated: number;
  updatedCount?: number;
  camoRegisterTotal: number;
  records: CamoRegulatoryRecord[];
}




