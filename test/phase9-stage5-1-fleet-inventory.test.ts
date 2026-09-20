import { describe, it, expect, beforeEach } from 'vitest';
import { regulatoryIntelligenceEngine } from '../server/camoEngine/regulatoryIntelligenceEngine';
import { aircraftDeliveryAssessmentEngine } from '../server/camoEngine/aircraftDeliveryAssessmentEngine';
import { camoDb } from '../server/dataStore';
import { AircraftDeliveryAssessmentInput } from '../src/types';

describe('CAMO Engine — Phase 9 Stage 5.1: Fleet AD Inventory & Operational Discovery', () => {
  beforeEach(() => {
    camoDb.update(draft => {
      draft.camoRegulatoryRegister = [];
      draft.adCandidates = (draft.adCandidates || []).filter(c => !c.id.startsWith('sim-faa-'));
    });
    // Pre-populate realistic seed aircraft in camoDb
    camoDb.update(draft => {
      if (!draft.aircraft.some(a => a.id === 'ac-b737-01')) {
        draft.aircraft.push({
          id: 'ac-b737-01',
          registration: 'PR-GXA',
          model: '737-800',
          manufacturer: 'Boeing',
          series: '737 Next Generation',
          msn: '35001',
          operatorId: 'GOL Linhas Aéreas',
          aircraftType: 'Commercial Transport',
          status: 'OPERATIONAL',
          totalFlightHours: 12500,
          totalCycles: 8900,
          totalLandings: 8900
        });
      }
      if (!draft.aircraft.some(a => a.id === 'ac-a320-01')) {
        draft.aircraft.push({
          id: 'ac-a320-01',
          registration: 'PR-MYA',
          model: 'A320-214',
          manufacturer: 'Airbus',
          series: 'A320ceo',
          msn: '5501',
          operatorId: 'LATAM Airlines',
          aircraftType: 'Commercial Transport',
          status: 'OPERATIONAL',
          totalFlightHours: 14200,
          totalCycles: 9800,
          totalLandings: 9800
        });
      }
    });
  });

  it('1. Deve executar a busca regulatória completa para uma frota B737-800 e retornar o inventário unificado com contadores', async () => {
    const intakeResult = await regulatoryIntelligenceEngine.searchFleetAndCompareWithRegister({
      manufacturer: 'Boeing',
      family: '737',
      model: '737-800',
      engine: 'CFM56-7B',
      autoPaginate: true
    });

    expect(intakeResult).toBeDefined();
    expect(intakeResult.candidates.length).toBeGreaterThan(0);
    expect(intakeResult.totalCount).toBe(intakeResult.candidates.length);
    expect(intakeResult.sourcesConsulted.length).toBeGreaterThanOrEqual(1);

    // Initial state before fresh batch import:
    // New + Unchanged matches total candidates
    expect(intakeResult.newCount + intakeResult.unchangedCount).toBe(intakeResult.candidates.length);
    expect(intakeResult.importedCount).toBe(intakeResult.unchangedCount);
    expect(intakeResult.notImportedCount).toBe(intakeResult.newCount);

    // Check candidate properties
    const sample = intakeResult.candidates[0];
    expect(sample.canonicalAdId).toBeDefined();
    expect(sample.adNumber).toBeDefined();
    expect(sample.sha256).toBeDefined();
  });

  it('2. Deve importar todas as ADs da frota B737-800 para o CAMO Register como PENDING_ANALYSIS (sem acionar IA) e verificar a idempotência', async () => {
    // 1. Initial Discovery
    const intake1 = await regulatoryIntelligenceEngine.searchFleetAndCompareWithRegister({
      manufacturer: 'Boeing',
      family: '737',
      model: '737-800',
      autoPaginate: true
    });

    const initialTotal = intake1.candidates.length;
    expect(initialTotal).toBeGreaterThan(0);

    // 2. Batch Import to Register
    const importResult = await regulatoryIntelligenceEngine.importCandidatesToCamoRegister({
      candidates: intake1.candidates,
      actor: 'Engenheiro Chefe CAMO'
    });

    expect(importResult.importedNew + importResult.updated + importResult.skippedExisting).toBe(initialTotal);
    expect(importResult.importedNew).toBeGreaterThan(0);

    // Verify records in CAMO Register
    const state = camoDb.getState();
    const boeingRegister = state.camoRegulatoryRegister.filter(r => r.family === '737' || r.manufacturer === 'Boeing');
    expect(boeingRegister.length).toBeGreaterThanOrEqual(initialTotal);

    // 3. Re-search same fleet: must be idempotent, reporting 0 new, and unchangedCount matching initialTotal
    const intake2 = await regulatoryIntelligenceEngine.searchFleetAndCompareWithRegister({
      manufacturer: 'Boeing',
      family: '737',
      model: '737-800',
      autoPaginate: true
    });

    expect(intake2.newCount).toBe(0);
    expect(intake2.unchangedCount).toBe(initialTotal);
    expect(intake2.importedCount).toBe(initialTotal);
    expect(intake2.notImportedCount).toBe(0);

    // 4. Re-import must be 100% idempotent (0 imported, all skipped)
    const reImport = await regulatoryIntelligenceEngine.importCandidatesToCamoRegister({
      candidates: intake2.candidates,
      actor: 'Engenheiro Chefe CAMO'
    });

    expect(reImport.importedNew).toBe(0);
    expect(reImport.skippedExisting).toBe(initialTotal);
  });

  it('3. Deve assegurar isolamento estrito entre frotas (Frota A vs Frota B)', async () => {
    // Search Boeing 737
    const boeingIntake = await regulatoryIntelligenceEngine.searchFleetAndCompareWithRegister({
      manufacturer: 'Boeing',
      family: '737',
      model: '737-800',
      autoPaginate: true
    });

    // Import Boeing ADs into register
    await regulatoryIntelligenceEngine.importCandidatesToCamoRegister({
      candidates: boeingIntake.candidates,
      actor: 'Engenheiro CAMO'
    });

    // Verify all Boeing ADs mention Boeing or 737, and do not contain Airbus
    for (const ad of boeingIntake.candidates) {
      const text = `${ad.title} ${(ad.modelScope || []).join(' ')} ${ad.rawApplicabilityText || ''} ${ad.manufacturer || ''}`.toUpperCase();
      expect(text).not.toContain('A320');
      expect(text).not.toContain('AIRBUS');
    }

    // Search Airbus A320
    const airbusIntake = await regulatoryIntelligenceEngine.searchFleetAndCompareWithRegister({
      manufacturer: 'Airbus',
      family: 'A320',
      model: 'A320-214',
      autoPaginate: true
    });

    // Airbus ADs must not contain 737 or Boeing
    for (const ad of airbusIntake.candidates) {
      const text = `${ad.title} ${(ad.modelScope || []).join(' ')} ${ad.rawApplicabilityText || ''} ${ad.manufacturer || ''}`.toUpperCase();
      expect(text).not.toContain('737');
      expect(text).not.toContain('BOEING');
    }

    // The Airbus search should NOT see the Boeing ADs as inRegister for Airbus
    // It only sees its own Airbus register record
    expect(airbusIntake.candidates.filter(c => c.inRegister).length).toBe(airbusIntake.importedCount);
    for (const ad of airbusIntake.candidates.filter(c => c.inRegister)) {
      expect(ad.manufacturer).not.toBe('Boeing');
      expect(ad.family).not.toBe('737');
    }
  });

  it('4. Teste Crítico de Quantidade: Deve processar grandes volumes (300+ ADs) sem truncamento artificial', async () => {
    // Generate a simulated batch of 350 AD candidates for a large fleet
    const largeFleetCandidates = [];
    for (let i = 1; i <= 350; i++) {
      const padded = String(i).padStart(4, '0');
      largeFleetCandidates.push({
        id: `sim-faa-2024-${padded}`,
        authority: 'FAA' as const,
        adNumber: `2024-99-${padded}`,
        title: `Airworthiness Directive ${i} for Boeing 737 Next Generation Aircraft Systems`,
        manufacturer: 'Boeing',
        family: '737',
        modelScope: ['737-800', '737-700', '737-900'],
        rawApplicabilityText: 'Applies to Boeing Model 737-800 airplanes, certificated in any category.',
        issueDate: '2024-05-10',
        effectiveDate: '2024-06-15',
        source: 'FEDERAL_REGISTER' as const,
        status: 'DISCOVERED' as const,
        discoveryTimestamp: new Date().toISOString()
      });
    }

    // Save candidates to camoDb
    camoDb.update(draft => {
      draft.adCandidates = (draft.adCandidates || []).concat(largeFleetCandidates);
    });

    // Query inventory
    const largeIntake = await regulatoryIntelligenceEngine.searchFleetAndCompareWithRegister({
      manufacturer: 'Boeing',
      family: '737',
      model: '737-800',
      autoPaginate: true
    });

    // Must return at least 350 candidates with NO truncation
    expect(largeIntake.candidates.length).toBeGreaterThanOrEqual(350);
    expect(largeIntake.totalCount).toBeGreaterThanOrEqual(350);

    // Batch import 350 candidates
    const importResult = await regulatoryIntelligenceEngine.importCandidatesToCamoRegister({
      candidates: largeIntake.candidates,
      actor: 'Engenheiro de Frota'
    });

    expect(importResult.importedNew).toBeGreaterThanOrEqual(350);

    // Verify all 350 are now in register
    const state = camoDb.getState();
    const imported737 = state.camoRegulatoryRegister.filter(r => r.family === '737' || r.manufacturer === 'Boeing');
    expect(imported737.length).toBeGreaterThanOrEqual(350);
  });

  it('5. Integração com Delivery Assessment: ADs importadas como PENDING_ANALYSIS devem aparecer no Delivery como pendentes de análise e NÃO como COMPLIANT', async () => {
    // 1. Initial Fleet discovery for B737-800
    const intake = await regulatoryIntelligenceEngine.searchFleetAndCompareWithRegister({
      manufacturer: 'Boeing',
      family: '737',
      model: '737-800',
      autoPaginate: true
    });

    // 2. Import into register (all enter as PENDING_ANALYSIS)
    await regulatoryIntelligenceEngine.importCandidatesToCamoRegister({
      candidates: intake.candidates,
      actor: 'CAMO Regulatory Officer'
    });

    // 3. Create Delivery Assessment for aircraft PR-GXA (Boeing 737-800)
    const assessmentInput: AircraftDeliveryAssessmentInput = {
      aircraftConfig: {
        registration: 'PR-GXA',
        msn: '35001',
        model: '737-800',
        manufacturer: 'Boeing',
        series: '737 Next Generation',
        engineModel: 'CFM56-7B',
        manufactureDate: '2015-06-01',
        totalFlightHours: 12500,
        totalCycles: 8900,
        engines: [
          { position: '1', manufacturer: 'CFM', model: 'CFM56-7B', serialNumber: 'SN-01', totalHours: 12500, totalCycles: 8900 }
        ]
      },
      assessmentType: 'LEASE_TRANSITION',
      lessor: 'AerCap Aviation',
      operator: 'GOL Linhas Aéreas',
      targetDeliveryDate: '2026-12-01'
    };

    const initialAssessment = await aircraftDeliveryAssessmentEngine.createAssessment(assessmentInput);
    expect(initialAssessment).toBeDefined();

    // Execute discovery for the delivery assessment to pull from CAMO register
    const assessment = await aircraftDeliveryAssessmentEngine.executeDiscoveryForAssessment(initialAssessment.id);
    expect(assessment).toBeDefined();
    expect(assessment.adItems.length).toBeGreaterThan(0);

    // Verify compliance status: items from PENDING_ANALYSIS register record MUST NOT be COMPLIANT or MATCH
    const pendingItems = assessment.adItems.filter(item => 
      item.registerAnalysisStatus === 'PENDING_ANALYSIS' || item.confrontationStatus === 'PENDING_ANALYSIS'
    );
    expect(pendingItems.length).toBeGreaterThan(0);

    for (const item of pendingItems) {
      expect(item.confrontationStatus).not.toBe('MATCH');
      expect(item.regulatoryComplianceStatus).not.toBe('COMPLIED');
      expect(['PENDING_ANALYSIS', 'REVIEW_REQUIRED']).toContain(item.registerAnalysisStatus);
    }

    // Now analyze ONE specific record (prefer canonical known complete AD from Boeing 737 candidate list)
    const targetAd = pendingItems.find(i => i.adNumber.includes('2024-12-05') || i.adNumber.includes('2020-24-02')) || pendingItems[0];
    const regRecord = camoDb.getState().camoRegulatoryRegister.find(r => r.adNumber === targetAd.adNumber);
    expect(regRecord).toBeDefined();

    const analysisResult = await regulatoryIntelligenceEngine.analyzeRegisterRecord({
      registerRecordId: regRecord!.id,
      actor: 'Engenheiro Chefe'
    });

    expect(analysisResult.success).toBe(true);
    expect(analysisResult.requirement).toBeDefined();

    // Verify that the record now has analysisStatus: 'ANALYZED'
    const updatedRecord = camoDb.getState().camoRegulatoryRegister.find(r => r.id === regRecord!.id);
    expect(updatedRecord?.analysisStatus).toBe('ANALYZED');
    expect(updatedRecord?.analyzedRequirementId).toBe(analysisResult.requirement?.id);

    // Re-run discovery for assessment: this one AD should now be evaluated while others remain PENDING_ANALYSIS
    const reAssessment = await aircraftDeliveryAssessmentEngine.executeDiscoveryForAssessment(assessment.id, { forceFreshScan: true });

    const analyzedItem = reAssessment.adItems.find(i => i.adNumber === targetAd.adNumber);
    expect(analyzedItem?.registerAnalysisStatus).toBe('ANALYZED');
    expect(analyzedItem?.complianceRequirementId).toBe(analysisResult.requirement?.id);
  });
});
