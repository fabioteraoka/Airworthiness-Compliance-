import { 
  ComplianceRequirement, 
  Aircraft, 
  Engine, 
  Component, 
  ComponentInstallation, 
  Evidence, 
  KnowledgeFact,
  ActionComplianceAssessment,
  ComplianceAssessment,
  ComplianceStatus,
  AssessmentResult,
  MandatedAction,
  SoftwareRequirement,
  ExternalEffectivityReference,
  InstalledSoftwareRecord,
  MaintenanceActionAccomplishment
} from '../../src/types';

export interface DecisionBasisItem {
  category: 'APPLICABILITY' | 'EXTERNAL_EFFECTIVITY' | 'SOFTWARE' | 'ACTION' | 'EVIDENCE' | 'LIFECYCLE';
  source: 'AD_DOCUMENT' | 'FLEET_INVENTORY' | 'EXTERNAL_RB_SB' | 'TECH_LOG' | 'RULE_ENGINE_V2';
  analyzedField: string;
  foundValue: any;
  expectedValue?: any;
  reason: string;
  documentReference?: string;
  paragraphReference?: string;
  status: 'SATISFIED' | 'NOT_SATISFIED' | 'UNKNOWN' | 'REVIEW_REQUIRED';
}

export interface FleetInventoryInput {
  aircraft: Aircraft;
  engines?: Engine[];
  components?: Component[];
  installations?: ComponentInstallation[];
  installedSoftware?: InstalledSoftwareRecord[];
  actionAccomplishments?: MaintenanceActionAccomplishment[];
  evidence?: Evidence[];
  knowledgeFacts?: KnowledgeFact[];
}

export interface ApplicabilityEvaluationResult {
  status: 'APPLICABLE' | 'NOT_APPLICABLE' | 'REVIEW_REQUIRED' | 'EXEMPT';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string[];
  decisionBasis: DecisionBasisItem[];
  missingInformation: string[];
  matchedModel?: string;
  matchedMsn?: string;
  externalEffectivityRequired: boolean;
  externalEffectivityVerified: boolean;
}

export interface SoftwareEvaluationResult {
  status: ComplianceStatus;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string[];
  decisionBasis: DecisionBasisItem[];
  missingInformation: string[];
  installedSoftwareFound?: InstalledSoftwareRecord;
  isMandatedLoaded: boolean;
  isProhibitedFound: boolean;
}

export interface CamoAssessment {
  id: string;
  complianceRequirementId: string;
  adNumber: string;
  aircraftId: string;
  aircraftRegistration: string;
  aircraftMsn: string;
  aircraftModel: string;
  
  // Phase I
  applicabilityStatus: 'APPLICABLE' | 'NOT_APPLICABLE' | 'REVIEW_REQUIRED' | 'EXEMPT';
  
  // Phase II & III
  complianceStatus: ComplianceStatus;
  
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string[];
  decisionBasis: DecisionBasisItem[];
  missingInformation: string[];
  
  // Phase II Atomic Actions
  actionAssessments: ActionComplianceAssessment[];
  
  // Legacy Adapter Result
  legacyResultEquivalent: AssessmentResult;
  
  assessedBy: string; // "CAMO Rule Engine V2 (Decoupled)"
  assessmentDate: string;
  engineVersion: '2.0.0-DECOUPLED';
}
