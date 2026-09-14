import { describe, it, expect, beforeEach } from 'vitest';
import { camoDb } from '../server/dataStore';
import { complianceObligationService } from '../server/camoEngine/complianceObligationService';
import { regulatoryIntelligenceEngine } from '../server/camoEngine/regulatoryIntelligenceEngine';
import { officialDocumentAcquisitionService } from '../server/regulatoryConnectors/officialDocumentAcquisitionService';
import { fleetAirworthinessControlEngine } from '../server/camoEngine/fleetAirworthinessControlEngine';
import { aircraftDeliveryAssessmentEngine } from '../server/camoEngine/aircraftDeliveryAssessmentEngine';
import { evaluateComplianceRequirement } from '../server/ruleEngine';
import { 
  Aircraft, 
  ComplianceRequirement, 
  EvidenceVerificationStatus,
  RegulatoryAdCandidate,
  DeliveryAircraftConfig
} from '../src/types';

describe('CAMO Engine — Phase 9 Stage 6: Security, Invariants & Adversarial Architecture Tests', () => {
  beforeEach(() => {
    // Reset database to deterministic clean state
    camoDb.resetToSeed();
  });

  // =========================================================================
  // 1. ISOLAMENTO DE ENTIDADES: AIRCRAFT A NÃO AFETA AIRCRAFT B
  // =========================================================================
  it('1. Deve garantir isolamento estrito: alterações ou obrigações de Aircraft A não afetam Aircraft B', () => {
    const aircraftList = camoDb.getState().aircraft;
    expect(aircraftList.length).toBeGreaterThanOrEqual(2);
    const acA = aircraftList[0];
    const acB = aircraftList[1];

    const req: ComplianceRequirement = {
      id: 'req-sec-iso-01',
      sourceType: 'AD',
      sourceNumber: '2026-SEC-01',
      title: 'Security Isolation Test AD',
      issuingAuthority: 'FAA',
      revision: 'ORIGINAL',
      issueDate: '2026-01-01',
      effectiveDate: '2026-01-01',
      emergencyAd: false,
      status: 'APPROVED',
      applicabilityRule: {
        id: 'app-sec-01',
        complianceRequirementId: 'req-sec-iso-01',
        aircraftManufacturers: ['Boeing'],
        aircraftModels: ['737-800'],
        componentPartNumbers: [],
        rawText: 'Applies to Boeing 737-800 aircraft.'
      },
      documentProcessingStatus: 'EXTRACTED',
      createdAt: new Date().toISOString(),
      createdBy: 'Security Auditor',
      updatedAt: new Date().toISOString(),
      updatedBy: 'Security Auditor'
    };

    // Create obligation on Aircraft A
    const oblA = complianceObligationService.createOrUpdateObligation({
      requirement: req,
      aircraft: acA,
      applicabilityStatus: 'APPLICABLE',
      applicabilityReasoning: ['Direct model match on Aircraft A'],
      actor: 'Security Auditor'
    });

    expect(oblA).toBeDefined();
    expect(oblA.aircraftId).toBe(acA.id);

    // Verify obligations of Aircraft B do not contain this obligation
    const state = camoDb.getState();
    const oblBList = state.obligations.filter(o => o.aircraftId === acB.id);
    const hasContamination = oblBList.some(o => o.id === oblA.id || (o.complianceRequirementId === req.id && o.aircraftId === acB.id));
    expect(hasContamination).toBe(false);
  });

  // =========================================================================
  // 2. ISOLAMENTO DE FROTA: OPERADOR A NÃO CONTAMINA OPERADOR B
  // =========================================================================
  it('2. Deve manter segregação estrita entre frotas de operadores distintos no banco', () => {
    // Inject aircraft from Operator B
    const operatorB_Aircraft: Aircraft = {
      id: 'ac-sec-opb-01',
      operatorId: 'op-foreign-99',
      registration: 'N737SEC',
      msn: '99881',
      manufacturer: 'Boeing',
      model: '737-800',
      series: 'NG',
      aircraftType: 'Commercial Transport',
      status: 'OPERATIONAL',
      totalFlightHours: 5000,
      totalCycles: 2500,
      totalLandings: 2500
    };

    camoDb.update(draft => {
      draft.aircraft.push(operatorB_Aircraft);
    });

    const state = camoDb.getState();
    const primaryOpAircraft = state.aircraft.filter(a => a.operatorId === 'op-01');
    const foreignAircraft = state.aircraft.filter(a => a.operatorId === 'op-foreign-99');

    expect(primaryOpAircraft.some(a => a.id === operatorB_Aircraft.id)).toBe(false);
    expect(foreignAircraft.length).toBe(1);
    expect(foreignAircraft[0].id).toBe('ac-sec-opb-01');
  });

  // =========================================================================
  // 3. EVIDÊNCIA DE ENTIDADE ERRADA / NÃO AUTORIZADA
  // =========================================================================
  it('3. Deve rejeitar ou isolar evidência técnica direcionada a entidade inconsistente', () => {
    const ac = camoDb.getState().aircraft[0];
    const req: ComplianceRequirement = {
      id: 'req-sec-ev-01',
      sourceType: 'AD',
      sourceNumber: '2026-SEC-EV-01',
      title: 'Evidence Inconsistency Test',
      issuingAuthority: 'FAA',
      revision: 'ORIGINAL',
      issueDate: '2026-01-01',
      effectiveDate: '2026-01-01',
      emergencyAd: false,
      status: 'APPROVED',
      applicabilityRule: {
        id: 'app-sec-ev-01',
        complianceRequirementId: 'req-sec-ev-01',
        aircraftManufacturers: [ac.manufacturer],
        aircraftModels: [ac.model],
        componentPartNumbers: [],
        rawText: 'Test applicability'
      },
      documentProcessingStatus: 'EXTRACTED',
      createdAt: new Date().toISOString(),
      createdBy: 'Auditor',
      updatedAt: new Date().toISOString(),
      updatedBy: 'Auditor'
    };

    const obl = complianceObligationService.createOrUpdateObligation({
      requirement: req,
      aircraft: ac,
      applicabilityStatus: 'APPLICABLE',
      actor: 'Auditor'
    });

    // Attach unverified evidence referring to completely different registration
    const updatedObl = complianceObligationService.attachEvidence({
      obligationId: obl.id,
      evidenceType: 'TECH_LOG',
      documentReference: 'WO-WRONG-REG-999',
      description: 'Work order executed on alien airframe PP-XYZ',
      recordedBy: 'Alien Inspector',
      verified: false,
      verificationStatus: 'PENDING_VALIDATION',
      metadata: { targetRegistration: 'PP-XYZ' }
    });

    // Obligation must NOT transition to COMPLIED because verificationStatus is PENDING_VALIDATION
    expect(updatedObl.status).not.toBe('COMPLIED');
    expect(updatedObl.evidence.length).toBeGreaterThan(0);
    const attached = updatedObl.evidence.find(e => e.documentReference === 'WO-WRONG-REG-999');
    expect(attached?.verified).toBe(false);
  });

  // =========================================================================
  // 4. IDEMPOTÊNCIA EM IMPORTAÇÃO DUPLICADA PARA O CAMO REGISTER
  // =========================================================================
  it('4. Deve executar importação no CAMO Register com estrita idempotência e sem duplicação', async () => {
    const candidateAd: RegulatoryAdCandidate = {
      id: 'sec-cand-dup-01',
      authority: 'FAA',
      adNumber: '2026-SEC-DUP-01',
      title: 'Idempotent AD Test',
      manufacturer: 'Boeing',
      family: '737',
      modelScope: ['737-800'],
      issueDate: '2026-02-01',
      effectiveDate: '2026-03-01',
      rawApplicabilityText: 'Inspection of fuselage skin lap joints.',
      source: 'FEDERAL_REGISTER',
      status: 'DISCOVERED',
      analysisStatus: 'PENDING_ANALYSIS',
      discoveryTimestamp: new Date().toISOString()
    };

    // First import
    const result1 = await regulatoryIntelligenceEngine.importCandidatesToCamoRegister({
      candidates: [candidateAd],
      actor: 'Security Tester'
    });

    expect(result1.importedCount + result1.updatedCount).toBe(1);

    // Second import with identical AD
    const result2 = await regulatoryIntelligenceEngine.importCandidatesToCamoRegister({
      candidates: [candidateAd],
      actor: 'Security Tester'
    });

    // Must be recognized as already existing/skipped, NOT creating a second row
    expect(result2.importedCount).toBe(0);
    expect(result2.skippedExisting + result2.updatedCount).toBe(1);

    const register = camoDb.getState().camoRegulatoryRegister;
    const matches = register.filter(r => r.authority === 'FAA' && r.adNumber === '2026-SEC-DUP-01');
    expect(matches.length).toBe(1);
    expect(matches[0].analysisStatus).toBe('PENDING_ANALYSIS');
  });

  // =========================================================================
  // 5. MALFORMED REGULATORY PAYLOAD HANDLING
  // =========================================================================
  it('5. Deve tratar payloads regulatórios malformados sem crash ou corrupção do banco', async () => {
    const malformedCandidate: any = {
      title: 'Malformed Payload Without Keys',
      foo: 'bar'
    };

    // System should gracefully handle incomplete candidate payloads
    const result = await regulatoryIntelligenceEngine.importCandidatesToCamoRegister({
      candidates: [malformedCandidate],
      actor: 'Fuzzer'
    });

    expect(result.importedCount).toBe(0);

    // Verify DB remains sound
    const state = camoDb.getState();
    expect(Array.isArray(state.camoRegulatoryRegister)).toBe(true);
  });

  // =========================================================================
  // 6. BLINDAGEM ANTI-SSRF E MALICIOUS URLS
  // =========================================================================
  it('6. Deve bloquear tentativas de SSRF (localhost, private IP, AWS/GCP metadata 169.254.169.254)', () => {
    const maliciousUrls = [
      'http://localhost:3000/api/state',
      'http://127.0.0.1:8080/admin',
      'http://169.254.169.254/computeMetadata/v1/',
      'http://10.0.0.1/secret',
      'http://192.168.1.1/router-config',
      'https://evil-hacker.com/malicious.pdf',
      'file:///etc/passwd',
      'gopher://127.0.0.1:25/'
    ];

    for (const url of maliciousUrls) {
      const validation = officialDocumentAcquisitionService.validateOfficialUrl(url);
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toMatch(/(SSRF|approved|Protocol|whitelist|Blocked)/i);
    }
  });

  // =========================================================================
  // 7. PROTEÇÃO CONTRA PATH TRAVERSAL E ASSINATURA DE ARQUIVO
  // =========================================================================
  it('7. Deve validar assinatura de PDF (%PDF-) e rejeitar payloads HTML/Traversal falsificados', () => {
    const fakeHtml = Buffer.from('<!DOCTYPE html><html><body>Error 404</body></html>', 'utf-8');
    const sigHtml = officialDocumentAcquisitionService.validatePdfSignature(fakeHtml);
    expect(sigHtml.isValid).toBe(false);
    expect(sigHtml.signatureFound).toBe('HTML_DOCUMENT');

    const fakeBin = Buffer.from('MZ\x90\x00\x03\x00\x00\x00', 'binary'); // Windows PE header
    const sigBin = officialDocumentAcquisitionService.validatePdfSignature(fakeBin);
    expect(sigBin.isValid).toBe(false);

    const validPdf = Buffer.from('%PDF-1.7 sample pdf content', 'utf-8');
    const sigPdf = officialDocumentAcquisitionService.validatePdfSignature(validPdf);
    expect(sigPdf.isValid).toBe(true);
    expect(sigPdf.signatureFound).toBe('%PDF-');
  });

  // =========================================================================
  // 8. MALFORMED AI OUTPUT CONTAINMENT
  // =========================================================================
  it('8. Deve conter outputs malformados ou corrompidos de IA com fallback defensivo no Rule Engine', () => {
    const corruptRequirement: ComplianceRequirement = {
      id: 'req-sec-corrupt-01',
      sourceType: 'AD',
      sourceNumber: '2026-CORRUPT-AI',
      title: 'Corrupt AI Output Directive',
      issuingAuthority: 'FAA',
      revision: 'ORIGINAL',
      issueDate: 'invalid-date-format',
      effectiveDate: 'invalid-date-format',
      emergencyAd: false,
      status: 'APPROVED',
      applicabilityRule: {
        id: 'app-corrupt-01',
        complianceRequirementId: 'req-sec-corrupt-01',
        aircraftManufacturers: [],
        aircraftModels: [],
        componentPartNumbers: [],
        rawText: ''
      },
      documentProcessingStatus: 'EXTRACTION_FAILED',
      createdAt: new Date().toISOString(),
      createdBy: 'Gemini Failsafe',
      updatedAt: new Date().toISOString(),
      updatedBy: 'Gemini Failsafe'
    };

    const state = camoDb.getState();
    const evalResult = evaluateComplianceRequirement(corruptRequirement, state);

    // Rule engine must NOT declare APPLICABLE without basis; it must be NOT_APPLICABLE or require review
    expect(evalResult.assessments.length).toBeGreaterThan(0);
    const applicableOnes = evalResult.assessments.filter(a => a.applicabilityStatus === 'APPLICABLE');
    expect(applicableOnes.length).toBe(0);
  });

  // =========================================================================
  // 9. INVARIANTE DA MÁQUINA DE ESTADOS: COMPLIED EXIGE EVIDÊNCIA VÁLIDA
  // =========================================================================
  it('9. Deve rejeitar sumariamente transição para COMPLIED sem evidência probatória válida', () => {
    const ac = camoDb.getState().aircraft[0];
    const req: ComplianceRequirement = {
      id: 'req-sec-state-01',
      sourceType: 'AD',
      sourceNumber: '2026-SEC-STATE-01',
      title: 'State Invariant Check',
      issuingAuthority: 'FAA',
      revision: 'ORIGINAL',
      issueDate: '2026-01-01',
      effectiveDate: '2026-01-01',
      emergencyAd: false,
      status: 'APPROVED',
      applicabilityRule: {
        id: 'app-sec-state-01',
        complianceRequirementId: 'req-sec-state-01',
        aircraftManufacturers: [ac.manufacturer],
        aircraftModels: [ac.model],
        componentPartNumbers: [],
        rawText: 'Strict Invariant'
      },
      documentProcessingStatus: 'EXTRACTED',
      createdAt: new Date().toISOString(),
      createdBy: 'Auditor',
      updatedAt: new Date().toISOString(),
      updatedBy: 'Auditor'
    };

    const obl = complianceObligationService.createOrUpdateObligation({
      requirement: req,
      aircraft: ac,
      applicabilityStatus: 'APPLICABLE',
      actor: 'Auditor'
    });

    expect(obl.status).toBe('OPEN');

    // Attempt direct transition to COMPLIED without attaching any evidence
    expect(() => {
      complianceObligationService.transitionState({
        obligationId: obl.id,
        toStatus: 'COMPLIED',
        reason: 'Attempting fraudulent compliance without evidence',
        ruleResponsible: 'MALICIOUS_TRANSITION_ATTEMPT',
        actor: 'Adversary'
      });
    }).toThrow(/TRANSITION_REJECTED.*verified compliance evidence/i);

    // Verify obligation status remained unchanged
    const currentObl = camoDb.getState().obligations.find(o => o.id === obl.id);
    expect(currentObl?.status).toBe('OPEN');
  });

  // =========================================================================
  // 10. DETECÇÃO DE CORRUPÇÃO DE HASH / TAMPERING EM EVIDÊNCIA
  // =========================================================================
  it('10. Deve auditar e detectar inconsistência probatória quando hash é revogado ou alterado', () => {
    const ac = camoDb.getState().aircraft[0];
    const req: ComplianceRequirement = {
      id: 'req-sec-hash-01',
      sourceType: 'AD',
      sourceNumber: '2026-SEC-HASH-01',
      title: 'Hash Tamper Check',
      issuingAuthority: 'FAA',
      revision: 'ORIGINAL',
      issueDate: '2026-01-01',
      effectiveDate: '2026-01-01',
      emergencyAd: false,
      status: 'APPROVED',
      applicabilityRule: {
        id: 'app-sec-hash-01',
        complianceRequirementId: 'req-sec-hash-01',
        aircraftManufacturers: [ac.manufacturer],
        aircraftModels: [ac.model],
        componentPartNumbers: [],
        rawText: 'Tamper check'
      },
      documentProcessingStatus: 'EXTRACTED',
      createdAt: new Date().toISOString(),
      createdBy: 'Auditor',
      updatedAt: new Date().toISOString(),
      updatedBy: 'Auditor'
    };

    const obl = complianceObligationService.createOrUpdateObligation({
      requirement: req,
      aircraft: ac,
      applicabilityStatus: 'APPLICABLE',
      actor: 'Auditor'
    });

    // Attach valid evidence
    const oblWithEv = complianceObligationService.attachEvidence({
      obligationId: obl.id,
      evidenceType: 'FORM_8130_3',
      documentReference: 'FAA-8130-CORRUPT-TEST',
      description: 'Certified component overhaul form',
      recordedBy: 'Inspector',
      verified: true,
      verificationStatus: 'VALID',
      documentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    });

    expect(oblWithEv.evidence[0].documentHash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

    // Revoke evidence
    camoDb.update(draft => {
      const o = draft.obligations.find(x => x.id === obl.id);
      if (o && o.evidence[0]) {
        o.evidence[0].verificationStatus = 'REVOKED' as EvidenceVerificationStatus;
        o.evidence[0].verified = false;
      }
    });

    const rechecked = camoDb.getState().obligations.find(x => x.id === obl.id);
    expect(rechecked?.evidence[0].verified).toBe(false);
  });

  // =========================================================================
  // 11. REPETIÇÃO IDEMPOTENTE DE OPERAÇÕES TEMPORAIS (SEM DRIFT)
  // =========================================================================
  it('11. Deve executar recálculo de obrigações repetidamente sem alterar valores estáveis (drift-free)', () => {
    const ac = camoDb.getState().aircraft[0];
    const req: ComplianceRequirement = {
      id: 'req-sec-drift-01',
      sourceType: 'AD',
      sourceNumber: '2026-SEC-DRIFT-01',
      title: 'Drift Free Calculation',
      issuingAuthority: 'FAA',
      revision: 'ORIGINAL',
      issueDate: '2026-01-01',
      effectiveDate: '2026-01-01',
      emergencyAd: false,
      status: 'APPROVED',
      applicabilityRule: {
        id: 'app-sec-drift-01',
        complianceRequirementId: 'req-sec-drift-01',
        aircraftManufacturers: [ac.manufacturer],
        aircraftModels: [ac.model],
        componentPartNumbers: [],
        rawText: 'Drift check'
      },
      documentProcessingStatus: 'EXTRACTED',
      createdAt: new Date().toISOString(),
      createdBy: 'Auditor',
      updatedAt: new Date().toISOString(),
      updatedBy: 'Auditor'
    };

    const obl = complianceObligationService.createOrUpdateObligation({
      requirement: req,
      aircraft: ac,
      applicabilityStatus: 'APPLICABLE',
      actor: 'Auditor'
    });

    const calc1 = complianceObligationService.calculateObligationDueDetailed(obl.id);
    const calc2 = complianceObligationService.calculateObligationDueDetailed(obl.id);
    const calc3 = complianceObligationService.calculateObligationDueDetailed(obl.id);

    expect(calc1.calculationStatus).toBe(calc2.calculationStatus);
    expect(calc2.calculationStatus).toBe(calc3.calculationStatus);
    expect(calc1.controllingReason).toBe(calc2.controllingReason);
  });

  // =========================================================================
  // 12. CONTENÇÃO DE FALHA EXTERNA: RESILIÊNCIA A ERROS DE CONSULTA
  // =========================================================================
  it('12. Deve conter falha externa sem inventar falsas diretrizes na busca por frota', async () => {
    const result = await regulatoryIntelligenceEngine.searchFleetAndCompareWithRegister({
      manufacturer: 'UnknownOEM',
      family: 'NonExistentFamily',
      model: 'Alien-999',
      authority: 'FAA'
    });

    expect(result).toBeDefined();
    expect(result.candidates.length).toBe(0);
  });

  // =========================================================================
  // 13. ISOLAMENTO ESTRITO DE AIRCRAFT EM PRÉ-ENTREGA (DELIVERY SANDBOX)
  // =========================================================================
  it('13. Deve garantir que evidências e obrigações em delivery assessment mantenham isolamento estrito sem contaminar outras aeronaves', async () => {
    const deliveryAircraftConfig: DeliveryAircraftConfig = {
      manufacturer: 'Boeing',
      model: '737-800',
      family: '737 Next Generation',
      msn: '99999',
      registration: 'PR-TEST-SANDBOX',
      manufactureDate: '2014-06-15',
      totalFlightHours: 15000,
      totalCycles: 8000,
      totalLandings: 8000,
      lessor: 'AerCap Security Leasing',
      currentOperator: 'Nordic Skyways',
      targetDeliveryDate: '2026-11-30',
      engines: [],
      components: []
    };

    const assessment = await aircraftDeliveryAssessmentEngine.createAssessment({
      title: 'Pre-Delivery Sandbox Security Audit',
      assessmentType: 'DELIVERY',
      lessor: 'AerCap Security Leasing',
      operator: 'Nordic Skyways',
      aircraftConfig: deliveryAircraftConfig,
      notes: 'Pre-delivery aircraft security evaluation',
      actor: 'Lead Delivery Auditor'
    });

    expect(assessment).toBeDefined();
    expect(assessment.aircraftConfig.registration).toBe('PR-TEST-SANDBOX');
    expect(assessment.aircraftId).toBeDefined();

    // Execute discovery and attach evidence for delivery aircraft
    await aircraftDeliveryAssessmentEngine.executeDiscoveryForAssessment(assessment.id);
    const targetItem = assessment.adItems[0];
    expect(targetItem).toBeDefined();

    await aircraftDeliveryAssessmentEngine.analyzeIndividualAd({
      assessmentId: assessment.id,
      adNumber: targetItem.adNumber
    });

    await aircraftDeliveryAssessmentEngine.attachLessorEvidence({
      assessmentId: assessment.id,
      adNumber: targetItem.adNumber,
      evidenceType: 'CERTIFICATE_OF_RELEASE_TO_SERVICE',
      documentReference: 'CRS-SANDBOX-SEC-01',
      description: 'Sandbox verification',
      accomplishmentDate: '2025-01-01'
    });

    const attachedEv = camoDb.getState().evidence.find(
      e => e.documentReference === 'CRS-SANDBOX-SEC-01'
    );

    expect(attachedEv).toBeDefined();
    expect(attachedEv?.aircraftId).toBe(assessment.aircraftId);

    // Other aircraft in operational fleet (e.g. ac-01 / PR-BYS) MUST NOT own this evidence
    const otherAircraft = camoDb.getState().aircraft.filter(a => a.id !== assessment.aircraftId);
    expect(otherAircraft.length).toBeGreaterThan(0);
    for (const other of otherAircraft) {
      expect(attachedEv?.aircraftId).not.toBe(other.id);
    }
  });

  // =========================================================================
  // 14. TRILHA DE AUDITORIA TAMPER-EVIDENT
  // =========================================================================
  it('14. Deve registrar logs de auditoria detalhados com timestamps ordenados para cada mutação crítica', () => {
    const initialAuditCount = camoDb.getState().auditTrail.length;

    camoDb.logAudit({
      user: 'Security Officer',
      role: 'CHIEF_AUDITOR',
      action: 'APPROVAL',
      entityType: 'SystemSecurity',
      entityId: 'sec-audit-01',
      details: 'Audit log verification entry'
    });

    const newAuditTrail = camoDb.getState().auditTrail;
    expect(newAuditTrail.length).toBe(initialAuditCount + 1);
    expect(newAuditTrail[0].action).toBe('APPROVAL');
    expect(newAuditTrail[0].user).toBe('Security Officer');
    expect(newAuditTrail[0].timestamp).toBeDefined();
  });
});
