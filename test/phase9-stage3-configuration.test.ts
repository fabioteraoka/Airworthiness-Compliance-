/**
 * CAMO PHASE 9 — ETAPA 3: CONFIGURAÇÃO REAL DA AERONAVE, RECÁLCULO DE COMPLIANCE & INTEGRIDADE FÍSICA
 * 
 * Verifies:
 * 1. Cenário A — Troca de Componente / Part Number / Serial Number:
 *    - Aircraft with component X installed (AD applies to X).
 *    - Compliance recorded for component X.
 *    - Component X removed and replaced by component Y (different P/N, not affected).
 *    - Re-evaluation: AD no longer applies to current physical configuration;
 *    - Historical compliance of X preserved; Y does not inherit obligations.
 * 2. Cenário B — Recálculo por Horas, Ciclos ou Calendário (Drift-Free & Idempotent):
 *    - Repetitive interval with 500 FH and 180 Days.
 *    - Compliance at real event (e.g. 10,000 FH, 5,000 FC, 2024-01-15).
 *    - Airframe evolution (10,200 FH -> 10,450 FH -> 10,510 FH).
 *    - Next due fixed on real accomplishment (10,000 + 500 = 10,500 FH).
 *    - Remaining decreases proportionally without drift (300 FH -> 50 FH -> -10 FH).
 *    - Status transitions (COMPLIED -> OPEN -> DUE_SOON -> OVERDUE).
 *    - Idempotency and zero duplicate obligations.
 * 3. Cenário C — Avaliação de Motor / Submodelo / Engine Family Isolation:
 *    - CFM56-7B (737NG) vs LEAP-1B (737 MAX).
 *    - Strict engine family isolation: AD for CFM56-7B never affects LEAP-1B.
 *    - No false positive by model proximity (737-8 vs 737-800).
 * 4. Cenários Negativos de Configuração e Integridade Física:
 *    - Future date rejected with FUTURE_DATE.
 *    - FH/FC rollback rejected with FH_COUNTER_ROLLBACK / FC_COUNTER_ROLLBACK.
 *    - Evidence executed after component removal rejected with EXECUTION_AFTER_REMOVAL.
 *    - Evidence executed prior to component installation rejected with EXECUTION_PRIOR_TO_INSTALLATION.
 *    - Inconsistent installation records flagged with DATA_INTEGRITY_REVIEW / REVIEW_REQUIRED.
 * 5. Isolamento Multi-Aeronave e Persistência Física no camoDb:
 *    - Configuration change on Aircraft A does not contaminate Aircraft B.
 *    - Complete durability and re-querying across all physical states.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { camoDb } from '../server/dataStore';
import { complianceObligationService } from '../server/camoEngine/complianceObligationService';
import { evidenceVerificationEngine } from '../server/camoEngine/evidenceVerificationEngine';
import { dueDateThresholdEngine } from '../server/camoEngine/dueDateThresholdEngine';
import { evaluateApplicability } from '../server/camoEngine/applicabilityEvaluator';
import { matchesEngineModel, getCanonicalEngineFamily } from '../server/ruleEngine';
import { 
  Aircraft, 
  ComplianceRequirement, 
  ComplianceObligation,
  ApplicabilityRule,
  Component,
  ComponentInstallation,
  Engine
} from '../src/types';

describe('CAMO Phase 9 — Etapa 3: Configuração Real da Aeronave & Recálculo de Compliance', () => {

  const createMockRequirement = (
    base: Partial<ComplianceRequirement> & {
      id: string;
      sourceNumber: string;
      title: string;
      applicabilityRule: ApplicabilityRule;
    }
  ): ComplianceRequirement => {
    return {
      revision: 'Original',
      issueDate: '2023-12-01',
      effectiveDate: '2024-01-01',
      emergencyAd: false,
      issuingAuthority: 'FAA',
      sourceType: 'AD',
      status: 'APPROVED',
      mandatedActions: [],
      createdBy: 'system',
      updatedBy: 'system',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      ...base
    };
  };

  // Controlled test aircraft
  const testAircraftA: Aircraft = {
    id: 'ac-stage3-737-01',
    operatorId: 'op-camo-01',
    registration: 'PR-STG3A',
    msn: '30001',
    manufacturer: 'Boeing',
    model: '737-800',
    series: 'NG',
    aircraftType: 'Commercial Transport',
    status: 'OPERATIONAL',
    totalFlightHours: 9500,
    totalCycles: 4750,
    totalLandings: 4750,
    manufactureDate: '2018-01-10'
  };

  const testAircraftB: Aircraft = {
    id: 'ac-stage3-737-02',
    operatorId: 'op-camo-01',
    registration: 'PR-STG3B',
    msn: '30002',
    manufacturer: 'Boeing',
    model: '737-800',
    series: 'NG',
    aircraftType: 'Commercial Transport',
    status: 'OPERATIONAL',
    totalFlightHours: 8200,
    totalCycles: 4100,
    totalLandings: 4100,
    manufactureDate: '2019-06-15'
  };

  const testAircraftMAX: Aircraft = {
    id: 'ac-stage3-max-03',
    operatorId: 'op-camo-01',
    registration: 'PR-MAX03',
    msn: '43105',
    manufacturer: 'Boeing',
    model: '737-8',
    series: 'MAX',
    aircraftType: 'Commercial Transport',
    status: 'OPERATIONAL',
    totalFlightHours: 3500,
    totalCycles: 1750,
    totalLandings: 1750,
    manufactureDate: '2021-11-20'
  };

  beforeEach(() => {
    // Reset database to initial seed
    camoDb.resetToSeed();

    // Reset base aircraft values
    testAircraftA.totalFlightHours = 9500;
    testAircraftA.totalCycles = 4750;
    testAircraftB.totalFlightHours = 8200;
    testAircraftB.totalCycles = 4100;
    testAircraftMAX.totalFlightHours = 3500;
    testAircraftMAX.totalCycles = 1750;

    // Controlled updates
    camoDb.update(state => {
      state.aircraft = state.aircraft.filter(a => 
        a.id !== testAircraftA.id && 
        a.id !== testAircraftB.id && 
        a.id !== testAircraftMAX.id
      );
      state.aircraft.push({ ...testAircraftA }, { ...testAircraftB }, { ...testAircraftMAX });
    });
  });

  // =========================================================================
  // 1. CENÁRIO A — TROCA DE COMPONENTE / PART NUMBER / SERIAL NUMBER
  // =========================================================================
  describe('1. Cenário A — Troca de Componente / Part Number / Serial Number', () => {

    const adComponentX = createMockRequirement({
      id: 'ad-comp-2024-01',
      sourceNumber: 'AD 2024-01-01',
      title: 'Inspection of Elevator Tab Actuator P/N 12345-01',
      applicabilityRule: {
        id: 'app-comp-01',
        complianceRequirementId: 'ad-comp-2024-01',
        aircraftManufacturers: ['Boeing'],
        aircraftModels: ['737-800'],
        componentPartNumbers: ['12345-01'],
        rawText: 'Applicable to Boeing 737-800 aircraft with Elevator Tab Actuator P/N 12345-01 installed',
        affectedConfiguration: 'Applicable to Boeing 737-800 aircraft with Elevator Tab Actuator P/N 12345-01 installed'
      }
    });

    const compX: Component = {
      id: 'comp-x-01',
      manufacturer: 'Boeing Subcontractor',
      partNumber: '12345-01',
      serialNumber: 'SN-X001',
      componentType: 'FLIGHT_CONTROLS',
      description: 'Elevator Tab Actuator',
      status: 'SERVICEABLE'
    };

    const compY: Component = {
      id: 'comp-y-02',
      manufacturer: 'Improved Systems Inc',
      partNumber: '99999-02',
      serialNumber: 'SN-Y002',
      componentType: 'FLIGHT_CONTROLS',
      description: 'Upgraded Elevator Tab Actuator (Not Affected)',
      status: 'SERVICEABLE'
    };

    it('A1: Initial state — Component X installed, AD is applicable and complied', () => {
      const instX: ComponentInstallation = {
        id: 'inst-x-01',
        componentId: compX.id,
        component: compX,
        aircraftId: testAircraftA.id,
        aircraftRegistration: testAircraftA.registration,
        position: 'Elevator Tab',
        installationDate: '2022-01-10',
        installationHours: 5000,
        installationCycles: 2500,
        currentStatus: 'INSTALLED',
        workOrderRef: 'WO-INITIAL-INSTALL'
      };

      camoDb.update(state => {
        state.components.push(compX, compY);
        state.installations.push(instX);
        state.requirements.push(adComponentX);
      });

      // 1. Initial applicability evaluation
      const appResult = evaluateApplicability(adComponentX, {
        aircraft: testAircraftA,
        engines: [],
        components: [compX],
        installations: [instX]
      });

      expect(appResult.status).toBe('APPLICABLE');
      expect(appResult.confidence).toBe('HIGH');
      expect(appResult.decisionBasis.some(d => d.status === 'SATISFIED' && d.analyzedField === 'components.partNumber')).toBe(true);

      // 2. Create obligation for Component X
      const obligation = complianceObligationService.createOrUpdateObligation({
        requirement: adComponentX,
        aircraft: testAircraftA,
        targetEntity: {
          entityType: 'COMPONENT',
          entityId: compX.id,
          partNumber: compX.partNumber,
          serialNumber: compX.serialNumber,
          position: 'Elevator Tab'
        },
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasoning: ['Component P/N 12345-01 installed on aircraft'],
        actor: 'CAMO-Config-Engineer'
      });

      expect(obligation.targetEntity?.entityType).toBe('COMPONENT');
      expect(obligation.targetEntity?.partNumber).toBe('12345-01');

      // 3. Attach valid evidence to comply obligation
      const updatedObligation = complianceObligationService.attachEvidence({
        obligationId: obligation.id,
        evidenceType: 'AIRCRAFT_LOGBOOK',
        documentReference: 'LOG-COMP-X-01',
        description: 'Inspection of actuator P/N 12345-01 completed satisfactorily',
        accomplishmentDate: '2024-01-15',
        accomplishmentFH: 8000,
        accomplishmentFC: 4000,
        recordedBy: 'Inspector Chief',
        verified: true,
        triggerComplianceEvaluation: true
      });

      expect(['COMPLIED', 'NEXT_CYCLE_OPEN']).toContain(updatedObligation.status);
      expect(updatedObligation.stateTransitions.map(t => t.toStatus)).toContain('COMPLIED');

      // Verify persistence in camoDb
      const savedObl = camoDb.getState().obligations.find(o => o.id === obligation.id);
      expect(savedObl).toBeDefined();
    });

    it('A2: Component X removed and replaced by Component Y — AD becomes NOT_APPLICABLE for current configuration, history preserved', () => {
      // Setup state with Component X historical and Component Y current
      const instX_Historical: ComponentInstallation = {
        id: 'inst-x-01',
        componentId: compX.id,
        component: compX,
        aircraftId: testAircraftA.id,
        aircraftRegistration: testAircraftA.registration,
        position: 'Elevator Tab',
        installationDate: '2022-01-10',
        removalDate: '2024-03-01',
        installationHours: 5000,
        installationCycles: 2500,
        currentStatus: 'REMOVED',
        workOrderRef: 'WO-REMOVE-X'
      };

      const instY_Current: ComponentInstallation = {
        id: 'inst-y-02',
        componentId: compY.id,
        component: compY,
        aircraftId: testAircraftA.id,
        aircraftRegistration: testAircraftA.registration,
        position: 'Elevator Tab',
        installationDate: '2024-03-02',
        installationHours: 9700,
        installationCycles: 4850,
        currentStatus: 'INSTALLED',
        workOrderRef: 'WO-INSTALL-Y'
      };

      camoDb.update(state => {
        state.components.push(compX, compY);
        state.installations.push(instX_Historical, instY_Current);
        state.requirements.push(adComponentX);
      });

      // Re-evaluate applicability for PR-STG3A
      const appResult = evaluateApplicability(adComponentX, {
        aircraft: testAircraftA,
        engines: [],
        components: [compX, compY],
        installations: [instX_Historical, instY_Current]
      });

      // AD is NOT_APPLICABLE to current configuration
      expect(appResult.status).toBe('NOT_APPLICABLE');
      expect(appResult.confidence).toBe('HIGH');
      
      // Rationale explicitly notes historical removal and replacement
      const basis = appResult.decisionBasis.find(d => d.analyzedField === 'components.partNumber');
      expect(basis?.status).toBe('NOT_SATISFIED');
      expect(appResult.reasoning.some(r => r.includes('REMOVIDO') && r.includes('99999-02'))).toBe(true);

      // Component Y does NOT have any spurious obligation created for adComponentX
      const allObligations = camoDb.getState().obligations;
      const compYObligations = allObligations.filter(o => o.targetEntity?.entityId === compY.id);
      expect(compYObligations.length).toBe(0);
    });
  });

  // =========================================================================
  // 2. CENÁRIO B — RECÁLCULO POR HORAS, CICLOS OU CALENDÁRIO (DRIFT-FREE)
  // =========================================================================
  describe('2. Cenário B — Recálculo por Horas, Ciclos ou Calendário (Drift-Free & Idempotent)', () => {

    it('B1: Next due calculated strictly from real compliance event (10,000 FH + 500 FH = 10,500 FH)', () => {
      const calc = dueDateThresholdEngine.calculateDue({
        obligationId: 'obl-recalc-01',
        interval: {
          isRepetitive: true,
          intervalType: 'FLIGHT_HOURS',
          intervalValue: 500,
          calendarInterval: { value: 180, unit: 'DAYS' },
          compositionOperator: 'WHICHEVER_OCCURS_FIRST'
        },
        currentAirframeFH: 10000,
        currentDate: '2024-01-15',
        lastComplianceDate: '2024-01-15',
        lastComplianceFH: 10000,
        lastComplianceFC: 5000,
        cycleCount: 1
      });

      expect(calc.calculationStatus).toBe('SUCCESS');
      expect(calc.flightHoursLimit?.dueFH).toBe(10500); // 10,000 + 500
      expect(calc.calendarLimit?.dueDate).toBe('2024-07-13'); // 2024-01-15 + 180 days
      expect(calc.composition.operator).toBe('WHICHEVER_OCCURS_FIRST');
    });

    it('B2: Proportional decrease of remaining counters as airframe evolves (10,200 -> 10,450 -> 10,510 FH)', () => {
      // Step 1: 10,200 FH (remaining = 300 FH)
      const step1 = dueDateThresholdEngine.calculateDue({
        obligationId: 'obl-recalc-step',
        interval: {
          isRepetitive: true,
          intervalType: 'FLIGHT_HOURS',
          intervalValue: 500
        },
        currentAirframeFH: 10200,
        currentDate: '2024-02-15',
        lastComplianceDate: '2024-01-15',
        lastComplianceFH: 10000,
        cycleCount: 1
      });

      expect(step1.flightHoursLimit?.dueFH).toBe(10500);
      expect(step1.flightHoursLimit?.remainingFH).toBe(300); // 10,500 - 10,200
      expect(step1.counters.isOverdue).toBe(false);
      expect(step1.counters.isDueSoon).toBe(false); // 300 > 100 FH threshold

      // Step 2: 10,450 FH (remaining = 50 FH -> DUE_SOON)
      const step2 = dueDateThresholdEngine.calculateDue({
        obligationId: 'obl-recalc-step',
        interval: {
          isRepetitive: true,
          intervalType: 'FLIGHT_HOURS',
          intervalValue: 500
        },
        currentAirframeFH: 10450,
        currentDate: '2024-03-01',
        lastComplianceDate: '2024-01-15',
        lastComplianceFH: 10000,
        cycleCount: 1
      });

      expect(step2.flightHoursLimit?.dueFH).toBe(10500);
      expect(step2.flightHoursLimit?.remainingFH).toBe(50); // exactly 50 FH remaining
      expect(step2.counters.isDueSoon).toBe(true);
      expect(step2.counters.isOverdue).toBe(false);

      // Step 3: 10,510 FH (remaining = -10 FH -> OVERDUE)
      const step3 = dueDateThresholdEngine.calculateDue({
        obligationId: 'obl-recalc-step',
        interval: {
          isRepetitive: true,
          intervalType: 'FLIGHT_HOURS',
          intervalValue: 500
        },
        currentAirframeFH: 10510,
        currentDate: '2024-03-15',
        lastComplianceDate: '2024-01-15',
        lastComplianceFH: 10000,
        cycleCount: 1
      });

      expect(step3.flightHoursLimit?.dueFH).toBe(10500);
      expect(step3.flightHoursLimit?.remainingFH).toBe(-10); // overdue by 10 FH
      expect(step3.counters.isOverdue).toBe(true);
    });

    it('B3: Strict idempotency across multiple recalculations with identical inputs', () => {
      const input = {
        obligationId: 'obl-recalc-idem',
        interval: {
          isRepetitive: true,
          intervalType: 'FLIGHT_HOURS' as const,
          intervalValue: 500
        },
        currentAirframeFH: 10350,
        currentDate: '2024-02-20',
        lastComplianceDate: '2024-01-15',
        lastComplianceFH: 10000,
        cycleCount: 1
      };

      const calc1 = dueDateThresholdEngine.calculateDue(input);
      const calc2 = dueDateThresholdEngine.calculateDue(input);
      const calc3 = dueDateThresholdEngine.calculateDue(input);

      expect(calc1.counters.calculationInputHash).toBe(calc2.counters.calculationInputHash);
      expect(calc2.counters.calculationInputHash).toBe(calc3.counters.calculationInputHash);
      expect(calc1.flightHoursLimit?.remainingFH).toBe(calc2.flightHoursLimit?.remainingFH);
      expect(calc1.flightHoursLimit?.dueFH).toBe(calc3.flightHoursLimit?.dueFH);
    });
  });

  // =========================================================================
  // 3. CENÁRIO C — AVALIAÇÃO DE MOTOR / SUBMODELO / ENGINE FAMILY ISOLATION
  // =========================================================================
  describe('3. Cenário C — Avaliação de Motor / Submodelo / Engine Family Isolation', () => {

    const engineCFM56: Engine = {
      id: 'eng-cfm-01',
      aircraftId: testAircraftA.id,
      manufacturer: 'CFM International',
      model: 'CFM56-7B26',
      engineFamily: 'CFM56-7B',
      serialNumber: '894120',
      position: 'Pos 1 - Left',
      totalHours: 9500,
      totalCycles: 4750,
      status: 'INSTALLED'
    };

    const engineLEAP: Engine = {
      id: 'eng-leap-02',
      aircraftId: testAircraftMAX.id,
      manufacturer: 'CFM International',
      model: 'LEAP-1B28',
      engineFamily: 'LEAP-1B',
      serialNumber: '920150',
      position: 'Pos 1 - Left',
      totalHours: 3500,
      totalCycles: 1750,
      status: 'INSTALLED'
    };

    const adEngineCFM56 = createMockRequirement({
      id: 'ad-eng-cfm-01',
      sourceNumber: 'AD 2024-ENG-01',
      title: 'High Pressure Compressor Rotor Inspection on CFM56-7B Engines',
      effectiveDate: '2024-02-01',
      applicabilityRule: {
        id: 'app-eng-cfm-01',
        complianceRequirementId: 'ad-eng-cfm-01',
        aircraftManufacturers: ['Boeing'],
        aircraftModels: ['737-800', '737-8'],
        engineModels: ['CFM56-7B'],
        componentPartNumbers: [],
        rawText: 'CFM International CFM56-7B series turbofan engines installed on Boeing 737 aircraft',
        affectedConfiguration: 'CFM International CFM56-7B series turbofan engines installed on Boeing 737 aircraft'
      }
    });

    const adEngineLEAP = createMockRequirement({
      id: 'ad-eng-leap-02',
      sourceNumber: 'AD 2024-ENG-02',
      title: 'Low Pressure Turbine Inspection on LEAP-1B Engines',
      effectiveDate: '2024-03-01',
      applicabilityRule: {
        id: 'app-eng-leap-02',
        complianceRequirementId: 'ad-eng-leap-02',
        aircraftManufacturers: ['Boeing'],
        aircraftModels: ['737-8', '737-9'],
        engineModels: ['LEAP-1B'],
        componentPartNumbers: [],
        rawText: 'CFM International LEAP-1B engines installed on 737 MAX',
        affectedConfiguration: 'CFM International LEAP-1B engines installed on 737 MAX'
      }
    });

    it('C1: Canonical engine family resolution correctly separates CFM56-7B and LEAP-1B', () => {
      const canonCFM = getCanonicalEngineFamily('CFM56-7B26');
      const canonLEAP = getCanonicalEngineFamily('LEAP-1B28');

      expect(canonCFM.family).toBe('CFM56_7B');
      expect(canonLEAP.family).toBe('LEAP_1B');
      expect(canonCFM.family).not.toBe(canonLEAP.family);

      // Direct matching function check
      expect(matchesEngineModel('CFM International CFM56-7B26', ['CFM56-7B'])).toBe(true);
      expect(matchesEngineModel('CFM International LEAP-1B28', ['CFM56-7B'])).toBe(false);
      expect(matchesEngineModel('CFM International CFM56-7B26', ['LEAP-1B'])).toBe(false);
      expect(matchesEngineModel('CFM International LEAP-1B28', ['LEAP-1B'])).toBe(true);
    });

    it('C2: AD for CFM56-7B applies to 737NG (PR-STG3A) but is NOT_APPLICABLE to 737 MAX (PR-MAX03)', () => {
      camoDb.update(state => {
        state.engines.push(engineCFM56, engineLEAP);
        state.requirements.push(adEngineCFM56);
      });

      // Evaluation for 737NG with CFM56-7B
      const resultNG = evaluateApplicability(adEngineCFM56, {
        aircraft: testAircraftA,
        engines: [engineCFM56],
        components: [],
        installations: []
      });

      expect(resultNG.status).toBe('APPLICABLE');
      expect(resultNG.confidence).toBe('HIGH');

      // Evaluation for 737 MAX with LEAP-1B
      const resultMAX = evaluateApplicability(adEngineCFM56, {
        aircraft: testAircraftMAX,
        engines: [engineLEAP],
        components: [],
        installations: []
      });

      expect(resultMAX.status).toBe('NOT_APPLICABLE');
      expect(resultMAX.confidence).toBe('HIGH');
      expect(resultMAX.reasoning.some(r => r.includes('não coincidem com a família de motores') || r.includes('Isolamento de família'))).toBe(true);
    });

    it('C3: Model proximity guard — 737-8 (MAX) does not collide with 737-800 (NG)', () => {
      // Evaluation of LEAP AD against 737-800
      const resultNG_on_LEAP = evaluateApplicability(adEngineLEAP, {
        aircraft: testAircraftA,
        engines: [engineCFM56],
        components: [],
        installations: []
      });

      expect(resultNG_on_LEAP.status).toBe('NOT_APPLICABLE');

      // Evaluation of LEAP AD against 737-8 MAX
      const resultMAX_on_LEAP = evaluateApplicability(adEngineLEAP, {
        aircraft: testAircraftMAX,
        engines: [engineLEAP],
        components: [],
        installations: []
      });

      expect(resultMAX_on_LEAP.status).toBe('APPLICABLE');
    });
  });

  // =========================================================================
  // 4. CENÁRIOS NEGATIVOS DE CONFIGURAÇÃO E INTEGRIDADE FÍSICA
  // =========================================================================
  describe('4. Cenários Negativos de Configuração e Integridade Física', () => {

    let testObligation: ComplianceObligation;

    beforeEach(() => {
      testObligation = complianceObligationService.createOrUpdateObligation({
        requirement: createMockRequirement({
          id: 'req-neg-01',
          sourceNumber: 'AD 2024-NEG-01',
          title: 'Negative test obligation',
          effectiveDate: '2023-01-01',
          applicabilityRule: {
            id: 'app-neg-01',
            complianceRequirementId: 'req-neg-01',
            aircraftManufacturers: ['Boeing'],
            aircraftModels: ['737-800'],
            componentPartNumbers: [],
            rawText: 'Boeing 737-800',
            affectedConfiguration: 'Boeing 737-800'
          }
        }),
        aircraft: testAircraftA,
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasoning: ['Direct test assignment'],
        actor: 'CAMO-Tester'
      });
      testObligation.temporalCounters.lastComplianceDate = '2024-01-10';
      testObligation.temporalCounters.lastComplianceFH = 9000;
      testObligation.temporalCounters.lastComplianceFC = 4500;
    });

    it('N1: Future date execution is rejected with FUTURE_DATE / TEMPORAL_INCONSISTENCY', () => {
      const futureDate = new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0]; // +30 days in future

      const validation = evidenceVerificationEngine.verifyEvidence({
        evidence: {
          id: 'ev-future-01',
          obligationId: testObligation.id,
          aircraftId: testAircraftA.id,
          source: 'CAMO_EVIDENCE_ATTACHMENT',
          evidenceType: 'AIRCRAFT_LOGBOOK',
          documentReference: 'LOG-FUTURE-01',
          sourceReference: 'DIR-DOCS',
          description: 'Premature record attempt',
          eventDate: futureDate,
          eventFlightHours: 9200,
          eventFlightCycles: 4600,
          submittedBy: 'Mechanic Impatient',
          verificationStatus: 'PENDING_VALIDATION',
          createdAt: new Date().toISOString()
        },
        obligation: testObligation,
        aircraft: testAircraftA
      });

      expect(validation.isValid).toBe(false);
      expect(validation.status).toBe('INVALID');
      expect(validation.structuredReasons).toContain('FUTURE_DATE');
      expect(validation.structuredReasons).toContain('TEMPORAL_INCONSISTENCY');
    });

    it('N2: FH Counter Rollback (event FH < lastComplianceFH) is rejected with FH_COUNTER_ROLLBACK', () => {
      // Last compliance was 9,000 FH; evidence claims 8,500 FH (regression)
      const validation = evidenceVerificationEngine.verifyEvidence({
        evidence: {
          id: 'ev-rollback-fh-01',
          obligationId: testObligation.id,
          aircraftId: testAircraftA.id,
          source: 'CAMO_EVIDENCE_ATTACHMENT',
          evidenceType: 'AIRCRAFT_LOGBOOK',
          documentReference: 'LOG-ROLLBACK-01',
          sourceReference: 'DIR-DOCS',
          description: 'Corrupted FH entry',
          eventDate: '2024-02-10',
          eventFlightHours: 8500, // REGRESSION! 8500 < 9000
          eventFlightCycles: 4600,
          submittedBy: 'Clerk Error',
          verificationStatus: 'PENDING_VALIDATION',
          createdAt: new Date().toISOString()
        },
        obligation: testObligation,
        aircraft: testAircraftA
      });

      expect(validation.isValid).toBe(false);
      expect(validation.status).toBe('INVALID');
      expect(validation.structuredReasons).toContain('FH_COUNTER_ROLLBACK');
      expect(validation.structuredReasons).toContain('COUNTER_REGRESSION');
    });

    it('N3: FC Counter Rollback (event FC < lastComplianceFC) is rejected with FC_COUNTER_ROLLBACK', () => {
      // Last compliance was 4,500 FC; evidence claims 4,200 FC
      const validation = evidenceVerificationEngine.verifyEvidence({
        evidence: {
          id: 'ev-rollback-fc-01',
          obligationId: testObligation.id,
          aircraftId: testAircraftA.id,
          source: 'CAMO_EVIDENCE_ATTACHMENT',
          evidenceType: 'AIRCRAFT_LOGBOOK',
          documentReference: 'LOG-ROLLBACK-02',
          sourceReference: 'DIR-DOCS',
          description: 'Corrupted FC entry',
          eventDate: '2024-02-10',
          eventFlightHours: 9200,
          eventFlightCycles: 4200, // REGRESSION! 4200 < 4500
          submittedBy: 'Clerk Error',
          verificationStatus: 'PENDING_VALIDATION',
          createdAt: new Date().toISOString()
        },
        obligation: testObligation,
        aircraft: testAircraftA
      });

      expect(validation.isValid).toBe(false);
      expect(validation.status).toBe('INVALID');
      expect(validation.structuredReasons).toContain('FC_COUNTER_ROLLBACK');
      expect(validation.structuredReasons).toContain('COUNTER_REGRESSION');
    });

    it('N4: Compliance execution posterior to component removal is rejected with EXECUTION_AFTER_REMOVAL', () => {
      const compObligation: ComplianceObligation = {
        ...testObligation,
        id: 'obl-comp-removed-01',
        targetEntity: {
          entityType: 'COMPONENT',
          entityId: 'comp-target-01',
          aircraftId: testAircraftA.id,
          partNumber: '11223-01',
          serialNumber: 'SN-REM-01'
        }
      };

      const compInstallation = {
        id: 'inst-removed-01',
        componentId: 'comp-target-01',
        aircraftId: testAircraftA.id,
        installationDate: '2023-01-01',
        removalDate: '2024-01-15', // Component removed on Jan 15
        currentStatus: 'REMOVED'
      };

      // Evidence executed on Feb 01 (AFTER removal!)
      const validation = evidenceVerificationEngine.verifyEvidence({
        evidence: {
          id: 'ev-after-removal-01',
          obligationId: compObligation.id,
          aircraftId: testAircraftA.id,
          source: 'CAMO_EVIDENCE_ATTACHMENT',
          evidenceType: 'MAINTENANCE_RECORD',
          documentReference: 'MR-POST-REM',
          sourceReference: 'DIR-DOCS',
          description: 'Attempted maintenance on removed component',
          eventDate: '2024-02-01', // POSTERIOR TO REMOVAL!
          eventFlightHours: 9400,
          eventFlightCycles: 4700,
          submittedBy: 'Inspector Late',
          verificationStatus: 'PENDING_VALIDATION',
          createdAt: new Date().toISOString()
        },
        obligation: compObligation,
        aircraft: testAircraftA,
        componentInstallation: compInstallation
      });

      expect(validation.isValid).toBe(false);
      expect(validation.status).toBe('INVALID');
      expect(validation.structuredReasons).toContain('EXECUTION_AFTER_REMOVAL');
      expect(validation.structuredReasons).toContain('TEMPORAL_INCONSISTENCY');
    });

    it('N5: Compliance execution prior to component installation is rejected with EXECUTION_PRIOR_TO_INSTALLATION', () => {
      const compObligation: ComplianceObligation = {
        ...testObligation,
        id: 'obl-comp-prior-01',
        targetEntity: {
          entityType: 'COMPONENT',
          entityId: 'comp-target-02',
          aircraftId: testAircraftA.id,
          partNumber: '33445-02',
          serialNumber: 'SN-PR-02'
        }
      };

      const compInstallation = {
        id: 'inst-prior-01',
        componentId: 'comp-target-02',
        aircraftId: testAircraftA.id,
        installationDate: '2024-03-01', // Installed on March 01
        currentStatus: 'INSTALLED'
      };

      // Evidence executed on Jan 10 (PRIOR to installation on aircraft!)
      const validation = evidenceVerificationEngine.verifyEvidence({
        evidence: {
          id: 'ev-prior-inst-01',
          obligationId: compObligation.id,
          aircraftId: testAircraftA.id,
          source: 'CAMO_EVIDENCE_ATTACHMENT',
          evidenceType: 'MAINTENANCE_RECORD',
          documentReference: 'MR-PRE-INST',
          sourceReference: 'DIR-DOCS',
          description: 'Attempted maintenance prior to installation',
          eventDate: '2024-01-10', // PRIOR TO INSTALLATION!
          eventFlightHours: 9100,
          eventFlightCycles: 4550,
          submittedBy: 'Inspector Early',
          verificationStatus: 'PENDING_VALIDATION',
          createdAt: new Date().toISOString()
        },
        obligation: compObligation,
        aircraft: testAircraftA,
        componentInstallation: compInstallation
      });

      expect(validation.isValid).toBe(false);
      expect(validation.status).toBe('INVALID');
      expect(validation.structuredReasons).toContain('EXECUTION_PRIOR_TO_INSTALLATION');
      expect(validation.structuredReasons).toContain('TEMPORAL_INCONSISTENCY');
    });

    it('N6: Corrupted installation record (removalDate < installationDate) triggers DATA_INTEGRITY_REVIEW', () => {
      const corruptedInst: ComponentInstallation = {
        id: 'inst-corrupted-01',
        componentId: 'comp-corrupt-01',
        aircraftId: testAircraftA.id,
        position: 'Flap Track',
        installationDate: '2024-05-01',
        removalDate: '2024-01-01', // REMOVAL BEFORE INSTALLATION!
        installationHours: 9000,
        installationCycles: 4500,
        currentStatus: 'REMOVED'
      };

      const adCorruptedCheck = createMockRequirement({
        id: 'ad-corrupt-check',
        sourceNumber: 'AD 2024-99-99',
        title: 'Check Corrupted Component Installation',
        effectiveDate: '2024-01-01',
        applicabilityRule: {
          id: 'app-corrupt',
          complianceRequirementId: 'ad-corrupt-check',
          aircraftManufacturers: ['Boeing'],
          aircraftModels: ['737-800'],
          componentPartNumbers: ['FLAP-999'],
          rawText: 'Flap track component - Applies to FLAP-999',
          affectedConfiguration: 'Flap track component - Applies to FLAP-999'
        }
      });

      const result = evaluateApplicability(adCorruptedCheck, {
        aircraft: testAircraftA,
        engines: [],
        components: [{
          id: 'comp-corrupt-01',
          manufacturer: 'OEM',
          partNumber: 'FLAP-999',
          serialNumber: 'SN-009',
          componentType: 'FLIGHT_CONTROLS',
          description: 'Flap Track',
          status: 'UNSERVICEABLE'
        }],
        installations: [corruptedInst]
      });

      expect(result.status).toBe('REVIEW_REQUIRED');
      expect(result.missingInformation.some(m => m.includes('corrompidos'))).toBe(true);
    });
  });

  // =========================================================================
  // 5. ISOLAMENTO MULTI-AERONAVE E PERSISTÊNCIA FÍSICA NO CAMODB
  // =========================================================================
  describe('5. Isolamento Multi-Aeronave e Persistência Física no camoDb', () => {

    it('M1: Configuration change on Aircraft A does not contaminate Aircraft B', () => {
      const compForA: Component = {
        id: 'comp-iso-a',
        manufacturer: 'OEM A',
        partNumber: 'ISO-100',
        serialNumber: 'SN-A-100',
        componentType: 'AVIONICS',
        description: 'VHF Transceiver',
        status: 'SERVICEABLE'
      };

      const compForB: Component = {
        id: 'comp-iso-b',
        manufacturer: 'OEM B',
        partNumber: 'ISO-200', // Different P/N!
        serialNumber: 'SN-B-200',
        componentType: 'AVIONICS',
        description: 'VHF Transceiver (Different spec)',
        status: 'SERVICEABLE'
      };

      const instA: ComponentInstallation = {
        id: 'inst-iso-a',
        componentId: compForA.id,
        component: compForA,
        aircraftId: testAircraftA.id,
        aircraftRegistration: testAircraftA.registration,
        position: 'Avionics Bay',
        installationDate: '2023-01-01',
        installationHours: 8000,
        installationCycles: 4000,
        currentStatus: 'INSTALLED'
      };

      const instB: ComponentInstallation = {
        id: 'inst-iso-b',
        componentId: compForB.id,
        component: compForB,
        aircraftId: testAircraftB.id,
        aircraftRegistration: testAircraftB.registration,
        position: 'Avionics Bay',
        installationDate: '2023-01-01',
        installationHours: 7000,
        installationCycles: 3500,
        currentStatus: 'INSTALLED'
      };

      const adIso = createMockRequirement({
        id: 'ad-iso-01',
        sourceNumber: 'AD 2024-ISO-01',
        title: 'Software Upgrade for VHF Transceiver P/N ISO-100',
        effectiveDate: '2024-01-01',
        applicabilityRule: {
          id: 'app-iso-01',
          complianceRequirementId: 'ad-iso-01',
          aircraftManufacturers: ['Boeing'],
          aircraftModels: ['737-800'],
          componentPartNumbers: ['ISO-100'],
          rawText: 'Aircraft equipped with VHF Transceiver P/N ISO-100',
          affectedConfiguration: 'Aircraft equipped with VHF Transceiver P/N ISO-100'
        }
      });

      camoDb.update(state => {
        state.components.push(compForA, compForB);
        state.installations.push(instA, instB);
        state.requirements.push(adIso);
      });

      // Eval A
      const evalA = evaluateApplicability(adIso, {
        aircraft: testAircraftA,
        engines: [],
        components: [compForA],
        installations: [instA]
      });

      // Eval B
      const evalB = evaluateApplicability(adIso, {
        aircraft: testAircraftB,
        engines: [],
        components: [compForB],
        installations: [instB]
      });

      expect(evalA.status).toBe('APPLICABLE');
      expect(evalB.status).toBe('NOT_APPLICABLE');

      // Now swap component on Aircraft A to ISO-200
      instA.currentStatus = 'REMOVED';
      instA.removalDate = '2024-06-01';

      const newCompForA: Component = {
        id: 'comp-iso-a-new',
        manufacturer: 'OEM B',
        partNumber: 'ISO-200',
        serialNumber: 'SN-A-201',
        componentType: 'AVIONICS',
        description: 'Upgraded Transceiver',
        status: 'SERVICEABLE'
      };

      const newInstA: ComponentInstallation = {
        id: 'inst-iso-a-new',
        componentId: newCompForA.id,
        component: newCompForA,
        aircraftId: testAircraftA.id,
        aircraftRegistration: testAircraftA.registration,
        position: 'Avionics Bay',
        installationDate: '2024-06-02',
        installationHours: 9500,
        installationCycles: 4750,
        currentStatus: 'INSTALLED'
      };

      camoDb.update(state => {
        const found = state.installations.find(i => i.id === instA.id);
        if (found) {
          found.currentStatus = 'REMOVED';
          found.removalDate = '2024-06-01';
        }
        state.components.push(newCompForA);
        state.installations.push(newInstA);
      });

      // Re-eval A after swap
      const reEvalA = evaluateApplicability(adIso, {
        aircraft: testAircraftA,
        engines: [],
        components: [compForA, newCompForA],
        installations: [instA, newInstA]
      });

      // Re-eval B
      const reEvalB = evaluateApplicability(adIso, {
        aircraft: testAircraftB,
        engines: [],
        components: [compForB],
        installations: [instB]
      });

      expect(reEvalA.status).toBe('NOT_APPLICABLE'); // Now NOT_APPLICABLE to A
      expect(reEvalB.status).toBe('NOT_APPLICABLE'); // B remains NOT_APPLICABLE without any disturbance
    });

    it('M2: State persistence in camoDb is complete and durable', () => {
      const state = camoDb.getState();
      expect(state.aircraft.length).toBeGreaterThanOrEqual(3);
      expect(state.requirements.length).toBeGreaterThan(0);
      expect(state.installations.length).toBeGreaterThan(0);
      expect(state.components.length).toBeGreaterThan(0);
    });
  });

});
