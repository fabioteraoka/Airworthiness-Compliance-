/**
 * CAMO PHASE 9 — END-TO-END INTEGRATION TEST SUITE
 * 
 * Verifies the complete integrated airworthiness intelligence pipeline:
 * REGULATORY SOURCE
 *   ↓
 * REGULATORY DISCOVERY
 *   ↓
 * REGULATORY DOCUMENT / AD
 *   ↓
 * DOCUMENT INTELLIGENCE
 *   ↓
 * COMPLIANCE REQUIREMENT
 *   ↓
 * APPLICABILITY
 *   ↓
 * COMPLIANCE OBLIGATION
 *   ↓
 * DUE DATE / THRESHOLD
 *   ↓
 * EVIDENCE
 *   ↓
 * EVIDENCE VERIFICATION
 *   ↓
 * COMPLIANCE STATUS
 *   ↓
 * AIRCRAFT COMPLIANCE
 *   ↓
 * FLEET COMPLIANCE
 *   ↓
 * OPERATIONAL AIRWORTHINESS
 * 
 * Strict Invariants:
 * 1. Positive Flow: AD -> Requirement -> Applicability -> Obligation -> Due Date -> Evidence -> Verification -> Compliance -> Aircraft -> Fleet -> Airworthiness.
 * 2. Initial State: Uncomplied obligation cannot be assumed COMPLIED; without authorized rule, OVERDUE/REVIEW_REQUIRED is not automatically grounded.
 * 3. Evidence State: Evidence Attached ≠ Evidence Valid ≠ Obligation Complied. Transition to COMPLIED requires VALID verification.
 * 4. Persistence: State is written to and re-queried from camoDb, proving deterministic durability.
 * 5. Traceability: Complete audit lineage from operational airworthiness down to regulatory source.
 * 6. Negative Scenarios: Invalid or incompatible evidence is rejected; direct transitions without proof are blocked.
 * 7. Multi-Aircraft Isolation: Two aircraft of the same type maintain strict independence; compliance proof is never cross-contaminated.
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
import { evaluateComplianceRequirement } from '../server/ruleEngine';
import { 
  Aircraft, 
  ComplianceRequirement, 
  RegulatoryDiscoveryRecord, 
  OfficialDocumentRecord,
  EvidenceType,
  ComplianceObligation
} from '../src/types';

describe('CAMO Phase 9 — End-to-End Integration Pipeline', () => {

  // =========================================================================
  // CONTROLLED TEST ENTITIES
  // =========================================================================
  const testAircraftA: Aircraft = {
    id: 'ac-test-737-01',
    operatorId: 'op-camo-01',
    registration: 'PR-TESTA',
    msn: '10001',
    manufacturer: 'Boeing',
    model: '737-800',
    series: 'NG',
    aircraftType: 'Commercial Transport',
    status: 'OPERATIONAL',
    totalFlightHours: 8000,
    totalCycles: 4000,
    totalLandings: 4000,
    manufactureDate: '2018-05-15'
  };

  const testAircraftB: Aircraft = {
    id: 'ac-test-737-02',
    operatorId: 'op-camo-01',
    registration: 'PR-TESTB',
    msn: '10002',
    manufacturer: 'Boeing',
    model: '737-800',
    series: 'NG',
    aircraftType: 'Commercial Transport',
    status: 'OPERATIONAL',
    totalFlightHours: 6500,
    totalCycles: 3200,
    totalLandings: 3200,
    manufactureDate: '2019-08-20'
  };

  const adDiscoveryRecord: RegulatoryDiscoveryRecord = {
    id: 'disc-2026-09001',
    source: 'FEDERAL_REGISTER',
    documentNumber: '2026-09001',
    adNumber: 'FAA AD 2026-09-01',
    title: 'Airworthiness Directives; The Boeing Company Model 737-800 Series Airplanes - Fuselage High Pressure Duct Skin NDT Ultrasonic Inspection',
    action: 'Final Rule',
    publicationDate: '2026-01-15',
    effectiveDate: '2026-02-01',
    authority: 'FAA',
    make: 'Boeing',
    models: ['737-800'],
    abstract: 'FAA adopts a new airworthiness directive for all Boeing Model 737-800 airplanes requiring repetitive ultrasonic inspection of high pressure duct skins to detect fatigue cracking.',
    firstDiscoveredAt: '2026-01-15T08:00:00.000Z',
    lastSeenAt: '2026-01-15T08:00:00.000Z',
    discoveryStatus: 'NEW',
    htmlUrl: 'https://www.federalregister.gov/documents/2026-09001',
    pdfUrl: 'https://www.federalregister.gov/documents/2026-09001.pdf',
    provenanceMap: {
      documentNumber: { origin: 'SOURCE_FIELD', confidence: 100, rawValue: '2026-09001' },
      adNumber: { origin: 'SOURCE_FIELD', confidence: 100, rawValue: 'FAA AD 2026-09-01' },
      authority: { origin: 'SOURCE_FIELD', confidence: 100, rawValue: 'FAA' }
    } as any,
    sourcePayloadReference: 'fedreg-payload-2026-09001'
  };

  const officialAcquiredDoc: OfficialDocumentRecord = {
    id: 'acq-2026-09001',
    sourceReference: '2026-09001',
    source: 'FEDERAL_REGISTER',
    authority: 'FAA',
    documentNumber: '2026-09001',
    adNumber: 'FAA AD 2026-09-01',
    fileName: '2026-09001.pdf',
    fileSizeBytes: 245760,
    mimeType: 'application/pdf',
    sha256: '9f83c605d4458b3e6e8e899b867c293774889c1753c1507d8d479a96e95b0561',
    originalUrl: 'https://www.federalregister.gov/documents/2026-09001.pdf',
    finalUrl: 'https://www.federalregister.gov/documents/2026-09001.pdf',
    retrievedAt: '2026-01-15T08:05:00.000Z',
    retrievalStatus: 'DOWNLOADED',
    isOfficialSource: true,
    validationStatus: 'VALID',
    createdAt: '2026-01-15T08:05:00.000Z'
  };

  const structuredRequirement: ComplianceRequirement = {
    id: 'cr-2026-09-01',
    sourceType: 'AD',
    sourceNumber: 'FAA AD 2026-09-01',
    revision: 'Original Issue',
    title: 'Boeing 737-800 Series: Fuselage High Pressure Duct Skin NDT Ultrasonic Inspection',
    issuingAuthority: 'FAA',
    issueDate: '2026-01-15',
    effectiveDate: '2026-02-01',
    emergencyAd: false,
    status: 'APPROVED',
    createdBy: 'CAMO Automated Compliance Pipeline (Phase 5.3.1)',
    updatedBy: 'CAMO Automated Compliance Pipeline (Phase 5.3.1)',
    applicabilityRule: {
      id: 'rule-cr-2026-09-01',
      complianceRequirementId: 'cr-2026-09-01',
      aircraftManufacturers: ['Boeing'],
      aircraftModels: ['737-800'],
      componentPartNumbers: [],
      rawText: 'This AD applies to all The Boeing Company Model 737-800 airplanes, certificated in any category.'
    },
    requirementDetails: {
      initialThreshold: 'Within 500 flight hours or 90 days after the effective date of this AD, whichever occurs first.',
      complianceTime: '500 FH / 90 Days',
      requiredInspection: 'High-frequency ultrasonic and eddy-current inspection of the fuselage high pressure duct skins in accordance with Boeing Alert SB 737-53A1420.'
    },
    mandatedActions: [
      {
        id: 'act-2026-09-01-1',
        paragraphReference: 'Paragraph (g)(1)',
        actionType: 'ONE_TIME_INSPECTION',
        description: 'Perform ultrasonic inspection of the fuselage high pressure duct skins in accordance with Boeing Alert SB 737-53A1420.',
        sequence: 1,
        accomplishmentReference: { documentReference: 'Boeing Alert Service Bulletin 737-53A1420' },
        complianceThreshold: {
          thresholdType: 'CALENDAR_DAYS',
          thresholdValue: 365,
          rawDescription: 'Within 365 days after the effective date of this AD'
        }
      }
    ],
    sourceDocument: {
      fileName: officialAcquiredDoc.fileName,
      fileSize: officialAcquiredDoc.fileSizeBytes,
      mimeType: officialAcquiredDoc.mimeType,
      documentHash: officialAcquiredDoc.sha256,
      rawExtractedText: 'DEPARTMENT OF TRANSPORTATION Federal Aviation Administration 14 CFR Part 39 AD 2026-09-01...'
    },
    documentProcessingStatus: 'EXTRACTED',
    extractionStatus: 'SUCCESS',
    createdAt: '2026-01-15T08:10:00.000Z',
    updatedAt: '2026-01-15T08:10:00.000Z'
  };

  beforeEach(() => {
    // Reset database to initial seed
    camoDb.resetToSeed();

    // Configure controlled test fleet in camoDb
    camoDb.update(state => {
      // Remove any leftover test aircraft and insert test entities
      state.aircraft = state.aircraft.filter(a => a.id !== testAircraftA.id && a.id !== testAircraftB.id);
      state.aircraft.push(testAircraftA, testAircraftB);

      // Clean test requirements and obligations
      state.requirements = state.requirements.filter(r => r.id !== structuredRequirement.id);
      state.obligations = state.obligations.filter(o => o.complianceRequirementId !== structuredRequirement.id);
      state.discoveryRecords = (state.discoveryRecords || []).filter(d => d.id !== adDiscoveryRecord.id);
      state.acquiredDocuments = (state.acquiredDocuments || []).filter(d => d.id !== officialAcquiredDoc.id);
      state.evidence = (state.evidence || []).filter(e => e.complianceRequirementId !== structuredRequirement.id);
    });
  });

  // =========================================================================
  // 1. POSITIVE END-TO-END FLOW: FROM SOURCE TO FLEET AIRWORTHINESS
  // =========================================================================
  describe('1. Positive End-to-End Flow (Regulatory Source to Operational Airworthiness)', () => {

    it('executes the full chain and validates state transitions with deterministic accuracy', () => {
      // ---------------------------------------------------------------------
      // ETAPA 1 & 2: REGULATORY SOURCE -> REGULATORY DISCOVERY -> OFFICIAL ACQUISITION
      // ---------------------------------------------------------------------
      camoDb.update(state => {
        state.discoveryRecords.push(adDiscoveryRecord);
        state.acquiredDocuments.push(officialAcquiredDoc);
      });

      const registeredDiscovery = camoDb.getState().discoveryRecords.find(d => d.id === adDiscoveryRecord.id);
      const registeredAcqDoc = camoDb.getState().acquiredDocuments.find(d => d.id === officialAcquiredDoc.id);

      expect(registeredDiscovery).toBeDefined();
      expect(registeredDiscovery?.source).toBe('FEDERAL_REGISTER');
      expect(registeredDiscovery?.documentNumber).toBe('2026-09001');
      expect(registeredDiscovery?.authority).toBe('FAA');

      expect(registeredAcqDoc).toBeDefined();
      expect(registeredAcqDoc?.validationStatus).toBe('VALID');
      expect(registeredAcqDoc?.sha256).toBe(officialAcquiredDoc.sha256);
      expect(registeredAcqDoc?.isOfficialSource).toBe(true);

      // ---------------------------------------------------------------------
      // ETAPA 3 & 4: DOCUMENT INTELLIGENCE -> REQUIREMENT STRUCTURING
      // ---------------------------------------------------------------------
      camoDb.update(state => {
        state.requirements.unshift(structuredRequirement);
      });

      const storedReq = camoDb.getState().requirements.find(r => r.id === structuredRequirement.id);
      expect(storedReq).toBeDefined();
      expect(storedReq?.sourceNumber).toBe('FAA AD 2026-09-01');
      expect(storedReq?.mandatedActions).toHaveLength(1);
      expect(storedReq?.mandatedActions?.[0].actionType).toBe('ONE_TIME_INSPECTION');

      // ---------------------------------------------------------------------
      // ETAPA 5 & 6: RULE ENGINE APPLICABILITY & COMPLIANCE OBLIGATION CREATION (State 1)
      // ---------------------------------------------------------------------
      const evalResult = evaluateComplianceRequirement(structuredRequirement, {
        aircraft: [testAircraftA, testAircraftB],
        engines: [],
        components: [],
        installations: [],
        knowledgeFacts: [],
        existingQuestions: []
      });

      expect(evalResult.assessments).toHaveLength(2);
      const assessmentA = evalResult.assessments.find(a => a.entityId === testAircraftA.id);
      const assessmentB = evalResult.assessments.find(a => a.entityId === testAircraftB.id);

      expect(assessmentA?.result).toBe('APPLICABLE');
      expect(assessmentB?.result).toBe('APPLICABLE');

      // Synchronize into Compliance Obligations
      const obligationA = complianceObligationService.createOrUpdateObligation({
        requirement: structuredRequirement,
        aircraft: testAircraftA,
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasoning: assessmentA!.reasoning,
        applicabilityAssessmentId: assessmentA!.id,
        mandatedAction: structuredRequirement.mandatedActions![0],
        actor: 'Phase9-E2E-Integration-Test'
      });

      // ---------------------------------------------------------------------
      // VERIFICAÇÃO DO PRIMEIRO ESTADO (State 1: Sem Evidência)
      // ---------------------------------------------------------------------
      expect(obligationA).toBeDefined();
      expect(obligationA.aircraftId).toBe(testAircraftA.id);
      expect(obligationA.targetEntity.aircraftRegistration).toBe('PR-TESTA');
      expect(obligationA.targetEntity.aircraftMsn).toBe('10001');
      expect(obligationA.adNumber).toBe('FAA AD 2026-09-01');
      expect(obligationA.applicabilityStatus).toBe('APPLICABLE');

      // Due date & thresholds calculated
      expect(obligationA.temporalCounters).toBeDefined();
      expect(obligationA.temporalCounters.effectiveDate).toBe('2026-02-01');
      const calculatedDueDate = obligationA.temporalCounters.complianceDueDate || obligationA.temporalCounters.nextDueDate || obligationA.temporalCounters.dueDate;
      expect(calculatedDueDate).toBeDefined();
      expect(obligationA.temporalCounters.remainingDays).toBeGreaterThan(0);

      // Status INICIAL NÃO PODE SER COMPLIED!
      expect(obligationA.status).not.toBe('COMPLIED');
      expect(['OPEN', 'DUE_SOON'].includes(obligationA.status)).toBe(true);
      expect(obligationA.evidence).toHaveLength(0);

      // Level 1: Obligation assessment
      const oblAssessment = fleetAirworthinessControlEngine.assessObligation(obligationA, { aircraft: testAircraftA });
      expect(oblAssessment.status).not.toBe('COMPLIED');
      expect(oblAssessment.isBlocking).toBe(false);
      expect(oblAssessment.isAirworthy).toBe(true);

      // Level 3: Aircraft Airworthiness
      const acAssessmentInitial = fleetAirworthinessControlEngine.assessAircraftAirworthiness(
        testAircraftA.id, 
        { aircraft: testAircraftA }
      );
      expect(acAssessmentInitial.complianceStatus).toBe('COMPLIANT'); // Open inside threshold is compliant
      expect(['AIRWORTHY', 'AIRWORTHY_WITH_WARNINGS'].includes(acAssessmentInitial.airworthinessStatus)).toBe(true);
      expect(acAssessmentInitial.canFly).toBe(true);
      expect(acAssessmentInitial.isGrounded).toBe(false); // Invariant: Not automatically grounded!

      // Level 4: Fleet Airworthiness
      const fleetAssessmentInitial = fleetAirworthinessControlEngine.assessFleetAirworthiness({
        aircraftList: [testAircraftA, testAircraftB],
        obligations: [obligationA]
      });
      expect(fleetAssessmentInitial.groundedAircraftCount).toBe(0);
      expect(fleetAssessmentInitial.fleetComplianceStatus).toBe('FLEET_COMPLIANT');
      expect(fleetAssessmentInitial.airworthyAircraftCount).toBe(2);

      // ---------------------------------------------------------------------
      // ETAPA 7 & 8: EVIDENCE SUBMISSION & EVIDENCE VERIFICATION (State 2)
      // ---------------------------------------------------------------------
      const accomplishmentDate = '2026-02-15'; // Between effective date and today
      const accomplishmentFH = 7800; // Realistic FH within airframe total
      const accomplishmentFC = 3900;

      const updatedObligationA = complianceObligationService.attachEvidence({
        obligationId: obligationA.id,
        evidenceType: 'INSPECTION_RECORD',
        documentReference: 'WO-2026-737-01-NDT',
        sourceReference: 'FAA-MRO-CERT-8842',
        description: 'Ultrasonic NDT inspection of fuselage high pressure duct skins performed with no defect found in accordance with Boeing Alert SB 737-53A1420.',
        accomplishmentDate: accomplishmentDate,
        accomplishmentFH: accomplishmentFH,
        accomplishmentFC: accomplishmentFC,
        recordedBy: 'Eng. Marcus Vance (CREA 49102-D)',
        triggerComplianceEvaluation: true,
        metadata: {
          adNumber: 'FAA AD 2026-09-01',
          msn: '10001'
        }
      });

      // ---------------------------------------------------------------------
      // VERIFICAÇÃO DO SEGUNDO ESTADO (State 2: Evidência Válida -> COMPLIED)
      // ---------------------------------------------------------------------
      // 1. Evidência registrada no camoDb
      const storedEvidences = camoDb.getState().evidence.filter(e => e.obligationId === obligationA.id);
      expect(storedEvidences.length).toBeGreaterThanOrEqual(1);
      const attachedEvidence = storedEvidences[0];

      // 2. Associada à aeronave correta
      expect(attachedEvidence.aircraftId).toBe(testAircraftA.id);
      expect(attachedEvidence.targetEntity?.registration).toBe('PR-TESTA');

      // 3. Temporalmente coerente
      expect(attachedEvidence.eventDate).toBe(accomplishmentDate);
      expect(attachedEvidence.eventFlightHours).toBe(accomplishmentFH);
      expect(attachedEvidence.eventFlightHours!).toBeLessThanOrEqual(testAircraftA.totalFlightHours!);

      // 4. Ação compatível com o requisito
      expect(attachedEvidence.evidenceType).toBe('INSPECTION_RECORD');

      // 5. Evidência considerada VALID
      expect(attachedEvidence.verificationStatus).toBe('VALID');
      expect(attachedEvidence.verified).toBe(true);

      // 6. Obrigação considerada COMPLIED somente após validação
      expect(updatedObligationA.status).toBe('COMPLIED');
      expect(updatedObligationA.statusReason).toContain('Obrigação atendida');

      // 7. Histórico preservado (stateTransitions)
      expect(updatedObligationA.stateTransitions.length).toBeGreaterThanOrEqual(2);
      const complTransition = updatedObligationA.stateTransitions.find(t => t.toStatus === 'COMPLIED');
      expect(complTransition).toBeDefined();
      expect(complTransition?.ruleResponsible).toBe('RULE_EVIDENCE_VALID_ON_TIME');

      // 8 & 9 & 10. Atualização de Aircraft e Fleet Airworthiness
      const acAssessmentComplied = fleetAirworthinessControlEngine.assessAircraftAirworthiness(
        testAircraftA.id,
        { aircraft: testAircraftA }
      );
      expect(acAssessmentComplied.complianceStatus).toBe('COMPLIANT');
      expect(acAssessmentComplied.airworthinessStatus).toBe('AIRWORTHY');
      expect(acAssessmentComplied.canFly).toBe(true);
      expect(acAssessmentComplied.isGrounded).toBe(false);
      expect(acAssessmentComplied.compliedObligations).toBe(1);
      expect(acAssessmentComplied.blockingObligations).toHaveLength(0);

      const fleetAssessmentComplied = fleetAirworthinessControlEngine.assessFleetAirworthiness({
        aircraftList: [testAircraftA],
        obligations: [updatedObligationA]
      });
      expect(fleetAssessmentComplied.fleetComplianceStatus).toBe('FLEET_COMPLIANT');
      expect(fleetAssessmentComplied.groundedAircraftCount).toBe(0);
      expect(fleetAssessmentComplied.airworthyAircraftCount).toBe(1);
    });
  });

  // =========================================================================
  // 2. PERSISTENCE & RE-QUERYING INTEGRITY TEST
  // =========================================================================
  describe('2. Persistence & Re-Querying (Durable camoDb Consistency)', () => {

    it('persists state transitions and re-queries consistently without data degradation', () => {
      // 1. Setup requirement & obligation
      camoDb.update(state => {
        state.requirements.unshift(structuredRequirement);
      });

      const obl = complianceObligationService.createOrUpdateObligation({
        requirement: structuredRequirement,
        aircraft: testAircraftA,
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasoning: ['Direct model match Boeing 737-800'],
        mandatedAction: structuredRequirement.mandatedActions![0],
        actor: 'Persistence-Test-Runner'
      });

      // 2. Attach valid compliance evidence
      complianceObligationService.attachEvidence({
        obligationId: obl.id,
        evidenceType: 'INSPECTION_RECORD',
        documentReference: 'WO-PERSISTENCE-TEST-001',
        description: 'Ultrasonic inspection per SB 737-53A1420 accomplished.',
        accomplishmentDate: '2026-02-10',
        accomplishmentFH: 7500,
        recordedBy: 'Eng. Persistence Test',
        triggerComplianceEvaluation: true,
        metadata: {
          adNumber: 'FAA AD 2026-09-01',
          msn: '10001'
        }
      });

      // 3. Query state afresh from camoDb (simulating re-query)
      const freshState = camoDb.getState();
      const persistedObl = freshState.obligations.find(o => o.id === obl.id);
      const persistedEv = freshState.evidence.find(e => e.obligationId === obl.id);

      expect(persistedObl).toBeDefined();
      expect(persistedObl?.status).toBe('COMPLIED');
      expect(persistedObl?.targetEntity.aircraftRegistration).toBe('PR-TESTA');
      expect(persistedObl?.evidence).toHaveLength(1);
      expect(persistedObl?.evidence[0].verificationStatus).toBe('VALID');

      expect(persistedEv).toBeDefined();
      expect(persistedEv?.verificationStatus).toBe('VALID');
      expect(persistedEv?.documentHash).toBeDefined();
      expect(persistedEv?.verificationHash).toBeDefined();

      // Recalculating airworthiness from fresh state produces strictly identical assessment
      const assessmentA = fleetAirworthinessControlEngine.assessAircraftAirworthiness(testAircraftA.id, {
        aircraft: testAircraftA,
        obligations: freshState.obligations
      });
      expect(assessmentA.complianceStatus).toBe('COMPLIANT');
      expect(assessmentA.airworthinessStatus).toBe('AIRWORTHY');
      expect(assessmentA.auditHash).toBeDefined();
    });
  });

  // =========================================================================
  // 3. FULL AUDIT LINEAGE & TRACEABILITY
  // =========================================================================
  describe('3. End-to-End Audit Lineage & Traceability', () => {

    it('verifies an unbroken chain of custody from final operational airworthiness down to regulatory source', () => {
      // 1. Setup complete chain
      camoDb.update(state => {
        state.discoveryRecords.push(adDiscoveryRecord);
        state.acquiredDocuments.push(officialAcquiredDoc);
        state.requirements.unshift(structuredRequirement);
      });

      const obl = complianceObligationService.createOrUpdateObligation({
        requirement: structuredRequirement,
        aircraft: testAircraftA,
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasoning: ['Traceability verification rule'],
        mandatedAction: structuredRequirement.mandatedActions![0],
        actor: 'Audit-Traceability-Agent'
      });

      complianceObligationService.attachEvidence({
        obligationId: obl.id,
        evidenceType: 'INSPECTION_RECORD',
        documentReference: 'WO-TRACEABILITY-77',
        description: 'Complete ultrasonic inspection accomplished with CRS release.',
        accomplishmentDate: '2026-02-12',
        accomplishmentFH: 7600,
        recordedBy: 'Inspector Chief',
        triggerComplianceEvaluation: true,
        metadata: {
          adNumber: 'FAA AD 2026-09-01',
          msn: '10001'
        }
      });

      const airworthiness = fleetAirworthinessControlEngine.assessAircraftAirworthiness(testAircraftA.id, {
        aircraft: testAircraftA
      });

      // 2. TRACEABILITY VERIFICATION CHAIN:
      // Airworthiness -> Aircraft
      expect(airworthiness.aircraftId).toBe(testAircraftA.id);
      expect(airworthiness.registration).toBe('PR-TESTA');

      // Airworthiness -> Obligation
      const finalObl = camoDb.getState().obligations.find(o => o.id === obl.id);
      expect(finalObl).toBeDefined();
      expect(finalObl?.status).toBe('COMPLIED');

      // Obligation -> Evidence Link -> Evidence Entity
      expect(finalObl?.evidence).toHaveLength(1);
      const evLink = finalObl!.evidence[0];
      const evEntity = camoDb.getState().evidence.find(e => e.id === evLink.evidenceId);
      expect(evEntity).toBeDefined();
      expect(evEntity?.verificationStatus).toBe('VALID');
      expect(evEntity?.auditTrail).toBeDefined();
      expect(evEntity?.auditTrail?.length).toBeGreaterThan(0);

      // Obligation -> Mandated Action -> Requirement
      expect(finalObl?.complianceRequirementId).toBe(structuredRequirement.id);
      const finalReq = camoDb.getState().requirements.find(r => r.id === structuredRequirement.id);
      expect(finalReq).toBeDefined();
      expect(finalReq?.sourceNumber).toBe('FAA AD 2026-09-01');

      // Requirement -> Source Document -> Acquired Document
      expect(finalReq?.sourceDocument?.documentHash).toBe(officialAcquiredDoc.sha256);
      const acqDoc = camoDb.getState().acquiredDocuments.find(d => d.sha256 === finalReq?.sourceDocument?.documentHash);
      expect(acqDoc).toBeDefined();
      expect(acqDoc?.documentNumber).toBe('2026-09001');

      // Acquired Document -> Regulatory Discovery Record -> Regulatory Source
      const discRec = camoDb.getState().discoveryRecords.find(d => d.documentNumber === acqDoc?.documentNumber);
      expect(discRec).toBeDefined();
      expect(discRec?.source).toBe('FEDERAL_REGISTER');
      expect(discRec?.provenanceMap).toBeDefined();

      // No disconnected step: Complete lineage proven!
    });
  });

  // =========================================================================
  // 4. NEGATIVE TESTS: EVIDENCE ATTACHED ≠ EVIDENCE VALID ≠ COMPLIANCE
  // =========================================================================
  describe('4. Negative Scenarios (Rejection of Invalid, Incompatible & Tampered Evidence)', () => {

    let openObligation: ComplianceObligation;

    beforeEach(() => {
      camoDb.update(state => {
        state.requirements.unshift(structuredRequirement);
      });

      openObligation = complianceObligationService.createOrUpdateObligation({
        requirement: structuredRequirement,
        aircraft: testAircraftA,
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasoning: ['Model match Boeing 737-800'],
        mandatedAction: structuredRequirement.mandatedActions![0],
        actor: 'Negative-Test-Setup'
      });
    });

    it('rejects evidence issued for a different aircraft (Entity Mismatch)', () => {
      // Create evidence with targetEntity pointing to a different aircraft (PR-WRONG / MSN 99999)
      const mismatchedEvidence = {
        id: 'ev-wrong-aircraft-test-01',
        obligationId: openObligation.id,
        aircraftId: 'ac-wrong-99',
        entityId: 'ac-wrong-99',
        targetEntity: {
          entityType: 'AIRCRAFT' as const,
          entityId: 'ac-wrong-99',
          registration: 'PR-WRONG',
          serialNumber: '99999'
        },
        evidenceType: 'INSPECTION_RECORD' as const,
        documentReference: 'WO-WRONG-AIRCRAFT-01',
        description: 'Inspection done on wrong aircraft PR-WRONG',
        eventDate: '2026-02-10',
        eventFlightHours: 5000,
        source: 'CAMO_EVIDENCE_ATTACHMENT' as const,
        submittedAt: new Date().toISOString(),
        submittedBy: 'MRO Mechanic',
        verificationStatus: 'PENDING_VALIDATION' as const,
        auditTrail: [],
        version: 1
      };

      // 1. Evidence Verification Engine explicitly rejects mismatched entity
      const verificationResult = evidenceVerificationEngine.verifyEvidence({
        evidence: mismatchedEvidence as any,
        obligation: openObligation,
        aircraft: testAircraftA
      });

      expect(verificationResult.isValid).toBe(false);
      expect(verificationResult.status).toBe('INVALID');
      expect(verificationResult.structuredReasons).toContain('ENTITY_MISMATCH');
      expect(verificationResult.structuredReasons).toContain('WRONG_ENTITY');

      // 2. Probatory set evaluation strictly blocks transition to COMPLIED
      const probatoryResult = evidenceVerificationEngine.evaluateObligationProbatorySet(
        openObligation,
        [mismatchedEvidence as any]
      );
      expect(probatoryResult.canTransitionToComplied).toBe(false);
      expect(probatoryResult.resultingStatus).not.toBe('COMPLIED');

      // 3. Invariant: Obligation status remains uncomplied
      expect(openObligation.status).not.toBe('COMPLIED');
      expect(['OPEN', 'DUE_SOON'].includes(openObligation.status)).toBe(true);
    });

    it('rejects evidence with future accomplishment date (Temporal Contradiction)', () => {
      const updatedObl = complianceObligationService.attachEvidence({
        obligationId: openObligation.id,
        evidenceType: 'INSPECTION_RECORD',
        documentReference: 'WO-FUTURE-DATE',
        description: 'Inspection with date in the future',
        accomplishmentDate: '2099-12-31', // Impossible future date!
        accomplishmentFH: 7000,
        recordedBy: 'MRO Mechanic',
        triggerComplianceEvaluation: true
      });

      const ev = camoDb.getState().evidence.find(e => e.obligationId === openObligation.id);
      expect(ev?.verificationStatus).toBe('INVALID');
      expect(ev?.structuredReviewReasons).toContain('FUTURE_DATE');
      expect(ev?.structuredReviewReasons).toContain('TEMPORAL_INCONSISTENCY');

      // Obligation MUST NOT be COMPLIED
      expect(updatedObl.status).not.toBe('COMPLIED');
    });

    it('rejects evidence with impossible flight hours regression or airframe exceedance', () => {
      const updatedObl = complianceObligationService.attachEvidence({
        obligationId: openObligation.id,
        evidenceType: 'INSPECTION_RECORD',
        documentReference: 'WO-EXCEEDING-FH',
        description: 'Inspection recording 50,000 FH on an 8,000 FH airframe',
        accomplishmentDate: '2026-02-10',
        accomplishmentFH: 50000, // Impossible: Aircraft total is 8000 FH
        recordedBy: 'MRO Mechanic',
        triggerComplianceEvaluation: true
      });

      const ev = camoDb.getState().evidence.find(e => e.obligationId === openObligation.id);
      expect(ev?.verificationStatus).toBe('INVALID');
      expect(ev?.structuredReviewReasons).toContain('COUNTER_REGRESSION');

      expect(updatedObl.status).not.toBe('COMPLIED');
    });

    it('marks standalone PHOTO evidence as INSUFFICIENT for technical inspections, requiring human review', () => {
      const updatedObl = complianceObligationService.attachEvidence({
        obligationId: openObligation.id,
        evidenceType: 'PHOTO' as EvidenceType, // Insufficient for technical ultrasonic inspection
        documentReference: 'PHOTO-DUCT-001.JPG',
        description: 'Photo of the external duct area',
        accomplishmentDate: '2026-02-10',
        recordedBy: 'Inspector',
        triggerComplianceEvaluation: true
      });

      const ev = camoDb.getState().evidence.find(e => e.obligationId === openObligation.id);
      expect(ev?.verificationStatus).toBe('INSUFFICIENT');
      expect(ev?.structuredReviewReasons).toContain('INSUFFICIENT_DOCUMENT');

      // Obligation transitions to REVIEW_REQUIRED, NEVER COMPLIED!
      expect(updatedObl.status).toBe('REVIEW_REQUIRED');
      expect(updatedObl.reviewState.requiresHumanReview).toBe(true);
    });

    it('strictly blocks direct transition to COMPLIED without verified evidence', () => {
      expect(() => {
        complianceObligationService.transitionState({
          obligationId: openObligation.id,
          toStatus: 'COMPLIED',
          reason: 'Manual attempt to force compliance without proof',
          ruleResponsible: 'FORCED_BYPASS',
          actor: 'Unauthorized User',
          skipEvidenceCheck: false
        });
      }).toThrow(/TRANSITION_REJECTED: Cannot transition obligation .* to COMPLIED without verified compliance evidence/);
    });
  });

  // =========================================================================
  // 5. MULTI-AIRCRAFT ISOLATION (ZERO CROSS-CONTAMINATION)
  // =========================================================================
  describe('5. Multi-Aircraft Isolation (Knowledge Reused, Compliance NOT Reused)', () => {

    it('maintains strict independence between two aircraft of identical type and requirement', () => {
      camoDb.update(state => {
        state.requirements.unshift(structuredRequirement);
      });

      // Aircraft A obligation
      const oblA = complianceObligationService.createOrUpdateObligation({
        requirement: structuredRequirement,
        aircraft: testAircraftA,
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasoning: ['Model match 737-800'],
        mandatedAction: structuredRequirement.mandatedActions![0],
        actor: 'Isolation-Test'
      });

      // Aircraft B obligation
      const oblB = complianceObligationService.createOrUpdateObligation({
        requirement: structuredRequirement,
        aircraft: testAircraftB,
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasoning: ['Model match 737-800'],
        mandatedAction: structuredRequirement.mandatedActions![0],
        actor: 'Isolation-Test'
      });

      expect(oblA.id).not.toBe(oblB.id);

      // Comply Aircraft A
      complianceObligationService.attachEvidence({
        obligationId: oblA.id,
        evidenceType: 'INSPECTION_RECORD',
        documentReference: 'WO-PR-TESTA-COMPLIANCE',
        description: 'Ultrasonic inspection completed on PR-TESTA.',
        accomplishmentDate: '2026-02-14',
        accomplishmentFH: 7700,
        recordedBy: 'MRO Lead',
        triggerComplianceEvaluation: true,
        metadata: {
          registration: 'PR-TESTA',
          msn: '10001'
        }
      });

      // Fetch fresh state
      const freshOblA = camoDb.getState().obligations.find(o => o.id === oblA.id);
      const freshOblB = camoDb.getState().obligations.find(o => o.id === oblB.id);

      // Invariant 1: Aircraft A is COMPLIED
      expect(freshOblA?.status).toBe('COMPLIED');
      expect(freshOblA?.evidence).toHaveLength(1);

      // Invariant 2: Aircraft B is COMPLETELY UNAFFECTED and remains uncomplied!
      expect(freshOblB?.status).not.toBe('COMPLIED');
      expect(['OPEN', 'DUE_SOON'].includes(freshOblB!.status)).toBe(true);
      expect(freshOblB?.evidence).toHaveLength(0);

      // Invariant 3: Airworthiness evaluations are strictly independent
      const airworthinessA = fleetAirworthinessControlEngine.assessAircraftAirworthiness(testAircraftA.id, {
        aircraft: testAircraftA
      });
      const airworthinessB = fleetAirworthinessControlEngine.assessAircraftAirworthiness(testAircraftB.id, {
        aircraft: testAircraftB
      });

      expect(airworthinessA.compliedObligations).toBe(1);
      expect(airworthinessA.complianceStatus).toBe('COMPLIANT');

      expect(airworthinessB.compliedObligations).toBe(0);
      expect(airworthinessB.applicableObligations).toBe(1);

      // Invariant 4: Attempting to link Aircraft A's evidence to Aircraft B fails
      const evA = camoDb.getState().evidence.find(e => e.documentReference === 'WO-PR-TESTA-COMPLIANCE');
      expect(evA).toBeDefined();

      const validationForB = evidenceVerificationEngine.verifyEvidence({
        evidence: evA!,
        obligation: freshOblB!,
        aircraft: testAircraftB
      });

      expect(validationForB.isValid).toBe(false);
      expect(validationForB.status).toBe('INVALID');
      expect(validationForB.structuredReasons).toContain('ENTITY_MISMATCH');
      expect(validationForB.structuredReasons).toContain('WRONG_ENTITY');
    });
  });

  // =========================================================================
  // 6. OPERATIONAL AIRWORTHINESS GROUNDING INDEPENDENCE (PHASE 6.4.1 MANDATES)
  // =========================================================================
  describe('6. Operational Airworthiness Grounding Independence (Phase 6.4.1 Mandates)', () => {

    it('does NOT automatically assume aircraft is grounded when an obligation is OVERDUE without an authorized rule', () => {
      // Create an overdue obligation artificially
      camoDb.update(state => {
        state.requirements.unshift(structuredRequirement);
      });

      const obl = complianceObligationService.createOrUpdateObligation({
        requirement: structuredRequirement,
        aircraft: testAircraftA,
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasoning: ['Model match Boeing 737-800'],
        mandatedAction: structuredRequirement.mandatedActions![0],
        actor: 'Overdue-Test'
      });

      // Force status to OVERDUE
      camoDb.update(state => {
        const target = state.obligations.find(o => o.id === obl.id);
        if (target) {
          target.status = 'OVERDUE';
          target.temporalCounters.isOverdue = true;
          target.temporalCounters.remainingDays = -10;
        }
      });

      // Assess WITHOUT authorized rule
      const assessmentWithoutRule = fleetAirworthinessControlEngine.assessAircraftAirworthiness(testAircraftA.id, {
        aircraft: testAircraftA
      });

      // Compliance is NON_COMPLIANT and blocking
      expect(assessmentWithoutRule.complianceStatus).toBe('NON_COMPLIANT');
      expect(assessmentWithoutRule.blockingObligations.length).toBeGreaterThan(0);

      // BUT operational airworthiness is NOT_DETERMINED!
      expect(assessmentWithoutRule.airworthinessStatus).toBe('NOT_DETERMINED');
      expect(assessmentWithoutRule.canFly).toBeNull(); // Strictly null
      expect(assessmentWithoutRule.isGrounded).toBe(false); // Invariant: Never assume grounded automatically!
      expect(assessmentWithoutRule.decisionSource).toBe('NOT_DETERMINED');
      expect(assessmentWithoutRule.decisionRule).toBe('NO_AUTHORIZED_OPERATIONAL_RULE');

      // Assess WITH authorized rule: FAR_39_MANDATORY_GROUNDING
      const far39Rule = FleetAirworthinessControlEngine.AUTHORIZED_RULES.FAR_39_MANDATORY_GROUNDING;
      const assessmentWithRule = fleetAirworthinessControlEngine.assessAircraftAirworthiness(testAircraftA.id, {
        aircraft: testAircraftA,
        operationalRule: far39Rule
      });

      // Operational rule now authorizes GROUNDED
      expect(assessmentWithRule.airworthinessStatus).toBe('GROUNDED');
      expect(assessmentWithRule.canFly).toBe(false);
      expect(assessmentWithRule.isGrounded).toBe(true);
      expect(assessmentWithRule.decisionSource).toBe('REGULATORY_REQUIREMENT');
      expect(assessmentWithRule.decisionRule).toBe('FAR_39_MANDATORY_GROUNDING');
    });

    it('does NOT automatically assume aircraft is grounded when an obligation is REVIEW_REQUIRED without an authorized rule', () => {
      camoDb.update(state => {
        state.requirements.unshift(structuredRequirement);
      });

      const obl = complianceObligationService.createOrUpdateObligation({
        requirement: structuredRequirement,
        aircraft: testAircraftA,
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasoning: ['Model match Boeing 737-800'],
        mandatedAction: structuredRequirement.mandatedActions![0],
        actor: 'Review-Test'
      });

      // Force status to REVIEW_REQUIRED
      camoDb.update(state => {
        const target = state.obligations.find(o => o.id === obl.id);
        if (target) {
          target.status = 'REVIEW_REQUIRED';
          target.reviewState.requiresHumanReview = true;
          target.reviewState.reviewReasons = ['Data ambiguity in manual paragraph'];
        }
      });

      // Assess WITHOUT authorized rule
      const assessmentWithoutRule = fleetAirworthinessControlEngine.assessAircraftAirworthiness(testAircraftA.id, {
        aircraft: testAircraftA
      });

      expect(assessmentWithoutRule.complianceStatus).toBe('PENDING_REVIEW');
      expect(assessmentWithoutRule.airworthinessStatus).toBe('NOT_DETERMINED');
      expect(assessmentWithoutRule.canFly).toBeNull();
      expect(assessmentWithoutRule.isGrounded).toBe(false);

      // Assess WITH authorized procedure: CAMO_DISCREPANCY_HOLD
      const camoHoldRule = FleetAirworthinessControlEngine.AUTHORIZED_RULES.CAMO_DISCREPANCY_HOLD;
      const assessmentWithRule = fleetAirworthinessControlEngine.assessAircraftAirworthiness(testAircraftA.id, {
        aircraft: testAircraftA,
        operationalRule: camoHoldRule
      });

      expect(assessmentWithRule.airworthinessStatus).toBe('MAINTENANCE_HOLD');
      expect(assessmentWithRule.canFly).toBe(false);
      expect(assessmentWithRule.isGrounded).toBe(false); // Maintenance hold is not grounded!
      expect(assessmentWithRule.decisionSource).toBe('APPROVED_CAMO_PROCEDURE');
      expect(assessmentWithRule.decisionRule).toBe('CAMO_SOP_04_DISCREPANCY_HOLD');
    });
  });

});
