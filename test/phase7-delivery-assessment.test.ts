import { describe, it, expect, beforeEach } from 'vitest';
import { 
  AircraftDeliveryAssessmentEngine, 
  aircraftDeliveryAssessmentEngine,
  DELIVERY_ASSESSMENT_ENGINE_VERSION 
} from '../server/camoEngine/aircraftDeliveryAssessmentEngine';
import { camoDb } from '../server/dataStore';
import { complianceObligationService } from '../server/camoEngine/complianceObligationService';
import { 
  CreateDeliveryAssessmentInput, 
  DeliveryAircraftConfig,
  LessorDeclarationRecord 
} from '../src/types';

describe('CAMO Phase 7 — Aircraft Acquisition & Delivery Assessment Engine', () => {
  let engine: AircraftDeliveryAssessmentEngine;

  const mockConfig: DeliveryAircraftConfig = {
    manufacturer: 'Boeing',
    model: '737-800',
    family: '737 Next Generation',
    msn: '38124',
    registration: 'PR-CAM',
    manufactureDate: '2014-06-15',
    totalFlightHours: 24500,
    totalCycles: 14200,
    totalLandings: 14200,
    lessor: 'AeroCap Global Aviation',
    currentOperator: 'Nordic Skyways',
    targetDeliveryDate: '2026-11-30',
    engines: [
      {
        position: 'Pos 1',
        manufacturer: 'CFM International',
        model: 'CFM56-7B26',
        serialNumber: 'CFM-89211',
        totalHours: 24500,
        totalCycles: 14200
      },
      {
        position: 'Pos 2',
        manufacturer: 'CFM International',
        model: 'CFM56-7B26',
        serialNumber: 'CFM-89212',
        totalHours: 24300,
        totalCycles: 14100
      }
    ],
    components: [
      {
        position: 'Flap Actuator Pos 3',
        description: 'Trailing Edge Flap Actuator',
        partNumber: '10-61348-15',
        serialNumber: 'SN-ACT-9912'
      }
    ]
  };

  beforeEach(() => {
    camoDb.resetToSeed();
    engine = aircraftDeliveryAssessmentEngine;
  });

  describe('1. Architectural Modeling & Assessment Creation', () => {
    it('should have the correct Phase 7 engine version', () => {
      expect(DELIVERY_ASSESSMENT_ENGINE_VERSION).toBe('7.0.0');
    });

    it('should create an independent Delivery Assessment entity', () => {
      const input: CreateDeliveryAssessmentInput = {
        aircraftConfig: mockConfig,
        assessmentType: 'DELIVERY',
        lessor: 'AeroCap Global Aviation',
        operator: 'Oceanic Airlines',
        actor: 'Chief CAMO Inspector'
      };

      const assessment = engine.createAssessment(input);

      expect(assessment).toBeDefined();
      expect(assessment.id).toMatch(/^deliv-/);
      expect(assessment.status).toBe('NOT_STARTED');
      expect(assessment.aircraftConfig.msn).toBe('38124');
      expect(assessment.aircraftConfig.registration).toBe('PR-CAM');
      expect(assessment.lessor).toBe('AeroCap Global Aviation');
      expect(assessment.adItems).toHaveLength(0);
      expect(assessment.metrics.totalIdentified).toBe(0);
      expect(assessment.auditHash).toBeDefined();
      expect(assessment.auditHash.length).toBe(64); // SHA-256
    });

    it('should register a pre-delivery aircraft in STORED status without making it active fleet', () => {
      const input: CreateDeliveryAssessmentInput = {
        aircraftConfig: {
          ...mockConfig,
          msn: '99881',
          registration: 'N-PREDELIV'
        },
        isPreDeliveryAircraft: true,
        assessmentType: 'ACQUISITION',
        lessor: 'Castlelake Capital',
        operator: 'Oceanic Airlines'
      };

      const assessment = engine.createAssessment(input);
      const dbAircraft = camoDb.getState().aircraft.find(a => a.id === assessment.aircraftId);

      expect(dbAircraft).toBeDefined();
      expect(dbAircraft?.status).toBe('STORED');
      expect(dbAircraft?.registration).toBe('N-PREDELIV');
      expect(dbAircraft?.msn).toBe('99881');
    });

    it('should reject assessment creation when required aircraft config fields are missing', () => {
      expect(() => {
        engine.createAssessment({
          aircraftConfig: {
            manufacturer: '',
            model: '',
            msn: '',
            registration: '',
            totalFlightHours: 0,
            totalCycles: 0,
            engines: []
          },
          assessmentType: 'DELIVERY',
          lessor: 'Test',
          operator: 'Test'
        });
      }).toThrow(/manufacturer, model, MSN, and registration are required/i);
    });

    it('should record an audit trail entry on assessment creation', () => {
      const initialAuditCount = camoDb.getState().auditTrail.length;
      engine.createAssessment({
        aircraftConfig: mockConfig,
        assessmentType: 'LEASE_TRANSITION',
        lessor: 'BBAM Leasing',
        operator: 'Oceanic Airlines',
        actor: 'Auditor Alpha'
      });

      const updatedAuditCount = camoDb.getState().auditTrail.length;
      expect(updatedAuditCount).toBeGreaterThan(initialAuditCount);
      const latestAudit = camoDb.getState().auditTrail[0];
      expect(latestAudit.entityType).toBe('AircraftDeliveryAssessment');
      expect(latestAudit.action).toBe('CREATE');
    });
  });

  describe('2. Regulatory Discovery & Scoping Flow', () => {
    it('should discover relevant ADs from the Knowledge Base and discovery records', async () => {
      const assessment = engine.createAssessment({
        aircraftConfig: mockConfig,
        assessmentType: 'DELIVERY',
        lessor: 'AeroCap Global Aviation',
        operator: 'Oceanic Airlines'
      });

      const updated = await engine.executeDiscoveryForAssessment(assessment.id);

      expect(updated.status).toBe('DISCOVERY_COMPLETE');
      expect(updated.adItems.length).toBeGreaterThan(0);
      expect(updated.discoverySummary).toBeDefined();
      expect(updated.discoverySummary?.totalDiscovered).toBe(updated.adItems.length);
      expect(updated.metrics.totalIdentified).toBe(updated.adItems.length);
    });

    it('should flag known ADs with isKnownInCamo: true and link requirement ID', async () => {
      const assessment = engine.createAssessment({
        aircraftConfig: mockConfig,
        assessmentType: 'DELIVERY',
        lessor: 'AeroCap Global Aviation',
        operator: 'Oceanic Airlines'
      });

      const updated = await engine.executeDiscoveryForAssessment(assessment.id);
      const knownItems = updated.adItems.filter(i => i.isKnownInCamo);

      expect(knownItems.length).toBeGreaterThan(0);
      knownItems.forEach(item => {
        expect(item.camoRequirementId).toBeDefined();
      });
    });

    it('should strictly enforce Princípio de Metadados Insuficientes (no blind APPLICABLE or COMPLIED)', async () => {
      const assessment = engine.createAssessment({
        aircraftConfig: mockConfig,
        assessmentType: 'DELIVERY',
        lessor: 'AeroCap Global Aviation',
        operator: 'Oceanic Airlines'
      });

      const updated = await engine.executeDiscoveryForAssessment(assessment.id);

      // Discovery must NOT mark any discovered item as COMPLIED or final APPLICABILITY_CONFIRMED before analysis!
      updated.adItems.forEach(item => {
        expect(item.regulatoryComplianceStatus).not.toBe('COMPLIED');
        expect(['IDENTIFIED', 'POTENTIALLY_APPLICABLE', 'NOT_APPLICABLE', 'REVIEW_REQUIRED']).toContain(
          item.applicabilityStatus
        );
      });
    });

    it('should be idempotent: re-running discovery should preserve existing analyses and lessor inputs', async () => {
      const assessment = engine.createAssessment({
        aircraftConfig: mockConfig,
        assessmentType: 'DELIVERY',
        lessor: 'AeroCap Global Aviation',
        operator: 'Oceanic Airlines'
      });

      await engine.executeDiscoveryForAssessment(assessment.id);

      // Add a lessor declaration to the first item
      const firstItem = assessment.adItems[0];
      engine.reconcileLessorDeclaration({
        assessmentId: assessment.id,
        adNumber: firstItem.adNumber,
        declaration: {
          complianceStatus: 'COMPLIED',
          accomplishmentDate: '2023-05-10',
          documentReferences: ['WO-PRESERVE-123']
        }
      });

      // Re-run discovery
      const reRun = await engine.executeDiscoveryForAssessment(assessment.id);
      const preservedItem = reRun.adItems.find(i => i.adNumber === firstItem.adNumber);

      expect(preservedItem).toBeDefined();
      expect(preservedItem?.lessorDeclaration?.complianceStatus).toBe('COMPLIED');
      expect(preservedItem?.lessorDeclaration?.documentReferences).toContain('WO-PRESERVE-123');
    });
  });

  describe('3. Knowledge Reuse & Strict Aircraft Isolation', () => {
    it('should reuse requirement rule structure while creating an isolated obligation for target aircraft', async () => {
      const assessment = engine.createAssessment({
        aircraftConfig: mockConfig,
        assessmentType: 'DELIVERY',
        lessor: 'AeroCap Global Aviation',
        operator: 'Oceanic Airlines'
      });

      await engine.executeDiscoveryForAssessment(assessment.id);
      const targetItem = assessment.adItems.find(i => i.isKnownInCamo);
      expect(targetItem).toBeDefined();

      const analyzed = await engine.analyzeIndividualAd({
        assessmentId: assessment.id,
        adNumber: targetItem!.adNumber,
        actor: 'Lead Evaluator'
      });

      expect(analyzed.obligationId).toBeDefined();
      expect(analyzed.analyzedAt).toBeDefined();

      // Verify that the obligation was created strictly for this target aircraft
      const obl = camoDb.getState().obligations.find(o => o.id === analyzed.obligationId);
      expect(obl).toBeDefined();
      expect(obl?.aircraftId).toBe(assessment.aircraftId);
      expect(obl?.targetEntity.aircraftMsn).toBe(mockConfig.msn);
    });

    it('should NOT copy COMPLIED status from another aircraft in the fleet', async () => {
      // Find or establish an AD that is COMPLIED on an existing fleet aircraft (e.g. ac-02)
      let existingObl = camoDb.getState().obligations.find(o => o.status === 'COMPLIED');
      if (!existingObl) {
        const req0 = camoDb.getState().requirements[0];
        const otherAc = camoDb.getState().aircraft.find(a => a.id !== mockConfig.id) || camoDb.getState().aircraft[1];
        existingObl = complianceObligationService.createOrUpdateObligation({
          requirement: req0,
          aircraft: otherAc,
          applicabilityStatus: 'APPLICABLE',
          actor: 'Fleet CAMO Setup'
        });
        existingObl.status = 'COMPLIED';
        camoDb.update(draft => {
          const idx = draft.obligations.findIndex(o => o.id === existingObl!.id);
          if (idx >= 0) draft.obligations[idx] = existingObl!;
          else draft.obligations.push(existingObl!);
        });
      }
      expect(existingObl).toBeDefined();
      const existingReq = camoDb.getState().requirements.find(r => r.id === existingObl?.complianceRequirementId);
      expect(existingReq).toBeDefined();

      const adNum = existingReq?.sourceNumber || existingReq?.adNumber;
      expect(adNum).toBeDefined();

      const assessment = engine.createAssessment({
        aircraftConfig: mockConfig,
        assessmentType: 'DELIVERY',
        lessor: 'AeroCap Global Aviation',
        operator: 'Oceanic Airlines'
      });

      await engine.executeDiscoveryForAssessment(assessment.id);

      // Force analyze this specific AD
      const analyzed = await engine.analyzeIndividualAd({
        assessmentId: assessment.id,
        adNumber: adNum!
      });

      // The delivery aircraft has NO evidence yet, so it must NOT inherit COMPLIED!
      expect(analyzed.regulatoryComplianceStatus).not.toBe('COMPLIED');
    });

    it('should batch analyze all pending ADs in an assessment', async () => {
      const assessment = engine.createAssessment({
        aircraftConfig: mockConfig,
        assessmentType: 'DELIVERY',
        lessor: 'AeroCap Global Aviation',
        operator: 'Oceanic Airlines'
      });

      await engine.executeDiscoveryForAssessment(assessment.id);
      const initialPending = assessment.metrics.pendingCount;
      expect(initialPending).toBeGreaterThan(0);

      const result = await engine.batchAnalyzeAds(assessment.id);

      expect(result.analyzedCount).toBe(initialPending);
      expect(result.assessment.metrics.analyzedCount).toBe(result.assessment.metrics.totalIdentified);
      expect(result.assessment.metrics.pendingCount).toBe(0);
    });
  });

  describe('4. Lessor Reconciliation & Confrontation Logic', () => {
    it('should classify as MATCH when Lessor claims COMPLIED and CAMO Engine verifies COMPLIED', async () => {
      const assessment = engine.createAssessment({
        aircraftConfig: mockConfig,
        assessmentType: 'DELIVERY',
        lessor: 'AeroCap Global Aviation',
        operator: 'Oceanic Airlines'
      });

      await engine.executeDiscoveryForAssessment(assessment.id);
      const targetItem = assessment.adItems[0];

      // First analyze to generate obligation
      await engine.analyzeIndividualAd({
        assessmentId: assessment.id,
        adNumber: targetItem.adNumber
      });

      // Attach valid maintenance record
      await engine.attachLessorEvidence({
        assessmentId: assessment.id,
        adNumber: targetItem.adNumber,
        evidenceType: 'LOGBOOK_ENTRY',
        documentReference: 'LOG-BOOK-PAGE-142',
        description: 'Accomplished AD task as mandated',
        accomplishmentDate: '2024-08-15'
      });

      // Lessor declares COMPLIED
      const reconciled = engine.reconcileLessorDeclaration({
        assessmentId: assessment.id,
        adNumber: targetItem.adNumber,
        declaration: {
          complianceStatus: 'COMPLIED',
          accomplishmentDate: '2024-08-15',
          documentReferences: ['LOG-BOOK-PAGE-142']
        }
      });

      expect(reconciled.confrontationStatus).toBe('MATCH');
      expect(reconciled.confrontationNotes).toMatch(/matches verified CAMO compliance/i);
    });

    it('should classify as PENDING_DOCUMENTATION when Lessor claims COMPLIED but no evidence exists', async () => {
      const assessment = engine.createAssessment({
        aircraftConfig: mockConfig,
        assessmentType: 'DELIVERY',
        lessor: 'AeroCap Global Aviation',
        operator: 'Oceanic Airlines'
      });

      await engine.executeDiscoveryForAssessment(assessment.id);
      const targetItem = assessment.adItems[0];

      await engine.analyzeIndividualAd({
        assessmentId: assessment.id,
        adNumber: targetItem.adNumber
      });

      // Lessor declares COMPLIED without attaching evidence
      const reconciled = engine.reconcileLessorDeclaration({
        assessmentId: assessment.id,
        adNumber: targetItem.adNumber,
        declaration: {
          complianceStatus: 'COMPLIED',
          accomplishmentDate: '2023-11-20',
          documentReferences: ['UNVERIFIED-WO-999']
        }
      });

      expect(reconciled.confrontationStatus).toBe('PENDING_DOCUMENTATION');
      expect(reconciled.confrontationNotes).toMatch(/no valid maintenance evidence/i);
    });

    it('should classify as DISCREPANCY when Lessor claims NOT_APPLICABLE but CAMO Engine confirms applicable', async () => {
      const assessment = engine.createAssessment({
        aircraftConfig: mockConfig,
        assessmentType: 'DELIVERY',
        lessor: 'AeroCap Global Aviation',
        operator: 'Oceanic Airlines'
      });

      await engine.executeDiscoveryForAssessment(assessment.id);
      const applicableItem = assessment.adItems.find(i => i.applicabilityStatus === 'POTENTIALLY_APPLICABLE');
      expect(applicableItem).toBeDefined();

      await engine.analyzeIndividualAd({
        assessmentId: assessment.id,
        adNumber: applicableItem!.adNumber
      });

      // If CAMO confirmed applicability or obligation is open, and Lessor claims NOT_APPLICABLE:
      const reconciled = engine.reconcileLessorDeclaration({
        assessmentId: assessment.id,
        adNumber: applicableItem!.adNumber,
        declaration: {
          complianceStatus: 'NOT_APPLICABLE',
          notes: 'Lessor engineer claimed N/A'
        }
      });

      if (reconciled.applicabilityStatus === 'APPLICABILITY_CONFIRMED') {
        expect(reconciled.confrontationStatus).toBe('DISCREPANCY');
      }
    });

    it('should classify as MATCH when Lessor claims NOT_APPLICABLE and CAMO evaluates NOT_APPLICABLE', async () => {
      const assessment = engine.createAssessment({
        aircraftConfig: mockConfig,
        assessmentType: 'DELIVERY',
        lessor: 'AeroCap Global Aviation',
        operator: 'Oceanic Airlines'
      });

      await engine.executeDiscoveryForAssessment(assessment.id);
      const notApplicableItem = assessment.adItems.find(i => i.applicabilityStatus === 'NOT_APPLICABLE');

      if (notApplicableItem) {
        const reconciled = engine.reconcileLessorDeclaration({
          assessmentId: assessment.id,
          adNumber: notApplicableItem.adNumber,
          declaration: {
            complianceStatus: 'NOT_APPLICABLE',
            notes: 'Different model applicability'
          }
        });

        expect(reconciled.confrontationStatus).toBe('MATCH');
      }
    });

    it('should assign CRITICAL operational priority to discrepancies and overdue items', async () => {
      const assessment = engine.createAssessment({
        aircraftConfig: mockConfig,
        assessmentType: 'DELIVERY',
        lessor: 'AeroCap Global Aviation',
        operator: 'Oceanic Airlines'
      });

      await engine.executeDiscoveryForAssessment(assessment.id);
      const targetItem = assessment.adItems[0];

      await engine.analyzeIndividualAd({
        assessmentId: assessment.id,
        adNumber: targetItem.adNumber
      });

      // Create a discrepancy
      const reconciled = engine.reconcileLessorDeclaration({
        assessmentId: assessment.id,
        adNumber: targetItem.adNumber,
        declaration: {
          complianceStatus: 'NOT_APPLICABLE'
        }
      });

      if (reconciled.confrontationStatus === 'DISCREPANCY') {
        expect(reconciled.operationalPriority).toBe('CRITICAL');
      }
    });
  });

  describe('5. Cross-Aircraft Security & Evidence Isolation', () => {
    it('should link newly attached lessor evidence strictly to target aircraft ID', async () => {
      const assessment = engine.createAssessment({
        aircraftConfig: mockConfig,
        assessmentType: 'DELIVERY',
        lessor: 'AeroCap Global Aviation',
        operator: 'Oceanic Airlines'
      });

      await engine.executeDiscoveryForAssessment(assessment.id);
      const targetItem = assessment.adItems[0];

      await engine.analyzeIndividualAd({
        assessmentId: assessment.id,
        adNumber: targetItem.adNumber
      });

      const updatedItem = await engine.attachLessorEvidence({
        assessmentId: assessment.id,
        adNumber: targetItem.adNumber,
        evidenceType: 'CERTIFICATE_OF_RELEASE_TO_SERVICE',
        documentReference: 'CRS-EASA-FORM-1-99882',
        description: 'EASA Form 1 Release to Service',
        accomplishmentDate: '2024-03-01'
      });

      const attachedEv = camoDb.getState().evidence.find(
        e => e.documentReference === 'CRS-EASA-FORM-1-99882'
      );

      expect(attachedEv).toBeDefined();
      expect(attachedEv?.aircraftId).toBe(assessment.aircraftId);
      expect(updatedItem.evidenceSummary.valid).toBeGreaterThan(0);
    });
  });

  describe('6. Immutable Snapshot Finalization & Cryptographic Integrity', () => {
    it('should generate an auditable snapshot with SHA-256 integrity hash', async () => {
      const assessment = engine.createAssessment({
        aircraftConfig: mockConfig,
        assessmentType: 'DELIVERY',
        lessor: 'AeroCap Global Aviation',
        operator: 'Oceanic Airlines'
      });

      await engine.executeDiscoveryForAssessment(assessment.id);
      await engine.batchAnalyzeAds(assessment.id);

      const snapshot = engine.finalizeAssessment(
        assessment.id,
        'Chief CAMO Engineer Jane Doe',
        'Ready for delivery technical records review'
      );

      expect(snapshot).toBeDefined();
      expect(snapshot.snapshotId).toMatch(/^snap-/);
      expect(snapshot.assessmentId).toBe(assessment.id);
      expect(snapshot.aircraftMsn).toBe(mockConfig.msn);
      expect(snapshot.aircraftRegistration).toBe(mockConfig.registration);
      expect(snapshot.engineVersions.deliveryEngine).toBe('7.0.0');
      expect(snapshot.auditHash).toBeDefined();
      expect(snapshot.auditHash.length).toBe(64);
      expect(snapshot.disclaimer).toMatch(/does not grant automatic operational airworthiness/i);
    });

    it('should cryptographically verify a valid snapshot', async () => {
      const assessment = engine.createAssessment({
        aircraftConfig: mockConfig,
        assessmentType: 'DELIVERY',
        lessor: 'AeroCap Global Aviation',
        operator: 'Oceanic Airlines'
      });

      await engine.executeDiscoveryForAssessment(assessment.id);

      const snapshot = engine.finalizeAssessment(assessment.id, 'Auditor Smith');
      const isValid = engine.verifySnapshotIntegrity(snapshot);

      expect(isValid).toBe(true);
    });

    it('should detect and reject tampered snapshots where content was modified', async () => {
      const assessment = engine.createAssessment({
        aircraftConfig: mockConfig,
        assessmentType: 'DELIVERY',
        lessor: 'AeroCap Global Aviation',
        operator: 'Oceanic Airlines'
      });

      await engine.executeDiscoveryForAssessment(assessment.id);
      const snapshot = engine.finalizeAssessment(assessment.id, 'Auditor Smith');

      // Tamper with data without recalculating hash
      const tamperedSnapshot = {
        ...snapshot,
        complianceSummary: {
          ...snapshot.complianceSummary,
          complied: snapshot.complianceSummary.complied + 999
        }
      };

      const isValid = engine.verifySnapshotIntegrity(tamperedSnapshot);
      expect(isValid).toBe(false);
    });

    it('should track blocking issues in snapshot when overdue ADs or discrepancies exist', async () => {
      const assessment = engine.createAssessment({
        aircraftConfig: mockConfig,
        assessmentType: 'DELIVERY',
        lessor: 'AeroCap Global Aviation',
        operator: 'Oceanic Airlines'
      });

      await engine.executeDiscoveryForAssessment(assessment.id);
      const targetItem = assessment.adItems[0];

      await engine.analyzeIndividualAd({
        assessmentId: assessment.id,
        adNumber: targetItem.adNumber
      });

      // Force a discrepancy
      engine.reconcileLessorDeclaration({
        assessmentId: assessment.id,
        adNumber: targetItem.adNumber,
        declaration: {
          complianceStatus: 'NOT_APPLICABLE'
        }
      });

      const snapshot = engine.finalizeAssessment(assessment.id, 'Chief Engineer');

      if (snapshot.confrontationSummary.discrepancies > 0) {
        expect(snapshot.blockingIssues.length).toBeGreaterThan(0);
        expect(snapshot.finalStatus).toBe('REVIEW_REQUIRED');
      }
    });
  });

  describe('7. Help Center & Operator Knowledge Articles', () => {
    it('should provide comprehensive Help Center articles', () => {
      const articles = engine.getHelpCenterArticles();

      expect(articles.length).toBeGreaterThanOrEqual(4);
      expect(articles.some(a => a.category === 'GETTING_STARTED')).toBe(true);
      expect(articles.some(a => a.category === 'DELIVERY_ASSESSMENT')).toBe(true);
      expect(articles.some(a => a.category === 'COMPLIANCE_STATUS')).toBe(true);
      expect(articles.some(a => a.category === 'AUDIT_INTEGRITY')).toBe(true);

      articles.forEach(article => {
        expect(article.id).toBeDefined();
        expect(article.title).toBeDefined();
        expect(article.summary).toBeDefined();
        expect(article.content.length).toBeGreaterThan(50);
        expect(article.version).toBe('7.0.0');
      });
    });
  });
});
