import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdSbAnalysisEngine } from '../server/camoEngine/adSbAnalysisEngine';
import { camoDb } from '../server/dataStore';
import { ComplianceRequirement } from '../src/types';

describe('FASE 9 — ETAPA 8.2: Correção da Detecção de Service Bulletin (SB) dentro da AD', () => {
  let engine: AdSbAnalysisEngine;

  beforeEach(() => {
    engine = AdSbAnalysisEngine.getInstance();
  });

  describe('1. Teste Real Mandatório com a AD 2020-24-02', () => {
    it('deve identificar e registrar o Service Bulletin explicitamente citado no texto da AD 2020-24-02 mesmo sem o documento no repositório', () => {
      const adNumber = '2020-24-02';
      const adText = `DEPARTMENT OF TRANSPORTATION
Federal Aviation Administration
14 CFR Part 39 [Docket No. FAA-2020-0988; Product Identifier 2020-NM-096-AD; Amendment 39-21334; AD 2020-24-02]
RIN 2120-AA64
Airworthiness Directives; The Boeing Company Model 737-8 and 737-9 Airplanes

(g) Required Actions
(1) For Model 737-8 and 737-9 airplanes: Except as specified by paragraph (h) of this AD, at the applicable times specified in Boeing Alert Requirements Bulletin 737-22A1011 RB, dated November 16, 2020: Do all applicable actions identified in, and in accordance with, the Accomplishment Instructions of Boeing Alert Requirements Bulletin 737-22A1011 RB, dated November 16, 2020.
(2) For Model 737-8 and 737-9 airplanes: Do all applicable actions identified in, and in accordance with, the Accomplishment Instructions of Boeing Alert Requirements Bulletin 737-34A1088 RB, dated November 16, 2020.

(h) Exceptions to Service Information Specifications
Where Boeing Alert Requirements Bulletin 737-22A1011 RB specifies contacting Boeing, this AD requires using a method approved in accordance with the procedures specified in paragraph (k) of this AD.

(i) Terminating Action
Accomplishment of the actions specified in Boeing Alert Requirements Bulletin 737-22A1011 RB terminates the repetitive inspection requirements of this AD.`;

      const requirement: any = {
        id: 'req-faa-2020-24-02',
        sourceNumber: 'FAA AD 2020-24-02',
        title: 'Boeing 737 MAX Flight Control Computer Software and Operational Procedures',
        authority: 'FAA',
        effectiveDate: '2020-11-20',
        requirementType: 'AIRWORTHINESS_DIRECTIVE',
        status: 'OPEN',
        isEmergency: false,
        applicabilityRule: {
          id: 'app-rule-test',
          complianceRequirementId: 'req-faa-2020-24-02',
          aircraftModels: ['737-8', '737-9'],
          aircraftManufacturers: ['Boeing'],
          rawText: 'This AD applies to The Boeing Company Model 737-8 and 737-9 airplanes.'
        },
        sourceDocument: {
          fileName: 'FAA_AD_2020-24-02.pdf',
          fileSize: 45000,
          mimeType: 'application/pdf',
          documentHash: 'a1b2c3d4e5f6',
          rawExtractedText: adText
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Executa detecção
      const dependencies = engine.detectAndRegisterDependencies(adNumber, adText, requirement);

      expect(dependencies.length).toBeGreaterThanOrEqual(1);

      // Verifica detecção específica do Boeing Alert Requirements Bulletin 737-22A1011 RB
      const dep737 = dependencies.find(d => d.sbNumber.includes('737-22A1011'));
      expect(dep737).toBeDefined();
      expect(dep737!.sbManufacturer).toBe('Boeing');
      expect(dep737!.isMandatedByAd).toBe(true);
      expect(dep737!.sourceSection).toBeDefined();
      expect(dep737!.sourceText).toBeDefined();
      expect(dep737!.sourceText.length).toBeGreaterThan(10);

      // Verificação estrita de separação de estados:
      // Como o documento físico ainda não está no repositório, o estado de detecção DEVE ser NOT_LOCATED
      // Jamais descartar ou marcar como inexistente
      expect(dep737!.detectionState).toBe('NOT_LOCATED');
      expect(dep737!.status).toBe('NOT_LOCATED');

      // Verifica persistência no camoDb
      const state = camoDb.getState();
      const persistedDep = (state.adSbDependencies || []).find(d => d.sbNumber.includes('737-22A1011'));
      expect(persistedDep).toBeDefined();
      expect(persistedDep!.detectionState).toBe('NOT_LOCATED');

      // Verifica avaliação de completude da AD 2020-24-02:
      // Jamais deve declarar TECHNICAL_ANALYSIS_COMPLETE com hasSbDependencies = false
      const assessment = engine.evaluateAdTechnicalAnalysisCompleteness(adNumber);
      expect(assessment.hasSbDependencies).toBe(true);
      expect(assessment.totalDependencies).toBeGreaterThanOrEqual(1);
      expect(assessment.status).toBe('DEPENDENCY_PENDING');
      expect(assessment.fleetApplicabilityState).toBe('PENDING_CONFIGURATION');
      expect(assessment.summary).not.toContain('AD sem dependência técnica de Boletim de Serviço');
      expect(assessment.summary).toContain('dependência técnica');
    });
  });

  describe('2. Detecção Abrangente em Múltiplos Padrões e Variações Formais de SB', () => {
    it('deve detectar SB com prefixo formal e fabricante (ex: Boeing Alert Service Bulletin)', () => {
      const text = `Accomplish high frequency eddy current inspections in accordance with Boeing Alert Service Bulletin B737-32A1420 Rev 1, dated October 12, 2020.`;
      const deps = engine.detectAndRegisterDependencies('AD-TEST-01', text);
      const dep = deps.find(d => d.sbNumber.includes('32A1420'));
      expect(dep).toBeDefined();
      expect(dep!.sbManufacturer).toBe('Boeing');
      expect(dep!.sbRevision).toContain('Rev 1');
      expect(dep!.sbDate).toContain('October 12, 2020');
      expect(dep!.relationshipType).toBe('COMPLIANCE_METHOD');
    });

    it('deve detectar Airbus Service Bulletin com numeração ATA (ex: Airbus Service Bulletin A320-29-1180 Rev 0)', () => {
      const text = `Paragraph (g): Modification of hydraulic system lines in accordance with Airbus Service Bulletin A320-29-1180 Rev 0, dated 15 May 2021.`;
      const deps = engine.detectAndRegisterDependencies('AD-TEST-02', text);
      const dep = deps.find(d => d.sbNumber.includes('A320-29-1180'));
      expect(dep).toBeDefined();
      expect(dep!.sbManufacturer).toBe('Airbus');
      expect(dep!.sourceSection).toBe('Paragraph (g)');
      expect(dep!.relationshipType).toBe('COMPLIANCE_METHOD');
    });

    it('deve detectar Embraer Service Bulletin com prefixo conjugado (ex: Embraer Alert Service Bulletin SB190-27-0045)', () => {
      const text = `Comply with all instructions described in Embraer Alert Service Bulletin SB190-27-0045, Original Issue, dated January 10, 2022.`;
      const deps = engine.detectAndRegisterDependencies('AD-TEST-03', text);
      const dep = deps.find(d => d.sbNumber.includes('190-27-0045'));
      expect(dep).toBeDefined();
      expect(dep!.sbManufacturer).toBe('Embraer');
      expect(dep!.sbRevision).toBe('Original');
      expect(dep!.sbDate).toContain('January 10, 2022');
    });

    it('deve detectar variações informais: "No.", ":", "-", e parênteses', () => {
      const texts = [
        'Perform inspections per Service Bulletin No. 737-22A1011.',
        'Refer to Alert Service Bulletin (ASB) 737-22A1011 for corrective action.',
        'Required procedure: SB: 737-22A1011.',
        'All work per SB-737-22A1011.'
      ];

      for (let i = 0; i < texts.length; i++) {
        const deps = engine.detectAndRegisterDependencies(`AD-VAR-${i}`, texts[i]);
        expect(deps.length).toBeGreaterThanOrEqual(1);
        expect(deps[0].sbNumber).toContain('737-22A1011');
      }
    });

    it('deve detectar referências que quebram linha (multiline formatting)', () => {
      const multilineText = `Perform visual and ultrasonic inspection in accordance with\nBoeing Alert\nRequirements Bulletin 737-22A1011 RB,\ndated November 16, 2020.`;
      const deps = engine.detectAndRegisterDependencies('AD-MULTILINE', multilineText);
      expect(deps.length).toBeGreaterThanOrEqual(1);
      const dep = deps.find(d => d.sbNumber.includes('737-22A1011'));
      expect(dep).toBeDefined();
    });

    it('deve extrair referências localizadas em Tabelas e Notas', () => {
      const tableText = `Table 1 to Paragraph (g) - Service Bulletin Reference:
Boeing Alert Requirements Bulletin 737-22A1011 RB.
Note 1 to Paragraph (g): Refer to Boeing Service Bulletin 737-34A1088 for operational checkout.`;

      const deps = engine.detectAndRegisterDependencies('AD-TABLE-NOTE', tableText);
      expect(deps.length).toBeGreaterThanOrEqual(2);

      const tableDep = deps.find(d => d.sbNumber.includes('737-22A1011'));
      expect(tableDep).toBeDefined();
      expect(tableDep!.sourceSection).toBe('Table 1 to Paragraph (g)');

      const noteDep = deps.find(d => d.sbNumber.includes('737-34A1088'));
      expect(noteDep).toBeDefined();
      expect(noteDep!.sourceSection).toBe('Note 1 to Paragraph (g)');
    });

    it('deve classificar TERMINATING_ACTION quando o SB encerra inspeções repetitivas', () => {
      const text = `Paragraph (i) Terminating Action:
Accomplishment of modifying the bracket in accordance with Boeing Alert Service Bulletin B737-53A1290 terminates the repetitive inspection requirements of this AD.`;

      const deps = engine.detectAndRegisterDependencies('AD-TERM-TEST', text);
      const dep = deps.find(d => d.sbNumber.includes('53A1290'));
      expect(dep).toBeDefined();
      expect(dep!.relationshipType).toBe('TERMINATING_ACTION');
      expect(dep!.isMandatedByAd).toBe(true);
    });
  });

  describe('3. Ciclo de Vida: Transição de NOT_LOCATED para LOCATED e ANALYZED', () => {
    it('deve atualizar o estado de NOT_LOCATED para LOCATED após upload do SB e para ANALYZED após extração essencial', async () => {
      const adNumber = 'AD-LIFECYCLE-TEST';
      const sbNumber = '737-29A1099';
      const text = `Paragraph (g): Inspect hydraulic shutoff valve per Boeing Alert Service Bulletin 737-29A1099.`;

      // Garante estado limpo para o teste isolado
      camoDb.update(draft => {
        draft.sbRepository = (draft.sbRepository || []).filter(s => !s.documentNumber.includes(sbNumber));
        draft.sbAnalyses = (draft.sbAnalyses || []).filter(a => !a.sbNumber.includes(sbNumber));
        draft.adSbDependencies = (draft.adSbDependencies || []).filter(d => !d.sbNumber.includes(sbNumber) && d.adNumber !== adNumber);
      });

      // 1. Detecção inicial (sem documento no repositório)
      const initialDeps = engine.detectAndRegisterDependencies(adNumber, text);
      expect(initialDeps[0].detectionState).toBe('NOT_LOCATED');
      expect(initialDeps[0].status).toBe('NOT_LOCATED');

      let completeness = engine.evaluateAdTechnicalAnalysisCompleteness(adNumber);
      expect(completeness.status).toBe('DEPENDENCY_PENDING');

      // 2. Upload do documento técnico no repositório
      const sbRecord = engine.storeServiceBulletinDocument({
        documentNumber: sbNumber,
        manufacturer: 'Boeing',
        revision: 'Original',
        rawContent: `BOEING ALERT SERVICE BULLETIN 737-29A1099
Section 1. Planning Information
1.A Effectivity: Model 737-800 airplanes, Line Numbers 1000 through 2500.
Section 2. Accomplishment Instructions:
Perform detailed inspection of the hydraulic valve actuator bushing.`
      });
      expect(sbRecord.sha256).toBeDefined();

      // 3. Re-escanear ou consultar dependências: deve agora estar LOCATED (ou ANALYSIS_PENDING)
      const updatedDeps = engine.detectAndRegisterDependencies(adNumber, text);
      expect(updatedDeps[0].detectionState).toBe('LOCATED');
      expect(updatedDeps[0].status).toBe('ANALYSIS_PENDING');

      // 4. Concluir a análise essencial do SB com spy determinístico
      vi.spyOn((engine as any).orchestrator, 'executeStructuredGeneration').mockResolvedValueOnce({
        data: {
          applicability: {
            aircraftModel: ['737-800'],
            effectivityText: 'Model 737-800 airplanes, Line Numbers 1000 through 2500.'
          },
          requiredAction: {
            actionSummary: 'Perform detailed inspection of the hydraulic valve actuator bushing.',
            inspectionType: 'Detailed Visual',
            modificationRequired: false,
            replacementRequired: false,
            repetitiveAction: false,
            terminatingAction: false
          },
          complianceThreshold: {
            threshold: 'Within 500 flight hours',
            interval: null,
            flightHourLimit: 500
          },
          technicalReferences: {
            sections: ['Section 1', 'Section 2'],
            figures: []
          }
        },
        trace: {
          traceId: 'mock-trace-lifecycle-test',
          modelUsed: 'mock-test-model',
          durationMs: 5
        }
      } as any);

      await engine.analyzeServiceBulletin(sbNumber);

      // 5. Verificar transição final para ANALYZED
      const state = camoDb.getState();
      const analyzedDep = (state.adSbDependencies || []).find(d => d.sbNumber === sbNumber);
      expect(analyzedDep?.status).toBe('ANALYZED');
      expect(analyzedDep?.detectionState).toBe('ANALYZED');

      // 6. Avaliação de completude transiciona para TECHNICAL_ANALYSIS_COMPLETE
      const finalCompleteness = engine.evaluateAdTechnicalAnalysisCompleteness(adNumber);
      expect(finalCompleteness.status).toBe('TECHNICAL_ANALYSIS_COMPLETE');
      expect(finalCompleteness.resolvedDependencies).toBe(1);
    });
  });
});
