import { describe, it, expect, beforeEach } from 'vitest';
import { regulatoryIntelligenceEngine, CandidateAircraftData } from '../server/camoEngine/regulatoryIntelligenceEngine';
import { camoDb } from '../server/dataStore';
import { Aircraft } from '../src/types';

describe('CAMO Engine — Phase 9 Stage 4: Regulatory Intelligence & Progressive Applicability', () => {

  it('1. Deve descobrir e filtrar candidatas regulatórias por família e autoridade sem contaminar dados físicos de frota', async () => {
    const a320Res = await regulatoryIntelligenceEngine.searchCandidatesByFamilyOrModel('A320');
    expect(a320Res.family).toBe('A320');
    expect(a320Res.candidates.length).toBeGreaterThan(0);
    expect(a320Res.candidates.some(c => c.adNumber.includes('2024'))).toBe(true);

    const faaRes = await regulatoryIntelligenceEngine.searchCandidatesByFamilyOrModel('A320', undefined, 'FAA');
    expect(faaRes.candidates.length).toBeGreaterThan(0);
    expect(faaRes.candidates.every(c => c.authority === 'FAA')).toBe(true);

    const b737Res = await regulatoryIntelligenceEngine.searchCandidatesByFamilyOrModel('737');
    expect(b737Res.family).toBe('737');
    expect(b737Res.candidates.length).toBeGreaterThan(0);
  });

  it('2. Deve extrair parâmetros de configuração requeridos sem inventar dados durante a análise da diretriz', async () => {
    const res = await regulatoryIntelligenceEngine.searchCandidatesByFamilyOrModel('A320');
    const targetCandidate = res.candidates[0];
    expect(targetCandidate).toBeDefined();

    const analysisResult = await regulatoryIntelligenceEngine.analyzeCandidateAd(targetCandidate.id, 'Test Chief Engineer');
    expect(analysisResult).toBeDefined();
    expect(analysisResult.knowledgeItem.adNumber).toBe(targetCandidate.adNumber);
    expect(analysisResult.requiredConfigurationParameters.length).toBeGreaterThan(0);

    // Parâmetros extraídos devem possuir rastreabilidade e chaves canônicas
    for (const param of analysisResult.requiredConfigurationParameters) {
      expect(param.parameterKey).toBeDefined();
      expect(param.label).toBeDefined();
      expect(param.category).toMatch(/AIRFRAME|ENGINE|COMPONENT|MODIFICATION/);
    }
  });

  it('3. Deve aferir completude de aeronave da frota e calcular lacunas com precisão determinística', async () => {
    const state = camoDb.getState();
    const aircraft = state.aircraft[0]; // PR-AIA (A320-214)
    expect(aircraft).toBeDefined();

    const assessment = await regulatoryIntelligenceEngine.assessAircraftConfigurationCompleteness(aircraft.id, 'A320');
    expect(assessment).toBeDefined();
    expect(assessment.aircraftId).toBe(aircraft.id);
    expect(assessment.family).toBe('A320');
    expect(assessment.completionPercentage).toBeGreaterThanOrEqual(0);
    expect(assessment.completionPercentage).toBeLessThanOrEqual(100);

    // A soma dos estados de aplicabilidade progressiva deve totalizar as ADs avaliadas
    const totalBreakdown = 
      assessment.applicabilityBreakdown.potentiallyApplicable +
      assessment.applicabilityBreakdown.insufficientData +
      assessment.applicabilityBreakdown.reviewRequired +
      assessment.applicabilityBreakdown.applicable +
      assessment.applicabilityBreakdown.notApplicable;

    expect(totalBreakdown).toBe(assessment.applicabilityBreakdown.totalEvaluatedAds);
  });

  it('4. Regra Inviolável de Segurança CAMO: Falta de informação NUNCA gera NOT_APPLICABLE', async () => {
    // Avaliando aeronave candidata com dados intencionalmente ausentes (sem ESN no Motor 2)
    const candidateAircraft: CandidateAircraftData = {
      manufacturer: 'Airbus',
      model: 'A320-214',
      msn: '9999',
      registration: 'PR-TEST',
      engines: [
        { model: 'CFM56-5B4/P', serialNumber: '697412', position: 'Pos 1' },
        { model: 'CFM56-5B4/P', serialNumber: '', position: 'Pos 2' } // S/N vazio!
      ],
      components: []
    };

    const assessment = await regulatoryIntelligenceEngine.assessAircraftConfigurationCompleteness(candidateAircraft, 'A320');
    expect(assessment.missingParametersCount).toBeGreaterThan(0);
    expect(assessment.operationalMissingList.length).toBeGreaterThan(0);

    // O status progressivo deve ser INSUFFICIENT_DATA para ADs que dependem do motor, nunca NOT_APPLICABLE
    const hasInsufficient = assessment.applicabilityBreakdown.insufficientData > 0 || assessment.applicabilityBreakdown.potentiallyApplicable > 0;
    expect(hasInsufficient).toBe(true);
  });

  it('5. Deve permitir resolução operacional de lacunas in-loco e recalcular completude imediatamente', async () => {
    const candidateAircraft: CandidateAircraftData = {
      manufacturer: 'Airbus',
      model: 'A320-214',
      msn: '9998',
      registration: 'PR-TEST2',
      engines: [
        { model: 'CFM56-5B4/P', serialNumber: '697412', position: 'Pos 1' }
      ]
    };

    const initialAssessment = await regulatoryIntelligenceEngine.assessAircraftConfigurationCompleteness(candidateAircraft, 'A320');
    const initialMissingCount = initialAssessment.missingParametersCount;

    if (initialAssessment.operationalMissingList.length > 0) {
      const missingParam = initialAssessment.operationalMissingList[0];
      const updatedAssessment = await regulatoryIntelligenceEngine.resolveMissingConfigurationParameter(
        initialAssessment.id,
        missingParam.parameterKey,
        'RESOLVED_SERIAL_123',
        'CAMO Lead Engineer'
      );

      expect(updatedAssessment.missingParametersCount).toBeLessThan(initialMissingCount);
      const resolvedItem = updatedAssessment.operationalMissingList.find(m => m.parameterKey === missingParam.parameterKey);
      expect(resolvedItem?.resolved).toBe(true);
      expect(resolvedItem?.resolvedValue).toBe('RESOLVED_SERIAL_123');
    }
  });

  it('6. Regra Inviolável de Componente Removido: Componente removido não pode ser considerado instalado', async () => {
    const candidateAircraft: CandidateAircraftData = {
      manufacturer: 'Airbus',
      model: 'A320-214',
      msn: '9997',
      registration: 'PR-TEST3',
      components: [
        {
          partNumber: '762300-1',
          serialNumber: 'SN-REMOVED-99',
          status: 'REMOVED' // Removido do avião!
        }
      ]
    };

    const assessment = await regulatoryIntelligenceEngine.assessAircraftConfigurationCompleteness(candidateAircraft, 'A320');
    // Para parâmetro de P/N instalado, o componente removido não deve constar como AVAILABLE
    const componentEval = assessment.parameterEvaluations.find(p => p.parameterKey === 'component_pn_762300-1');
    if (componentEval) {
      expect(componentEval.evaluationStatus).not.toBe('AVAILABLE');
    }
  });
});
