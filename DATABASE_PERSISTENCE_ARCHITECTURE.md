# DATABASE PERSISTENCE ARCHITECTURE — CAMO AIRWORTHINESS ENGINE
## Arquitetura de Persistência Relacional: PostgreSQL & Firebase SQL Connect
**Documento Canônico de Modelagem, Análise e Planejamento Técnico — Fase 3C**  
**Versão:** 1.0.0 (Release 9.7.1)  
**Data de Emissão:** 21 de Setembro de 2026  
**Autoridade de Governança:** Diretoria Técnica de Engenharia & Governança CAMO  
**Status Arquitetural:** HOMOLOGADO PARA PLANEJAMENTO • NÃO IMPLEMENTAR EM BANCO FÍSICO NESTA FASE  

---

## 1. RESUMO EXECUTIVO E PRINCÍPIOS FUNDAMENTAIS

O CAMO Airworthiness Compliance Intelligence Platform transitou de um protótipo de conformidade para uma plataforma de engenharia de missão crítica de classe empresarial, governando Diretrizes de Aeronavegabilidade (FAA, EASA, ANAC), Boletins de Serviço (SB/ASB/RB), configuração física de aeronaves e motores, obrigações de cumprimento com vencimento tridimensional (Horas de Voo, Ciclos e Calendário), pacotes probatórios e laudos periciais FAPT (*Formulário de Análise Preventiva de Termo*).

Atualmente, o estado do sistema reside em memória e é espelhado no arquivo plano `data/camo_db.json`. Embora suficiente para desenvolvimento e validação dos motores determinísticos em ciclos curtos de teste, a persistência monolítica em arquivo único impõe gargalos estruturais:
1. **Risco de Perda de Esforço Analítico:** A ausência de transações atômicas relacionais (ACID) expõe o estado a corrupção em caso de encerramento abrupto do processo durante mutação de grandes matrizes.
2. **Repetição Desnecessária de Análises de IA:** Sem um repositório canônico normalizado de Diretrizes analisadas e Boletins homologados indexados por SHA-256 e revisão, documentos regulatórios idênticos correm risco de serem reprocessados pelo Gemini AI, gerando custos operacionais e latência.
3. **Acoplamento entre Conhecimento e Frota:** O modelo em arquivo único mescla conhecimento regulatório universal (ex: texto normativo de uma AD da Boeing válida para qualquer operador mundial) com dados contingenciais e transitórios da frota (ex: aeronaves ativas, horas de voo diárias, obrigações abertas).

### Princípio Zero da Modelagem Relacional CAMO
> **A persistência relacional do CAMO Engine NÃO é uma simples conversão de chaves JSON em tabelas soltas. Ela estrutura permanentemente a separação ontológica entre o Conhecimento Regulatório Reutilizável, a Configuração Física, o Estado Contextual da Frota, a Evidência Probatória, a Decisão Humana Homologada e a Trilha de Auditoria Imutável.**

---

## 2. SEPARAÇÃO ONTOLÓGICA DAS 6 CATEGORIAS DE DADOS

O sistema adota estritamente seis categorias de dados mutuamente exclusivas e desacopladas:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        ARQUITETURA DE PERSISTÊNCIA RELACIONAL                          │
├────────────────────────────────┬───────────────────────────────────────────────────────┤
│ A. CONHECIMENTO REGULATÓRIO    │ ADs, SBs, Requisitos, Ações Mandatórias, Thresholds,   │
│    REUTILIZÁVEL (UNIVERSAL)    │ Applicability Rules, Referências Técnicas AD ↔ SB.    │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ B. CONTEXTO DE CONFIGURAÇÃO    │ Operador, Aeronaves (MSN/Matrícula), Motores (ESN),   │
│    FÍSICA (LEGER DE ATIVOS)    │ Componentes (P/N, S/N), Instalações e Ledger Histórico│
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ C. ESTADO CONTEXTUAL           │ Triagem Frota × AD, Obrigações Ativas (13 estados),   │
│    (STATUS DINÂMICO DA FROTA)  │ Vencimentos 3D (FH/FC/CAL), Avaliações de Delivery.   │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ D. EVIDÊNCIA PROBATÓRIA        │ CRS, Ordens de Serviço, Logs Técnicos, Hashes SHA-256 │
│    (PACOTE PROBATÓRIO)         │ de PDFs Oficiais, FAPT assinado por Engenheiro CAMO.  │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ E. DECISÃO HUMANA              │ Homologações de Engenharia, Resoluções de Conflito,   │
│    (AUTORIDADE TÉCNICA)        │ Fatos Regulatórios Homologados, Respostas a Dúvidas.   │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ F. HISTÓRICO E AUDITORIA       │ Trilha de Auditoria Append-Only, Transições de Estado, │
│    (INTEGRIDADE IMUTÁVEL)      │ Tracing de Execução de IA, Configurações de Modelos.  │
└────────────────────────────────┴───────────────────────────────────────────────────────┘
```

---

## 3. IDENTIDADE CANÔNICA E CHAVES NATURAIS VS SURROGATE

Para impedir que a mesma AD, SB ou aeronave seja cadastrada em duplicidade sob IDs arbitrários, o sistema estabelece chaves naturais imutáveis aliadas a chaves primárias surrogates (UUIDv7) para relacionamentos de alta performance.

| Domínio | Identidade Natural (Chave de Idempotência) | Chave Primária (Surrogate) | Regra de Unicidade / Idempotência |
| :--- | :--- | :--- | :--- |
| **AD Document** | `authority` + `ad_number` + `revision` | `id` (UUIDv7) | `UNIQUE (authority, ad_number, revision)` |
| **Technical Ref (SB)** | `manufacturer` + `sb_number` + `revision` | `id` (UUIDv7) | `UNIQUE (manufacturer, sb_number, revision)` |
| **AD × SB Dependency** | `ad_document_id` + `technical_reference_id` | `id` (UUIDv7) | `UNIQUE (ad_document_id, technical_reference_id)` |
| **Compliance Requirement** | `ad_document_id` + `requirement_index` | `id` (UUIDv7) | `UNIQUE (ad_document_id, requirement_index)` |
| **Operator** | `icao_code` | `id` (UUIDv7) | `UNIQUE (icao_code)` |
| **Aircraft** | `operator_id` + `registration` | `id` (UUIDv7) | `UNIQUE (operator_id, registration)` e `UNIQUE (manufacturer, serial_number)` |
| **Engine** | `manufacturer` + `model` + `serial_number` | `id` (UUIDv7) | `UNIQUE (manufacturer, model, serial_number)` |
| **Component** | `part_number` + `serial_number` | `id` (UUIDv7) | `UNIQUE (part_number, serial_number)` |
| **Compliance Obligation** | `aircraft_id` + `requirement_id` + `action_index` | `id` (UUIDv7) | `UNIQUE (aircraft_id, requirement_id, action_index)` |
| **Evidence Record** | `sha256_hash` + `obligation_id` | `id` (UUIDv7) | `UNIQUE (sha256_hash, obligation_id)` |
| **FAPT Document** | `fapt_number` | `id` (UUIDv7) | `UNIQUE (fapt_number)` |
| **Audit Trail** | `timestamp` + `entity_type` + `entity_id` + `action` | `id` (UUIDv7) | Append-Only (sem update) |

---

## 4. ESTRATÉGIA RELACIONAL VS JSONB

O CAMO Engine adota uma divisão estrita entre colunas relacionais tipadas e campos semiestruturados em `JSONB`:

### Quando Normalizar em Tabelas Relacionais:
* Entidades com ciclo de vida independente e identidade própria (`aircraft`, `regulatory_ad_documents`, `compliance_obligations`, `evidence_records`).
* Colunas sujeitas a filtros frequentes, cláusulas `WHERE`, chaves estrangeiras (`FK`) e ordenação (`status`, `authority`, `ad_number`, `registration`, `next_due_date`, `is_airworthy`).
* Controles de integridade referencial com `ON DELETE RESTRICT` (ex: uma AD não pode ser deletada se houver obrigações ativas dependendo dela).
* Índices B-Tree compostos para consultas de alta performance em despachos de aeronavegabilidade.

### Quando Utilizar Colunas `JSONB`:
* **Extrações brutas de IA (`raw_extraction_payload`):** Saídas transitórias do Gemini antes da homologação humana, cujo esquema pode evoluir sem exigir DDL migration.
* **Metadados extensíveis de autoridades regulatórias (`authority_metadata`):** Estruturas variáveis do Federal Register, FAA DRS, EASA Safety Publications e ANAC SIPAC.
* **Trilhas e Parâmetros de Execução de IA (`ai_execution_traces`):** Metadados de chamadas à API, parâmetros de temperatura, tokens utilizados e payloads de diagnóstico.
* **Critérios dinâmicos de aplicabilidade booleana (`dynamic_criteria_json`):** Condições booleanas complexas e aninhadas avaliadas pelo Rule Engine V2, com índice funcional GIN (`jsonb_path_ops`).

---

## 5. MODELO DE DADOS RELACIONAL PROPOSTO (ESQUEMA POSTGRESQL)

O esquema relacional é estruturado em 6 namespaces lógicos (schemas PostgreSQL) totalizando 28 tabelas:

```sql
-- Criação de Schemas Lógicos para Isolamento Ontológico
CREATE SCHEMA IF NOT EXISTS core_org;
CREATE SCHEMA IF NOT EXISTS regulatory_knowledge;
CREATE SCHEMA IF NOT EXISTS fleet_configuration;
CREATE SCHEMA IF NOT EXISTS compliance_state;
CREATE SCHEMA IF NOT EXISTS evidence_verification;
CREATE SCHEMA IF NOT EXISTS governance_audit;
```

### 5.1 Namespace: `core_org` (Organização e Usuários)

#### Tabela: `core_org.operators`
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `name` VARCHAR(255) NOT NULL,
* `icao_code` VARCHAR(4) NOT NULL UNIQUE,
* `country` VARCHAR(100) NOT NULL,
* `camo_certificate` VARCHAR(150) NOT NULL,
* `status` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
* `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW(),
* `updated_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

#### Tabela: `core_org.users`
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `operator_id` UUID NOT NULL REFERENCES core_org.operators(id) ON DELETE RESTRICT,
* `name` VARCHAR(255) NOT NULL,
* `email` VARCHAR(255) NOT NULL UNIQUE,
* `role` VARCHAR(100) NOT NULL, -- CHIEF_CAMO_ENGINEER, AIRWORTHINESS_INSPECTOR, MAINTENANCE_PLANNER
* `license_number` VARCHAR(100) NOT NULL,
* `signature_stamp` VARCHAR(100) NOT NULL,
* `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
* `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

---

### 5.2 Namespace: `regulatory_knowledge` (Conhecimento Reutilizável)

#### Tabela: `regulatory_knowledge.regulatory_ad_documents`
Representa a Diretriz de Aeronavegabilidade canônica, independente de qualquer frota:
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `authority` VARCHAR(20) NOT NULL, -- FAA, EASA, ANAC, TCCA, UK_CAA
* `ad_number` VARCHAR(100) NOT NULL,
* `revision` VARCHAR(50) NOT NULL DEFAULT 'Original',
* `title` TEXT NOT NULL,
* `issue_date` DATE NOT NULL,
* `effective_date` DATE NOT NULL,
* `emergency_ad` BOOLEAN NOT NULL DEFAULT FALSE,
* `supersedes_ad_number` VARCHAR(100),
* `superseded_by_ad_number` VARCHAR(100),
* `status` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUPERSEDED, CANCELLED, WITHDRAWN
* `raw_text` TEXT,
* `document_sha256` CHAR(64),
* `source_url` TEXT,
* `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW(),
* `updated_at` TIMESTAMPTZ NOT NULL DEFAULT NOW(),
* CONSTRAINT uq_ad_document UNIQUE (authority, ad_number, revision)

#### Tabela: `regulatory_knowledge.technical_references_sb`
Armazena Boletins de Serviço (SB/ASB/RB) citados no texto das ADs:
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `manufacturer` VARCHAR(150) NOT NULL,
* `sb_number` VARCHAR(100) NOT NULL,
* `revision` VARCHAR(50) NOT NULL DEFAULT 'Original',
* `title` TEXT NOT NULL,
* `document_type` VARCHAR(50) NOT NULL DEFAULT 'SERVICE_BULLETIN', -- SERVICE_BULLETIN, ALERT_SERVICE_BULLETIN, etc.
* `issue_date` DATE,
* `document_availability` VARCHAR(50) NOT NULL DEFAULT 'NOT_LOCATED', -- AVAILABLE, NOT_LOCATED, REQUESTED
* `storage_path` TEXT,
* `document_sha256` CHAR(64),
* `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW(),
* CONSTRAINT uq_technical_ref UNIQUE (manufacturer, sb_number, revision)

#### Tabela: `regulatory_knowledge.ad_sb_dependencies`
Relacionamento muitos-para-muitos entre AD e SB definindo o papel técnico do SB:
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `ad_document_id` UUID NOT NULL REFERENCES regulatory_knowledge.regulatory_ad_documents(id) ON DELETE CASCADE,
* `technical_reference_id` UUID NOT NULL REFERENCES regulatory_knowledge.technical_references_sb(id) ON DELETE RESTRICT,
* `relationship_type` VARCHAR(50) NOT NULL, -- MANDATORY_INCORPORATION, ALTERNATIVE_MEANS, TERMINATING_ACTION, REFERENCE_ONLY
* `cited_paragraph_in_ad` VARCHAR(100),
* `is_mandated_by_ad` BOOLEAN NOT NULL DEFAULT TRUE,
* `allows_prior_incorporation` BOOLEAN NOT NULL DEFAULT TRUE,
* `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW(),
* CONSTRAINT uq_ad_sb_dependency UNIQUE (ad_document_id, technical_reference_id)

#### Tabela: `regulatory_knowledge.compliance_requirements`
O requisito técnico extraído da AD (o que deve ser cumprido):
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `ad_document_id` UUID NOT NULL REFERENCES regulatory_knowledge.regulatory_ad_documents(id) ON DELETE CASCADE,
* `requirement_index` INT NOT NULL DEFAULT 1,
* `title` TEXT NOT NULL,
* `ata_chapter` VARCHAR(10),
* `source_type` VARCHAR(50) NOT NULL DEFAULT 'AD',
* `status` VARCHAR(50) NOT NULL DEFAULT 'ASSESSED', -- DRAFT, ASSESSED, APPROVED, SUPERSEDED
* `initial_threshold_desc` TEXT,
* `repetitive_interval_desc` TEXT,
* `terminating_action_desc` TEXT,
* `created_by` VARCHAR(255) NOT NULL,
* `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW(),
* CONSTRAINT uq_requirement UNIQUE (ad_document_id, requirement_index)

#### Tabela: `regulatory_knowledge.applicability_rules`
Regra de aplicabilidade técnica estruturada para cruzamento com a frota:
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `requirement_id` UUID NOT NULL UNIQUE REFERENCES regulatory_knowledge.compliance_requirements(id) ON DELETE CASCADE,
* `aircraft_models` TEXT[] NOT NULL DEFAULT '{}',
* `engine_models` TEXT[] NOT NULL DEFAULT '{}',
* `component_part_numbers` TEXT[] NOT NULL DEFAULT '{}',
* `serial_number_limitations` TEXT,
* `affected_configuration` TEXT,
* `raw_text` TEXT NOT NULL,
* `dynamic_criteria` JSONB DEFAULT '{}'::jsonb,
* `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

#### Tabela: `regulatory_knowledge.mandated_actions`
Ações técnicas detalhadas exigidas pelo requisito (inspeção, modificação, substituição):
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `requirement_id` UUID NOT NULL REFERENCES regulatory_knowledge.compliance_requirements(id) ON DELETE CASCADE,
* `action_index` INT NOT NULL DEFAULT 1,
* `action_type` VARCHAR(50) NOT NULL, -- INSPECTION, MODIFICATION, REPLACEMENT, OPERATIONAL_PROCEDURE
* `description` TEXT NOT NULL,
* `paragraph_reference` VARCHAR(50),
* `initial_threshold` TEXT,
* `repetitive_interval` TEXT,
* `terminating_action` TEXT,
* `is_mandatory` BOOLEAN NOT NULL DEFAULT TRUE,
* CONSTRAINT uq_mandated_action UNIQUE (requirement_id, action_index)

#### Tabela: `regulatory_knowledge.sb_analysis_checklists`
Inteligência técnica detalhada de cumprimento de Boletins de Serviço:
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `technical_reference_id` UUID NOT NULL UNIQUE REFERENCES regulatory_knowledge.technical_references_sb(id) ON DELETE CASCADE,
* `applicability_summary` TEXT,
* `prior_incorporation_conditions` TEXT,
* `terminating_condition` TEXT,
* `required_parts` TEXT[] NOT NULL DEFAULT '{}',
* `special_tooling` TEXT[] NOT NULL DEFAULT '{}',
* `checklist_items` JSONB NOT NULL DEFAULT '[]'::jsonb,
* `validated_by` VARCHAR(255),
* `validated_at` TIMESTAMPTZ,
* `is_approved_for_incorporation` BOOLEAN NOT NULL DEFAULT FALSE

---

### 5.3 Namespace: `fleet_configuration` (Contexto Físico de Configuração)

#### Tabela: `fleet_configuration.aircraft_fleet`
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `operator_id` UUID NOT NULL REFERENCES core_org.operators(id) ON DELETE RESTRICT,
* `registration` VARCHAR(20) NOT NULL,
* `manufacturer` VARCHAR(150) NOT NULL,
* `model` VARCHAR(100) NOT NULL,
* `series` VARCHAR(100),
* `serial_number` VARCHAR(100) NOT NULL, -- MSN
* `manufacture_date` DATE NOT NULL,
* `total_flight_hours` NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
* `total_flight_cycles` INT NOT NULL DEFAULT 0,
* `operational_status` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, MAINTENANCE, STORED, DECOMMISSIONED
* `is_airworthy` BOOLEAN NOT NULL DEFAULT TRUE,
* `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW(),
* `updated_at` TIMESTAMPTZ NOT NULL DEFAULT NOW(),
* CONSTRAINT uq_aircraft_registration UNIQUE (operator_id, registration),
* CONSTRAINT uq_aircraft_msn UNIQUE (manufacturer, serial_number)

#### Tabela: `fleet_configuration.aircraft_engines`
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `aircraft_id` UUID REFERENCES fleet_configuration.aircraft_fleet(id) ON DELETE SET NULL,
* `position` VARCHAR(10) NOT NULL, -- 1, 2, 3, 4, APU
* `manufacturer` VARCHAR(150) NOT NULL,
* `model` VARCHAR(100) NOT NULL,
* `serial_number` VARCHAR(100) NOT NULL, -- ESN
* `total_flight_hours` NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
* `total_flight_cycles` INT NOT NULL DEFAULT 0,
* `status` VARCHAR(50) NOT NULL DEFAULT 'INSTALLED', -- INSTALLED, SHOP, SPARE, RETIRED
* CONSTRAINT uq_engine_esn UNIQUE (manufacturer, model, serial_number)

#### Tabela: `fleet_configuration.aircraft_components`
Componentes e rotáveis físicos sujeitos a rastreabilidade:
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `part_number` VARCHAR(100) NOT NULL,
* `serial_number` VARCHAR(100) NOT NULL,
* `description` VARCHAR(255) NOT NULL,
* `component_type` VARCHAR(50) NOT NULL, -- ROTABLE, LIFE_LIMITED, AVIONICS, MECHANICAL
* `total_hours` NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
* `total_cycles` INT NOT NULL DEFAULT 0,
* `status` VARCHAR(50) NOT NULL DEFAULT 'INSTALLED',
* CONSTRAINT uq_component_pn_sn UNIQUE (part_number, serial_number)

#### Tabela: `fleet_configuration.component_installations`
Ledger de instalação de componentes em posições físicas:
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `aircraft_id` UUID NOT NULL REFERENCES fleet_configuration.aircraft_fleet(id) ON DELETE CASCADE,
* `component_id` UUID NOT NULL REFERENCES fleet_configuration.aircraft_components(id) ON DELETE RESTRICT,
* `installation_position` VARCHAR(100) NOT NULL,
* `installed_at` TIMESTAMPTZ NOT NULL DEFAULT NOW(),
* `removed_at` TIMESTAMPTZ,
* `installed_hours_tsn` NUMERIC(10, 2) NOT NULL,
* `installed_cycles_csn` INT NOT NULL,
* `is_currently_installed` BOOLEAN NOT NULL DEFAULT TRUE

#### Tabela: `fleet_configuration.installed_software`
Softwares embarcados e Field Loadable Software (FLS):
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `aircraft_id` UUID NOT NULL REFERENCES fleet_configuration.aircraft_fleet(id) ON DELETE CASCADE,
* `component_id` UUID REFERENCES fleet_configuration.aircraft_components(id) ON DELETE SET NULL,
* `software_part_number` VARCHAR(100) NOT NULL,
* `software_name` VARCHAR(255) NOT NULL,
* `software_version` VARCHAR(50) NOT NULL,
* `status` VARCHAR(50) NOT NULL DEFAULT 'CURRENT',
* `loaded_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

#### Tabela: `fleet_configuration.configuration_event_ledger`
Trilha imutável de todas as mutações físicas de configuração de aeronaves:
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `aircraft_id` UUID NOT NULL REFERENCES fleet_configuration.aircraft_fleet(id) ON DELETE RESTRICT,
* `event_type` VARCHAR(50) NOT NULL, -- INSTALLATION, REMOVAL, MODIFICATION, SOFTWARE_UPDATE, HOUR_CYCLE_UPDATE
* `target_entity_type` VARCHAR(50) NOT NULL,
* `target_entity_id` VARCHAR(100) NOT NULL,
* `event_timestamp` TIMESTAMPTZ NOT NULL DEFAULT NOW(),
* `flight_hours_at_event` NUMERIC(10, 2) NOT NULL,
* `flight_cycles_at_event` INT NOT NULL,
* `performed_by` VARCHAR(255) NOT NULL,
* `details` JSONB NOT NULL DEFAULT '{}'::jsonb

---

### 5.4 Namespace: `compliance_state` (Estado Contextual da Frota)

#### Tabela: `compliance_state.camo_regulatory_register`
Registro oficial de intake e controle de ADs importadas no CAMO:
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `ad_document_id` UUID REFERENCES regulatory_knowledge.regulatory_ad_documents(id) ON DELETE RESTRICT,
* `ad_number` VARCHAR(100) NOT NULL,
* `authority` VARCHAR(20) NOT NULL,
* `analysis_status` VARCHAR(50) NOT NULL DEFAULT 'PENDING_ANALYSIS', -- PENDING_ANALYSIS, ANALYSIS_IN_PROGRESS, ANALYZED, DEPENDENCY_PENDING, REVIEW_REQUIRED, ANALYSIS_FAILED
* `sb_intelligence_status` VARCHAR(50) NOT NULL DEFAULT 'NO_SB_REFERENCED',
* `analysis_completeness` JSONB,
* `analysis_error` TEXT,
* `imported_at` TIMESTAMPTZ NOT NULL DEFAULT NOW(),
* `analyzed_at` TIMESTAMPTZ,
* `analyzed_by` VARCHAR(255)

#### Tabela: `compliance_state.compliance_obligations`
A obrigação viva de conformidade para uma aeronave específica perante um requisito:
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `aircraft_id` UUID NOT NULL REFERENCES fleet_configuration.aircraft_fleet(id) ON DELETE RESTRICT,
* `requirement_id` UUID NOT NULL REFERENCES regulatory_knowledge.compliance_requirements(id) ON DELETE RESTRICT,
* `action_id` UUID REFERENCES regulatory_knowledge.mandated_actions(id) ON DELETE RESTRICT,
* `status` VARCHAR(50) NOT NULL DEFAULT 'OPEN', -- OPEN, COMPLIED, OVERDUE, SCHEDULED, REPETITIVE_MONITORED, PENDING_EVIDENCE, UNDER_REVIEW, NOT_APPLICABLE, TERMINATED, EXPIRED, SUSPENDED, VOIDED, EXEMPTED
* `applicability_status` VARCHAR(50) NOT NULL, -- APPLICABLE, NOT_APPLICABLE, REVIEW_REQUIRED
* `current_interval_type` VARCHAR(50), -- INITIAL, REPETITIVE, TERMINATING
* `is_overdue` BOOLEAN NOT NULL DEFAULT FALSE,
* `is_airworthiness_critical` BOOLEAN NOT NULL DEFAULT TRUE,
* `last_compliance_date` DATE,
* `last_compliance_hours` NUMERIC(10, 2),
* `last_compliance_cycles` INT,
* `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW(),
* `updated_at` TIMESTAMPTZ NOT NULL DEFAULT NOW(),
* CONSTRAINT uq_obligation UNIQUE (aircraft_id, requirement_id, action_id)

#### Tabela: `compliance_state.due_date_schedules`
Cálculo tridimensional do limite controlador de vencimento:
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `obligation_id` UUID NOT NULL UNIQUE REFERENCES compliance_state.compliance_obligations(id) ON DELETE CASCADE,
* `due_calendar_date` DATE,
* `due_flight_hours` NUMERIC(10, 2),
* `due_flight_cycles` INT,
* `remaining_calendar_days` INT,
* `remaining_flight_hours` NUMERIC(10, 2),
* `remaining_flight_cycles` INT,
* `controlling_limit_type` VARCHAR(50) NOT NULL, -- CALENDAR, FLIGHT_HOURS, FLIGHT_CYCLES, WHICHEVER_OCCURS_FIRST
* `calculation_status` VARCHAR(50) NOT NULL DEFAULT 'VALID',
* `explanation` TEXT,
* `calculated_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

#### Tabela: `compliance_state.obligation_state_transitions`
Histórico formal de todas as mutações da máquina de 13 estados de obrigações:
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `obligation_id` UUID NOT NULL REFERENCES compliance_state.compliance_obligations(id) ON DELETE CASCADE,
* `previous_status` VARCHAR(50) NOT NULL,
* `new_status` VARCHAR(50) NOT NULL,
* `trigger_event` VARCHAR(100) NOT NULL,
* `transition_timestamp` TIMESTAMPTZ NOT NULL DEFAULT NOW(),
* `transitioned_by` VARCHAR(255) NOT NULL,
* `justification` TEXT NOT NULL

#### Tabela: `compliance_state.aircraft_delivery_assessments`
Sandbox estrito para auditorias de devolução e aquisição com Lessors:
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `operator_id` UUID NOT NULL REFERENCES core_org.operators(id) ON DELETE RESTRICT,
* `assessment_type` VARCHAR(50) NOT NULL DEFAULT 'LEASE_TRANSITION',
* `aircraft_registration` VARCHAR(20) NOT NULL,
* `aircraft_msn` VARCHAR(100) NOT NULL,
* `aircraft_model` VARCHAR(100) NOT NULL,
* `lessor` VARCHAR(255) NOT NULL,
* `status` VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS',
* `target_delivery_date` DATE,
* `confrontation_matrix` JSONB NOT NULL DEFAULT '[]'::jsonb,
* `metrics` JSONB NOT NULL DEFAULT '{}'::jsonb,
* `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW(),
* `updated_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

---

### 5.5 Namespace: `evidence_verification` (Evidências Probatórias)

#### Tabela: `evidence_verification.evidence_records`
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `obligation_id` UUID REFERENCES compliance_state.compliance_obligations(id) ON DELETE RESTRICT,
* `evidence_type` VARCHAR(50) NOT NULL, -- CRS, LOGBOOK, MAINTENANCE_RECORD, FORM_8130_3, EASA_FORM_1, TEARDOWN_REPORT
* `document_number` VARCHAR(150) NOT NULL,
* `document_date` DATE NOT NULL,
* `authorizing_organization` VARCHAR(255) NOT NULL,
* `signer_name` VARCHAR(255) NOT NULL,
* `signer_license` VARCHAR(100) NOT NULL,
* `verification_status` VARCHAR(50) NOT NULL DEFAULT 'PENDING_VERIFICATION', -- VERIFIED, REJECTED, PENDING_VERIFICATION, REVIEW_REQUIRED
* `verification_score` NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
* `storage_uri` TEXT NOT NULL,
* `sha256_hash` CHAR(64) NOT NULL,
* `mime_type` VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
* `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

#### Tabela: `evidence_verification.maintenance_accomplishments`
Registro formal de ordens de serviço executadas que sustentam a evidência:
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `aircraft_id` UUID NOT NULL REFERENCES fleet_configuration.aircraft_fleet(id) ON DELETE RESTRICT,
* `evidence_id` UUID REFERENCES evidence_verification.evidence_records(id) ON DELETE SET NULL,
* `work_order_number` VARCHAR(100) NOT NULL,
* `accomplished_date` DATE NOT NULL,
* `hours_at_accomplishment` NUMERIC(10, 2) NOT NULL,
* `cycles_at_accomplishment` INT NOT NULL,
* `description_of_work` TEXT NOT NULL,
* `certifying_technician` VARCHAR(255) NOT NULL,
* `mro_facility` VARCHAR(255) NOT NULL

#### Tabela: `evidence_verification.fapt_documents`
Formulário de Análise Preventiva de Termo (laudo pericial oficial CAMO):
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `requirement_id` UUID NOT NULL REFERENCES regulatory_knowledge.compliance_requirements(id) ON DELETE RESTRICT,
* `fapt_number` VARCHAR(100) NOT NULL UNIQUE,
* `ad_number` VARCHAR(100) NOT NULL,
* `authority` VARCHAR(20) NOT NULL,
* `prepared_by` VARCHAR(255) NOT NULL,
* `prepared_date` DATE NOT NULL,
* `approved_by` VARCHAR(255),
* `approved_date` DATE,
* `status` VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, APPROVED, SUPERSEDED
* `applicability_summary` TEXT NOT NULL,
* `method_of_compliance` TEXT NOT NULL,
* `content_sha256` CHAR(64) NOT NULL,
* `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

---

### 5.6 Namespace: `governance_audit` (Decisão Humana e Trilha de Auditoria)

#### Tabela: `governance_audit.audit_trail_events`
Log append-only imutável de eventos operacionais e regulatórios:
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `timestamp` TIMESTAMPTZ NOT NULL DEFAULT NOW(),
* `user_name` VARCHAR(255) NOT NULL,
* `role` VARCHAR(100) NOT NULL,
* `action` VARCHAR(100) NOT NULL,
* `entity_type` VARCHAR(100) NOT NULL,
* `entity_id` VARCHAR(100) NOT NULL,
* `details` TEXT NOT NULL,
* `previous_state` JSONB,
* `new_state` JSONB

#### Tabela: `governance_audit.engineering_decisions_facts`
Decisões formais de engenharia CAMO que constituem base de conhecimento homologada:
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `requirement_id` UUID REFERENCES regulatory_knowledge.compliance_requirements(id) ON DELETE RESTRICT,
* `fact_type` VARCHAR(100) NOT NULL,
* `summary` TEXT NOT NULL,
* `regulatory_basis` TEXT NOT NULL,
* `decided_by` VARCHAR(255) NOT NULL,
* `decided_at` TIMESTAMPTZ NOT NULL DEFAULT NOW(),
* `is_homologated` BOOLEAN NOT NULL DEFAULT TRUE

#### Tabela: `governance_audit.user_questions_clarifications`
Dúvidas técnicas e pedidos de esclarecimento gerados por dados ausentes:
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `obligation_id` UUID REFERENCES compliance_state.compliance_obligations(id) ON DELETE CASCADE,
* `question_text` TEXT NOT NULL,
* `missing_field` VARCHAR(100) NOT NULL,
* `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, ANSWERED, RESOLVED
* `answer_text` TEXT,
* `answered_by` VARCHAR(255),
* `answered_at` TIMESTAMPTZ

#### Tabela: `governance_audit.ai_model_registry`
Inventário e controle de versões de modelos de IA autorizados:
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `model_identifier` VARCHAR(100) NOT NULL UNIQUE, -- models/gemini-3.8-flash, etc.
* `display_name` VARCHAR(150) NOT NULL,
* `homologation_status` VARCHAR(50) NOT NULL DEFAULT 'HOMOLOGATED', -- HOMOLOGATED, EXPERIMENTAL, PREVIEW, DEPRECATED
* `temperature` NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
* `max_tokens` INT NOT NULL DEFAULT 8192,
* `supports_thinking` BOOLEAN NOT NULL DEFAULT TRUE,
* `is_primary` BOOLEAN NOT NULL DEFAULT FALSE

#### Tabela: `governance_audit.ai_execution_traces`
Auditoria completa de chamadas à IA para preservação de rastreabilidade regulatória:
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(),
* `model_identifier` VARCHAR(100) NOT NULL REFERENCES governance_audit.ai_model_registry(model_identifier),
* `execution_type` VARCHAR(100) NOT NULL, -- AD_EXTRACTION, SB_EXTRACTION, RETRY_FALLBACK
* `input_document_sha256` CHAR(64),
* `duration_ms` INT NOT NULL,
* `prompt_tokens` INT,
* `candidates_tokens` INT,
* `extracted_payload` JSONB NOT NULL,
* `fallback_occurred` BOOLEAN NOT NULL DEFAULT FALSE,
* `error_message` TEXT,
* `executed_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

---

## 6. DIAGRAMA ENTIDADE-RELACIONAMENTO (ER)

```
 [core_org.operators] 1 ────────── N [core_org.users]
         │
         │ 1
         │
         ▼ N
 [fleet_configuration.aircraft_fleet] 1 ──── N [fleet_configuration.aircraft_engines]
         │                              1 ──── N [fleet_configuration.component_installations] ──── N [components]
         │                              1 ──── N [fleet_configuration.installed_software]
         │                              1 ──── N [fleet_configuration.configuration_event_ledger]
         │
         │ 1
         │
         ▼ N
 [compliance_state.compliance_obligations] 1 ──── 1 [compliance_state.due_date_schedules]
         │                                 1 ──── N [compliance_state.obligation_state_transitions]
         │                                 1 ──── N [evidence_verification.evidence_records]
         │
         ▲ N
         │
         │ 1
 [regulatory_knowledge.compliance_requirements] 1 ──── 1 [regulatory_knowledge.applicability_rules]
         │                                      1 ──── N [regulatory_knowledge.mandated_actions]
         │                                      1 ──── N [evidence_verification.fapt_documents]
         │
         ▲ N
         │
         │ 1
 [regulatory_knowledge.regulatory_ad_documents] 1 ──── N [compliance_state.camo_regulatory_register]
         │
         │ 1
         │
         ▼ N
 [regulatory_knowledge.ad_sb_dependencies] N ──── 1 [regulatory_knowledge.technical_references_sb]
                                                                     │
                                                                     │ 1
                                                                     ▼ 1
                                                    [regulatory_knowledge.sb_analysis_checklists]

──────────────────────────────────────────────────────────────────────────────────────────
 [governance_audit.audit_trail_events]           ◄── Observa todas as entidades (Append-Only)
 [governance_audit.ai_execution_traces]          ◄── Vinculado a document_sha256 e AI Model
 [governance_audit.engineering_decisions_facts]  ◄── Vinculado a requirements
```

---

## 7. MAPEAMENTO: `camo_db.json` (35 CHAVES) ➔ POSTGRESQL

| # | Chave em `camo_db.json` | Tipo Atual | Entidade Relacional Alvo | Namespace / Tabela SQL | Justificativa Arquitetural |
| :- | :--- | :--- | :--- | :--- | :--- |
| 1 | `operator` | Object | Operator | `core_org.operators` | Entidade mestra de organização e isolamento multi-tenant. |
| 2 | `currentUser` | Object | UserProfile | `core_org.users` | Identificação de signatário técnico e controle de permissões RBAC. |
| 3 | `aircraft` | Array | Aircraft | `fleet_configuration.aircraft_fleet` | Tabela central de células com horas, ciclos e status de aeronavegabilidade. |
| 4 | `engines` | Array | Engine | `fleet_configuration.aircraft_engines` | Rastreabilidade de motores por ESN e posições físicas de asa/cauda/APU. |
| 5 | `components` | Array | Component | `fleet_configuration.aircraft_components` | Inventário físico de componentes rotáveis e peças de vida limite (LLP). |
| 6 | `installations` | Array | ComponentInstallation | `fleet_configuration.component_installations` | Ledger de associação componente ↔ aeronave com histórico de horas TSN. |
| 7 | `installedSoftware` | Array | InstalledSoftwareRecord | `fleet_configuration.installed_software` | Rastreabilidade de softwares embarcados aviônicos (DO-178C). |
| 8 | `actionAccomplishments` | Array | MaintenanceActionAccomplishment | `evidence_verification.maintenance_accomplishments` | Ordens de serviço e intervenções de manutenção executadas por técnicos. |
| 9 | `configurationHistory` | Array | AircraftConfigurationHistoryRecord | `fleet_configuration.configuration_event_ledger` | Trilha de auditoria das mutações físicas da frota (instalação/remoção). |
| 10 | `requirements` | Array | ComplianceRequirement | `regulatory_knowledge.compliance_requirements` | Requisitos técnicos mandatórios extraídos de ADs. |
| 11 | `assessments` | Array | ComplianceAssessment | `compliance_state.compliance_obligations` | Estado de conformidade de requisitos na frota normalizado em obrigações. |
| 12 | `obligations` / `complianceObligations` | Array | ComplianceObligation | `compliance_state.compliance_obligations` | Obrigações ativas de cumprimento com máquina formal de 13 estados. |
| 13 | `evidence` | Array | Evidence | `evidence_verification.evidence_records` | Pacotes probatórios de cumprimento (CRS, Form 8130-3, Diário de Bordo). |
| 14 | `questions` | Array | UserQuestion | `governance_audit.user_questions_clarifications` | Perguntas de engenharia geradas quando faltam dados de configuração. |
| 15 | `knowledgeFacts` | Array | KnowledgeFact | `governance_audit.engineering_decisions_facts` | Conhecimento tácito e fatos regulatórios homologados por engenheiros. |
| 16 | `auditTrail` | Array | AuditTrailEntry | `governance_audit.audit_trail_events` | Log append-only de segurança, mutações de estado e compliance. |
| 17 | `fapts` / `faptDocuments` | Array | FAPTDocument | `evidence_verification.fapt_documents` | Laudos periciais FAPT gerados e assinados por engenheiros habilitados. |
| 18 | `acquiredDocuments` | Array | OfficialDocumentRecord | `regulatory_knowledge.regulatory_ad_documents` | Metadados e hashes de documentos oficiais adquiridos de fontes externas. |
| 19 | `discoveryRecords` | Array | RegulatoryDiscoveryRecord | `compliance_state.camo_regulatory_register` | Registros de varredura e triagem operacional de fontes regulatórias. |
| 20 | `screeningAssessments` | Array | RegulatoryScreeningAssessment | `compliance_state.compliance_obligations` | Avaliações preliminares de aplicabilidade por aeronave. |
| 21 | `pipelineExecutions` | Array | CompliancePipelineExecution | `governance_audit.audit_trail_events` | Execuções em lote do pipeline regulatório com telemetria detalhada. |
| 22 | `deliveryAssessments` | Array | AircraftDeliveryAssessment | `compliance_state.aircraft_delivery_assessments` | Sandbox de devolução/aquisição de aeronaves sem contaminação da frota. |
| 23 | `adCandidates` | Array | RegulatoryAdCandidate | `compliance_state.camo_regulatory_register` | Candidatas descobertas aguardando importação para o Register. |
| 24 | `regulatoryKnowledgeBase` | Array | RegulatoryKnowledgeItem | `regulatory_knowledge.compliance_requirements` | Base de conhecimento técnico compilada por família e modelo de aeronave. |
| 25 | `configurationAssessments` | Array | AircraftConfigurationAssessment | `compliance_state.compliance_obligations` | Avaliação da completude física de configuração para cada aeronave. |
| 26 | `camoRegulatoryRegister` | Array | CamoRegulatoryRecord | `compliance_state.camo_regulatory_register` | Registro formal do CAMO com fila de análise técnica e status de completude. |
| 27 | `aiOrchestratorConfig` | Object | AiOrchestratorConfig | `governance_audit.ai_model_registry` | Configurações ativas de modelo primário, fallback e políticas de temperatura. |
| 28 | `aiExecutionTraces` | Array | AiExecutionTrace | `governance_audit.ai_execution_traces` | Auditoria de chamadas ao Gemini AI com payloads, tokens e duração. |
| 29 | `discoveredAiModels` | Array | DiscoveredAiModel | `governance_audit.ai_model_registry` | Modelos de IA descobertos via API e catálogo de compatibilidade. |
| 30 | `sbRepository` | Array | ServiceBulletinDocumentRecord | `regulatory_knowledge.technical_references_sb` | Repositório digital de PDFs e metadados de Boletins de Serviço. |
| 31 | `adSbDependencies` | Array | AdSBDependency | `regulatory_knowledge.ad_sb_dependencies` | Tabela relacional de vínculo mandatório AD ↔ SB e método de cumprimento. |
| 32 | `sbAnalyses` | Array | EssentialSbAnalysis | `regulatory_knowledge.sb_analysis_checklists` | Análises estruturadas de SB com itens de checklist e peças de reposição. |
| 33 | `adSbCrossValidations` | Array | AdSbCrossValidationResult | `compliance_state.camo_regulatory_register` (coluna `analysis_completeness`) | Validação cruzada de consistência técnica entre termos da AD e do SB. |
| 34 | `adCompletenessAssessments` | Object | AdAnalysisCompletenessAssessment | `compliance_state.camo_regulatory_register` (coluna `analysis_completeness`) | Avaliações do gatekeeper de 7 passos determinísticos de análise da AD. |
| 35 | `lastSuccessfulScan` | String | Timestamp | `compliance_state.camo_regulatory_register` | Timestamp da última varredura bem-sucedida de intake de frota. |

---

## 8. MATRIZ DE CLASSIFICAÇÃO DE DADOS

| Entidade Relacional | Tipo Funcional | Reutilizável | Contextual | Versionada | Auditada | Política de Preservação |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `operators` | Configuração | Não | Sim | Não | Sim | Permanente; atualização controlada. |
| `users` | Governança | Não | Sim | Não | Sim | Permanente; desativação lógica (`is_active = false`). |
| `regulatory_ad_documents` | Conhecimento | **Sim** | Não | **Sim** | Sim | Imutável por hash/revisão; retenção permanente. |
| `technical_references_sb` | Conhecimento | **Sim** | Não | **Sim** | Sim | Imutável por hash/revisão; retenção permanente. |
| `ad_sb_dependencies` | Conhecimento | **Sim** | Não | **Sim** | Sim | Relação canônica imutável. |
| `compliance_requirements` | Conhecimento | **Sim** | Não | **Sim** | Sim | Reutilizável entre todas as aeronaves elegíveis. |
| `applicability_rules` | Conhecimento | **Sim** | Não | **Sim** | Sim | Avaliada deterministicamente pelo Rule Engine. |
| `mandated_actions` | Conhecimento | **Sim** | Não | **Sim** | Sim | Especificação das tarefas de manutenção. |
| `sb_analysis_checklists` | Conhecimento | **Sim** | Não | **Sim** | Sim | Checklist de tarefas validado por engenheiro. |
| `aircraft_fleet` | Configuração | Não | Sim | Sim | Sim | Histórico de horas, ciclos e status de voo. |
| `aircraft_engines` | Configuração | Não | Sim | Sim | Sim | Rastreabilidade de ESN em posições de asa. |
| `aircraft_components` | Configuração | Não | Sim | Sim | Sim | Rastreabilidade de P/N e S/N de rotáveis e LLPs. |
| `component_installations` | Configuração | Não | Sim | Sim | Sim | Histórico de montagem e desmontagem (Ledger). |
| `installed_software` | Configuração | Não | Sim | Sim | Sim | Versões homologadas de FLS e DO-178C. |
| `configuration_event_ledger`| Histórico | Não | Sim | Sim | Sim | Append-Only; histórico forense inalterável. |
| `camo_regulatory_register` | Estado | Não | Sim | Sim | Sim | Intake de ADs por operador e fila de análise. |
| `compliance_obligations` | Estado | Não | Sim | Sim | Sim | Obrigação viva com máquina de 13 estados. |
| `due_date_schedules` | Estado | Não | Sim | Sim | Sim | Recalculado a cada incremento de FH/FC/Data. |
| `obligation_state_transitions`| Histórico | Não | Sim | Não | Sim | Append-Only; transições regulatórias. |
| `aircraft_delivery_assessments`| Sandbox | Não | Sim | Sim | Sim | Isolado da frota ativa; exportável para Lessor. |
| `evidence_records` | Evidência | Não | Sim | Sim | Sim | Selado com hash SHA-256 e assinatura de técnico. |
| `maintenance_accomplishments`| Evidência | Não | Sim | Não | Sim | Ordens de serviço executadas em MRO/Hangar. |
| `fapt_documents` | Evidência | Não | Sim | Sim | Sim | Laudo pericial formal assinado por engenheiro. |
| `audit_trail_events` | Auditoria | Não | Sim | Não | Sim | Append-Only; rastreabilidade de todas as ações. |
| `engineering_decisions_facts`| Decisão Humana | **Sim** | Parcial | Sim | Sim | Fatos e interpretações aprovadas por engenheiro. |
| `user_questions_clarifications`| Decisão Humana | Não | Sim | Sim | Sim | Respostas técnicas a dados de configuração faltantes. |
| `ai_model_registry` | Governança | Sim | Não | Sim | Sim | Catálogo de modelos de IA homologados. |
| `ai_execution_traces` | Auditoria | Não | Sim | Não | Sim | Tracing de IA para conformidade regulatória. |

---

## 9. VERSIONAMENTO E IMUTABILIDADE

No setor aeronáutico, a publicação de uma nova revisão de uma Diretriz de Aeronavegabilidade (ex: FAA AD 2020-24-02 para AD 2020-24-02R1) ou Boletim de Serviço **NÃO substitui silenciosamente o registro anterior**. Ela cria um novo registro de versão que referencia a versão superada:

```
                      [AD Revision 0]
                   status: 'SUPERSEDED'
                   superseded_by: 'Rev 1'
                            ▲
                            │
              supersedes_ad_number: 'Rev 0'
                            │
                      [AD Revision 1]
                    status: 'ACTIVE'
                            ▲
                            │
              supersedes_ad_number: 'Rev 1'
                            │
                      [AD Revision 2]
                    status: 'IN_ANALYSIS'
```

### Regras Estritas de Versionamento:
1. **Imutabilidade de Documento Analisado:** Uma vez que `regulatory_knowledge.regulatory_ad_documents` possui status `ACTIVE` ou `SUPERSEDED`, seus campos normativos (`ad_number`, `authority`, `raw_text`, `document_sha256`) são estritamente **read-only**.
2. **Reanálise e Supersedência:** A emissão de nova revisão cria um novo `ad_document_id`. As `compliance_obligations` existentes mantêm o histórico da Rev 0 e geram uma transição regulatória formal para a Rev 1 (com análise de ações de término ou crédito por incorporação prévia).
3. **Imutabilidade do Laudo FAPT:** O laudo pericial `fapt_documents` possui hash SHA-256 de seu conteúdo. Uma vez aprovado (`status = 'APPROVED'`), ele nunca é editado; alterações exigem a emissão de uma revisão suplementar (`FAPT-2026-99-88-001-R1`).
4. **Append-Only no Audit Trail e Ledger:** Tabelas de log (`audit_trail_events`, `obligation_state_transitions`, `configuration_event_ledger`) não possuem permissão de `UPDATE` ou `DELETE` no banco de dados.

---

## 10. REUTILIZAÇÃO DA ANÁLISE VS REAVALIAÇÃO DA FROTA

Um dos pilares mais críticos da arquitetura é a **separação entre a análise técnica de engenharia e o cálculo de aplicabilidade da frota**:

```text
                                  AD RECEBIDA NO CAMO
                                           │
                                           ▼
                       Existe no regulatory_knowledge.regulatory_ad_documents
                                 com o mesmo SHA-256 e Revisão?
                                   /                       \
                                 SIM                        NÃO
                                 /                            \
                  [REUTILIZAR CONHECIMENTO]         [EXECUTAR ANÁLISE TÉCNICA]
                  Carrega Requirements, Actions,     Extração IA (Gemini) + Rule Engine
                  Thresholds e SBs analisados.       + Homologação CAMO. Persiste no
                                │                    regulatory_knowledge.
                                │                              │
                                └──────────────┬───────────────┘
                                               │
                                               ▼
                              [CRUZAR COM CONFIGURAÇÃO DA FROTA]
                               Apenas reavalia regras booleanas contra
                               aeronaves, motores e componentes ativos.
                                               │
                                               ▼
                              [GERAR/ATUALIZAR OBRIGAÇÕES (13 ESTADOS)]
                               Cria ComplianceObligations específicas
                               por aeronave e calcula limites 3D.
```

* **Benefício:** Se o operador adicionar 10 novas aeronaves Boeing 737-800 à frota, **nenhuma chamada de IA é disparada**. O sistema reutiliza o conhecimento já consolidado no `regulatory_knowledge` e apenas executa o cruzamento booleano local para gerar as `compliance_obligations` das 10 novas matrículas em milissegundos.

---

## 11. INDEPENDÊNCIA REGULATÓRIA: O BANCO NÃO INFERE AERONAVEGABILIDADE

O banco de dados armazena **fatos, evidências, estados e carimbos de validação**. O banco **NUNCA** deve conter triggers, constraints ou views com regras implícitas que presumam status de aeronavegabilidade:

```text
❌ PROIBIDO NO BANCO:
  IF (obligation.status = 'OVERDUE') THEN aircraft.is_airworthy = FALSE;
  IF (evidence.verification_status = 'VERIFIED') THEN obligation.status = 'COMPLIED';

✅ CORRETO NO CAMO ENGINE:
  O banco armazena o fato (due_date = '2026-10-01', current_hours = 12600, limit_hours = 12500).
  O FleetAirworthinessControlEngine (motor determinístico em TypeScript) avalia as regras
  regulatórias e calcula explicitamente o status de aeronavegabilidade com auditoria formal.
```

---

## 12. ESTRATÉGIA DE MIGRAÇÃO: `camo_db.json` ➔ POSTGRESQL

A migração futura do arquivo `data/camo_db.json` para o PostgreSQL deve ser executada através de um script de migração determinístico estruturado em 7 etapas:

```text
[1. Carregamento e Validação Estrutural do JSON]
   Validação de schema via Zod/TypeScript dos 35 nós de camo_db.json.
       │
       ▼
[2. Normalização e Deduplicação de Conhecimento]
   Identificação de ADs, Requisitos e SBs redundantes. Resolução de canonicalAdId.
       │
       ▼
[3. Resolução de Identidades e Mapeamento de Chaves Primárias]
   Geração de UUIDv7 determinísticos baseados nas chaves naturais para preservar links.
       │
       ▼
[4. Carga Transacional dos Schemas em Ordem Topológica de FKs]
   core_org ➔ regulatory_knowledge ➔ fleet_configuration ➔ compliance_state ➔ evidence ➔ audit.
       │
       ▼
[5. Tratamento Explícito de Dados Históricos Conflitantes (LEGACY_DATA_CONFLICT)]
   Registros sem FK válida são isolados em tabela de quarentena com log explicativo.
       │
       ▼
[6. Validação de Consistência e Reconciliação Contábil]
   Contadores antes vs depois (ex: contagem de aeronaves, requisitos e obrigações conferem 1:1).
       │
       ▼
[7. Transição do Modo de Operação (Cutover)]
   Ativação do PostgresRepositoryAdapter e arquivamento do camo_db.json como backup frio.
```

### Tratamento de Conflitos Legados (`LEGACY_DATA_CONFLICT`):
Se um registro no `camo_db.json` referenciar um componente inexistente ou requisito incompleto, o migrador **não corrige silenciosamente**. O registro é inserido com flag `migration_status = 'LEGACY_DATA_CONFLICT'`, acompanhado de um evento no `audit_trail_events` exigindo revisão do Engenheiro Chefe CAMO.

---

## 13. ANÁLISE: FIREBASE SQL CONNECT + CLOUD SQL POSTGRESQL

O Google Cloud Platform e Firebase oferecem suporte ao PostgreSQL através do **Cloud SQL for PostgreSQL** integrado opcionalmente com o **Firebase Data Connect (Firebase SQL Connect)**:

### Características da Solução:
1. **Cloud SQL PostgreSQL:** Instância nativa gerenciada de PostgreSQL (versões 15, 16 ou 17) no Google Cloud, com suporte completo a DDL relacional, transações ACID, extensões (`uuid-ossp`, `pgcrypto`, `pgvector`, `pg_trgm`), réplicas de leitura, backups automatizados e criptografia com chaves gerenciadas pelo cliente (CMEK).
2. **Firebase Data Connect / SQL Connect:** Ferramenta que expõe esquemas PostgreSQL através de consultas fortemente tipadas e mutações seguras via SDKs Firebase, conectando diretamente à instância Cloud SQL.

### Avaliação Técnica para o CAMO Engine:
* **Compatibilidade com Domínio CAMO:** Alta. Por ser um PostgreSQL autêntico no Cloud SQL, todas as 28 tabelas, índices parciais e tipos `JSONB` propostos são 100% suportados.
* **Risco de Vendor Lock-In:** Baixo se o acesso for mediado por uma camada Repository / DAL. Se os serviços do CAMO Engine se comunicarem com o banco através de interfaces padrão de repositório (`IComplianceObligationRepository`, `IRegulatoryRegisterRepository`), o driver subjacente pode ser o driver PostgreSQL padrão (`pg` ou `postgres.js`) conectado ao Cloud SQL via Cloud SQL Auth Proxy, sem acoplamento a APIs exclusivas do Firebase.
* **Recomendação Arquitetural:** Utilizar o Cloud SQL PostgreSQL como motor de banco de dados relacional principal. Manter a porta aberta para Firebase Data Connect no frontend se necessário para consultas em tempo real, mas manter o backend CAMO operando via pool de conexões padrão PostgreSQL.

---

## 14. DECISÃO ARQUITETURAL SOBRE PRISMA

### Avaliação:
* **Vantagens do Prisma:** Tipagem gerada a partir do `schema.prisma`, facilidade de migrações (`prisma migrate`), sintaxe intuitiva para desenvolvedores TypeScript.
* **Desvantagens no Contexto CAMO Engine:**
  1. *Camada Adicional de Abstração:* O Prisma Client introduz um runtime Rust em WebAssembly/binário que pode gerar atrito em ambientes conteinerizados do Cloud Run e edge computing.
  2. *Suporte a Esquemas Múltiplos (Multi-Schema):* A separação ontológica do CAMO Engine em 6 schemas (`core_org`, `regulatory_knowledge`, etc.) possui suporte limitado ou complexo no Prisma tradicional.
  3. *Performance em Consultas de Engenharia:* Consultas analíticas complexas com joins heterogêneos, índices GIN em JSONB e expressões CTE recursivas exigem `$queryRaw`, anulando a tipagem estática do Prisma.
  4. *Portabilidade e Simplicidade:* Query builders puros como **Kysely** ou conexões tipadas diretas com **Drizzle ORM** oferecem TypeScript nativo sem binários externos, compilação de SQL sem overhead e controle total sobre cada instrução enviada ao PostgreSQL.

### Decisão Formal:
> **`DO NOT USE PRISMA NOW`**  
> **Justificativa:** O projeto deve adotar uma camada de Repositórios com SQL tipado nativo ou Drizzle/Kysely na fase de implementação física. Isso elimina dependências binárias nativas pesadas, garante compatibilidade total com múltiplos schemas PostgreSQL e preserva transparência absoluta para auditorias regulatórias de código.

---

## 15. ESTRATÉGIA DE PORTABILIDADE (REPOSITORY LAYER)

Para garantir que o CAMO Engine possa rodar inicialmente em Cloud SQL / Firebase e, se necessário no futuro, migrar para Supabase, AWS RDS, Neon ou infraestrutura local (On-Premises), toda persistência deve ser isolada atrás de interfaces de repositório:

```
┌────────────────────────────────────────────────────────┐
│            CAMO Domain & Deterministic Engines         │
│  (RegulatoryIntelligenceEngine, RuleEngine, DueDate)   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             Repository Interfaces (Domain)             │
│  IRegulatoryAdRepository, IObligationRepository, etc.  │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────────────┐ ┌───────────────────────┐
│ InMemoryJsonAdapter (Atual)  │ │ PostgresAdapter (Novo)│
│       data/camo_db.json      │ │   Pool 'pg' / CloudSQL│
└──────────────────────────────┘ └───────────┬───────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
             [Cloud SQL PostgreSQL]                      [Qualquer PostgreSQL]
            (Firebase Connect Ready)                      (AWS RDS / On-Premise)
```

Nenhum arquivo de motor de regras (`ruleEngine.ts`, `dueDateThresholdEngine.ts`, etc.) conterá referências diretas a drivers de banco de dados ou queries SQL.

---

## 16. ESTRATÉGIA DE SEGURANÇA E ACESSO

1. **Princípio do Menor Privilégio (Least Privilege):**
   * O usuário da aplicação no PostgreSQL possui apenas permissões de `SELECT`, `INSERT`, `UPDATE` nas tabelas operacionais.
   * Nas tabelas de log (`audit_trail_events`, `configuration_event_ledger`), o usuário não possui permissão de `UPDATE` ou `DELETE`.
   * Permissões de DDL (`ALTER`, `DROP`, `CREATE`) são restritas ao usuário de migração (`camo_migrator`), que roda apenas durante deploys.
2. **Gerenciamento de Segredos e Credenciais:**
   * Conexões protegidas via variáveis de ambiente (`DATABASE_URL`, `PGHOST`, `PGUSER`, `PGPASSWORD`) injetadas via Google Secret Manager no Cloud Run.
   * Nenhuma credencial física ou string de conexão no código-fonte.
3. **Isolamento de Redes e Conectividade:**
   * Conexão via Cloud SQL Auth Proxy com criptografia TLS 1.3 mútua (mTLS) e IPs privados em VPC (sem expor porta 5432 na internet pública).
4. **Isolamento Multi-Tenant:**
   * Todas as consultas a frotas e obrigações filtram obrigatoriamente por `operator_id` (com possibilidade futura de Row-Level Security - RLS).

---

## 17. ESTRATÉGIA DE TESTABILIDADE

1. **Testes Unitários de Domínio:** Continuam executando em memória utilizando o `MockRepositoryAdapter` ou `camoDb` em memória, com tempo de execução de milissegundos e sem dependência de rede externa.
2. **Testes de Integração de Repositório:** Executam contra uma instância local temporária de PostgreSQL via Docker (`testcontainers` ou container local de desenvolvimento).
3. **Testes de Migração e Idempotência:** Suíte que executa `resetToSeed()`, converte os dados legados para SQL, insere em transação com rollback e valida a paridade de 100% das entidades e integridade referencial.

---

## 18. COMPATIBILIDADE FUTURA COM IA (`FUTURE_EXPLORATORY`)

Embora fora de escopo para implementação nesta fase, o modelo relacional proposto foi concebido com total prontidão arquitetural para extensões futuras de IA:
* **Extensão `pgvector`:** A tabela `regulatory_knowledge.regulatory_ad_documents` e `technical_references_sb` já comportam colunas futuras de embeddings (`embedding vector(768)` ou `vector(1536)`) para busca semântica em manuais e parágrafos normativos.
* **Compatibilidade com RAG (Retrieval-Augmented Generation):** A rastreabilidade de parágrafos mandatórios (`paragraph_reference`) e textos brutos preserva a granularidade necessária para chunking e geração de respostas contextualizadas com citação exata de normas.
* **Integração com MCP (Model Context Protocol):** A camada de repositório padronizada facilita a criação de ferramentas MCP que expõem o estado da frota de forma segura para agentes de auditoria.

---

## 19. REGISTRO FORMAL DE RISCOS (RISK REGISTER)

| ID | Descrição do Risco | Severidade | Probabilidade | Estratégia de Mitigação Arquitetural |
| :--- | :--- | :---: | :---: | :--- |
| **RSK-01** | Inconsistência de chaves estrangeiras em dados legados do `camo_db.json`. | Média | Alta | Isolamento em tabela de quarentena com status `LEGACY_DATA_CONFLICT` e auditoria explícita. |
| **RSK-02** | Duplicação de Diretrizes durante importações simultâneas de múltiplos operadores. | Alta | Média | Unique constraint estrita `(authority, ad_number, revision)` e idempotência no `importCandidatesToCamoRegister`. |
| **RSK-03** | Degradação de performance na avaliação diária de vencimentos da frota. | Média | Baixa | Índices compostos parciais nas obrigações (`WHERE status = 'OPEN'`) e desacoplamento do cálculo 3D. |
| **RSK-04** | Vendor lock-in em infraestrutura proprietária do Firebase. | Alta | Baixa | Adoção do padrão Repository com drivers padrão PostgreSQL (`pg`), permitindo migração para qualquer host SQL. |
| **RSK-05** | Destruição acidental de trilha histórica por deleção em cascata. | Crítica | Baixa | Chaves estrangeiras com `ON DELETE RESTRICT` nas tabelas fundamentais de aeronaves, requisitos e evidências. |
| **RSK-06** | Complexidade excessiva no desenvolvimento local sem conexão à nuvem. | Média | Média | Suporte a `docker-compose.yml` para desenvolvimento local com PostgreSQL padrão e migrations versionadas. |

---

## 20. PROPOSTA DA PRÓXIMA FASE: FASE 3D

Com a aprovação da arquitetura de persistência na Fase 3C, a próxima fase recomendada é:

### **FASE 3D — IMPLEMENTAÇÃO DO REPOSITORY LAYER & BANCO RELACIONAL**
1. **Etapa 1:** Criação da camada de abstração de Repositórios (`server/repositories/`) no backend, desacoplando `camoDb` dos endpoints.
2. **Etapa 2:** Criação dos scripts de migração DDL PostgreSQL (`migrations/001_initial_schema.sql`) para criação dos 6 schemas e 28 tabelas.
3. **Etapa 3:** Implementação do script de ETL de carga do `camo_db.json` com validação de consistência e quarentena de dados legados.
4. **Etapa 4:** Configuração da suíte de testes de integração com banco relacional e validação dos 187 testes existentes em modo de persistência dupla.

---
**Fim do Documento Canônico de Arquitetura de Persistência**
