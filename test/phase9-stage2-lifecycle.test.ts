/**
 * CAMO PHASE 9 — ETAPA 2: CICLO DE VIDA REGULATÓRIO
 * 
 * Verifies the lifecycle integration of regulatory compliance obligations:
 * 1. Recorrência (Repetitive Cycles):
 *    - Calculated strictly from the real accomplishment event (e.g., 10,000 FH + 500 FH = 10,500 FH).
 *    - Preservation of historical evidence, accomplishment counters, and state transitions.
 *    - Preservation of the relationship with the physical aircraft.
 * 2. Idempotência da Recorrência:
 *    - Re-evaluation does not spawn duplicate obligations, cycles, or evidence.
 *    - Deterministic, stable state transitions.
 * 3. Terminating Action (Ação Terminadora):
 *    - Accomplishment of valid terminating action terminates future recurrence loop.
 *    - No new cycle is spawned after terminating action.
 *    - Historical compliance and previous routine inspections are strictly preserved.
 * 4. Supersedence (Substituição Regulatória):
 *    - Old AD replaced by New AD.
 *    - Old obligation marked SUPERSEDED; historical record preserved without deletion.
 *    - No concurrent competing active requirements for the same regulatory scope.
 * 5. Isolamento Multi-Aeronave:
 *    - Independent physical state across aircraft (Aircraft A complied/terminated ≠ Aircraft B pending).
 *    - Shared regulatory knowledge without physical compliance cross-contamination.
 * 6. Cenários Negativos:
 *    - Missing compliance reference -> INSUFFICIENT_DATA / REVIEW_REQUIRED without inventing values.
 *    - Non-matching terminating action proof -> does not terminate recurrence.
 *    - Incompatible supersedence -> 0 modifications, no false relations.
 * 7. Due Date & Threshold Engine Integration:
 *    - Multi-limit evaluation (FH, FC, Calendar) and controlling limit determination.
 * 8. Airworthiness Independence:
 *    - Strict decoupling between Regulatory Compliance and Operational Airworthiness.
 *    - No automatic grounding without authorized operational rule.
 * 9. Persistência Real (camoDb):
 *    - Complete durability and re-querying across all lifecycle states.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { camoDb } from '../server/dataStore';
import { complianceObligationService } from '../server/camoEngine/complianceObligationService';
import { evidenceVerificationEngine } from '../server/camoEngine/evidenceVerificationEngine';
import { 
  fleetAirworthinessControlEngine, 
  FleetAirworthinessControlEngine 
} from '../server/camoEngine/fleetAirworthinessControlEngine';
import { dueDateThresholdEngine } from '../server/camoEngine/dueDateThresholdEngine';
import { 
  Aircraft, 
  ComplianceRequirement, 
  EvidenceType,
  ComplianceObligation
} from '../src/types';

describe('CAMO Phase 9 — Etapa 2: Ciclo de Vida Regulatório', () => {

  // =========================================================================
  // CONTROLLED TEST ENTITIES (AIRCRAFT A & B)
  // =========================================================================
  const testAircraftA: Aircraft = {
    id: 'ac-stage2-737-01',
    operatorId: 'op-camo-01',
    registration: 'PR-TESTA',
    msn: '20001',
    manufacturer: 'Boeing',
    model: '737-800',
    series: 'NG',
    aircraftType: 'Commercial Transport',
    status: 'OPERATIONAL',
    totalFlightHours: 9500,
    totalCycles: 4750,
    totalLandings: 4750,
    manufactureDate: '2017-03-10'
  };

  const testAircraftB: Aircraft = {
    id: 'ac-stage2-737-02',
    operatorId: 'op-camo-01',
    registration: 'PR-TESTB',
    msn: '20002',
    manufacturer: 'Boeing',
    model: '737-800',
    series: 'NG',
    aircraftType: 'Commercial Transport',
    status: 'OPERATIONAL',
    totalFlightHours: 6500,
    totalCycles: 3250,
    totalLandings: 3250,
    manufactureDate: '2019-06-15'
  };

  // =========================================================================
  // CONTROLLED REPETITIVE REQUIREMENT WITH TERMINATING ACTION
  // =========================================================================
  const repetitiveRequirement: ComplianceRequirement = {
    id: 'cr-stage2-rep-01',
    sourceType: 'AD',
    sourceNumber: '2026-11-01',
    revision: 'Original',
    title: 'Repetitive NDT Inspection of High Pressure Duct Welds with Terminating SB Modification',
    issuingAuthority: 'FAA',
    issueDate: '2025-12-15',
    effectiveDate: '2026-01-01',
    emergencyAd: false,
    status: 'APPROVED',
    applicabilityRule: {
      id: 'app-rep-01',
      complianceRequirementId: 'cr-stage2-rep-01',
      aircraftManufacturers: ['Boeing'],
      aircraftModels: ['737-800'],
      componentPartNumbers: [],
      rawText: 'Applies to all Boeing 737-800 aircraft.'
    },
    requirementDetails: {
      initialThreshold: '10,000 flight hours',
      repetitiveInterval: '500 flight hours',
      terminatingAction: 'Installation of redesigned reinforcement bracket per Boeing Alert SB 737-53A1420 terminates the repetitive inspections.'
    },
    mandatedActions: [
      {
        id: 'act-rep-insp-01',
        paragraphReference: 'Paragraph (g)',
        actionType: 'REPETITIVE_INSPECTION',
        description: 'Repetitive ultrasonic NDT inspection of duct skin welds every 500 FH.',
        complianceThreshold: {
          thresholdType: 'FLIGHT_HOURS',
          thresholdValue: 10000,
          rawDescription: '10,000 total airframe flight hours'
        },
        repetitiveInterval: {
          intervalType: 'FLIGHT_HOURS',
          intervalValue: 500,
          rawDescription: 'Repetitive inspection every 500 flight hours'
        },
        isTerminatingAction: false,
        sequence: 1
      }
    ],
    documentProcessingStatus: 'EXTRACTED',
    extractionStatus: 'SUCCESS',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'SYSTEM',
    updatedBy: 'SYSTEM'
  };

  // =========================================================================
  // CONTROLLED REQUIREMENTS FOR SUPERSEDENCE (OLD AD vs NEW AD)
  // =========================================================================
  const oldRequirement: ComplianceRequirement = {
    id: 'cr-stage2-old-01',
    sourceType: 'AD',
    sourceNumber: '2024-10-05',
    revision: 'Original',
    title: 'Elevator Tab Control Rod Repetitive Inspection',
    issuingAuthority: 'FAA',
    issueDate: '2024-10-15',
    effectiveDate: '2024-11-01',
    emergencyAd: false,
    status: 'APPROVED',
    applicabilityRule: {
      id: 'app-old-01',
      complianceRequirementId: 'cr-stage2-old-01',
      aircraftManufacturers: ['Boeing'],
      aircraftModels: ['737-800'],
      componentPartNumbers: [],
      rawText: 'Applies to Boeing 737-800 series airplanes.'
    },
    mandatedActions: [
      {
        id: 'act-old-01',
        paragraphReference: 'Paragraph (e)',
        actionType: 'REPETITIVE_INSPECTION',
        description: 'Detailed inspection of elevator tab control rod ends for play.',
        complianceThreshold: {
          thresholdType: 'FLIGHT_HOURS',
          thresholdValue: 12000,
          rawDescription: '12,000 total flight hours'
        },
        sequence: 1
      }
    ],
    documentProcessingStatus: 'EXTRACTED',
    extractionStatus: 'SUCCESS',
    createdAt: '2024-10-05T00:00:00.000Z',
    updatedAt: '2024-10-05T00:00:00.000Z',
    createdBy: 'SYSTEM',
    updatedBy: 'SYSTEM'
  };

  const newRequirement: ComplianceRequirement = {
    id: 'cr-stage2-new-02',
    sourceType: 'AD',
    sourceNumber: '2026-02-10',
    revision: 'Original',
    title: 'Elevator Tab Control Rod Replacement (Supersedes AD 2024-10-05)',
    issuingAuthority: 'FAA',
    issueDate: '2026-02-15',
    effectiveDate: '2026-09-01',
    emergencyAd: false,
    status: 'APPROVED',
    supersedes: '2024-10-05',
    applicabilityRule: {
      id: 'app-new-02',
      complianceRequirementId: 'cr-stage2-new-02',
      aircraftManufacturers: ['Boeing'],
      aircraftModels: ['737-800'],
      componentPartNumbers: [],
      rawText: 'Applies to Boeing 737-800 series airplanes.'
    },
    mandatedActions: [
      {
        id: 'act-new-02',
        paragraphReference: 'Paragraph (g)',
        actionType: 'HARDWARE_MODIFICATION',
        description: 'Replace elevator tab control rods with redesigned corrosion-resistant rods.',
        complianceThreshold: {
          thresholdType: 'CALENDAR_DAYS',
          thresholdValue: 180,
          rawDescription: 'Within 180 days after effective date'
        },
        sequence: 1
      }
    ],
    documentProcessingStatus: 'EXTRACTED',
    extractionStatus: 'SUCCESS',
    createdAt: '2026-02-10T00:00:00.000Z',
    updatedAt: '2026-02-10T00:00:00.000Z',
    createdBy: 'SYSTEM',
    updatedBy: 'SYSTEM'
  };

  beforeEach(() => {
    // Reset database to initial seed
    camoDb.resetToSeed();

    // Reset base aircraft values
    testAircraftA.totalFlightHours = 9500;
    testAircraftA.totalCycles = 4750;
    testAircraftB.totalFlightHours = 11200;
    testAircraftB.totalCycles = 5600;

    // Seed controlled aircraft & requirements
    camoDb.update(state => {
      state.aircraft = state.aircraft.filter(a => a.id !== testAircraftA.id && a.id !== testAircraftB.id);
      state.aircraft.push({ ...testAircraftA }, { ...testAircraftB });

      state.requirements = state.requirements.filter(r => 
        r.id !== repetitiveRequirement.id && 
        r.id !== oldRequirement.id && 
        r.id !== newRequirement.id
      );
      state.requirements.push(repetitiveRequirement, oldRequirement, newRequirement);

      state.obligations = state.obligations.filter(o => 
        o.complianceRequirementId !== repetitiveRequirement.id &&
        o.complianceRequirementId !== oldRequirement.id &&
        o.complianceRequirementId !== newRequirement.id
      );

      state.evidence = state.evidence.filter(e => 
        e.complianceRequirementId !== repetitiveRequirement.id &&
        e.complianceRequirementId !== oldRequirement.id &&
        e.complianceRequirementId !== newRequirement.id
      );
    });
  });

  // =========================================================================
  // CENÁRIO A: OBRIGAÇÃO RECORRENTE & CÁLCULO BASEADO NO EVENTO REAL
  // =========================================================================
  describe('Cenário A — Obrigação Recorrente & Cálculo Baseado no Evento Real', () => {

    it('calculates next cycle limit strictly from real accomplishment event (10,000 FH + 500 FH = 10,500 FH)', () => {
      // 1. Create repetitive obligation for Aircraft A
      const obligation = complianceObligationService.createOrUpdateObligation({
        requirement: repetitiveRequirement,
        aircraft: testAircraftA,
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasoning: ['Model match Boeing 737-800'],
        mandatedAction: repetitiveRequirement.mandatedActions![0],
        actor: 'CAMO-Lifecycle-Engineer'
      });

      expect(obligation.status).toBe('OPEN');
      expect(obligation.interval?.isRepetitive).toBe(true);
      expect(obligation.interval?.intervalValue).toBe(500);

      // Configure terminating action metadata on obligation
      camoDb.update(state => {
        const obl = state.obligations.find(o => o.id === obligation.id);
        if (obl) {
          obl.terminatingAction = {
            hasTerminatingAction: true,
            isTerminated: false,
            terminatingParagraph: 'Paragraph (h)',
            terminatingActionId: 'act-term-sb-1420'
          };
        }
      });

      // 2. Aircraft reaches 10,000 FH and undergoes routine inspection accomplishment
      camoDb.update(state => {
        const ac = state.aircraft.find(a => a.id === testAircraftA.id);
        if (ac) {
          ac.totalFlightHours = 10000;
          ac.totalCycles = 5000;
        }
      });

      const initialAccomplishmentFH = 10000;
      const initialAccomplishmentDate = '2026-02-15';
      const initialDocRef = 'WO-NDT-2026-10000FH';

      const updatedObligation = complianceObligationService.attachEvidence({
        obligationId: obligation.id,
        evidenceType: 'INSPECTION_RECORD',
        documentReference: initialDocRef,
        sourceReference: 'AMM Task 53-10-00-200-801',
        description: 'Routine ultrasonic NDT inspection of high pressure duct skin welds.',
        accomplishmentDate: initialAccomplishmentDate,
        accomplishmentFH: initialAccomplishmentFH,
        accomplishmentFC: 5000,
        recordedBy: 'NDT Level II Inspector',
        verified: true,
        triggerComplianceEvaluation: true
      });

      // 3. Verify: First cycle transitioned through COMPLIED and opened NEXT_CYCLE_OPEN
      expect(updatedObligation.status).toBe('NEXT_CYCLE_OPEN');
      expect(updatedObligation.temporalCounters.cycleCount).toBe(1);

      // Invariant Check: Next cycle limit MUST BE: 10,000 FH + 500 FH = 10,500 FH!
      expect(updatedObligation.temporalCounters.nextDueFH).toBe(10500);
      expect(updatedObligation.temporalCounters.lastComplianceFH).toBe(10000);
      expect(updatedObligation.temporalCounters.lastComplianceDate).toBe(initialAccomplishmentDate);

      // Remaining FH relative to Aircraft A (current FH: 10,000) -> 10,500 - 10,000 = 500 FH
      expect(updatedObligation.temporalCounters.remainingFH).toBe(500);
      expect(updatedObligation.temporalCounters.isOverdue).toBe(false);

      // 4. Verify historical preservation
      expect(updatedObligation.evidence.length).toBe(1);
      expect(updatedObligation.evidence[0].documentReference).toBe(initialDocRef);
      expect(updatedObligation.evidence[0].accomplishmentFH).toBe(10000);
      expect(updatedObligation.evidence[0].verified).toBe(true);

      // State transitions track the full journey: IDENTIFIED -> OPEN -> COMPLIED -> NEXT_CYCLE_OPEN
      const transitionStatuses = updatedObligation.stateTransitions.map(t => t.toStatus);
      expect(transitionStatuses).toContain('OPEN');
      expect(transitionStatuses).toContain('COMPLIED');
      expect(transitionStatuses).toContain('NEXT_CYCLE_OPEN');

      // Relationship with physical aircraft preserved
      expect(updatedObligation.targetEntity.aircraftId).toBe(testAircraftA.id);
      expect(updatedObligation.targetEntity.aircraftRegistration).toBe(testAircraftA.registration);
    });

    it('advances to cycle 2 calculating from second accomplishment event (10,480 FH + 500 FH = 10,980 FH)', () => {
      // 1. Fetch obligation in NEXT_CYCLE_OPEN from DB or create with first cycle
      const obligation = complianceObligationService.createOrUpdateObligation({
        requirement: repetitiveRequirement,
        aircraft: testAircraftA,
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasoning: ['Model match Boeing 737-800'],
        mandatedAction: repetitiveRequirement.mandatedActions![0],
        actor: 'CAMO-Lifecycle-Engineer'
      });

      // Aircraft operates to 10,000 FH and attaches first cycle accomplishment
      camoDb.update(state => {
        const ac = state.aircraft.find(a => a.id === testAircraftA.id);
        if (ac) ac.totalFlightHours = 10000;
      });

      complianceObligationService.attachEvidence({
        obligationId: obligation.id,
        evidenceType: 'INSPECTION_RECORD',
        documentReference: 'WO-NDT-CYCLE-1',
        description: 'First cycle NDT inspection.',
        accomplishmentDate: '2026-02-15',
        accomplishmentFH: 10000,
        recordedBy: 'Inspector A',
        verified: true,
        triggerComplianceEvaluation: true
      });

      // 2. Aircraft operates to 10,480 FH and performs second cycle inspection (before 10,500 FH limit)
      camoDb.update(state => {
        const ac = state.aircraft.find(a => a.id === testAircraftA.id);
        if (ac) ac.totalFlightHours = 10480;
      });

      const secondAccomplishmentFH = 10480;
      const secondAccomplishmentDate = '2026-03-01';
      const secondDocRef = 'WO-NDT-CYCLE-2';

      const cycle2Obligation = complianceObligationService.attachEvidence({
        obligationId: obligation.id,
        evidenceType: 'INSPECTION_RECORD',
        documentReference: secondDocRef,
        description: 'Second cycle repetitive NDT inspection.',
        accomplishmentDate: secondAccomplishmentDate,
        accomplishmentFH: secondAccomplishmentFH,
        recordedBy: 'Inspector B',
        verified: true,
        triggerComplianceEvaluation: true
      });

      // 3. Verify cycle 2 calculation: 10,480 + 500 = 10,980 FH!
      expect(cycle2Obligation.status).toBe('NEXT_CYCLE_OPEN');
      expect(cycle2Obligation.temporalCounters.cycleCount).toBe(2);
      expect(cycle2Obligation.temporalCounters.nextDueFH).toBe(10980);
      expect(cycle2Obligation.temporalCounters.lastComplianceFH).toBe(10480);
      expect(cycle2Obligation.temporalCounters.lastComplianceDate).toBe(secondAccomplishmentDate);

      // Both historical evidences are preserved in chronological custody
      expect(cycle2Obligation.evidence.length).toBe(2);
      expect(cycle2Obligation.evidence[0].documentReference).toBe('WO-NDT-CYCLE-1');
      expect(cycle2Obligation.evidence[1].documentReference).toBe('WO-NDT-CYCLE-2');
    });
  });

  // =========================================================================
  // IDEMPOTÊNCIA DA RECORRÊNCIA
  // =========================================================================
  describe('Idempotência da Recorrência', () => {

    it('ensures repeated evaluation does not duplicate obligations, cycles, or evidence records', () => {
      // 1. Setup obligation with initial accomplishment
      const obligation = complianceObligationService.createOrUpdateObligation({
        requirement: repetitiveRequirement,
        aircraft: testAircraftA,
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasoning: ['Model match Boeing 737-800'],
        mandatedAction: repetitiveRequirement.mandatedActions![0],
        actor: 'CAMO-Idempotency-Engineer'
      });

      camoDb.update(state => {
        const ac = state.aircraft.find(a => a.id === testAircraftA.id);
        if (ac) {
          ac.totalFlightHours = 10000;
          ac.totalCycles = 5000;
        }
      });

      complianceObligationService.attachEvidence({
        obligationId: obligation.id,
        evidenceType: 'INSPECTION_RECORD',
        documentReference: 'WO-IDEMP-01',
        description: 'Initial NDT inspection.',
        accomplishmentDate: '2026-02-15',
        accomplishmentFH: 10000,
        recordedBy: 'Inspector A',
        verified: true,
        triggerComplianceEvaluation: true
      });

      const dbBefore = camoDb.getState();
      const obligationsCountBefore = dbBefore.obligations.length;
      const evidenceCountBefore = dbBefore.evidence.length;
      const initialCycleCount = dbBefore.obligations.find(o => o.id === obligation.id)?.temporalCounters.cycleCount;
      const initialNextDueFH = dbBefore.obligations.find(o => o.id === obligation.id)?.temporalCounters.nextDueFH;

      // 2. Re-run evaluation pass 1
      complianceObligationService.evaluateAllFleetObligations('Idempotency-Pass-1');
      const detailedCalc1 = complianceObligationService.calculateObligationDueDetailed(obligation.id);

      // 3. Re-run evaluation pass 2
      complianceObligationService.evaluateAllFleetObligations('Idempotency-Pass-2');
      const detailedCalc2 = complianceObligationService.calculateObligationDueDetailed(obligation.id);

      // 4. Re-call createOrUpdateObligation with identical parameters
      complianceObligationService.createOrUpdateObligation({
        requirement: repetitiveRequirement,
        aircraft: testAircraftA,
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasoning: ['Model match Boeing 737-800'],
        mandatedAction: repetitiveRequirement.mandatedActions![0],
        actor: 'CAMO-Idempotency-Engineer'
      });

      // 5. Verify strict stability and absence of duplication
      const dbAfter = camoDb.getState();
      expect(dbAfter.obligations.length).toBe(obligationsCountBefore);
      expect(dbAfter.evidence.length).toBe(evidenceCountBefore);

      const oblAfter = dbAfter.obligations.find(o => o.id === obligation.id);
      expect(oblAfter?.status).toBe('NEXT_CYCLE_OPEN');
      expect(oblAfter?.temporalCounters.cycleCount).toBe(initialCycleCount);
      expect(oblAfter?.temporalCounters.nextDueFH).toBe(initialNextDueFH);

      // Calculations 1 and 2 must produce 100% identical deterministic output
      expect(detailedCalc1.counters.nextDueFH).toBe(detailedCalc2.counters.nextDueFH);
      expect(detailedCalc1.counters.dueFH).toBe(detailedCalc2.counters.dueFH);
      expect(detailedCalc1.counters.cycleCount).toBe(detailedCalc2.counters.cycleCount);
      expect((detailedCalc1 as any).calculationHash).toBe((detailedCalc2 as any).calculationHash);
    });
  });

  // =========================================================================
  // CENÁRIO B: TERMINATING ACTION (AÇÃO TERMINADORA)
  // =========================================================================
  describe('Cenário B — Terminating Action (Ação Terminadora)', () => {

    it('recognizes terminating action, terminates future recurrence, and preserves historical compliance', () => {
      // 1. Create repetitive obligation with terminating action configured
      const obligation = complianceObligationService.createOrUpdateObligation({
        requirement: repetitiveRequirement,
        aircraft: testAircraftA,
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasoning: ['Model match Boeing 737-800'],
        mandatedAction: repetitiveRequirement.mandatedActions![0],
        actor: 'CAMO-Lifecycle-Engineer'
      });

      camoDb.update(state => {
        const obl = state.obligations.find(o => o.id === obligation.id);
        if (obl) {
          obl.terminatingAction = {
            hasTerminatingAction: true,
            isTerminated: false,
            terminatingParagraph: 'Paragraph (h)',
            terminatingActionId: 'act-term-sb-1420'
          };
        }
      });

      // 2. Perform routine inspection cycle 1 at 10,000 FH (recurrence continues)
      camoDb.update(state => {
        const ac = state.aircraft.find(a => a.id === testAircraftA.id);
        if (ac) ac.totalFlightHours = 10000;
      });

      complianceObligationService.attachEvidence({
        obligationId: obligation.id,
        evidenceType: 'INSPECTION_RECORD',
        documentReference: 'WO-ROUTINE-CYCLE-1',
        description: 'Routine ultrasonic NDT inspection.',
        accomplishmentDate: '2026-02-15',
        accomplishmentFH: 10000,
        recordedBy: 'NDT Inspector',
        verified: true,
        triggerComplianceEvaluation: true
      });

      const oblCycle1 = camoDb.getState().obligations.find(o => o.id === obligation.id);
      expect(oblCycle1?.status).toBe('NEXT_CYCLE_OPEN');
      expect(oblCycle1?.terminatingAction?.isTerminated).toBe(false);

      // 3. Accomplish Terminating Action: Install redesign bracket per SB 737-53A1420 at 10,350 FH
      camoDb.update(state => {
        const ac = state.aircraft.find(a => a.id === testAircraftA.id);
        if (ac) ac.totalFlightHours = 10350;
      });

      const termEvidenceRef = 'WO-TERM-SB-737-53A1420';
      const termAccomplishmentFH = 10350;
      const termAccomplishmentDate = '2026-02-28';

      const terminatedObligation = complianceObligationService.attachEvidence({
        obligationId: obligation.id,
        evidenceType: 'SERVICE_BULLETIN_RECORD',
        documentReference: termEvidenceRef,
        sourceReference: 'Boeing Alert SB 737-53A1420 Rev 1',
        description: 'Installation of redesigned reinforcement bracket per Service Bulletin SB 737-53A1420 terminating repetitive inspections.',
        accomplishmentDate: termAccomplishmentDate,
        accomplishmentFH: termAccomplishmentFH,
        recordedBy: 'Chief Structures Engineer',
        verified: true,
        triggerComplianceEvaluation: true
      });

      // 4. Invariant Verification:
      // Status MUST be COMPLIED (NOT NEXT_CYCLE_OPEN!)
      expect(terminatedObligation.status).toBe('COMPLIED');
      expect(terminatedObligation.terminatingAction?.isTerminated).toBe(true);
      expect(terminatedObligation.terminatingAction?.hasTerminatingAction).toBe(true);

      // Historical distinction preserved:
      // - Both the routine inspection AND the terminating action are preserved in evidence history
      expect(terminatedObligation.evidence.length).toBe(2);
      expect(terminatedObligation.evidence.some(e => e.documentReference === 'WO-ROUTINE-CYCLE-1')).toBe(true);
      expect(terminatedObligation.evidence.some(e => e.documentReference === termEvidenceRef)).toBe(true);

      // State transitions show progression through cycle 1 into final termination
      const transitionStatuses = terminatedObligation.stateTransitions.map(t => t.toStatus);
      expect(transitionStatuses).toContain('NEXT_CYCLE_OPEN');
      expect(transitionStatuses).toContain('COMPLIED');

      // 5. Airworthiness Assessment Verification
      const oblAssessment = fleetAirworthinessControlEngine.assessObligation(terminatedObligation, { aircraft: testAircraftA });
      expect(oblAssessment.isAirworthy).toBe(true);
      expect(oblAssessment.isBlocking).toBe(false);
      expect(oblAssessment.severity).toBe('INFO');
      expect(oblAssessment.explanation).toContain('Ação Terminatória validada');

      const acAssessment = fleetAirworthinessControlEngine.assessAircraftAirworthiness(testAircraftA.id, {
        aircraft: testAircraftA,
        obligations: [terminatedObligation]
      });
      expect(acAssessment.complianceStatus).toBe('COMPLIANT');
      expect(acAssessment.airworthinessStatus).toBe('AIRWORTHY');
      expect(acAssessment.canFly).toBe(true);
      expect(acAssessment.blockingObligations).toHaveLength(0);
      expect(acAssessment.warningObligations).toHaveLength(0);
    });
  });

  // =========================================================================
  // CENÁRIO C: SUPERSEDENCE (SUBSTITUIÇÃO REGULATÓRIA)
  // =========================================================================
  describe('Cenário C — Supersedence (Substituição Regulatória)', () => {

    it('marks prior obligation as SUPERSEDED, preserving historical records and audit trail', () => {
      // 1. Create open obligation for old requirement AD 2024-10-05
      const oldObligation = complianceObligationService.createOrUpdateObligation({
        requirement: oldRequirement,
        aircraft: testAircraftA,
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasoning: ['Model match Boeing 737-800'],
        mandatedAction: oldRequirement.mandatedActions![0],
        actor: 'CAMO-Supersedence-Tester'
      });

      expect(oldObligation.status).toBe('OPEN');
      expect(oldObligation.adNumber).toBe('2024-10-05');

      // 2. Trigger supersedence: AD 2026-02-10 supersedes AD 2024-10-05
      const supersededCount = complianceObligationService.markSuperseded(
        oldRequirement.id,
        newRequirement.sourceNumber,
        newRequirement.id,
        'CAMO-Regulatory-Pipeline'
      );

      expect(supersededCount).toBe(1);

      // 3. Verify old obligation state
      const updatedOldObl = camoDb.getState().obligations.find(o => o.id === oldObligation.id);
      expect(updatedOldObl?.status).toBe('SUPERSEDED');
      expect(updatedOldObl?.supersedence?.isSuperseded).toBe(true);
      expect(updatedOldObl?.supersedence?.supersededByAdNumber).toBe(newRequirement.sourceNumber);
      expect(updatedOldObl?.supersedence?.supersededByRequirementId).toBe(newRequirement.id);

      // Verification that history was NOT deleted
      expect(updatedOldObl?.stateTransitions.length).toBeGreaterThan(1);
      const lastTransition = updatedOldObl?.stateTransitions[updatedOldObl.stateTransitions.length - 1];
      expect(lastTransition?.toStatus).toBe('SUPERSEDED');
      expect(lastTransition?.ruleResponsible).toBe('RULE_SUPERSEDED_BY_NEW_AD');
    });

    it('critical test: prevents simultaneous competing active obligations when supersedence dictates replacement', () => {
      // 1. Aircraft A has open obligation for old requirement AD 2024-10-05
      const oldObl = complianceObligationService.createOrUpdateObligation({
        requirement: oldRequirement,
        aircraft: testAircraftA,
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasoning: ['Model match Boeing 737-800'],
        mandatedAction: oldRequirement.mandatedActions![0],
        actor: 'CAMO-Supersedence-Tester'
      });

      // 2. Mark old obligation as SUPERSEDED by new AD 2026-02-10
      complianceObligationService.markSuperseded(
        oldRequirement.id,
        newRequirement.sourceNumber,
        newRequirement.id,
        'CAMO-Regulatory-Pipeline'
      );

      // 3. Create obligation for the new superseding requirement AD 2026-02-10
      const newObl = complianceObligationService.createOrUpdateObligation({
        requirement: newRequirement,
        aircraft: testAircraftA,
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasoning: ['Model match Boeing 737-800'],
        mandatedAction: newRequirement.mandatedActions![0],
        actor: 'CAMO-Regulatory-Pipeline'
      });

      expect(newObl.status).toBe('OPEN');
      expect(newObl.adNumber).toBe('2026-02-10');

      // 4. Evaluate Aircraft Airworthiness across both obligations
      const acAssessment = fleetAirworthinessControlEngine.assessAircraftAirworthiness(testAircraftA.id, {
        aircraft: testAircraftA,
        obligations: [oldObl, newObl]
      });

      // CRITICAL INVARIANT:
      // The system does NOT treat both obligations as active competing requirements!
      // Old obligation is counted under supersededObligations, NOT active open/applicable obligations
      expect(acAssessment.supersededObligations).toBe(1);
      expect(acAssessment.openObligations).toBe(1); // Only the new requirement is actively open!
      expect(acAssessment.totalObligations).toBe(2);

      // Old obligation assessment is non-blocking INFO
      const oldOblAss = fleetAirworthinessControlEngine.assessObligation(oldObl, { aircraft: testAircraftA });
      expect(oldOblAss.status).toBe('SUPERSEDED');
      expect(oldOblAss.isAirworthy).toBe(true);
      expect(oldOblAss.isBlocking).toBe(false);
      expect(oldOblAss.severity).toBe('INFO');
      expect(oldOblAss.structuredReasonCodes).toContain('SUPERSEDED_HISTORICAL');
    });
  });

  // =========================================================================
  // TESTE DE ISOLAMENTO MULTI-AERONAVE
  // =========================================================================
  describe('Teste de Isolamento Multi-Aeronave', () => {

    it('ensures compliance and terminating action on Aircraft A do not contaminate Aircraft B', () => {
      // 1. Create obligations for both aircraft on repetitive requirement
      const oblA = complianceObligationService.createOrUpdateObligation({
        requirement: repetitiveRequirement,
        aircraft: testAircraftA,
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasoning: ['Model match Boeing 737-800'],
        mandatedAction: repetitiveRequirement.mandatedActions![0],
        actor: 'CAMO-Fleet-Officer'
      });

      const oblB = complianceObligationService.createOrUpdateObligation({
        requirement: repetitiveRequirement,
        aircraft: testAircraftB,
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasoning: ['Model match Boeing 737-800'],
        mandatedAction: repetitiveRequirement.mandatedActions![0],
        actor: 'CAMO-Fleet-Officer'
      });

      expect(oblA.id).not.toBe(oblB.id);
      expect(oblA.targetEntity.aircraftId).toBe(testAircraftA.id);
      expect(oblB.targetEntity.aircraftId).toBe(testAircraftB.id);

      // Configure terminating action on oblA
      camoDb.update(state => {
        const a = state.obligations.find(o => o.id === oblA.id);
        if (a) {
          a.terminatingAction = {
            hasTerminatingAction: true,
            isTerminated: false,
            terminatingParagraph: 'Paragraph (h)'
          };
        }
      });

      // 2. Perform terminating action on Aircraft A ONLY (advance A to 10,000 FH)
      camoDb.update(state => {
        const ac = state.aircraft.find(a => a.id === testAircraftA.id);
        if (ac) ac.totalFlightHours = 10000;
      });

      complianceObligationService.attachEvidence({
        obligationId: oblA.id,
        evidenceType: 'SERVICE_BULLETIN_RECORD',
        documentReference: 'WO-TERM-AC-A-ONLY',
        description: 'Installation of SB 737-53A1420 on PR-TESTA terminating repetitive inspections.',
        accomplishmentDate: '2026-02-20',
        accomplishmentFH: 10000,
        recordedBy: 'Structures Specialist',
        verified: true,
        triggerComplianceEvaluation: true
      });

      // 3. Query state of Aircraft B
      const freshOblB = camoDb.getState().obligations.find(o => o.id === oblB.id);
      expect(freshOblB?.status).toBe('OVERDUE'); // B remains strictly uncomplied and OVERDUE (11,200 FH > 10,000 FH threshold)
      expect(freshOblB?.status).not.toBe('COMPLIED');
      expect(freshOblB?.evidence).toHaveLength(0); // B received NO evidence!
      expect(freshOblB?.terminatingAction?.isTerminated).toBeFalsy();

      // Query Aircraft A
      const freshOblA = camoDb.getState().obligations.find(o => o.id === oblA.id);
      expect(freshOblA?.status).toBe('COMPLIED');
      expect(freshOblA?.terminatingAction?.isTerminated).toBe(true);

      // 4. Fleet assessment verifies individual airworthiness
      const fleetAss = fleetAirworthinessControlEngine.assessFleetAirworthiness({
        aircraftList: [testAircraftA, testAircraftB],
        obligations: [freshOblA!, freshOblB!]
      });

      expect(fleetAss.totalAircraft).toBe(2);
      expect(fleetAss.compliantAircraftCount).toBe(1); // Only Aircraft A is compliant
      expect(fleetAss.fleetOverdueObligations).toBe(1); // Aircraft B has 1 overdue obligation
    });

    it('rejects attempt to cross-attach Aircraft A evidence to Aircraft B obligation', () => {
      const oblB = complianceObligationService.createOrUpdateObligation({
        requirement: repetitiveRequirement,
        aircraft: testAircraftB,
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasoning: ['Model match Boeing 737-800'],
        mandatedAction: repetitiveRequirement.mandatedActions![0],
        actor: 'CAMO-Fleet-Officer'
      });

      // Evidence specifies Aircraft A registration PR-TESTA
      const crossEvidence = {
        id: 'ev-cross-contam-01',
        obligationId: oblB.id,
        complianceRequirementId: repetitiveRequirement.id,
        aircraftId: testAircraftA.id,
        evidenceType: 'INSPECTION_RECORD' as EvidenceType,
        documentReference: 'WO-CROSS-AIRFRAME-EVIDENCE',
        sourceReference: 'AMM Task 53-10-00',
        description: 'Accomplished on PR-TESTA airframe.',
        targetEntity: {
          entityType: 'AIRCRAFT' as const,
          entityId: testAircraftA.id,
          registration: 'PR-TESTA',
          serialNumber: '20001'
        },
        eventDate: '2026-02-15',
        eventFlightHours: 10000,
        submittedAt: '2026-02-15T10:00:00.000Z',
        submittedBy: 'Auditor',
        verificationStatus: 'PENDING_VALIDATION' as const,
        source: 'CAMO_EVIDENCE_ATTACHMENT' as const,
        version: 1
      };

      const verifyResult = evidenceVerificationEngine.verifyEvidence({
        evidence: crossEvidence,
        obligation: oblB,
        aircraft: testAircraftB,
        requirement: repetitiveRequirement
      });

      expect(verifyResult.isValid).toBe(false);
      expect(verifyResult.status).toBe('INVALID');
      expect(verifyResult.structuredReasons).toContain('ENTITY_MISMATCH');
      expect(verifyResult.reasons.some(r => r.includes('Divergência'))).toBe(true);
    });
  });

  // =========================================================================
  // CENÁRIOS NEGATIVOS
  // =========================================================================
  describe('Cenários Negativos', () => {

    it('flags INSUFFICIENT_DATA / REVIEW_REQUIRED when calculating recurrence without accomplishment reference', () => {
      // Repetitive interval requires last compliance FH reference
      const result = dueDateThresholdEngine.calculateDue({
        obligationId: 'obl-neg-rep-01',
        interval: {
          isRepetitive: true,
          intervalType: 'FLIGHT_HOURS',
          intervalValue: 500
        },
        currentAirframeFH: 10100,
        lastComplianceFH: undefined, // Missing reference!
        lastComplianceDate: undefined,
        cycleCount: 1
      });

      expect(result.calculationStatus).toBe('INSUFFICIENT_DATA');
      expect(result.reviewRequired).toBe(true);
      expect(result.reviewReason).toBe('Missing reference flight hours for repetitive FH interval calculation (last compliance FH not recorded).');
      expect(result.counters.dueFH).toBeUndefined();
      expect(result.counters.nextDueFH).toBeUndefined();
    });

    it('does NOT terminate recurrence if submitted evidence does not prove the terminating action', () => {
      const obligation = complianceObligationService.createOrUpdateObligation({
        requirement: repetitiveRequirement,
        aircraft: testAircraftA,
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasoning: ['Model match Boeing 737-800'],
        mandatedAction: repetitiveRequirement.mandatedActions![0],
        actor: 'CAMO-Tester'
      });

      camoDb.update(state => {
        const obl = state.obligations.find(o => o.id === obligation.id);
        if (obl) {
          obl.terminatingAction = {
            hasTerminatingAction: true,
            isTerminated: false,
            terminatingParagraph: 'Paragraph (h)'
          };
        }
      });

      // Submit generic visual check evidence (NOT the terminating SB modification)
      camoDb.update(state => {
        const ac = state.aircraft.find(a => a.id === testAircraftA.id);
        if (ac) ac.totalFlightHours = 10000;
      });

      const updatedObl = complianceObligationService.attachEvidence({
        obligationId: obligation.id,
        evidenceType: 'INSPECTION_RECORD',
        documentReference: 'WO-GENERAL-INSP-ONLY',
        description: 'General visual inspection of skin surface.',
        accomplishmentDate: '2026-02-15',
        accomplishmentFH: 10000,
        recordedBy: 'Inspector A',
        verified: true,
        triggerComplianceEvaluation: true
      });

      // Recurrence must continue: NEXT_CYCLE_OPEN, NOT permanently terminated
      expect(updatedObl.status).toBe('NEXT_CYCLE_OPEN');
      expect(updatedObl.terminatingAction?.isTerminated).toBe(false);
      expect(updatedObl.temporalCounters.nextDueFH).toBe(10500);
    });

    it('rejects invalid supersedence target and leaves unrelated obligations untouched', () => {
      const obligation = complianceObligationService.createOrUpdateObligation({
        requirement: repetitiveRequirement,
        aircraft: testAircraftA,
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasoning: ['Model match Boeing 737-800'],
        mandatedAction: repetitiveRequirement.mandatedActions![0],
        actor: 'CAMO-Tester'
      });

      // Attempt to supersede with a completely fictional non-existent requirement ID
      const affectedCount = complianceObligationService.markSuperseded(
        'cr-non-existent-requirement-id-999',
        '2026-99-99',
        'cr-fake-99'
      );

      expect(affectedCount).toBe(0);

      // Repetitive obligation remains active and untouched
      const checkObl = camoDb.getState().obligations.find(o => o.id === obligation.id);
      expect(checkObl?.status).toBe('OPEN');
      expect(checkObl?.supersedence).toBeUndefined();
    });
  });

  // =========================================================================
  // DUE DATE / THRESHOLD ENGINE INTEGRATION
  // =========================================================================
  describe('Due Date & Threshold Engine Integration', () => {

    it('evaluates multi-limit repetitive intervals using WHICHEVER_OCCURS_FIRST conservatively', () => {
      // Repetitive interval with both 500 FH and 60 Days
      const calcResult = dueDateThresholdEngine.calculateDue({
        obligationId: 'obl-multi-limit-01',
        interval: {
          isRepetitive: true,
          intervalType: 'FLIGHT_HOURS',
          intervalValue: 500,
          calendarInterval: { value: 60, unit: 'DAYS' },
          compositionOperator: 'WHICHEVER_OCCURS_FIRST'
        },
        currentAirframeFH: 10100,
        currentDate: '2026-03-01',
        lastComplianceDate: '2026-02-15',
        lastComplianceFH: 10000,
        cycleCount: 1
      });

      expect(calcResult.calculationStatus).toBe('SUCCESS');
      expect(calcResult.counters.lastComplianceFH).toBe(10000);
      expect(calcResult.counters.lastComplianceDate).toBe('2026-02-15');

      // Next due FH: 10,000 + 500 = 10,500 FH
      expect(calcResult.flightHoursLimit?.dueFH).toBe(10500);

      // Next due Date: 2026-02-15 + 60 days = 2026-04-16
      expect(calcResult.calendarLimit?.dueDate).toBe('2026-04-16');

      // Controlling limit is determined by the engine
      expect(['FLIGHT_HOURS', 'CALENDAR_DAYS']).toContain(calcResult.controllingLimit);
      expect(calcResult.composition.operator).toBe('WHICHEVER_OCCURS_FIRST');
    });
  });

  // =========================================================================
  // AIRWORTHINESS INDEPENDENCE (PHASE 6.4.1 MANDATES)
  // =========================================================================
  describe('Airworthiness Independence (Compliance vs Operational Airworthiness)', () => {

    it('maintains strict separation: REVIEW_REQUIRED does not automatically ground aircraft without authorized rule', () => {
      const obl = complianceObligationService.createOrUpdateObligation({
        requirement: repetitiveRequirement,
        aircraft: testAircraftA,
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasoning: ['Model match Boeing 737-800'],
        mandatedAction: repetitiveRequirement.mandatedActions![0],
        actor: 'CAMO-Tester'
      });

      // Force REVIEW_REQUIRED
      camoDb.update(state => {
        const target = state.obligations.find(o => o.id === obl.id);
        if (target) {
          target.status = 'REVIEW_REQUIRED';
          target.reviewState.requiresHumanReview = true;
          target.reviewState.reviewReasons = ['Ambiguous task card revision'];
        }
      });

      // Evaluate WITHOUT operational rule: NOT_DETERMINED, canFly = null, isGrounded = false
      const assessmentWithoutRule = fleetAirworthinessControlEngine.assessAircraftAirworthiness(testAircraftA.id, {
        aircraft: testAircraftA
      });

      expect(assessmentWithoutRule.complianceStatus).toBe('PENDING_REVIEW');
      expect(assessmentWithoutRule.airworthinessStatus).toBe('NOT_DETERMINED');
      expect(assessmentWithoutRule.canFly).toBeNull();
      expect(assessmentWithoutRule.isGrounded).toBe(false);

      // Evaluate WITH authorized SOP rule: MAINTENANCE_HOLD
      const assessmentWithRule = fleetAirworthinessControlEngine.assessAircraftAirworthiness(testAircraftA.id, {
        aircraft: testAircraftA,
        operationalRule: FleetAirworthinessControlEngine.AUTHORIZED_RULES.CAMO_DISCREPANCY_HOLD
      });

      expect(assessmentWithRule.airworthinessStatus).toBe('MAINTENANCE_HOLD');
      expect(assessmentWithRule.canFly).toBe(false);
      expect(assessmentWithRule.isGrounded).toBe(false);
    });
  });

  // =========================================================================
  // PERSISTÊNCIA REAL (DURABLE camoDb CONSISTENCY)
  // =========================================================================
  describe('Persistência Real (Durable camoDb Consistency)', () => {

    it('persists recurrence, terminating action, and supersedence states durably across snapshot re-queries', () => {
      // 1. Create and execute repetitive obligation to NEXT_CYCLE_OPEN
      const repObl = complianceObligationService.createOrUpdateObligation({
        requirement: repetitiveRequirement,
        aircraft: testAircraftA,
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasoning: ['Model match Boeing 737-800'],
        mandatedAction: repetitiveRequirement.mandatedActions![0],
        actor: 'CAMO-Persistence-Tester'
      });

      camoDb.update(state => {
        const ac = state.aircraft.find(a => a.id === testAircraftA.id);
        if (ac) ac.totalFlightHours = 10000;
      });

      complianceObligationService.attachEvidence({
        obligationId: repObl.id,
        evidenceType: 'INSPECTION_RECORD',
        documentReference: 'WO-DURABLE-CYCLE-1',
        description: 'Durable repetitive inspection test.',
        accomplishmentDate: '2026-02-15',
        accomplishmentFH: 10000,
        recordedBy: 'Inspector P',
        verified: true,
        triggerComplianceEvaluation: true
      });

      // 2. Create old obligation and mark as SUPERSEDED
      const oldObl = complianceObligationService.createOrUpdateObligation({
        requirement: oldRequirement,
        aircraft: testAircraftA,
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasoning: ['Model match Boeing 737-800'],
        mandatedAction: oldRequirement.mandatedActions![0],
        actor: 'CAMO-Persistence-Tester'
      });

      complianceObligationService.markSuperseded(
        oldRequirement.id,
        newRequirement.sourceNumber,
        newRequirement.id,
        'CAMO-Persistence-Tester'
      );

      // 3. Perform snapshot re-query from camoDb
      const freshState = camoDb.getState();

      const freshRepObl = freshState.obligations.find(o => o.id === repObl.id);
      expect(freshRepObl).toBeDefined();
      expect(freshRepObl?.status).toBe('NEXT_CYCLE_OPEN');
      expect(freshRepObl?.temporalCounters.cycleCount).toBe(1);
      expect(freshRepObl?.temporalCounters.nextDueFH).toBe(10500);
      expect(freshRepObl?.evidence[0].documentReference).toBe('WO-DURABLE-CYCLE-1');

      const freshOldObl = freshState.obligations.find(o => o.id === oldObl.id);
      expect(freshOldObl).toBeDefined();
      expect(freshOldObl?.status).toBe('SUPERSEDED');
      expect(freshOldObl?.supersedence?.isSuperseded).toBe(true);
      expect(freshOldObl?.supersedence?.supersededByAdNumber).toBe(newRequirement.sourceNumber);

      // Verify audit trail logged both transitions durably
      const auditTrail = freshState.auditTrail || [];
      expect(auditTrail.some(a => a.entityId === repObl.id && a.action === 'OBLIGATION_TRANSITION')).toBe(true);
      expect(auditTrail.some(a => a.entityId === oldObl.id && a.action === 'OBLIGATION_TRANSITION')).toBe(true);
    });
  });

});
