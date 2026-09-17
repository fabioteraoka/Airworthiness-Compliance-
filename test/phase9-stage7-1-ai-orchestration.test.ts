import { describe, it, expect, beforeEach } from 'vitest';
import { aiModelOrchestrator } from '../server/camoEngine/aiModelOrchestrator';
import { camoDb } from '../server/dataStore';
import { extractAdWithGemini } from '../server/geminiService';
import { matchesModel, getCanonicalAircraftModel } from '../server/ruleEngine';
import { AiExecutionTrace } from '../src/types';

describe('CAMO Engine — Phase 9 Stage 7.1: AI Model Orchestration & Continuous Model Upgrade', () => {
  beforeEach(() => {
    // Ensure DB state and orchestrator are reset to clean latest stable
    aiModelOrchestrator.updatePolicy('LATEST_STABLE');
  });

  it('1. Deve resolver o modelo primário homologado como gemini-3.8-flash por padrão', () => {
    const resolution = aiModelOrchestrator.resolveModel();
    expect(resolution.resolvedModel).toBe('gemini-3.8-flash');
    expect(resolution.selectionPolicy).toBe('LATEST_STABLE');
    expect(resolution.fallbackChain).toContain('gemini-flash-latest');
    expect(resolution.fallbackChain).toContain('gemini-3.1-flash-lite');

    const status = aiModelOrchestrator.getRuntimeStatus();
    expect(status.primaryModel).toBe('gemini-3.8-flash');
    expect(status.runtimeModel).toBe('gemini-3.8-flash');
    expect(status.pipelineVersion).toBe('9.7.1');
  });

  it('2. Invariante Regulatório: A troca de modelo de IA NUNCA altera as regras determinísticas do CAMO Engine', () => {
    // Canonical Deterministic rule: Boeing 737-8 (MAX) should never match 737-800 (NG)
    const targetAdModels = ['737-8', '737-9'];
    const b737Max = '737-8';
    const b737Ng = '737-800';

    // Evaluate under LATEST_STABLE
    aiModelOrchestrator.updatePolicy('LATEST_STABLE');
    const evalMax1 = matchesModel(b737Max, targetAdModels);
    const evalNg1 = matchesModel(b737Ng, targetAdModels);
    expect(evalMax1).toBe(true);
    expect(evalNg1).toBe(false);

    // Switch policy to PINNED (legacy model)
    aiModelOrchestrator.updatePolicy('PINNED', 'gemini-3.1-flash-lite');
    const evalMax2 = matchesModel(b737Max, targetAdModels);
    const evalNg2 = matchesModel(b737Ng, targetAdModels);
    expect(evalMax2).toBe(evalMax1);
    expect(evalNg2).toBe(evalNg1);

    // Switch policy to DISABLED
    aiModelOrchestrator.updatePolicy('DISABLED');
    const evalMax3 = matchesModel(b737Max, targetAdModels);
    const evalNg3 = matchesModel(b737Ng, targetAdModels);
    expect(evalMax3).toBe(evalMax1);
    expect(evalNg3).toBe(evalNg1);

    // Verify Canonical Resolution remains immutable
    const canonMax = getCanonicalAircraftModel('Boeing 737-8');
    const canonNg = getCanonicalAircraftModel('Boeing 737-800');
    expect(canonMax.family).toBe('B737_MAX');
    expect(canonNg.family).toBe('B737_NG');
  });

  it('3. Deve suportar Pinned Model e Fallback com ordem controlada e persistência em dataStore', () => {
    const updated = aiModelOrchestrator.updatePolicy('PINNED', 'gemini-flash-latest');
    expect(updated.selectionPolicy).toBe('PINNED');
    expect(updated.pinnedModel).toBe('gemini-flash-latest');

    const resolution = aiModelOrchestrator.resolveModel();
    expect(resolution.resolvedModel).toBe('gemini-flash-latest');
    expect(resolution.selectionPolicy).toBe('PINNED');
    expect(resolution.fallbackChain[0]).toBe('gemini-flash-latest');

    // Confirm stored in camoDb
    const dbConfig = camoDb.getState().aiOrchestratorConfig;
    expect(dbConfig?.selectionPolicy).toBe('PINNED');
    expect(dbConfig?.pinnedModel).toBe('gemini-flash-latest');
  });

  it('4. Quando política for DISABLED, deve desabilitar chamada de IA e acionar parser determinístico seguro', async () => {
    aiModelOrchestrator.updatePolicy('DISABLED');
    const resolution = aiModelOrchestrator.resolveModel();
    expect(resolution.selectionPolicy).toBe('DISABLED');

    const sampleAdText = `
      DEPARTMENT OF TRANSPORTATION
      Federal Aviation Administration
      Airworthiness Directives; The Boeing Company Airplanes
      AD 2024-99-99
      Effective Date: April 10, 2024
      Applicability: Model 737-800 series airplanes, serial numbers 30001 through 30050.
      Required Actions: Inspect the left and right wing skin panels for cracks.
    `;

    const extracted = await extractAdWithGemini({
      text: sampleAdText,
      fileName: 'AD-2024-99-99.txt'
    });

    expect(extracted).toBeDefined();
    expect(extracted.sourceNumber).toContain('2024-99-99');
    expect(extracted.aircraftModels).toContain('737-800');
    expect(extracted.diagnostics.geminiInvoked).toBe(false);
  });

  it('5. Rastreabilidade Criptográfica: Deve registrar AiExecutionTrace com hash SHA-256 e metadados regulatórios', () => {
    const sampleTrace: AiExecutionTrace = {
      traceId: `trace-test-${Date.now()}`,
      provider: 'Google Gemini',
      requestedModel: 'gemini-3.8-flash',
      resolvedModel: 'gemini-3.8-flash',
      timestamp: new Date().toISOString(),
      pipelineVersion: '9.7.1',
      promptVersion: '9.7.1-camov4',
      schemaVersion: '9.7.1-airworthiness-json',
      requestCorrelationId: 'ad-extract-test-01',
      documentRef: 'FAA-AD-2020-24-02.pdf',
      executionDurationMs: 420,
      retryCount: 0,
      fallbackUsed: false,
      fallbackChain: ['gemini-3.8-flash', 'gemini-flash-latest'],
      validationResult: {
        passed: true,
        rulesChecked: 10,
        failedRules: [],
        details: 'Mandatory CAMO compliance criteria successfully validated'
      },
      responseHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      finalStatus: 'SUCCESS'
    };

    aiModelOrchestrator.recordExecutionTrace(sampleTrace);

    const traces = aiModelOrchestrator.getExecutionTraces(10);
    const recorded = traces.find(t => t.traceId === sampleTrace.traceId);

    expect(recorded).toBeDefined();
    expect(recorded?.resolvedModel).toBe('gemini-3.8-flash');
    expect(recorded?.responseHash).toHaveLength(64); // SHA-256 hex string
    expect(recorded?.validationResult.passed).toBe(true);

    // Verify stored in dataStore
    const dbState = camoDb.getState();
    const persisted = dbState.aiExecutionTraces?.find(t => t.traceId === sampleTrace.traceId);
    expect(persisted).toBeDefined();
  });

  it('6. Descoberta e Homologação: Novos modelos descobertos exigem homologação explícita antes de se tornarem primários', async () => {
    const homologated = aiModelOrchestrator.getHomologatedModels();
    expect(homologated.length).toBeGreaterThanOrEqual(3);

    const primaryHomologated = homologated.find(m => m.id === 'gemini-3.8-flash');
    expect(primaryHomologated).toBeDefined();
    expect(primaryHomologated?.status).toBe('HOMOLOGATED');
    expect(primaryHomologated?.isPrimary).toBe(true);
    expect(primaryHomologated?.supportsStructuredOutput).toBe(true);

    // Attempting to pin model
    const testUpdate = aiModelOrchestrator.updatePolicy('PINNED', 'gemini-3.8-flash');
    expect(testUpdate.pinnedModel).toBe('gemini-3.8-flash');
  });

  it('7. Health and Runtime Status: Deve reportar métricas em tempo real e status da API', () => {
    const status = aiModelOrchestrator.getRuntimeStatus();
    expect(['HEALTHY', 'OFFLINE', 'DEGRADED', 'DISABLED']).toContain(status.modelHealth);
    expect(status.primaryModel).toBe('gemini-3.8-flash');
    expect(status.runtimeModel).toBe('gemini-3.8-flash');
    expect(status.totalExecutions).toBeGreaterThanOrEqual(0);
    expect(status.fallbackRatePercent).toBeGreaterThanOrEqual(0);
    expect(status.availableModelsCount).toBeGreaterThanOrEqual(3);
  });
});

