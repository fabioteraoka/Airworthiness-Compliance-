/**
 * CAMO PHASE 6.4 — COMPLIANCE STATUS & FLEET AIRWORTHINESS CONTROL ENGINE
 * EXHAUSTIVE VALIDATION & VERIFICATION TEST SUITE (51 DETERMINISTIC TESTS)
 */

import { fleetAirworthinessControlEngine, FleetAirworthinessControlEngine, FLEET_AIRWORTHINESS_ENGINE_VERSION } from './camoEngine/fleetAirworthinessControlEngine';
import { 
  ComplianceObligation,
  ComplianceRequirement,
  Aircraft,
  ComplianceObligationStatus,
  ObligationComplianceAssessment,
  RequirementComplianceAssessment,
  AircraftAirworthinessAssessment,
  FleetAirworthinessAssessment
} from '../src/types';

export async function runPhase64AirworthinessEngineTests() {
  console.log('=============================================================');
  console.log('  RUNNING PHASE 6.4 COMPLIANCE & FLEET AIRWORTHINESS TESTS   ');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, message: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [${testName}] ${message}`);
    } else {
      failed++;
      console.error(`  ❌ [${testName}] FAILED: ${message}`);
    }
  }

  // =========================================================================
  // MOCK ENTITIES & BASE OBJECTS
  // =========================================================================
  const mockAircraft1: Aircraft = {
    id: 'ac-test-01',
    operatorId: 'op-01',
    registration: 'PR-TESTA',
    msn: '10001',
    manufacturer: 'Boeing',
    model: '737-800',
    series: 'NG',
    aircraftType: 'Commercial Transport',
    status: 'OPERATIONAL',
    totalFlightHours: 12000,
    totalCycles: 6000,
    totalLandings: 6000,
    manufactureDate: '2016-01-01'
  };

  const mockAircraft2: Aircraft = {
    id: 'ac-test-02',
    operatorId: 'op-01',
    registration: 'PR-TESTB',
    msn: '10002',
    manufacturer: 'Boeing',
    model: '737-800',
    series: 'NG',
    aircraftType: 'Commercial Transport',
    status: 'OPERATIONAL',
    totalFlightHours: 8500,
    totalCycles: 4200,
    totalLandings: 4200,
    manufactureDate: '2018-05-15'
  };

  const mockAircraft3: Aircraft = {
    id: 'ac-test-03',
    operatorId: 'op-01',
    registration: 'PR-TESTC',
    msn: '10003',
    manufacturer: 'Boeing',
    model: '737-800',
    series: 'NG',
    aircraftType: 'Commercial Transport',
    status: 'OPERATIONAL',
    totalFlightHours: 5000,
    totalCycles: 2500,
    totalLandings: 2500,
    manufactureDate: '2020-10-10'
  };

  const mockRequirement1: ComplianceRequirement = {
    id: 'req-test-ad-01',
    sourceType: 'AD',
    sourceNumber: '2025-01-01',
    title: 'Fuselage Skin Inspection AD',
    issuingAuthority: 'FAA',
    revision: '0',
    status: 'APPROVED',
    issueDate: '2025-01-15',
    effectiveDate: '2025-02-01',
    emergencyAd: false,
    documentProcessingStatus: 'EXTRACTED',
    extractionStatus: 'SUCCESS',
    applicabilityRule: {
      id: 'app-01',
      complianceRequirementId: 'req-test-ad-01',
      aircraftManufacturers: ['Boeing'],
      aircraftModels: ['737-800'],
      componentPartNumbers: [],
      rawText: 'All 737-800'
    },
    actions: [],
    mandatedActions: [
      {
        id: 'act-01',
        paragraphReference: '(g)(1)',
        actionType: 'ONE_TIME_INSPECTION',
        description: 'Detailed inspection of upper crown fuselage skin',
        sequence: 1
      }
    ],
    softwareRequirements: [],
    externalEffectivityReferences: [],
    referencedDocuments: [],
    createdAt: new Date().toISOString(),
    createdBy: 'System',
    updatedAt: new Date().toISOString(),
    updatedBy: 'System'
  };

  // Base obligation template
  const baseObligation: ComplianceObligation = {
    id: 'obl-base',
    complianceRequirementId: 'req-test-ad-01',
    adNumber: '2025-01-01',
    adTitle: 'Fuselage Skin Inspection AD',
    targetEntityId: 'ac-test-01',
    targetEntityType: 'AIRCRAFT',
    aircraftId: 'ac-test-01',
    issuingAuthority: 'FAA',
    targetEntity: {
      entityType: 'AIRCRAFT',
      entityId: 'ac-test-01',
      aircraftId: 'ac-test-01',
      aircraftRegistration: 'PR-TESTA',
      aircraftModel: '737-800'
    },
    applicabilityStatus: 'APPLICABLE',
    applicabilityReasoning: ['Direct model match'],
    status: 'OPEN',
    statusReason: 'Initial state',
    temporalCounters: {
      cycleCount: 1,
      isOverdue: false,
      isDueSoon: false,
      controllingLimit: 'CALENDAR_DAYS',
      remainingDays: 90,
      remainingFH: 1500,
      remainingFC: 800,
      lastCalculatedAt: new Date().toISOString()
    },
    evidence: [],
    reviewState: { requiresHumanReview: false, reviewReasons: [] },
    stateTransitions: [],
    engineVersion: '6.4.0',
    createdAt: new Date().toISOString(),
    createdBy: 'System',
    updatedAt: new Date().toISOString(),
    updatedBy: 'System',
    version: 1
  };

  // =========================================================================
  // GROUP 1: LEVEL 1 — INDIVIDUAL OBLIGATION STATUSES (8 TESTS)
  // =========================================================================
  console.log('--- Group 1: Level 1 — Individual Obligation Statuses ---');

  // 1.1 OVERDUE Obligation
  const overdueObligation: ComplianceObligation = {
    ...baseObligation,
    id: 'obl-01-overdue',
    status: 'OVERDUE',
    statusReason: 'Threshold exceeded',
    temporalCounters: {
      ...baseObligation.temporalCounters!,
      isOverdue: true,
      remainingDays: -15,
      lastCalculatedAt: new Date().toISOString()
    }
  };
  const oblAss1 = fleetAirworthinessControlEngine.assessObligation(overdueObligation);
  assert(
    oblAss1.status === 'OVERDUE' && oblAss1.severity === 'CRITICAL' && oblAss1.isAirworthy === false && oblAss1.isBlocking === true,
    'OBL_STATUS_OVERDUE',
    'OVERDUE obligation evaluated as CRITICAL, unairworthy, and blocking'
  );

  // 1.2 REVIEW_REQUIRED Obligation
  const reviewRequiredObligation: ComplianceObligation = {
    ...baseObligation,
    id: 'obl-02-review',
    status: 'REVIEW_REQUIRED',
    statusReason: 'Discrepancy in maintenance logbook',
    reviewState: { requiresHumanReview: true, reviewReasons: ['Logbook entry missing inspector stamp'] }
  };
  const oblAss2 = fleetAirworthinessControlEngine.assessObligation(reviewRequiredObligation);
  assert(
    oblAss2.status === 'REVIEW_REQUIRED' && oblAss2.severity === 'HIGH' && oblAss2.isAirworthy === false && oblAss2.isBlocking === true,
    'OBL_STATUS_REVIEW_REQUIRED',
    'REVIEW_REQUIRED obligation evaluated as HIGH, unairworthy, and blocking'
  );

  // 1.3 DUE_SOON Obligation
  const dueSoonObligation: ComplianceObligation = {
    ...baseObligation,
    id: 'obl-03-duesoon',
    status: 'DUE_SOON',
    statusReason: 'Within warning threshold',
    temporalCounters: {
      ...baseObligation.temporalCounters!,
      isDueSoon: true,
      remainingDays: 12,
      lastCalculatedAt: new Date().toISOString()
    }
  };
  const oblAss3 = fleetAirworthinessControlEngine.assessObligation(dueSoonObligation);
  assert(
    oblAss3.status === 'DUE_SOON' && oblAss3.severity === 'MEDIUM' && oblAss3.isAirworthy === true && oblAss3.isBlocking === false,
    'OBL_STATUS_DUE_SOON',
    'DUE_SOON obligation evaluated as MEDIUM severity, airworthy with warning'
  );

  // 1.4 COMPLIED Obligation with verified evidence
  const validEvidence = {
    evidenceId: 'ev-01',
    evidenceType: 'MAINTENANCE_RECORD',
    documentReference: 'WO-2025-001',
    description: 'Detailed inspection completed per AMM 53-10-00',
    recordedAt: new Date().toISOString(),
    recordedBy: 'Eng John',
    verified: true,
    verificationStatus: 'VALID' as const,
    verificationHash: 'abc1234567890',
    accomplishmentDate: '2025-03-01'
  };
  const compliedObligation: ComplianceObligation = {
    ...baseObligation,
    id: 'obl-04-complied',
    status: 'COMPLIED',
    statusReason: 'Evidence verified and valid',
    evidence: [validEvidence]
  };
  const oblAss4 = fleetAirworthinessControlEngine.assessObligation(compliedObligation);
  assert(
    oblAss4.status === 'COMPLIED' && oblAss4.severity === 'INFO' && oblAss4.isAirworthy === true && oblAss4.isBlocking === false,
    'OBL_STATUS_COMPLIED',
    'COMPLIED obligation evaluated as INFO severity, fully airworthy'
  );

  // 1.5 OPEN Obligation
  const openObligation: ComplianceObligation = {
    ...baseObligation,
    id: 'obl-05-open',
    status: 'OPEN',
    statusReason: 'Normal open operational window'
  };
  const oblAss5 = fleetAirworthinessControlEngine.assessObligation(openObligation);
  assert(
    oblAss5.status === 'OPEN' && oblAss5.severity === 'LOW' && oblAss5.isAirworthy === true && oblAss5.isBlocking === false,
    'OBL_STATUS_OPEN',
    'OPEN obligation evaluated as LOW severity, airworthy'
  );

  // 1.6 NOT_YET_EFFECTIVE Obligation
  const notYetEffectiveObligation: ComplianceObligation = {
    ...baseObligation,
    id: 'obl-06-not-yet-effective',
    status: 'NOT_YET_EFFECTIVE',
    statusReason: 'AD effective date in the future'
  };
  const oblAss6 = fleetAirworthinessControlEngine.assessObligation(notYetEffectiveObligation);
  assert(
    oblAss6.status === 'NOT_YET_EFFECTIVE' && oblAss6.severity === 'LOW' && oblAss6.isAirworthy === true,
    'OBL_STATUS_NOT_YET_EFFECTIVE',
    'NOT_YET_EFFECTIVE obligation evaluated as LOW severity and non-blocking'
  );

  // 1.7 NOT_APPLICABLE Obligation
  const notApplicableObligation: ComplianceObligation = {
    ...baseObligation,
    id: 'obl-07-na',
    status: 'NOT_APPLICABLE',
    applicabilityStatus: 'NOT_APPLICABLE',
    applicabilityReasoning: ['MSN not in effectivity range']
  };
  const oblAss7 = fleetAirworthinessControlEngine.assessObligation(notApplicableObligation);
  assert(
    oblAss7.status === 'NOT_APPLICABLE' && oblAss7.severity === 'INFO' && oblAss7.isAirworthy === true && oblAss7.isBlocking === false,
    'OBL_STATUS_NOT_APPLICABLE',
    'NOT_APPLICABLE obligation evaluated as INFO severity and safe'
  );

  // 1.8 SUPERSEDED & CANCELLED Obligation
  const supersededObligation: ComplianceObligation = {
    ...baseObligation,
    id: 'obl-08-superseded',
    status: 'SUPERSEDED',
    supersedence: { isSuperseded: true, supersededByAdNumber: '2026-05-01' }
  };
  const oblAss8 = fleetAirworthinessControlEngine.assessObligation(supersededObligation);
  assert(
    oblAss8.status === 'SUPERSEDED' && oblAss8.severity === 'INFO' && oblAss8.isAirworthy === true && oblAss8.isBlocking === false,
    'OBL_STATUS_SUPERSEDED',
    'SUPERSEDED obligation preserved historically without blocking operations'
  );

  // =========================================================================
  // GROUP 2: PRECEDENCE LOGIC (6 TESTS)
  // =========================================================================
  console.log('\n--- Group 2: Precedence Logic ---');

  // 2.1 COMPLIED + DUE_SOON: Precedence to DUE_SOON warning
  const acPrecedence1 = fleetAirworthinessControlEngine.assessAircraftAirworthiness('ac-test-01', {
    aircraft: mockAircraft1,
    obligations: [compliedObligation, dueSoonObligation]
  });
  assert(
    acPrecedence1.status === 'AIRWORTHY_WITH_WARNINGS' && acPrecedence1.dueSoonObligations === 1 && acPrecedence1.compliedObligations === 1,
    'PRECEDENCE_COMPLIED_DUE_SOON',
    'COMPLIED + DUE_SOON resolves to AIRWORTHY_WITH_WARNINGS'
  );

  // 2.2 COMPLIED + OVERDUE: Strict precedence to GROUNDED when authorized rule provided
  const acPrecedence2 = fleetAirworthinessControlEngine.assessAircraftAirworthiness('ac-test-01', {
    aircraft: mockAircraft1,
    obligations: [compliedObligation, overdueObligation],
    operationalRule: FleetAirworthinessControlEngine.AUTHORIZED_RULES.FAR_39_MANDATORY_GROUNDING
  });
  assert(
    acPrecedence2.complianceStatus === 'NON_COMPLIANT' && acPrecedence2.status === 'GROUNDED' && acPrecedence2.canFly === false && acPrecedence2.severity === 'CRITICAL' && acPrecedence2.decisionRule === 'FAR_39_MANDATORY_GROUNDING',
    'PRECEDENCE_COMPLIED_OVERDUE',
    'COMPLIED + OVERDUE with authorized rule resolves strictly to GROUNDED'
  );

  // 2.3 DUE_SOON + REVIEW_REQUIRED: Precedence to MAINTENANCE_HOLD when authorized rule provided
  const acPrecedence3 = fleetAirworthinessControlEngine.assessAircraftAirworthiness('ac-test-01', {
    aircraft: mockAircraft1,
    obligations: [dueSoonObligation, reviewRequiredObligation],
    operationalRule: FleetAirworthinessControlEngine.AUTHORIZED_RULES.CAMO_DISCREPANCY_HOLD
  });
  assert(
    acPrecedence3.complianceStatus === 'PENDING_REVIEW' && acPrecedence3.status === 'MAINTENANCE_HOLD' && acPrecedence3.canFly === false && acPrecedence3.severity === 'HIGH' && acPrecedence3.decisionRule === 'CAMO_SOP_04_DISCREPANCY_HOLD',
    'PRECEDENCE_DUE_SOON_REVIEW_REQUIRED',
    'DUE_SOON + REVIEW_REQUIRED with approved procedure resolves to MAINTENANCE_HOLD'
  );

  // 2.4 OPEN + OVERDUE: Precedence to GROUNDED
  const acPrecedence4 = fleetAirworthinessControlEngine.assessAircraftAirworthiness('ac-test-01', {
    aircraft: mockAircraft1,
    obligations: [openObligation, overdueObligation],
    operationalRule: FleetAirworthinessControlEngine.AUTHORIZED_RULES.FAR_39_MANDATORY_GROUNDING
  });
  assert(
    acPrecedence4.status === 'GROUNDED' && acPrecedence4.canFly === false && acPrecedence4.overdueObligations === 1,
    'PRECEDENCE_OPEN_OVERDUE',
    'OPEN + OVERDUE with FAR 39 rule resolves strictly to GROUNDED'
  );

  // 2.5 Multiple OVERDUE obligations: All blocking reasons preserved
  const overdueObligation2: ComplianceObligation = {
    ...overdueObligation,
    id: 'obl-01b-overdue',
    complianceRequirementId: 'req-test-ad-02',
    adNumber: '2025-01-02'
  };
  const acPrecedence5 = fleetAirworthinessControlEngine.assessAircraftAirworthiness('ac-test-01', {
    aircraft: mockAircraft1,
    obligations: [overdueObligation, overdueObligation2],
    operationalRule: FleetAirworthinessControlEngine.AUTHORIZED_RULES.FAR_39_MANDATORY_GROUNDING
  });
  assert(
    acPrecedence5.status === 'GROUNDED' && acPrecedence5.overdueObligations === 2 && acPrecedence5.blockingObligations.length === 2,
    'PRECEDENCE_MULTIPLE_OVERDUE',
    'Multiple OVERDUE obligations are all identified and counted'
  );

  // 2.6 Multiple REVIEW_REQUIRED obligations: Preserves all reasons
  const reviewRequiredObligation2: ComplianceObligation = {
    ...reviewRequiredObligation,
    id: 'obl-02b-review',
    reviewState: { requiresHumanReview: true, reviewReasons: ['P/N mismatch between SB and IPC'] }
  };
  const acPrecedence6 = fleetAirworthinessControlEngine.assessAircraftAirworthiness('ac-test-01', {
    aircraft: mockAircraft1,
    obligations: [reviewRequiredObligation, reviewRequiredObligation2],
    operationalRule: FleetAirworthinessControlEngine.AUTHORIZED_RULES.CAMO_DISCREPANCY_HOLD
  });
  assert(
    acPrecedence6.status === 'MAINTENANCE_HOLD' && acPrecedence6.reviewRequiredObligations === 2 && acPrecedence6.canFly === false,
    'PRECEDENCE_MULTIPLE_REVIEW_REQUIRED',
    'Multiple REVIEW_REQUIRED obligations are all tracked under MAINTENANCE_HOLD'
  );

  // =========================================================================
  // GROUP 3: AIRCRAFT AIRWORTHINESS CONSOLIDATION (6 TESTS)
  // =========================================================================
  console.log('\n--- Group 3: Aircraft Airworthiness Consolidation ---');

  // 3.1 Aircraft 100% Compliant
  const acAllCompliant = fleetAirworthinessControlEngine.assessAircraftAirworthiness('ac-test-01', {
    aircraft: mockAircraft1,
    obligations: [compliedObligation]
  });
  assert(
    acAllCompliant.status === 'AIRWORTHY' && acAllCompliant.canFly === true && acAllCompliant.isGrounded === false && acAllCompliant.compliedObligations === 1,
    'AIRCRAFT_ALL_COMPLIANT',
    'Aircraft with 100% compliant obligations evaluates to AIRWORTHY'
  );

  // 3.2 1 Overdue Obligation (even with 99 compliant)
  const acOneOverdue = fleetAirworthinessControlEngine.assessAircraftAirworthiness('ac-test-01', {
    aircraft: mockAircraft1,
    obligations: [compliedObligation, overdueObligation],
    operationalRule: FleetAirworthinessControlEngine.AUTHORIZED_RULES.FAR_39_MANDATORY_GROUNDING
  });
  assert(
    acOneOverdue.complianceStatus === 'NON_COMPLIANT' && acOneOverdue.status === 'GROUNDED' && acOneOverdue.canFly === false && acOneOverdue.isGrounded === true && acOneOverdue.decisionSource === 'REGULATORY_REQUIREMENT',
    'AIRCRAFT_ONE_OVERDUE_GROUNDED',
    'Single overdue obligation with FAR 39 rule GROUNDS the aircraft'
  );

  // 3.3 1 Review Required Obligation
  const acOneReview = fleetAirworthinessControlEngine.assessAircraftAirworthiness('ac-test-01', {
    aircraft: mockAircraft1,
    obligations: [compliedObligation, reviewRequiredObligation],
    operationalRule: FleetAirworthinessControlEngine.AUTHORIZED_RULES.CAMO_DISCREPANCY_HOLD
  });
  assert(
    acOneReview.complianceStatus === 'PENDING_REVIEW' && acOneReview.status === 'MAINTENANCE_HOLD' && acOneReview.canFly === false && acOneReview.isGrounded === false && acOneReview.decisionSource === 'APPROVED_CAMO_PROCEDURE',
    'AIRCRAFT_ONE_REVIEW_HOLD',
    'Single review required obligation with CAMO procedure places aircraft on MAINTENANCE_HOLD'
  );

  // 3.4 Mixed States Consolidation
  const acMixed = fleetAirworthinessControlEngine.assessAircraftAirworthiness('ac-test-01', {
    aircraft: mockAircraft1,
    obligations: [compliedObligation, dueSoonObligation, reviewRequiredObligation, overdueObligation, notApplicableObligation],
    operationalRule: FleetAirworthinessControlEngine.AUTHORIZED_RULES.FAR_39_MANDATORY_GROUNDING
  });
  assert(
    acMixed.status === 'GROUNDED' && acMixed.canFly === false && acMixed.totalObligations === 5,
    'AIRCRAFT_MIXED_STATES_GROUNDED',
    'Mixed obligations correctly resolve to the highest severity (GROUNDED) under FAR 39 rule'
  );

  // 3.5 Only Not Applicable / Superseded
  const acOnlyNA = fleetAirworthinessControlEngine.assessAircraftAirworthiness('ac-test-01', {
    aircraft: mockAircraft1,
    obligations: [notApplicableObligation, supersededObligation]
  });
  assert(
    acOnlyNA.status === 'AIRWORTHY' && acOnlyNA.canFly === true && acOnlyNA.notApplicableObligations === 1 && acOnlyNA.supersededObligations === 1,
    'AIRCRAFT_ONLY_EXCLUDED',
    'Aircraft with only excluded obligations is safely AIRWORTHY'
  );

  // 3.6 Component-level obligation isolation
  const engineObligation: ComplianceObligation = {
    ...overdueObligation,
    id: 'obl-engine-01',
    targetEntityType: 'ENGINE',
    targetEntityId: 'eng-01',
    targetEntity: {
      entityType: 'ENGINE',
      entityId: 'eng-01',
      aircraftId: 'ac-test-01',
      aircraftRegistration: 'PR-TESTA',
      position: 'Engine 1'
    }
  };
  const acComponent1 = fleetAirworthinessControlEngine.assessAircraftAirworthiness('ac-test-01', {
    aircraft: mockAircraft1,
    obligations: [engineObligation],
    operationalRule: FleetAirworthinessControlEngine.AUTHORIZED_RULES.FAR_39_MANDATORY_GROUNDING
  });
  const acComponent2 = fleetAirworthinessControlEngine.assessAircraftAirworthiness('ac-test-02', {
    aircraft: mockAircraft2,
    obligations: [engineObligation],
    operationalRule: FleetAirworthinessControlEngine.AUTHORIZED_RULES.FAR_39_MANDATORY_GROUNDING
  });
  assert(
    acComponent1.status === 'GROUNDED' && acComponent2.status === 'AIRWORTHY',
    'AIRCRAFT_COMPONENT_ISOLATION',
    'Engine obligation correctly attaches to installed aircraft and does NOT leak to other aircraft'
  );

  // =========================================================================
  // GROUP 4: FLEET AIRWORTHINESS & ZERO-DILUTION PRINCIPLE (6 TESTS)
  // =========================================================================
  console.log('\n--- Group 4: Fleet Airworthiness & Zero-Dilution Principle ---');

  const ac2Complied: ComplianceObligation = {
    ...compliedObligation,
    id: 'obl-ac2-complied',
    aircraftId: 'ac-test-02',
    targetEntityId: 'ac-test-02',
    targetEntity: { ...compliedObligation.targetEntity, entityId: 'ac-test-02', aircraftId: 'ac-test-02', aircraftRegistration: 'PR-TESTB' }
  };
  const ac3Complied: ComplianceObligation = {
    ...compliedObligation,
    id: 'obl-ac3-complied',
    aircraftId: 'ac-test-03',
    targetEntityId: 'ac-test-03',
    targetEntity: { ...compliedObligation.targetEntity, entityId: 'ac-test-03', aircraftId: 'ac-test-03', aircraftRegistration: 'PR-TESTC' }
  };

  // 4.1 100% Fully Compliant Fleet
  const fleetAllCompliant = fleetAirworthinessControlEngine.assessFleetAirworthiness({
    aircraftList: [mockAircraft1, mockAircraft2, mockAircraft3],
    obligations: [compliedObligation, ac2Complied, ac3Complied]
  });
  assert(
    fleetAllCompliant.fleetStatus === 'FLEET_COMPLIANT' && fleetAllCompliant.severity === 'INFO' && fleetAllCompliant.fleetAirworthinessRate === 100,
    'FLEET_ALL_COMPLIANT',
    '100% compliant fleet evaluates to FLEET_COMPLIANT'
  );

  // 4.2 1 Grounded Aircraft
  const fleetOneGrounded = fleetAirworthinessControlEngine.assessFleetAirworthiness({
    aircraftList: [mockAircraft1, mockAircraft2, mockAircraft3],
    obligations: [overdueObligation, ac2Complied, ac3Complied],
    operationalRule: FleetAirworthinessControlEngine.AUTHORIZED_RULES.FAR_39_MANDATORY_GROUNDING
  });
  assert(
    fleetOneGrounded.fleetStatus === 'FLEET_CRITICAL_NON_COMPLIANT' && fleetOneGrounded.groundedAircraftCount === 1 && fleetOneGrounded.groundedAircraftRegistrations.includes('PR-TESTA'),
    'FLEET_ONE_GROUNDED_CRITICAL',
    '1 grounded aircraft marks the fleet as FLEET_CRITICAL_NON_COMPLIANT'
  );

  // 4.3 1 Maintenance Hold Aircraft
  const fleetOneHold = fleetAirworthinessControlEngine.assessFleetAirworthiness({
    aircraftList: [mockAircraft1, mockAircraft2, mockAircraft3],
    obligations: [reviewRequiredObligation, ac2Complied, ac3Complied],
    operationalRule: FleetAirworthinessControlEngine.AUTHORIZED_RULES.CAMO_DISCREPANCY_HOLD
  });
  assert(
    fleetOneHold.fleetStatus === 'FLEET_RESTRICTED' && fleetOneHold.maintenanceHoldCount === 1 && fleetOneHold.severity === 'HIGH',
    'FLEET_ONE_HOLD_RESTRICTED',
    '1 aircraft on maintenance hold marks the fleet as FLEET_RESTRICTED'
  );

  // 4.4 Due Soon Warnings only
  const ac2DueSoon: ComplianceObligation = {
    ...dueSoonObligation,
    id: 'obl-ac2-duesoon',
    aircraftId: 'ac-test-02',
    targetEntityId: 'ac-test-02',
    targetEntity: { ...dueSoonObligation.targetEntity, entityId: 'ac-test-02', aircraftId: 'ac-test-02', aircraftRegistration: 'PR-TESTB' }
  };
  const fleetWarnings = fleetAirworthinessControlEngine.assessFleetAirworthiness({
    aircraftList: [mockAircraft1, mockAircraft2],
    obligations: [compliedObligation, ac2DueSoon]
  });
  assert(
    fleetWarnings.fleetStatus === 'FLEET_ATTENTION' && fleetWarnings.severity === 'MEDIUM' && fleetWarnings.airworthyWithWarningsCount === 1,
    'FLEET_WARNINGS_ATTENTION',
    'Fleet with due soon warnings evaluates to FLEET_ATTENTION'
  );

  // 4.5 Zero-Dilution Verification (No masking)
  assert(
    fleetOneGrounded.fleetStatus !== 'FLEET_COMPLIANT' && fleetOneGrounded.fleetAirworthinessRate < 100,
    'FLEET_ZERO_DILUTION_VERIFICATION',
    'Zero-Dilution verified: Grounded aircraft can NEVER be masked by compliant aircraft'
  );

  // 4.6 Authority Breakdown
  assert(
    fleetOneGrounded.authorityBreakdown.FAA.total >= 1,
    'FLEET_AUTHORITY_BREAKDOWN',
    'Fleet breakdown properly categorizes obligations by issuing authority'
  );

  // =========================================================================
  // GROUP 5: AD / REQUIREMENT COMPLIANCE ASSESSMENT (5 TESTS)
  // =========================================================================
  console.log('\n--- Group 5: AD / Requirement Compliance Assessment ---');

  // 5.1 All aircraft compliant for requirement
  const reqAllCompliant = fleetAirworthinessControlEngine.assessRequirement('req-test-ad-01', {
    requirement: mockRequirement1,
    obligations: [compliedObligation, ac2Complied]
  });
  assert(
    reqAllCompliant.status === 'FULLY_COMPLIANT' && reqAllCompliant.complianceRate === 100 && reqAllCompliant.nonCompliantAircraft.length === 0,
    'REQ_ALL_COMPLIANT',
    'Requirement with all obligations met is FULLY_COMPLIANT'
  );

  // 5.2 One problematic aircraft
  const reqOneOverdue = fleetAirworthinessControlEngine.assessRequirement('req-test-ad-01', {
    requirement: mockRequirement1,
    obligations: [overdueObligation, ac2Complied]
  });
  assert(
    reqOneOverdue.status === 'NON_COMPLIANT' && reqOneOverdue.nonCompliantAircraft.includes('PR-TESTA') && reqOneOverdue.isBlocking === true,
    'REQ_ONE_OVERDUE_NON_COMPLIANT',
    'Requirement with 1 overdue obligation is NON_COMPLIANT and blocking'
  );

  // 5.3 Requirement Superseded
  const reqSuperseded = fleetAirworthinessControlEngine.assessRequirement('req-test-ad-01', {
    requirement: mockRequirement1,
    obligations: [supersededObligation]
  });
  assert(
    reqSuperseded.status === 'SUPERSEDED' && reqSuperseded.severity === 'INFO',
    'REQ_SUPERSEDED',
    'Requirement with superseded obligations evaluates to SUPERSEDED'
  );

  // 5.4 Requirement with Terminating Action
  const terminatingObligation: ComplianceObligation = {
    ...compliedObligation,
    id: 'obl-terminating',
    terminatingAction: { hasTerminatingAction: true, isTerminated: true, terminatingParagraph: 'Paragraph (h)', terminationDate: '2025-03-01' }
  };
  const reqTerminating = fleetAirworthinessControlEngine.assessRequirement('req-test-ad-01', {
    requirement: mockRequirement1,
    obligations: [terminatingObligation]
  });
  assert(
    reqTerminating.status === 'FULLY_COMPLIANT' && reqTerminating.isBlocking === false,
    'REQ_TERMINATING_ACTION',
    'Requirement completed via Terminating Action is FULLY_COMPLIANT'
  );

  // 5.5 Multiple requirements isolated properly
  const mockRequirement2: ComplianceRequirement = {
    ...mockRequirement1,
    id: 'req-test-ad-02',
    sourceNumber: '2025-02-02',
    title: 'Elevator Tab Inspection AD'
  };
  const reqIsolated = fleetAirworthinessControlEngine.assessRequirement('req-test-ad-02', {
    requirement: mockRequirement2,
    obligations: [compliedObligation] // this obligation has requirementId: 'req-test-ad-01'
  });
  assert(
    reqIsolated.totalObligations === 0,
    'REQ_CROSS_REQUIREMENT_ISOLATION',
    'Obligations for other requirements do not leak into target requirement'
  );

  // =========================================================================
  // GROUP 6: EVIDENCE & PROBATORY STATUS (6 TESTS)
  // =========================================================================
  console.log('\n--- Group 6: Evidence & Probatory Status ---');

  // 6.1 Valid verified evidence
  const oblValidEv = fleetAirworthinessControlEngine.assessObligation(compliedObligation);
  assert(
    oblValidEv.evidenceSummary.valid === 1 && oblValidEv.evidenceSummary.latestAccomplishmentDate === '2025-03-01',
    'EVIDENCE_VALID_SUMMARY',
    'Valid evidence is correctly summarized and dated'
  );

  // 6.2 Insufficient evidence
  const insufficientObligation: ComplianceObligation = {
    ...baseObligation,
    id: 'obl-insufficient',
    evidence: [
      {
        evidenceId: 'ev-insuf-01',
        evidenceType: 'PILOT_REPORT',
        documentReference: 'LOG-01',
        description: 'Vague logbook entry without inspector signoff',
        recordedAt: new Date().toISOString(),
        recordedBy: 'Pilot Dave',
        verified: false,
        verificationStatus: 'INSUFFICIENT'
      }
    ]
  };
  const oblInsuf = fleetAirworthinessControlEngine.assessObligation(insufficientObligation);
  assert(
    oblInsuf.evidenceSummary.insufficient === 1,
    'EVIDENCE_INSUFFICIENT_COUNT',
    'Insufficient evidence is counted under evidenceSummary.insufficient'
  );

  // 6.3 Invalid evidence
  const invalidObligation: ComplianceObligation = {
    ...baseObligation,
    id: 'obl-invalid',
    evidence: [
      {
        evidenceId: 'ev-inv-01',
        evidenceType: 'FORM_8130',
        documentReference: 'F8130-99',
        description: 'Forged Form 8130',
        recordedAt: new Date().toISOString(),
        recordedBy: 'Unknown',
        verified: false,
        verificationStatus: 'INVALID'
      }
    ]
  };
  const oblInv = fleetAirworthinessControlEngine.assessObligation(invalidObligation);
  assert(
    oblInv.evidenceSummary.revoked === 1,
    'EVIDENCE_INVALID_COUNT',
    'Invalid evidence is counted under evidenceSummary.revoked'
  );

  // 6.4 Revoked evidence on COMPLIED obligation (Adversarial test)
  const revokedOnComplied: ComplianceObligation = {
    ...compliedObligation,
    id: 'obl-revoked-complied',
    evidence: [
      {
        ...validEvidence,
        verificationStatus: 'REVOKED',
        notes: 'Certificate of release subsequently revoked by QA manager'
      }
    ]
  };
  const oblRevComplied = fleetAirworthinessControlEngine.assessObligation(revokedOnComplied);
  assert(
    oblRevComplied.isAirworthy === false && oblRevComplied.severity === 'CRITICAL' && oblRevComplied.isBlocking === true && oblRevComplied.structuredReasonCodes.includes('REVOKED_EVIDENCE_CONFLICT'),
    'EVIDENCE_REVOKED_ON_COMPLIED_BLOCKS',
    'Revoked evidence sustaining a COMPLIED status immediately blocks airworthiness with CRITICAL severity'
  );

  // 6.5 Attached without verification (Evidence Attached != Compliance)
  const unverifiedOnComplied: ComplianceObligation = {
    ...compliedObligation,
    id: 'obl-unverified-complied',
    evidence: [
      {
        ...validEvidence,
        verified: false,
        verificationStatus: 'REVIEW_REQUIRED'
      }
    ]
  };
  const oblUnverified = fleetAirworthinessControlEngine.assessObligation(unverifiedOnComplied);
  assert(
    oblUnverified.isAirworthy === false && oblUnverified.severity === 'CRITICAL' && oblUnverified.isBlocking === true && oblUnverified.structuredReasonCodes.includes('UNVERIFIED_EVIDENCE_ATTACHED'),
    'EVIDENCE_UNVERIFIED_DOES_NOT_SATISFY',
    'Unverified attached evidence cannot sustain COMPLIED status'
  );

  // 6.6 Missing evidence on COMPLIED
  const emptyEvidenceOnComplied: ComplianceObligation = {
    ...compliedObligation,
    id: 'obl-empty-complied',
    evidence: []
  };
  const oblEmpty = fleetAirworthinessControlEngine.assessObligation(emptyEvidenceOnComplied);
  assert(
    oblEmpty.isAirworthy === false && oblEmpty.severity === 'CRITICAL' && oblEmpty.isBlocking === true && oblEmpty.structuredReasonCodes.includes('MISSING_EVIDENCE_FOR_COMPLIANCE'),
    'EVIDENCE_MISSING_ON_COMPLIED_BLOCKS',
    'COMPLIED obligation with 0 evidence attached fails closed to CRITICAL unairworthy'
  );

  // =========================================================================
  // GROUP 7: TEMPORAL & RECURRENCE RULES (5 TESTS)
  // =========================================================================
  console.log('\n--- Group 7: Temporal & Recurrence Rules ---');

  // 7.1 Calendar Days due threshold
  assert(
    oblAss3.remainingDays === 12 && oblAss3.controllingLimit === 'CALENDAR_DAYS',
    'TEMPORAL_CALENDAR_DAYS',
    'Calendar days threshold is correctly reported in assessment'
  );

  // 7.2 Flight Hours (FH) due threshold
  const fhObligation: ComplianceObligation = {
    ...baseObligation,
    id: 'obl-fh',
    temporalCounters: {
      ...baseObligation.temporalCounters!,
      controllingLimit: 'FLIGHT_HOURS',
      remainingFH: 45
    }
  };
  const oblFh = fleetAirworthinessControlEngine.assessObligation(fhObligation);
  assert(
    oblFh.remainingFH === 45 && oblFh.controllingLimit === 'FLIGHT_HOURS',
    'TEMPORAL_FLIGHT_HOURS',
    'Flight Hours threshold is correctly preserved'
  );

  // 7.3 Flight Cycles (FC) due threshold
  const fcObligation: ComplianceObligation = {
    ...baseObligation,
    id: 'obl-fc',
    temporalCounters: {
      ...baseObligation.temporalCounters!,
      controllingLimit: 'FLIGHT_CYCLES',
      remainingFC: 18
    }
  };
  const oblFc = fleetAirworthinessControlEngine.assessObligation(fcObligation);
  assert(
    oblFc.remainingFC === 18 && oblFc.controllingLimit === 'FLIGHT_CYCLES',
    'TEMPORAL_FLIGHT_CYCLES',
    'Flight Cycles threshold is correctly preserved'
  );

  // 7.4 Controlling limit identification on aircraft
  const acControlling = fleetAirworthinessControlEngine.assessAircraftAirworthiness('ac-test-01', {
    aircraft: mockAircraft1,
    obligations: [dueSoonObligation, fhObligation, fcObligation]
  });
  assert(
    acControlling.controllingDeadlines.daysRemaining === 12 && acControlling.controllingDeadlines.fhRemaining === 45 && acControlling.controllingDeadlines.fcRemaining === 18,
    'TEMPORAL_AIRCRAFT_CONTROLLING_LIMITS',
    'Aircraft controlling limits aggregate all earliest thresholds across parameters'
  );

  // 7.5 Recurrence next cycle open
  const nextCycleObligation: ComplianceObligation = {
    ...baseObligation,
    id: 'obl-next-cycle',
    status: 'NEXT_CYCLE_OPEN',
    temporalCounters: {
      ...baseObligation.temporalCounters!,
      cycleCount: 2,
      nextDueDate: '2025-08-01',
      nextDueFH: 14000
    }
  };
  const oblNextCycle = fleetAirworthinessControlEngine.assessObligation(nextCycleObligation);
  assert(
    oblNextCycle.status === 'NEXT_CYCLE_OPEN' && oblNextCycle.severity === 'MEDIUM' && oblNextCycle.structuredReasonCodes.includes('REPETITIVE_CYCLE_ACTIVE'),
    'TEMPORAL_RECURRENCE_NEXT_CYCLE',
    'Repetitive next cycle open evaluates to active recurring monitoring with MEDIUM severity'
  );

  // =========================================================================
  // GROUP 8: ADVERSARIAL & DATA INTEGRITY (6 TESTS)
  // =========================================================================
  console.log('\n--- Group 8: Adversarial & Data Integrity ---');

  // 8.1 Entity Mismatch (OBL targeting AC-01 does not leak to AC-02)
  const acAssessmentAc2 = fleetAirworthinessControlEngine.assessAircraftAirworthiness('ac-test-02', {
    aircraft: mockAircraft2,
    obligations: [overdueObligation] // target is ac-test-01
  });
  assert(
    acAssessmentAc2.totalObligations === 0 && acAssessmentAc2.status === 'AIRWORTHY',
    'ADVERSARIAL_NO_CROSS_AIRCRAFT_LEAKAGE',
    'Obligation for aircraft 1 does not contaminate aircraft 2 evaluation'
  );

  // 8.2 Missing Entity Handling
  let missingAcError = false;
  try {
    fleetAirworthinessControlEngine.assessAircraftAirworthiness('non-existent-ac-id', { obligations: [] });
  } catch (err: any) {
    missingAcError = err.message.includes('Aircraft not found');
  }
  assert(
    missingAcError === true,
    'ADVERSARIAL_MISSING_AIRCRAFT_REJECTED',
    'Evaluating non-existent aircraft safely throws explicit descriptive error'
  );

  // 8.3 Missing Counters Defaults Safely
  const missingCountersObligation: ComplianceObligation = {
    ...baseObligation,
    id: 'obl-no-counters',
    temporalCounters: undefined
  };
  const oblNoCounters = fleetAirworthinessControlEngine.assessObligation(missingCountersObligation);
  assert(
    oblNoCounters.status === 'OPEN' && oblNoCounters.remainingDays === undefined,
    'ADVERSARIAL_MISSING_COUNTERS_SAFE',
    'Obligation without temporal counters is evaluated safely without crashing'
  );

  // 8.4 Counter Rollback / Extreme Values
  const rollbackObligation: ComplianceObligation = {
    ...baseObligation,
    id: 'obl-rollback',
    temporalCounters: {
      ...baseObligation.temporalCounters!,
      remainingDays: -99999,
      isOverdue: true
    }
  };
  const oblRollback = fleetAirworthinessControlEngine.assessObligation(rollbackObligation);
  assert(
    oblRollback.isBlocking === true && oblRollback.severity === 'CRITICAL',
    'ADVERSARIAL_COUNTER_ROLLBACK_CRITICAL',
    'Extreme negative counters safely trigger CRITICAL blocking'
  );

  // 8.5 Malicious Status Tampering in Payload Detected
  const tamperedAssessment = JSON.parse(JSON.stringify(fleetOneGrounded));
  tamperedAssessment.fleetStatus = 'FLEET_COMPLIANT'; // Unauthorized tamper
  tamperedAssessment.groundedAircraftCount = 0;
  const isTamperedValid = fleetAirworthinessControlEngine.verifyAssessmentIntegrity(tamperedAssessment);
  assert(
    isTamperedValid === false,
    'ADVERSARIAL_PAYLOAD_TAMPERING_DETECTED',
    'Cryptographic SHA-256 hash immediately detects client-side status tampering'
  );

  // 8.6 Inconsistent Status / Payload Integrity
  const tamperedObligationAssessment = JSON.parse(JSON.stringify(oblAss1));
  tamperedObligationAssessment.isAirworthy = true; // Tampered from false to true
  const isOblTamperedValid = fleetAirworthinessControlEngine.verifyAssessmentIntegrity(tamperedObligationAssessment);
  assert(
    isOblTamperedValid === false,
    'ADVERSARIAL_OBLIGATION_TAMPERING_DETECTED',
    'Obligation-level tampering also fails cryptographic integrity verification'
  );

  // =========================================================================
  // GROUP 9: IDEMPOTENCY & AUDIT TRAIL (3 TESTS)
  // =========================================================================
  console.log('\n--- Group 9: Idempotency & Audit Trail ---');

  // 9.1 Idempotent Execution: 2 runs on identical data yield identical hash
  const run1 = fleetAirworthinessControlEngine.assessFleetAirworthiness({
    aircraftList: [mockAircraft1],
    obligations: [overdueObligation]
  });
  const run2 = fleetAirworthinessControlEngine.assessFleetAirworthiness({
    aircraftList: [mockAircraft1],
    obligations: [overdueObligation]
  });
  assert(
    run1.fleetStatus === run2.fleetStatus && run1.auditHash === run2.auditHash,
    'IDEMPOTENCY_IDENTICAL_HASHES',
    'Two successive executions on identical inputs yield 100% identical audit hashes'
  );

  // 9.2 Authentic Assessment Passes Integrity Check
  const isAuthValid = fleetAirworthinessControlEngine.verifyAssessmentIntegrity(fleetAllCompliant);
  assert(
    isAuthValid === true,
    'AUDIT_AUTHENTIC_PASSES',
    'Unaltered authentic evaluation result passes cryptographic integrity verification'
  );

  // 9.3 Snapshot Generation
  const snapshot = fleetAirworthinessControlEngine.generateAirworthinessSnapshot('Phase 6.4 Formal Airworthiness Baseline');
  assert(
    snapshot.snapshotId.startsWith('snap-') && snapshot.assessment.auditHash.length === 64,
    'AUDIT_SNAPSHOT_GENERATION',
    `Snapshot generated with ID: ${snapshot.snapshotId} and 64-char SHA-256 audit hash`
  );

  // =========================================================================
  // GROUP 10: ARCHITECTURAL DECOUPLING & OPERATIONAL SAFETY (15 TESTS)
  // =========================================================================
  console.log('\n--- Group 10: Architectural Decoupling & Operational Safety (Mandatory 15 Tests) ---');

  // 10.1 SEC_01: OVERDUE obligation without rule MUST NOT ground automatically; yields NOT_DETERMINED
  const acUnruledOverdue = fleetAirworthinessControlEngine.assessAircraftAirworthiness('ac-test-01', {
    aircraft: mockAircraft1,
    obligations: [overdueObligation]
    // no operationalRule provided
  });
  assert(
    acUnruledOverdue.complianceStatus === 'NON_COMPLIANT' &&
    acUnruledOverdue.airworthinessStatus === 'NOT_DETERMINED' &&
    acUnruledOverdue.canFly === null &&
    acUnruledOverdue.isGrounded === false &&
    acUnruledOverdue.decisionSource === 'NOT_DETERMINED' &&
    acUnruledOverdue.decisionRule === 'NO_AUTHORIZED_OPERATIONAL_RULE',
    'SEC_01_OVERDUE_WITHOUT_RULE_NOT_DETERMINED',
    'OVERDUE obligation without authorized rule yields NOT_DETERMINED without automatic grounding'
  );

  // 10.2 SEC_02: OVERDUE with FAR 39 authorized rule yields GROUNDED with full regulatory provenance
  const acRuledOverdueFar39 = fleetAirworthinessControlEngine.assessAircraftAirworthiness('ac-test-01', {
    aircraft: mockAircraft1,
    obligations: [overdueObligation],
    operationalRule: FleetAirworthinessControlEngine.AUTHORIZED_RULES.FAR_39_MANDATORY_GROUNDING
  });
  assert(
    acRuledOverdueFar39.complianceStatus === 'NON_COMPLIANT' &&
    acRuledOverdueFar39.airworthinessStatus === 'GROUNDED' &&
    acRuledOverdueFar39.canFly === false &&
    acRuledOverdueFar39.isGrounded === true &&
    acRuledOverdueFar39.decisionSource === 'REGULATORY_REQUIREMENT' &&
    acRuledOverdueFar39.decisionRule === 'FAR_39_MANDATORY_GROUNDING' &&
    acRuledOverdueFar39.sourceReference === '14 CFR § 39.7 / RBAC 39',
    'SEC_02_OVERDUE_FAR39_MANDATORY_GROUNDING',
    'OVERDUE with FAR 39 rule yields GROUNDED with regulatory provenance 14 CFR § 39.7 / RBAC 39'
  );

  // 10.3 SEC_03: REVIEW_REQUIRED obligation without rule MUST NOT hold automatically; yields NOT_DETERMINED
  const acUnruledReview = fleetAirworthinessControlEngine.assessAircraftAirworthiness('ac-test-01', {
    aircraft: mockAircraft1,
    obligations: [reviewRequiredObligation]
    // no operationalRule provided
  });
  assert(
    acUnruledReview.complianceStatus === 'PENDING_REVIEW' &&
    acUnruledReview.airworthinessStatus === 'NOT_DETERMINED' &&
    acUnruledReview.canFly === null &&
    acUnruledReview.isGrounded === false &&
    acUnruledReview.decisionSource === 'NOT_DETERMINED',
    'SEC_03_REVIEW_REQUIRED_WITHOUT_RULE_NOT_DETERMINED',
    'REVIEW_REQUIRED without authorized rule yields NOT_DETERMINED without automatic hold'
  );

  // 10.4 SEC_04: REVIEW_REQUIRED with CAMO SOP rule yields MAINTENANCE_HOLD with approved procedure provenance
  const acRuledCamoHold = fleetAirworthinessControlEngine.assessAircraftAirworthiness('ac-test-01', {
    aircraft: mockAircraft1,
    obligations: [reviewRequiredObligation],
    operationalRule: FleetAirworthinessControlEngine.AUTHORIZED_RULES.CAMO_DISCREPANCY_HOLD
  });
  assert(
    acRuledCamoHold.complianceStatus === 'PENDING_REVIEW' &&
    acRuledCamoHold.airworthinessStatus === 'MAINTENANCE_HOLD' &&
    acRuledCamoHold.canFly === false &&
    acRuledCamoHold.isGrounded === false &&
    acRuledCamoHold.decisionSource === 'APPROVED_CAMO_PROCEDURE' &&
    acRuledCamoHold.decisionRule === 'CAMO_SOP_04_DISCREPANCY_HOLD' &&
    acRuledCamoHold.sourceReference === 'CAMO-CMM-PROC-4.3',
    'SEC_04_REVIEW_REQUIRED_CAMO_PROCEDURE_HOLD',
    'REVIEW_REQUIRED with CAMO procedure yields MAINTENANCE_HOLD with CAMO-CMM-PROC-4.3 reference'
  );

  // 10.5 SEC_05: REVIEW_REQUIRED with Chief Engineer human disposition
  const acRuledEngineerDisposition = fleetAirworthinessControlEngine.assessAircraftAirworthiness('ac-test-01', {
    aircraft: mockAircraft1,
    obligations: [reviewRequiredObligation],
    operationalRule: FleetAirworthinessControlEngine.AUTHORIZED_RULES.HUMAN_CHIEF_ENGINEER_DISPOSITION
  });
  assert(
    acRuledEngineerDisposition.airworthinessStatus === 'MAINTENANCE_HOLD' &&
    acRuledEngineerDisposition.decisionSource === 'HUMAN_REVIEW_DECISION' &&
    acRuledEngineerDisposition.decisionRule === 'CHIEF_ENGINEER_FORMAL_DISPOSITION' &&
    acRuledEngineerDisposition.sourceReference === 'ENG-DISP-2026-088',
    'SEC_05_REVIEW_REQUIRED_CHIEF_ENGINEER_DISPOSITION',
    'Formal Chief Engineer disposition yields MAINTENANCE_HOLD with HUMAN_REVIEW_DECISION'
  );

  // 10.6 SEC_06: Authority emergency directive rule
  const acRuledAuthorityEad = fleetAirworthinessControlEngine.assessAircraftAirworthiness('ac-test-01', {
    aircraft: mockAircraft1,
    obligations: [overdueObligation],
    operationalRule: FleetAirworthinessControlEngine.AUTHORIZED_RULES.AUTHORITY_DIRECTIVE_GROUNDING
  });
  assert(
    acRuledAuthorityEad.airworthinessStatus === 'GROUNDED' &&
    acRuledAuthorityEad.decisionSource === 'AUTHORITY_DECISION' &&
    acRuledAuthorityEad.sourceReference === 'EAD-2026-01-EXP',
    'SEC_06_AUTHORITY_DIRECTIVE_GROUNDING',
    'Emergency AD decision yields GROUNDED with AUTHORITY_DECISION source'
  );

  // 10.7 SEC_07: Operator FOM restriction rule
  const acRuledFomOps = fleetAirworthinessControlEngine.assessAircraftAirworthiness('ac-test-01', {
    aircraft: mockAircraft1,
    obligations: [reviewRequiredObligation],
    operationalRule: FleetAirworthinessControlEngine.AUTHORIZED_RULES.OPERATOR_FOM_RESTRICTION
  });
  assert(
    acRuledFomOps.airworthinessStatus === 'MAINTENANCE_HOLD' &&
    acRuledFomOps.decisionSource === 'APPROVED_OPERATOR_RULE' &&
    acRuledFomOps.sourceReference === 'FOM-REV-12-CH8',
    'SEC_07_OPERATOR_FOM_RESTRICTION',
    'Approved FOM manual limitation yields MAINTENANCE_HOLD with APPROVED_OPERATOR_RULE source'
  );

  // 10.8 SEC_08: Explainability & Provenance invariant: all decision fields populated
  const requiredProvenanceFields = ['airworthinessStatus', 'canFly', 'decisionSource', 'decisionRule', 'decisionReason', 'sourceReference'];
  const hasAllProvenance1 = requiredProvenanceFields.every(field => (acRuledOverdueFar39 as any)[field] !== undefined);
  const hasAllProvenance2 = requiredProvenanceFields.every(field => (acUnruledOverdue as any)[field] !== undefined);
  assert(
    hasAllProvenance1 && hasAllProvenance2,
    'SEC_08_EXPLAINABILITY_PROVENANCE_FIELDS',
    'All required explainability fields (airworthinessStatus, canFly, decisionSource, decisionRule, decisionReason, sourceReference) are fully populated'
  );

  // 10.9 SEC_09: Zero-Dilution intact: Unruled OVERDUE is NOT masked at fleet level
  const fleetUnruledOverdue = fleetAirworthinessControlEngine.assessFleetAirworthiness({
    aircraftList: [mockAircraft1, mockAircraft2, mockAircraft3],
    obligations: [overdueObligation, ac2Complied, ac3Complied]
    // no operationalRule
  });
  assert(
    fleetUnruledOverdue.fleetStatus === 'FLEET_CRITICAL_NON_COMPLIANT' &&
    fleetUnruledOverdue.fleetComplianceStatus === 'FLEET_NON_COMPLIANT' &&
    fleetUnruledOverdue.nonCompliantAircraftCount === 1 &&
    fleetUnruledOverdue.fleetOverdueObligations === 1 &&
    fleetUnruledOverdue.severity === 'CRITICAL',
    'SEC_09_ZERO_DILUTION_UNRULED_FLEET',
    'Zero-Dilution strictly enforced: unruled overdue obligation marks fleet as FLEET_CRITICAL_NON_COMPLIANT'
  );

  // 10.10 SEC_10: Zero-Dilution with authorized rule: Grounded aircraft count and registrations
  const fleetRuledGrounded = fleetAirworthinessControlEngine.assessFleetAirworthiness({
    aircraftList: [mockAircraft1, mockAircraft2, mockAircraft3],
    obligations: [overdueObligation, ac2Complied, ac3Complied],
    operationalRule: FleetAirworthinessControlEngine.AUTHORIZED_RULES.FAR_39_MANDATORY_GROUNDING
  });
  assert(
    fleetRuledGrounded.fleetStatus === 'FLEET_CRITICAL_NON_COMPLIANT' &&
    fleetRuledGrounded.groundedAircraftCount === 1 &&
    fleetRuledGrounded.groundedAircraftRegistrations.includes('PR-TESTA') &&
    fleetRuledGrounded.fleetAirworthinessRate < 100,
    'SEC_10_ZERO_DILUTION_RULED_GROUNDED_FLEET',
    'Zero-Dilution with FAR 39 rule reflects 1 grounded aircraft without masking'
  );

  // 10.11 SEC_11: Compliant baseline provenance
  const acCompliantExplained = fleetAirworthinessControlEngine.assessAircraftAirworthiness('ac-test-01', {
    aircraft: mockAircraft1,
    obligations: [compliedObligation]
  });
  assert(
    acCompliantExplained.decisionSource === 'APPROVED_CAMO_PROCEDURE' &&
    acCompliantExplained.decisionRule === 'COMPLIANT_BASELINE_AIRWORTHY' &&
    acCompliantExplained.canFly === true &&
    acCompliantExplained.isGrounded === false,
    'SEC_11_COMPLIANT_BASELINE_EXPLAINABILITY',
    'Fully compliant aircraft explains operational basis via COMPLIANT_BASELINE_AIRWORTHY'
  );

  // 10.12 SEC_12: Preventive warning provenance
  const acDueSoonExplained = fleetAirworthinessControlEngine.assessAircraftAirworthiness('ac-test-01', {
    aircraft: mockAircraft1,
    obligations: [compliedObligation, dueSoonObligation]
  });
  assert(
    acDueSoonExplained.decisionSource === 'APPROVED_CAMO_PROCEDURE' &&
    acDueSoonExplained.decisionRule === 'PREVENTIVE_WARNING_MONITORING' &&
    acDueSoonExplained.canFly === true &&
    acDueSoonExplained.isGrounded === false,
    'SEC_12_PREVENTIVE_WARNING_EXPLAINABILITY',
    'Preventive warning explains operational basis via PREVENTIVE_WARNING_MONITORING'
  );

  // 10.13 SEC_13: Fleet assessment separates regulatory compliance status from operational status
  assert(
    fleetUnruledOverdue.fleetComplianceStatus !== undefined &&
    fleetUnruledOverdue.fleetStatus !== undefined &&
    typeof fleetUnruledOverdue.fleetComplianceStatus === 'string',
    'SEC_13_FLEET_SEPARATED_COMPLIANCE_STATUS',
    'FleetAirworthinessAssessment explicitly exposes distinct fleetComplianceStatus and fleetStatus'
  );

  // 10.14 SEC_14: Authorized rules catalog retrieval helper
  const far39Lookup = fleetAirworthinessControlEngine.getAuthorizedRule('FAR_39_MANDATORY_GROUNDING');
  const camoLookup = fleetAirworthinessControlEngine.getAuthorizedRule('rule-camo-discrepancy-hold');
  assert(
    far39Lookup?.ruleName === 'FAR_39_MANDATORY_GROUNDING' &&
    camoLookup?.source === 'APPROVED_CAMO_PROCEDURE' &&
    camoLookup?.ruleId === 'rule-camo-discrepancy-hold',
    'SEC_14_AUTHORIZED_RULES_CATALOG_LOOKUP',
    'Engine catalog lookup retrieves pre-authorized rules by ruleName and by ruleId'
  );

  // 10.15 SEC_15: Cryptographic audit hash binds operational decision provenance
  const authenticRuledHash = acRuledOverdueFar39.auditHash;
  const tamperedDecision = JSON.parse(JSON.stringify(acRuledOverdueFar39));
  tamperedDecision.decisionSource = 'HUMAN_REVIEW_DECISION'; // Unauthorized modification of provenance
  const isDecisionTamperedValid = fleetAirworthinessControlEngine.verifyAssessmentIntegrity(tamperedDecision);
  assert(
    isDecisionTamperedValid === false && typeof authenticRuledHash === 'string' && authenticRuledHash.length === 64,
    'SEC_15_INTEGRITY_HASH_INCLUDES_DECISION_PROVENANCE',
    'Tampering with decision provenance fields immediately invalidates SHA-256 audit hash'
  );

  console.log('\n=============================================================');
  console.log(`  PHASE 6.4 AIRWORTHINESS ENGINE TEST RESULTS: ${passed}/${passed + failed} PASSED`);
  if (failed === 0) {
    console.log(`  🎉 ALL ${passed} DETERMINISTIC TESTS PASSED WITH 0 ERRORS (51 BASELINE + 15 ARCHITECTURAL SAFETY)`);
  } else {
    console.error(`  ⚠️ ${failed} TESTS FAILED`);
  }
  console.log('=============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('testPhase64AirworthinessEngine.ts')) {
  runPhase64AirworthinessEngineTests().catch(err => {
    console.error('Fatal error running Phase 6.4 test suite:', err);
    process.exit(1);
  });
}
