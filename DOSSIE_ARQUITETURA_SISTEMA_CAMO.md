# DOSSIÊ EXECUTIVO DE ARQUITETURA DE SISTEMA & ENGENHARIA CAMO
## Airworthiness Compliance Intelligence Platform (PROJETO CAMO)
**Documento Técnico Oficial de Arquitetura Viva, Engenharia de Software e Conformidade Regulatória**

---

### METADADOS DO SISTEMA
* **Nome do Sistema:** Airworthiness Compliance Intelligence (CAMO Intelligence Platform)
* **Operador de Demonstração:** Blue-Sky Logistics (Certificado Homologado CAMO-PT.042)
* **Regulamentações Alvo:** FAA 14 CFR Part 39 / EASA Part-M (Subpart G/CAMO) / ANAC RBAC 121 & RBAC 39
* **Versão da Arquitetura:** Release 9.5.2 (Active Living Architecture, Fleet Management CRUD, Decommissioning Engine & Adversarial Security Core)
* **Data do Dossiê:** 14 de Setembro de 2026
* **Status Formal de Homologação:** **GREEN — 100% AUDITADO & HOMOLOGADO** (128/128 Testes Vitest Automatizados Aprovados em 12 Suítes)
* **Estrutura Auditada:** 27 Visões Frontend, 14 Submódulos de Backend, mais de 73 Endpoints REST, Persistência Transacional com Atomic Write.

---

## 1. SUMÁRIO EXECUTIVO & PRINCÍPIOS ZERO DE ENGENHARIA AERONÁUTICA

O **Airworthiness Compliance Intelligence** é uma plataforma de engenharia de software aeronáutico concebida para blindar o controle de aeronavegabilidade continuada (*Continuing Airworthiness Management Organization* — CAMO).

A plataforma opera sob 5 Princípios Invioláveis de Segurança Operacional:

### 1.1 Tripartição Estrita de Responsabilidade
1. **Inteligência Artificial (Gemini 3.7 Flash):** Atua exclusivamente na **extração, leitura e estruturação de documentos técnicos complexos e não estruturados** (PDFs de Diretrizes de Aeronavegabilidade — ADs, Boletins de Serviço — SBs e Notificações Regulatórias), convertendo linguagem natural em esquemas JSON tipados. **A IA nunca declara conformidade, aplicabilidade ou liberação de voo de forma autônoma**. Falhas ou ausências na extração acionam fallbacks determinísticos e encaminham para revisão humana.
2. **Motor de Regras Determinístico (CAMO Rule Engine V2):** Executa **lógica booleana e matemática estrita** contra a base física de dados da frota do operador. Cruza fabricantes, modelos canônicos, faixas de números de série (MSN/ESN), part numbers (P/Ns) de rotáveis e modificações. Sob ausência de dados, a regra mandatória é: *Falta de informação gera `REVIEW_REQUIRED`, jamais `NOT_APPLICABLE`*.
3. **Engenheiro CAMO Humano:** Mantém a **autoridade regulatória exclusiva e final**. Avalia a Fila de Análise, responde a questionamentos técnicos gerados pelo sistema mediante evidências documentais (cadernetas, Form 8130-3, EASA Form 1), consolida a memória técnica (*Knowledge Facts*) e chancela digitalmente as Folhas de Análise e Parecer Técnico (FAPT).

### 1.2 Princípio de Não-Invenção e Não-Inferência
O sistema é matematicamente proibido de inferir ou presumir dados não atestados:
* Horas de voo (FH), ciclos (FC), números de série (MSN/ESN), status de modificações ou datas de cumprimento nunca são fabricados.
* Na falta de dados, a diretiva assume o fail-safe seguro: `REVIEW_REQUIRED` (com código `INSUFFICIENT_DATA` ou `DATA_INTEGRITY_REVIEW`).

### 1.3 Isolamento Estrito de Entidades e Frotas
* Dados de uma aeronave (Aircraft A) **nunca** poluem, afetam ou determinam obrigações de outra aeronave (Aircraft B), mesmo pertencendo à mesma família ou operador.
* Frotas de operadores distintos são segregadas por `operatorId`.
* Aeronaves em processo de pré-entrega/arrendamento (Delivery Sandbox) operam em ambiente computacional isolado e **nunca** interferem no controle operacional da frota ativa.

### 1.4 Invariante de Evidência Mandatória para Cumprimento
* A transição de qualquer obrigação de conformidade para o estado `COMPLIED` **exige obrigatoriamente evidência probatória técnica verificada** (`verified === true`).
* Tentativas de forçar cumprimento sem evidência são sumariamente rejeitadas pelo motor de estados (`TRANSITION_REJECTED`).

### 1.5 Desacoplamento entre Compliance Regulatório e Determinação Operacional de Voo
* Um status regulatório (ex: `OVERDUE`) **não** suspende voo automaticamente sem regra jurídica ou técnica autorizada (*14 CFR § 39.7 / RBAC 39*).
* Na ausência de regra explícita ou disposição humana, o sistema adota o estado fail-safe seguro `NOT_DETERMINED` com `canFly: null`.
* O cumprimento da frota segue o **Princípio da Não-Diluição**: uma única aeronave não conforme impede a frota de ser declarada em conformidade integral (`FLEET_CRITICAL_NON_COMPLIANT`).

### 1.6 Modelo de Governança Viva & Cadeia Documental
A evolução sustentável da engenharia de software da plataforma apoia-se em uma cadeia documental viva, canônica e auditável, onde cada documento cumpre uma função complementar específica:

* **`README.md`** ➔ **Visão Rápida:** Apresentação institucional, problema solucionado, visão de produto e instruções de instalação/execução.
* **`PRODUCT_VISION_ROADMAP.md`** ➔ **Direção Estratégica:** Visão unificada de longo prazo (Maintenance Control + CAMO), limites de escopo e roadmap priorizado (P0/P1/P2/FUTURE).
* **`CAPABILITY_REGISTRY.md`** ➔ **Catálogo Canônico de Capacidades:** Registro formal de cada capacidade (`CAP-001` a `CAP-026`), com versões, status real auditado, submódulos e cobertura de testes (incluindo `CAP-025: Fleet Asset Management CRUD` e `CAP-026: Living Governance Chain`).
* **`DOSSIE_ARQUITETURA_SISTEMA_CAMO.md`** ➔ **Arquitetura e Comportamento:** Especificação técnica profunda, topologia de submódulos, catálogo de endpoints REST e invariantes de missão crítica (Release 9.5.2).
* **`AI_DEVELOPMENT_GUIDE.md`** ➔ **Regras para Evolução e Contrato com IA:** Diretrizes operacionais obrigatórias para agentes autônomos, proibindo arquitetura paralela e mantendo rastreabilidade estrita.

### 1.7 Mapa Visual de Direção do Produto & Maintenance Control

```
CAMO ENGINE (Plataforma Integrada de Engenharia e Confiabilidade)
│
├── REGULATORY INTELLIGENCE
│   ├── Discovery (Descoberta Aberta & Multi-Fonte) ...................... [IMPLEMENTED]
│   ├── Register (CAMO Regulatory Register & Ledger) ..................... [IMPLEMENTED]
│   ├── Analysis (Fila de Análise Técnica de Engenharia) ................. [IMPLEMENTED]
│   └── Knowledge (Knowledge Facts & Memória Reutilizável) ............... [IMPLEMENTED]
│
├── COMPLIANCE
│   ├── Requirement (Extração Estruturada de Parágrafos Mandatórios) ..... [IMPLEMENTED]
│   ├── Applicability (Motor Booleano de 4 Níveis) ....................... [IMPLEMENTED]
│   ├── Obligation (Máquina de 13 Estados de Ciclo de Vida) .............. [IMPLEMENTED]
│   ├── Due Date (Motor 3D de Vencimento: FH, FC e Calendário Exato) ..... [IMPLEMENTED]
│   └── Evidence (Verificação Probatória de 4 Dimensões & SHA-256) ....... [IMPLEMENTED]
│
├── AIRWORTHINESS
│   ├── Compliance Status (Folhas de Análise e Pareceres FAPT) ........... [IMPLEMENTED]
│   └── Operational Airworthiness (Controle da Frota & Não-Diluição) ..... [IMPLEMENTED]
│
├── FLEET
│   ├── Aircraft (Inventário, Edição, Inativação e Descomissionamento) ... [IMPLEMENTED]
│   ├── Configuration (Hierarquia Célula, Modificações e Softwares) ...... [IMPLEMENTED]
│   ├── Engines (Posições 1, 2, APU e Desassociação em Cascata) .......... [IMPLEMENTED]
│   └── Components (Rotáveis P/N, S/N e Histórico de Instalação) ......... [IMPLEMENTED]
│
├── MAINTENANCE CONTROL (PCM / MRO — Controle de Manutenção)
│   ├── Maintenance Program (Programa de Manutenção Aprovado - AMP/MPD) .. [PLANNED]
│   ├── Tasks (Catálogo de Tarefas Preventivas, GVI, DET e Lubrificação) . [PLANNED]
│   ├── Work Orders (Ciclo de Vida de Ordens de Serviço de Manutenção) ... [PLANNED]
│   ├── Records (Diários de Bordo e e-Logbook Integrado) ................. [PLANNED]
│   └── Planning (Alocação de Aeronaves e Planejamento de Hangar) ........ [PLANNED]
│
└── INTEGRATED CAMO
    ├── Maintenance ↔ Compliance (Liquidação de ADs por Eventos no Hangar) [PLANNED]
    ├── Delivery (Sandbox de Reconciliação com Lessors & Selo Digital) .... [IMPLEMENTED]
    └── Operational Airworthiness (Despacho Diário e Prevenção de AOG) ... [IMPLEMENTED]
```

---

## 2. MAPA EVOLUTIVO DAS FASES E CAPACIDADES IMPLEMENTADAS

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             PROJETO CAMO — MAPA EVOLUTIVO GERAL                                  │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│  [FASE 1] FUNDAÇÃO & 3 PILARES                                                                   │
│  ├─ IA Gemini (Extração de PDFs) & Motor de Regras V1 (Booleano)                                  │
│  └─ Knowledge Facts (Memória Técnica Permanente) & Domínio Relacional da Frota                   │
│                                                                                                  │
│  [FASE 2] MOTOR DE REGRAS V2 & GERAÇÃO DE FAPT                                                   │
│  ├─ Modelos Canônicos (B737_NG vs B737_MAX) & Resolução Hierárquica em 4 Níveis                  │
│  └─ Emissão Formal e Assinatura Digital de Folhas de Parecer Técnico (FAPT)                      │
│                                                                                                  │
│  [FASE 3] CONECTORES REGULATÓRIOS OFICIAIS                                                       │
│  ├─ Conexão Live com Federal Register API (FAA 14 CFR Part 39)                                   │
│  └─ Triagem Preliminar de Frota (Scoping Filter) & Reconciliação Multi-Fonte                     │
│                                                                                                  │
│  [FASE 4] COFRE CRIPTOGRÁFICO DE AQUISIÇÃO & SEGURANÇA SSRF                                      │
│  ├─ Aquisição Oficial de PDFs (GovInfo/GPO) & Blindagem Anti-SSRF em 4 Camadas                   │
│  └─ Cofre com Deduplicação SHA-256 e Validação de Assinatura (%PDF-)                             │
│                                                                                                  │
│  [FASE 5.1, 5.2, 5.3] MOTOR DE DESCOBERTA CONTÍNUA & PIPELINE AUTÔNOMO                           │
│  ├─ Varredura Contínua e Proveniência de Metadados (SOURCE_METADATA vs DERIVED_METADATA)          │
│  ├─ Scoping Filter v5.2.1 Determinístico em 3 Vias (POTENTIAL_MATCH / NO_MATCH / INSUFFICIENT)   │
│  └─ Orquestrador de 8 Estágios Atômicos com Curto-Circuito Seguro e Crash Recovery               │
│                                                                                                  │
│  [FASE 6.1, 6.2, 6.3, 6.4] CICLO DE VIDA, TEMPO, EVIDÊNCIAS & AERONAVEGABILIDADE                 │
│  ├─ Máquina de Estados Finita de 13 Estados com Invariante de Evidência Estrita                  │
│  ├─ Due Date Engine (Calendário Exato Anti-Rollover, FH, FC, Ações Repetitivas/Terminatórias)    │
│  ├─ Motor de Verificação de Evidências em 4 Dimensões & Trilha Criptográfica SHA-256             │
│  └─ Fleet Airworthiness Control Engine com Desacoplamento Operacional e Não-Diluição            │
│                                                                                                  │
│  [FASE 7] AIRCRAFT DELIVERY ASSESSMENT (SANDBOX PRÉ-ENTREGA)                                     │
│  ├─ Reconciliação Técnica Lessor vs Operador Pré-Entrega em Sandbox Isolado                       │
│  └─ Laudo de Conformidade e Selo Criptográfico Digital SHA-256                                   │
│                                                                                                  │
│  [FASE 8] HELP CENTER, GUIDED WORKFLOW & MANUAL OPERACIONAL                                      │
│  ├─ Central de Ajuda, Base de Conhecimento e Guided CAMO Workflow em 6 Passos                   │
│  └─ Capability Registry Oficial do Sistema                                                       │
│                                                                                                  │
│  [FASE 9 — ETAPAS 1 A 6] INTELIGÊNCIA REGULATÓRIA, CAMO REGISTER, FROTA & GOVERNANÇA VIVA        │
│  ├─ Etapa 1: Auditoria Inicial de Estado Real do Sistema                                         │
│  ├─ Etapa 2: Core do Ciclo de Vida Regulatório e Máquina de Estados Estrita                      │
│  ├─ Etapa 3: Configuração Real da Aeronave, Rotação de Componentes e Busca por Frota             │
│  ├─ Etapa 4: Plataforma de Inteligência Regulatória, Matriz de 5 Estados e Checklist de Lacunas │
│  ├─ Etapa 5 & 5.1: CAMO Regulatory Register, Inventário Unificado de ADs da Frota e Delivery     │
│  ├─ Etapa 5.2: Arquitetura Operacional de UX centrada em Inteligência & Lacunas                  │
│  └─ Etapa 6: Governança Viva, Auditoria do Estado Real, Testes Adversariais e Dossiê Completo   │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. OS TRÊS FLUXOS DE INGESTÃO E PROCESSAMENTO DE DIRETRIZES

O sistema CAMO possui exatamente três fluxos distintos e complementares de entrada e processamento de Diretrizes de Aeronavegabilidade:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               OS 3 FLUXOS DE INGESTÃO DO SISTEMA CAMO                             │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│  [FLUXO 1: UPLOAD MANUAL AVULSO]                                                                │
│  Upload PDF / Texto ──► Gemini Extractor ──► Estruturação Req ──► Rule Engine V2 ──► FAPT        │
│  (Uso: ADs raras, SBs específicos, documentos locais sob demanda do operador)                    │
│                                                                                                  │
│  [FLUXO 2: PIPELINE AUTÔNOMO DA FAA]                                                             │
│  Federal Register API ──► Scoping Filter ──► Cofre GPO (SSRF) ──► Gemini ──► Rule Engine        │
│  ──► FAPT Preliminar ──► Human Review Gateway (8 estágios sequenciais em batch/unitário)         │
│                                                                                                  │
│  [FLUXO 3: INTELIGÊNCIA & LACUNAS → DESCOBERTA → CAMO REGISTER → FILA DE ANÁLISE]              │
│  Consulta por Frota ──► Confronto com Banco CAMO (Deltas) ──► Importação PENDING_ANALYSIS        │
│  (Sem IA automática) ──► CAMO Regulatory Register ──► Fila de Análise CAMO ──► Análise Manual    │
│  ──► Delivery Assessment (Confronto completo pré-entrega e auditoria de pendências)              │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Fluxo 1: Upload Manual Avulso
* **Origem:** Engenheiro CAMO via tela `Upload AD` (`/api/documents/upload` ou `/api/documents/extract-text`).
* **Comportamento:** O documento PDF ou texto é enviado diretamente para o extrator Gemini, que extrai o esquema tipado de requisitos e aplicabilidade.
* **Saída:** O requisito é cadastrado no `camoDb`, o Rule Engine V2 avalia a aplicabilidade na frota e emite a FAPT preliminar correspondente.
* **Objetivo de Uso:** Processamento de Diretrizes fora do fluxo automático (ex: Diretrizes emergenciais locais da ANAC, Service Bulletins específicos de fabricantes, AMOCs singulares).

### 3.2 Fluxo 2: Pipeline Autônomo da FAA (Orquestrador de 8 Estágios)
* **Origem:** Varredura agendada ou sob demanda na API da Federal Register (`/api/autonomous-pipeline/run`).
* **Estágios Determinísticos:**
  1. `DISCOVERY`: Ingestão do registro oficial da autoridade.
  2. `FLEET_SCREENING`: Triagem determinística de modelo e família contra a frota ativa (Scoping Filter v5.2.1).
  3. `OFFICIAL_ACQUISITION`: Download no cofre oficial (`govinfo.gov`) com proteção anti-SSRF e hash SHA-256.
  4. `DOCUMENT_INTELLIGENCE`: Extração via Gemini com esquema estrito e fallback determinístico.
  5. `REQUIREMENT_STRUCTURING`: Gravação de `ComplianceRequirement` e `ApplicabilityRule` no banco.
  6. `CAMO_RULE_ENGINE`: Avaliação em 4 níveis contra toda a frota cadastrada.
  7. `FLEET_ASSESSMENT_CONSOLIDATION`: Consolidação preliminar de FAPT.
  8. `HUMAN_REVIEW_GATEWAY`: Classificação de pendências para intervenção humana obrigatória.
* **Curto-Circuito Seguro:** Se o estágio 2 atestar 100% de `NO_MATCH` para toda a frota, a execução é finalizada imediatamente como `COMPLETED_NO_MATCH`, poupando chamadas de IA e download de arquivos com total segurança.

### 3.3 Fluxo 3: Inteligência & Lacunas → Descoberta de ADs → CAMO Register → Fila de Análise
* **Origem:** Aba de Engenharia `Inteligência & Lacunas` (`/api/intel/search-fleet`).
* **Comportamento e Invariante de Segurança:**
  1. O CAMO seleciona o modelo/frota e consulta as autoridades regulatórias oficiais.
  2. O motor compara as candidatas retornadas com o banco interno do CAMO, classificando deltas (`NEW`, `UNCHANGED`, `UPDATED`, `SUPERSEDED`, `REVOKED`).
  3. O usuário seleciona as ADs e dispara a importação para o **CAMO Regulatory Register** (`/api/camo/register/import`).
  4. **REGRA MANDATÓRIA (PROIBIÇÃO DE AUTO-GEMINI):** Os registros são criados estritamente com `analysisStatus: 'PENDING_ANALYSIS'` e metadados oficiais brutos. **A IA NÃO é disparada de forma automática**.
  5. Os itens alimentam a **Fila de Análise CAMO** (`/api/camo/register?analysisStatus=PENDING_ANALYSIS`), onde o engenheiro analisa sob demanda cada diretriz.
  6. **Integração com Delivery:** O motor de confronto de entrega de aeronaves (`AircraftDeliveryAssessmentEngine`) inclui obrigatoriamente todos os registros ativos do CAMO Register. Diretrizes pendentes de análise aparecem transparentemente como `NOT_DETERMINED` e `PENDING_ANALYSIS`, garantindo que nenhuma obrigação seja ocultada do lessor ou do operador.

---

## 4. CATÁLOGO COMPLETO DE ENDPOINTS REST (API INVENTORY)

O backend do sistema CAMO disponibiliza mais de 70 endpoints REST estruturados e mapeados em `server.ts`:

### 4.1 Autenticação, Usuários e Governança
* `GET /api/health` — Verificação de integridade do servidor e versão da API.
* `GET /api/currentUser` — Usuário autenticado atual e perfil de acesso (Role).
* `POST /api/currentUser` — Alternar perfil ativo (ex: CHIEF_ENGINEER, CAMO_ANALYST, AUDITOR).
* `GET /api/audit-trail` — Consulta completa da trilha imutável de auditoria.
* `GET /api/system/capabilities` — Retorna o Capability Registry formal da plataforma.
* `GET /api/state` — Retorna o estado completo em memória do sistema.
* `POST /api/reset` — Restaura o banco de dados para os seeds oficiais de homologação.

### 4.2 Frota e Aeronaves
* `GET /api/aircraft` — Lista de aeronaves cadastradas da frota operacional.
* `GET /api/aircraft/:id` — Detalhes completos de uma aeronave específica (incluindo motores e componentes).
* `POST /api/aircraft` — Cadastro de nova aeronave na frota.
* `PUT /api/aircraft/:id` — Atualização cadastral e horímetros de uma aeronave.
* `DELETE /api/aircraft/:id` — Exclusão de aeronave da frota operacional.
* `GET /api/aircraft/:id/configuration` — Árvore de configuração física detalhada (célula, motores, APU, aviônicos).

### 4.3 Motores, Componentes e Softwares Instalados
* `GET /api/engines` — Lista de motores cadastrados na frota.
* `POST /api/engines` — Cadastro de motor.
* `PUT /api/engines/:id` — Atualização de parâmetros operacionais do motor.
* `GET /api/components` — Inventário de rotáveis e componentes controlados (P/N e S/N).
* `POST /api/components` — Cadastro de novo componente no inventário.
* `PUT /api/components/:id` — Atualização de dados de componente.
* `GET /api/installations` — Registros históricos e ativos de instalação de componentes em aeronaves.
* `POST /api/installations` — Registro de montagem/instalação de componente com data e horímetro.
* `POST /api/installations/:id/remove` — Desmontagem/remoção de componente da aeronave.
* `GET /api/software` — Softwares e bancos de dados de aviônicos instalados.
* `POST /api/software` — Registro de versão de software instalado.

### 4.4 Ingestão de Documentos e IA
* `POST /api/documents/upload` — Upload de PDF de AD/SB para processamento manual.
* `POST /api/documents/extract-text` — Extração de texto e estruturação via Gemini.
* `GET /api/acquired-documents` — Lista de PDFs armazenados no cofre oficial de documentos.
* `GET /api/acquired-documents/:id` — Detalhes e metadados de documento no cofre.
* `GET /api/acquired-documents/:id/download` — Download seguro do binário PDF verificado.

### 4.5 Conectores Regulatórios e Descoberta Contínua
* `POST /api/regulatory-discovery/scan` — Execução de varredura na API oficial da Federal Register.
* `GET /api/regulatory-discovery/scans` — Histórico de varreduras executadas.
* `GET /api/regulatory-discovery/candidates` — Candidatas descobertas de ADs.
* `POST /api/regulatory-discovery/acquire` — Aquisição de PDF oficial para o cofre criptográfico.

### 4.6 Pipeline Autônomo da FAA
* `POST /api/autonomous-pipeline/run` — Disparo de execução do pipeline autônomo (unitário ou batch).
* `GET /api/autonomous-pipeline/executions` — Lista de execuções históricas do pipeline.
* `GET /api/autonomous-pipeline/executions/:id` — Detalhes e logs dos 8 estágios de uma execução.
* `POST /api/autonomous-pipeline/recover` — Recuperação de execuções travadas em estado RUNNING.

### 4.7 Requisitos Regulatórios e Motor de Regras V2
* `GET /api/requirements` — Requisitos de conformidade cadastrados (`ComplianceRequirement`).
* `GET /api/requirements/:id` — Detalhes de um requisito específico.
* `POST /api/requirements` — Criação manual de requisito regulatório.
* `PUT /api/requirements/:id` — Atualização de requisito.
* `DELETE /api/requirements/:id` — Exclusão de requisito.
* `POST /api/requirements/:id/evaluate` — Disparo de avaliação do requisito no Motor de Regras V2.
* `GET /api/assessments` — Avaliações de aplicabilidade geradas pelo motor.
* `GET /api/fapts` — Folhas de Análise e Parecer Técnico (FAPT) geradas e assinadas.
* `POST /api/fapts/:id/sign` — Assinatura digital formal da FAPT pelo Engenheiro-Chefe.

### 4.8 Memória Técnica (Knowledge Facts) e Questionamentos
* `GET /api/questions` — Perguntas técnicas formuladas pelo sistema por falta de dados.
* `POST /api/questions/:id/answer` — Resposta formal do engenheiro anexando evidência documental.
* `GET /api/facts` — Fatos permanentes de engenharia (*Knowledge Facts*).
* `POST /api/facts` — Cadastro direto de fato técnico no banco.

### 4.9 Ciclo de Vida de Obrigações e Prazos (Fases 6.1 e 6.2)
* `GET /api/obligations` — Consulta de obrigações de conformidade física da frota.
* `GET /api/obligations/:id` — Detalhe completo de uma obrigação com histórico de estados.
* `POST /api/obligations` — Criação de obrigação a partir de requisito de conformidade.
* `POST /api/obligations/:id/transition` — Transição manual de estado na Máquina de Estados Finita.
* `POST /api/obligations/:id/attach-evidence` — Enlace de documento comprobatório à obrigação.
* `POST /api/obligations/:id/calculate-due` — Cálculo detalhado de limites temporais e prazo governante.
* `POST /api/obligations/recalculate-all` — Recálculo de todas as obrigações da frota operacional.

### 4.10 Gestão de Evidências Probatórias (Fase 6.3)
* `GET /api/evidence` — Lista de evidências probatórias documentadas no sistema.
* `GET /api/evidence/:id` — Consulta de registro de evidência específico.
* `POST /api/evidence` — Registro de nova evidência técnica com metadados e hash SHA-256.
* `POST /api/evidence/:id/verify` — Execução do motor de verificação probatória em 4 dimensões.
* `POST /api/evidence/:id/revoke` — Revogação de evidência com justificativa técnica formal.

### 4.11 Controle de Aeronavegabilidade Operacional da Frota (Fase 6.4)
* `GET /api/airworthiness/fleet` — Laudo consolidado de aeronavegabilidade operacional da frota.
* `GET /api/airworthiness/aircraft/:id` — Laudo de aeronavegabilidade individual da aeronave.
* `GET /api/airworthiness/rules` — Catálogo de regras operacionais autorizadas.
* `POST /api/airworthiness/snapshot` — Geração de snapshot criptográfico auditável da frota.
* `POST /api/airworthiness/verify-integrity` — Verificação de assinatura e hash SHA-256 de laudo.

### 4.12 Avaliação de Entrega de Aeronave (Delivery Assessment - Fase 7)
* `GET /api/delivery-assessments` — Lista de avaliações de entrega de aeronave.
* `GET /api/delivery-assessments/:id` — Detalhes completos do dossiê de entrega pré-aquisição.
* `POST /api/delivery-assessments` — Criação de nova avaliação em sandbox isolado.
* `POST /api/delivery-assessments/:id/reconcile` — Reconciliação técnica das declarações do lessor.
* `POST /api/delivery-assessments/:id/certificate` — Emissão de certificado de auditoria de delivery.

### 4.13 Inteligência Regulatória, CAMO Register e Lacunas (Fase 9)
* `POST /api/intel/search-fleet` — Busca de ADs por frota nas autoridades e confronto com registro CAMO.
* `POST /api/intel/discover-candidates` — Descoberta aberta de candidatas regulatórias por família/modelo.
* `GET /api/intel/knowledge-base` — Consulta à base de conhecimento regulatório reutilizável.
* `POST /api/intel/assess-aircraft` — Avaliação de completude de configuração e aplicabilidade progressiva.
* `POST /api/intel/resolve-missing` — Resolução in-loco de lacuna de dado de configuração com recálculo imediato.
* `GET /api/camo/register` — Consulta completa ao CAMO Regulatory Register (com filtros de status).
* `POST /api/camo/register/import` — Importação idempotente de candidatas como `PENDING_ANALYSIS`.
* `POST /api/camo/register/:id/analyze` — Disparo de análise técnica deliberada na Fila de Análise.
* `PUT /api/camo/register/:id` — Atualização de metadados ou prioridade de registro no CAMO Register.
* `DELETE /api/camo/register/:id` — Exclusão de registro regulatório do CAMO Register.

### 4.14 Gestão de Frota, Células, Motores e Componentes (Release 9.5.2)
* `GET /api/fleet/aircraft` — Listagem do inventário de células da frota.
* `POST /api/fleet/aircraft` — Cadastro de nova aeronave (matrícula, MSN, fabricante, modelo, horas TSN, ciclos CSN).
* `PUT /api/fleet/aircraft/:id` — Edição cadastral completa para retificação de dados incorretos com sincronização de instalações e log de auditoria.
* `PATCH /api/fleet/aircraft/:id/status` — Transição de status operacional (inutilização / descomissionamento / preservação / estocagem / manutenção) com justificativa técnica formal.
* `DELETE /api/fleet/aircraft/:id` — Exclusão definitiva segura de registro cadastrado por erro, com desvinculação automática de motores (status STORED) e desinstalação de componentes.
* `POST /api/fleet/component` — Cadastro e instalação de componentes e part numbers rastreados.
* `POST /api/fleet/engine` — Cadastro e associação de motores e APUs com número de série (ESN).

---

## 5. ESTRUTURA DOS 14 SUBMÓDULOS DE BACKEND

Os motores e serviços do backend estão organizados e desacoplados na pasta `server/`:

| Submódulo / Arquivo | Responsabilidade Técnica Principal |
| :--- | :--- |
| `server/dataStore.ts` | Camada de persistência transacional em arquivo JSON atômico com mutex de gravação e seed oficial. |
| `server/ruleEngine.ts` | CAMO Rule Engine V2: lógica booleana estrita em 4 camadas de aeronave, gerando avaliações e perguntas técnicas. |
| `server/geminiService.ts` | Interface com Gemini 3.7 Flash: prompts de engenharia aeronáutica, JSON Schema tipado e fallbacks defensivos. |
| `server/scopingFilter.ts` | Scoping Filter v5.2.1: resolução canônica de fabricantes e famílias de aeronaves com classificação em 3 vias. |
| `server/regulatoryConnectors/federalRegisterConnector.ts` | Conector oficial com a API Federal Register do Governo Americano. |
| `server/regulatoryConnectors/officialDocumentAcquisitionService.ts` | Cofre criptográfico, download oficial de PDFs e proteção SSRF em 4 camadas. |
| `server/camoEngine/regulatoryDiscoveryEngine.ts` | Varredura periódica e incremental da FAA Title 14 CFR Part 39 com proveniência campo a campo. |
| `server/camoEngine/complianceOrchestrator.ts` | Orquestrador de 8 estágios atômicos do pipeline autônomo com crash recovery. |
| `server/camoEngine/complianceObligationService.ts` | Máquina de estados de 13 estados do ciclo de vida físico de obrigações com invariante de evidência. |
| `server/camoEngine/dueDateThresholdEngine.ts` | Motor de cálculo temporal determinístico: calendário anti-rollover, FH, FC, operadores lógicos e repetitivas. |
| `server/camoEngine/evidenceVerificationEngine.ts` | Motor de verificação documental em 4 dimensões (entidade, suficiência, temporal, integridade SHA-256). |
| `server/camoEngine/fleetAirworthinessControlEngine.ts` | Controle de aeronavegabilidade operacional da frota com desacoplamento e catálogo de regras autorizadas. |
| `server/camoEngine/aircraftDeliveryAssessmentEngine.ts` | Avaliação e reconciliação pré-compra/delivery de aeronaves em sandbox isolado. |
| `server/camoEngine/regulatoryIntelligenceEngine.ts` | Motor de inteligência regulatória, busca por frota, CAMO Register, aplicabilidade progressiva e checklist de lacunas. |

---

## 6. CAPABILITY REGISTRY COMPLETO (CAP-001 A CAP-024)

Conforme formalizado em `/CAPABILITY_REGISTRY.md`, a plataforma implementa 24 capacidades oficiais auditadas:

| Código | Capacidade | Domínio | Status |
| :--- | :--- | :--- | :--- |
| **CAP-001** | Extração Estruturada de Documentos Regulatórios via IA | Ingestão | OPERACIONAL |
| **CAP-002** | Motor de Regras Determinístico Multinível (Célula, Motor, Componente, Software) | Regras | OPERACIONAL |
| **CAP-003** | Memória Técnica de Engenharia e Rastreabilidade de Fatos (Knowledge Facts) | Conhecimento | OPERACIONAL |
| **CAP-004** | Resolução Canônica de Fabricantes, Modelos e Famílias | Frota | OPERACIONAL |
| **CAP-005** | Emissão e Assinatura Digital de Folhas de Parecer Técnico (FAPT) | Formalização | OPERACIONAL |
| **CAP-006** | Conector com Federal Register API e Ingestão FAA 14 CFR Part 39 | Conectores | OPERACIONAL |
| **CAP-007** | Cofre Criptográfico de Aquisição de Documentos Oficiais com Proteção Anti-SSRF | Segurança | OPERACIONAL |
| **CAP-008** | Motor de Descoberta Contínua com Proveniência Granular e Deduplicação | Descoberta | OPERACIONAL |
| **CAP-009** | Triagem Determinística de Frota em Três Vias (Scoping Filter v5.2.1) | Triagem | OPERACIONAL |
| **CAP-010** | Orquestrador Autônomo de 8 Estágios com Curto-Circuito Seguro e Crash Recovery | Automação | OPERACIONAL |
| **CAP-011** | Máquina de Estados Finita do Ciclo de Vida de Obrigações (13 Estados) | Ciclo de Vida | OPERACIONAL |
| **CAP-012** | Motor Determinístico de Limites Temporais (Due Date & Threshold Engine) | Temporal | OPERACIONAL |
| **CAP-013** | Motor de Verificação de Evidências Probatórias em 4 Dimensões | Evidência | OPERACIONAL |
| **CAP-014** | Controle Operacional de Aeronavegabilidade da Frota e Regras Autorizadas | Operação | OPERACIONAL |
| **CAP-015** | Avaliação Pré-Entrega de Aeronaves em Sandbox Isolado (Delivery Assessment) | Delivery | OPERACIONAL |
| **CAP-016** | Central de Ajuda, Base de Conhecimento e Guided CAMO Workflow | Governança | OPERACIONAL |
| **CAP-017** | Rotação Dinâmica de Componentes e Isolamento de Famílias de Motores | Configuração | OPERACIONAL |
| **CAP-018** | Plataforma de Inteligência Regulatória e Descoberta por Frota | Inteligência | OPERACIONAL |
| **CAP-019** | Matriz de 5 Estados de Aplicabilidade Progressiva | Inteligência | OPERACIONAL |
| **CAP-020** | Checklist Operacional de Lacunas de Configuração e Resolução In-Loco | Inteligência | OPERACIONAL |
| **CAP-021** | CAMO Regulatory Register com Importação Idempotente PENDING_ANALYSIS | Registro | OPERACIONAL |
| **CAP-022** | Fila Operacional de Análise Técnica CAMO com Triagem por Criticidade | Análise | OPERACIONAL |
| **CAP-023** | Integração Mandatória do CAMO Register com Delivery Assessment | Conformidade | OPERACIONAL |
| **CAP-024** | Blindagem Adversarial, Isolamento de Entidades e Trilha Tamper-Evident | Segurança | OPERACIONAL |

---

## 7. MÁQUINAS DE ESTADOS FORMAIS E INVARIANTES DO DOMÍNIO

### 7.1 Máquina de Estados do Ciclo de Vida de Obrigações (13 Estados)

```
                       ┌─────────────────────────┐
                       │       IDENTIFIED        │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │  APPLICABILITY_PENDING  │
                       └────────────┬────────────┘
                                    │
               ┌────────────────────┼────────────────────┐
               ▼                    ▼                    ▼
     ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
     │    APPLICABLE    │ │  NOT_APPLICABLE  │ │ REVIEW_REQUIRED  │
     └─────────┬────────┘ └──────────────────┘ └──────────────────┘
               │
      ┌────────┴────────┐
      ▼                 ▼
┌───────────┐     ┌───────────┐
│NOT_YET_EFF│     │   OPEN    │ ◄────────────────────────┐
└─────┬─────┘     └─────┬─────┘                          │
      │                 │                                │ (reabertura/
      └────────► ┌──────┴──────┐                         │  recálculo)
                 ▼             ▼                         │
           ┌───────────┐ ┌───────────┐                   │
           │ DUE_SOON  │ │  OVERDUE  │                   │
           └─────┬─────┘ └─────┬─────┘                   │
                 │             │                         │
                 └──────┬──────┘                         │
                        ▼ (exige evidência válida)       │
                 ┌─────────────┐                         │
                 │  COMPLIED   │                         │
                 └──────┬──────┘                         │
                        │                                │
            ┌───────────┴───────────┐                    │
            ▼                       ▼                    │
     [Terminating]           [Repetitive]                │
            │                       │                    │
            ▼                       ▼                    │
     (Ciclo Encerrado)    ┌──────────────────┐           │
                          │ NEXT_CYCLE_OPEN  ├───────────┘
                          └──────────────────┘

     (Estados Administrativos/Terminais: SUPERSEDED, CANCELLED)
```

### 7.2 Matriz dos 5 Estados de Aplicabilidade Progressiva
1. `POTENTIALLY_APPLICABLE`: Coincidência primária de família/modelo de aeronave; configuração física em levantamento.
2. `INSUFFICIENT_DATA`: Falta de dados críticos de configuração (P/N, S/N, modificação). **Invariante: NUNCA assumir `NOT_APPLICABLE`**.
3. `REVIEW_REQUIRED`: Inconsistência cadastral ou necessidade de avaliação de engenharia.
4. `APPLICABLE`: Todos os critérios físicos e seriais comprovam o enquadramento mandatório.
5. `NOT_APPLICABLE`: Configuração física atestada comprova documentalmente que a entidade está fora do escopo.

---

## 8. ARQUITETURA DE SEGURANÇA ADVERSARIAL & INTEGRIDADE

A conformidade do sistema frente a ataques e falhas operacionais foi validada formalmente na suíte de testes de segurança (`test/phase9-stage6-security-architecture.test.ts`):

1. **Blindagem Anti-SSRF:**
   - Whitelist restrita a `*.govinfo.gov`, `*.federalregister.gov`, `*.drs.faa.gov`.
   - Bloqueio imediato de loopbacks (`127.0.0.1`), faixas RFC 1918 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local/cloud metadata (`169.254.169.254`) e protocolos não-HTTP (`file://`, `gopher://`).
2. **Proteção contra Path Traversal e Assinatura de Arquivo:**
   - Sanitização estrita de nomes de arquivos gerados no cofre.
   - Verificação determinística da assinatura mágica de cabeçalho (`%PDF-`), rejeitando payloads HTML/executáveis camuflados.
3. **Contenção de Falhas de IA (Failsafe Extractor):**
   - Saídas de IA corrompidas ou incompletas passam por portão de validação no Rule Engine V2, sendo convertidas defensivamente em `REVIEW_REQUIRED`, impedindo falsas aprovações ou falso enquadramento.
4. **Resiliência a Payloads Regulatórios Malformados:**
   - Métodos de importação e screening validam defensivamente campos ausentes (`authority`, `adNumber`), evitando corrupção do banco ou interrupção do serviço.
5. **Isolamento de Sandboxes de Delivery e Multi-Tenant:**
   - Aeronaves avaliadas no motor de entrega operam em estruturas de dados isoladas e não contaminam a frota ativa em operação.
6. **Assinatura Digital SHA-256 Tamper-Evident:**
   - Cada decisão de aeronavegabilidade, FAPT e evidência documental gera um hash criptográfico imutável. Qualquer modificação posterior invalida a integridade do laudo.

---

## 9. MATRIZ DE VERIFICAÇÃO E AUDITORIA DE TESTES (134/134 GREEN)

O sistema conta com 134 testes unitários, integrados e adversariais automatizados com **100% de aprovação (0 falhas)**:

```
Test Files  13 passed (13)
Tests       134 passed (134)
Duration    ~11.4s
Status      GREEN (100% PASS)
```

### Detalhamento das 13 Suítes de Testes:
1. `test/phase9-stage6-security-architecture.test.ts` (14/14 PASS) — Segurança adversarial, anti-SSRF, isolamento de entidades, invariantes de estado, drift-free, resiliência a corrupção.
2. `test/phase9-stage5-1-fleet-inventory.test.ts` (5/5 PASS) — Inventário unificado de ADs da frota, busca por B737-800, grandes volumes (300+ ADs), isolamento entre frotas e integração com Delivery.
3. `test/phase9-stage5-register.test.ts` (5/5 PASS) — Screening por frota, CAMO Register, status compulsório `PENDING_ANALYSIS` sem IA automática, idempotência e fila de análise.
4. `test/phase9-stage4-regulatory-intelligence.test.ts` (6/6 PASS) — Inteligência regulatória, descoberta por família, isolamento de dados físicos e checklist de completude.
5. `test/phase9-stage4-1-open-discovery.test.ts` (5/5 PASS) — Descoberta aberta de candidatas regulatórias sem contaminação de frota física.
6. `test/phase7-delivery-assessment.test.ts` (23/23 PASS) — Reconciliação pré-compra de aeronaves, sandbox de delivery, histórico de lessor e emissão de laudo criptográfico.
7. `test/phase9-stage2-lifecycle.test.ts` (14/14 PASS) — Ciclo de vida de 13 estados, invariante de evidência obrigatória para `COMPLIED`, recálculo de repetitivas e terminating actions.
8. `test/phase9-stage3-configuration.test.ts` (16/16 PASS) — Rotação e instalação dinâmica de componentes P/N e S/N, isolamento CFM56 vs LEAP-1B e recálculo drift-free.
9. `test/phase9-e2e-integration.test.ts` (11/11 PASS) — Teste ponta a ponta: ingestão, extração, avaliação de regras, resolução de perguntas e emissão de FAPT.
10. `test/phase8-help-center.test.ts` (22/22 PASS) — Central de ajuda, base de conhecimento regulatório e fluxo guiado de operações CAMO.
11. `test/retry-extraction.test.ts` (3/3 PASS) — Retentativas com backoff defensivo e resiliência a indisponibilidade de extração.
12. `test/phase9-aircraft-crud.test.ts` (4/4 PASS) — Gestão cadastral de frota, edição de células, inativação (`DECOMMISSIONED`, `STORED`) e desassociação em cascata.
13. `test/phase9-stage6-3-governance-docs.test.ts` (6/6 PASS) — Cadeia de governança viva, visão estratégica, regras de IA e catálogo de capacidades.

---

## 10. ROADMAP TECNOLÓGICO ESTRATÉGICO

1. **Terminating Actions Condicionais Multietapas (Etapa 7):**
   - Modelagem em grafo de tarefas dependentes para diretrizes que exigem modificações em estágios sucessivos ao longo de múltiplos checks de manutenção estrutural (C-Check, D-Check).
2. **Supersedence Parcial Parametrizada por Configuração / MSN / S/N:**
   - Parametrização fina de matrizes de superação onde uma nova AD substitui a anterior exclusivamente para um subconjunto de números de série ou blocos de modificação.
3. **Conectores Nativos EASA SPT e ANAC SISAC:**
   - Integração direta via webhooks/APIs para captura de EADs/PADs da Agência Europeia (EASA) e do Sistema de Informações de Aeronavegabilidade Continuada da ANAC em tempo real.
4. **Módulo de Boletins de Serviço (SBs) e Ordens de Engenharia (EOs):**
   - Rastreamento integrado de Boletins de Serviço dos fabricantes e emissão formal de Ordens de Engenharia internas correlacionadas às ADs.

---
*Dossiê técnico oficial emitido sob os mais rigorosos padrões da Engenharia Aeronáutica e Desenvolvimento Seguro de Software.*
