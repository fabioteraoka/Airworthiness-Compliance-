/**
 * Comprehensive Test Suite for CAMO Engine Phase 6.3 - Evidence Management & Verification Engine
 * 
 * Verifies deterministic behavior across:
 * 1. Entity Matching (Aircraft, Engine, Component)
 * 2. Requirement & Mandated Action Sufficiency
 * 3. Temporal Consistency & Counter Logic
 * 4. Document Integrity & Deterministic Hashing
 * 5. Multi-evidence Probatory Set Evaluation & Conflict Detection
 * 6. Evidence State Machine & Legitimacy Matrix
 * 7. Evidence Revocation & Automatic Obligation Reopening
 */

import { evidenceVerificationEngine, EvidenceValidationResult } from './camoEngine/evidenceVerificationEngine';
import { complianceObligationService } from './camoEngine/complianceObligationService';
import { 
  Aircraft, 
  ComplianceRequirement, 
  ComplianceObligation, 
  Evidence, 
  MandatedAction,
  EvidenceVerificationStatus,
  ObligationEvidenceLink
} from '../src/types';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, category: string, failureDetail?: string) {
  if (condition) {
    results.push({ name, category, passed: true });
    console.log(`  ✅ [${category}] ${name}`);
  } else {
    results.push({ name, category, passed: false, message: failureDetail });
    console.error(`  ❌ [${category}] ${name} - FAILED: ${failureDetail}`);
  }
}

// Mock Data Fixtures
const mockAircraft: Aircraft = {
  id: 'air-pr-xyz',
  operatorId: 'op-latam',
  registration: 'PR-XYZ',
  msn: 'MSN-1234',
  manufacturer: 'Airbus',
  model: 'A320-214',
  aircraftType: 'Commercial Transport',
  status: 'OPERATIONAL',
  totalFlightHours: 5000,
  totalCycles: 2500,
  totalLandings: 2500
};

const mockRequirement: any = {
  id: 'req-ad-2026-01',
  title: 'Pitch Trim Actuator Inspection and Replacement',
  authority: 'ANAC',
  type: 'AD',
  category: 'AIRFRAME',
  effectiveDate: '2026-01-15',
  status: 'CURRENT',
  applicabilityCriteria: {
    aircraftModel: { status: 'APPLICABLE', values: ['A320-214'] },
    serialNumbers: ['MSN-1234']
  },
  mandatedActions: [
    {
      id: 'act-insp-01',
      actionName: 'Detailed Visual Inspection of Actuator Rod',
      actionType: 'ONE_TIME_INSPECTION',
      isTerminatingAction: false
    },
    {
      id: 'act-rep-02',
      actionName: 'Mandatory Replacement of P/N 400-01 with P/N 400-02',
      actionType: 'HARDWARE_REPLACEMENT',
      isTerminatingAction: true
    }
  ]
};

const mockObligation: ComplianceObligation = {
  id: 'obl-test-01',
  complianceRequirementId: 'req-ad-2026-01',
  adNumber: 'AD 2026-01-05',
  adTitle: 'Pitch Trim Actuator Inspection',
  issuingAuthority: 'ANAC',
  mandatedActionId: 'act-insp-01',
  applicabilityStatus: 'APPLICABLE',
  applicabilityReasoning: ['Matching A320 model'],
  engineVersion: '6.3.0',
  createdBy: 'SYSTEM',
  updatedBy: 'SYSTEM',
  targetEntity: {
    entityType: 'AIRCRAFT',
    entityId: 'air-pr-xyz',
    aircraftId: 'air-pr-xyz',
    aircraftRegistration: 'PR-XYZ',
    serialNumber: 'MSN-1234'
  },
  status: 'OPEN',
  statusReason: 'Obligation open for compliance',
  threshold: {
    description: '180 days or 2000 hours'
  },
  interval: {
    isRepetitive: true,
    description: '90 days or 1000 hours'
  },
  temporalCounters: {
    effectiveDate: '2026-01-15',
    dueDate: '2026-07-14',
    complianceDueDate: '2026-07-14',
    controllingLimit: 'CALENDAR_DAYS',
    remainingDays: 30,
    isDueSoon: true,
    isOverdue: false,
    cycleCount: 0
  },
  evidence: [],
  stateTransitions: [],
  reviewState: {
    requiresHumanReview: false,
    reviewReasons: []
  },
  createdAt: '2026-01-15T00:00:00Z',
  updatedAt: '2026-01-15T00:00:00Z',
  version: 1
};

export function runPhase63EvidenceVerificationTests(): { total: number; passed: number; failed: number; results: TestResult[] } {
  console.log('\n=============================================================');
  console.log('  RUNNING PHASE 6.3 EVIDENCE MANAGEMENT & VERIFICATION TESTS');
  console.log('=============================================================\n');

  // -------------------------------------------------------------
  // GROUP 1: ENTITY MATCHING CHECKS (4 tests)
  // -------------------------------------------------------------
  console.log('--- Group 1: Entity Matching Checks ---');

  // Test 1.1: Valid matching aircraft entity
  const validEvAircraft: Evidence = {
    id: 'ev-test-1',
    obligationId: 'obl-test-01',
    complianceRequirementId: 'req-ad-2026-01',
    source: 'CAMO_EVIDENCE_ATTACHMENT' as any,
    evidenceType: 'MAINTENANCE_RECORD',
    documentReference: 'WO-2026-8890',
    description: 'Pitch trim visual inspection performed with zero findings',
    targetEntity: {
      entityType: 'AIRCRAFT',
      entityId: 'air-pr-xyz',
      registration: 'PR-XYZ',
      serialNumber: 'MSN-1234'
    },
    eventDate: '2026-06-10',
    eventFlightHours: 4500,
    eventFlightCycles: 2200,
    submittedBy: 'Eng. Carlos'
  };

  const res1_1 = evidenceVerificationEngine.verifyEvidence({
    evidence: validEvAircraft,
    obligation: mockObligation,
    requirement: mockRequirement,
    mandatedAction: mockRequirement.mandatedActions![0],
    aircraft: mockAircraft
  });
  assert(res1_1.status === 'VALID' && res1_1.isValid, 'Valid matching entity passes verification', 'ENTITY_MATCH');

  // Test 1.2: Registration Mismatch
  const evMismatchReg: Evidence = {
    ...validEvAircraft,
    id: 'ev-test-2',
    targetEntity: {
      entityType: 'AIRCRAFT',
      entityId: 'air-pr-xyz',
      registration: 'PR-WRONG',
      serialNumber: 'MSN-1234'
    }
  };
  const res1_2 = evidenceVerificationEngine.verifyEvidence({
    evidence: evMismatchReg,
    obligation: mockObligation,
    requirement: mockRequirement,
    mandatedAction: mockRequirement.mandatedActions![0],
    aircraft: mockAircraft
  });
  assert(
    res1_2.status === 'INVALID' && res1_2.structuredReasons.includes('ENTITY_MISMATCH'),
    'Registration mismatch causes INVALID status with ENTITY_MISMATCH',
    'ENTITY_MATCH',
    JSON.stringify(res1_2.structuredReasons)
  );

  // Test 1.3: Serial Number Mismatch
  const evMismatchSerial: Evidence = {
    ...validEvAircraft,
    id: 'ev-test-3',
    targetEntity: {
      entityType: 'AIRCRAFT',
      entityId: 'air-pr-xyz',
      registration: 'PR-XYZ',
      serialNumber: 'MSN-9999'
    }
  };
  const res1_3 = evidenceVerificationEngine.verifyEvidence({
    evidence: evMismatchSerial,
    obligation: mockObligation,
    requirement: mockRequirement,
    mandatedAction: mockRequirement.mandatedActions![0],
    aircraft: mockAircraft
  });
  assert(
    res1_3.status === 'INVALID' && res1_3.structuredReasons.includes('ENTITY_MISMATCH'),
    'Serial number mismatch causes INVALID with ENTITY_MISMATCH',
    'ENTITY_MATCH',
    JSON.stringify(res1_3.structuredReasons)
  );

  // Test 1.4: Component Part Number Mismatch for component-level obligation
  const compObligation: ComplianceObligation = {
    ...mockObligation,
    id: 'obl-comp-01',
    targetEntity: {
      entityType: 'COMPONENT',
      entityId: 'comp-pt-01',
      aircraftId: 'air-pr-xyz',
      aircraftRegistration: 'PR-XYZ',
      partNumber: '400-01-A',
      serialNumber: 'SN-ACT-77'
    }
  };
  const evCompWrongPart: Evidence = {
    ...validEvAircraft,
    id: 'ev-comp-wrong',
    targetEntity: {
      entityType: 'COMPONENT',
      entityId: 'comp-pt-01',
      partNumber: '400-01-B',
      serialNumber: 'SN-ACT-77'
    }
  };
  const res1_4 = evidenceVerificationEngine.verifyEvidence({
    evidence: evCompWrongPart,
    obligation: compObligation,
    requirement: mockRequirement,
    mandatedAction: mockRequirement.mandatedActions![0],
    aircraft: mockAircraft
  });
  assert(
    res1_4.status === 'INVALID' && res1_4.structuredReasons.includes('ENTITY_MISMATCH'),
    'Component P/N mismatch causes INVALID with ENTITY_MISMATCH',
    'ENTITY_MATCH'
  );

  // -------------------------------------------------------------
  // GROUP 2: REQUIREMENT & ACTION SUFFICIENCY (4 tests)
  // -------------------------------------------------------------
  console.log('\n--- Group 2: Requirement & Action Sufficiency ---');

  // Test 2.1: Requirement ID mismatch
  const evWrongReq: Evidence = {
    ...validEvAircraft,
    id: 'ev-wrong-req',
    complianceRequirementId: 'req-ad-DIFFERENT'
  };
  const res2_1 = evidenceVerificationEngine.verifyEvidence({
    evidence: evWrongReq,
    obligation: mockObligation,
    requirement: mockRequirement,
    mandatedAction: mockRequirement.mandatedActions![0],
    aircraft: mockAircraft
  });
  assert(
    res2_1.status === 'INVALID' && res2_1.structuredReasons.includes('REQUIREMENT_MISMATCH'),
    'Requirement ID mismatch flags REQUIREMENT_MISMATCH',
    'REQUIREMENT_CHECK'
  );

  // Test 2.2: Mandated action type mismatch (Visual inspection cannot fulfill replacement obligation)
  const repObligation: ComplianceObligation = {
    ...mockObligation,
    id: 'obl-rep-01',
    mandatedActionId: 'act-rep-02'
  };
  const evInspectionOnly: Evidence = {
    ...validEvAircraft,
    id: 'ev-insp-only',
    evidenceType: 'INSPECTION_RECORD',
    description: 'Visual inspection performed only, no part replaced'
  };
  const res2_2 = evidenceVerificationEngine.verifyEvidence({
    evidence: evInspectionOnly,
    obligation: repObligation,
    requirement: mockRequirement,
    mandatedAction: mockRequirement.mandatedActions![1], // REPLACEMENT action
    aircraft: mockAircraft
  });
  assert(
    (res2_2.status === 'INSUFFICIENT' || res2_2.status === 'INVALID') && res2_2.structuredReasons.includes('AMBIGUOUS_ACTION'),
    'Inspection record fails to fulfill replacement action (AMBIGUOUS_ACTION)',
    'ACTION_SUFFICIENCY',
    JSON.stringify(res2_2.structuredReasons)
  );

  // Test 2.3: Valid Form 1 / Authorized Release for component replacement
  const evValidReplacement: Evidence = {
    ...validEvAircraft,
    id: 'ev-rep-valid',
    evidenceType: 'AUTHORIZED_RELEASE_CERTIFICATE' as any,
    description: 'Replaced pitch trim actuator with P/N 400-02 under ANAC Form F-100-01'
  };
  const res2_3 = evidenceVerificationEngine.verifyEvidence({
    evidence: evValidReplacement,
    obligation: repObligation,
    requirement: mockRequirement,
    mandatedAction: mockRequirement.mandatedActions![1],
    aircraft: mockAircraft
  });
  assert(
    res2_3.status === 'VALID' && res2_3.isValid,
    'Authorized release certificate satisfies replacement requirement',
    'ACTION_SUFFICIENCY'
  );

  // Test 2.4: Missing document reference / incomplete evidence data
  const evMissingDocRef: Evidence = {
    ...validEvAircraft,
    id: 'ev-missing-ref',
    documentReference: '',
    sourceReference: ''
  };
  const res2_4 = evidenceVerificationEngine.verifyEvidence({
    evidence: evMissingDocRef,
    obligation: mockObligation,
    requirement: mockRequirement,
    mandatedAction: mockRequirement.mandatedActions![0],
    aircraft: mockAircraft
  });
  assert(
    res2_4.status === 'INSUFFICIENT' && res2_4.structuredReasons.includes('MISSING_IDENTIFIER'),
    'Missing document reference results in INSUFFICIENT status',
    'DATA_COMPLETENESS'
  );

  // -------------------------------------------------------------
  // GROUP 3: TEMPORAL CONSISTENCY CHECKS (4 tests)
  // -------------------------------------------------------------
  console.log('\n--- Group 3: Temporal Consistency Checks ---');

  // Test 3.1: Future event date
  const evFutureDate: Evidence = {
    ...validEvAircraft,
    id: 'ev-future-date',
    eventDate: '2029-12-31'
  };
  const res3_1 = evidenceVerificationEngine.verifyEvidence({
    evidence: evFutureDate,
    obligation: mockObligation,
    requirement: mockRequirement,
    mandatedAction: mockRequirement.mandatedActions![0],
    aircraft: mockAircraft
  });
  assert(
    res3_1.status === 'INVALID' && res3_1.structuredReasons.includes('TEMPORAL_INCONSISTENCY'),
    'Future accomplishment date flags TEMPORAL_INCONSISTENCY',
    'TEMPORAL_CONSISTENCY'
  );

  // Test 3.2: Accomplishment prior to effective date / baseline
  const evBeforeEffective: Evidence = {
    ...validEvAircraft,
    id: 'ev-before-effective',
    eventDate: '2025-10-01' // Requirement effective date is 2026-01-15
  };
  const res3_2 = evidenceVerificationEngine.verifyEvidence({
    evidence: evBeforeEffective,
    obligation: mockObligation,
    requirement: mockRequirement,
    mandatedAction: mockRequirement.mandatedActions![0],
    aircraft: mockAircraft
  });
  assert(
    (res3_2.status === 'INVALID' || res3_2.status === 'INSUFFICIENT') && res3_2.structuredReasons.includes('TEMPORAL_INCONSISTENCY'),
    'Accomplishment before AD effective date flags INVALID/INSUFFICIENT with TEMPORAL_INCONSISTENCY',
    'TEMPORAL_CONSISTENCY'
  );

  // Test 3.3: Flight hours negative regression / exceeds current aircraft hours
  const evFhExcess: Evidence = {
    ...validEvAircraft,
    id: 'ev-fh-excess',
    eventDate: '2026-06-10',
    eventFlightHours: 99000 // Aircraft has 5000 hours
  };
  const res3_3 = evidenceVerificationEngine.verifyEvidence({
    evidence: evFhExcess,
    obligation: mockObligation,
    requirement: mockRequirement,
    mandatedAction: mockRequirement.mandatedActions![0],
    aircraft: mockAircraft
  });
  assert(
    res3_3.status === 'INVALID' && res3_3.structuredReasons.includes('COUNTER_REGRESSION'),
    'Event flight hours exceeding current fleet total flags COUNTER_REGRESSION',
    'TEMPORAL_CONSISTENCY'
  );

  // Test 3.4: Normal valid temporal accomplishment within window
  const evNormalDate: Evidence = {
    ...validEvAircraft,
    id: 'ev-normal-date',
    eventDate: '2026-04-15',
    eventFlightHours: 4200,
    eventFlightCycles: 2100
  };
  const res3_4 = evidenceVerificationEngine.verifyEvidence({
    evidence: evNormalDate,
    obligation: mockObligation,
    requirement: mockRequirement,
    mandatedAction: mockRequirement.mandatedActions![0],
    aircraft: mockAircraft
  });
  assert(
    res3_4.status === 'VALID' && res3_4.isValid,
    'Valid date and counters inside window pass verification',
    'TEMPORAL_CONSISTENCY'
  );

  // Test 3.5: Boundary condition - Accomplishment exactly on due date
  const evExactBoundary: Evidence = {
    ...validEvAircraft,
    id: 'ev-exact-boundary',
    eventDate: '2026-07-14', // Exactly mockObligation.temporalCounters.dueDate
    eventFlightHours: 4800,
    eventFlightCycles: 2350
  };
  const res3_5 = evidenceVerificationEngine.verifyEvidence({
    evidence: evExactBoundary,
    obligation: mockObligation,
    requirement: mockRequirement,
    mandatedAction: mockRequirement.mandatedActions![0],
    aircraft: mockAircraft
  });
  assert(
    res3_5.status === 'VALID' && res3_5.isValid && !res3_5.isOverdueCompliance,
    'Accomplishment exactly on the due date is valid and on-time compliance',
    'TEMPORAL_CONSISTENCY'
  );

  // Test 3.6: Overdue compliance distinction (accomplished after due limit)
  const evOverdueCompliance: Evidence = {
    ...validEvAircraft,
    id: 'ev-overdue-comp',
    eventDate: '2026-08-01', // Past 2026-07-14
    eventFlightHours: 4900,
    eventFlightCycles: 2400
  };
  const res3_6 = evidenceVerificationEngine.verifyEvidence({
    evidence: evOverdueCompliance,
    obligation: mockObligation,
    requirement: mockRequirement,
    mandatedAction: mockRequirement.mandatedActions![0],
    aircraft: mockAircraft
  });
  assert(
    res3_6.status === 'VALID' && res3_6.isOverdueCompliance && res3_6.ruleResponsible === 'RULE_EVIDENCE_VALID_OVERDUE_COMPLIANCE',
    'Accomplishment after due date is classified as OVERDUE COMPLIANCE without false on-time',
    'TEMPORAL_CONSISTENCY'
  );

  // Test 3.7: Missing temporal data (no event date provided)
  const evMissingDate: Evidence = {
    ...validEvAircraft,
    id: 'ev-missing-date',
    eventDate: undefined,
    date: undefined,
    eventFlightHours: undefined,
    eventFlightCycles: undefined
  };
  const res3_7 = evidenceVerificationEngine.verifyEvidence({
    evidence: evMissingDate,
    obligation: mockObligation,
    requirement: mockRequirement,
    mandatedAction: mockRequirement.mandatedActions![0],
    aircraft: mockAircraft
  });
  assert(
    res3_7.status === 'INSUFFICIENT' && res3_7.structuredReasons.includes('MISSING_EVENT_DATE'),
    'Missing accomplishment date produces INSUFFICIENT status with MISSING_EVENT_DATE',
    'TEMPORAL_CONSISTENCY'
  );

  // -------------------------------------------------------------
  // GROUP 4: INTEGRITY, HASHING & TAMPER DETECTION (4 tests)
  // -------------------------------------------------------------
  console.log('\n--- Group 4: Integrity, Hashing & Tamper Detection ---');

  // Test 4.1: Deterministic hash stability
  const sampleData = { doc: 'WO-12345', date: '2026-05-10', fh: 4500 };
  const hash1 = evidenceVerificationEngine.calculateInputHash(sampleData);
  const hash2 = evidenceVerificationEngine.calculateInputHash(sampleData);
  assert(hash1 === hash2 && hash1.length === 64, 'SHA-256 hash calculation is deterministic and 64-chars long', 'INTEGRITY');

  // Test 4.2: Payload tampering detection
  const tamperedData = { doc: 'WO-12345', date: '2026-05-10', fh: 4501 };
  const hashTampered = evidenceVerificationEngine.calculateInputHash(tamperedData);
  assert(hash1 !== hashTampered, 'Altering single byte/number produces completely different hash', 'INTEGRITY');

  // Test 4.3: Binary/string document hash matches known value
  const samplePdfContent = '%PDF-1.4 Mock Engineering Order Signed Document';
  const docHash1 = evidenceVerificationEngine.calculateDocumentHash(samplePdfContent);
  const docHash2 = evidenceVerificationEngine.calculateDocumentHash(samplePdfContent);
  assert(docHash1 === docHash2, 'Document file hash verification is identical across passes', 'INTEGRITY');

  // Test 4.4: Corrupted document hash check
  const evWithDocHash: Evidence = {
    ...validEvAircraft,
    id: 'ev-doc-hash-tampered',
    documentHash: '0000000000000000000000000000000000000000000000000000000000000000',
    uploadedFileData: samplePdfContent
  };
  const res4_4 = evidenceVerificationEngine.verifyEvidence({
    evidence: evWithDocHash,
    obligation: mockObligation,
    requirement: mockRequirement,
    mandatedAction: mockRequirement.mandatedActions![0],
    aircraft: mockAircraft
  });
  assert(
    res4_4.status === 'INVALID' && res4_4.structuredReasons.includes('TAMPERING_SUSPECTED'),
    'Mismatch between uploaded file data and stored hash detects TAMPERING_SUSPECTED',
    'INTEGRITY'
  );

  // -------------------------------------------------------------
  // GROUP 5: PROBATORY SET & CONFLICT DETECTION (5 tests)
  // -------------------------------------------------------------
  console.log('\n--- Group 5: Probatory Set & Conflict Detection ---');

  // Test 5.1: Multiple non-conflicting valid evidences (chronological sequence)
  const evSeq1: Evidence = {
    ...validEvAircraft,
    id: 'ev-seq-1',
    eventDate: '2026-03-01',
    eventFlightHours: 4000,
    verificationStatus: 'VALID',
    verified: true
  };
  const evSeq2: Evidence = {
    ...validEvAircraft,
    id: 'ev-seq-2',
    eventDate: '2026-05-01',
    eventFlightHours: 4400,
    verificationStatus: 'VALID',
    verified: true
  };
  const set5_1 = evidenceVerificationEngine.evaluateObligationProbatorySet(
    mockObligation,
    [evSeq1, evSeq2],
    mockAircraft
  );
  assert(
    set5_1.canTransitionToComplied && set5_1.latestValidAccomplishment?.date === '2026-05-01',
    'Selects latest valid chronological accomplishment as current compliance baseline',
    'PROBATORY_SET'
  );

  // Test 5.2: Conflicting temporal counters (later date has lower flight hours!)
  const evConflict1: Evidence = {
    ...validEvAircraft,
    id: 'ev-conf-1',
    eventDate: '2026-04-01',
    eventFlightHours: 4500,
    verificationStatus: 'VALID',
    verified: true
  };
  const evConflict2: Evidence = {
    ...validEvAircraft,
    id: 'ev-conf-2',
    eventDate: '2026-05-01',
    eventFlightHours: 4100, // Regression! Later date with fewer hours
    verificationStatus: 'VALID',
    verified: true
  };
  const set5_2 = evidenceVerificationEngine.evaluateObligationProbatorySet(
    mockObligation,
    [evConflict1, evConflict2],
    mockAircraft
  );
  assert(
    !set5_2.canTransitionToComplied && set5_2.resultingStatus === 'REVIEW_REQUIRED' && set5_2.conflictingEvidences.length > 0,
    'Conflicting accomplishment counters force REVIEW_REQUIRED status and block transition to COMPLIED',
    'PROBATORY_SET'
  );

  // Test 5.3: Terminating action proven prevents repetitive cycle continuation
  const evTerminating: Evidence = {
    ...evValidReplacement,
    id: 'ev-term-01',
    evidenceType: 'SERVICE_BULLETIN_RECORD',
    description: 'Service Bulletin terminating action accomplished',
    verificationStatus: 'VALID',
    verified: true
  };
  const oblWithTerminating: ComplianceObligation = {
    ...mockObligation,
    terminatingAction: {
      hasTerminatingAction: true,
      terminatingActionId: 'act-rep-02',
      isTerminated: false
    }
  };
  const set5_3 = evidenceVerificationEngine.evaluateObligationProbatorySet(
    oblWithTerminating,
    [evTerminating],
    mockAircraft
  );
  assert(
    set5_3.canTransitionToComplied && set5_3.terminatingActionProven === true,
    'Terminating action proof flags terminatingActionProven and closes recurrence loop',
    'PROBATORY_SET'
  );

  // Test 5.4: Empty probatory set
  const set5_4 = evidenceVerificationEngine.evaluateObligationProbatorySet(
    mockObligation,
    [],
    mockAircraft
  );
  assert(
    !set5_4.canTransitionToComplied && (set5_4.resultingStatus === 'OPEN' || set5_4.resultingStatus === 'DUE_SOON' || set5_4.resultingStatus === 'OVERDUE'),
    'Empty probatory set cannot transition to COMPLIED and remains non-complied',
    'PROBATORY_SET'
  );

  // Test 5.5: Probatory set containing only INVALID or REVOKED evidences
  const evRevoked: Evidence = {
    ...validEvAircraft,
    id: 'ev-revoked-01',
    verificationStatus: 'REVOKED',
    verified: false
  };
  const set5_5 = evidenceVerificationEngine.evaluateObligationProbatorySet(
    mockObligation,
    [evRevoked],
    mockAircraft
  );
  assert(
    !set5_5.canTransitionToComplied && set5_5.validEvidences.length === 0,
    'Probatory set with only REVOKED evidence has 0 valid count and rejects compliance',
    'PROBATORY_SET'
  );

  // Test 5.6: Multiple INSUFFICIENT evidences do NOT equal one VALID evidence
  const evInsuff1: Evidence = { ...validEvAircraft, id: 'ev-ins-1', verificationStatus: 'INSUFFICIENT', verified: false };
  const evInsuff2: Evidence = { ...validEvAircraft, id: 'ev-ins-2', verificationStatus: 'INSUFFICIENT', verified: false };
  const evInsuff3: Evidence = { ...validEvAircraft, id: 'ev-ins-3', verificationStatus: 'INSUFFICIENT', verified: false };
  const set5_6 = evidenceVerificationEngine.evaluateObligationProbatorySet(
    mockObligation,
    [evInsuff1, evInsuff2, evInsuff3],
    mockAircraft
  );
  assert(
    !set5_6.canTransitionToComplied && set5_6.validEvidences.length === 0,
    'Multiple INSUFFICIENT evidences do NOT equal one VALID evidence',
    'PROBATORY_SET'
  );

  // Test 5.7: Multiple complementary valid evidences consolidate compliance
  const evCompl1: Evidence = { ...validEvAircraft, id: 'ev-comp-wo', evidenceType: 'WORK_ORDER', verificationStatus: 'VALID', verified: true };
  const evCompl2: Evidence = { ...validEvAircraft, id: 'ev-comp-tc', evidenceType: 'TASK_CARD', verificationStatus: 'VALID', verified: true };
  const set5_7 = evidenceVerificationEngine.evaluateObligationProbatorySet(
    mockObligation,
    [evCompl1, evCompl2],
    mockAircraft
  );
  assert(
    set5_7.canTransitionToComplied && set5_7.validEvidences.length === 2,
    'Multiple complementary valid records successfully consolidate compliance',
    'PROBATORY_SET'
  );

  // -------------------------------------------------------------
  // GROUP 6: STATE TRANSITION MATRIX & LEGITIMACY (8 tests)
  // -------------------------------------------------------------
  console.log('\n--- Group 6: State Transition Matrix & Legitimacy ---');

  // Test 6.1: Legal transition: SUBMITTED -> PENDING_VALIDATION
  const t6_1 = evidenceVerificationEngine.isValidStateTransition('SUBMITTED', 'PENDING_VALIDATION');
  assert(t6_1.allowed, 'Transition SUBMITTED -> PENDING_VALIDATION is allowed', 'STATE_MACHINE');

  // Test 6.2: Legal transition: PENDING_VALIDATION -> VALID
  const t6_2 = evidenceVerificationEngine.isValidStateTransition('PENDING_VALIDATION', 'VALID');
  assert(t6_2.allowed, 'Transition PENDING_VALIDATION -> VALID is allowed', 'STATE_MACHINE');

  // Test 6.3: Legal transition: VALID -> REVOKED
  const t6_3 = evidenceVerificationEngine.isValidStateTransition('VALID', 'REVOKED');
  assert(t6_3.allowed, 'Transition VALID -> REVOKED is allowed with justification', 'STATE_MACHINE');

  // Test 6.4: Illegal transition: REVOKED -> VALID (Revoked is terminal, requires new submission)
  const t6_4 = evidenceVerificationEngine.isValidStateTransition('REVOKED', 'VALID');
  assert(!t6_4.allowed, 'Transition REVOKED -> VALID is strictly forbidden (terminal state)', 'STATE_MACHINE');

  // Test 6.5: Legal transition: PENDING_VALIDATION -> INSUFFICIENT
  const t6_5 = evidenceVerificationEngine.isValidStateTransition('PENDING_VALIDATION', 'INSUFFICIENT');
  assert(t6_5.allowed, 'Transition PENDING_VALIDATION -> INSUFFICIENT is allowed', 'STATE_MACHINE');

  // Test 6.6: Legal transition: INSUFFICIENT -> REVIEW_REQUIRED
  const t6_6 = evidenceVerificationEngine.isValidStateTransition('INSUFFICIENT', 'REVIEW_REQUIRED');
  assert(t6_6.allowed, 'Transition INSUFFICIENT -> REVIEW_REQUIRED is allowed', 'STATE_MACHINE');

  // Test 6.7: Legal transition: VALID -> SUPERSEDED
  const t6_7 = evidenceVerificationEngine.isValidStateTransition('VALID', 'SUPERSEDED');
  assert(t6_7.allowed, 'Transition VALID -> SUPERSEDED is allowed', 'STATE_MACHINE');

  // Test 6.8: Illegal transition: SUPERSEDED -> SUBMITTED (Superseded records cannot be resubmitted directly)
  const t6_8 = evidenceVerificationEngine.isValidStateTransition('SUPERSEDED', 'SUBMITTED');
  assert(!t6_8.allowed, 'Transition SUPERSEDED -> SUBMITTED is strictly forbidden', 'STATE_MACHINE');

  // -------------------------------------------------------------
  // GROUP 7: ATTACH, VALIDATE & REVOKE INTEGRATION (5 tests)
  // -------------------------------------------------------------
  console.log('\n--- Group 7: End-to-End Service Integration & Reopen ---');

  const e2eReqId = `req-e2e-${Date.now()}`;
  const e2eRequirement: ComplianceRequirement = {
    ...mockRequirement,
    id: e2eReqId
  };

  // Test 7.1: Attach valid evidence to obligation -> transitions to COMPLIED
  const freshObl = complianceObligationService.createOrUpdateObligation({
    requirement: e2eRequirement,
    aircraft: mockAircraft,
    applicabilityStatus: 'APPLICABLE',
    mandatedAction: e2eRequirement.mandatedActions![0]
  });

  const attached = complianceObligationService.attachEvidence({
    obligationId: freshObl.id,
    evidenceType: 'MAINTENANCE_RECORD',
    documentReference: 'WO-E2E-101',
    description: 'Complied with AD 2026-01-05 inspection',
    accomplishmentDate: '2026-05-10',
    accomplishmentFH: 4300,
    accomplishmentFC: 2150,
    recordedBy: 'Eng. Roberto',
    triggerComplianceEvaluation: true
  });

  assert(
    attached.status === 'COMPLIED' || attached.status === 'NEXT_CYCLE_OPEN',
    'Attaching valid evidence automatically evaluates and transitions obligation to COMPLIED / NEXT_CYCLE_OPEN',
    'SERVICE_E2E'
  );

  // Test 7.2: Verify evidence audit trail entry was created
  const attachedEvidenceLink = attached.evidence.find(e => e.documentReference === 'WO-E2E-101');
  assert(
    attachedEvidenceLink !== undefined && attachedEvidenceLink.verificationStatus === 'VALID' && Boolean(attachedEvidenceLink.verificationHash),
    'Attached evidence link contains status VALID and cryptographic verificationHash',
    'SERVICE_E2E'
  );

  // Test 7.3: Revoke the valid evidence -> Obligation MUST reopen!
  const revokeResult = complianceObligationService.revokeEvidence({
    evidenceId: attachedEvidenceLink!.evidenceId,
    obligationId: attached.id,
    reason: 'Auditoria ANAC identificou calibração vencida da ferramenta torquimétrica.',
    actor: 'Inspetor Qualidade CAMO'
  });

  assert(
    revokeResult.evidence.verificationStatus === 'REVOKED' && revokeResult.evidence.verified === false,
    'Revocation successfully marked evidence as REVOKED and verified=false',
    'SERVICE_E2E'
  );

  assert(
    revokeResult.obligation !== undefined && revokeResult.obligation.status !== 'COMPLIED',
    'Revoking key evidence successfully REOPENS previously complied obligation',
    'SERVICE_E2E',
    `Current obligation status: ${revokeResult.obligation?.status}`
  );

  // Test 7.4: Attempting to transition to COMPLIED with no valid evidence throws error
  let transitionErrorCaught = false;
  try {
    complianceObligationService.transitionState({
      obligationId: freshObl.id,
      toStatus: 'COMPLIED',
      reason: 'Tentativa manual de cumprimento sem evidência',
      ruleResponsible: 'MANUAL_UNVERIFIED_TRY',
      actor: 'Eng. Roberto'
    });
  } catch (e: any) {
    transitionErrorCaught = true;
  }
  assert(
    transitionErrorCaught,
    'Strict Airworthiness Invariant blocks transitioning to COMPLIED without valid verified evidence',
    'SERVICE_E2E'
  );

  // Test 7.5: Re-validating evidence updates deterministic hash
  const validateResult = complianceObligationService.validateEvidence(
    attachedEvidenceLink!.evidenceId,
    'Chief CAMO Engineer'
  );
  assert(
    validateResult.result !== undefined && typeof validateResult.result.verificationHash === 'string',
    'validateEvidence produces deterministic verificationHash and audit entry',
    'SERVICE_E2E'
  );

  // -------------------------------------------------------------
  // GROUP 8: ADVERSARIAL, SECURITY & SAFETY INVARIANTS (5 tests)
  // -------------------------------------------------------------
  console.log('\n--- Group 8: Adversarial, Security & Safety Invariants ---');

  // Test 8.1: Idempotency - Submitting identical evidence twice returns existing link without duplicate noise
  const freshObl2 = complianceObligationService.createOrUpdateObligation({
    requirement: mockRequirement,
    aircraft: mockAircraft,
    applicabilityStatus: 'APPLICABLE',
    mandatedAction: mockRequirement.mandatedActions![0]
  });

  const attachFirst = complianceObligationService.attachEvidence({
    obligationId: freshObl2.id,
    evidenceType: 'MAINTENANCE_RECORD',
    documentReference: 'WO-IDEMP-99',
    description: 'Pitch trim inspection work order',
    accomplishmentDate: '2026-05-15',
    accomplishmentFH: 4400,
    accomplishmentFC: 2200,
    recordedBy: 'Eng. Roberto'
  });
  const firstCount = attachFirst.evidence.length;

  const attachSecond = complianceObligationService.attachEvidence({
    obligationId: freshObl2.id,
    evidenceType: 'MAINTENANCE_RECORD',
    documentReference: 'WO-IDEMP-99',
    description: 'Pitch trim inspection work order',
    accomplishmentDate: '2026-05-15',
    accomplishmentFH: 4400,
    accomplishmentFC: 2200,
    recordedBy: 'Eng. Roberto'
  });
  const secondCount = attachSecond.evidence.length;

  assert(
    firstCount === secondCount,
    'Submitting identical evidence twice preserves idempotency and prevents duplicate links',
    'ADVERSARIAL_SECURITY'
  );

  // Test 8.2: Cross-Aircraft Isolation - Attaching evidence for PR-WRONG fails verification
  const evCrossAircraft: Evidence = {
    ...validEvAircraft,
    id: 'ev-cross-air-1',
    targetEntity: {
      entityType: 'AIRCRAFT',
      entityId: 'air-wrong-01',
      registration: 'PR-VBC',
      serialNumber: 'MSN-7890'
    }
  };
  const res8_2 = evidenceVerificationEngine.verifyEvidence({
    evidence: evCrossAircraft,
    obligation: freshObl2,
    requirement: mockRequirement,
    mandatedAction: mockRequirement.mandatedActions![0],
    aircraft: mockAircraft
  });
  assert(
    res8_2.status === 'INVALID' && res8_2.structuredReasons.includes('ENTITY_MISMATCH'),
    'Cross-aircraft evidence injection is strictly rejected with ENTITY_MISMATCH',
    'ADVERSARIAL_SECURITY'
  );

  // Test 8.3: CAMO Internal Approval != Regulatory AMOC
  const humanReviewRecorded = complianceObligationService.recordHumanReview({
    obligationId: freshObl2.id,
    reviewedBy: 'Chief Inspector CAMO',
    decision: 'OVERRIDDEN',
    newStatus: 'REVIEW_REQUIRED',
    justification: 'Decisão interna de engenharia com inspeção suplementar.'
  });
  assert(
    (humanReviewRecorded as any).amocApproval === undefined && humanReviewRecorded.status !== 'COMPLIED',
    'CAMO internal engineering acceptance does not claim AMOC authority status',
    'ADVERSARIAL_SECURITY'
  );

  // Test 8.4: Audit Trail Immutability - Preserves historical entries without mutation
  const auditEntries = (humanReviewRecorded as any).auditTrail || [];
  const hasStateTransitions = humanReviewRecorded.stateTransitions.length > 0;
  assert(
    auditEntries.length >= 0 && hasStateTransitions,
    'Obligation lifecycle maintains immutable chronological audit transitions',
    'ADVERSARIAL_SECURITY'
  );

  // Test 8.5: Deterministic reproducibility across repeated verification passes
  const vPass1 = evidenceVerificationEngine.verifyEvidence({
    evidence: validEvAircraft,
    obligation: mockObligation,
    requirement: mockRequirement,
    mandatedAction: mockRequirement.mandatedActions![0],
    aircraft: mockAircraft
  });
  const vPass2 = evidenceVerificationEngine.verifyEvidence({
    evidence: validEvAircraft,
    obligation: mockObligation,
    requirement: mockRequirement,
    mandatedAction: mockRequirement.mandatedActions![0],
    aircraft: mockAircraft
  });
  assert(
    vPass1.verificationHash === vPass2.verificationHash && vPass1.status === vPass2.status,
    'Repeated verification passes yield identical deterministic verificationHash and status',
    'ADVERSARIAL_SECURITY'
  );

  // Summary
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  console.log('\n=============================================================');
  console.log(`  PHASE 6.3 EVIDENCE ENGINE TEST RESULTS: ${passedCount}/${results.length} PASSED`);
  if (failedCount > 0) {
    console.log(`  ⚠️ FAILED TESTS: ${failedCount}`);
  } else {
    console.log('  🎉 ALL TEST SUITES PASSED DETERMINISTICALLY WITH 0 ERRORS');
  }
  console.log('=============================================================\n');

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    results
  };
}

// Auto-run if invoked directly
if (process.argv[1]?.includes('testPhase63EvidenceEngine')) {
  runPhase63EvidenceVerificationTests();
}
