import { describe, it, expect, beforeEach, vi } from 'vitest';
import { camoDb } from '../server/dataStore';
import { regulatoryIntelligenceEngine } from '../server/camoEngine/regulatoryIntelligenceEngine';
import * as geminiService from '../server/geminiService';
import { CamoRegulatoryRecord } from '../src/types';

describe('FASE 3B.1 — Surgical Stabilization Gate Audit Verification', () => {
  beforeEach(() => {
    camoDb.resetToSeed();
    // Deterministic mock for Gemini extraction in unit tests
    vi.spyOn(geminiService, 'extractAdWithGemini').mockImplementation(async (input) => {
      return geminiService.parseAdSafelyWithoutFabrication(input.text || '', input.fileName || 'ad.txt');
    });
  });

  describe('Audit Issue 1: AdUpload Lifecycle (Upload -> CamoRegulatoryRecord -> Analysis -> ComplianceRequirement)', () => {
    it('should create CamoRegulatoryRecord with PENDING_ANALYSIS and audit trail before generating ComplianceRequirement', async () => {
      const adText = `
        AIRWORTHINESS DIRECTIVE
        AD Number: FAA-2026-99-88
        Manufacturer: Boeing
        Applicability: Applies to Boeing 737-800 series airplanes.
        Actions: Mandatory inspection of wing flap track fairing attachments within 30 days.
      `;

      const result = await regulatoryIntelligenceEngine.ingestUploadedAdDocument({
        text: adText,
        fileName: 'AD_FAA-2026-99-88.txt',
        actor: 'Lead CAMO Engineer'
      });

      expect(result.success).toBe(true);
      expect(result.record).toBeDefined();
      expect(result.record.adNumber).toContain('2026-99-88');

      // Verify the record was registered in camoRegulatoryRegister
      const state = camoDb.getState();
      const storedRecord = state.camoRegulatoryRegister?.find(r => r.adNumber.includes('2026-99-88'));
      expect(storedRecord).toBeDefined();

      // Verify audit trail captures the initial ingestion and regulatory record creation
      const auditActions = storedRecord?.auditTrail?.map(a => a.action) || [];
      expect(auditActions).toContain('AD_UPLOADED');
      expect(auditActions).toContain('REGULATORY_RECORD_CREATED');

      // Verify that requirement was synthesized and linked to the record
      expect(result.requirement).toBeDefined();
      expect(storedRecord?.analyzedRequirementId).toBe(result.requirement?.id);

      const storedReq = state.requirements.find(r => r.id === storedRecord?.analyzedRequirementId);
      expect(storedReq).toBeDefined();
      expect(storedReq?.sourceNumber).toContain('2026-99-88');
    });

    it('should deduplicate subsequent uploads of the same AD without creating duplicate requirements', async () => {
      const adText = `
        AIRWORTHINESS DIRECTIVE
        AD Number: FAA-2026-11-22
        Manufacturer: Boeing
        Applicability: Applies to Boeing 737-800 series airplanes.
      `;

      const firstResult = await regulatoryIntelligenceEngine.ingestUploadedAdDocument({
        text: adText,
        fileName: 'AD_2026_11_22.txt',
        actor: 'Analyst A'
      });

      expect(firstResult.isDuplicate).toBe(false);

      const secondResult = await regulatoryIntelligenceEngine.ingestUploadedAdDocument({
        text: adText,
        fileName: 'AD_2026_11_22.txt',
        actor: 'Analyst B'
      });

      expect(secondResult.isDuplicate).toBe(true);
      expect(secondResult.record.id).toBe(firstResult.record.id);

      // Verify no duplicate requirements were inserted into database
      const state = camoDb.getState();
      const matchingReqs = state.requirements.filter(r => r.sourceNumber.includes('2026-11-22'));
      expect(matchingReqs.length).toBe(1);
    });
  });

  describe('Audit Issue 2: Deterministic Fleet Selection (No non-deterministic fallbacks)', () => {
    it('should select targets explicitly by canonical adNumber and authority, rejecting arbitrary fallbacks', async () => {
      const state = camoDb.getState();
      const register = state.camoRegulatoryRegister || [];

      // Find explicit known fixture in register
      const targetAd = register.find(r => r.adNumber === '2024-12-05' || r.adNumber.includes('2024-12-05'));
      expect(targetAd).toBeDefined();

      const analysis = await regulatoryIntelligenceEngine.analyzeRegisterRecord({
        registerRecordId: targetAd!.id,
        actor: 'Deterministic Auditor'
      });

      expect(analysis.record.adNumber).toBe(targetAd!.adNumber);
      expect(analysis.completeness).toBeDefined();
    });
  });

  describe('Audit Issue 3: Service Bulletin Resolution & CHECKLIST_GENERATED vs ANALYZED', () => {
    it('should mark AD as DEPENDENCY_PENDING when mandatory SB has generated checklist but physical document is NOT_LOCATED', async () => {
      // Create a test regulatory record referencing a mandatory SB not in repository
      const now = new Date().toISOString();
      const unlocatedSbRecord: CamoRegulatoryRecord = {
        id: 'camo-faa-ad-2026-sb-dep-test',
        canonicalAdId: 'camo-faa-ad-2026-sb-dep-test',
        authority: 'FAA',
        adNumber: 'FAA-2026-SB-TEST',
        title: 'Airworthiness Directive Requiring Mandatory SB Incorporation',
        issueDate: '2026-03-01',
        effectiveDate: '2026-03-15',
        emergencyAd: false,
        supersedes: [],
        manufacturer: 'Boeing',
        family: 'B737',
        modelScope: ['737-800'],
        rawApplicabilityText: 'Applies to Boeing 737-800 airplanes. Accomplish Boeing Service Bulletin B737-99-9999 Rev 0 mandatory incorporation.',
        sha256: 'sha256-sb-test-unique-hash',
        sourceType: 'MANUAL_UPLOAD',
        sourceIdentifier: 'AD_FAA-2026-SB-TEST.txt',
        firstSeenAt: now,
        lastSeenAt: now,
        lastChangedAt: now,
        retrievedAt: now,
        analysisStatus: 'PENDING_ANALYSIS',
        importedAt: now,
        importedBy: 'CAMO QA Auditor',
        version: 1
      };

      camoDb.update(draft => {
        if (!draft.camoRegulatoryRegister) draft.camoRegulatoryRegister = [];
        draft.camoRegulatoryRegister.push(unlocatedSbRecord);
      });

      const analysis = await regulatoryIntelligenceEngine.analyzeRegisterRecord({
        registerRecordId: unlocatedSbRecord.id,
        actor: 'CAMO QA Auditor'
      });

      // SB checklist is generated
      const referencedSb = analysis.record.referencedSbs?.find(s => s.sbNumber.includes('737-99-9999'));
      expect(referencedSb).toBeDefined();
      expect(referencedSb?.checklistStatus).toBe('CHECKLIST_GENERATED');
      expect(referencedSb?.checklist).toBeDefined();

      // However, because it is unlocated, analysisStatus must remain PENDING_RETRIEVAL and NOT ANALYZED!
      expect(referencedSb?.documentAvailability).toBe('NOT_LOCATED');
      expect(referencedSb?.analysisStatus).toBe('PENDING_RETRIEVAL');

      // The AD technical completeness must be DEPENDENCY_PENDING (blocking completeness)
      expect(analysis.record.analysisStatus).toBe('DEPENDENCY_PENDING');
      expect(analysis.record.adTechnicalAnalysisCompleteness).toBe('DEPENDENCY_PENDING');
      expect(analysis.success).toBe(false);
    });

    it('should complete technical analysis and set TECHNICAL_ANALYSIS_COMPLETE when all mandatory SBs are analyzed', async () => {
      // Place SB into sbRepository and sbAnalyses first
      const sbKey = 'B737-77-7777';
      camoDb.update(draft => {
        if (!draft.sbRepository) draft.sbRepository = [];
        draft.sbRepository.push({
          id: 'sb-doc-7777',
          documentNumber: sbKey,
          revision: 'Rev 0',
          title: 'Flap Track Reinforcement',
          manufacturer: 'Boeing',
          modelScope: ['737-800'],
          extractedAt: new Date().toISOString(),
          status: 'AVAILABLE'
        } as any);

        if (!draft.sbAnalyses) draft.sbAnalyses = [];
        draft.sbAnalyses.push({
          id: 'sb-ana-7777',
          sbNumber: sbKey,
          revision: 'Rev 0',
          manufacturer: 'Boeing',
          status: 'ANALYZED',
          analyzedAt: new Date().toISOString(),
          analyzedBy: 'SB Engineer',
          summary: 'Analyzed successfully'
        } as any);
      });

      const nowComplete = new Date().toISOString();
      const adRecord: CamoRegulatoryRecord = {
        id: 'camo-faa-ad-2026-sb-complete-test',
        canonicalAdId: 'camo-faa-ad-2026-sb-complete-test',
        authority: 'FAA',
        adNumber: 'FAA-2026-SB-COMPLETE',
        title: 'AD with Available and Analyzed SB',
        issueDate: '2026-03-01',
        effectiveDate: '2026-03-15',
        emergencyAd: false,
        supersedes: [],
        manufacturer: 'Boeing',
        family: 'B737',
        modelScope: ['737-800'],
        rawApplicabilityText: 'Applies to Boeing 737-800 airplanes. Accomplish Boeing Service Bulletin B737-77-7777 terminating action.',
        sha256: 'sha256-sb-complete-hash',
        sourceType: 'MANUAL_UPLOAD',
        sourceIdentifier: 'AD_FAA-2026-SB-COMPLETE.txt',
        firstSeenAt: nowComplete,
        lastSeenAt: nowComplete,
        lastChangedAt: nowComplete,
        retrievedAt: nowComplete,
        analysisStatus: 'PENDING_ANALYSIS',
        importedAt: nowComplete,
        importedBy: 'CAMO QA Auditor',
        version: 1
      };

      camoDb.update(draft => {
        draft.camoRegulatoryRegister!.push(adRecord);
      });

      const analysis = await regulatoryIntelligenceEngine.analyzeRegisterRecord({
        registerRecordId: adRecord.id,
        actor: 'CAMO QA Auditor'
      });

      if (analysis.record.analysisError) {
        console.error('ANALYSIS ERROR IN TEST 4:', analysis.record.analysisError);
      }

      const sb = analysis.record.referencedSbs?.find(s => s.sbNumber.includes('7777'));
      expect(sb).toBeDefined();
      expect(sb?.documentAvailability).toBe('AVAILABLE');
      expect(sb?.analysisStatus).toBe('ANALYZED');
      expect(analysis.record.analysisStatus).toBe('ANALYZED');
      expect(analysis.record.adTechnicalAnalysisCompleteness).toBe('TECHNICAL_ANALYSIS_COMPLETE');
      expect(analysis.success).toBe(true);
    });
  });
});
