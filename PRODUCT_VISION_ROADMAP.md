# PRODUCT VISION & STRATEGIC ROADMAP — CAMO AIRWORTHINESS ENGINE
## Plataforma Integrada de Controle de Manutenção & Conformidade Regulatória CAMO
**Documento Canônico de Governança Estratégica & Visão de Longo Prazo**  
**Versão:** Release 9.7.1 (Active Living Architecture, AI Model Orchestration & Continuous Upgrade with Gemini 3.8 Flash)  
**Data de Emissão:** 17 de Setembro de 2026  
**Autoridade:** Diretoria de Engenharia, Confiabilidade & Governança CAMO  
**Status do Documento:** VIVO • HOMOLOGADO • SINCRONIZADO COM CÓDIGO-FONTE  

---

## 1. VISÃO DO PRODUTO

O **CAMO Airworthiness Compliance Intelligence Platform** evolui estrategicamente para se consolidar como uma **plataforma integrada de Maintenance Control System (Controle de Manutenção / PCM) + CAMO Compliance Platform (Gerenciamento da Aeronavegabilidade Continuada)**.

O sistema **não se limita ao controle estático de Diretrizes de Aeronavegabilidade (ADs)**. O propósito de longo prazo é governar a totalidade dos ativos aeronáuticos ao longo de seu ciclo de vida técnico e regulatório, garantindo a integração progressiva e indissociável entre a física da aeronave, as execuções de manutenção e a conformidade legal perante as autoridades mundiais (FAA 14 CFR Part 39, EASA Part-M / Part-CAMO e ANAC RBAC 121 / RBAC 39).

### 1.1 A Cadeia Causal Integrada do Produto
A integridade da aeronavegabilidade é resultado de uma cadeia contínua e interdependente:

```
[AIRCRAFT (Célula)]
       │
       ▼
[CONFIGURATION (Estrutura Real de P/Ns, S/Ns, ESNs e Modificações)]
       │
       ▼
[MAINTENANCE (Programas de Manutenção, Tarefas, Ordens de Serviço)]
       │
       ▼
[COMPONENTS / ENGINES (Controle de Posições, Horas TSN/TSO, Ciclos CSN/CSO e LLPs)]
       │
       ▼
[MAINTENANCE RECORDS (Diários de Bordo, Ordens de Serviço Executadas, Form 8130-3 / EASA Form 1)]
       │
       ▼
[REGULATORY REQUIREMENTS (Requisitos Mandatórios de ADs, SBs, Airworthiness Limitations)]
       │
       ▼
[COMPLIANCE OBLIGATIONS (Obrigações Ativas com Máquina de 13 Estados e Vencimento 3D)]
       │
       ▼
[EVIDENCE (Pacote Probatório Verificado em 4 Dimensões Técnicas)]
       │
       ▼
[AIRWORTHINESS (Status Operacional da Aeronave e Índice de Não-Diluição da Frota)]
       │
       ▼
[DELIVERY / OPERATIONAL CONTROL (Devolução/Aquisição para Lessors e Despacho de Voo Diário)]
```

### 1.2 Princípios Fundamentais de Arquitetura & Visão
1. **Princípio Zero da Segurança Aeronáutica:** A IA lê, extrai e pré-estrutura documentos; o motor determinístico executa o cruzamento booleano matemático estrito; e a autoridade técnica final pertence exclusivamente ao Engenheiro CAMO humano habilitado.
2. **Não-Diluição da Aeronavegabilidade:** Um problema crítico de conformidade em um componente ou motor (ex: CFM56) compromete diretamente a aeronave associada; a conformidade de uma aeronave nunca dilui a não-conformidade de outra na frota.
3. **Não-Contaminação entre Conhecimento e Frota:** O conhecimento regulatório compilado sobre famílias e modelos de aeronaves (Knowledge Base) reside em domínio desacoplado dos dados físicos da frota ativa.
4. **Isolamento de Pré-Entrega (Delivery Sandbox):** Avaliações de aeronaves candidatas (auditorias de Lessors ou compra) rodam em sandbox isolado, sem poluir a telemetria da frota operacional ativa.
5. **Rastreabilidade e Integridade SHA-256:** Cada mutação de estado, assinatura de laudo FAPT e decisão técnica é selada criptograficamente em trilha append-only.
6. **Design de Sistema Vivo:** O sistema transporta sua própria arquitetura através do artefato canônico [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md), servindo como referência autocontida e atemporal.

---

## 2. ESTADO ATUAL DO PRODUTO (RELEASE 9.7.0)

### 2.1 Metadados da Release
* **Release Canônica:** `Release 9.7.0` (Living System Design, Aircraft Master & Configuration Ledger, SB Intelligence Engine)
* **Status da Suíte Automatizada:** 15 arquivos de teste no Vitest, **152 testes unitários, de integração e de máquinas de estado — 100% PASSING**.
* **Integridade Estrutural:** 27 Visões de Frontend, 14 Submódulos de Domínio no Backend, 73+ Endpoints REST especializados.
* **Compilação e Tipagem:** `tsc --noEmit` limpo (0 erros), compilação de produção via Vite e esbuild 100% verde.

### 2.2 Classificação Oficial dos Estados de Capacidade
Todo recurso planejado ou construído no CAMO Engine deve utilizar rigorosamente um dos seguintes estados canônicos:
* `IMPLEMENTED`: Código ativo, testado em suítes automatizadas e operacional em produção.
* `IN_DEVELOPMENT`: Código em implementação ativa na branch corrente.
* `PLANNED`: Capacidade aprovada em roadmap com especificações regulatórias definidas, sem código em produção.
* `FUTURE_EXPLORATORY`: Linha de pesquisa, inovação ou evolução de longo prazo.
* `DEPRECATED / DEPRECATED_CANDIDATE`: Capacidade legada em processo de substituição ou aposentadoria planejada.

### 2.3 Limitações Conhecidas da Release Atual (9.7.0)
1. **Persistência Monolítica em Arquivo Local (`data/camo_db.json`):** Adequada para testes e operações em container único, com escrita atômica (`fs.writeFileSync` + swap seguro). Requer migração futura para banco relacional em alta concorrência.
2. **Conectores Oficiais Live:** A FAA Federal Register possui conector REST live via API pública governamental. EASA e ANAC operam atualmente via ingestion normalizada, dependendo de feeds dedicados para atualização contínua em tempo real (CAP-021).
3. **Ordens de Engenharia (EOs):** A inteligência de SBs já extrai e gera checklists técnicos com relacionamentos mandatórios e terminativos. O próximo passo de expansão é a emissão formal de Ordens de Engenharia (CAP-024).

---

## 3. CAPACIDADES JÁ CONSTRUÍDAS (CAPABILITY REGISTRY CONSOLIDADO)

Todas as capacidades abaixo estão classificadas como `IMPLEMENTED` e comprovadas por testes automatizados contínuos no repositório:

| Identificador | Nome da Capacidade | Status Real | Módulos & Código Fonte | Cobertura de Testes |
| :--- | :--- | :---: | :--- | :--- |
| **CAP-001** | Modelo de Domínio e Inventário Físico da Frota | `IMPLEMENTED` | `types.ts`, `dataStore.ts`, `FleetView.tsx` | PASS (`phase9-e2e-integration.test.ts`) |
| **CAP-002** | Extração de Diretrizes via Gemini AI Confinada | `IMPLEMENTED` | `geminiService.ts`, `AdUploadView.tsx` | PASS (`retry-extraction.test.ts`) |
| **CAP-003** | Motor Determinístico Booleano V2 de Aplicabilidade | `IMPLEMENTED` | `ruleEngine.ts`, `applicabilityEvaluator.ts` | PASS (`phase9-stage3-configuration.test.ts`) |
| **CAP-004** | Perguntas Técnicas & Knowledge Facts | `IMPLEMENTED` | `dataStore.ts`, `AdDetailView.tsx`, `KnowledgeBaseView.tsx` | PASS (`phase9-e2e-integration.test.ts`) |
| **CAP-005** | Emissão e Assinatura Digital de FAPT | `IMPLEMENTED` | `pdfGenerator.ts`, `FaptListView.tsx` | PASS (`phase9-e2e-integration.test.ts`) |
| **CAP-006** | Conector Federal Register API (FAA 14 CFR 39) | `IMPLEMENTED` | `federalRegisterConnector.ts`, `sourceRegistry.ts` | PASS (`phase9-stage4-regulatory-intelligence.test.ts`) |
| **CAP-007** | Cofre Criptográfico & Defesa Multi-Camada Anti-SSRF | `IMPLEMENTED` | `officialDocumentAcquisitionService.ts` | PASS (`phase9-stage6-security-architecture.test.ts`) |
| **CAP-008** | Motor de Descoberta Regulatória & Scoping Filter | `IMPLEMENTED` | `regulatoryDiscoveryEngine.ts`, `fleetScopingFilter.ts` | PASS (`phase9-stage4-regulatory-intelligence.test.ts`) |
| **CAP-009** | Screening Automatizado por Frota e Família | `IMPLEMENTED` | `fleetScreeningEngine.ts` | PASS (`phase9-stage5-register.test.ts`) |
| **CAP-010** | Orquestrador do Pipeline de 8 Estágios | `IMPLEMENTED` | `compliancePipelineOrchestrator.ts` | PASS (`phase9-e2e-integration.test.ts`) |
| **CAP-011** | Ciclo de Vida de Obrigações (13 Estados Determinísticos) | `IMPLEMENTED` | `complianceObligationService.ts` | PASS (`phase9-stage2-lifecycle.test.ts`) |
| **CAP-012** | Motor 3D de Vencimento (FH, FC, Calendário Exato) | `IMPLEMENTED` | `dueDateThresholdEngine.ts` | PASS (`phase9-stage2-lifecycle.test.ts`) |
| **CAP-013** | Verificação Probatória de Evidências (4 Dimensões) | `IMPLEMENTED` | `evidenceVerificationEngine.ts` | PASS (`phase9-stage2-lifecycle.test.ts`) |
| **CAP-014** | Controle Operacional de Aeronavegabilidade & Não-Diluição | `IMPLEMENTED` | `fleetAirworthinessControlEngine.ts` | PASS (`phase9-stage6-security-architecture.test.ts`) |
| **CAP-015** | Sandbox de Delivery & Reconciliação com Lessors | `IMPLEMENTED` | `aircraftDeliveryAssessmentEngine.ts` | PASS (`phase7-delivery-assessment.test.ts`) |
| **CAP-016** | Central de Ajuda, Manual Operacional e Fluxo Guiado | `IMPLEMENTED` | `helpCenterService.ts`, `HelpCenterView.tsx` | PASS (`phase8-help-center.test.ts`) |
| **CAP-017** | Gestão Dinâmica de Configuração (Rotáveis, ESN, Softwares) | `IMPLEMENTED` | `dataStore.ts`, `aircraftConfigurationEngine.ts` | PASS (`phase9-stage3-configuration.test.ts`) |
| **CAP-018** | Descoberta Aberta Universal & Diagnóstico Multi-Fonte | `IMPLEMENTED` | `regulatoryIntelligenceEngine.ts`, `OpenDiscoveryView.tsx` | PASS (`phase9-stage4-1-open-discovery.test.ts`) |
| **CAP-019** | CAMO Regulatory Register (Livro-Razão & Screening) | `IMPLEMENTED` | `camoRegulatoryRegisterService.ts`, `RegisterView.tsx` | PASS (`phase9-stage5-register.test.ts`) |
| **CAP-020** | Fila de Análise Técnica de Engenharia (Analysis Phase) | `IMPLEMENTED` | `AnalysisPhaseView.tsx`, `regulatoryIntelligenceEngine.ts` | PASS (`phase9-stage5-register.test.ts`) |
| **CAP-025** | Gestão Cadastral, Edição, Inativação e Descomissionamento | `IMPLEMENTED` | `server.ts`, `FleetView.tsx`, `dataStore.ts` | PASS (`phase9-aircraft-crud.test.ts`) |
| **CAP-026** | Governança Viva, Memória Estratégica Independente e AI Guide | `IMPLEMENTED` | `PRODUCT_VISION_ROADMAP.md`, `AI_DEVELOPMENT_GUIDE.md` | PASS (`phase9-stage6-3-governance-docs.test.ts`) |
| **CAP-027** | Inteligência de Boletins de Serviço (SB) e Checklists | `IMPLEMENTED` | `regulatoryIntelligenceEngine.ts`, `types.ts` | PASS (`phase9-stage7-sb-and-system-design.test.ts`) |
| **CAP-028** | Controle de Manutenção (PCM) & Ledger Criptográfico de Configuração | `IMPLEMENTED` | `dataStore.ts`, `types.ts` | PASS (`phase9-stage7-sb-and-system-design.test.ts`) |

---

## 4. PRÓXIMAS IMPLEMENTAÇÕES — ROADMAP PRIORIZADO

O roadmap do produto é governado por **dependências arquiteturais e valor regulatório**, nunca por conveniência isolada de implementação:

```
                  ┌──────────────────────────────────────────────┐
                  │    P0: Fundamentos & Blindagem Transacional   │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │      P1: Conectores Live & Regras Avançadas  │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │    P2: Expansão para Maintenance Control     │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │     FUTURE: Ecossistema Total Integrado      │
                  └──────────────────────────────────────────────┘
```

### 4.1 P0 — Fundamentos / Críticos (Curto Prazo — Q4 2026)
1. **Governança Viva e Blindagem Documental Contínua (`AI_DEVELOPMENT_GUIDE.md`):** Garantir que nenhuma evolução futura de IA viole os invariantes de conformidade e integridade regulatória.
2. **Camada de Isolamento Transacional e Idempotência:** Aprimorar o gerenciamento de concorrência em `dataStore.ts` para locks granulares por recurso (aeronave/obrigação), evitando colisões em ambientes com múltiplos engenheiros simultâneos.
3. **Auditoria Criptográfica Encadeada (Merkle Tree / Hash Chaining):** Extensão da trilha de auditoria para árvore de integridade verificável externamente perante autoridades ANAC/FAA.

### 4.2 P1 — Próxima Evolução (Médio Prazo — Q1/Q2 2027)
1. **CAP-021: Conectores REST Diretos em Tempo Real para EASA SPT & ANAC SISAC (`PLANNED`):**
   * Automatizar polling diário e detecção de publicações de Bi-Weekly issues da EASA e boletins ANAC em formato estruturado.
2. **CAP-022: Ações Terminatórias Condicionais Multietapas (`PLANNED`):**
   * Modelagem de grafos de dependência técnica para ADs com ações de mitigação preliminares (ex: inspeção por ultrassom a cada 500 FH) seguidas de modificação estrutural terminatória (SB incorporado).
3. **CAP-023: Motor de Superação Parcial Parametrizada por Configuração / MSN / P/N (`PLANNED`):**
   * Resolução automática de situações onde a AD substituta se aplica apenas a certos lotes de células, preservando a validade da AD anterior para os demais números de série da frota.

### 4.3 P2 — Evolução Posterior: Expansão para Maintenance Control (Q3/Q4 2027)
1. **Módulo de Programa de Manutenção Aprovado (AMP / MPD):**
   * Estruturação de pacotes de tarefas periódicas recomendadas pelo fabricante (Airbus MPD, Boeing Maintenance Planning Document).
2. **Controle de Vida Limite de Componentes (LLP - Life-Limited Parts):**
   * Rastreabilidade estrita de discos de turbina, eixos de compressores e trens de pouso com descarte obrigatório em ciclos ou horas fixas.
3. **Ordens de Serviço de Manutenção (Work Orders):**
   * Emissão de pacotes de trabalho (Work Packages) direcionando a execução física para oficinas homologadas (RBAC 145 / EASA Part-145).

### 4.4 FUTURE — Visão de Longo Prazo (2028+)
1. **Integração Telemétrica ACARS/FOMAX em Tempo Real:**
   * Atualização instantânea dos horômetros e ciclos da frota logo após o corte dos motores em cada pouso (*wheels on ground*).
2. **Reconciliação Contratual Automatizada de Redelivery com Lessors:**
   * Comparação algorítmica entre as condições contratuais de devolução (*Return Conditions*) e o prontuário técnico gerado pelo CAMO.
3. **Portais Integrados de OEMs (Boeing MyBoeingFleet & AirbusWorld):**
   * Sincronização direta de Boletins de Serviço (SBs) e Ordens de Engenharia (EOs).

---

## 5. EVOLUÇÃO PARA MAINTENANCE CONTROL (PCM + CAMO)

Para transformar o CAMO Engine em uma plataforma unificada de controle de manutenção, mapeia-se o estado e a estratégia de cada bloco funcional de M&E (Maintenance & Engineering):

| Bloco Funcional de Manutenção | Estado Canônico | O que já existe no sistema | O que é planejado |
| :--- | :---: | :--- | :--- |
| **Aircraft Master Data** | `IMPLEMENTED` | Cadastro completo de células, MSN, matrícula, modelo, horas TSN, ciclos CSN, status operacional, edição, inativação e desativação com trilha de auditoria. | Inclusão de pesos e balanceamento, histórico de arrendamento (Lessor name, lease expiry date). |
| **Engine Control** | `IMPLEMENTED` | Cadastro de motores Posição 1, 2 e APU com ESN, modelo, horas, ciclos e desassociação automática para status STORED. | Controle de módulos de motores (Fan, Core, LPT) com rastreamento de hot-section inspections. |
| **Component Control** | `IMPLEMENTED` | Cadastro de rotáveis com Part Number, Serial Number, horas e ciclos de instalação e status INSTALLED / REMOVED. | Controle de tempo desde nova (TSN) e tempo desde revisão geral (TSO / Overhaul). |
| **Configuration Management** | `IMPLEMENTED` | Hierarquia Célula ➔ Motor ➔ Componente ➔ Software com verificação de aplicabilidade. | Mapeamento de IPC (Illustrated Parts Catalog) com compatibilidade de P/Ns alternativos (Interchangeability). |
| **FH / FC Counters** | `IMPLEMENTED` | Atualização acumulada e projeção linear diária de utilização. | Ingestão automática diária de diários de bordo (Flight Logs / ACARS). |
| **Maintenance Program (AMP/MPD)** | `PLANNED` | Não implementado no código. | Catálogo estruturado de tarefas de fabricante com intervalos de tempo/ciclos/calendário. |
| **Maintenance Tasks** | `PLANNED` | Atualmente existem apenas tarefas regulatórias originadas de ADs. | Tarefas de lubrificação, inspeções visuais gerais (GVI), inspeções detalhadas (DET) e testes operacionais. |
| **Work Orders (WO)** | `PLANNED` | Registros manuais de referência probatória (`workOrderRef`). | Ciclo de vida completo de WO: DRAFT ➔ ISSUED ➔ IN_PROGRESS ➔ COMPLETED ➔ CLOSED. |
| **Scheduled Maintenance** | `PLANNED` | Projeção de due date de ADs ativa. | Planejamento de paradas programadas (Checks A, C, D) agrupando centenas de tarefas correlatas. |
| **Unscheduled Maintenance** | `PLANNED` | Não implementado. | Abertura de ordens de serviço corretivas a partir de panes reportadas por tripulantes ou mecânicos. |
| **Deferred Items / MEL** | `PLANNED` | Não implementado. | Controle de itens postergados conforme Lista Mestre de Equipamentos Mínimos (Categorias A, B, C, D). |
| **Component Life Control (LLP)** | `PLANNED` | Não implementado. | Rastreabilidade de histórico de vida acumulada (Back-to-Birth records) para partes de vida limitada. |
| **Installation / Removal Events** | `IMPLEMENTED` | Modelo `InstallationHistory` com horas/ciclos, data, mecânico responsável e referência de WO. | Módulo visual dedicado de histórico de substituição de componentes na célula. |
| **Maintenance Records & Logs** | `PARTIALLY IMPLEMENTED` | Armazenamento de evidências documentais (Form 8130-3, laudos técnicos e FAPTs). | Diário de Bordo Eletrônico (Electronic Flight Logbook - e-Logbook) integrado. |
| **Release to Service (CRS)** | `PLANNED` | Assinatura técnica de FAPT pelo engenheiro CAMO ativa. | Certificado de Liberação para Retorno ao Serviço assinado pelo mecânico habilitado (RBAC 65 / Part-66). |
| **Maintenance Planning & Hangar** | `PLANNED` | Não implementado. | Quadro de alocação de capacidade de hangar, mão de obra e ferramental especial. |
| **Forecast & Predictive Planning** | `PARTIALLY IMPLEMENTED` | Projeção determinística de vencimento 3D ativa para Diretrizes de Aeronavegabilidade. | Projeção consolidada de paradas de frota cruzando ADs + Tarefas do Programa + Trocas de LLP. |

---

## 6. A INTEGRAÇÃO ESTRATÉGICA MAINTENANCE ↔ CAMO

A visão arquitetural do CAMO Engine estabelece que **manutenção física e conformidade regulatória são duas faces da mesma moeda**. Um evento executado no hangar não é um mero registro operacional de oficina, mas a origem direta da prova de aeronavegabilidade continuada:

```
[1. Evento de Manutenção no Hangar]
  Exemplo: Troca de válvula hidráulica de atuador de profundor conforme Ordem de Serviço WO-2026-889.
       │
       ▼
[2. Atualização Física da Configuração da Aeronave]
  Registro em tempo real da remoção do P/N antigo e instalação do novo P/N com EASA Form 1 anexo.
       │
       ▼
[3. Registro Técnico de Manutenção (Maintenance Record)]
  Assinatura do Certificado de Liberação para Retorno ao Serviço (CRS) pelo mecânico responsável.
       │
       ▼
[4. Ingestão Probatória no CAMO Engine (Evidence Verification)]
  O Form 1 é indexado, auditado nas 4 dimensões (data, P/N, horas, autorização) e selado com SHA-256.
       │
       ▼
[5. Liquidação da Obrigação Regulatória (Compliance Obligation)]
  A obrigação associada à AD específica transita de OPEN para COMPLIED ou cálculo de próximo Due Date.
       │
       ▼
[6. Certificação da Aeronavegabilidade Operacional (Airworthiness)]
  O índice da aeronave é confirmado como AIRWORTHY sem restrições ou pendências no Cockpit da Frota.
```

---

## 7. MATRIZ FORMAL DE DEPENDÊNCIAS DE CAPACIDADES

| Capacidade Alvo | Estado Real | Depende Diretamente de | Próximo Passo Arquitetural |
| :--- | :---: | :--- | :--- |
| **CAP-001** (Domain & Fleet) | `IMPLEMENTED` | Nenhuma externa | Refinamento de metadados cadastrais |
| **CAP-002** (AI Document Extraction) | `IMPLEMENTED` | Gemini 3.8 Flash + `types.ts` | Processamento multimodal de esquemas e diagramas |
| **CAP-003** (Rule Engine V2) | `IMPLEMENTED` | `types.ts` + `dataStore.ts` | Otimização com compilador booleano estrito |
| **CAP-004** (Knowledge Facts) | `IMPLEMENTED` | `ruleEngine.ts` + `dataStore.ts` | Sincronização automática com Service Letters |
| **CAP-005** (FAPT Generation) | `IMPLEMENTED` | `pdfGenerator.ts` + CAP-003 | Assinatura com certificado digital ICP-Brasil / A1 |
| **CAP-006** (Federal Register) | `IMPLEMENTED` | API Federal Register | Monitoramento de latência e caching defensivo |
| **CAP-007** (Crypto Vault & Anti-SSRF) | `IMPLEMENTED` | `officialDocumentAcquisitionService.ts` | Quarentena antivírus de arquivos externos |
| **CAP-008** (Discovery Engine) | `IMPLEMENTED` | CAP-006 + CAP-007 | Expansão de dicionário de sinônimos aeronáuticos |
| **CAP-009** (Fleet Screening) | `IMPLEMENTED` | CAP-001 + CAP-008 | Paralelização de screening para grandes operadores |
| **CAP-010** (8-Stage Pipeline) | `IMPLEMENTED` | CAP-001 a CAP-009 | Retentativas inteligentes com backoff exponencial |
| **CAP-011** (13-State Machine) | `IMPLEMENTED` | `types.ts` + `dataStore.ts` | Sub-máquinas para manutenções estendidas |
| **CAP-012** (Due Date Engine) | `IMPLEMENTED` | CAP-001 + CAP-011 | Suporte a cálculos com calendário lunar / sazonal |
| **CAP-013** (Evidence Verification) | `IMPLEMENTED` | CAP-011 + `dataStore.ts` | OCR inteligente de assinaturas em Form 8130-3 |
| **CAP-014** (Fleet Airworthiness) | `IMPLEMENTED` | CAP-011 + CAP-012 + CAP-013 | Indicadores de probabilidade de indisponibilidade |
| **CAP-015** (Delivery Assessment) | `IMPLEMENTED` | CAP-011 a CAP-014 (Sandbox) | Relatório comparativo automático Lessor vs Airline |
| **CAP-016** (Help Center & Manual) | `IMPLEMENTED` | `helpCenterService.ts` | Busca semântica vetorial em manuais operacionais |
| **CAP-017** (Dynamic Configuration) | `IMPLEMENTED` | CAP-001 + `dataStore.ts` | Visualizador 3D em wireframe de posições instaladas |
| **CAP-018** (Universal Discovery) | `IMPLEMENTED` | CAP-006 + CAP-008 | Normalização fonética de nomes de fabricantes |
| **CAP-019** (CAMO Register) | `IMPLEMENTED` | CAP-001 + CAP-008 + CAP-009 | Exportação formal em padrão IATA / SPEC 2000 |
| **CAP-020** (Analysis Phase) | `IMPLEMENTED` | CAP-002 + CAP-019 | Fila de triagem assistida por relevância de ATA |
| **CAP-021** (Live EASA/ANAC) | `PLANNED` | CAP-006 + CAP-008 | Implementação de scrapers autorizados e feeds |
| **CAP-022** (Multi-Step Terminating) | `PLANNED` | CAP-011 + CAP-012 | Modelagem de grafo direcionado acíclico (DAG) |
| **CAP-023** (Partial Supersedence) | `PLANNED` | CAP-003 + CAP-011 | Matriz relacional de superação por par (AD, MSN) |
| **CAP-024** (SBs & Engineering Orders)| `FUTURE_EXPLORATORY`| CAP-011 + CAP-019 + WOs | Parcerias de integração com portais OEM |
| **CAP-025** (Fleet CRUD & Decommission)| `IMPLEMENTED` | CAP-001 + `dataStore.ts` | Arquivamento histórico permanente com snapshot |
| **CAP-026** (Maintenance Program / AMP)| `PLANNED` | CAP-001 + CAP-017 | Estruturação de dados para MPD e tarefas de revisão |
| **CAP-027** (Work Orders / PCM) | `PLANNED` | CAP-026 + CAP-011 | Workflow de emissão e encerramento de pacotes |
| **CAP-028** (LLP Back-to-Birth Control)| `PLANNED` | CAP-001 + CAP-017 | Rastreamento histórico ininterrupto de ciclos de vida |
| **CAP-029** (AI Model Orchestrator & Upgrade)| `IMPLEMENTED`| Gemini 3.8 Flash + `camoDb` | Benchmarking contínuo com dataset sintético de 50 ADs |
| **CAP-030** (Relational Persistence Architecture)| `PLANNED` | CAP-001 + `DATABASE_PERSISTENCE_ARCHITECTURE.md` | Fase 3C (Design) + Fase 3C.1 (Correction Gate Aprovado); Implementação na Fase 3D |

---

## 8. FORA DE ESCOPO / O QUE NÃO IMPLEMENTAR AINDA

Para preservar a sanidade arquitetural, proteger os recursos computacionais e evitar a introdução de complexidade prematura, as seguintes iniciativas estão **estritamente fora de escopo no momento**:

1. **Sistemas de Gestão Comercial, Venda de Passagens e CRM:** O CAMO Engine é uma plataforma de engenharia de confiabilidade e controle de aeronavegabilidade de missão crítica. Não compete com GDS ou sistemas comerciais de linhas aéreas.
2. **Sistema de Escala de Tripulantes e Gestão de RH de Pilotos (Crew Scheduling):** Controle de jornada de aeronautas pertence a sistemas dedicados de operações de voo (DOV / OCC).
3. **Módulos de ERP Contábil e Faturamento Financeiro:** O sistema controla custos de manutenção e multas por impacto de AOG do ponto de vista analítico, mas não deve implementar plano de contas contábil ou emissão de notas fiscais.
4. **Assinatura Autônoma de Conformidade sem Homologação Humana:** É terminantemente proibido qualquer desenvolvimento que permita à IA aprovar laudos ou FAPTs automaticamente. A responsabilidade técnica é indelegável.
5. **Decisões Probabilísticas de Despacho de Voo (Go/No-Go):** Toda decisão que afeta o status de aeronavegabilidade deve ser baseada em regras booleanas determinísticas fundamentadas em manuais e regulamentos homologados.
6. **Módulo Completo de MRO de Hangar antes da Conclusão do P0 e P1:** Não implementar fluxos complexos de almoxarifado de peças ou estoque físico de ferramentas antes da consolidação dos fundamentos de dados relacionais e conectores regulatórios ao vivo.

---

## 9. CRITÉRIOS FORMAIS PARA ALTERAÇÃO DO ROADMAP

O Roadmap estratégico é flexível para atender a novas exigências regulatórias ou prioridades de negócio, contudo, qualquer alteração deve cumprir estritamente as seguintes etapas de governança:

1. **Registro Formal da Solicitação:** Documentação detalhada da necessidade, citando o operador, a autoridade regulatória (FAA, EASA ou ANAC) ou o marco operacional motivador.
2. **Justificativa e Análise de Valor:** Explicação clara do motivo pelo qual a capacidade deve ser antecipada, postergada ou adicionada.
3. **Avaliação de Impacto Arquitetural:** Verificação minuciosa se a nova capacidade introduz acoplamento excessivo ou viola os princípios de isolamento e não-contaminação.
4. **Mapeamento de Pré-Requisitos e Dependências:** Atualização da Matriz de Dependências para assegurar que nenhuma capacidade seja iniciada sem suas bases prévias implementadas e testadas.
5. **Sincronização Documental Obrigatória:** Atualização concomitante de `PRODUCT_VISION_ROADMAP.md`, `CAPABILITY_REGISTRY.md`, `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md` e `README.md`.
