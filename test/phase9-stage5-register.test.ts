import { describe, it, expect, beforeEach } from 'vitest';
import { regulatoryIntelligenceEngine } from '../server/camoEngine/regulatoryIntelligenceEngine';
import { aircraftDeliveryAssessmentEngine } from '../server/camoEngine/aircraftDeliveryAssessmentEngine';
import { camoDb } from '../server/dataStore';
import { RegulatoryAdCandidate } from '../src/types';

describe('CAMO Engine — Phase 9 Stage 5: Fleet Intake, CAMO Register, Analysis Queue & Delivery', () => {
  beforeEach(() => {
    camoDb.update(draft => {
      if (draft.camoRegulatoryRegister) {
        draft.camoRegulatoryRegister = draft.camoRegulatoryRegister.filter(
          r => !r.adNumber.startsWith('2026-95-') && !r.adNumber.startsWith('2026-DELIVERY-')
        );
      }
      if (draft.adCandidates) {
        draft.adCandidates = draft.adCandidates.filter(
          c => !c.adNumber.startsWith('2026-95-') && !c.adNumber.startsWith('2026-DELIVERY-')
        );
      }
    });
  });

  it('1. Deve realizar screening por frota e comparar com o banco do CAMO classificando deltas', async () => {
    const result = await regulatoryIntelligenceEngine.searchFleetAndCompareWithRegister({
      manufacturer: 'Boeing',
      family: '737',
      model: '737-800',
      engineFamily: 'CFM56-7B',
      authority: 'FAA'
    });

    expect(result).toBeDefined();
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.totalCount).toBe(result.candidates.length);
    expect(result.sourcesConsulted.some(s => s.includes('FAA'))).toBe(true);

    // Cada candidato deve ter delta classification e identificador canônico
    result.candidates.forEach(cand => {
      expect(cand.canonicalAdId).toBeDefined();
      expect(cand.canonicalAdId).toMatch(/^reg-(faa|easa|anac)-/i);
      expect(['NEW', 'UNCHANGED', 'UPDATED', 'SUPERSEDED', 'REVOKED']).toContain(cand.deltaClassification);
      expect(cand.sha256).toBeDefined();
      expect(cand.sha256.length).toBe(64); // Valid SHA-256
    });
  });

  it('2. Deve importar candidatos para o Registro do CAMO estritamente como PENDENTE DE ANÁLISE sem auto-Gemini', async () => {
    const mockCandidate: RegulatoryAdCandidate = {
      id: 'mock-cand-95-001',
      adNumber: '2026-95-01',
      authority: 'FAA',
      title: 'Wing Spar Inspection and Ultrasonic Testing Mandate',
      issueDate: '2026-02-15',
      effectiveDate: '2026-03-01',
      manufacturer: 'Boeing',
      family: '737',
      modelScope: ['737-800', '737-900'],
      rawApplicabilityText: 'Applies to Boeing 737-800 series aircraft with wing spars installed.',
      source: 'FEDERAL_REGISTER',
      status: 'DISCOVERED',
      analysisStatus: 'PENDING_ANALYSIS',
      discoveryTimestamp: new Date().toISOString()
    };

    const importResult = await regulatoryIntelligenceEngine.importCandidatesToCamoRegister({
      candidates: [mockCandidate],
      actor: 'Eng. Teste CAMO',
      operationalPriority: 'CRITICAL_URGENT'
    });

    expect(importResult.importedCount).toBe(1);
    expect(importResult.records.length).toBe(1);

    const record = importResult.records[0];
    // Invariante Estrita: Status compulsório PENDING_ANALYSIS
    expect(record.analysisStatus).toBe('PENDING_ANALYSIS');
    expect(record.analyzedRequirementId).toBeUndefined(); // Sem IA automática!
    expect(record.adNumber).toBe('2026-95-01');
    expect(record.version).toBe(1);
    expect(record.canonicalAdId).toBeDefined();
    expect(record.canonicalAdId).toMatch(/^reg-faa-/i);
    expect(record.sha256).toBeDefined();

    // Persistência no banco camoDb
    const dbRecords = camoDb.getState().camoRegulatoryRegister || [];
    const foundInDb = dbRecords.find(r => r.canonicalAdId === record.canonicalAdId);
    expect(foundInDb).toBeDefined();
    expect(foundInDb?.analysisStatus).toBe('PENDING_ANALYSIS');
  });

  it('3. Deve garantir idempotência: re-importar a mesma AD não duplica registros', async () => {
    const mockCandidate: RegulatoryAdCandidate = {
      id: 'mock-cand-idempotent',
      adNumber: '2026-95-02',
      authority: 'FAA',
      title: 'Elevator Control Tab Rod Inspection',
      issueDate: '2026-01-10',
      effectiveDate: '2026-02-01',
      manufacturer: 'Boeing',
      family: '737',
      modelScope: ['737-800'],
      rawApplicabilityText: 'Applies to 737-800 elevators.',
      source: 'FEDERAL_REGISTER',
      status: 'DISCOVERED',
      analysisStatus: 'PENDING_ANALYSIS',
      discoveryTimestamp: new Date().toISOString()
    };

    // Primeira importação
    await regulatoryIntelligenceEngine.importCandidatesToCamoRegister({
      candidates: [mockCandidate],
      actor: 'Eng. Teste'
    });

    // Segunda importação idêntica
    const secondImport = await regulatoryIntelligenceEngine.importCandidatesToCamoRegister({
      candidates: [mockCandidate],
      actor: 'Eng. Teste'
    });

    expect(secondImport.importedCount).toBe(0);
    expect(secondImport.unchangedCount).toBe(1);

    // Contagem no banco não deve aumentar
    const dbRecords = (camoDb.getState().camoRegulatoryRegister || []).filter(
      r => r.adNumber === '2026-95-02'
    );
    expect(dbRecords.length).toBe(1);
  });

  it('4. Deve permitir a análise individual sob demanda na Fila Operacional', async () => {
    const mockCandidate: RegulatoryAdCandidate = {
      id: 'mock-cand-to-analyze',
      adNumber: '2026-95-03',
      authority: 'FAA',
      title: 'Hydraulic Return Line Clamping Mandate',
      issueDate: '2026-01-20',
      effectiveDate: '2026-02-10',
      manufacturer: 'Boeing',
      family: '737',
      modelScope: ['737-800'],
      rawApplicabilityText: 'This airworthiness directive applies to Boeing Model 737-800 series airplanes certificated in any category.',
      source: 'FEDERAL_REGISTER',
      status: 'DISCOVERED',
      analysisStatus: 'PENDING_ANALYSIS',
      discoveryTimestamp: new Date().toISOString()
    };

    const importRes = await regulatoryIntelligenceEngine.importCandidatesToCamoRegister({
      candidates: [mockCandidate],
      actor: 'Eng. Auditor'
    });

    const regId = importRes.records[0].id;
    expect(importRes.records[0].analysisStatus).toBe('PENDING_ANALYSIS');

    // Executa análise individual disparada deliberadamente pelo engenheiro
    const analysisRes = await regulatoryIntelligenceEngine.analyzeRegisterRecord(regId, 'Eng. Analista CAMO');

    expect(analysisRes.success).toBe(true);
    expect(analysisRes.record.analysisStatus).toBe('ANALYZED');
    expect(analysisRes.record.analyzedRequirementId).toBeDefined();
    expect(analysisRes.knowledgeItem).toBeDefined();
    expect(analysisRes.knowledgeItem?.adNumber).toBe('2026-95-03');

    // Verifica que o registro no banco foi atualizado
    const dbRecord = (camoDb.getState().camoRegulatoryRegister || []).find(r => r.id === regId);
    expect(dbRecord?.analysisStatus).toBe('ANALYZED');
    expect(dbRecord?.analyzedRequirementId).toBe(analysisRes.record.analyzedRequirementId);
  });

  it('5. Deve integrar o Registro do CAMO no Relatório de Delivery mantendo ADs pendentes explicitamente visíveis', async () => {
    // Insere AD pendente de análise no Register
    const pendingCand: RegulatoryAdCandidate = {
      id: 'mock-cand-delivery-test',
      adNumber: '2026-DELIVERY-01',
      authority: 'FAA',
      title: 'Horizontal Stabilizer Trim Jackscrew Lubrication',
      issueDate: '2026-02-01',
      effectiveDate: '2026-02-25',
      manufacturer: 'Boeing',
      family: '737',
      modelScope: ['737-800'],
      rawApplicabilityText: 'Applies to Boeing 737-800 jackscrews.',
      source: 'FEDERAL_REGISTER',
      status: 'DISCOVERED',
      analysisStatus: 'PENDING_ANALYSIS',
      discoveryTimestamp: new Date().toISOString()
    };

    await regulatoryIntelligenceEngine.importCandidatesToCamoRegister({
      candidates: [pendingCand],
      actor: 'Eng. Fleet Manager'
    });

    // Cria assessment de Delivery para Boeing 737-800
    const assessment = aircraftDeliveryAssessmentEngine.createAssessment({
      aircraftConfig: {
        registration: 'PR-TEST95',
        manufacturer: 'Boeing',
        model: '737-800',
        msn: '39501',
        serialNumber: '39501',
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
            serialNumber: 'ENG-01',
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

    // Executa descoberta para a aeronave
    const discoveredAssessment = await aircraftDeliveryAssessmentEngine.executeDiscoveryForAssessment(assessment.id);

    // O item pendente do register DEVE estar no inventário de ADs
    const deliveryItem = discoveredAssessment.adItems.find(i => i.adNumber === '2026-DELIVERY-01');
    expect(deliveryItem).toBeDefined();
    expect(deliveryItem?.camoRegisterId).toBeDefined();
    expect(deliveryItem?.registerAnalysisStatus).toBe('PENDING_ANALYSIS');

    // Invariante Estrita: Não pode ser marcado cegamente como APPLICABLE ou COMPLIED
    expect(deliveryItem?.regulatoryComplianceStatus).not.toBe('COMPLIED');
    expect(deliveryItem?.confrontationStatus).toBe('PENDING_ANALYSIS');

    // Gera snapshot criptográfico imutável com a consolidação da entrega
    const snapshot = aircraftDeliveryAssessmentEngine.finalizeAssessment(
      assessment.id,
      'Eng. Chefe de Aeronavegabilidade'
    );
    expect(snapshot.auditHash).toBeDefined();
    expect(snapshot.auditHash.length).toBe(64);
    expect(snapshot.complianceSummary.pendingAnalysis).toBeGreaterThanOrEqual(1);
  });
});
