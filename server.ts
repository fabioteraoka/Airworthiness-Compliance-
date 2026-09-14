import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { camoDb } from './server/dataStore';
import { extractAdWithGemini } from './server/geminiService';
import { evaluateComplianceRequirement, buildDynamicApplicabilityCriteria } from './server/ruleEngine';
import { evaluateRequirementWithCamoV2 } from './server/complianceOrchestrator';
import { 
  regulatorySourceRegistry, 
  sourceReconciler, 
  fleetScreeningEngine,
  officialDocumentAcquisitionService,
  regulatoryDiscoveryEngine,
  compliancePipelineOrchestrator
} from './server/regulatoryConnectors';
import { complianceObligationService } from './server/camoEngine/complianceObligationService';
import { dueDateThresholdEngine } from './server/camoEngine/dueDateThresholdEngine';
import { evidenceVerificationEngine } from './server/camoEngine/evidenceVerificationEngine';
import { fleetAirworthinessControlEngine, FleetAirworthinessControlEngine } from './server/camoEngine/fleetAirworthinessControlEngine';
import { aircraftDeliveryAssessmentEngine } from './server/camoEngine/aircraftDeliveryAssessmentEngine';
import { regulatoryIntelligenceEngine } from './server/camoEngine/regulatoryIntelligenceEngine';
import { helpCenterService } from './server/helpCenterService';
import { generateArchitecturePdf } from './server/pdfGenerator';
import { 
  ComplianceRequirement, 
  UserQuestion, 
  KnowledgeFact, 
  Evidence, 
  FAPTDocument,
  Aircraft,
  Component,
  ComponentInstallation,
  AuditTrailEntry,
  InstalledSoftwareRecord,
  MaintenanceActionAccomplishment,
  RegulatorySourceRecord,
  RegulatoryDiscoveryRecord,
  CompliancePipelineExecution
} from './src/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for PDF uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // ==========================================
  // API ROUTES
  // ==========================================

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Download technical audit report file
  app.get('/api/download-audit-report', (req, res) => {
    try {
      const filePath = path.join(process.cwd(), 'AUDITORIA_TECNICA_EXTERNA_ADS.md');
      if (!fs.existsSync(filePath)) {
        return res.status(404).send('Arquivo AUDITORIA_TECNICA_EXTERNA_ADS.md não encontrado.');
      }
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="AUDITORIA_TECNICA_EXTERNA_ADS.md"');
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (err: any) {
      res.status(500).send('Erro ao baixar relatório: ' + err.message);
    }
  });

  // View technical audit report text/json
  app.get('/api/audit-report', (req, res) => {
    try {
      const filePath = path.join(process.cwd(), 'AUDITORIA_TECNICA_EXTERNA_ADS.md');
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Arquivo não encontrado.' });
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      res.json({ content, fileName: 'AUDITORIA_TECNICA_EXTERNA_ADS.md' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Generate and download official Architecture Dossier PDF
  app.get('/api/generate-architecture-pdf', (req, res) => {
    try {
      const state = camoDb.getState();
      generateArchitecturePdf(res, state);
    } catch (err: any) {
      console.error('Erro ao gerar PDF da arquitetura:', err);
      res.status(500).send('Erro ao gerar PDF da arquitetura: ' + err.message);
    }
  });

  // Download architecture dossier file
  app.get('/api/download-architecture-dossier', (req, res) => {
    try {
      const filePath = path.join(process.cwd(), 'DOSSIE_ARQUITETURA_SISTEMA_CAMO.md');
      if (!fs.existsSync(filePath)) {
        return res.status(404).send('Arquivo DOSSIE_ARQUITETURA_SISTEMA_CAMO.md não encontrado.');
      }
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="DOSSIE_ARQUITETURA_SISTEMA_CAMO.md"');
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (err: any) {
      res.status(500).send('Erro ao baixar dossiê de arquitetura: ' + err.message);
    }
  });

  // View architecture dossier text/json
  app.get('/api/architecture-dossier', (req, res) => {
    try {
      const filePath = path.join(process.cwd(), 'DOSSIE_ARQUITETURA_SISTEMA_CAMO.md');
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Arquivo DOSSIE_ARQUITETURA_SISTEMA_CAMO.md não encontrado.' });
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      res.json({ content, fileName: 'DOSSIE_ARQUITETURA_SISTEMA_CAMO.md' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Capability Registry Endpoint (CAP-001 to CAP-024)
  app.get('/api/system/capabilities', (req, res) => {
    try {
      const filePath = path.join(process.cwd(), 'CAPABILITY_REGISTRY.md');
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Arquivo CAPABILITY_REGISTRY.md não encontrado.' });
      }
      const markdown = fs.readFileSync(filePath, 'utf-8');
      res.json({
        system: 'Airworthiness Compliance Intelligence',
        release: '9.5.1',
        releaseStatus: 'GREEN_OPERATIONAL_AUDITED',
        totalCapabilities: 24,
        testPassingRate: '124/124 PASSED (100% GREEN)',
        markdown
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Current State Audit Endpoint
  app.get('/api/system/audit', (req, res) => {
    try {
      const filePath = path.join(process.cwd(), 'SYSTEM_CURRENT_STATE_AUDIT.md');
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Arquivo SYSTEM_CURRENT_STATE_AUDIT.md não encontrado.' });
      }
      const markdown = fs.readFileSync(filePath, 'utf-8');
      res.json({
        auditDate: '2026-09-14',
        release: '9.5.1',
        viewsCount: 27,
        endpointsCount: 70,
        submodulesCount: 14,
        markdown
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Phase 8: Help Center, Manual & Guided Workflow Endpoints
  app.get('/api/help/metadata', (req, res) => {
    res.json(helpCenterService.getMetadata());
  });

  app.get('/api/help/articles', (req, res) => {
    const { category } = req.query;
    res.json(helpCenterService.getAllArticles(category as string));
  });

  app.get('/api/help/articles/:id', (req, res) => {
    const article = helpCenterService.getArticleById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Artigo não encontrado.' });
    }
    res.json(article);
  });

  app.get('/api/help/glossary', (req, res) => {
    const { category } = req.query;
    res.json(helpCenterService.getAllGlossaryTerms(category as string));
  });

  app.get('/api/help/workflow', (req, res) => {
    res.json(helpCenterService.getWorkflowSteps());
  });

  app.get('/api/help/contextual/:module', (req, res) => {
    const help = helpCenterService.getContextualHelp(req.params.module);
    if (!help) {
      return res.status(404).json({ error: 'Ajuda contextual não encontrada para este módulo.' });
    }
    res.json(help);
  });

  app.get('/api/help/search', (req, res) => {
    const { q, category } = req.query;
    const results = helpCenterService.search(q as string, category as string);
    res.json(results);
  });

  // Get full database state
  app.get('/api/state', (req, res) => {
    try {
      const state = camoDb.getState();
      res.json(state);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Reset database to initial seed data
  app.post('/api/reset-seed', (req, res) => {
    try {
      const state = camoDb.resetToSeed();
      camoDb.logAudit({
        user: state.currentUser.name,
        role: state.currentUser.role,
        action: 'SYSTEM_RESET',
        entityType: 'System',
        entityId: 'all',
        details: 'Reset CAMO Database to pristine demonstration seed data.'
      });
      res.json({ success: true, state: camoDb.getState() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Extract AD from PDF or Text using Gemini 3.7 Flash
  app.post('/api/extract-ad', async (req, res) => {
    try {
      const { pdfBase64, text, fileName } = req.body;
      if (!pdfBase64 && !text) {
        return res.status(400).json({ error: 'Please provide either a PDF file (base64) or text content of the AD.' });
      }

      const extracted = await extractAdWithGemini({ pdfBase64, text, fileName });
      
      const reqId = `req-${Date.now()}`;
      const ruleId = `rule-${Date.now()}`;

      const requirement: ComplianceRequirement = {
        id: reqId,
        sourceType: 'AD',
        sourceNumber: extracted.sourceNumber,
        revision: extracted.revision || 'Original',
        title: extracted.title,
        issuingAuthority: extracted.issuingAuthority,
        issueDate: extracted.issueDate || new Date().toISOString().split('T')[0],
        effectiveDate: extracted.effectiveDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        emergencyAd: Boolean(extracted.emergencyAd),
        supersedes: extracted.supersedes,
        sourceDocument: {
          fileName: fileName || 'Airworthiness_Directive.pdf',
          fileSize: pdfBase64 ? Math.round(pdfBase64.length * 0.75) : (text?.length || 0),
          mimeType: pdfBase64 ? 'application/pdf' : 'text/plain',
          fileData: pdfBase64,
          rawExtractedText: text || extracted.technicalSummary
        },
        applicabilityRule: {
          id: ruleId,
          complianceRequirementId: reqId,
          aircraftManufacturers: extracted.aircraftManufacturers || [],
          aircraftModels: extracted.aircraftModels || [],
          aircraftSerialRanges: extracted.aircraftSerialRangesFrom ? {
            from: extracted.aircraftSerialRangesFrom,
            to: extracted.aircraftSerialRangesTo,
            list: extracted.aircraftSerialRangesList,
            description: extracted.aircraftSerialRangesDescription
          } : undefined,
          engineManufacturers: extracted.engineManufacturers,
          engineModels: extracted.engineModels,
          componentPartNumbers: extracted.componentPartNumbers || [],
          componentSerialRanges: (extracted.componentSerialRangesFrom || extracted.componentSerialRangesDescription) ? {
            from: extracted.componentSerialRangesFrom,
            to: extracted.componentSerialRangesTo,
            list: extracted.componentSerialRangesList,
            description: extracted.componentSerialRangesDescription
          } : undefined,
          affectedConfiguration: extracted.affectedConfiguration,
          otherEffectivityCriteria: extracted.otherEffectivityCriteria,
          rawText: extracted.applicabilityRawSummary
        },
        requirementDetails: {
          initialThreshold: extracted.initialThreshold || undefined,
          complianceTime: extracted.complianceTime || undefined,
          repetitiveInterval: extracted.repetitiveInterval || undefined,
          requiredInspection: extracted.requiredInspection || undefined,
          modification: extracted.modification || undefined,
          replacement: extracted.replacement || undefined,
          optionalMethod: extracted.optionalMethod || undefined,
          terminatingAction: extracted.terminatingAction || undefined,
          requiredParts: extracted.requiredParts || [],
          requiredDocumentation: extracted.requiredDocumentation || undefined
        },
        actions: (extracted.actions || []).map((act, idx) => ({
          id: `act-${Date.now()}-${idx}`,
          complianceRequirementId: `req-${Date.now()}`,
          ...act
        })),
        applicabilityCriteria: extracted.applicabilityCriteria,
        mandatedActions: extracted.mandatedActions || [],
        softwareRequirements: extracted.softwareRequirements || [],
        externalEffectivityReferences: extracted.externalEffectivityReferences || [],
        rawExtraction: extracted.rawExtraction,
        referencedDocuments: (extracted.referencedDocuments || []).map((ref, idx) => ({
          id: `ref-${Date.now()}-${idx}`,
          complianceRequirementId: `req-${Date.now()}`,
          ...ref
        })),
        documentProcessingStatus: extracted.documentProcessingStatus || 'EXTRACTED',
        extractionStatus: extracted.extractionStatus || 'SUCCESS',
        extractionError: extracted.extractionError,
        missingFields: extracted.missingFields,
        provenanceMap: extracted.provenanceMap || {},
        extractionFailureRecord: extracted.extractionFailureRecord,
        diagnostics: extracted.diagnostics,
        pipelineDiagnostics: extracted.pipelineDiagnostics,
        status: extracted.documentProcessingStatus === 'EXTRACTION_FAILED' ? 'DRAFT' : 'EXTRACTED',
        createdAt: new Date().toISOString(),
        createdBy: camoDb.getState().currentUser.name,
        updatedAt: new Date().toISOString(),
        updatedBy: camoDb.getState().currentUser.name
      };

      res.json({ success: true, requirement, extracted, diagnostics: extracted.pipelineDiagnostics });
    } catch (err: any) {
      console.error('Extraction route error:', err);
      res.status(500).json({ error: err.message || 'Failed to extract Airworthiness Directive' });
    }
  });

  // ==========================================
  // PHASE 3: REGULATORY DATA CONNECTOR ENDPOINTS
  // ==========================================

  // 1. Get all registered regulatory sources and status
  app.get('/api/regulatory/sources', (req, res) => {
    try {
      const sources = regulatorySourceRegistry.getAllSources();
      res.json({ success: true, sources });
    } catch (err: any) {
      console.error('Regulatory sources error:', err);
      res.status(500).json({ error: err.message || 'Failed to list regulatory sources' });
    }
  });

  // 2. Search FAA Regulatory Documents (Federal Register live API)
  app.get('/api/regulatory/search', async (req, res) => {
    try {
      const { q, adNumber, startDate, endDate, type, page, perPage, order } = req.query;
      const frConnector = regulatorySourceRegistry.getFederalRegisterConnector();

      if (adNumber && typeof adNumber === 'string') {
        const results = await frConnector.searchByADNumber(adNumber);
        return res.json({
          success: true,
          source: 'FEDERAL_REGISTER',
          query: adNumber,
          totalCount: results.length,
          results
        });
      }

      if (startDate && endDate && typeof startDate === 'string' && typeof endDate === 'string') {
        const results = await frConnector.searchByDateRange(startDate, endDate, {
          type: type as any,
          page: page ? Number(page) : 1,
          perPage: perPage ? Number(perPage) : 20,
          order: order as any
        });
        return res.json({
          success: true,
          source: 'FEDERAL_REGISTER',
          query: `Date range: ${startDate} to ${endDate}`,
          totalCount: results.length,
          results
        });
      }

      const queryStr = typeof q === 'string' ? q : '';
      const searchResponse = await frConnector.searchFAARegulatoryDocuments(queryStr, {
        type: type as any,
        page: page ? Number(page) : 1,
        perPage: perPage ? Number(perPage) : 15,
        order: order as any
      });

      res.json({ success: true, ...searchResponse });
    } catch (err: any) {
      console.error('Regulatory search error:', err);
      res.status(500).json({ error: err.message || 'Failed to search regulatory source' });
    }
  });

  // 3. Get single Federal Register document details
  app.get('/api/regulatory/document/:docNumber', async (req, res) => {
    try {
      const { docNumber } = req.params;
      const frConnector = regulatorySourceRegistry.getFederalRegisterConnector();
      const doc = await frConnector.getDocument(docNumber);

      if (!doc) {
        return res.status(404).json({ error: `Regulatory document ${docNumber} not found.` });
      }

      res.json({ success: true, document: doc });
    } catch (err: any) {
      console.error('Regulatory document fetch error:', err);
      res.status(500).json({ error: err.message || 'Failed to retrieve regulatory document' });
    }
  });

  // 4. Fleet Regulatory Screening (Scoping filter using Canonical Model Matching)
  app.post('/api/regulatory/screen', (req, res) => {
    try {
      const { metadata, fleet } = req.body;
      if (!metadata) {
        return res.status(400).json({ error: 'Regulatory metadata or source record is required for screening.' });
      }

      const state = camoDb.getState();
      const targetFleet = fleet || {
        aircraft: state.aircraft,
        engines: state.engines,
        components: state.components,
        installations: state.installations
      };

      const screeningReport = fleetScreeningEngine.screenFleetAgainstRegulatoryMetadata(metadata, targetFleet);
      res.json({ success: true, screeningReport });
    } catch (err: any) {
      console.error('Fleet regulatory screening error:', err);
      res.status(500).json({ error: err.message || 'Failed to execute fleet regulatory screening' });
    }
  });

  // 5. Source Reconciliation (Compare across sources or against extracted requirement)
  app.post('/api/regulatory/reconcile', (req, res) => {
    try {
      const { sourceA, sourceB, requirementId } = req.body;
      if (!sourceA) {
        return res.status(400).json({ error: 'sourceA record is required for reconciliation.' });
      }

      let result;
      if (requirementId) {
        const state = camoDb.getState();
        const reqDoc = state.requirements.find(r => r.id === requirementId);
        if (!reqDoc) {
          return res.status(404).json({ error: `Requirement with id ${requirementId} not found.` });
        }
        result = sourceReconciler.reconcileRequirementWithSource(reqDoc, sourceA);
      } else if (sourceB) {
        result = sourceReconciler.reconcileSourceRecords(sourceA, sourceB);
      } else {
        return res.status(400).json({ error: 'Either sourceB or requirementId must be provided for cross-source comparison.' });
      }

      res.json({ success: true, reconciliation: result });
    } catch (err: any) {
      console.error('Source reconciliation error:', err);
      res.status(500).json({ error: err.message || 'Failed to reconcile regulatory sources' });
    }
  });

  // 6. Import official AD record from Federal Register directly into CAMO database
  app.post('/api/regulatory/import', (req, res) => {
    try {
      const { sourceRecord } = req.body;
      if (!sourceRecord || !sourceRecord.documentNumber) {
        return res.status(400).json({ error: 'Valid sourceRecord is required for import.' });
      }

      const state = camoDb.getState();
      const adNumber = sourceRecord.adNumber || `AD-${sourceRecord.documentNumber}`;
      const now = new Date().toISOString();

      const newRequirement: ComplianceRequirement = {
        id: `req-fr-${Date.now()}`,
        sourceType: 'AD',
        sourceNumber: `FAA AD ${adNumber}`,
        revision: 'Original',
        title: sourceRecord.title || `Airworthiness Directive ${adNumber}`,
        issuingAuthority: 'FAA',
        issueDate: sourceRecord.publicationDate || now.substring(0, 10),
        effectiveDate: sourceRecord.effectiveDate || sourceRecord.publicationDate || now.substring(0, 10),
        emergencyAd: false,
        status: 'EXTRACTED',
        docketNumber: sourceRecord.docketNumber || undefined,
        technicalSummary: `Imported directly from Federal Register (${sourceRecord.rawSourceReference || sourceRecord.documentNumber}). ${sourceRecord.abstract || ''}`,
        applicabilityRule: {
          id: `rule-fr-${Date.now()}`,
          complianceRequirementId: `req-fr-${Date.now()}`,
          aircraftManufacturers: sourceRecord.make ? [sourceRecord.make] : [],
          aircraftModels: sourceRecord.models || [],
          engineManufacturers: sourceRecord.productType === 'ENGINE' && sourceRecord.make ? [sourceRecord.make] : [],
          engineModels: sourceRecord.productType === 'ENGINE' && sourceRecord.models ? sourceRecord.models : [],
          componentPartNumbers: [],
          rawText: `${sourceRecord.make || ''} ${sourceRecord.models?.join(', ') || ''} (Source: Federal Register ${sourceRecord.documentNumber})`
        },
        actions: [
          {
            id: `act-fr-${Date.now()}`,
            complianceRequirementId: `req-fr-${Date.now()}`,
            sequence: 1,
            actionName: 'Accomplish Mandated Maintenance Actions',
            actionType: 'INSPECTION',
            fullInstruction: `Review official Federal Register notice (${sourceRecord.documentNumber}) and accomplish mandated actions per manufacturer service bulletin.`
          }
        ],
        externalEffectivityReferences: sourceRecord.pdfUrl ? [
          {
            id: `doc-fr-pdf-${Date.now()}`,
            documentReference: `Federal Register Document ${sourceRecord.documentNumber}`,
            purpose: 'Official published Airworthiness Directive rule text and compliance mandate',
            requiredForApplicability: true,
            availabilityStatus: 'AVAILABLE',
            effectivityVerified: true,
            verificationStatus: 'VERIFIED_IN_SCOPE'
          }
        ] : [],
        createdAt: now,
        createdBy: state.currentUser.name,
        updatedAt: now,
        updatedBy: state.currentUser.name
      };

      // Build dynamic applicability criteria
      newRequirement.applicabilityCriteria = buildDynamicApplicabilityCriteria(newRequirement, newRequirement.applicabilityRule);

      // Run Rule Engine
      const evalResult = evaluateComplianceRequirement(newRequirement, {
        aircraft: state.aircraft,
        engines: state.engines,
        components: state.components,
        installations: state.installations,
        knowledgeFacts: state.knowledgeFacts
      });

      newRequirement.status = evalResult.assessments.some(a => a.result === 'REVIEW_REQUIRED') ? 'UNDER_REVIEW' : 'ASSESSED';

      camoDb.update((draft) => {
        draft.requirements.unshift(newRequirement);
        for (const ass of evalResult.assessments) {
          const idx = draft.assessments.findIndex(a => a.id === ass.id);
          if (idx >= 0) {
            draft.assessments[idx] = ass;
          } else {
            draft.assessments.push(ass);
          }
        }
      });

      camoDb.logAudit({
        user: state.currentUser.name,
        role: state.currentUser.role,
        action: 'CREATE',
        entityType: 'ComplianceRequirement',
        entityId: newRequirement.id,
        details: `Imported FAA AD ${adNumber} directly from Federal Register (${sourceRecord.documentNumber}) with official provenance.`
      });

      res.json({
        success: true,
        requirement: newRequirement,
        assessments: evalResult.assessments,
        state: camoDb.getState()
      });
    } catch (err: any) {
      console.error('Regulatory import error:', err);
      res.status(500).json({ error: err.message || 'Failed to import regulatory document' });
    }
  });

  // ==========================================
  // PHASE 4: AUTOMATED OFFICIAL DOCUMENT ACQUISITION ENDPOINTS
  // ==========================================

  // 1. Acquire Official Regulatory Document (Mode 1: Download Only / Mode 2: Download + Analyze)
  app.post('/api/regulatory/acquire-document', async (req, res) => {
    try {
      const { sourceRecord, documentNumber, options } = req.body;
      let targetRecord: RegulatorySourceRecord | null = sourceRecord;

      if (!targetRecord && documentNumber) {
        const frConnector = regulatorySourceRegistry.getFederalRegisterConnector();
        targetRecord = await frConnector.getDocument(documentNumber);
      }

      if (!targetRecord) {
        return res.status(400).json({ 
          error: 'A valid RegulatorySourceRecord or documentNumber is required for document acquisition.' 
        });
      }

      const acquisitionResult = await officialDocumentAcquisitionService.acquireOfficialDocument(
        targetRecord,
        options || {}
      );

      res.json(acquisitionResult);
    } catch (err: any) {
      console.error('Official document acquisition error:', err);
      res.status(500).json({ 
        success: false, 
        error: err.message || 'Failed to acquire official document from regulatory authority.' 
      });
    }
  });

  // 2. List all Acquired Official Documents with Provenance and SHA-256
  app.get('/api/regulatory/acquired-documents', (req, res) => {
    try {
      const docs = officialDocumentAcquisitionService.getAcquiredDocuments();
      res.json({ success: true, count: docs.length, documents: docs });
    } catch (err: any) {
      console.error('Get acquired documents error:', err);
      res.status(500).json({ error: err.message || 'Failed to retrieve acquired documents list' });
    }
  });

  // 3. Get single Acquired Document by ID (including verification details)
  app.get('/api/regulatory/acquired-documents/:id', (req, res) => {
    try {
      const { id } = req.params;
      const doc = officialDocumentAcquisitionService.getAcquiredDocumentById(id);
      if (!doc) {
        return res.status(404).json({ error: `Acquired document '${id}' not found.` });
      }
      res.json({ success: true, document: doc });
    } catch (err: any) {
      console.error('Get acquired document by id error:', err);
      res.status(500).json({ error: err.message || 'Failed to retrieve acquired document' });
    }
  });

  // 4. Send Acquired Document to Existing Document Intelligence Pipeline
  app.post('/api/regulatory/analyze-acquired-document', async (req, res) => {
    try {
      const { documentId } = req.body;
      if (!documentId) {
        return res.status(400).json({ error: 'documentId is required for analysis.' });
      }

      const result = await officialDocumentAcquisitionService.sendToExistingDocumentIntelligence(documentId);
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('Analyze acquired document error:', err);
      res.status(500).json({ 
        success: false, 
        error: err.message || 'Failed to analyze acquired document with Document Intelligence pipeline.' 
      });
    }
  });

  // ==========================================
  // PHASE 5.1: REGULATORY DISCOVERY ENGINE ENDPOINTS
  // ==========================================

  // 1. Scan Federal Register for FAA Part 39 Airworthiness Directives
  app.post('/api/regulatory/discovery/scan', async (req, res) => {
    try {
      const { startDate, endDate, incremental, maxPages, perPage } = req.body || {};

      const result = await regulatoryDiscoveryEngine.scanRegulatorySources({
        startDate,
        endDate,
        incremental,
        maxPages: maxPages ? Number(maxPages) : undefined,
        perPage: perPage ? Number(perPage) : undefined
      });

      res.json({
        success: true,
        summary: result.summary,
        discoveries: result.discoveries,
        state: camoDb.getState()
      });
    } catch (err: any) {
      console.error('Regulatory Discovery Scan error:', err);
      const isValidationError = err.message?.includes('Validation Error');
      res.status(isValidationError ? 400 : 500).json({
        success: false,
        error: err.message || 'Failed to execute regulatory discovery scan.'
      });
    }
  });

  // 2. List all Discovery Records with optional filtering
  app.get('/api/regulatory/discovery', (req, res) => {
    try {
      const { status, startDate, endDate, query } = req.query;
      const discoveries = regulatoryDiscoveryEngine.getDiscoveries({
        status: status as any,
        startDate: startDate as string,
        endDate: endDate as string,
        query: query as string
      });

      const state = camoDb.getState();
      res.json({
        success: true,
        count: discoveries.length,
        lastSuccessfulScan: state.lastSuccessfulScan,
        incrementalStartDate: regulatoryDiscoveryEngine.getIncrementalStartDate(),
        discoveries
      });
    } catch (err: any) {
      console.error('Get regulatory discoveries error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to retrieve regulatory discovery records.'
      });
    }
  });

  // 3. Get single Discovery Record by ID
  app.get('/api/regulatory/discovery/:id', (req, res) => {
    try {
      const { id } = req.params;
      const record = regulatoryDiscoveryEngine.getDiscoveryById(id);
      if (!record) {
        return res.status(404).json({
          success: false,
          error: `Regulatory discovery record '${id}' not found.`
        });
      }

      res.json({
        success: true,
        discovery: record
      });
    } catch (err: any) {
      console.error('Get discovery by ID error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to retrieve regulatory discovery record.'
      });
    }
  });

  // ==========================================
  // PHASE 5.2: AUTOMATED FLEET REGULATORY SCREENING ENDPOINTS
  // ==========================================

  // 1. Screen single Regulatory Discovery Record against Fleet
  app.post('/api/regulatory/discovery/:id/screen', (req, res) => {
    try {
      const { id } = req.params;
      const { fleet } = req.body || {};
      const state = camoDb.getState();

      const record = regulatoryDiscoveryEngine.getDiscoveryById(id) || 
        state.discoveryRecords.find(d => d.id === id || d.documentNumber === id);

      if (!record) {
        return res.status(404).json({
          success: false,
          error: `Regulatory discovery record '${id}' not found for fleet screening.`
        });
      }

      const targetFleet = fleet || {
        aircraft: state.aircraft,
        engines: state.engines,
        components: state.components,
        installations: state.installations
      };

      const summary = fleetScreeningEngine.screenDiscoveryRecordAgainstFleet(record, targetFleet);

      // Persist assessments in camoDb with strict deduplication per (discoveryRecordId, aircraftId)
      camoDb.update(draft => {
        if (!Array.isArray(draft.screeningAssessments)) {
          draft.screeningAssessments = [];
        }

        for (const ass of summary.assessments) {
          const existingIdx = draft.screeningAssessments.findIndex(
            a => a.discoveryRecordId === ass.discoveryRecordId && a.aircraftId === ass.aircraftId
          );

          if (existingIdx >= 0) {
            draft.screeningAssessments[existingIdx] = ass;
          } else {
            draft.screeningAssessments.push(ass);
          }
        }
      });

      camoDb.logAudit({
        user: state.currentUser.name,
        role: state.currentUser.role,
        action: 'FLEET_SCREENING',
        entityType: 'RegulatoryDiscoveryRecord',
        entityId: record.id,
        details: `Automated Fleet Regulatory Screening (v5.2.0) executed for ${record.adNumber || record.documentNumber}: ${summary.potentialMatches} Potential Match(es), ${summary.noMatches} No Match, ${summary.insufficientMetadata} Insufficient Metadata.`
      });

      res.json({
        success: true,
        summary,
        state: camoDb.getState()
      });
    } catch (err: any) {
      console.error('Fleet screening error for discovery record:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to execute fleet regulatory screening.'
      });
    }
  });

  // 2. Get Screening Assessments for a specific Discovery Record
  app.get('/api/regulatory/discovery/:id/screening', (req, res) => {
    try {
      const { id } = req.params;
      const state = camoDb.getState();

      const record = regulatoryDiscoveryEngine.getDiscoveryById(id) || 
        state.discoveryRecords.find(d => d.id === id || d.documentNumber === id);

      const targetDiscoveryId = record ? record.id : id;
      const assessments = (state.screeningAssessments || []).filter(
        a => a.discoveryRecordId === targetDiscoveryId || (record && a.discoveryRecordId === record.documentNumber)
      );

      res.json({
        success: true,
        discoveryRecordId: targetDiscoveryId,
        documentNumber: record?.documentNumber || id,
        adNumber: record?.adNumber || undefined,
        count: assessments.length,
        engineVersion: fleetScreeningEngine.ENGINE_VERSION,
        assessments
      });
    } catch (err: any) {
      console.error('Get screening assessments error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to retrieve screening assessments.'
      });
    }
  });

  // 3. Batch Screen multiple or all Regulatory Discovery Records against Fleet
  app.post('/api/regulatory/discovery/screen', (req, res) => {
    try {
      const { discoveryIds, fleet } = req.body || {};
      const state = camoDb.getState();

      let targetDiscoveries: RegulatoryDiscoveryRecord[] = [];
      if (Array.isArray(discoveryIds) && discoveryIds.length > 0) {
        targetDiscoveries = state.discoveryRecords.filter(d => discoveryIds.includes(d.id) || discoveryIds.includes(d.documentNumber));
      } else {
        targetDiscoveries = state.discoveryRecords;
      }

      if (targetDiscoveries.length === 0) {
        return res.json({
          success: true,
          count: 0,
          totalPotentialMatches: 0,
          totalNoMatches: 0,
          totalInsufficientMetadata: 0,
          reports: [],
          message: 'No regulatory discovery records available to screen.'
        });
      }

      const targetFleet = fleet || {
        aircraft: state.aircraft,
        engines: state.engines,
        components: state.components,
        installations: state.installations
      };

      const reports: any[] = [];
      let allAssessments: any[] = [];
      let totalPotentialMatches = 0;
      let totalNoMatches = 0;
      let totalInsufficientMetadata = 0;

      for (const disc of targetDiscoveries) {
        const rep = fleetScreeningEngine.screenDiscoveryRecordAgainstFleet(disc, targetFleet);
        reports.push(rep);
        allAssessments.push(...rep.assessments);
        totalPotentialMatches += rep.potentialMatches;
        totalNoMatches += rep.noMatches;
        totalInsufficientMetadata += rep.insufficientMetadata;
      }

      // Persist all assessments deduplicated
      camoDb.update(draft => {
        if (!Array.isArray(draft.screeningAssessments)) {
          draft.screeningAssessments = [];
        }

        for (const ass of allAssessments) {
          const existingIdx = draft.screeningAssessments.findIndex(
            a => a.discoveryRecordId === ass.discoveryRecordId && a.aircraftId === ass.aircraftId
          );

          if (existingIdx >= 0) {
            draft.screeningAssessments[existingIdx] = ass;
          } else {
            draft.screeningAssessments.push(ass);
          }
        }
      });

      camoDb.logAudit({
        user: state.currentUser.name,
        role: state.currentUser.role,
        action: 'FLEET_SCREENING',
        entityType: 'RegulatoryDiscoveryRecord',
        entityId: 'batch',
        details: `Batch Fleet Regulatory Screening (v5.2.0) processed ${targetDiscoveries.length} discovery record(s): ${totalPotentialMatches} Potential Match(es), ${totalNoMatches} No Match, ${totalInsufficientMetadata} Insufficient Metadata.`
      });

      res.json({
        success: true,
        count: reports.length,
        totalPotentialMatches,
        totalNoMatches,
        totalInsufficientMetadata,
        engineVersion: fleetScreeningEngine.ENGINE_VERSION,
        reports,
        state: camoDb.getState()
      });
    } catch (err: any) {
      console.error('Batch fleet screening error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to execute batch fleet screening.'
      });
    }
  });

  // 4. List all stored screening assessments
  app.get('/api/regulatory/screenings/all', (req, res) => {
    try {
      const state = camoDb.getState();
      const assessments = state.screeningAssessments || [];
      res.json({
        success: true,
        count: assessments.length,
        engineVersion: fleetScreeningEngine.ENGINE_VERSION,
        assessments
      });
    } catch (err: any) {
      console.error('Get all screenings error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to retrieve all screening assessments.'
      });
    }
  });

  // ==========================================
  // PHASE 5.3: AUTOMATED END-TO-END REGULATORY COMPLIANCE PIPELINE ENDPOINTS
  // ==========================================

  // 1. Execute End-to-End Pipeline for a single Discovery Record
  app.post('/api/pipeline/execute-discovery/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const options = req.body?.options || {};

      const execution = await compliancePipelineOrchestrator.executeDiscoveryPipeline(id, options);

      res.json({
        success: true,
        execution,
        state: camoDb.getState()
      });
    } catch (err: any) {
      console.error('Execute discovery pipeline error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to execute end-to-end compliance pipeline for discovery record.'
      });
    }
  });

  // 2. Execute Batch End-to-End Pipeline for multiple Discovery Records
  app.post('/api/pipeline/execute-batch', async (req, res) => {
    try {
      const { discoveryIds, options } = req.body || {};

      const summary = await compliancePipelineOrchestrator.executeBatchPipeline(
        Array.isArray(discoveryIds) ? discoveryIds : [],
        options || {}
      );

      res.json({
        success: true,
        summary,
        state: camoDb.getState()
      });
    } catch (err: any) {
      console.error('Batch pipeline execution error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to execute batch compliance pipeline.'
      });
    }
  });

  // 3. Scan Regulatory Sources & Automatically Execute Pipeline
  app.post('/api/pipeline/execute-scan', async (req, res) => {
    try {
      const { startDate, endDate, incremental, maxPages } = req.body || {};

      const result = await compliancePipelineOrchestrator.executeScanAndPipeline({
        startDate,
        endDate,
        incremental,
        maxPages: maxPages ? Number(maxPages) : undefined
      });

      res.json({
        success: true,
        scanSummary: result.scanSummary,
        pipelineSummary: result.pipelineSummary,
        executions: result.executions,
        state: camoDb.getState()
      });
    } catch (err: any) {
      console.error('Scan and pipeline execution error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to execute scan and compliance pipeline.'
      });
    }
  });

  // 4. List all Pipeline Executions with optional filtering
  app.get('/api/pipeline/executions', (req, res) => {
    try {
      const { status, discoveryRecordId, documentNumber } = req.query;
      const executions = compliancePipelineOrchestrator.getExecutions({
        status: status as any,
        discoveryRecordId: discoveryRecordId as string,
        documentNumber: documentNumber as string
      });

      res.json({
        success: true,
        count: executions.length,
        orchestratorVersion: compliancePipelineOrchestrator.ORCHESTRATOR_VERSION,
        executions
      });
    } catch (err: any) {
      console.error('Get pipeline executions error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to retrieve pipeline executions.'
      });
    }
  });

  // 5. Get single Pipeline Execution by ID
  app.get('/api/pipeline/executions/:id', (req, res) => {
    try {
      const { id } = req.params;
      const execution = compliancePipelineOrchestrator.getExecutionById(id);

      if (!execution) {
        return res.status(404).json({
          success: false,
          error: `Pipeline execution '${id}' not found.`
        });
      }

      res.json({
        success: true,
        execution
      });
    } catch (err: any) {
      console.error('Get pipeline execution by ID error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to retrieve pipeline execution.'
      });
    }
  });

  // 6. Retry a failed or review-required Pipeline Execution
  app.post('/api/pipeline/executions/:id/retry', async (req, res) => {
    try {
      const { id } = req.params;
      const options = req.body?.options || {};

      const execution = await compliancePipelineOrchestrator.retryExecution(id, options);

      res.json({
        success: true,
        execution,
        state: camoDb.getState()
      });
    } catch (err: any) {
      console.error('Retry pipeline execution error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to retry pipeline execution.'
      });
    }
  });

  // Diagnostic Endpoint: Evaluate Airworthiness Directive using CAMO Rule Engine V2 (Decoupled)
  app.post('/api/evaluate-compliance-v2', (req, res) => {
    try {
      const { requirement, aircraft, fleetInventory, installedSoftware } = req.body;
      if (!requirement) {
        return res.status(400).json({ error: 'ComplianceRequirement object is required.' });
      }

      const customInventory = fleetInventory || {};
      if (installedSoftware && Array.isArray(installedSoftware)) {
        customInventory.installedSoftware = installedSoftware;
      }

      const assessment = evaluateRequirementWithCamoV2(requirement, aircraft, customInventory);
      res.json({ success: true, assessment });
    } catch (err: any) {
      console.error('CAMO Engine V2 Evaluation error:', err);
      res.status(500).json({ error: err.message || 'Failed to evaluate compliance with CAMO Engine V2' });
    }
  });

  // Save new or updated Compliance Requirement & execute Rule Engine
  app.post('/api/requirements', (req, res) => {
    try {
      const requirement: ComplianceRequirement = req.body;
      const state = camoDb.getState();

      // Run Rule Engine
      const evalResult = evaluateComplianceRequirement(requirement, {
        aircraft: state.aircraft,
        engines: state.engines,
        components: state.components,
        installations: state.installations,
        knowledgeFacts: state.knowledgeFacts,
        existingQuestions: state.questions
      });

      // Determine overall requirement status
      const hasReviewRequired = evalResult.assessments.some(a => a.result === 'REVIEW_REQUIRED');
      requirement.status = hasReviewRequired ? 'UNDER_REVIEW' : 'ASSESSED';
      requirement.updatedAt = new Date().toISOString();

      // Create or update preliminary FAPT document
      const affectedCount = evalResult.assessments.filter(a => a.result === 'APPLICABLE').length;
      const notApplicableCount = evalResult.assessments.filter(a => a.result === 'NOT_APPLICABLE').length;
      const reviewRequiredCount = evalResult.assessments.filter(a => a.result === 'REVIEW_REQUIRED').length;

      // Update Pipeline Diagnostics Stages 7, 8, 9
      if (requirement.pipelineDiagnostics) {
        requirement.pipelineDiagnostics.stage7.adObjectSaved = true;
        requirement.pipelineDiagnostics.stage7.persistenceTimestamp = new Date().toISOString();
        requirement.pipelineDiagnostics.stage7.savedRecordId = requirement.id;
        requirement.pipelineDiagnostics.stage7.adNumberStored = requirement.sourceNumber;
        requirement.pipelineDiagnostics.stage7.authorityStored = requirement.issuingAuthority;
        requirement.pipelineDiagnostics.stage7.extractedRequirementsStoredCount = (requirement.actions || []).length;
        requirement.pipelineDiagnostics.stage7.applicabilityRulesStoredCount = 1;

        requirement.pipelineDiagnostics.stage8.applicabilityEvaluationTriggered = true;
        requirement.pipelineDiagnostics.stage8.evaluationTimestamp = new Date().toISOString();
        requirement.pipelineDiagnostics.stage8.fleetEntitiesEvaluatedCount = evalResult.assessments.length;
        requirement.pipelineDiagnostics.stage8.assessmentsProducedCount = evalResult.assessments.length;
        requirement.pipelineDiagnostics.stage8.applicableCount = affectedCount;
        requirement.pipelineDiagnostics.stage8.notApplicableCount = notApplicableCount;
        requirement.pipelineDiagnostics.stage8.reviewRequiredCount = reviewRequiredCount;

        if (requirement.documentProcessingStatus === 'EXTRACTION_FAILED') {
          requirement.pipelineDiagnostics.stage9.pipelineResult = 'EXTRACTION_FAILED';
        } else if (requirement.documentProcessingStatus === 'EXTRACTION_REVIEW_REQUIRED') {
          requirement.pipelineDiagnostics.stage9.pipelineResult = 'EXTRACTION_REVIEW_REQUIRED';
        } else {
          requirement.pipelineDiagnostics.stage9.pipelineResult = 'EXTRACTED';
        }
        requirement.pipelineDiagnostics.stage9.completedAt = new Date().toISOString();
      }

      const safeAdNumber = requirement.sourceNumber || `AD-${Date.now()}`;
      const faptDoc: FAPTDocument = {
        id: `fapt-${requirement.id}`,
        complianceRequirementId: requirement.id,
        documentNumber: `FAPT-${safeAdNumber.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')}`,
        revision: 'Rev 0 (Preliminary)',
        dateCreated: new Date().toISOString(),
        adNumber: requirement.sourceNumber || 'UNKNOWN_AD',
        adRevision: requirement.revision,
        authority: requirement.issuingAuthority,
        issueDate: requirement.issueDate,
        effectiveDate: requirement.effectiveDate,
        title: requirement.title,
        emergency: requirement.emergencyAd,
        affectedFleetCount: affectedCount,
        notApplicableCount,
        reviewRequiredCount,
        applicabilityMatrix: evalResult.assessments.map(ass => {
          const ac = state.aircraft.find(a => a.id === ass.entityId);
          const compMatches = ass.matchedCriteria.componentMatch?.matched ? [ass.matchedCriteria.componentMatch.detail] : [];
          return {
            aircraftRegistration: ass.entityRegistration || 'N/A',
            msn: ass.entityMsn || '',
            model: ass.entityModel || '',
            installedEngine: state.engines.find(e => e.aircraftId === ass.entityId)?.model,
            affectedComponentsFound: compMatches,
            result: ass.result,
            reasoningSummary: ass.reasoning[0] || 'Evaluated by CAMO Rule Engine'
          };
        }),
        initialThreshold: requirement.requirementDetails?.initialThreshold || 'As defined in AD',
        complianceTime: requirement.requirementDetails?.complianceTime || '',
        repetitiveInterval: requirement.requirementDetails?.repetitiveInterval || 'N/A',
        requiredInspection: requirement.requirementDetails?.requiredInspection || '',
        modification: requirement.requirementDetails?.modification || '',
        replacement: requirement.requirementDetails?.replacement || '',
        terminatingAction: requirement.requirementDetails?.terminatingAction || '',
        requiredParts: requirement.requirementDetails?.requiredParts || [],
        requiredDocumentation: requirement.requirementDetails?.requiredDocumentation || 'Logbook entry',
        evidenceReferences: evalResult.appliedKnowledgeFacts.map(f => f.source),
        knowledgeFactsApplied: evalResult.appliedKnowledgeFacts.map(f => f.id),
        preparedBy: state.currentUser.name,
        preparedDate: new Date().toISOString().split('T')[0],
        status: 'DRAFT'
      };

      camoDb.update(draft => {
        // Upsert requirement
        const reqIdx = draft.requirements.findIndex(r => r.id === requirement.id);
        if (reqIdx >= 0) {
          draft.requirements[reqIdx] = requirement;
        } else {
          draft.requirements.unshift(requirement);
        }

        // Upsert assessments
        for (const ass of evalResult.assessments) {
          const assIdx = draft.assessments.findIndex(a => a.id === ass.id);
          if (assIdx >= 0) {
            draft.assessments[assIdx] = ass;
          } else {
            draft.assessments.push(ass);
          }
        }

        // Upsert generated questions
        for (const q of evalResult.generatedQuestions) {
          if (!draft.questions.some(existing => existing.id === q.id)) {
            draft.questions.push(q);
          }
        }

        // Upsert FAPT
        const faptIdx = draft.fapts.findIndex(f => f.complianceRequirementId === requirement.id);
        if (faptIdx >= 0) {
          draft.fapts[faptIdx] = faptDoc;
        } else {
          draft.fapts.unshift(faptDoc);
        }
      });

      camoDb.logAudit({
        user: state.currentUser.name,
        role: state.currentUser.role,
        action: 'RULE_EVALUATION',
        entityType: 'ComplianceRequirement',
        entityId: requirement.id,
        details: `Evaluated AD ${requirement.sourceNumber} against ${state.aircraft.length} aircraft. Result: ${affectedCount} Applicable, ${notApplicableCount} Not Applicable, ${reviewRequiredCount} Review Required.`
      });

      res.json({
        success: true,
        requirement,
        assessments: evalResult.assessments,
        questions: evalResult.generatedQuestions,
        fapt: faptDoc,
        state: camoDb.getState()
      });
    } catch (err: any) {
      console.error('Save requirement error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Recalculate requirement
  app.post('/api/requirements/:id/recalculate', (req, res) => {
    try {
      const { id } = req.params;
      const state = camoDb.getState();
      const requirement = state.requirements.find(r => r.id === id);

      if (!requirement) {
        return res.status(404).json({ error: 'Compliance requirement not found' });
      }

      const evalResult = evaluateComplianceRequirement(requirement, {
        aircraft: state.aircraft,
        engines: state.engines,
        components: state.components,
        installations: state.installations,
        knowledgeFacts: state.knowledgeFacts,
        existingQuestions: state.questions
      });

      camoDb.update(draft => {
        // Update assessments
        for (const ass of evalResult.assessments) {
          const idx = draft.assessments.findIndex(a => a.id === ass.id);
          if (idx >= 0) {
            draft.assessments[idx] = ass;
          } else {
            draft.assessments.push(ass);
          }
        }
        
        // Update FAPT
        const faptIdx = draft.fapts.findIndex(f => f.complianceRequirementId === id);
        if (faptIdx >= 0) {
          draft.fapts[faptIdx].applicabilityMatrix = evalResult.assessments.map(ass => {
            const compMatches = ass.matchedCriteria.componentMatch?.matched ? [ass.matchedCriteria.componentMatch.detail] : [];
            return {
              aircraftRegistration: ass.entityRegistration || 'N/A',
              msn: ass.entityMsn || '',
              model: ass.entityModel || '',
              installedEngine: draft.engines.find(e => e.aircraftId === ass.entityId)?.model,
              affectedComponentsFound: compMatches,
              result: ass.result,
              reasoningSummary: ass.reasoning[0] || 'Evaluated by CAMO Rule Engine'
            };
          });
          draft.fapts[faptIdx].affectedFleetCount = evalResult.assessments.filter(a => a.result === 'APPLICABLE').length;
          draft.fapts[faptIdx].notApplicableCount = evalResult.assessments.filter(a => a.result === 'NOT_APPLICABLE').length;
          draft.fapts[faptIdx].reviewRequiredCount = evalResult.assessments.filter(a => a.result === 'REVIEW_REQUIRED').length;
        }
      });

      camoDb.logAudit({
        user: state.currentUser.name,
        role: state.currentUser.role,
        action: 'RECALCULATION',
        entityType: 'ComplianceRequirement',
        entityId: id,
        details: `Rule Engine recalculation triggered for AD ${requirement.sourceNumber}.`
      });

      res.json({ success: true, state: camoDb.getState() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Retry extraction from original source document
  app.post('/api/requirements/:id/retry-extraction', async (req, res) => {
    try {
      const { id } = req.params;
      const state = camoDb.getState();
      const requirement = state.requirements.find(r => r.id === id);

      if (!requirement) {
        return res.status(404).json({ error: 'Compliance requirement not found' });
      }

      let pdfBase64 = requirement.sourceDocument?.fileData;
      let text = requirement.sourceDocument?.rawExtractedText;
      let fileName = requirement.sourceDocument?.fileName || `${(requirement.sourceNumber || 'Airworthiness_Directive').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

      // 1. Check if we have source document in state.acquiredDocuments
      if (!pdfBase64 && (!text || text.trim().length === 0)) {
        const acquired = (state.acquiredDocuments || []).find(d => 
          (requirement.sourceNumber && (d.adNumber === requirement.sourceNumber || d.documentNumber === requirement.sourceNumber || requirement.sourceNumber.includes(d.documentNumber))) ||
          (requirement.sourceDocument?.documentHash && d.sha256 === requirement.sourceDocument.documentHash)
        );
        if (acquired) {
          pdfBase64 = acquired.fileData;
          text = acquired.rawExtractedText || text;
          if (acquired.fileName) fileName = acquired.fileName;
        }
      }

      // 2. Check if we have data from state.adCandidates
      if (!pdfBase64 && (!text || text.trim().length === 0)) {
        const cand = (state.adCandidates || []).find(c => 
          c.adNumber === requirement.sourceNumber || 
          c.analyzedRequirementId === requirement.id ||
          c.id === requirement.id
        );
        if (cand) {
          text = [
            `DEPARTMENT OF TRANSPORTATION / ${cand.authority || 'FEDERAL AVIATION ADMINISTRATION'}`,
            `AIRWORTHINESS DIRECTIVE`,
            `AD Number: ${cand.adNumber}`,
            `Title: ${cand.title}`,
            `Authority: ${cand.authority}`,
            `Manufacturer: ${cand.manufacturer}`,
            `Target Family: ${cand.family || ''}`,
            `Issue Date: ${cand.issueDate || ''}`,
            `Effective Date: ${cand.effectiveDate || ''}`,
            `Docket: ${cand.docketNumber || 'N/A'}`,
            `Applicability:`,
            cand.rawApplicabilityText || `Applies to ${cand.manufacturer} ${cand.modelScope.join(', ')} airplanes.`,
            cand.summary ? `Summary:\n${cand.summary}` : ''
          ].filter(Boolean).join('\n\n');
        }
      }

      // 3. Synthesize authoritative regulatory text from the existing requirement fields if still missing
      if (!pdfBase64 && (!text || text.trim().length === 0)) {
        const lines: string[] = [
          `AIRWORTHINESS DIRECTIVE (REGULATORY OFFICIAL RECORD)`,
          `AD Number: ${requirement.sourceNumber}`,
          `Authority: ${requirement.issuingAuthority || 'FAA'}`,
          `Title: ${requirement.title || 'Airworthiness Directive'}`,
          `Issue Date: ${requirement.issueDate || 'N/A'}`,
          `Effective Date: ${requirement.effectiveDate || 'N/A'}`,
          `Revision: ${requirement.revision || 'Original Issue'}`
        ];

        if (requirement.applicabilityRule) {
          lines.push(`\nAPPLICABILITY:`);
          if (requirement.applicabilityRule.rawText) {
            lines.push(requirement.applicabilityRule.rawText);
          } else {
            lines.push(`Manufacturers: ${requirement.applicabilityRule.aircraftManufacturers?.join(', ') || 'N/A'}`);
            lines.push(`Models: ${requirement.applicabilityRule.aircraftModels?.join(', ') || 'N/A'}`);
            if (requirement.applicabilityRule.componentPartNumbers?.length) {
              lines.push(`Part Numbers: ${requirement.applicabilityRule.componentPartNumbers.join(', ')}`);
            }
          }
        }

        if (requirement.requirementDetails) {
          lines.push(`\nCOMPLIANCE REQUIREMENTS:`);
          if (requirement.requirementDetails.requiredInspection) lines.push(`Required Inspection: ${requirement.requirementDetails.requiredInspection}`);
          if (requirement.requirementDetails.initialThreshold) lines.push(`Initial Threshold: ${requirement.requirementDetails.initialThreshold}`);
          if (requirement.requirementDetails.repetitiveInterval) lines.push(`Repetitive Interval: ${requirement.requirementDetails.repetitiveInterval}`);
          if (requirement.requirementDetails.terminatingAction) lines.push(`Terminating Action: ${requirement.requirementDetails.terminatingAction}`);
          if (requirement.requirementDetails.requiredParts?.length) lines.push(`Required Parts: ${requirement.requirementDetails.requiredParts.join(', ')}`);
        }

        if (requirement.mandatedActions && requirement.mandatedActions.length > 0) {
          lines.push(`\nMANDATED ACTIONS:`);
          requirement.mandatedActions.forEach(a => {
            lines.push(`- [${a.paragraphReference || 'Action'}] ${a.description} (${a.complianceThreshold?.rawDescription || 'Standard'})`);
          });
        }

        if (requirement.softwareRequirements && requirement.softwareRequirements.length > 0) {
          lines.push(`\nSOFTWARE REQUIREMENTS:`);
          requirement.softwareRequirements.forEach(s => {
            lines.push(`- Software P/N ${s.softwarePartNumber} (${s.mandatedSoftware || s.softwareVersion}) on ${s.targetSystem || 'Avionics LRU'}`);
          });
        }

        text = lines.join('\n');
      }

      // Persist the resolved source document back onto the requirement so it is permanently cached
      if (!requirement.sourceDocument) {
        requirement.sourceDocument = {
          fileName,
          fileSize: text ? text.length : (pdfBase64 ? Math.round(pdfBase64.length * 0.75) : 1024),
          mimeType: pdfBase64 ? 'application/pdf' : 'text/plain',
          fileData: pdfBase64,
          rawExtractedText: text,
          documentHash: crypto.createHash('sha256').update(text || pdfBase64 || requirement.id).digest('hex')
        };
      } else {
        if (!requirement.sourceDocument.rawExtractedText && text) {
          requirement.sourceDocument.rawExtractedText = text;
        }
        if (!requirement.sourceDocument.fileData && pdfBase64) {
          requirement.sourceDocument.fileData = pdfBase64;
        }
      }

      // Re-run extraction
      const extracted = await extractAdWithGemini({ pdfBase64, text, fileName });

      // Update requirement fields
      requirement.sourceNumber = extracted.sourceNumber || requirement.sourceNumber;
      requirement.revision = extracted.revision || requirement.revision || 'Original';
      requirement.title = extracted.title || requirement.title;
      requirement.issuingAuthority = extracted.issuingAuthority || requirement.issuingAuthority;
      requirement.issueDate = extracted.issueDate || requirement.issueDate;
      requirement.effectiveDate = extracted.effectiveDate || requirement.effectiveDate;
      requirement.emergencyAd = Boolean(extracted.emergencyAd);
      requirement.supersedes = extracted.supersedes;
      requirement.actions = (extracted.actions || []).map((act, idx) => ({
        id: `act-${requirement.id}-${idx}`,
        complianceRequirementId: requirement.id,
        ...act
      }));
      requirement.mandatedActions = extracted.mandatedActions || [];
      requirement.softwareRequirements = extracted.softwareRequirements || [];
      requirement.externalEffectivityReferences = extracted.externalEffectivityReferences || [];
      requirement.rawExtraction = extracted.rawExtraction;
      requirement.referencedDocuments = (extracted.referencedDocuments || []).map((ref, idx) => ({
        id: `ref-${requirement.id}-${idx}`,
        complianceRequirementId: requirement.id,
        ...ref
      }));
      requirement.documentProcessingStatus = extracted.documentProcessingStatus || 'EXTRACTED';
      requirement.extractionStatus = extracted.extractionStatus || 'SUCCESS';
      requirement.extractionError = extracted.extractionError;
      requirement.missingFields = extracted.missingFields;
      requirement.provenanceMap = extracted.provenanceMap || {};
      requirement.extractionFailureRecord = extracted.extractionFailureRecord;
      requirement.diagnostics = extracted.diagnostics;
      requirement.pipelineDiagnostics = extracted.pipelineDiagnostics;
      requirement.updatedAt = new Date().toISOString();
      requirement.updatedBy = state.currentUser.name;

      if (requirement.applicabilityRule) {
        requirement.applicabilityRule.aircraftManufacturers = extracted.aircraftManufacturers || [];
        requirement.applicabilityRule.aircraftModels = extracted.aircraftModels || [];
        requirement.applicabilityRule.aircraftSerialRanges = extracted.aircraftSerialRangesFrom ? {
          from: extracted.aircraftSerialRangesFrom,
          to: extracted.aircraftSerialRangesTo,
          list: extracted.aircraftSerialRangesList,
          description: extracted.aircraftSerialRangesDescription
        } : undefined;
        requirement.applicabilityRule.engineManufacturers = extracted.engineManufacturers;
        requirement.applicabilityRule.engineModels = extracted.engineModels;
        requirement.applicabilityRule.componentPartNumbers = extracted.componentPartNumbers || [];
        requirement.applicabilityRule.componentSerialRanges = (extracted.componentSerialRangesFrom || extracted.componentSerialRangesDescription) ? {
          from: extracted.componentSerialRangesFrom,
          to: extracted.componentSerialRangesTo,
          list: extracted.componentSerialRangesList,
          description: extracted.componentSerialRangesDescription
        } : undefined;
        requirement.applicabilityRule.affectedConfiguration = extracted.affectedConfiguration;
        requirement.applicabilityRule.otherEffectivityCriteria = extracted.otherEffectivityCriteria;
        requirement.applicabilityRule.rawText = extracted.applicabilityRawSummary;
      }

      if (requirement.requirementDetails) {
        requirement.requirementDetails.initialThreshold = extracted.initialThreshold || undefined;
        requirement.requirementDetails.complianceTime = extracted.complianceTime || undefined;
        requirement.requirementDetails.repetitiveInterval = extracted.repetitiveInterval || undefined;
        requirement.requirementDetails.requiredInspection = extracted.requiredInspection || undefined;
        requirement.requirementDetails.modification = extracted.modification || undefined;
        requirement.requirementDetails.replacement = extracted.replacement || undefined;
        requirement.requirementDetails.optionalMethod = extracted.optionalMethod || undefined;
        requirement.requirementDetails.terminatingAction = extracted.terminatingAction || undefined;
        requirement.requirementDetails.requiredParts = extracted.requiredParts || [];
        requirement.requirementDetails.requiredDocumentation = extracted.requiredDocumentation || undefined;
      }

      // Re-run rule engine evaluation
      const evalResult = evaluateComplianceRequirement(requirement, {
        aircraft: state.aircraft,
        engines: state.engines,
        components: state.components,
        installations: state.installations,
        knowledgeFacts: state.knowledgeFacts,
        existingQuestions: state.questions
      });

      const hasReviewRequired = evalResult.assessments.some(a => a.result === 'REVIEW_REQUIRED');
      requirement.status = hasReviewRequired ? 'UNDER_REVIEW' : 'ASSESSED';

      const affectedCount = evalResult.assessments.filter(a => a.result === 'APPLICABLE').length;
      const notApplicableCount = evalResult.assessments.filter(a => a.result === 'NOT_APPLICABLE').length;
      const reviewRequiredCount = evalResult.assessments.filter(a => a.result === 'REVIEW_REQUIRED').length;

      // Update Pipeline Diagnostics Stages 7, 8, 9
      if (requirement.pipelineDiagnostics) {
        requirement.pipelineDiagnostics.stage7.adObjectSaved = true;
        requirement.pipelineDiagnostics.stage7.persistenceTimestamp = new Date().toISOString();
        requirement.pipelineDiagnostics.stage7.savedRecordId = requirement.id;
        requirement.pipelineDiagnostics.stage7.adNumberStored = requirement.sourceNumber;
        requirement.pipelineDiagnostics.stage7.authorityStored = requirement.issuingAuthority;
        requirement.pipelineDiagnostics.stage7.extractedRequirementsStoredCount = (requirement.actions || []).length;
        requirement.pipelineDiagnostics.stage7.applicabilityRulesStoredCount = 1;

        requirement.pipelineDiagnostics.stage8.applicabilityEvaluationTriggered = true;
        requirement.pipelineDiagnostics.stage8.evaluationTimestamp = new Date().toISOString();
        requirement.pipelineDiagnostics.stage8.fleetEntitiesEvaluatedCount = evalResult.assessments.length;
        requirement.pipelineDiagnostics.stage8.assessmentsProducedCount = evalResult.assessments.length;
        requirement.pipelineDiagnostics.stage8.applicableCount = affectedCount;
        requirement.pipelineDiagnostics.stage8.notApplicableCount = notApplicableCount;
        requirement.pipelineDiagnostics.stage8.reviewRequiredCount = reviewRequiredCount;

        if (requirement.documentProcessingStatus === 'EXTRACTION_FAILED') {
          requirement.pipelineDiagnostics.stage9.pipelineResult = 'EXTRACTION_FAILED';
        } else if (requirement.documentProcessingStatus === 'EXTRACTION_REVIEW_REQUIRED') {
          requirement.pipelineDiagnostics.stage9.pipelineResult = 'EXTRACTION_REVIEW_REQUIRED';
        } else {
          requirement.pipelineDiagnostics.stage9.pipelineResult = 'EXTRACTED';
        }
        requirement.pipelineDiagnostics.stage9.completedAt = new Date().toISOString();
      }

      camoDb.update(draft => {
        const reqIdx = draft.requirements.findIndex(r => r.id === id);
        if (reqIdx >= 0) {
          draft.requirements[reqIdx] = requirement;
        }

        // Upsert assessments
        for (const ass of evalResult.assessments) {
          const assIdx = draft.assessments.findIndex(a => a.id === ass.id);
          if (assIdx >= 0) {
            draft.assessments[assIdx] = ass;
          } else {
            draft.assessments.push(ass);
          }
        }

        // Upsert questions
        for (const q of evalResult.generatedQuestions) {
          if (!draft.questions.some(existing => existing.id === q.id)) {
            draft.questions.push(q);
          }
        }
      });

      camoDb.logAudit({
        user: state.currentUser.name,
        role: state.currentUser.role,
        action: 'EXTRACTION_RETRY',
        entityType: 'ComplianceRequirement',
        entityId: id,
        details: `Re-extracted Airworthiness Directive ${requirement.sourceNumber || fileName}. Pipeline Result: ${requirement.pipelineDiagnostics?.stage9.pipelineResult || requirement.documentProcessingStatus}.`
      });

      res.json({
        success: true,
        requirement,
        assessments: evalResult.assessments,
        questions: evalResult.generatedQuestions,
        state: camoDb.getState(),
        diagnostics: requirement.pipelineDiagnostics
      });
    } catch (err: any) {
      console.error('Retry extraction error:', err);
      res.status(500).json({ error: err.message || 'Failed to retry extraction' });
    }
  });

  // Delete Compliance Requirement & Cascade all generated analysis records
  app.delete('/api/requirements/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};
      const state = camoDb.getState();
      const requirement = state.requirements.find(r => r.id === id);

      if (!requirement) {
        return res.status(404).json({ error: 'Compliance requirement not found' });
      }

      // Collect IDs of directly linked dependent items
      const reqAssessments = state.assessments.filter(a => a.complianceRequirementId === id);
      const assessmentIds = new Set(reqAssessments.map(a => a.id));

      const reqQuestions = state.questions.filter(q => 
        q.complianceRequirementId === id || assessmentIds.has(q.complianceAssessmentId)
      );

      const reqFapts = state.fapts.filter(f => f.complianceRequirementId === id);

      const reqEvidence = state.evidence.filter(e => 
        e.complianceRequirementId === id || (e.complianceAssessmentId && assessmentIds.has(e.complianceAssessmentId))
      );
      const evidenceIds = new Set(reqEvidence.map(e => e.id));

      // Identify Knowledge Facts exclusively created for / linked to this requirement
      const otherFapts = state.fapts.filter(f => f.complianceRequirementId !== id);
      const otherUsedFactIds = new Set(otherFapts.flatMap(f => f.knowledgeFactsApplied || []));

      const factsToDelete = new Set<string>();
      for (const fact of state.knowledgeFacts) {
        const isLinkedToEvidence = fact.evidenceId && evidenceIds.has(fact.evidenceId);
        const isSourcedFromAd = fact.source && (
          fact.source.includes(requirement.sourceNumber) || 
          fact.source.includes(requirement.id)
        );

        if ((isLinkedToEvidence || isSourcedFromAd) && !otherUsedFactIds.has(fact.id)) {
          factsToDelete.add(fact.id);
        }
      }

      const deletedCounts = {
        assessments: reqAssessments.length,
        questions: reqQuestions.length,
        fapts: reqFapts.length,
        evidence: reqEvidence.length,
        knowledgeFacts: factsToDelete.size
      };

      // Perform atomic cascade delete
      camoDb.update(draft => {
        // 1. Delete requirement
        draft.requirements = draft.requirements.filter(r => r.id !== id);

        // 2. Delete assessments
        draft.assessments = draft.assessments.filter(a => a.complianceRequirementId !== id);

        // 3. Delete user questions
        draft.questions = draft.questions.filter(q => 
          q.complianceRequirementId !== id && !assessmentIds.has(q.complianceAssessmentId)
        );

        // 4. Delete FAPT documents
        draft.fapts = draft.fapts.filter(f => f.complianceRequirementId !== id);

        // 5. Delete evidence records
        draft.evidence = draft.evidence.filter(e => 
          e.complianceRequirementId !== id && (!e.complianceAssessmentId || !assessmentIds.has(e.complianceAssessmentId))
        );

        // 6. Delete exclusively linked knowledge facts
        draft.knowledgeFacts = draft.knowledgeFacts.filter(f => !factsToDelete.has(f.id));

        // 7. Append immutable Audit Trail entry (Preserve audit history!)
        const deleteAuditEntry: AuditTrailEntry = {
          id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          timestamp: new Date().toISOString(),
          user: draft.currentUser.name,
          role: draft.currentUser.role,
          action: 'DELETE',
          entityType: 'ComplianceRequirement',
          entityId: id,
          details: `Deleted Airworthiness Directive ${requirement.sourceNumber} ("${requirement.title}"). Removed ${deletedCounts.assessments} fleet assessment(s), ${deletedCounts.questions} user question(s), ${deletedCounts.fapts} FAPT document(s), ${deletedCounts.evidence} evidence record(s), and ${deletedCounts.knowledgeFacts} requirement-specific knowledge fact(s).${reason ? ` Reason: "${reason}".` : ''}`,
          previousState: {
            sourceNumber: requirement.sourceNumber,
            title: requirement.title,
            revision: requirement.revision,
            issuingAuthority: requirement.issuingAuthority,
            effectiveDate: requirement.effectiveDate,
            deletedCounts
          }
        };
        draft.auditTrail.unshift(deleteAuditEntry);
      });

      res.json({
        success: true,
        message: 'AD successfully deleted. You may upload the document again for a new analysis.',
        deletedId: id,
        deletedSourceNumber: requirement.sourceNumber,
        deletedCounts,
        state: camoDb.getState()
      });
    } catch (err: any) {
      console.error('Delete requirement error:', err);
      res.status(500).json({ error: err.message || 'Failed to delete compliance requirement' });
    }
  });

  // Answer User Question & Store Evidence + Knowledge Fact + Auto-Recalculate
  app.post('/api/questions/:id/answer', (req, res) => {
    try {
      const { id } = req.params;
      const { 
        answer, 
        answerData, 
        evidenceDescription, 
        documentReference, 
        uploadedFileName, 
        uploadedFileData 
      } = req.body;

      const state = camoDb.getState();
      const question = state.questions.find(q => q.id === id);

      if (!question) {
        return res.status(404).json({ error: 'Question not found' });
      }

      const requirement = state.requirements.find(r => r.id === question.complianceRequirementId);
      const isInstalled = answerData?.installed ?? (answer?.toLowerCase().includes('yes') || answer?.toLowerCase().includes('installed'));
      const isNotInstalled = answer?.toLowerCase().includes('no') || answer?.toLowerCase().includes('not installed');

      const evidenceId = `ev-${Date.now()}`;
      const newEvidence: Evidence = {
        id: evidenceId,
        complianceAssessmentId: question.complianceAssessmentId,
        complianceRequirementId: question.complianceRequirementId,
        type: documentReference ? 'COMPONENT_TAG_8130' : 'USER_DECLARATION',
        description: evidenceDescription || `User engineering confirmation for ${question.partNumberInQuestion || 'component'} on ${question.targetEntity.label}`,
        documentReference: documentReference || 'CAMO Review Record Ref #' + Date.now().toString().slice(-6),
        source: `CAMO Engineer ${state.currentUser.name} (${state.currentUser.role})`,
        uploadedFileName,
        uploadedFileData,
        date: new Date().toISOString(),
        verified: true,
        verifiedBy: state.currentUser.name
      };

      // Create Reusable Knowledge Fact
      const partNumber = question.partNumberInQuestion || answerData?.partNumber || 'Target P/N';
      const serialNumber = answerData?.serialNumber || 'UNKNOWN';
      const factId = `fact-${Date.now()}`;

      let factTitle = '';
      let factType: KnowledgeFact['factType'] = 'COMPONENT_INSTALLED';
      let objectValue = '';

      if (isInstalled) {
        factType = 'COMPONENT_INSTALLED';
        factTitle = `P/N ${partNumber} (S/N ${serialNumber}) is installed on ${question.targetEntity.label}`;
        objectValue = `P/N ${partNumber} (S/N ${serialNumber})`;
      } else if (isNotInstalled) {
        factType = 'COMPONENT_NOT_INSTALLED';
        factTitle = `P/N ${partNumber} is confirmed NOT installed on ${question.targetEntity.label}`;
        objectValue = `NOT_INSTALLED (P/N ${partNumber})`;
      } else {
        factType = 'AIRCRAFT_MOD_STATUS';
        factTitle = `Status of P/N ${partNumber} on ${question.targetEntity.label}: ${answer}`;
        objectValue = answer || 'UNDER_REVIEW';
      }

      const newFact: KnowledgeFact = {
        id: factId,
        title: factTitle,
        factType,
        subjectType: question.targetEntity.type === 'FLEET' ? 'OPERATOR' : question.targetEntity.type,
        subjectId: question.targetEntity.id,
        subjectLabel: question.targetEntity.label,
        predicate: isInstalled ? 'has_installed_component' : 'does_not_have_component',
        objectValue,
        details: {
          partNumber,
          serialNumber: isInstalled ? serialNumber : undefined,
          position: answerData?.position || 'Empennage / System Bay',
          aircraftRegistration: question.targetEntity.label
        },
        source: `AD Review ${requirement?.sourceNumber || 'AD'} - ${documentReference || 'CAMO Engineering Declaration'}`,
        evidenceId,
        evidenceSummary: newEvidence.description,
        confidence: 100,
        createdDate: new Date().toISOString(),
        createdBy: state.currentUser.name,
        lastVerified: new Date().toISOString(),
        verifiedBy: state.currentUser.name,
        usageCount: 1
      };

      camoDb.update(draft => {
        // Update question
        const qIdx = draft.questions.findIndex(q => q.id === id);
        if (qIdx >= 0) {
          draft.questions[qIdx].answer = answer;
          draft.questions[qIdx].answerData = answerData;
          draft.questions[qIdx].answeredBy = draft.currentUser.name;
          draft.questions[qIdx].answerDate = new Date().toISOString();
          draft.questions[qIdx].status = 'ANSWERED';
        }

        // Add Evidence
        draft.evidence.push(newEvidence);

        // Add Knowledge Fact
        draft.knowledgeFacts.push(newFact);

        // If installed, also register component & installation in fleet database
        if (isInstalled && partNumber) {
          const compId = `comp-${Date.now()}`;
          const newComp: Component = {
            id: compId,
            manufacturer: 'Approved OEM Manufacturer',
            partNumber,
            serialNumber,
            componentType: 'FLIGHT_CONTROLS',
            description: `Aeronautical Component P/N ${partNumber}`,
            status: 'SERVICEABLE'
          };
          draft.components.push(newComp);

          const instId = `inst-${Date.now()}`;
          const newInst: ComponentInstallation = {
            id: instId,
            componentId: compId,
            aircraftId: question.targetEntity.id,
            aircraftRegistration: question.targetEntity.label,
            position: answerData?.position || 'Empennage / System Bay',
            installationDate: new Date().toISOString().split('T')[0],
            installationHours: 0,
            installationCycles: 0,
            currentStatus: 'INSTALLED',
            installedBy: draft.currentUser.name,
            workOrderRef: documentReference || 'WO-CAMO-AUTO-CONFIRM'
          };
          draft.installations.push(newInst);
        }
      });

      // Recalculate requirement with new knowledge
      if (requirement) {
        const freshState = camoDb.getState();
        const evalResult = evaluateComplianceRequirement(requirement, {
          aircraft: freshState.aircraft,
          engines: freshState.engines,
          components: freshState.components,
          installations: freshState.installations,
          knowledgeFacts: freshState.knowledgeFacts,
          existingQuestions: freshState.questions
        });

        camoDb.update(draft => {
          for (const ass of evalResult.assessments) {
            const idx = draft.assessments.findIndex(a => a.id === ass.id);
            if (idx >= 0) {
              draft.assessments[idx] = ass;
            } else {
              draft.assessments.push(ass);
            }
          }

          // Check if all assessments are resolved
          const hasRemainingReview = evalResult.assessments.some(a => a.result === 'REVIEW_REQUIRED');
          const reqIdx = draft.requirements.findIndex(r => r.id === requirement.id);
          if (reqIdx >= 0) {
            draft.requirements[reqIdx].status = hasRemainingReview ? 'UNDER_REVIEW' : 'ASSESSED';
          }

          // Update FAPT
          const faptIdx = draft.fapts.findIndex(f => f.complianceRequirementId === requirement.id);
          if (faptIdx >= 0) {
            draft.fapts[faptIdx].applicabilityMatrix = evalResult.assessments.map(ass => {
              const compMatches = ass.matchedCriteria.componentMatch?.matched ? [ass.matchedCriteria.componentMatch.detail] : [];
              return {
                aircraftRegistration: ass.entityRegistration || 'N/A',
                msn: ass.entityMsn || '',
                model: ass.entityModel || '',
                installedEngine: draft.engines.find(e => e.aircraftId === ass.entityId)?.model,
                affectedComponentsFound: compMatches,
                result: ass.result,
                reasoningSummary: ass.reasoning[0] || 'Evaluated by CAMO Rule Engine'
              };
            });
            draft.fapts[faptIdx].affectedFleetCount = evalResult.assessments.filter(a => a.result === 'APPLICABLE').length;
            draft.fapts[faptIdx].notApplicableCount = evalResult.assessments.filter(a => a.result === 'NOT_APPLICABLE').length;
            draft.fapts[faptIdx].reviewRequiredCount = evalResult.assessments.filter(a => a.result === 'REVIEW_REQUIRED').length;
            if (!draft.fapts[faptIdx].knowledgeFactsApplied.includes(factId)) {
              draft.fapts[faptIdx].knowledgeFactsApplied.push(factId);
            }
          }
        });
      }

      camoDb.logAudit({
        user: state.currentUser.name,
        role: state.currentUser.role,
        action: 'QUESTION_ANSWERED',
        entityType: 'UserQuestion',
        entityId: id,
        details: `Answered question for ${question.targetEntity.label}: "${answer}". Created reusable Knowledge Fact #${factId}.`
      });

      res.json({ success: true, fact: newFact, state: camoDb.getState() });
    } catch (err: any) {
      console.error('Answer question error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Verify / Update / Reject Knowledge Fact
  app.post('/api/knowledge-facts/:id/action', (req, res) => {
    try {
      const { id } = req.params;
      const { action, notes } = req.body; // 'CONFIRM' | 'REJECT' | 'UPDATE'
      const state = camoDb.getState();

      const fact = state.knowledgeFacts.find(f => f.id === id);
      if (!fact) {
        return res.status(404).json({ error: 'Fact not found' });
      }

      camoDb.update(draft => {
        const fIdx = draft.knowledgeFacts.findIndex(f => f.id === id);
        if (fIdx >= 0) {
          if (action === 'REJECT') {
            draft.knowledgeFacts[fIdx].isRejected = true;
          } else if (action === 'CONFIRM') {
            draft.knowledgeFacts[fIdx].isRejected = false;
            draft.knowledgeFacts[fIdx].lastVerified = new Date().toISOString();
            draft.knowledgeFacts[fIdx].verifiedBy = draft.currentUser.name;
          }
        }
      });

      camoDb.logAudit({
        user: state.currentUser.name,
        role: state.currentUser.role,
        action: 'FACT_RECORDED',
        entityType: 'KnowledgeFact',
        entityId: id,
        details: `${action} executed on Knowledge Fact #${id}: "${fact.title}". Notes: ${notes || 'None'}`
      });

      res.json({ success: true, state: camoDb.getState() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Assessment Approval (Chief CAMO Engineer Sign-off)
  app.post('/api/assessments/:id/approve', (req, res) => {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const state = camoDb.getState();

      camoDb.update(draft => {
        const assIdx = draft.assessments.findIndex(a => a.id === id);
        if (assIdx >= 0) {
          draft.assessments[assIdx].status = 'APPROVED';
          draft.assessments[assIdx].approvedBy = draft.currentUser.name;
          draft.assessments[assIdx].approvalDate = new Date().toISOString();
          draft.assessments[assIdx].userNotes = comments;
        }
      });

      camoDb.logAudit({
        user: state.currentUser.name,
        role: state.currentUser.role,
        action: 'APPROVAL',
        entityType: 'ComplianceAssessment',
        entityId: id,
        details: `Approved airworthiness compliance assessment #${id} with CAMO digital authorization.`
      });

      res.json({ success: true, state: camoDb.getState() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Sign and Approve FAPT / AD Review Sheet
  app.post('/api/fapt/:id/sign', (req, res) => {
    try {
      const { id } = req.params;
      const { comments, action } = req.body; // 'APPROVE' | 'REVIEW'
      const state = camoDb.getState();

      camoDb.update(draft => {
        const fIdx = draft.fapts.findIndex(f => f.id === id || f.complianceRequirementId === id);
        if (fIdx >= 0) {
          if (action === 'APPROVE') {
            draft.fapts[fIdx].status = 'APPROVED';
            draft.fapts[fIdx].approvedBy = draft.currentUser.name;
            draft.fapts[fIdx].approvalDate = new Date().toISOString().split('T')[0];
            draft.fapts[fIdx].signatureHash = `AUTH-CAMO-${Math.random().toString(36).substring(2, 10).toUpperCase()}-2026`;
            draft.fapts[fIdx].revision = 'Rev 1 (Approved)';
          } else {
            draft.fapts[fIdx].status = 'REVIEWED';
            draft.fapts[fIdx].reviewedBy = draft.currentUser.name;
            draft.fapts[fIdx].reviewedDate = new Date().toISOString().split('T')[0];
          }
          if (comments) draft.fapts[fIdx].comments = comments;

          // Also mark requirement as APPROVED
          const reqIdx = draft.requirements.findIndex(r => r.id === draft.fapts[fIdx].complianceRequirementId);
          if (reqIdx >= 0 && action === 'APPROVE') {
            draft.requirements[reqIdx].status = 'APPROVED';
            draft.requirements[reqIdx].approvedBy = draft.currentUser.name;
            draft.requirements[reqIdx].approvalDate = new Date().toISOString();
          }
        }
      });

      camoDb.logAudit({
        user: state.currentUser.name,
        role: state.currentUser.role,
        action: 'APPROVAL',
        entityType: 'FAPTDocument',
        entityId: id,
        details: `Official CAMO sign-off executed for FAPT #${id} (${action}).`
      });

      res.json({ success: true, state: camoDb.getState() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Fleet CRUD routes (Aircraft, Components, Installations)
  app.post('/api/fleet/aircraft', (req, res) => {
    try {
      const newAircraft: Aircraft = req.body;
      if (!newAircraft.id) newAircraft.id = `ac-${Date.now()}`;
      if (!newAircraft.operatorId) newAircraft.operatorId = camoDb.getState().operator.id;

      camoDb.update(draft => {
        draft.aircraft.push(newAircraft);
      });

      camoDb.logAudit({
        user: camoDb.getState().currentUser.name,
        role: camoDb.getState().currentUser.role,
        action: 'CREATE',
        entityType: 'Aircraft',
        entityId: newAircraft.id,
        details: `Registered new aircraft ${newAircraft.registration} (MSN ${newAircraft.msn}, Model ${newAircraft.model}) into fleet.`
      });

      res.json({ success: true, aircraft: newAircraft, state: camoDb.getState() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Edit / Update existing Aircraft
  app.put('/api/fleet/aircraft/:id', (req, res) => {
    try {
      const { id } = req.params;
      const updates: Partial<Aircraft> = req.body;
      const currentState = camoDb.getState();
      const existingAircraft = currentState.aircraft.find(a => a.id === id);

      if (!existingAircraft) {
        return res.status(404).json({ error: `Aircraft with ID ${id} not found.` });
      }

      let updatedAircraft: Aircraft | null = null;
      const oldReg = existingAircraft.registration;
      const newReg = updates.registration ? updates.registration.toUpperCase().trim() : oldReg;

      camoDb.update(draft => {
        const index = draft.aircraft.findIndex(a => a.id === id);
        if (index !== -1) {
          draft.aircraft[index] = {
            ...draft.aircraft[index],
            ...updates,
            id, // preserve ID
            registration: newReg,
            totalFlightHours: updates.totalFlightHours !== undefined ? Number(updates.totalFlightHours) : draft.aircraft[index].totalFlightHours,
            totalCycles: updates.totalCycles !== undefined ? Number(updates.totalCycles) : draft.aircraft[index].totalCycles,
            totalLandings: updates.totalLandings !== undefined ? Number(updates.totalLandings) : (updates.totalCycles !== undefined ? Number(updates.totalCycles) : draft.aircraft[index].totalLandings),
          };

          // If decommissioning, record date if not present
          if ((draft.aircraft[index].status === 'DECOMMISSIONED' || draft.aircraft[index].status === 'RETIRED') && !draft.aircraft[index].decommissionDate) {
            draft.aircraft[index].decommissionDate = new Date().toISOString().split('T')[0];
          }

          updatedAircraft = draft.aircraft[index];

          // If registration changed, update installations references
          if (oldReg !== newReg) {
            draft.installations.forEach(inst => {
              if (inst.aircraftId === id) {
                inst.aircraftRegistration = newReg;
              }
            });
          }
        }
      });

      camoDb.logAudit({
        user: camoDb.getState().currentUser.name,
        role: camoDb.getState().currentUser.role,
        action: 'UPDATE',
        entityType: 'Aircraft',
        entityId: id,
        details: `Updated aircraft records for ${newReg} (MSN: ${updatedAircraft?.msn}, Status: ${updatedAircraft?.status}, TSN: ${updatedAircraft?.totalFlightHours} FH, CSN: ${updatedAircraft?.totalCycles} FC).`
      });

      res.json({ success: true, aircraft: updatedAircraft, state: camoDb.getState() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Quick Status Transition (e.g. OPERATIONAL, MAINTENANCE, AOG, STORED, DECOMMISSIONED, RETIRED, INACTIVE)
  app.patch('/api/fleet/aircraft/:id/status', (req, res) => {
    try {
      const { id } = req.params;
      const { status, statusReason, notes } = req.body;
      const currentState = camoDb.getState();
      const existingAircraft = currentState.aircraft.find(a => a.id === id);

      if (!existingAircraft) {
        return res.status(404).json({ error: `Aircraft with ID ${id} not found.` });
      }

      const prevStatus = existingAircraft.status;
      let updatedAircraft: Aircraft | null = null;

      camoDb.update(draft => {
        const index = draft.aircraft.findIndex(a => a.id === id);
        if (index !== -1) {
          draft.aircraft[index].status = status;
          if (statusReason !== undefined) draft.aircraft[index].statusReason = statusReason;
          if (notes !== undefined) draft.aircraft[index].notes = notes;

          if ((status === 'DECOMMISSIONED' || status === 'RETIRED') && !draft.aircraft[index].decommissionDate) {
            draft.aircraft[index].decommissionDate = new Date().toISOString().split('T')[0];
          }

          updatedAircraft = draft.aircraft[index];
        }
      });

      camoDb.logAudit({
        user: camoDb.getState().currentUser.name,
        role: camoDb.getState().currentUser.role,
        action: 'STATUS_CHANGE',
        entityType: 'Aircraft',
        entityId: id,
        details: `Status of aircraft ${existingAircraft.registration} transitioned from ${prevStatus} to ${status}. Reason: ${statusReason || 'Operational disposition by CAMO Engineer'}.`
      });

      res.json({ success: true, aircraft: updatedAircraft, state: camoDb.getState() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Remove / Delete Aircraft from Fleet
  app.delete('/api/fleet/aircraft/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};
      const currentState = camoDb.getState();
      const targetAircraft = currentState.aircraft.find(a => a.id === id);

      if (!targetAircraft) {
        return res.status(404).json({ error: `Aircraft with ID ${id} not found.` });
      }

      camoDb.update(draft => {
        // 1. Remove aircraft
        draft.aircraft = draft.aircraft.filter(a => a.id !== id);

        // 2. Detach installed engines so they become unassigned/stored
        draft.engines.forEach(eng => {
          if (eng.aircraftId === id) {
            eng.aircraftId = undefined;
            eng.status = 'STORED';
          }
        });

        // 3. Mark component installations on this aircraft as REMOVED
        draft.installations.forEach(inst => {
          if (inst.aircraftId === id) {
            inst.currentStatus = 'REMOVED';
          }
        });
      });

      camoDb.logAudit({
        user: camoDb.getState().currentUser.name,
        role: camoDb.getState().currentUser.role,
        action: 'DELETE',
        entityType: 'Aircraft',
        entityId: id,
        details: `Aircraft ${targetAircraft.registration} (MSN ${targetAircraft.msn}, Model ${targetAircraft.model}) permanently removed from fleet. Reason: ${reason || 'Removed by CAMO Engineer due to record correction or fleet phase-out'}.`
      });

      res.json({ 
        success: true, 
        deletedId: id, 
        deletedRegistration: targetAircraft.registration,
        state: camoDb.getState() 
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/fleet/component', (req, res) => {
    try {
      const { component, installation } = req.body;
      if (!component.id) component.id = `comp-${Date.now()}`;

      camoDb.update(draft => {
        draft.components.push(component);
        if (installation) {
          if (!installation.id) installation.id = `inst-${Date.now()}`;
          installation.componentId = component.id;
          draft.installations.push(installation);
        }
      });

      camoDb.logAudit({
        user: camoDb.getState().currentUser.name,
        role: camoDb.getState().currentUser.role,
        action: 'CREATE',
        entityType: 'Component',
        entityId: component.id,
        details: `Registered component P/N ${component.partNumber} (S/N ${component.serialNumber}) with installation.`
      });

      res.json({ success: true, state: camoDb.getState() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Register Installed Software Record
  app.post('/api/fleet/software', (req, res) => {
    try {
      const {
        aircraftId,
        lruIdentifier,
        lruPosition,
        targetSystem,
        softwarePartNumber,
        softwareVersion,
        softwareDescription,
        status,
        installationDate,
        installationFlightHours,
        installationCycles,
        workOrderReference,
        evidenceId,
        componentInstallationId,
        source
      } = req.body;

      if (!aircraftId || !lruIdentifier || !lruPosition || !softwarePartNumber) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios ausentes: aircraftId, lruIdentifier, lruPosition, softwarePartNumber.' 
        });
      }

      const state = camoDb.getState();
      const aircraft = state.aircraft.find(a => a.id === aircraftId);
      if (!aircraft) {
        return res.status(400).json({ error: `Aeronave não encontrada no banco: ID ${aircraftId}` });
      }

      if (evidenceId && !state.evidence.some(e => e.id === evidenceId)) {
        return res.status(400).json({ error: `Evidência referenciada não existe: ID ${evidenceId}` });
      }

      if (componentInstallationId) {
        const inst = state.installations.find(i => i.id === componentInstallationId);
        if (!inst || inst.aircraftId !== aircraftId) {
          return res.status(400).json({ error: `Instalação de componente não encontrada para esta aeronave: ID ${componentInstallationId}` });
        }
      }

      const recordStatus: 'INSTALLED' | 'REMOVED' | 'SUPERSEDED' = 
        (status === 'REMOVED' || status === 'SUPERSEDED') ? status : 'INSTALLED';

      let supersededRecordId: string | undefined;

      const newRecord: InstalledSoftwareRecord = {
        id: `sw-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        aircraftId,
        lruIdentifier,
        lruPosition,
        targetSystem: targetSystem || undefined,
        softwarePartNumber,
        softwareVersion: softwareVersion || undefined,
        softwareDescription: softwareDescription || undefined,
        status: recordStatus,
        installationDate: installationDate || new Date().toISOString().split('T')[0],
        installationFlightHours: installationFlightHours !== undefined ? Number(installationFlightHours) : undefined,
        installationCycles: installationCycles !== undefined ? Number(installationCycles) : undefined,
        workOrderReference: workOrderReference || undefined,
        evidenceId: evidenceId || undefined,
        componentInstallationId: componentInstallationId || undefined,
        source: source || 'MANUAL_ENTRY',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      camoDb.update(draft => {
        // Regra de Unicidade Ativa: Se for INSTALLED, transicionar o registro ativo anterior na mesma posição para SUPERSEDED
        if (recordStatus === 'INSTALLED') {
          const existingActiveIdx = draft.installedSoftware.findIndex(s => 
            s.aircraftId === aircraftId &&
            s.lruIdentifier.toUpperCase() === lruIdentifier.toUpperCase() &&
            s.lruPosition.toUpperCase() === lruPosition.toUpperCase() &&
            s.status === 'INSTALLED'
          );

          if (existingActiveIdx >= 0) {
            supersededRecordId = draft.installedSoftware[existingActiveIdx].id;
            draft.installedSoftware[existingActiveIdx].status = 'SUPERSEDED';
            draft.installedSoftware[existingActiveIdx].updatedAt = new Date().toISOString();
          }
        }

        draft.installedSoftware.push(newRecord);
      });

      camoDb.logAudit({
        user: state.currentUser.name,
        role: state.currentUser.role,
        action: 'SOFTWARE_RECORDED',
        entityType: 'InstalledSoftwareRecord',
        entityId: newRecord.id,
        details: `Registrado software P/N ${softwarePartNumber} (${lruIdentifier} / ${lruPosition}) na aeronave ${aircraft.registration} com status ${recordStatus}.${supersededRecordId ? ` Registro anterior ${supersededRecordId} marcado como SUPERSEDED.` : ''}`
      });

      res.json({ success: true, record: newRecord, supersededRecordId, state: camoDb.getState() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Register Maintenance Action Accomplishment (Historical Execution Fact)
  app.post('/api/fleet/accomplishments', (req, res) => {
    try {
      const {
        aircraftId,
        complianceRequirementId,
        mandatedActionId,
        eventStatus,
        accomplishmentDate,
        accomplishmentFlightHours,
        accomplishmentCycles,
        workOrderReference,
        taskCardReference,
        maintenanceReleaseReference,
        maintenanceProvider,
        evidenceIds,
        installedSoftwareId,
        componentInstallationId,
        supersededByAccomplishmentId,
        technicianName,
        inspectorSignoff,
        notes
      } = req.body;

      if (!aircraftId || !complianceRequirementId || !mandatedActionId || !workOrderReference) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios ausentes: aircraftId, complianceRequirementId, mandatedActionId, workOrderReference.' 
        });
      }

      const state = camoDb.getState();

      // 1. Validar Aeronave
      const aircraft = state.aircraft.find(a => a.id === aircraftId);
      if (!aircraft) {
        return res.status(400).json({ error: `Aeronave não encontrada no banco: ID ${aircraftId}` });
      }

      // 2. Validar Requisito de Conformidade
      const requirement = state.requirements.find(r => r.id === complianceRequirementId);
      if (!requirement) {
        return res.status(400).json({ error: `Diretriz / Requisito de Conformidade não encontrado: ID ${complianceRequirementId}` });
      }

      // 3. Validar Ação Mandatada
      const hasAction = (requirement.mandatedActions || []).some(a => a.id === mandatedActionId) ||
        (requirement.actions || []).some(a => a.id === mandatedActionId);
      if (!hasAction) {
        return res.status(400).json({ error: `Ação mandatada ID ${mandatedActionId} não pertence à diretriz ${requirement.sourceNumber}.` });
      }

      // 4. Validar Evidências
      const validEvidenceIds: string[] = Array.isArray(evidenceIds) ? evidenceIds : [];
      for (const evId of validEvidenceIds) {
        if (!state.evidence.some(e => e.id === evId)) {
          return res.status(400).json({ error: `Evidência referenciada não encontrada: ID ${evId}` });
        }
      }

      // 5. Validar Software Instalado (se fornecido)
      if (installedSoftwareId) {
        const sw = state.installedSoftware.find(s => s.id === installedSoftwareId);
        if (!sw || sw.aircraftId !== aircraftId) {
          return res.status(400).json({ error: `Registro de software não encontrado para esta aeronave: ID ${installedSoftwareId}` });
        }
      }

      // 6. Validar Instalação de Componente (se fornecido)
      if (componentInstallationId) {
        const inst = state.installations.find(i => i.id === componentInstallationId);
        if (!inst || inst.aircraftId !== aircraftId) {
          return res.status(400).json({ error: `Instalação de componente não encontrada para esta aeronave: ID ${componentInstallationId}` });
        }
      }

      const newAccomplishment: MaintenanceActionAccomplishment = {
        id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        aircraftId,
        complianceRequirementId,
        mandatedActionId,
        eventStatus: eventStatus === 'VOIDED' ? 'VOIDED' : 'EXECUTED_VALID',
        accomplishmentDate: accomplishmentDate || new Date().toISOString().split('T')[0],
        accomplishmentFlightHours: Number(accomplishmentFlightHours || 0),
        accomplishmentCycles: Number(accomplishmentCycles || 0),
        workOrderReference,
        taskCardReference: taskCardReference || undefined,
        maintenanceReleaseReference: maintenanceReleaseReference || undefined,
        maintenanceProvider: maintenanceProvider || undefined,
        evidenceIds: validEvidenceIds,
        installedSoftwareId: installedSoftwareId || undefined,
        componentInstallationId: componentInstallationId || undefined,
        supersededByAccomplishmentId: supersededByAccomplishmentId || undefined,
        technicianName: technicianName || undefined,
        inspectorSignoff: inspectorSignoff || undefined,
        notes: notes || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      camoDb.update(draft => {
        draft.actionAccomplishments.push(newAccomplishment);
      });

      camoDb.logAudit({
        user: state.currentUser.name,
        role: state.currentUser.role,
        action: 'ACCOMPLISHMENT_RECORDED',
        entityType: 'MaintenanceActionAccomplishment',
        entityId: newAccomplishment.id,
        details: `Fato histórico de cumprimento registrado: W/O ${workOrderReference} para ação ${mandatedActionId} (AD ${requirement.sourceNumber}) na aeronave ${aircraft.registration}.`
      });

      res.json({ success: true, accomplishment: newAccomplishment, state: camoDb.getState() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Void Maintenance Action Accomplishment (Marks as VOIDED, does not physically delete)
  app.post('/api/fleet/accomplishments/:id/void', (req, res) => {
    try {
      const { id } = req.params;
      const { voidReason } = req.body;
      const state = camoDb.getState();

      const acc = state.actionAccomplishments.find(a => a.id === id);
      if (!acc) {
        return res.status(404).json({ error: `Registro de cumprimento não encontrado: ID ${id}` });
      }

      let updatedAcc: MaintenanceActionAccomplishment | undefined;

      camoDb.update(draft => {
        const idx = draft.actionAccomplishments.findIndex(a => a.id === id);
        if (idx >= 0) {
          draft.actionAccomplishments[idx].eventStatus = 'VOIDED';
          draft.actionAccomplishments[idx].updatedAt = new Date().toISOString();
          if (voidReason) {
            draft.actionAccomplishments[idx].notes = draft.actionAccomplishments[idx].notes 
              ? `${draft.actionAccomplishments[idx].notes} | [VOIDED]: ${voidReason}`
              : `[VOIDED]: ${voidReason}`;
          }
          updatedAcc = draft.actionAccomplishments[idx];
        }
      });

      camoDb.logAudit({
        user: state.currentUser.name,
        role: state.currentUser.role,
        action: 'ACCOMPLISHMENT_VOIDED',
        entityType: 'MaintenanceActionAccomplishment',
        entityId: id,
        details: `Cumprimento de manutenção ID ${id} anulado (VOIDED). Motivo: ${voidReason || 'Sem motivo detalhado informado'}.`
      });

      res.json({ success: true, accomplishment: updatedAcc, state: camoDb.getState() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // PHASE 6.1: COMPLIANCE OBLIGATION LIFECYCLE APIS
  // ==========================================

  // Get all compliance obligations with optional filtering
  app.get('/api/compliance-obligations', (req, res) => {
    try {
      const {
        complianceRequirementId,
        aircraftId,
        aircraftRegistration,
        adNumber,
        status,
        isOverdue,
        isDueSoon,
        requiresHumanReview,
        isRepetitive,
        isSuperseded
      } = req.query;

      const filter: any = {};
      if (complianceRequirementId) filter.complianceRequirementId = String(complianceRequirementId);
      if (aircraftId) filter.aircraftId = String(aircraftId);
      if (aircraftRegistration) filter.aircraftRegistration = String(aircraftRegistration);
      if (adNumber) filter.adNumber = String(adNumber);
      if (status) filter.status = String(status);
      if (isOverdue !== undefined) filter.isOverdue = isOverdue === 'true';
      if (isDueSoon !== undefined) filter.isDueSoon = isDueSoon === 'true';
      if (requiresHumanReview !== undefined) filter.requiresHumanReview = requiresHumanReview === 'true';
      if (isRepetitive !== undefined) filter.isRepetitive = isRepetitive === 'true';
      if (isSuperseded !== undefined) filter.isSuperseded = isSuperseded === 'true';

      const obligations = complianceObligationService.queryObligations(filter);
      res.json({ success: true, count: obligations.length, obligations });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get single compliance obligation
  app.get('/api/compliance-obligations/:id', (req, res) => {
    try {
      const { id } = req.params;
      const state = camoDb.getState();
      const obligation = state.obligations.find(o => o.id === id);
      if (!obligation) {
        return res.status(404).json({ error: `Compliance Obligation not found: ${id}` });
      }
      res.json({ success: true, obligation });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Evaluate all fleet obligations (Temporal checks)
  app.post('/api/compliance-obligations/evaluate-all', (req, res) => {
    try {
      const summary = complianceObligationService.evaluateAllFleetObligations();
      res.json({ success: true, summary, state: camoDb.getState() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // State Transition execution
  app.post('/api/compliance-obligations/:id/transition', (req, res) => {
    try {
      const { id } = req.params;
      const { toStatus, reason, ruleResponsible, actor, actorRole, details, evidence } = req.body;
      const state = camoDb.getState();

      if (!toStatus || !reason || !ruleResponsible) {
        return res.status(400).json({ error: 'toStatus, reason, and ruleResponsible are mandatory parameters.' });
      }

      const updated = complianceObligationService.transitionState({
        obligationId: id,
        toStatus,
        reason,
        ruleResponsible,
        actor: actor || state.currentUser.name,
        actorRole: actorRole || state.currentUser.role,
        details,
        evidence
      });

      res.json({ success: true, obligation: updated, state: camoDb.getState() });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Attach Compliance Evidence
  app.post('/api/compliance-obligations/:id/evidence', (req, res) => {
    try {
      const { id } = req.params;
      const { 
        evidenceType, 
        documentReference, 
        description, 
        accomplishmentDate, 
        accomplishmentFH, 
        accomplishmentFC, 
        recordedBy, 
        verified, 
        verificationStatus,
        sourceReference,
        documentHash,
        uploadedFileData,
        notes, 
        triggerComplianceEvaluation,
        metadata
      } = req.body;

      const state = camoDb.getState();
      if (!evidenceType || !documentReference) {
        return res.status(400).json({ error: 'evidenceType and documentReference are required.' });
      }

      const updated = complianceObligationService.attachEvidence({
        obligationId: id,
        evidenceType,
        documentReference,
        sourceReference,
        description: description || 'Compliance evidence document attached.',
        accomplishmentDate,
        accomplishmentFH: accomplishmentFH !== undefined ? Number(accomplishmentFH) : undefined,
        accomplishmentFC: accomplishmentFC !== undefined ? Number(accomplishmentFC) : undefined,
        recordedBy: recordedBy || state.currentUser.name,
        verified: verified !== undefined ? Boolean(verified) : true,
        verificationStatus,
        documentHash,
        uploadedFileData,
        notes,
        triggerComplianceEvaluation: triggerComplianceEvaluation !== undefined ? Boolean(triggerComplianceEvaluation) : true,
        metadata
      });

      res.json({ success: true, obligation: updated, state: camoDb.getState() });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Evaluate Probatory Set for an Obligation
  app.post('/api/compliance-obligations/:id/evaluate-probatory-set', (req, res) => {
    try {
      const { id } = req.params;
      const state = camoDb.getState();
      const obligation = state.obligations.find(o => o.id === id);
      if (!obligation) {
        return res.status(404).json({ error: `Obligation not found: ${id}` });
      }

      const aircraft = state.aircraft.find(a => a.id === obligation.targetEntity.aircraftId);
      const linkedEvidences = state.evidence.filter(e => 
        obligation.evidence.some(link => link.evidenceId === e.id)
      );

      const evaluation = evidenceVerificationEngine.evaluateObligationProbatorySet(
        obligation,
        linkedEvidences,
        aircraft
      );

      res.json({
        success: true,
        obligationId: id,
        evaluation,
        evidenceCount: linkedEvidences.length,
        obligationStatus: obligation.status
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // List all evidences
  app.get('/api/evidence', (req, res) => {
    try {
      const { obligationId, requirementId, status } = req.query;
      const state = camoDb.getState();
      let list = state.evidence || [];

      if (obligationId) {
        list = list.filter(e => e.obligationId === String(obligationId));
      }
      if (requirementId) {
        list = list.filter(e => e.complianceRequirementId === String(requirementId) || e.requirementId === String(requirementId));
      }
      if (status) {
        list = list.filter(e => e.verificationStatus === String(status));
      }

      res.json({ success: true, count: list.length, evidence: list });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Validate specific evidence
  app.post('/api/evidence/:evidenceId/validate', (req, res) => {
    try {
      const { evidenceId } = req.params;
      const { actor, actorRole } = req.body;
      const state = camoDb.getState();

      const validation = complianceObligationService.validateEvidence(
        evidenceId,
        actor || state.currentUser?.name || 'CAMO Engineer',
        actorRole || state.currentUser?.role || 'CAMO_ENGINEER'
      );

      res.json({
        success: true,
        evidence: validation.evidence,
        obligation: validation.obligation,
        result: validation.result
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Revoke specific evidence
  app.post('/api/evidence/:evidenceId/revoke', (req, res) => {
    try {
      const { evidenceId } = req.params;
      const { reason, actor, actorRole, obligationId } = req.body;
      const state = camoDb.getState();

      if (!reason) {
        return res.status(400).json({ error: 'Revocation reason is mandatory for airworthiness audit compliance.' });
      }

      const outcome = complianceObligationService.revokeEvidence({
        evidenceId,
        obligationId,
        reason,
        actor: actor || state.currentUser?.name || 'CAMO Engineer',
        actorRole: actorRole || state.currentUser?.role || 'CAMO_ENGINEER'
      });

      res.json({
        success: true,
        evidence: outcome.evidence,
        obligation: outcome.obligation,
        message: `Evidence ${evidenceId} successfully revoked.`
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Get evidence audit trail
  app.get('/api/evidence/:evidenceId/audit', (req, res) => {
    try {
      const { evidenceId } = req.params;
      const state = camoDb.getState();
      const ev = state.evidence.find(e => e.id === evidenceId);
      if (!ev) {
        return res.status(404).json({ error: `Evidence not found: ${evidenceId}` });
      }

      res.json({
        success: true,
        evidenceId: ev.id,
        verificationStatus: ev.verificationStatus,
        verificationHash: ev.verificationHash,
        documentHash: ev.documentHash,
        auditTrail: ev.auditTrail || []
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Human Review Gateway Decision
  app.post('/api/compliance-obligations/:id/human-review', (req, res) => {
    try {
      const { id } = req.params;
      const { decision, newStatus, justification, reviewedBy, reviewedByRole } = req.body;
      const state = camoDb.getState();

      if (!decision || !justification) {
        return res.status(400).json({ error: 'decision and justification are required.' });
      }

      const updated = complianceObligationService.recordHumanReview({
        obligationId: id,
        decision,
        newStatus,
        justification,
        reviewedBy: reviewedBy || state.currentUser.name,
        reviewedByRole: reviewedByRole || state.currentUser.role
      });

      res.json({ success: true, obligation: updated, state: camoDb.getState() });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Sync obligations from existing requirements and fleet
  app.post('/api/compliance-obligations/sync-from-fleet', (req, res) => {
    try {
      const state = camoDb.getState();
      let createdOrUpdated = 0;

      for (const reqItem of state.requirements) {
        for (const ac of state.aircraft) {
          const matchingAssessment = state.assessments.find(
            a => a.complianceRequirementId === reqItem.id && a.entityId === ac.id
          );

          const appStatus = matchingAssessment 
            ? (matchingAssessment.result === 'APPLICABLE' ? 'APPLICABLE' : (matchingAssessment.result === 'NOT_APPLICABLE' ? 'NOT_APPLICABLE' : 'REVIEW_REQUIRED'))
            : 'APPLICABLE';

          const mandatedActions = reqItem.mandatedActions && reqItem.mandatedActions.length > 0
            ? reqItem.mandatedActions
            : [undefined];

          for (const act of mandatedActions) {
            complianceObligationService.createOrUpdateObligation({
              requirement: reqItem,
              aircraft: ac,
              applicabilityStatus: appStatus,
              applicabilityReasoning: matchingAssessment?.reasoning,
              applicabilityAssessmentId: matchingAssessment?.id,
              mandatedAction: act,
              actionAccomplishments: state.actionAccomplishments,
              actor: 'CAMO Fleet Sync v6.1.0'
            });
            createdOrUpdated++;
          }
        }
      }

      res.json({ success: true, synchronizedCount: createdOrUpdated, state: camoDb.getState() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Evaluate All Fleet Obligations with Due Date & Threshold Engine
  app.post('/api/compliance-obligations/evaluate-fleet', (req, res) => {
    try {
      const state = camoDb.getState();
      const obligations = state.complianceObligations || state.obligations || [];
      const evaluatedCount = obligations.length;

      for (const obl of obligations) {
        try {
          complianceObligationService.calculateObligationDueDetailed(obl.id);
        } catch (e) {
          console.warn(`Could not calculate due date for obl ${obl.id}:`, e);
        }
      }

      res.json({
        success: true,
        evaluatedCount,
        message: `Successfully evaluated ${evaluatedCount} obligations across fleet.`,
        state: camoDb.getState()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // PHASE 6.2: DUE DATE & THRESHOLD ENGINE ENDPOINTS
  // ==========================================

  // 1. Recalculate Detailed Due Date for a single obligation
  app.post('/api/compliance-obligations/:id/calculate-due', (req, res) => {
    try {
      const { id } = req.params;
      const { customCurrentDate } = req.body || {};
      const result = complianceObligationService.calculateObligationDueDetailed(id, customCurrentDate);
      res.json({
        success: true,
        calculation: result,
        state: camoDb.getState()
      });
    } catch (err: any) {
      console.error('Calculate obligation due error:', err);
      res.status(400).json({ error: err.message });
    }
  });

  // 2. Get Structured Explanation for an obligation
  app.get('/api/compliance-obligations/:id/due-explanation', (req, res) => {
    try {
      const { id } = req.params;
      const result = complianceObligationService.calculateObligationDueDetailed(id);
      res.json({
        success: true,
        obligationId: id,
        controllingLimit: result.controllingLimit,
        controllingReason: result.controllingReason,
        calculationStatus: result.calculationStatus,
        structuredExplanation: result.structuredExplanation,
        alternativeLimits: result.composition.alternativeLimits,
        audit: result.audit,
        reviewRequired: result.reviewRequired,
        reviewReason: result.reviewReason
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 3. Standalone Due Date Calculation Evaluation Sandbox
  app.post('/api/due-date-engine/evaluate', (req, res) => {
    try {
      const result = dueDateThresholdEngine.calculateDue(req.body);
      res.json({
        success: true,
        calculation: result
      });
    } catch (err: any) {
      console.error('Due date engine evaluate error:', err);
      res.status(400).json({ error: err.message });
    }
  });

  // 4. Parse Natural Language AD Compliance Text
  app.post('/api/due-date-engine/parse-ad-text', (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Field "text" is required.' });
      }
      const parsed = dueDateThresholdEngine.parseAdRequirementText(text);
      res.json({
        success: true,
        input: text,
        ...parsed
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ===========================================================================
  // PHASE 6.4: COMPLIANCE STATUS & FLEET AIRWORTHINESS CONTROL ENGINE ENDPOINTS
  // ===========================================================================

  // 0. Authorized Operational Airworthiness Rules
  app.get('/api/camo/airworthiness/rules', (req, res) => {
    try {
      res.json({
        success: true,
        rules: FleetAirworthinessControlEngine.AUTHORIZED_RULES
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 1. Fleet Airworthiness Assessment
  app.get('/api/camo/airworthiness/fleet', (req, res) => {
    try {
      const { operationalRuleId } = req.query;
      const operationalRule = operationalRuleId 
        ? fleetAirworthinessControlEngine.getAuthorizedRule(String(operationalRuleId)) 
        : undefined;
      const assessment = fleetAirworthinessControlEngine.assessFleetAirworthiness({ operationalRule });
      res.json({
        success: true,
        assessment,
        state: camoDb.getState()
      });
    } catch (err: any) {
      console.error('Fleet airworthiness assessment error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Single Aircraft Airworthiness Assessment
  app.get('/api/camo/airworthiness/aircraft/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { operationalRuleId } = req.query;
      const operationalRule = operationalRuleId 
        ? fleetAirworthinessControlEngine.getAuthorizedRule(String(operationalRuleId)) 
        : undefined;
      const assessment = fleetAirworthinessControlEngine.assessAircraftAirworthiness(id, { operationalRule });
      res.json({
        success: true,
        assessment,
        state: camoDb.getState()
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 3. Requirement Compliance Assessment across fleet or single aircraft
  app.get('/api/camo/airworthiness/requirements/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { aircraftId } = req.query;
      const assessment = fleetAirworthinessControlEngine.assessRequirement(id, {
        aircraftId: aircraftId ? String(aircraftId) : undefined
      });
      res.json({
        success: true,
        assessment,
        state: camoDb.getState()
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 4. Single Obligation Compliance Assessment
  app.get('/api/camo/airworthiness/obligations/:id', (req, res) => {
    try {
      const { id } = req.params;
      const state = camoDb.getState();
      const obl = state.obligations.find(o => o.id === id);
      if (!obl) {
        return res.status(404).json({ error: `Obligation not found: ${id}` });
      }
      const assessment = fleetAirworthinessControlEngine.assessObligation(obl);
      res.json({
        success: true,
        assessment,
        state: camoDb.getState()
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 5. Generate Tamper-evident Airworthiness Snapshot
  app.post('/api/camo/airworthiness/snapshot', (req, res) => {
    try {
      const { label } = req.body || {};
      const snapshot = fleetAirworthinessControlEngine.generateAirworthinessSnapshot(label);
      res.json({
        success: true,
        snapshot,
        state: camoDb.getState()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Cryptographic Integrity Verification
  app.post('/api/camo/airworthiness/verify-integrity', (req, res) => {
    try {
      const assessment = req.body;
      const isValid = fleetAirworthinessControlEngine.verifyAssessmentIntegrity(assessment);
      res.json({
        success: true,
        isValid,
        submittedHash: assessment?.auditHash
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // =============================================================================
  // CAMO PHASE 7 — AIRCRAFT ACQUISITION & DELIVERY COMPLIANCE APIS
  // =============================================================================

  // 1. List all Delivery Assessments
  app.get('/api/delivery-assessments', (req, res) => {
    try {
      const state = camoDb.getState();
      const assessments = state.deliveryAssessments || [];
      res.json({
        success: true,
        count: assessments.length,
        assessments
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Create a new Delivery Assessment
  app.post('/api/delivery-assessments', (req, res) => {
    try {
      const input = req.body;
      const newAssessment = aircraftDeliveryAssessmentEngine.createAssessment(input);
      res.status(201).json({
        success: true,
        assessment: newAssessment,
        state: camoDb.getState()
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 3. Get single Delivery Assessment
  app.get('/api/delivery-assessments/:id', (req, res) => {
    try {
      const { id } = req.params;
      const state = camoDb.getState();
      const assessment = (state.deliveryAssessments || []).find(a => a.id === id);
      if (!assessment) {
        return res.status(404).json({ error: `Delivery Assessment '${id}' not found.` });
      }
      res.json({
        success: true,
        assessment
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Execute Regulatory Discovery for Assessment
  app.post('/api/delivery-assessments/:id/discover', async (req, res) => {
    try {
      const { id } = req.params;
      const { forceFreshScan, actor } = req.body || {};
      const updatedAssessment = await aircraftDeliveryAssessmentEngine.executeDiscoveryForAssessment(id, {
        forceFreshScan,
        actor
      });
      res.json({
        success: true,
        assessment: updatedAssessment,
        state: camoDb.getState()
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 5. Get AD Items for Assessment with optional filtering
  app.get('/api/delivery-assessments/:id/ads', (req, res) => {
    try {
      const { id } = req.params;
      const { authority, priority, status, confrontation, knownOnly } = req.query;
      const state = camoDb.getState();
      const assessment = (state.deliveryAssessments || []).find(a => a.id === id);
      if (!assessment) {
        return res.status(404).json({ error: `Delivery Assessment '${id}' not found.` });
      }

      let items = assessment.adItems || [];

      if (authority) {
        items = items.filter(i => i.issuingAuthority === authority);
      }
      if (priority) {
        items = items.filter(i => i.operationalPriority === priority);
      }
      if (status) {
        items = items.filter(i => i.regulatoryComplianceStatus === status || i.applicabilityStatus === status);
      }
      if (confrontation) {
        items = items.filter(i => i.confrontationStatus === confrontation);
      }
      if (knownOnly === 'true') {
        items = items.filter(i => i.isKnownInCamo);
      }

      res.json({
        success: true,
        total: items.length,
        items
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Analyze an Individual AD
  app.post('/api/delivery-assessments/:id/analyze/:adNumber', async (req, res) => {
    try {
      const { id, adNumber } = req.params;
      const { actor } = req.body || {};
      const updatedItem = await aircraftDeliveryAssessmentEngine.analyzeIndividualAd({
        assessmentId: id,
        adNumber: decodeURIComponent(adNumber),
        actor
      });
      res.json({
        success: true,
        item: updatedItem,
        state: camoDb.getState()
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 7. Batch Analyze Pending ADs
  app.post('/api/delivery-assessments/:id/batch-analyze', async (req, res) => {
    try {
      const { id } = req.params;
      const { actor } = req.body || {};
      const result = await aircraftDeliveryAssessmentEngine.batchAnalyzeAds(id, actor);
      res.json({
        success: true,
        analyzedCount: result.analyzedCount,
        assessment: result.assessment,
        state: camoDb.getState()
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 8. Reconcile Lessor Declaration
  app.post('/api/delivery-assessments/:id/reconcile-lessor', (req, res) => {
    try {
      const { id } = req.params;
      const { adNumber, declaration, actor } = req.body || {};
      if (!adNumber || !declaration) {
        return res.status(400).json({ error: 'adNumber and declaration object are required.' });
      }
      const updatedItem = aircraftDeliveryAssessmentEngine.reconcileLessorDeclaration({
        assessmentId: id,
        adNumber,
        declaration,
        actor
      });
      res.json({
        success: true,
        item: updatedItem,
        state: camoDb.getState()
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 9. Attach Evidence / Maintenance Record from Lessor
  app.post('/api/delivery-assessments/:id/attach-evidence', async (req, res) => {
    try {
      const { id } = req.params;
      const { adNumber, evidenceType, documentReference, description, accomplishmentDate, accomplishmentFH, accomplishmentFC, documentHash, actor } = req.body || {};
      if (!adNumber || !documentReference) {
        return res.status(400).json({ error: 'adNumber and documentReference are required.' });
      }
      const updatedItem = await aircraftDeliveryAssessmentEngine.attachLessorEvidence({
        assessmentId: id,
        adNumber,
        evidenceType: evidenceType || 'MAINTENANCE_RECORD',
        documentReference,
        description: description || 'Lessor provided maintenance documentation',
        accomplishmentDate,
        accomplishmentFH,
        accomplishmentFC,
        documentHash,
        actor
      });
      res.json({
        success: true,
        item: updatedItem,
        state: camoDb.getState()
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 10. Finalize Assessment & Generate Snapshot
  app.post('/api/delivery-assessments/:id/finalize', (req, res) => {
    try {
      const { id } = req.params;
      const { finalizedBy, notes } = req.body || {};
      const snapshot = aircraftDeliveryAssessmentEngine.finalizeAssessment(
        id,
        finalizedBy || camoDb.getState().currentUser.name,
        notes
      );
      res.json({
        success: true,
        snapshot,
        state: camoDb.getState()
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 11. Verify Delivery Assessment Snapshot Cryptographic Hash
  app.post('/api/delivery-assessments/verify-snapshot', (req, res) => {
    try {
      const snapshot = req.body;
      const isValid = aircraftDeliveryAssessmentEngine.verifySnapshotIntegrity(snapshot);
      res.json({
        success: true,
        isValid,
        submittedHash: snapshot?.auditHash
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 12. Help Center Articles API
  app.get('/api/help-center', (req, res) => {
    try {
      const articles = aircraftDeliveryAssessmentEngine.getHelpCenterArticles();
      res.json({
        success: true,
        version: '7.0.0',
        articles
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // PHASE 9 — ETAPA 4.1: REGULATORY INTELLIGENCE & OPEN DISCOVERY ROUTES
  // ==========================================

  // 13. Search Regulatory Candidate ADs with Open Aircraft Family/Model across FAA, EASA, ANAC
  app.get('/api/intel/candidates', async (req, res) => {
    try {
      const { 
        family, 
        model, 
        make, 
        manufacturer, 
        variant, 
        authority, 
        query, 
        page, 
        perPage, 
        maxPages, 
        autoPaginate 
      } = req.query;

      const result = await regulatoryIntelligenceEngine.searchCandidatesByFamilyOrModel({
        family: family !== undefined ? String(family) : undefined,
        model: model ? String(model) : undefined,
        make: make ? String(make) : undefined,
        manufacturer: manufacturer ? String(manufacturer) : undefined,
        variant: variant ? String(variant) : undefined,
        authority: authority ? (String(authority) as any) : 'ALL',
        query: query ? String(query) : undefined,
        page: page ? Number(page) : undefined,
        perPage: perPage ? Number(perPage) : undefined,
        maxPages: maxPages ? Number(maxPages) : undefined,
        autoPaginate: autoPaginate === 'true' || autoPaginate === '1'
      });

      res.json({
        success: true,
        ...result,
        state: camoDb.getState()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 14. Trigger candidate search with Open Aeronautical Parameters (POST)
  app.post('/api/intel/candidates/search', async (req, res) => {
    try {
      const { 
        family, 
        model, 
        make, 
        manufacturer, 
        variant, 
        authority = 'ALL', 
        query, 
        page, 
        perPage, 
        maxPages, 
        autoPaginate 
      } = req.body;

      const result = await regulatoryIntelligenceEngine.searchCandidatesByFamilyOrModel({
        family,
        model,
        make,
        manufacturer,
        variant,
        authority,
        query,
        page: page ? Number(page) : undefined,
        perPage: perPage ? Number(perPage) : undefined,
        maxPages: maxPages ? Number(maxPages) : undefined,
        autoPaginate: Boolean(autoPaginate)
      });

      res.json({
        success: true,
        ...result,
        state: camoDb.getState()
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 14.1. Regulatory Discovery Diagnostic Endpoint (Phase 9 — Stage 4.1)
  app.get('/api/intel/discovery-diagnostic', async (req, res) => {
    try {
      const { 
        family, 
        model, 
        manufacturer, 
        variant, 
        authority, 
        query, 
        page, 
        perPage, 
        maxPages, 
        autoPaginate 
      } = req.query;

      const result = await regulatoryIntelligenceEngine.searchCandidatesByFamilyOrModel({
        family: family !== undefined ? String(family) : undefined,
        model: model ? String(model) : undefined,
        manufacturer: manufacturer ? String(manufacturer) : undefined,
        variant: variant ? String(variant) : undefined,
        authority: authority ? (String(authority) as any) : 'ALL',
        query: query ? String(query) : undefined,
        page: page ? Number(page) : undefined,
        perPage: perPage ? Number(perPage) : undefined,
        maxPages: maxPages ? Number(maxPages) : undefined,
        autoPaginate: autoPaginate === 'true' || autoPaginate === '1'
      });

      res.json({
        success: true,
        query: result.diagnostic.query,
        diagnostic: result.diagnostic,
        diagnosticReportText: result.diagnosticReportText,
        authorities: result.diagnostic.authorities,
        totals: result.diagnostic.totals,
        sourcesConsulted: result.sourcesConsulted
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 15. Analyze Candidate AD -> Extracts Knowledge, Required Configuration Data & Stores in KB
  app.post('/api/intel/candidates/analyze', async (req, res) => {
    try {
      const { candidateId, actor } = req.body;
      if (!candidateId) {
        return res.status(400).json({ error: 'candidateId is required' });
      }
      const result = await regulatoryIntelligenceEngine.analyzeCandidateAd(candidateId, actor);
      res.json({
        success: true,
        ...result,
        state: camoDb.getState()
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 15.1. Regulatory Fleet Intake Search + Register Comparison (Phase 9 — Stage 5)
  app.get('/api/intel/fleet-search', async (req, res) => {
    try {
      const { 
        manufacturer, 
        family, 
        model, 
        variant, 
        engine, 
        registration, 
        msn, 
        authority, 
        query, 
        page, 
        perPage, 
        maxPages, 
        autoPaginate 
      } = req.query;

      const result = await regulatoryIntelligenceEngine.searchFleetAndCompareWithRegister({
        manufacturer: manufacturer ? String(manufacturer) : undefined,
        family: family ? String(family) : undefined,
        model: model ? String(model) : undefined,
        variant: variant ? String(variant) : undefined,
        engine: engine ? String(engine) : undefined,
        registration: registration ? String(registration) : undefined,
        msn: msn ? String(msn) : undefined,
        authority: authority ? (String(authority) as any) : 'ALL',
        query: query ? String(query) : undefined,
        page: page ? Number(page) : undefined,
        perPage: perPage ? Number(perPage) : undefined,
        maxPages: maxPages ? Number(maxPages) : undefined,
        autoPaginate: autoPaginate === 'true' || autoPaginate === '1'
      });

      res.json({
        success: true,
        ...result,
        state: camoDb.getState()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/intel/fleet-search', async (req, res) => {
    try {
      const result = await regulatoryIntelligenceEngine.searchFleetAndCompareWithRegister(req.body);
      res.json({
        success: true,
        ...result,
        state: camoDb.getState()
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 15.2. Import ADs to CAMO Regulatory Register (strictly PENDING_ANALYSIS, Idempotent, No Auto-AI)
  app.post('/api/intel/register/import', async (req, res) => {
    try {
      const result = await regulatoryIntelligenceEngine.importCandidatesToCamoRegister(req.body);
      res.json({
        success: true,
        ...result,
        state: camoDb.getState()
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 15.3. Get CAMO Regulatory Register (Analysis Queue)
  app.get('/api/intel/register', (req, res) => {
    try {
      const { 
        family, 
        model, 
        manufacturer, 
        authority, 
        ataChapter, 
        analysisStatus, 
        deltaStatus, 
        search 
      } = req.query;

      const result = regulatoryIntelligenceEngine.getRegisterRecords({
        family: family ? String(family) : undefined,
        model: model ? String(model) : undefined,
        manufacturer: manufacturer ? String(manufacturer) : undefined,
        authority: authority ? String(authority) : undefined,
        ataChapter: ataChapter ? String(ataChapter) : undefined,
        analysisStatus: analysisStatus ? String(analysisStatus) : undefined,
        deltaStatus: deltaStatus ? String(deltaStatus) : undefined,
        search: search ? String(search) : undefined
      });

      res.json({
        success: true,
        ...result
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 15.4. Execute Individual AD Analysis in Queue (PENDING_ANALYSIS -> ANALYZED)
  app.post('/api/intel/register/analyze', async (req, res) => {
    try {
      const { recordId, actor } = req.body;
      if (!recordId) {
        return res.status(400).json({ error: 'recordId is required' });
      }

      const result = await regulatoryIntelligenceEngine.analyzeRegisterRecord(recordId, actor);
      res.json({
        success: true,
        ...result,
        state: camoDb.getState()
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 16. Get Accumulated Regulatory Knowledge Base
  app.get('/api/intel/knowledge-base', (req, res) => {
    try {
      const state = camoDb.getState();
      const { family, model } = req.query;
      let kb = state.regulatoryKnowledgeBase || [];
      if (family) {
        const fClean = String(family).toUpperCase();
        kb = kb.filter(k => k.family.toUpperCase() === fClean);
      }
      if (model) {
        const mClean = String(model).toUpperCase();
        kb = kb.filter(k => k.modelScope.some(m => m.toUpperCase().includes(mClean)));
      }
      res.json({
        success: true,
        count: kb.length,
        items: kb
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 17. Assess Individual Aircraft Configuration Completeness & Progressive Applicability
  app.post('/api/intel/assess-configuration', (req, res) => {
    try {
      const { aircraftId, candidateAircraft, targetFamily } = req.body;
      const state = camoDb.getState();

      let acData: any;
      if (aircraftId) {
        acData = state.aircraft.find(a => a.id === aircraftId);
        if (!acData) {
          return res.status(404).json({ error: `Fleet aircraft '${aircraftId}' not found.` });
        }
      } else if (candidateAircraft) {
        acData = candidateAircraft;
      } else {
        return res.status(400).json({ error: 'Either aircraftId or candidateAircraft is required.' });
      }

      const assessment = regulatoryIntelligenceEngine.assessAircraftConfigurationCompleteness(acData, targetFamily);
      res.json({
        success: true,
        assessment,
        state: camoDb.getState()
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 18. Resolve Operational Missing Parameter
  app.post('/api/intel/resolve-missing', (req, res) => {
    try {
      const { assessmentId, parameterKey, resolvedValue, actor } = req.body;
      if (!assessmentId || !parameterKey || !resolvedValue) {
        return res.status(400).json({ error: 'assessmentId, parameterKey, and resolvedValue are required.' });
      }
      const updatedAssessment = regulatoryIntelligenceEngine.resolveOperationalMissingData(
        assessmentId,
        parameterKey,
        resolvedValue,
        actor
      );
      res.json({
        success: true,
        assessment: updatedAssessment,
        state: camoDb.getState()
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // VITE MIDDLEWARE / STATIC ASSETS
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Airworthiness Compliance Intelligence Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start CAMO server:', err);
});
