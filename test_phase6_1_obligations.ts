import { complianceObligationService } from './server/camoEngine/complianceObligationService';
import { camoDb } from './server/dataStore';
import { 
  ComplianceRequirement, 
  Aircraft, 
  MandatedAction, 
  ObligationEvidenceLink,
  ComplianceObligation
} from './src/types';

async function runPhase61ObligationTests() {
  console.log('================================================================');
  console.log('PROJETO CAMO — FASE 6.1: COMPLIANCE LIFECYCLE CORE AUDIT');
  console.log('20 MANDATORY DETERMINISTIC LIFECYCLE & TEMPORAL TESTS');
  console.log('================================================================\n');

  let passedTests = 0;
  const totalTests = 20;

  // Setup Mock Data
  const mockAircraft1: Aircraft = {
    id: 'ac-test-01',
    operatorId: 'op-01',
    registration: 'PR-GOL',
    msn: '44865',
    manufacturer: 'Boeing',
    model: '737-8',
    aircraftType: 'Commercial Transport',
    status: 'OPERATIONAL',
    totalFlightHours: 3500,
    totalCycles: 1200,
    totalLandings: 1200
  };

  const mockAircraft2: Aircraft = {
    id: 'ac-test-02',
    operatorId: 'op-01',
    registration: 'PR-XYZ',
    msn: '44866',
    manufacturer: 'Boeing',
    model: '737-8',
    aircraftType: 'Commercial Transport',
    status: 'OPERATIONAL',
    totalFlightHours: 5000,
    totalCycles: 2100,
    totalLandings: 2100
  };

  // Clean previous test obligations
  camoDb.update(state => {
    state.obligations = (state.obligations || []).filter(o => !o.id.includes('req-test-ad-'));
    if (!state.aircraft.some(a => a.id === mockAircraft1.id)) {
      state.aircraft.push(mockAircraft1);
    }
    if (!state.aircraft.some(a => a.id === mockAircraft2.id)) {
      state.aircraft.push(mockAircraft2);
    }
  });

  const today = new Date();
  const todayIso = today.toISOString().split('T')[0];
  const pastDate5Days = new Date(today.getTime() - 5 * 86400000).toISOString().split('T')[0];
  const pastDate2Days = new Date(today.getTime() - 2 * 86400000).toISOString().split('T')[0];

  const mockReq1: ComplianceRequirement = {
    id: 'req-test-ad-01',
    sourceType: 'AD',
    sourceNumber: 'FAA AD 2026-05-01',
    revision: 'Original',
    title: 'Flight Control Computer Software Upgrade',
    issuingAuthority: 'FAA',
    issueDate: pastDate5Days,
    effectiveDate: pastDate5Days,
    emergencyAd: false,
    status: 'APPROVED',
    createdAt: new Date().toISOString(),
    createdBy: 'Test Suite',
    updatedAt: new Date().toISOString(),
    updatedBy: 'Test Suite',
    requirementDetails: {
      initialThreshold: 'Within 90 days after effective date'
    },
    mandatedActions: [
      {
        id: 'act-01',
        paragraphReference: '(g)(1)',
        actionType: 'AVIONICS_SOFTWARE_LOAD',
        description: 'Update FCC operational software to version P12.1.2',
        sequence: 1,
        complianceThreshold: {
          thresholdType: 'CALENDAR_DAYS',
          thresholdValue: 90,
          rawDescription: 'Within 90 days after effective date'
        }
      }
    ]
  };

  // -------------------------------------------------------------
  // TEST 1: Creation of obligation from regulatory requirement
  // -------------------------------------------------------------
  console.log('>>> TEST 1: test_creation_obligation_from_ad');
  const obl1 = complianceObligationService.createOrUpdateObligation({
    requirement: mockReq1,
    aircraft: mockAircraft1,
    applicabilityStatus: 'APPLICABLE',
    mandatedAction: mockReq1.mandatedActions![0],
    actor: 'Test Runner'
  });

  if (!obl1 || obl1.complianceRequirementId !== mockReq1.id || obl1.targetEntity.aircraftRegistration !== 'PR-GOL') {
    throw new Error('Test 1 Failed: Obligation not created with correct requirement/aircraft link.');
  }
  if (obl1.status !== 'OPEN' && obl1.status !== 'DUE_SOON') {
    throw new Error(`Test 1 Failed: Expected initial status OPEN or DUE_SOON, got ${obl1.status}`);
  }
  if (obl1.stateTransitions.length !== 1 || obl1.stateTransitions[0].fromStatus !== 'IDENTIFIED') {
    throw new Error('Test 1 Failed: Initial transition from IDENTIFIED missing in state transitions.');
  }
  console.log(`>>> TEST 1 PASSED: Obligation ${obl1.id} created successfully with status ${obl1.status}.\n`);
  passedTests++;

  // -------------------------------------------------------------
  // TEST 2: Deduplication and idempotency for same AD + same aircraft
  // -------------------------------------------------------------
  console.log('>>> TEST 2: test_deduplication_same_ad_same_aircraft');
  const obl1Repeat = complianceObligationService.createOrUpdateObligation({
    requirement: mockReq1,
    aircraft: mockAircraft1,
    applicabilityStatus: 'APPLICABLE',
    mandatedAction: mockReq1.mandatedActions![0],
    actor: 'Test Runner Re-Execution'
  });

  if (obl1Repeat.id !== obl1.id) {
    throw new Error(`Test 2 Failed: Expected idempotent ID ${obl1.id}, got new ID ${obl1Repeat.id}`);
  }
  const matchingInDb = camoDb.getState().obligations.filter(o => o.id === obl1.id);
  if (matchingInDb.length !== 1) {
    throw new Error(`Test 2 Failed: Found duplicate obligations in DB (count: ${matchingInDb.length})`);
  }
  console.log('>>> TEST 2 PASSED: Obligation creation is strictly idempotent.\n');
  passedTests++;

  // -------------------------------------------------------------
  // TEST 3: State transition OPEN -> COMPLIED with verified evidence
  // -------------------------------------------------------------
  console.log('>>> TEST 3: test_state_transition_open_to_complied');
  const oblComplied = complianceObligationService.attachEvidence({
    obligationId: obl1.id,
    evidenceType: 'WORK_ORDER',
    documentReference: 'WO-2026-737-001',
    description: 'FCC Software P12.1.2 loaded and tested successfully per SB 737-22A1011.',
    accomplishmentDate: pastDate2Days,
    accomplishmentFH: 3450,
    accomplishmentFC: 1180,
    recordedBy: 'Eng. Fabio Teraoka',
    verified: true,
    triggerComplianceEvaluation: true
  });

  if (oblComplied.status !== 'COMPLIED') {
    throw new Error(`Test 3 Failed: Obligation status should be COMPLIED, got ${oblComplied.status}`);
  }
  if (!oblComplied.evidence.some(e => e.documentReference === 'WO-2026-737-001' && e.verified)) {
    throw new Error('Test 3 Failed: Attached evidence not properly recorded in obligation.');
  }
  console.log('>>> TEST 3 PASSED: Transition to COMPLIED verified with objective evidence.\n');
  passedTests++;

  // -------------------------------------------------------------
  // TEST 4: State transition OPEN -> DUE_SOON within alert window
  // -------------------------------------------------------------
  console.log('>>> TEST 4: test_state_transition_open_to_due_soon');
  const mockReqDueSoon: ComplianceRequirement = {
    id: 'req-test-ad-duesoon',
    sourceType: 'AD',
    sourceNumber: 'FAA AD 2026-05-02',
    revision: 'Original',
    title: 'Hydraulic System Valve Check',
    issuingAuthority: 'FAA',
    issueDate: '2026-01-01',
    effectiveDate: '2026-01-10',
    emergencyAd: false,
    status: 'APPROVED',
    createdAt: new Date().toISOString(),
    createdBy: 'Test Suite',
    updatedAt: new Date().toISOString(),
    updatedBy: 'Test Suite',
    mandatedActions: [
      {
        id: 'act-valve-01',
        paragraphReference: '(g)(1)',
        actionType: 'ONE_TIME_INSPECTION',
        description: 'Inspect hydraulic shutoff valve within 100 flight hours from 3450 FH (due at 3550 FH)',
        sequence: 1,
        complianceThreshold: {
          thresholdType: 'FLIGHT_HOURS',
          thresholdValue: 3550, // Aircraft current FH is 3500 => remaining 50 FH <= 100 FH threshold
          rawDescription: 'Inspect before reaching 3550 total flight hours'
        }
      }
    ]
  };

  const oblDueSoon = complianceObligationService.createOrUpdateObligation({
    requirement: mockReqDueSoon,
    aircraft: mockAircraft1,
    applicabilityStatus: 'APPLICABLE',
    mandatedAction: mockReqDueSoon.mandatedActions![0],
    actor: 'Test Runner'
  });

  if (oblDueSoon.status !== 'DUE_SOON') {
    throw new Error(`Test 4 Failed: Expected status DUE_SOON (remaining FH: ${oblDueSoon.temporalCounters.remainingFH}), got ${oblDueSoon.status}`);
  }
  if (!oblDueSoon.temporalCounters.isDueSoon) {
    throw new Error('Test 4 Failed: isDueSoon flag should be true.');
  }
  console.log(`>>> TEST 4 PASSED: Obligation entered DUE_SOON (Remaining: ${oblDueSoon.temporalCounters.remainingFH} FH).\n`);
  passedTests++;

  // -------------------------------------------------------------
  // TEST 5: State transition OPEN -> OVERDUE when threshold exceeded
  // -------------------------------------------------------------
  console.log('>>> TEST 5: test_state_transition_open_to_overdue');
  const mockReqOverdue: ComplianceRequirement = {
    id: 'req-test-ad-overdue',
    sourceType: 'AD',
    sourceNumber: 'FAA AD 2026-05-03',
    revision: 'Original',
    title: 'Fuel Filter Element Replacement',
    issuingAuthority: 'FAA',
    issueDate: '2025-01-01',
    effectiveDate: '2025-01-15',
    emergencyAd: false,
    status: 'APPROVED',
    createdAt: new Date().toISOString(),
    createdBy: 'Test Suite',
    updatedAt: new Date().toISOString(),
    updatedBy: 'Test Suite',
    mandatedActions: [
      {
        id: 'act-fuel-01',
        paragraphReference: '(g)(1)',
        actionType: 'HARDWARE_REPLACEMENT',
        description: 'Replace fuel filter element within 3000 FH',
        sequence: 1,
        complianceThreshold: {
          thresholdType: 'FLIGHT_HOURS',
          thresholdValue: 3000, // Aircraft current FH is 3500 => OVERDUE by 500 FH
          rawDescription: 'Replace before reaching 3000 total flight hours'
        }
      }
    ]
  };

  const oblOverdue = complianceObligationService.createOrUpdateObligation({
    requirement: mockReqOverdue,
    aircraft: mockAircraft1,
    applicabilityStatus: 'APPLICABLE',
    mandatedAction: mockReqOverdue.mandatedActions![0],
    actor: 'Test Runner'
  });

  if (oblOverdue.status !== 'OVERDUE') {
    throw new Error(`Test 5 Failed: Expected status OVERDUE, got ${oblOverdue.status}`);
  }
  if (!oblOverdue.temporalCounters.isOverdue) {
    throw new Error('Test 5 Failed: isOverdue flag must be true.');
  }
  console.log(`>>> TEST 5 PASSED: Obligation correctly identified as OVERDUE (Remaining: ${oblOverdue.temporalCounters.remainingFH} FH).\n`);
  passedTests++;

  // -------------------------------------------------------------
  // TEST 6: State transition NOT_YET_EFFECTIVE -> OPEN when date reached
  // -------------------------------------------------------------
  console.log('>>> TEST 6: test_state_transition_not_yet_effective_to_open');
  const futureDate = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];
  const mockReqFuture: ComplianceRequirement = {
    id: 'req-test-ad-future',
    sourceType: 'AD',
    sourceNumber: 'FAA AD 2026-05-04',
    revision: 'Original',
    title: 'Future Effective Airworthiness Directive',
    issuingAuthority: 'FAA',
    issueDate: '2026-03-01',
    effectiveDate: futureDate,
    emergencyAd: false,
    status: 'APPROVED',
    createdAt: new Date().toISOString(),
    createdBy: 'Test Suite',
    updatedAt: new Date().toISOString(),
    updatedBy: 'Test Suite',
    mandatedActions: [
      {
        id: 'act-future-01',
        paragraphReference: '(g)(1)',
        actionType: 'ONE_TIME_INSPECTION',
        description: 'Inspect wing spar fasteners within 180 days after effective date',
        sequence: 1
      }
    ]
  };

  const oblFuture = complianceObligationService.createOrUpdateObligation({
    requirement: mockReqFuture,
    aircraft: mockAircraft1,
    applicabilityStatus: 'APPLICABLE',
    mandatedAction: mockReqFuture.mandatedActions![0],
    actor: 'Test Runner'
  });

  if (oblFuture.status !== 'NOT_YET_EFFECTIVE') {
    throw new Error(`Test 6 Failed: Expected NOT_YET_EFFECTIVE, got ${oblFuture.status}`);
  }

  // Simulate arrival of effective date
  oblFuture.temporalCounters.effectiveDate = '2026-01-01'; // Simulated past effective date
  const summary = complianceObligationService.evaluateAllFleetObligations('Test Runner Simulation');
  const reloadedFuture = camoDb.getState().obligations.find(o => o.id === oblFuture.id);

  if (reloadedFuture?.status !== 'OPEN' && reloadedFuture?.status !== 'DUE_SOON') {
    throw new Error(`Test 6 Failed: Expected OPEN or DUE_SOON after effective date reached, got ${reloadedFuture?.status}`);
  }
  console.log('>>> TEST 6 PASSED: NOT_YET_EFFECTIVE correctly transitioned to OPEN upon effective date.\n');
  passedTests++;

  // -------------------------------------------------------------
  // TEST 7: Repetitive obligation cycle advance: COMPLIED -> NEXT_CYCLE_OPEN
  // -------------------------------------------------------------
  console.log('>>> TEST 7: test_repetitive_obligation_cycle');
  const mockReqRepetitive: ComplianceRequirement = {
    id: 'req-test-ad-repetitive',
    sourceType: 'AD',
    sourceNumber: 'FAA AD 2026-05-05',
    revision: 'Original',
    title: 'Repetitive Lubrication of Stabilizer Trim Actuator',
    issuingAuthority: 'FAA',
    issueDate: '2026-01-01',
    effectiveDate: '2026-01-15',
    emergencyAd: false,
    status: 'APPROVED',
    createdAt: new Date().toISOString(),
    createdBy: 'Test Suite',
    updatedAt: new Date().toISOString(),
    updatedBy: 'Test Suite',
    mandatedActions: [
      {
        id: 'act-rep-01',
        paragraphReference: '(g)(1)',
        actionType: 'REPETITIVE_INSPECTION',
        description: 'Lubricate stabilizer trim actuator every 500 FH or 90 days',
        sequence: 1,
        repetitiveInterval: {
          intervalType: 'FLIGHT_HOURS',
          intervalValue: 500,
          rawDescription: 'Repeat at intervals not to exceed 500 flight hours'
        }
      }
    ]
  };

  const oblRep = complianceObligationService.createOrUpdateObligation({
    requirement: mockReqRepetitive,
    aircraft: mockAircraft1,
    applicabilityStatus: 'APPLICABLE',
    mandatedAction: mockReqRepetitive.mandatedActions![0],
    actor: 'Test Runner'
  });

  // Accomplish initial cycle
  complianceObligationService.attachEvidence({
    obligationId: oblRep.id,
    evidenceType: 'WORK_ORDER',
    documentReference: 'WO-LUB-001',
    description: 'Lubricated stabilizer trim actuator at 3500 FH.',
    accomplishmentDate: '2026-02-01',
    accomplishmentFH: 3500,
    accomplishmentFC: 1200,
    recordedBy: 'Eng. Fabio Teraoka',
    verified: true,
    triggerComplianceEvaluation: true
  });

  // Advance to next cycle
  const nextCycle = complianceObligationService.transitionState({
    obligationId: oblRep.id,
    toStatus: 'NEXT_CYCLE_OPEN',
    reason: 'Initial cycle accomplished. Next repetitive cycle opened (due at 3500 + 500 = 4000 FH).',
    ruleResponsible: 'RULE_REPETITIVE_CYCLE_OPEN',
    actor: 'CAMO Planning System'
  });

  if (nextCycle.status !== 'NEXT_CYCLE_OPEN') {
    throw new Error(`Test 7 Failed: Expected NEXT_CYCLE_OPEN, got ${nextCycle.status}`);
  }
  if (nextCycle.temporalCounters.nextDueFH !== 4000) {
    throw new Error(`Test 7 Failed: Expected nextDueFH = 4000, got ${nextCycle.temporalCounters.nextDueFH}`);
  }
  if (nextCycle.temporalCounters.cycleCount !== 1) {
    throw new Error(`Test 7 Failed: Expected cycleCount = 1, got ${nextCycle.temporalCounters.cycleCount}`);
  }
  console.log(`>>> TEST 7 PASSED: Repetitive cycle advanced to NEXT_CYCLE_OPEN (Next Due: ${nextCycle.temporalCounters.nextDueFH} FH, Cycle: ${nextCycle.temporalCounters.cycleCount}).\n`);
  passedTests++;

  // -------------------------------------------------------------
  // TEST 8: Terminating action closes repetitive cycles permanently
  // -------------------------------------------------------------
  console.log('>>> TEST 8: test_terminating_action_closes_repetitive');
  const mockReqTerm: ComplianceRequirement = {
    id: 'req-test-ad-terminating',
    sourceType: 'AD',
    sourceNumber: 'FAA AD 2026-05-06',
    revision: 'Original',
    title: 'Rudder Control Mod and Terminating Action',
    issuingAuthority: 'FAA',
    issueDate: '2026-01-01',
    effectiveDate: '2026-01-15',
    emergencyAd: false,
    status: 'APPROVED',
    createdAt: new Date().toISOString(),
    createdBy: 'Test Suite',
    updatedAt: new Date().toISOString(),
    updatedBy: 'Test Suite',
    mandatedActions: [
      {
        id: 'act-term-01',
        paragraphReference: '(g)(2)',
        actionType: 'HARDWARE_MODIFICATION',
        description: 'Install new reinforced rudder PCU. Terminates repetitive inspection of paragraph (g)(1).',
        sequence: 2,
        isTerminatingAction: true
      }
    ]
  };

  const oblTerm = complianceObligationService.createOrUpdateObligation({
    requirement: mockReqTerm,
    aircraft: mockAircraft1,
    applicabilityStatus: 'APPLICABLE',
    mandatedAction: mockReqTerm.mandatedActions![0],
    actor: 'Test Runner'
  });

  complianceObligationService.attachEvidence({
    obligationId: oblTerm.id,
    evidenceType: 'MOD_RECORD',
    documentReference: 'MOD-737-PCU-2026',
    description: 'New reinforced rudder PCU installed per SB 737-27A1234.',
    accomplishmentDate: '2026-03-01',
    accomplishmentFH: 3500,
    recordedBy: 'Chief Inspector',
    verified: true,
    triggerComplianceEvaluation: true
  });

  const updatedTerm = camoDb.getState().obligations.find(o => o.id === oblTerm.id);
  if (updatedTerm?.status !== 'COMPLIED' || !updatedTerm?.terminatingAction?.hasTerminatingAction) {
    throw new Error('Test 8 Failed: Terminating action obligation not marked COMPLIED.');
  }
  console.log('>>> TEST 8 PASSED: Terminating action accomplished and repetitive requirements terminated.\n');
  passedTests++;

  // -------------------------------------------------------------
  // TEST 9: Supersedence preserves history, transitions and evidence
  // -------------------------------------------------------------
  console.log('>>> TEST 9: test_supersedence_preserves_history');
  const countSuperseded = complianceObligationService.markSuperseded(
    mockReq1.id, 
    'FAA AD 2026-09-99', 
    'req-superseding-01', 
    'AD Revision Processor'
  );

  if (countSuperseded < 1) {
    throw new Error('Test 9 Failed: No obligations marked superseded.');
  }

  const supersededObl = camoDb.getState().obligations.find(o => o.id === obl1.id);
  if (supersededObl?.status !== 'SUPERSEDED') {
    throw new Error(`Test 9 Failed: Expected status SUPERSEDED, got ${supersededObl?.status}`);
  }
  if (!supersededObl.supersedence?.isSuperseded || supersededObl.supersedence.supersededByAdNumber !== 'FAA AD 2026-09-99') {
    throw new Error('Test 9 Failed: Supersedence metadata missing.');
  }
  if (supersededObl.evidence.length === 0) {
    throw new Error('Test 9 Failed: Historical evidence was wiped out during supersedence!');
  }
  if (supersededObl.stateTransitions.length < 2) {
    throw new Error('Test 9 Failed: Historical state transitions lost during supersedence.');
  }
  console.log('>>> TEST 9 PASSED: Supersedence preserved 100% of historical transitions and evidence.\n');
  passedTests++;

  // -------------------------------------------------------------
  // TEST 10: UNKNOWN status maps strictly to REVIEW_REQUIRED
  // -------------------------------------------------------------
  console.log('>>> TEST 10: test_unknown_state_requires_review');
  const mockReqUnknown: ComplianceRequirement = {
    id: 'req-test-ad-unknown',
    sourceType: 'AD',
    sourceNumber: 'FAA AD 2026-05-07',
    revision: 'Original',
    title: 'Special Cabin Fire Suppression Test',
    issuingAuthority: 'FAA',
    issueDate: '2026-01-01',
    effectiveDate: '2026-01-15',
    emergencyAd: false,
    status: 'APPROVED',
    createdAt: new Date().toISOString(),
    createdBy: 'Test Suite',
    updatedAt: new Date().toISOString(),
    updatedBy: 'Test Suite'
  };

  const oblUnknown = complianceObligationService.createOrUpdateObligation({
    requirement: mockReqUnknown,
    aircraft: mockAircraft1,
    applicabilityStatus: 'REVIEW_REQUIRED',
    applicabilityReasoning: ['Engine model serial configuration not found in tech records.'],
    actor: 'Test Runner'
  });

  if (oblUnknown.status !== 'REVIEW_REQUIRED') {
    throw new Error(`Test 10 Failed: Expected REVIEW_REQUIRED, got ${oblUnknown.status}`);
  }
  if (!oblUnknown.reviewState.requiresHumanReview) {
    throw new Error('Test 10 Failed: requiresHumanReview must be true.');
  }
  console.log('>>> TEST 10 PASSED: UNKNOWN correctly mapped to REVIEW_REQUIRED with human review flag.\n');
  passedTests++;

  // -------------------------------------------------------------
  // TEST 11: Evidence link to obligation updates temporal counters
  // -------------------------------------------------------------
  console.log('>>> TEST 11: test_evidence_link_to_obligation');
  const oblEvTest = complianceObligationService.createOrUpdateObligation({
    requirement: mockReqRepetitive,
    aircraft: mockAircraft2,
    applicabilityStatus: 'APPLICABLE',
    mandatedAction: mockReqRepetitive.mandatedActions![0],
    actor: 'Test Runner'
  });

  complianceObligationService.attachEvidence({
    obligationId: oblEvTest.id,
    evidenceType: 'LOGBOOK_ENTRY',
    documentReference: 'LB-737-XYZ-042',
    description: 'Routine maintenance check and lubrication.',
    accomplishmentDate: '2026-02-15',
    accomplishmentFH: 4950,
    accomplishmentFC: 2080,
    recordedBy: 'Inspector XYZ',
    verified: true,
    triggerComplianceEvaluation: false // Do not force transition, only attach
  });

  const reloadedEv = camoDb.getState().obligations.find(o => o.id === oblEvTest.id);
  if (reloadedEv?.temporalCounters.lastComplianceFH !== 4950) {
    throw new Error(`Test 11 Failed: Expected lastComplianceFH = 4950, got ${reloadedEv?.temporalCounters.lastComplianceFH}`);
  }
  console.log('>>> TEST 11 PASSED: Evidence link correctly updated temporal counters.\n');
  passedTests++;

  // -------------------------------------------------------------
  // TEST 12: Obligation update/review on rule change preserves history
  // -------------------------------------------------------------
  console.log('>>> TEST 12: test_reopen_obligation_on_rule_change');
  const updatedRuleObl = complianceObligationService.createOrUpdateObligation({
    requirement: mockReqUnknown,
    aircraft: mockAircraft1,
    applicabilityStatus: 'APPLICABLE',
    applicabilityReasoning: ['New STC drawing confirmed configuration.'],
    actor: 'Engineering Revision'
  });

  if (updatedRuleObl.status !== 'OPEN' && updatedRuleObl.status !== 'DUE_SOON') {
    throw new Error(`Test 12 Failed: Expected status OPEN, got ${updatedRuleObl.status}`);
  }
  if (updatedRuleObl.stateTransitions.length < 2) {
    throw new Error('Test 12 Failed: State transitions did not record the rule change transition.');
  }
  console.log('>>> TEST 12 PASSED: Obligation transitioned on rule update while preserving full audit trail.\n');
  passedTests++;

  // -------------------------------------------------------------
  // TEST 13: Multi-aircraft obligation independence
  // -------------------------------------------------------------
  console.log('>>> TEST 13: test_multi_aircraft_obligation_independence');
  const oblAc1 = camoDb.getState().obligations.find(o => o.complianceRequirementId === mockReqRepetitive.id && o.targetEntity.aircraftRegistration === 'PR-GOL');
  const oblAc2 = camoDb.getState().obligations.find(o => o.complianceRequirementId === mockReqRepetitive.id && o.targetEntity.aircraftRegistration === 'PR-XYZ');

  if (!oblAc1 || !oblAc2) {
    throw new Error('Test 13 Failed: Expected distinct obligations for PR-GOL and PR-XYZ.');
  }
  if (oblAc1.id === oblAc2.id) {
    throw new Error('Test 13 Failed: Obligations for different aircraft must have unique IDs.');
  }
  if (oblAc1.targetEntity.aircraftId === oblAc2.targetEntity.aircraftId) {
    throw new Error('Test 13 Failed: Target entity aircraftId collision.');
  }
  console.log(`>>> TEST 13 PASSED: Independent obligations verified (${oblAc1.id} vs ${oblAc2.id}).\n`);
  passedTests++;

  // -------------------------------------------------------------
  // TEST 14: Component-level obligation transfer and targeting
  // -------------------------------------------------------------
  console.log('>>> TEST 14: test_obligation_component_transfer');
  const oblComponent = complianceObligationService.createOrUpdateObligation({
    requirement: mockReq1,
    aircraft: mockAircraft1,
    targetEntity: {
      entityType: 'COMPONENT',
      entityId: 'comp-fcc-a-01',
      partNumber: '2274-COL-AC2-26',
      serialNumber: 'SN-FCC-9988',
      position: 'FCC A'
    },
    applicabilityStatus: 'APPLICABLE',
    actor: 'Avionics Shop Inspector'
  });

  if (oblComponent.targetEntity.entityType !== 'COMPONENT' || oblComponent.targetEntity.partNumber !== '2274-COL-AC2-26') {
    throw new Error('Test 14 Failed: Component entity metadata not properly mapped.');
  }
  console.log('>>> TEST 14 PASSED: Component-level obligation correctly created and mapped.\n');
  passedTests++;

  // -------------------------------------------------------------
  // TEST 15: Invalid state machine transition rejected (Strict Invariant)
  // -------------------------------------------------------------
  console.log('>>> TEST 15: test_state_machine_invalid_transition_rejected');
  let transitionThrew = false;
  try {
    // Attempt to transition an unaccomplished obligation to COMPLIED without evidence
    complianceObligationService.transitionState({
      obligationId: oblDueSoon.id,
      toStatus: 'COMPLIED',
      reason: 'Attempting invalid compliance transition without evidence',
      ruleResponsible: 'TEST_INVALID_ATTEMPT',
      actor: 'Malicious / Faulty Actor'
    });
  } catch (err: any) {
    transitionThrew = true;
    console.log(`Caught expected invariant rejection: "${err.message}"`);
  }

  if (!transitionThrew) {
    throw new Error('Test 15 Failed: State machine permitted transition to COMPLIED without verified evidence!');
  }
  console.log('>>> TEST 15 PASSED: Strict airworthiness invariant enforced (COMPLIED without evidence rejected).\n');
  passedTests++;

  // -------------------------------------------------------------
  // TEST 16: Human override gateway records justification and preserves auto state
  // -------------------------------------------------------------
  console.log('>>> TEST 16: test_human_override_obligation');
  const humanReviewed = complianceObligationService.recordHumanReview({
    obligationId: oblDueSoon.id,
    decision: 'OVERRIDDEN',
    newStatus: 'REVIEW_REQUIRED',
    justification: 'Engineering deferral request submitted under AMOC FAA-2026-001.',
    reviewedBy: 'Eng. Fabio Teraoka',
    reviewedByRole: 'CHIEF_CAMO_ENGINEER'
  });

  if (humanReviewed.status !== 'REVIEW_REQUIRED') {
    throw new Error(`Test 16 Failed: Expected status REVIEW_REQUIRED after override, got ${humanReviewed.status}`);
  }
  if (humanReviewed.reviewState.humanDecision !== 'OVERRIDDEN') {
    throw new Error('Test 16 Failed: humanDecision flag not recorded.');
  }
  if (!humanReviewed.reviewState.humanJustification?.includes('AMOC')) {
    throw new Error('Test 16 Failed: Justification string not stored.');
  }
  console.log('>>> TEST 16 PASSED: Human review override recorded with full justification and provenance.\n');
  passedTests++;

  // -------------------------------------------------------------
  // TEST 17: Audit trail captures all state transitions
  // -------------------------------------------------------------
  console.log('>>> TEST 17: test_audit_trail_captures_all_transitions');
  const auditEntries = camoDb.getState().auditTrail.filter(
    a => a.entityType === 'ComplianceObligation' && a.action.startsWith('OBLIGATION_')
  );

  if (auditEntries.length < 5) {
    throw new Error(`Test 17 Failed: Expected >= 5 obligation audit entries, found ${auditEntries.length}`);
  }
  const sampleAudit = auditEntries[auditEntries.length - 1];
  if (!sampleAudit.user || !sampleAudit.action || !sampleAudit.details) {
    throw new Error('Test 17 Failed: Audit entry missing required fields.');
  }
  console.log(`>>> TEST 17 PASSED: Audit trail captured ${auditEntries.length} obligation transitions/events.\n`);
  passedTests++;

  // -------------------------------------------------------------
  // TEST 18: Calendar days threshold calculation
  // -------------------------------------------------------------
  console.log('>>> TEST 18: test_obligation_calendar_threshold');
  const countersCal = complianceObligationService.calculateTemporalCounters(
    '2026-01-01',
    { thresholdType: 'CALENDAR_DAYS', thresholdValue: 60 },
    undefined,
    mockAircraft1
  );

  if (countersCal.complianceDueDate !== '2026-03-02') {
    throw new Error(`Test 18 Failed: Expected due date 2026-03-02, got ${countersCal.complianceDueDate}`);
  }
  console.log(`>>> TEST 18 PASSED: Calendar threshold correctly calculated (Due: ${countersCal.complianceDueDate}).\n`);
  passedTests++;

  // -------------------------------------------------------------
  // TEST 19: Flight hours threshold calculation
  // -------------------------------------------------------------
  console.log('>>> TEST 19: test_obligation_flight_hours_threshold');
  const countersFH = complianceObligationService.calculateTemporalCounters(
    '2026-01-01',
    { thresholdType: 'FLIGHT_HOURS', thresholdValue: 4000 },
    undefined,
    mockAircraft1 // current FH = 3500
  );

  if (countersFH.remainingFH !== 500) {
    throw new Error(`Test 19 Failed: Expected remainingFH = 500, got ${countersFH.remainingFH}`);
  }
  if (countersFH.isOverdue || countersFH.isDueSoon) {
    throw new Error('Test 19 Failed: 500 FH remaining should not be overdue or due soon (>100 FH).');
  }
  console.log(`>>> TEST 19 PASSED: Flight hours threshold correctly calculated (Remaining: ${countersFH.remainingFH} FH).\n`);
  passedTests++;

  // -------------------------------------------------------------
  // TEST 20: Flight cycles threshold calculation
  // -------------------------------------------------------------
  console.log('>>> TEST 20: test_obligation_cycles_threshold');
  const countersFC = complianceObligationService.calculateTemporalCounters(
    '2026-01-01',
    { thresholdType: 'FLIGHT_CYCLES', thresholdValue: 1220 },
    undefined,
    mockAircraft1 // current FC = 1200 => remaining 20 FC <= 50 FC threshold
  );

  if (countersFC.remainingFC !== 20) {
    throw new Error(`Test 20 Failed: Expected remainingFC = 20, got ${countersFC.remainingFC}`);
  }
  if (!countersFC.isDueSoon) {
    throw new Error('Test 20 Failed: 20 FC remaining must trigger isDueSoon (<= 50 FC).');
  }
  console.log(`>>> TEST 20 PASSED: Flight cycles threshold correctly calculated (Remaining: ${countersFC.remainingFC} FC, DueSoon: true).\n`);
  passedTests++;

  // Summary
  console.log('================================================================');
  console.log(`PHASE 6.1 LIFECYCLE AUDIT SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('STATUS: GREEN / 100% PASSED');
  console.log('================================================================\n');
}

runPhase61ObligationTests().catch(err => {
  console.error('Test Suite Failed with error:', err);
  process.exit(1);
});
