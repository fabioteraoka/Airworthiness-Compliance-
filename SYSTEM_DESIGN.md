# SYSTEM DESIGN — CAMO AIRWORTHINESS COMPLIANCE & MAINTENANCE CONTROL (PCM)

> **Documento Canônico de Arquitetura de Sistema e Engenharia de Software**  
> **Versão:** 9.7.0 (Homologada na Fase 9 — Etapa 7: System Design Vivo + Aircraft Master & Configuration + Inteligência AD/SB)  
> **Status:** VIVO • AUTOCONTIDO • HOMOLOGADO • EM PRODUÇÃO  
> **Classificação:** Engenharia Aeronáutica, Governança CAMO e Arquitetura de Software Crítico  

---

## 1. VISÃO DO PRODUTO & PROPÓSITO DO SISTEMA

### 1.1 O que é o CAMO Engine?
O **CAMO Engine** é uma plataforma integrada de **Engenharia de Aeronavegabilidade Continuada (CAMO - Continuing Airworthiness Management Organisation)** e **Controle de Manutenção de Aeronaves (PCM - Planejamento e Controle de Manutenção)**, construída segundo os padrões regulatórios da **FAA (14 CFR Part 39, Part 121 Subpart L)**, **EASA (Part-M / Part-CAMO)** e **ANAC (RBAC 121, RBAC 39, RBAC 43)**.

O sistema atua como o **cérebro técnico e auditor em tempo real** das frotas de aeronaves comerciais e executivas, assegurando que:
1. Toda nova diretriz regulatória (Airworthiness Directive - AD) seja capturada, versionada e analisada com rigor matemático.
2. Todo Boletim de Serviço (Service Bulletin - SB) e Boletim de Requisitos de Alerta (Alert Requirements Bulletin - RB) referenciado seja identificado, estruturado em checklist técnico e rastreado em sua execução.
3. Toda modificação, troca de peça (P/N e S/N), inspeção e liberação de manutenção seja gravada em um **Ledger Criptográfico Imutável de Configuração da Aeronave**.
4. A aeronavegabilidade física e jurídica de cada célula seja calculada deterministicamente, garantindo segurança de voo, transparência em auditorias e blindagem contra paradas de frota (*AOG - Aircraft On Ground*).

---

## 2. AXIOMAS FUNDAMENTAIS E INVARIANTES REGULATÓRIOS

Qualquer agente de IA ou desenvolvedor humano que atue neste sistema **DEVE** respeitar os seguintes princípios universais:

### 2.1 Distinção Ontológica Obrigatória (Invariante Central)
```
┌────────────────────────┐
│  Regulatory Knowledge  │  (O que a autoridade publicou: AD, SB, RB, EASA AD, FAA AD)
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│     Applicability      │  (A regra se aplica a esta aeronave/motor/peça física?)
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ Compliance Obligation  │  (O que, quando e com qual recorrência deve ser cumprido?)
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│        Evidence        │  (O documento técnico que prova o cumprimento: FAPT, Log, NF)
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│   Compliance Status    │  (A obrigação individual está Conforme, Pendente ou Vencida?)
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│Operational Airworthiness│ (A aeronave pode decolar com segurança e autorização legal?)
└────────────────────────┘
```
**Regra Estrita:** Jamais mesclar esses conceitos. A existência de uma AD não significa que ela é aplicável; a aplicabilidade não significa que ela foi cumprida; e uma ordem de serviço em aberto não autoriza a decolagem da aeronave.

### 2.2 Divisão Técnica entre AD e SB
* **Airworthiness Directive (AD):** Define o **mandato legal obrigatório** emitido pela autoridade aeronáutica (FAA, EASA, ANAC). Responde: *O que deve ser cumprido, em que prazo e quais as consequências legais*.
* **Service Bulletin (SB / RB):** Define o **método de engenharia e instrução técnica** fornecido pelo fabricante da aeronave ou motor (Boeing, Airbus, Embraer, CFM, GE). Responde: *Como inspecionar, como modificar, quais ferramentas e quais part numbers instalar*.
* **Relação Formal:** A AD exige o cumprimento; o SB instrumentaliza a execução técnica; o PCM registra a alteração física de configuração; e o CAMO valida a conformidade final.

### 2.3 IA Sugere ➔ Humano Valida ➔ Sistema Registra
* A Inteligência Artificial (Gemini) atua estritamente como **assistente de extração e estruturação**.
* A IA **NUNCA** toma decisões regulatórias finais nem assina pareceres de forma autônoma.
* Todo parecer técnico (FAPT), validação de SB e liberação de obrigação exige confirmação e assinatura digital de engenheiro aeronáutico credenciado.

---

## 3. ARQUITETURA DE COMPONENTES E TOPOLOGIA DO SISTEMA

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       INTERFACE WEB (REACT 18 + TAILWIND)                   │
│  FleetView  │  RegulatoryRegisterView  │  AnalysisPhaseView  │  DeliveryView │
│  SmartAudit │  PCM Ledger View         │  HelpCenterView     │  Architecture │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST / JSON (Port 3000)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    EXPRESS BACKEND SERVER (server.ts)                       │
│  Middlewares de Segurança • Rate Limiting • Auditoria Transacional          │
└──────────────┬───────────────────────────────┬──────────────────────────────┘
               │                               │
┌──────────────▼────────────────┐    ┌─────────▼──────────────────────────────┐
│   CAMO COMPLIANCE ENGINE      │    │  MAINTENANCE CONTROL SYSTEM (PCM)      │
│ ───────────────────────────── │    │ ────────────────────────────────────── │
│ • Regulatory Discovery Engine │    │ • Aircraft Master Data (MSN, TSN, CSN) │
│ • Canonical Register & Deltas │    │ • Cryptographic Configuration Ledger   │
│ • Deterministic Completeness  │    │ • Component Tree (Engine, APU, Gears)  │
│ • SB Intelligence Engine      │    │ • Work Orders & Task Cards Linkage     │
│ • 4-Tier Applicability Engine │    │ • Maintenance Release Signoffs         │
│ • 13-State Obligation Machine │    │ • TSN/CSN Projection & Due Dates       │
│ • Delivery Assessment Sandbox │    │ • Logbook & Defect Tracking            │
└──────────────┬────────────────┘    └─────────┬──────────────────────────────┘
               │                               │
┌──────────────▼───────────────────────────────▼──────────────────────────────┐
│                SHARED SINGLE SOURCE OF TRUTH (server/dataStore.ts)          │
│  State Ledger em Memória + Persistência ACID em Disco + SHA-256 Audit Trail │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Camadas do Sistema

#### Camada 1: Ingestão e Aquisição Regulatória
* **Conectores Oficiais:** `federalRegisterConnector.ts` (FAA Daily Ingestion), conectores EASA/ANAC (estruturados em `sourceRegistry.ts`).
* **Vault Criptográfico:** `officialDocumentAcquisitionService.ts` com proteção Anti-SSRF, validação de Content-Type e hash SHA-256 de integridade dos arquivos originais.
* **Extração Gemini Confinada:** `geminiService.ts` (modelo Gemini 3.7 Flash) com prompts estruturados para conversão de PDFs regulatórios em esquemas JSON rigorosos.

#### Camada 2: Registro Regulatório Canônico & Máquina de Estados de Análise
* **Registro Canônico:** `camoRegulatoryRegister` com chave canônica `reg-{authority}-{cleanNumber}`, histórico de versões (`versionHistory`), tracking de deltas (`NEW`, `UPDATED`, `UNCHANGED`, `SUPERSEDED`) e detecção de alterações por hash SHA-256.
* **Lifecycle de Análise Técnica da AD:**
  1. `PENDING_ANALYSIS`: Registro importado, aguardando início da análise técnica.
  2. `ANALYSIS_IN_PROGRESS`: Análise em processamento pelo motor ou sob revisão de engenharia.
  3. `ANALYSIS_FAILED`: Falha técnica na extração de parâmetros mandatórios ou dados corrompidos.
  4. `REVIEW_REQUIRED`: Incompletude ou lacuna técnica detectada (ex: SB mandatório sem dados).
  5. `ANALYZED`: Todas as etapas mandatórias satisfeitas com sucesso determinístico comprovado.
* **Avaliador Determinístico de Completude:** `isAnalysisComplete()` valida 8 etapas obrigatórias:
  1. `CANONICAL_IDENTITY`: Autoridade, número e identificador válidos.
  2. `DOCUMENT_INTEGRITY`: Payload original e hash SHA-256 verificados.
  3. `REQUIREMENT_SYNTHESIS`: Requisito regulatório formal sintetizado no banco.
  4. `EFFECTIVITY_RULE`: Regra de aplicabilidade com escopo de modelos ou P/Ns definido.
  5. `THRESHOLDS_AND_INTERVALS`: Prazos de cumprimento e limites operacionais claros.
  6. `MANDATORY_ACTIONS`: Descrição objetiva das tarefas técnicas a executar.
  7. `KNOWLEDGE_BASE_LINK`: Vínculo persistente com a base de conhecimento de engenharia.
  8. `SB_INTELLIGENCE`: Extração, relacionamento e checklist dos Boletins de Serviço referenciados.

#### Camada 3: Inteligência de Boletins de Serviço (SB Intelligence)
* **Extração Técnica:** `extractReferencedServiceBulletins()` identifica Boletins de Serviço (SB), Boletins de Alerta (ASB) e Boletins de Requisitos (RB) citados no texto ou nos documentos de conformidade.
* **Classificação de Relacionamento com a AD:**
  * `MANDATORY_INCORPORATION`: A AD exige o cumprimento estrito das instruções do SB.
  * `TERMINATING_ACTION`: A incorporação deste SB encerra inspeções repetitivas da AD.
  * `ALTERNATIVE_METHOD`: Método alternativo de cumprimento aprovado (AMOC).
  * `REFERENCE_ONLY`: Citado para contexto ou documentação técnica de apoio.
* **Checklist de Engenharia:** `generateSbAnalysisChecklist()` desdobra o SB em dados de aplicabilidade de célula, prévia incorporação em serviço (*prior accomplishment*), ações físicas (inspeção, modificação, substituição de peças) e dados requeridos de rastreabilidade.
* **Homologação Humana:** `analyzeReferencedServiceBulletin()` permite validação formal pelo engenheiro CAMO, com anotações técnicas e carimbo digital.

#### Camada 4: Avaliação de Aplicabilidade Progressiva (4 Níveis)
* `Airframe Level`: Modelo, série, MSN, número de linha e blocos de fabricação.
* `Engine Level`: Modelo de motor, fabricante, ESN e posição na asa.
* `Rotable Component Level`: Part Number (P/N), Serial Number (S/N) e status de modificação.
* `Software / Mod Level`: Versão de software embarcado e incorporação prévia de SBs.
* *Fail-Safe Invariant:* Se dados faltarem, o status resultante é estritamente `REVIEW_REQUIRED`, jamais `NOT_APPLICABLE`.

#### Camada 5: Máquina de Estados de Obrigações (13 Estados)
* Gerenciada por `complianceObligationService.ts`, cobrindo desde o nascimento da obrigação até o encerramento por ação terminativa ou alienação da aeronave:
  `DRAFT` ➔ `PENDING_REVIEW` ➔ `SCHEDULED` ➔ `IN_PROGRESS` ➔ `AWAITING_PARTS` ➔ `DEFERRED` ➔ `COMPLIED` ➔ `TERMINATING_ACTION_COMPLIED` ➔ `OVERDUE` ➔ `EXEMPTED` ➔ `NOT_APPLICABLE` ➔ `SUPERSEDED` ➔ `CANCELLED`.

#### Camada 6: Maintenance Control System (PCM) & Ledger de Configuração
* **Gestão Cadastral Master da Frota:** CRUD em tempo real de aeronaves com controle de MSN, matrícula, TSN, CSN, operadora e transições de status (`ACTIVE`, `MAINTENANCE`, `STORED`, `DECOMMISSIONED`).
* **Ledger Criptográfico de Configuração:** `AircraftConfigurationHistoryRecord` registra toda instalação, remoção, modificação, inspeção e incorporação de SB.
* **Hash SHA-256 Indelével:** Cada registro calcula um hash criptográfico sobre os dados do evento, horas/ciclos da aeronave e referências de ordens de serviço.

#### Camada 7: Gestão de Evidências e Liberação de Aeronavegabilidade
* **Evidências:** `evidenceVerificationEngine.ts` valida notas fiscais, relatórios de NDT, relatórios de ensaio e registros de Logbook, exigindo anexação documental para transição para `COMPLIED`.
* **Duplo Sign-off:** Exigência de assinatura digital do mecânico executante (CREA/CFT) e do inspetor/engenheiro CAMO com token e carimbo temporal.

#### Camada 8: Delivery Assessment Sandbox (Fase 7)
* Módulo de análise de transição de aeronave (devolução para lessor ou recebimento de frota).
* Simula se a aeronave cumpre todos os requisitos de devolução sem alterar o banco de dados operacional.

---

## 4. ESQUEMA DE DADOS PRINCIPAIS (TYPESCRIPT)

### 4.1 Registro Regulatório (`CamoRegulatoryRecord`)
```typescript
export interface CamoRegulatoryRecord {
  id: string;                      // reg-{authority}-{cleanNumber}
  canonicalAdId?: string;
  authority: IssuingAuthority;     // 'FAA' | 'EASA' | 'ANAC' | 'UK_CAA' | 'TRANSPORT_CANADA'
  adNumber: string;                // e.g. "2024-12-05", "2024-0120"
  officialDocumentNumber?: string;
  title: string;
  manufacturer: string;
  family: string;
  modelScope: string[];
  ataChapter?: string;
  effectiveDate?: string;
  officialStatus?: 'ACTIVE' | 'SUPERSEDED' | 'REVOKED' | 'CANCELLED';
  sha256?: string;                 // Hash de integridade do conteúdo
  version: number;                 // Versão do registro no CAMO
  versionHistory?: RegulatoryRegisterVersionHistory[];
  deltaStatus: RegulatoryDeltaStatus; // 'NEW' | 'UPDATED' | 'UNCHANGED' | 'SUPERSEDED'
  analysisStatus: RegulatoryAnalysisStatus; // 'PENDING_ANALYSIS' | 'ANALYSIS_IN_PROGRESS' | 'ANALYSIS_FAILED' | 'REVIEW_REQUIRED' | 'ANALYZED'
  analysisCompleteness?: AnalysisCompletenessResult;
  referencedSbs?: ReferencedServiceBulletin[];
  sbIntelligenceStatus?: SbAnalysisStatus;
  auditTrail: AuditTrailEntry[];
}
```

### 4.2 Inteligência de Boletim de Serviço (`ReferencedServiceBulletin`)
```typescript
export interface ReferencedServiceBulletin {
  id: string;
  adNumber: string;
  authority: IssuingAuthority;
  sbNumber: string;
  revision?: string;
  manufacturer: string;
  documentType: SbDocumentType;     // 'SERVICE_BULLETIN' | 'ALERT_SERVICE_BULLETIN' | 'REQUIREMENTS_BULLETIN'
  relationshipToAd: SbRelationshipToAd; // 'MANDATORY_INCORPORATION' | 'TERMINATING_ACTION' | 'ALTERNATIVE_METHOD' | 'REFERENCE_ONLY'
  isMandatedByAd: boolean;
  analysisStatus: SbAnalysisStatus; // 'PENDING_RETRIEVAL' | 'CHECKLIST_GENERATED' | 'REVIEW_REQUIRED' | 'ANALYZED'
  checklist?: SbAnalysisChecklist;
  notes?: string;
  extractedAt?: string;
}
```

### 4.3 Ledger de Configuração da Aeronave (`AircraftConfigurationHistoryRecord`)
```typescript
export interface AircraftConfigurationHistoryRecord {
  id: string;                      // cfg-{timestamp}-{random}
  aircraftId: string;
  aircraftRegistration: string;
  timestamp: string;
  actor: string;
  authorizedBy?: string;
  reason: string;
  eventType: ConfigurationEventType; // 'INSTALLATION' | 'REMOVAL' | 'MODIFICATION' | 'INSPECTION' | 'MAINTENANCE_RELEASE' | 'STATUS_CHANGE' | 'SB_INCORPORATION'
  componentType?: string;
  componentPartNumber?: string;
  componentSerialNumber?: string;
  position?: string;
  flightHoursAtEvent: number;
  flightCyclesAtEvent: number;
  workOrderReference?: string;
  taskCardReference?: string;
  complianceObligationId?: string;
  previousValue?: string;
  newValue?: string;
  notes?: string;
  auditHash: string;               // SHA-256 cryptographic seal
  recordHash?: string;             // Alias de integridade
}
```

---

## 5. REGRAS DE EVOLUÇÃO E CONVIVÊNCIA PARA NOVAS IAs

1. **Zero Degradação de Governança:** Toda nova funcionalidade deve manter 100% de aprovação nos testes automatizados (`npm test`). Nenhuma suíte existente pode ser suprimida ou ter asserções flexibilizadas.
2. **Sem Arquiteturas Paralelas:** Não criar novos bancos de dados, storages alternativos ou mocks em memória quando `server/dataStore.ts` já centraliza a persistência.
3. **Persistência de Governança:** Qualquer nova entidade criada deve ser documentada no `CAPABILITY_REGISTRY.md`, incorporada neste `SYSTEM_DESIGN.md` e espelhada no `PRODUCT_VISION_ROADMAP.md`.
4. **Idempotência Operacional:** A reimportação de uma AD inalterada deve resultar em skip idempotente (`UNCHANGED`), sem gerar registros órfãos ou duplicatas.
5. **Criptografia & Auditoria:** Toda ação de engenharia que modifique o estado da frota ou do registro regulatório deve emitir uma entrada estruturada no `auditTrail`.

---

*Documento homologado pelo Comitê de Arquitetura de Software e Engenharia de Aeronavegabilidade CAMO.*
