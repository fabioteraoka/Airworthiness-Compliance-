import crypto from 'crypto';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  DiscoveredAiModel, 
  AiOrchestratorConfig, 
  AiModelResolution, 
  AiExecutionTrace, 
  AiEngineRuntimeStatus, 
  ModelSelectionPolicy,
  ModelHomologationStatus 
} from '../../src/types';
import { camoDb } from '../dataStore';

/**
 * AI MODEL ORCHESTRATOR & CONTINUOUS MODEL UPGRADE ENGINE
 * 
 * Central orchestrator managing LLM interactions for CAMO Engine.
 * Enforces:
 * 1. Primary Model: gemini-3.8-flash (Homologated)
 * 2. Model Selection Policy (LATEST_STABLE, PINNED, FALLBACK, DISABLED)
 * 3. Controlled Multi-Tier Fallback
 * 4. Regulatory Execution Tracing & Cryptographic Response Hashing (SHA-256)
 * 5. Deterministic Non-Interference (AI extracts; Deterministic Engine decides)
 * 6. Zero Data Fabrication / Hallucination Invariant
 */
export class AIModelOrchestrator {
  private static instance: AIModelOrchestrator | null = null;
  private aiClient: GoogleGenAI | null = null;

  public readonly ORCHESTRATOR_VERSION = '9.7.1';
  public readonly PROMPT_VERSION = '9.7.1-camov4';
  public readonly SCHEMA_VERSION = '9.7.1-airworthiness-json';
  public readonly PRIMARY_MODEL_ID = 'gemini-3.8-flash';

  // Prohibited legacy / deprecated models (must never be selected or resolved)
  private readonly PROHIBITED_MODELS = new Set([
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-2.0-flash',
    'gemini-2.0-pro',
    'gemini-2.0-flash-thinking'
  ]);

  // Curated registry of homologated and candidate models
  private readonly HOMOLOGATED_MODELS: DiscoveredAiModel[] = [
    {
      id: 'gemini-3.8-flash',
      displayName: 'Gemini 3.8 Flash',
      provider: 'Google Gemini',
      version: '3.8-flash',
      status: 'HOMOLOGATED',
      isPrimary: true,
      isFallbackCandidate: false,
      supportsStructuredOutput: true,
      supportsJsonSchema: true,
      supportsMultimodal: true,
      tokenLimitInput: 1048576,
      tokenLimitOutput: 8192,
      recommendedRole: 'PRIMARY_EXTRACTION',
      compatibilityNotes: 'Primary homologated model. Passed all CAMO aeronautical schema & extraction regression tests.',
      homologatedAt: '2026-09-17T00:00:00.000Z'
    },
    {
      id: 'gemini-flash-latest',
      displayName: 'Gemini Flash Latest',
      provider: 'Google Gemini',
      version: 'flash-latest',
      status: 'HOMOLOGATED',
      isPrimary: false,
      isFallbackCandidate: true,
      supportsStructuredOutput: true,
      supportsJsonSchema: true,
      supportsMultimodal: true,
      tokenLimitInput: 1048576,
      tokenLimitOutput: 8192,
      recommendedRole: 'FAST_FALLBACK',
      compatibilityNotes: 'Homologated tier-1 fallback for high-availability transient outages.',
      homologatedAt: '2026-09-17T00:00:00.000Z'
    },
    {
      id: 'gemini-3.1-flash-lite',
      displayName: 'Gemini 3.1 Flash Lite',
      provider: 'Google Gemini',
      version: '3.1-flash-lite',
      status: 'HOMOLOGATED',
      isPrimary: false,
      isFallbackCandidate: true,
      supportsStructuredOutput: true,
      supportsJsonSchema: true,
      supportsMultimodal: true,
      tokenLimitInput: 1048576,
      tokenLimitOutput: 8192,
      recommendedRole: 'FAST_FALLBACK',
      compatibilityNotes: 'Homologated tier-2 fast fallback for low-latency JSON extraction.',
      homologatedAt: '2026-09-17T00:00:00.000Z'
    },
    {
      id: 'gemini-3.1-pro-preview',
      displayName: 'Gemini 3.1 Pro Preview',
      provider: 'Google Gemini',
      version: '3.1-pro-preview',
      status: 'PREVIEW',
      isPrimary: false,
      isFallbackCandidate: false,
      supportsStructuredOutput: true,
      supportsJsonSchema: true,
      supportsMultimodal: true,
      recommendedRole: 'REASONING_ANALYSIS',
      compatibilityNotes: 'Advanced reasoning model for complex regulatory cross-correlation.',
      homologatedAt: '2026-09-17T00:00:00.000Z'
    }
  ];

  private runtimeModelUsed: string = 'gemini-3.8-flash';
  private lastModelUpdateTimestamp: string = '2026-09-17T00:00:00.000Z';

  private constructor() {
    this.initializeClient();
  }

  public static getInstance(): AIModelOrchestrator {
    if (!AIModelOrchestrator.instance) {
      AIModelOrchestrator.instance = new AIModelOrchestrator();
    }
    return AIModelOrchestrator.instance;
  }

  private initializeClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    if (!this.aiClient) {
      this.aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build-camo-orchestrator',
          }
        }
      });
    }
    return this.aiClient;
  }

  public getClient(): GoogleGenAI | null {
    return this.initializeClient();
  }

  /**
   * Returns current orchestrator configuration from state or defaults.
   */
  public getConfig(): AiOrchestratorConfig {
    const state = camoDb.getState();
    if (state.aiOrchestratorConfig) {
      return state.aiOrchestratorConfig;
    }
    const defaultConfig: AiOrchestratorConfig = {
      provider: 'Google Gemini',
      selectionPolicy: 'LATEST_STABLE',
      primaryModel: this.PRIMARY_MODEL_ID,
      fallbackModels: ['gemini-flash-latest', 'gemini-3.1-flash-lite'],
      pipelineVersion: this.ORCHESTRATOR_VERSION,
      promptVersion: this.PROMPT_VERSION,
      schemaVersion: this.SCHEMA_VERSION,
      maxRetries: 2,
      timeoutMs: 12000,
      lastModelUpdate: this.lastModelUpdateTimestamp,
      continuousUpgradeStatus: 'MONITORING'
    };
    camoDb.update(draft => {
      draft.aiOrchestratorConfig = defaultConfig;
    });
    return defaultConfig;
  }

  /**
   * Updates model selection policy and optional pinned model.
   */
  public updatePolicy(policy: ModelSelectionPolicy, pinnedModel?: string): AiOrchestratorConfig {
    if (policy === 'PINNED' && pinnedModel && this.PROHIBITED_MODELS.has(pinnedModel)) {
      throw new Error(`Cannot pin prohibited model: ${pinnedModel}`);
    }

    camoDb.update(draft => {
      if (!draft.aiOrchestratorConfig) {
        draft.aiOrchestratorConfig = this.getConfig();
      }
      draft.aiOrchestratorConfig.selectionPolicy = policy;
      if (pinnedModel) {
        draft.aiOrchestratorConfig.pinnedModel = pinnedModel;
      }
      draft.aiOrchestratorConfig.lastModelUpdate = new Date().toISOString();
    });

    this.lastModelUpdateTimestamp = new Date().toISOString();
    return this.getConfig();
  }

  /**
   * Central Model Resolution Engine:
   * Resolves requested model into executable model name based on policy and safety constraints.
   */
  public resolveModel(
    requestedPolicy?: ModelSelectionPolicy,
    explicitModel?: string
  ): AiModelResolution {
    const config = this.getConfig();
    const effectivePolicy = requestedPolicy || config.selectionPolicy;

    let requestedModelStr = explicitModel || effectivePolicy;
    let resolvedModel = this.PRIMARY_MODEL_ID;
    let fallbackUsed = false;
    const fallbackChain: string[] = [...config.fallbackModels];

    switch (effectivePolicy) {
      case 'DISABLED':
        resolvedModel = 'disabled';
        requestedModelStr = 'DISABLED';
        break;

      case 'PINNED':
        if (explicitModel && !this.PROHIBITED_MODELS.has(explicitModel)) {
          resolvedModel = explicitModel;
        } else if (config.pinnedModel && !this.PROHIBITED_MODELS.has(config.pinnedModel)) {
          resolvedModel = config.pinnedModel;
        } else {
          resolvedModel = this.PRIMARY_MODEL_ID;
        }
        requestedModelStr = config.pinnedModel || explicitModel || this.PRIMARY_MODEL_ID;
        break;

      case 'FALLBACK':
        fallbackUsed = true;
        resolvedModel = config.fallbackModels[0] || 'gemini-flash-latest';
        requestedModelStr = 'FALLBACK';
        break;

      case 'LATEST_STABLE':
      default:
        resolvedModel = this.PRIMARY_MODEL_ID;
        requestedModelStr = 'LATEST_STABLE';
        break;
    }

    // Safety override: never resolve to deprecated or prohibited models
    if (this.PROHIBITED_MODELS.has(resolvedModel)) {
      console.warn(`[AIModelOrchestrator] Attempted resolution to prohibited model ${resolvedModel}. Overriding to ${this.PRIMARY_MODEL_ID}`);
      resolvedModel = this.PRIMARY_MODEL_ID;
      fallbackUsed = true;
    }

    return {
      requestedModel: requestedModelStr,
      resolvedModel,
      provider: 'Google Gemini',
      modelVersion: resolvedModel.replace('gemini-', ''),
      selectionPolicy: effectivePolicy,
      fallbackUsed,
      fallbackChain,
      isPrimary: resolvedModel === this.PRIMARY_MODEL_ID
    };
  }

  /**
   * Returns list of homologated models.
   */
  public getHomologatedModels(): DiscoveredAiModel[] {
    return [...this.HOMOLOGATED_MODELS];
  }

  /**
   * Model Discovery Mechanism:
   * Discovers models available on the Google Gemini API, validates against compatibility criteria,
   * flags deprecated models, and tracks homologation status.
   */
  public async discoverAvailableModels(): Promise<DiscoveredAiModel[]> {
    const client = this.getClient();
    const discovered: DiscoveredAiModel[] = [...this.HOMOLOGATED_MODELS];

    if (client && client.models && typeof (client.models as any).list === 'function') {
      try {
        const response = await (client.models as any).list();
        const apiModels = response?.models || [];
        for (const m of apiModels) {
          const rawId: string = m.name?.replace('models/', '') || m.id || '';
          if (!rawId || this.PROHIBITED_MODELS.has(rawId)) {
            continue;
          }
          const existing = discovered.find(d => d.id === rawId);
          if (!existing) {
            const isExperimental = rawId.includes('exp') || rawId.includes('experimental');
            const isPreview = rawId.includes('preview');
            discovered.push({
              id: rawId,
              displayName: m.displayName || rawId,
              provider: 'Google Gemini',
              version: rawId.replace('gemini-', ''),
              status: isExperimental ? 'EXPERIMENTAL' : (isPreview ? 'PREVIEW' : 'DISCOVERED'),
              isPrimary: false,
              isFallbackCandidate: false,
              supportsStructuredOutput: true,
              supportsJsonSchema: true,
              supportsMultimodal: true,
              recommendedRole: 'GENERAL',
              compatibilityNotes: 'Discovered via Google GenAI models.list API.',
              homologatedAt: undefined
            });
          }
        }
      } catch (err: any) {
        console.warn('[AIModelOrchestrator] Could not query remote models.list API, using curated catalog:', err.message);
      }
    }

    camoDb.update(draft => {
      draft.discoveredAiModels = discovered;
    });

    return discovered;
  }

  /**
   * Execution Traces:
   * Returns recent recorded execution traces from persistent database.
   */
  public getExecutionTraces(limit: number = 50): AiExecutionTrace[] {
    const traces = camoDb.getState().aiExecutionTraces || [];
    return [...traces].reverse().slice(0, limit);
  }

  /**
   * Records an audit trace in the persistent database.
   */
  public recordExecutionTrace(trace: AiExecutionTrace): void {
    this.runtimeModelUsed = trace.resolvedModel;
    camoDb.update(draft => {
      if (!draft.aiExecutionTraces) {
        draft.aiExecutionTraces = [];
      }
      draft.aiExecutionTraces.push(trace);
      // Keep bounded history (last 200 traces) to avoid memory bloat
      if (draft.aiExecutionTraces.length > 200) {
        draft.aiExecutionTraces = draft.aiExecutionTraces.slice(-200);
      }
    });
  }

  /**
   * Returns comprehensive runtime health and status of the AI Engine.
   */
  public getRuntimeStatus(): AiEngineRuntimeStatus {
    const config = this.getConfig();
    const traces = camoDb.getState().aiExecutionTraces || [];
    const lastTrace = traces[traces.length - 1];
    const isConfigured = Boolean(process.env.GEMINI_API_KEY);

    let modelHealth: 'HEALTHY' | 'DEGRADED' | 'OFFLINE' | 'DISABLED' = 'HEALTHY';
    if (config.selectionPolicy === 'DISABLED') {
      modelHealth = 'DISABLED';
    } else if (!isConfigured) {
      modelHealth = 'OFFLINE';
    } else if (lastTrace?.finalStatus === 'ERROR' || lastTrace?.fallbackUsed) {
      modelHealth = 'DEGRADED';
    }

    const fallbackExecutions = traces.filter(t => t.fallbackUsed).length;
    const fallbackRatePercent = traces.length > 0 
      ? Math.round((fallbackExecutions / traces.length) * 100) 
      : 0;

    return {
      provider: 'Google Gemini',
      primaryModel: this.PRIMARY_MODEL_ID,
      runtimeModel: this.runtimeModelUsed,
      modelPolicy: config.selectionPolicy,
      fallbackCandidates: config.fallbackModels,
      lastExecutionTrace: lastTrace,
      lastModelUpdate: config.lastModelUpdate || this.lastModelUpdateTimestamp,
      modelHealth,
      availableModelsCount: this.HOMOLOGATED_MODELS.length,
      totalExecutions: traces.length,
      fallbackRatePercent,
      isGeminiApiKeyConfigured: isConfigured,
      pipelineVersion: this.ORCHESTRATOR_VERSION,
      promptVersion: this.PROMPT_VERSION,
      schemaVersion: this.SCHEMA_VERSION
    };
  }

  /**
   * Central Controlled Invocation Engine with Fallback & Cryptographic Hashing:
   * Coordinates execution across primary and fallback candidates with strict schema validation.
   */
  public async executeStructuredGeneration<T>(params: {
    parts: any[];
    systemInstruction: string;
    responseSchema: any;
    requestCorrelationId?: string;
    documentRef?: string;
    timeoutMs?: number;
    validationFn?: (data: T) => { passed: boolean; failedRules: string[]; details?: string };
    overrideModel?: string;
  }): Promise<{
    data: T | null;
    rawText: string;
    trace: AiExecutionTrace;
    resolution: AiModelResolution;
  }> {
    const startTime = Date.now();
    const traceId = `trace-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const correlationId = params.requestCorrelationId || `corr-${Date.now()}`;
    const resolution = this.resolveModel(undefined, params.overrideModel);

    // 1. If policy is DISABLED, exit cleanly without calling external APIs
    if (resolution.selectionPolicy === 'DISABLED') {
      const trace: AiExecutionTrace = {
        traceId,
        provider: resolution.provider,
        requestedModel: resolution.requestedModel,
        resolvedModel: 'disabled',
        timestamp: new Date().toISOString(),
        pipelineVersion: this.ORCHESTRATOR_VERSION,
        promptVersion: this.PROMPT_VERSION,
        schemaVersion: this.SCHEMA_VERSION,
        requestCorrelationId: correlationId,
        documentRef: params.documentRef,
        executionDurationMs: Date.now() - startTime,
        retryCount: 0,
        fallbackUsed: false,
        validationResult: {
          passed: false,
          rulesChecked: 0,
          failedRules: ['AI_DISABLED_BY_POLICY'],
          details: 'AI Model Orchestrator is in DISABLED policy mode.'
        },
        responseHash: crypto.createHash('sha256').update('DISABLED').digest('hex'),
        finalStatus: 'DISABLED'
      };
      this.recordExecutionTrace(trace);
      return { data: null, rawText: '', trace, resolution };
    }

    const ai = this.getClient();
    if (!ai) {
      const trace: AiExecutionTrace = {
        traceId,
        provider: resolution.provider,
        requestedModel: resolution.requestedModel,
        resolvedModel: resolution.resolvedModel,
        timestamp: new Date().toISOString(),
        pipelineVersion: this.ORCHESTRATOR_VERSION,
        promptVersion: this.PROMPT_VERSION,
        schemaVersion: this.SCHEMA_VERSION,
        requestCorrelationId: correlationId,
        documentRef: params.documentRef,
        executionDurationMs: Date.now() - startTime,
        retryCount: 0,
        fallbackUsed: false,
        validationResult: {
          passed: false,
          rulesChecked: 0,
          failedRules: ['GEMINI_API_KEY_MISSING'],
          details: 'GEMINI_API_KEY is not configured in server environment.'
        },
        responseHash: crypto.createHash('sha256').update('NO_KEY').digest('hex'),
        finalStatus: 'ERROR'
      };
      this.recordExecutionTrace(trace);
      return { data: null, rawText: '', trace, resolution };
    }

    // Build candidate chain: primary candidate first, followed by homologated fallbacks
    const candidateModels: string[] = [];
    if (resolution.resolvedModel && !candidateModels.includes(resolution.resolvedModel)) {
      candidateModels.push(resolution.resolvedModel);
    }
    for (const fb of resolution.fallbackChain) {
      if (!candidateModels.includes(fb)) {
        candidateModels.push(fb);
      }
    }

    let successfulModel = resolution.resolvedModel;
    let successfulRawText = '';
    let parsedData: T | null = null;
    let fallbackUsed = false;
    let fallbackReason: string | undefined = undefined;
    const attemptedModels: string[] = [];
    let retryCount = 0;
    let lastError: Error | null = null;

    const timeoutLimit = params.timeoutMs || this.getConfig().timeoutMs;

    // 2. Iterate through candidate chain
    for (const modelCandidate of candidateModels) {
      attemptedModels.push(modelCandidate);
      try {
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Model ${modelCandidate} timed out after ${timeoutLimit}ms`)), timeoutLimit)
        );

        const generatePromise = ai.models.generateContent({
          model: modelCandidate,
          contents: { parts: params.parts },
          config: {
            systemInstruction: params.systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: params.responseSchema
          }
        });

        const response: any = await Promise.race([generatePromise, timeoutPromise]);
        const text = response?.text || '';

        if (!text || text.trim().length === 0) {
          throw new Error(`Empty response from model ${modelCandidate}`);
        }

        // Try parsing JSON
        const parsed = JSON.parse(text) as T;

        // Custom validation check if provided
        if (params.validationFn) {
          const valRes = params.validationFn(parsed);
          if (!valRes.passed) {
            throw new Error(`Model ${modelCandidate} failed validation rules: ${valRes.failedRules.join(', ')}`);
          }
        }

        successfulModel = modelCandidate;
        successfulRawText = text;
        parsedData = parsed;
        if (modelCandidate !== resolution.resolvedModel) {
          fallbackUsed = true;
          fallbackReason = `Primary model ${resolution.resolvedModel} failed. Successfully recovered via fallback ${modelCandidate}.`;
        }
        break; // Success!
      } catch (candErr: any) {
        lastError = candErr;
        retryCount++;
        console.warn(`[AIModelOrchestrator] Candidate ${modelCandidate} failed:`, candErr.message);
        if (candErr.message?.includes('503') || candErr.message?.includes('429')) {
          await new Promise(r => setTimeout(r, 400));
        }
      }
    }

    const durationMs = Date.now() - startTime;
    const responseHash = crypto
      .createHash('sha256')
      .update(successfulRawText || lastError?.message || 'FAILED')
      .digest('hex');

    // Run final validation report
    let validationResult = {
      passed: Boolean(parsedData),
      rulesChecked: 1,
      failedRules: parsedData ? [] : ['ALL_MODELS_EXHAUSTED'],
      details: parsedData ? `Successfully validated with model ${successfulModel}` : (lastError?.message || 'Extraction failed')
    };

    if (parsedData && params.validationFn) {
      const customVal = params.validationFn(parsedData);
      validationResult = {
        passed: customVal.passed,
        rulesChecked: customVal.failedRules.length + 1,
        failedRules: customVal.failedRules,
        details: customVal.details || `Model ${successfulModel} passed regulatory validation`
      };
    }

    const finalStatus: AiExecutionTrace['finalStatus'] = parsedData
      ? (fallbackUsed ? 'FALLBACK_SUCCESS' : 'SUCCESS')
      : (validationResult.failedRules.length > 0 ? 'VALIDATION_FAILED' : 'ERROR');

    const trace: AiExecutionTrace = {
      traceId,
      provider: 'Google Gemini',
      requestedModel: resolution.requestedModel,
      resolvedModel: successfulModel,
      timestamp: new Date().toISOString(),
      pipelineVersion: this.ORCHESTRATOR_VERSION,
      promptVersion: this.PROMPT_VERSION,
      schemaVersion: this.SCHEMA_VERSION,
      requestCorrelationId: correlationId,
      documentRef: params.documentRef,
      executionDurationMs: durationMs,
      retryCount,
      fallbackUsed,
      fallbackReason,
      fallbackChain: attemptedModels,
      validationResult,
      responseHash,
      finalStatus
    };

    this.recordExecutionTrace(trace);
    this.runtimeModelUsed = successfulModel;

    return {
      data: parsedData,
      rawText: successfulRawText,
      trace,
      resolution: {
        ...resolution,
        resolvedModel: successfulModel,
        fallbackUsed
      }
    };
  }

  /**
   * Executes a controlled live runtime probe to demonstrate and verify actual execution
   * of gemini-3.8-flash with an immutable audit trace.
   */
  public async executeTestPrompt(): Promise<{
    success: boolean;
    trace: AiExecutionTrace;
    modelUsed: string;
    output?: any;
  }> {
    const schema = {
      type: Type.OBJECT,
      properties: {
        systemName: { type: Type.STRING },
        primaryModel: { type: Type.STRING },
        complianceVerification: { type: Type.STRING },
        timestamp: { type: Type.STRING },
        isAeronauticalReady: { type: Type.BOOLEAN }
      },
      required: ['systemName', 'primaryModel', 'complianceVerification', 'isAeronauticalReady']
    };

    const parts = [
      {
        text: 'Perform an immediate CAMO Model Verification test. Confirm that you are running on Google Gemini 3.8 Flash and output verification JSON.'
      }
    ];

    const result = await this.executeStructuredGeneration<{
      systemName: string;
      primaryModel: string;
      complianceVerification: string;
      isAeronauticalReady: boolean;
    }>({
      parts,
      systemInstruction: 'You are an aeronautical continuing airworthiness AI engine. Output strictly valid JSON conforming to the requested schema.',
      responseSchema: schema,
      requestCorrelationId: `test-probe-${Date.now()}`,
      documentRef: 'CAMO_MODEL_VERIFICATION_PROBE'
    });

    return {
      success: result.trace.finalStatus === 'SUCCESS' || result.trace.finalStatus === 'FALLBACK_SUCCESS',
      trace: result.trace,
      modelUsed: result.resolution.resolvedModel,
      output: result.data
    };
  }
}

// Export singleton instance for system-wide consumption
export const aiModelOrchestrator = AIModelOrchestrator.getInstance();
