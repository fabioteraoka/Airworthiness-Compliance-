import { describe, it, expect, beforeEach } from 'vitest';
import { camoDb } from '../server/dataStore';
import { regulatoryIntelligenceEngine } from '../server/camoEngine/regulatoryIntelligenceEngine';

describe('CAMO Engine — Phase 9 Stage 7: Living System Design, Aircraft Master & SB Intelligence', () => {
  beforeEach(() => {
    // Reset or ensure state is valid
    const state = camoDb.getState();
    expect(state).toBeDefined();
  });

  it('1. Deve extrair e mapear Boletins de Serviço (SB) referenciados em AD com checklists técnicos estruturados', () => {
    const rawAdText = `
      AIRWORTHINESS DIRECTIVE: FAA AD 2024-20-05.
      Applicability: The Boeing Company Model 737-800, 737-900ER series airplanes.
      Required Actions: Accomplish Boeing Alert Requirements Bulletin 737-53A1420 RB, dated October 15, 2023.
      Accomplish repetitive eddy current inspections in accordance with Boeing Service Bulletin 737-53A1385 Revision 2.
      As a terminating action, incorporate Boeing SB 737-53-1990.
    `;

    const sbs = regulatoryIntelligenceEngine.extractReferencedServiceBulletins(
      rawAdText,
      '2024-20-05',
      'FAA'
    );

    expect(sbs).toBeDefined();
    expect(sbs.length).toBeGreaterThanOrEqual(2);

    const alertRb = sbs.find(s => s.sbNumber.includes('737-53A1420'));
    expect(alertRb).toBeDefined();
    expect(alertRb?.manufacturer).toBe('Boeing');
    expect(alertRb?.relationshipToAd).toBe('MANDATORY_INCORPORATION');
    expect(alertRb?.checklist).toBeDefined();
    expect(alertRb?.checklist?.identification.sbNumber).toContain('737-53A1420');

    const termAction = sbs.find(s => s.sbNumber.includes('737-53-1990'));
    if (termAction) {
      expect(termAction.relationshipToAd).toBe('TERMINATING_ACTION');
    }
  });

  it('2. Deve avaliar deterministicamente a etapa SB_INTELLIGENCE no isAnalysisComplete', () => {
    const state = camoDb.getState();
    const adWithSb = state.camoRegulatoryRegister?.find(r => (r.referencedSbs && r.referencedSbs.length > 0) || r.rawApplicabilityText?.includes('Service Bulletin'));

    if (adWithSb) {
      const evaluation = regulatoryIntelligenceEngine.isAnalysisComplete(adWithSb.id, {
        state: camoDb.getState(),
        actor: 'CAMO Test Engineer'
      });

      expect(evaluation.steps.some(s => s.stepKey === 'SB_INTELLIGENCE')).toBe(true);
      expect(evaluation.sbAnalysisStatus).toBeDefined();
      expect(evaluation.adAnalysisComplete).toBeDefined();
      expect(evaluation.applicabilityStatus).toBeDefined();
      expect(evaluation.complianceStatus).toBeDefined();
    } else {
      // Test with synthetic record without SBs
      const evalNoSb = regulatoryIntelligenceEngine.isAnalysisComplete('FAA-AD-SYNTHETIC-NO-SB', {
        state: camoDb.getState(),
        actor: 'CAMO Test Engineer'
      });

      const sbStep = evalNoSb.steps.find(s => s.stepKey === 'SB_INTELLIGENCE');
      expect(sbStep).toBeDefined();
      expect(sbStep?.status).toBe('SUCCESS');
      expect(evalNoSb.sbAnalysisStatus).toBe('NO_SB_REFERENCED');
    }
  });

  it('3. Deve permitir análise individual de Boletim de Serviço com checklists de engenharia', () => {
    const state = camoDb.getState();
    const register = state.camoRegulatoryRegister || [];
    const target = register.find(r => r.adNumber === '2020-24-02' || r.adNumber.includes('2020-24-02'));
    expect(target).toBeDefined();
    if (!target) throw new Error('Expected canonical fixture AD 2020-24-02 not found in register');

    // Attach synthetic referenced SB
    const sbs = regulatoryIntelligenceEngine.extractReferencedServiceBulletins(
      'Referencing Boeing Service Bulletin 737-28A1200 for fuel pump inspection.',
      target.adNumber,
      target.authority
    );

    camoDb.update(draft => {
      const rec = draft.camoRegulatoryRegister?.find(r => r.id === target.id);
      if (rec) {
        rec.referencedSbs = sbs;
      }
    });

    const analyzedSb = regulatoryIntelligenceEngine.analyzeReferencedServiceBulletin(
      target.id,
      sbs[0].sbNumber,
      {
        technicalNotes: 'Checklist validado pelo engenheiro CAMO com base no CMM e manual do fabricante.',
        actor: 'Eng. Homologador'
      }
    );

    expect(analyzedSb).toBeDefined();
    expect(analyzedSb.analysisStatus).toBe('ANALYZED');
    expect(analyzedSb.checklist?.engineeringValidation?.validatedBy).toBe('Eng. Homologador');

    // Verify persisted record in camoDb
    const updatedRecord = camoDb.getState().camoRegulatoryRegister?.find(r => r.id === target.id);
    const updatedSb = updatedRecord?.referencedSbs?.find(s => s.sbNumber === sbs[0].sbNumber);
    expect(updatedSb?.analysisStatus).toBe('ANALYZED');
  });

  it('4. Deve registrar alterações de configuração no Aircraft Configuration Ledger com SHA-256 e rastreabilidade imutável', () => {
    const state = camoDb.getState();
    const testAircraft = state.aircraft?.find(a => a.registration === 'PR-GUO');
    expect(testAircraft).toBeDefined();
    if (!testAircraft) throw new Error('Expected fixture aircraft PR-GUO not found');

    const historyRecord = camoDb.recordConfigurationChange({
      aircraftId: testAircraft.id,
      registration: testAircraft.registration,
      eventType: 'SB_INCORPORATION',
      componentType: 'WING_BOX',
      partNumberBefore: 'PN-10020-OLD',
      partNumberAfter: 'PN-10020-NEW',
      serialNumberBefore: 'SN-001',
      serialNumberAfter: 'SN-002',
      authorizedBy: 'CAMO Chief Engineer',
      reason: 'Incorporação de SB mandatório 737-53A1420 para cessação de inspeção repetitiva',
      complianceObligationId: 'OBL-TEST-001'
    });

    expect(historyRecord).toBeDefined();
    expect(historyRecord.id).toBeDefined();
    expect(historyRecord.recordHash).toBeDefined();
    expect(historyRecord.recordHash.length).toBe(64); // SHA-256 hex string
    expect(historyRecord.aircraftRegistration).toBe(testAircraft.registration);

    // Verify persistence in camoDb
    const allHistory = camoDb.getState().configurationHistory || [];
    const found = allHistory.find(h => h.id === historyRecord.id);
    expect(found).toBeDefined();
    expect(found?.eventType).toBe('SB_INCORPORATION');
    expect(found?.authorizedBy).toBe('CAMO Chief Engineer');
  });
});
