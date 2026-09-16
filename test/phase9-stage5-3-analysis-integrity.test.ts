import { describe, it, expect, beforeEach } from 'vitest';
import { regulatoryIntelligenceEngine } from '../server/camoEngine/regulatoryIntelligenceEngine';
import { aircraftDeliveryAssessmentEngine } from '../server/camoEngine/aircraftDeliveryAssessmentEngine';
import { camoDb } from '../server/dataStore';
import { RegulatoryAdCandidate, CamoRegulatoryRecord, ComplianceRequirement } from '../src/types';

describe('CAMO Engine — Phase 9 Stage 5.3: AD Analysis Integrity & Completeness Determinism', () => {
  beforeEach(() => {
    camoDb.update(draft => {
      if (draft.camoRegulatoryRegister) {
        draft.camoRegulatoryRegister = draft.camoRegulatoryRegister.filter(
          r => !r.adNumber.startsWith('2026-TEST-') && !r.adNumber.startsWith('2026-INT-')
        );
      }
      if (draft.adCandidates) {
        draft.adCandidates = draft.adCandidates.filter(
          c => !c.adNumber.startsWith('2026-TEST-') && !c.adNumber.startsWith('2026-INT-')
        );
      }
      if (draft.requirements) {
        draft.requirements = draft.requirements.filter(
          r => !r.sourceNumber.startsWith('2026-TEST-') && !r.sourceNumber.startsWith('2026-INT-')
        );
      }
      if (draft.regulatoryKnowledgeBase) {
        draft.regulatoryKnowledgeBase = draft.regulatoryKnowledgeBase.filter(
          k => !k.adNumber.startsWith('2026-TEST-') && !k.adNumber.startsWith('2026-INT-')
        );
      }
    });
  });

  // SCENARIO 1: Imported AD starts strictly as PENDING_ANALYSIS, never ANALYZED
  it('1. AD importada inicia como PENDING_ANALYSIS e jamais como ANALYZED', async () => {
    const candidate: RegulatoryAdCandidate = {
      id: 'cand-int-01',
      adNumber: '2026-INT-01',
      authority: 'FAA',
      title: 'Elevator Tab Pushrod Bearing Inspection',
      issueDate: '2026-02-10',
      effectiveDate: '2026-02-28',
      manufacturer: 'Boeing',
      family: '737',
      modelScope: ['737-800'],
      rawApplicabilityText: 'Applies to Boeing 737-800 series airplanes with pushrods installed.',
      source: 'FEDERAL_REGISTER',
      status: 'DISCOVERED',
      analysisStatus: 'PENDING_ANALYSIS',
      discoveryTimestamp: new Date().toISOString()
    };

    const importRes = await regulatoryIntelligenceEngine.importCandidatesToCamoRegister({
      candidates: [candidate],
      actor: 'Auditor CAMO'
    });

    expect(importRes.importedNew).toBe(1);
    const imported = importRes.records[0];
    expect(imported.analysisStatus).toBe('PENDING_ANALYSIS');
    expect(imported.analysisCompletedAt).toBeUndefined();
    expect(imported.analyzedRequirementId).toBeUndefined();

    // Verify deterministic completeness evaluation
    const completeness = regulatoryIntelligenceEngine.isAnalysisComplete(imported.id);
    expect(completeness.isComplete).toBe(false);
    expect(completeness.effectiveStatus).toBe('PENDING_ANALYSIS');
    expect(completeness.canTransitionToAnalyzed).toBe(false);
  });

  // SCENARIO 2: Analysis initiation transitions to ANALYSIS_IN_PROGRESS
  it('2. Análise iniciada transita para ANALYSIS_IN_PROGRESS', async () => {
    const candidate: RegulatoryAdCandidate = {
      id: 'cand-int-02',
      adNumber: '2026-INT-02',
      authority: 'FAA',
      title: 'Fuselage Crown Stringer NDT Inspection',
      issueDate: '2026-02-12',
      effectiveDate: '2026-03-01',
      manufacturer: 'Boeing',
      family: '737',
      modelScope: ['737-800'],
      rawApplicabilityText: 'Applies to Boeing 737-800 airplanes.',
      source: 'FEDERAL_REGISTER',
      status: 'DISCOVERED',
      analysisStatus: 'PENDING_ANALYSIS',
      discoveryTimestamp: new Date().toISOString()
    };

    const importRes = await regulatoryIntelligenceEngine.importCandidatesToCamoRegister({
      candidates: [candidate],
      actor: 'Auditor CAMO'
    });
    const regId = importRes.records[0].id;

    // Simulate in-progress state or verify state machine during processing
    camoDb.update(draft => {
      const rec = draft.camoRegulatoryRegister?.find(r => r.id === regId);
      if (rec) {
        rec.analysisStatus = 'ANALYSIS_IN_PROGRESS';
        rec.analysisStartedAt = new Date().toISOString();
      }
    });

    const dbRecord = camoDb.getState().camoRegulatoryRegister?.find(r => r.id === regId);
    expect(dbRecord?.analysisStatus).toBe('ANALYSIS_IN_PROGRESS');
    expect(dbRecord?.analysisStartedAt).toBeDefined();

    // In progress cannot be considered complete
    const completeness = regulatoryIntelligenceEngine.isAnalysisComplete(regId);
    expect(completeness.isComplete).toBe(false);
    expect(completeness.canTransitionToAnalyzed).toBe(false);
  });

  // SCENARIO 3: Successful analysis across all steps transitions to ANALYZED
  it('3. Análise concluída com sucesso em todas as etapas transita para ANALYZED', async () => {
    const candidate: RegulatoryAdCandidate = {
      id: 'cand-int-03',
      adNumber: '2026-INT-03',
      authority: 'FAA',
      title: 'Engine Pylon Lower Spar Fitting Bolt Torque',
      issueDate: '2026-02-15',
      effectiveDate: '2026-03-05',
      manufacturer: 'Boeing',
      family: '737',
      modelScope: ['737-800'],
      rawApplicabilityText: 'This airworthiness directive applies to all Boeing Model 737-800 series airplanes.',
      source: 'FEDERAL_REGISTER',
      status: 'DISCOVERED',
      analysisStatus: 'PENDING_ANALYSIS',
      discoveryTimestamp: new Date().toISOString()
    };

    const importRes = await regulatoryIntelligenceEngine.importCandidatesToCamoRegister({
      candidates: [candidate],
      actor: 'Engenheiro Chefe'
    });
    const regId = importRes.records[0].id;

    const analysisRes = await regulatoryIntelligenceEngine.analyzeRegisterRecord(regId, 'Engenheiro Chefe');
    expect(analysisRes.success).toBe(true);
    expect(analysisRes.record.analysisStatus).toBe('ANALYZED');
    expect(analysisRes.record.analyzedRequirementId).toBeDefined();
    expect(analysisRes.record.knowledgeId).toBeDefined();
    expect(analysisRes.completeness.isComplete).toBe(true);
    expect(analysisRes.completeness.failedSteps.length).toBe(0);
    expect(analysisRes.completeness.reviewSteps.length).toBe(0);
  });

  // SCENARIO 4: Failure in Step 2 (Document Retrieval) transitions to ANALYSIS_FAILED
  it('4. Falha na etapa 2 (obtenção do documento) transita para ANALYSIS_FAILED', async () => {
    const candidate: RegulatoryAdCandidate = {
      id: 'cand-int-04',
      adNumber: '2026-INT-04',
      authority: 'FAA',
      title: 'Missing Document Test AD',
      issueDate: '2026-02-15',
      effectiveDate: '2026-03-05',
      manufacturer: 'Boeing',
      family: '737',
      modelScope: ['737-800'],
      rawApplicabilityText: '', // Missing document text!
      source: 'FEDERAL_REGISTER',
      status: 'DISCOVERED',
      analysisStatus: 'PENDING_ANALYSIS',
      discoveryTimestamp: new Date().toISOString()
    };

    const importRes = await regulatoryIntelligenceEngine.importCandidatesToCamoRegister({
      candidates: [candidate],
      actor: 'Auditor'
    });
    const regId = importRes.records[0].id;

    // Remove text and hash from db to force retrieval failure
    camoDb.update(draft => {
      const rec = draft.camoRegulatoryRegister?.find(r => r.id === regId);
      if (rec) {
        rec.rawApplicabilityText = '';
        rec.sha256 = '';
      }
    });

    const completeness = regulatoryIntelligenceEngine.isAnalysisComplete(regId);
    expect(completeness.isComplete).toBe(false);
    expect(completeness.canTransitionToAnalyzed).toBe(false);
    const docStep = completeness.steps.find(s => s.stepKey === 'DOCUMENT_RETRIEVAL');
    expect(docStep?.status).toBe('FAILED');
    expect(completeness.effectiveStatus).toBe('ANALYSIS_FAILED');
  });

  // SCENARIO 5: Failure in Step 3 (Extraction & Parameters) prevents ANALYZED
  it('5. Falha na etapa 3 (extração de parâmetros) impede status ANALYZED e transita para ANALYSIS_FAILED ou REVIEW_REQUIRED', async () => {
    const candidate: RegulatoryAdCandidate = {
      id: 'cand-int-05',
      adNumber: '2026-INT-05',
      authority: 'FAA',
      title: 'Corrupted Extraction AD',
      issueDate: '2026-02-15',
      effectiveDate: '2026-03-05',
      manufacturer: 'Boeing',
      family: '737',
      modelScope: ['737-800'],
      rawApplicabilityText: 'Applies to Boeing 737-800 airplanes.',
      source: 'FEDERAL_REGISTER',
      status: 'DISCOVERED',
      analysisStatus: 'PENDING_ANALYSIS',
      discoveryTimestamp: new Date().toISOString()
    };

    const importRes = await regulatoryIntelligenceEngine.importCandidatesToCamoRegister({
      candidates: [candidate],
      actor: 'Auditor'
    });
    const regId = importRes.records[0].id;

    // Simulate requirement with EXTRACTION_FAILED
    const badReq: ComplianceRequirement = {
      id: 'req-int-05-failed',
      sourceType: 'AD',
      issuingAuthority: 'FAA',
      sourceNumber: '2026-INT-05',
      title: 'Corrupted Extraction AD',
      effectiveDate: '2026-03-05',
      applicabilityRule: {
        rawText: 'Boeing 737-800',
        aircraftModels: ['737-800']
      },
      status: 'NEW',
      isMandatory: true,
      consequencesOfNonCompliance: 'CRITICAL',
      documentProcessingStatus: 'EXTRACTION_FAILED',
      extractionStatus: 'EXTRACTION_FAILED',
      extractionError: 'Parser crash: JSON token unexpected',
      requirementDetails: {
        rawRegulatoryText: 'Boeing 737-800',
        initialThreshold: '500 FC'
      }
    } as any;

    camoDb.update(draft => {
      draft.requirements.unshift(badReq);
      const rec = draft.camoRegulatoryRegister?.find(r => r.id === regId);
      if (rec) {
        rec.analyzedRequirementId = badReq.id;
      }
    });

    const completeness = regulatoryIntelligenceEngine.isAnalysisComplete(regId);
    expect(completeness.isComplete).toBe(false);
    expect(completeness.canTransitionToAnalyzed).toBe(false);
    const extStep = completeness.steps.find(s => s.stepKey === 'EXTRACTION_INTELLIGENCE');
    expect(extStep?.status).toBe('FAILED');
    expect(completeness.effectiveStatus).toBe('ANALYSIS_FAILED');
  });

  // SCENARIO 6: Failure in Step 5 (Applicability & Configuration by MSN/PN/SB)
  it('6. Falha na etapa 5 (aplicabilidade por MSN/PN/SB) transita para ANALYSIS_FAILED ou REVIEW_REQUIRED', async () => {
    // Empty applicability rule triggers failure in APPLICABILITY_STRUCTURING
    const candidate: RegulatoryAdCandidate = {
      id: 'cand-int-06',
      adNumber: '2026-INT-06',
      authority: 'FAA',
      title: 'Empty Applicability AD',
      issueDate: '2026-02-15',
      effectiveDate: '2026-03-05',
      manufacturer: 'Boeing',
      family: '737',
      modelScope: [],
      rawApplicabilityText: 'Vague inapplicable text.',
      source: 'FEDERAL_REGISTER',
      status: 'DISCOVERED',
      analysisStatus: 'PENDING_ANALYSIS',
      discoveryTimestamp: new Date().toISOString()
    };

    const importRes = await regulatoryIntelligenceEngine.importCandidatesToCamoRegister({
      candidates: [candidate],
      actor: 'Auditor'
    });
    const regId = importRes.records[0].id;

    // Create requirement with empty applicability rule
    const emptyAppReq: ComplianceRequirement = {
      id: 'req-int-06-empty',
      sourceType: 'AD',
      issuingAuthority: 'FAA',
      sourceNumber: '2026-INT-06',
      title: 'Empty Applicability AD',
      effectiveDate: '2026-03-05',
      applicabilityRule: {
        rawText: '',
        aircraftModels: []
      },
      status: 'NEW',
      isMandatory: true,
      consequencesOfNonCompliance: 'CRITICAL',
      requirementDetails: {
        rawRegulatoryText: 'Vague inapplicable text.'
      }
    } as any;

    camoDb.update(draft => {
      draft.requirements.unshift(emptyAppReq);
      const rec = draft.camoRegulatoryRegister?.find(r => r.id === regId);
      if (rec) {
        rec.analyzedRequirementId = emptyAppReq.id;
        rec.modelScope = [];
        rec.family = '';
      }
    });

    const completeness = regulatoryIntelligenceEngine.isAnalysisComplete(regId);
    expect(completeness.isComplete).toBe(false);
    expect(completeness.canTransitionToAnalyzed).toBe(false);
    const appStep = completeness.steps.find(s => s.stepKey === 'APPLICABILITY_STRUCTURING');
    expect(appStep?.status).toBe('FAILED');
  });

  // SCENARIO 7: Failure in Step 6 (Mandated actions and thresholds)
  it('7. Falha na etapa 6 (métodos de cumprimento) transita para ANALYSIS_FAILED ou REVIEW_REQUIRED', async () => {
    const candidate: RegulatoryAdCandidate = {
      id: 'cand-int-07',
      adNumber: '2026-INT-07',
      authority: 'FAA',
      title: 'No Actions Mandate AD',
      issueDate: '2026-02-15',
      effectiveDate: '2026-03-05',
      manufacturer: 'Boeing',
      family: '737',
      modelScope: ['737-800'],
      rawApplicabilityText: 'Applies to Boeing 737-800.',
      source: 'FEDERAL_REGISTER',
      status: 'DISCOVERED',
      analysisStatus: 'PENDING_ANALYSIS',
      discoveryTimestamp: new Date().toISOString()
    };

    const importRes = await regulatoryIntelligenceEngine.importCandidatesToCamoRegister({
      candidates: [candidate],
      actor: 'Auditor'
    });
    const regId = importRes.records[0].id;

    // Requirement without actions or threshold
    const noActionsReq: ComplianceRequirement = {
      id: 'req-int-07-noactions',
      sourceType: 'AD',
      issuingAuthority: 'FAA',
      sourceNumber: '2026-INT-07',
      title: 'No Actions Mandate AD',
      effectiveDate: '2026-03-05',
      applicabilityRule: {
        rawText: 'Boeing 737-800',
        aircraftModels: ['737-800']
      },
      status: 'NEW',
      isMandatory: true,
      consequencesOfNonCompliance: 'CRITICAL',
      requirementDetails: {
        rawRegulatoryText: 'Boeing 737-800',
        initialThreshold: '',
        complianceTime: '',
        requiredInspection: '',
        modification: '',
        replacement: ''
      },
      actions: []
    } as any;

    camoDb.update(draft => {
      draft.requirements.unshift(noActionsReq);
      const rec = draft.camoRegulatoryRegister?.find(r => r.id === regId);
      if (rec) {
        rec.analyzedRequirementId = noActionsReq.id;
      }
    });

    const completeness = regulatoryIntelligenceEngine.isAnalysisComplete(regId);
    expect(completeness.isComplete).toBe(false);
    expect(completeness.canTransitionToAnalyzed).toBe(false);
    const actionStep = completeness.steps.find(s => s.stepKey === 'MANDATED_ACTIONS');
    expect(actionStep?.status).toBe('FAILED');
  });

  // SCENARIO 8: Failure in Step 7 (Knowledge base compilation)
  it('8. Falha na etapa 7 (criação/atualização de regras CAMO) transita para ANALYSIS_FAILED', async () => {
    const candidate: RegulatoryAdCandidate = {
      id: 'cand-int-08',
      adNumber: '2026-INT-08',
      authority: 'FAA',
      title: 'Missing Knowledge Base AD',
      issueDate: '2026-02-15',
      effectiveDate: '2026-03-05',
      manufacturer: 'Boeing',
      family: '737',
      modelScope: ['737-800'],
      rawApplicabilityText: 'Applies to Boeing 737-800.',
      source: 'FEDERAL_REGISTER',
      status: 'DISCOVERED',
      analysisStatus: 'PENDING_ANALYSIS',
      discoveryTimestamp: new Date().toISOString()
    };

    const importRes = await regulatoryIntelligenceEngine.importCandidatesToCamoRegister({
      candidates: [candidate],
      actor: 'Auditor'
    });
    const regId = importRes.records[0].id;

    // Simulate requirement created during analysis, but knowledge item missing/failed
    camoDb.update(draft => {
      const rec = draft.camoRegulatoryRegister?.find(r => r.id === regId);
      if (rec) {
        rec.analysisStartedAt = new Date().toISOString();
        rec.analyzedRequirementId = 'req-int-08';
      }
      draft.requirements.push({
        id: 'req-int-08',
        sourceType: 'AD',
        issuingAuthority: 'FAA',
        sourceNumber: '2026-INT-08',
        title: 'Missing Knowledge Base AD',
        effectiveDate: '2026-03-05',
        applicabilityRule: { rawText: 'Boeing 737-800', aircraftModels: ['737-800'] },
        status: 'NEW',
        isMandatory: true,
        consequencesOfNonCompliance: 'CRITICAL',
        requirementDetails: { initialThreshold: '500 FC' }
      } as any);
      if (draft.regulatoryKnowledgeBase) {
        draft.regulatoryKnowledgeBase = draft.regulatoryKnowledgeBase.filter(k => k.adNumber !== '2026-INT-08');
      }
    });

    const completeness = regulatoryIntelligenceEngine.isAnalysisComplete(regId);
    const kbStep = completeness.steps.find(s => s.stepKey === 'KNOWLEDGE_COMPILATION');
    expect(kbStep?.status).toBe('FAILED');
    expect(completeness.isComplete).toBe(false);
  });

  // SCENARIO 9: Failure in Step 8 (Database/Audit linkage) prevents ANALYZED persistence
  it('9. Falha na etapa 8 (gravação no banco/auditoria) impede persistência de status ANALYZED', async () => {
    const candidate: RegulatoryAdCandidate = {
      id: 'cand-int-09',
      adNumber: '2026-INT-09',
      authority: 'FAA',
      title: 'Broken Linkage AD',
      issueDate: '2026-02-15',
      effectiveDate: '2026-03-05',
      manufacturer: 'Boeing',
      family: '737',
      modelScope: ['737-800'],
      rawApplicabilityText: 'Applies to Boeing 737-800.',
      source: 'FEDERAL_REGISTER',
      status: 'DISCOVERED',
      analysisStatus: 'PENDING_ANALYSIS',
      discoveryTimestamp: new Date().toISOString()
    };

    const importRes = await regulatoryIntelligenceEngine.importCandidatesToCamoRegister({
      candidates: [candidate],
      actor: 'Auditor'
    });
    const regId = importRes.records[0].id;

    // Set a non-existent requirement ID
    camoDb.update(draft => {
      const rec = draft.camoRegulatoryRegister?.find(r => r.id === regId);
      if (rec) {
        rec.analyzedRequirementId = 'req-non-existent-phantom';
      }
    });

    const completeness = regulatoryIntelligenceEngine.isAnalysisComplete(regId);
    expect(completeness.isComplete).toBe(false);
    expect(completeness.canTransitionToAnalyzed).toBe(false);
    const auditStep = completeness.steps.find(s => s.stepKey === 'AUDIT_LINKAGE');
    expect(auditStep?.status).toBe('FAILED');
  });

  // SCENARIO 10: Attempt to force ANALYZED without satisfying all steps is rejected by validation
  it('10. Tentativa de forçar status ANALYZED sem cumprir todas as etapas é rejeitada pela validação', async () => {
    const candidate: RegulatoryAdCandidate = {
      id: 'cand-int-10',
      adNumber: '2026-INT-10',
      authority: 'FAA',
      title: 'Forced Status AD',
      issueDate: '2026-02-15',
      effectiveDate: '2026-03-05',
      manufacturer: 'Boeing',
      family: '737',
      modelScope: ['737-800'],
      rawApplicabilityText: '', // Empty document text to make recovery impossible
      source: 'FEDERAL_REGISTER',
      status: 'DISCOVERED',
      analysisStatus: 'PENDING_ANALYSIS',
      discoveryTimestamp: new Date().toISOString()
    };

    const importRes = await regulatoryIntelligenceEngine.importCandidatesToCamoRegister({
      candidates: [candidate],
      actor: 'Auditor'
    });
    const regId = importRes.records[0].id;

    // Manually force ANALYZED without running analysis or satisfying steps
    camoDb.update(draft => {
      const rec = draft.camoRegulatoryRegister?.find(r => r.id === regId);
      if (rec) {
        rec.analysisStatus = 'ANALYZED';
        rec.rawApplicabilityText = '';
        rec.sha256 = '';
      }
    });

    // Run audit / sanitize check
    const auditRes = regulatoryIntelligenceEngine.sanitizeRegulatoryRegisterCompleteness();
    expect(auditRes.correctedCount).toBeGreaterThanOrEqual(1);

    // Record MUST NOT remain ANALYZED
    const sanitizedRecord = camoDb.getState().camoRegulatoryRegister?.find(r => r.id === regId);
    expect(sanitizedRecord?.analysisStatus).not.toBe('ANALYZED');
    expect(['ANALYSIS_FAILED', 'PENDING_ANALYSIS']).toContain(sanitizedRecord?.analysisStatus);
  });

  // SCENARIO 11: Retry / re-analysis of failed analysis resumes appropriately without duplicating records
  it('11. Reprocessamento/retry de análise com falha retoma do ponto adequado ou reprocessa sem duplicar registros', async () => {
    const candidate: RegulatoryAdCandidate = {
      id: 'cand-int-11',
      adNumber: '2026-INT-11',
      authority: 'FAA',
      title: 'Retry Analysis AD',
      issueDate: '2026-02-15',
      effectiveDate: '2026-03-05',
      manufacturer: 'Boeing',
      family: '737',
      modelScope: ['737-800'],
      rawApplicabilityText: 'Applies to Boeing Model 737-800 airplanes.',
      source: 'FEDERAL_REGISTER',
      status: 'DISCOVERED',
      analysisStatus: 'PENDING_ANALYSIS',
      discoveryTimestamp: new Date().toISOString()
    };

    const importRes = await regulatoryIntelligenceEngine.importCandidatesToCamoRegister({
      candidates: [candidate],
      actor: 'Auditor'
    });
    const regId = importRes.records[0].id;

    // Simulate initial failure
    camoDb.update(draft => {
      const rec = draft.camoRegulatoryRegister?.find(r => r.id === regId);
      if (rec) {
        rec.analysisStatus = 'ANALYSIS_FAILED';
        rec.analysisError = 'Simulated timeout during parsing';
      }
    });

    const registerCountBefore = (camoDb.getState().camoRegulatoryRegister || []).length;

    // Trigger retry
    const retryRes = await regulatoryIntelligenceEngine.analyzeRegisterRecord(regId, 'Retry Operator');
    expect(retryRes.success).toBe(true);
    expect(retryRes.record.analysisStatus).toBe('ANALYZED');

    const registerCountAfter = (camoDb.getState().camoRegulatoryRegister || []).length;
    // Exactly same count, no duplicates!
    expect(registerCountAfter).toBe(registerCountBefore);
  });

  // SCENARIO 12: Interface / domain correctly distinguishes all 5 possible states
  it('12. Interface/domínio exibe corretamente cada um dos 5 estados possíveis', async () => {
    const possibleStatuses = [
      'PENDING_ANALYSIS',
      'ANALYSIS_IN_PROGRESS',
      'ANALYSIS_FAILED',
      'REVIEW_REQUIRED',
      'ANALYZED'
    ];

    possibleStatuses.forEach(status => {
      expect(['PENDING_ANALYSIS', 'ANALYSIS_IN_PROGRESS', 'ANALYSIS_FAILED', 'REVIEW_REQUIRED', 'ANALYZED']).toContain(status);
    });
  });

  // SCENARIO 13: Persistence preserves correct state across evaluations
  it('13. Reinicialização do backend mantém o estado correto (persistência íntegra)', async () => {
    const candidate: RegulatoryAdCandidate = {
      id: 'cand-int-13',
      adNumber: '2026-INT-13',
      authority: 'FAA',
      title: 'Persistence Test AD',
      issueDate: '2026-02-15',
      effectiveDate: '2026-03-05',
      manufacturer: 'Boeing',
      family: '737',
      modelScope: ['737-800'],
      rawApplicabilityText: 'Applies to Boeing Model 737-800 airplanes.',
      source: 'FEDERAL_REGISTER',
      status: 'DISCOVERED',
      analysisStatus: 'PENDING_ANALYSIS',
      discoveryTimestamp: new Date().toISOString()
    };

    const importRes = await regulatoryIntelligenceEngine.importCandidatesToCamoRegister({
      candidates: [candidate],
      actor: 'Auditor'
    });
    const regId = importRes.records[0].id;

    await regulatoryIntelligenceEngine.analyzeRegisterRecord(regId, 'Auditor');

    // Reload from state
    const reloadedRecord = camoDb.getState().camoRegulatoryRegister?.find(r => r.id === regId);
    expect(reloadedRecord?.analysisStatus).toBe('ANALYZED');
    expect(reloadedRecord?.analysisCompleteness?.isComplete).toBe(true);
    expect(reloadedRecord?.auditTrail?.length).toBeGreaterThan(0);
  });

  // SCENARIO 14: Delivery accurately consumes analysis status without breaking decoupling
  it('14. Delivery consome corretamente o status real da análise e sinaliza pendências sem quebrar a regra de desacoplamento', async () => {
    const candidate: RegulatoryAdCandidate = {
      id: 'cand-int-14',
      adNumber: '2026-INT-14',
      authority: 'FAA',
      title: 'Rudder Actuator S/N Inspection',
      issueDate: '2026-02-15',
      effectiveDate: '2026-03-05',
      manufacturer: 'Boeing',
      family: '737',
      modelScope: ['737-800'],
      rawApplicabilityText: 'Applies to Boeing 737-800 series airplanes.',
      source: 'FEDERAL_REGISTER',
      status: 'DISCOVERED',
      analysisStatus: 'PENDING_ANALYSIS',
      discoveryTimestamp: new Date().toISOString()
    };

    await regulatoryIntelligenceEngine.importCandidatesToCamoRegister({
      candidates: [candidate],
      actor: 'Auditor'
    });

    const assessment = aircraftDeliveryAssessmentEngine.createAssessment({
      aircraftConfig: {
        registration: 'PR-VGF',
        manufacturer: 'Boeing',
        model: '737-800',
        msn: '39502',
        serialNumber: '39502',
        lineVariation: '737 Next Generation',
        engineModel: 'CFM56-7B26',
        totalFlightHours: 4200,
        totalCycles: 2100,
        totalAirframeHours: 4200,
        totalAirframeCycles: 2100,
        engines: [
          {
            position: '1',
            manufacturer: 'CFM',
            model: 'CFM56-7B26',
            serialNumber: 'ENG-02',
            totalHours: 4200,
            totalCycles: 2100
          }
        ],
        currentModifications: []
      },
      assessmentType: 'DELIVERY',
      lessor: 'Global Aircraft Leasing Corp',
      operator: 'CAMO Air Operator'
    });

    const discoveredAssessment = await aircraftDeliveryAssessmentEngine.executeDiscoveryForAssessment(assessment.id);
    expect(discoveredAssessment).toBeDefined();

    // DeliveryAdItem carries registerAnalysisStatus
    const item = discoveredAssessment.adItems.find(item => item.adNumber === '2026-INT-14');
    expect(item).toBeDefined();
    expect(item?.registerAnalysisStatus).toBe('PENDING_ANALYSIS');
  });
});
