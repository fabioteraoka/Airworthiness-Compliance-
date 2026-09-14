# CAPABILITY REGISTRY — CAMO AIRWORTHINESS COMPLIANCE INTELLIGENCE
## Registro Formal de Capacidades do Sistema de Engenharia CAMO
**Versão do Registro:** Release 9.5.2 (Homologada após Fase 9 Etapa 6.3 Governança Viva & Fleet CRUD)  
**Data da Emissão:** 14 de Setembro de 2026  
**Autoridade de Governança:** Diretoria Técnica de Engenharia & Governança CAMO  
**Status do Registro:** VIVO • HOMOLOGADO • SINCRONIZADO COM CÓDIGO-FONTE (128/128 TESTES VERDES)  

---

### ESTRUTURA DO REGISTRO
Este documento constitui o catálogo oficial, versionado e independente de capacidades do sistema. Todo módulo de software, endpoint REST, motor de domínio ou componente visual deve estar mapeado a um identificador canônico `CAP-ID`, refletindo seu status real no código:
* `IMPLEMENTED`: Código ativo, testado em suítes automatizadas e operacional em produção.
* `IN_DEVELOPMENT`: Código em implementação ativa na branch corrente.
* `PLANNED`: Capacidade aprovada em roadmap com especificações regulatórias definidas, sem código em produção.
* `FUTURE_EXPLORATORY`: Linha de pesquisa ou evolução de longo prazo.
* `DEPRECATED`: Capacidade em processo de desativação planejada.

---

## 1. CATÁLOGO DAS CAPACIDADES IMPLEMENTADAS & EM ROADMAP

### CAP-001: Foundation & Relational Domain Inventory
* **NAME:** Modelo de Domínio e Inventário Físico da Frota
* **DESCRIPTION:** Estruturação ontológica de dados para aeronaves (MSN, modelo, horas de voo, ciclos, operadora, matrícula), posições de motores (ESN, P/N), componentes rotáveis (P/N, S/N) e softwares embarcados instalados.
* **STATUS:** `IMPLEMENTED`
* **VERSION:** 9.0.0
* **MODULES:** `src/types.ts`, `server/dataStore.ts`, `src/components/FleetView.tsx`, `src/components/DashboardView.tsx`
* **ENDPOINTS:** `GET /api/state`, `POST /api/fleet/aircraft`, `POST /api/fleet/component`, `POST /api/fleet/software`
* **DEPENDENCIES:** Nenhuma externa; persistência em `dataStore.ts`.
* **TESTS:** `test/phase9-e2e-integration.test.ts`, `test/phase9-stage3-configuration.test.ts`
* **SECURITY:** Validação estrita de schema; isolamento por `operatorId` e chave primária imutável (`id`).
* **ARCHITECTURE:** Domínio relacional mapeado em memória e espelhado em disco (`data/camo_db.json`).
* **DOCUMENTATION:** `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md` (Seção 2, Fase 1).
* **ROADMAP:** Suporte a histórico de frotas desativadas ou revendidas.
* **LIMITATIONS:** Persistência atual baseada em arquivo JSON monolítico; requer migração para banco relacional em larga escala.

---

### CAP-002: Gemini AI Regulatory Document Extraction
* **NAME:** Extração de Diretrizes Técnicas via Inteligência Artificial Confinada
* **DESCRIPTION:** Leitura, OCR e conversão estruturada de texto narrativo não estruturado de PDFs de ADs em esquemas tipados (`ExtractedAdData`), identificando autoridade emissora, aplicabilidade declarada, thresholds iniciais, intervalos e parágrafos mandatórios.
* **STATUS:** `IMPLEMENTED`
* **VERSION:** 9.4.0
* **MODULES:** `server/geminiService.ts`, `src/components/AdUploadView.tsx`
* **ENDPOINTS:** `POST /api/extract-ad`, `POST /api/requirements/:id/retry-extraction`
* **DEPENDENCIES:** `@google/genai` (Gemini 3.7 Flash), `pdf-parse`
* **TESTS:** `test/retry-extraction.test.ts`, `test/phase9-e2e-integration.test.ts`
* **SECURITY:** Execução estritamente server-side (chave `GEMINI_API_KEY` isolada); resposta validada contra schema estrito; fallback determinístico em caso de quota esgotada ou erro de rede.
* **ARCHITECTURE:** Camada de extração pura. A IA apenas preenche o draft do requisito técnico; **nunca** determina aplicabilidade ou conformidade na frota.
* **DOCUMENTATION:** `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md` (Seção 1 e Seção 4).
* **ROADMAP:** Integração com modelos Gemini multimodal para diagramas de Service Bulletins anexados.
* **LIMITATIONS:** Sujeito a latência de rede externa e cotas da API de IA.

---

### CAP-003: CAMO Rule Engine V2 & Boolean Applicability Evaluator
* **NAME:** Motor de Regras Determinístico e Avaliação Multinível de Aplicabilidade
* **DESCRIPTION:** Motor de avaliação booleana estrita para cruzar regras de AD contra dados de frota em 4 níveis hierárquicos: Célula (Airframe) ➔ Motores (Engines) ➔ Componentes (Rotables) ➔ Softwares Embarcados. Gera perguntas técnicas se faltarem dados (`REVIEW_REQUIRED`).
* **STATUS:** `IMPLEMENTED`
* **VERSION:** 9.3.0
* **MODULES:** `server/ruleEngine.ts`, `server/camoEngine/applicabilityEvaluator.ts`, `src/components/AdDetailView.tsx`
* **ENDPOINTS:** `POST /api/evaluate-compliance-v2`, `POST /api/requirements/:id/recalculate`
* **DEPENDENCIES:** `server/dataStore.ts`
* **TESTS:** `test/phase9-stage3-configuration.test.ts`, `test/phase9-e2e-integration.test.ts`
* **SECURITY:** Regra Fail-Safe: Falta de informação gera `REVIEW_REQUIRED`, jamais `NOT_APPLICABLE`.
* **ARCHITECTURE:** Desacoplado da extração. Execução determinística sem heurísticas probabilísticas.
* **DOCUMENTATION:** `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md` (Fase 2).
* **ROADMAP:** Avaliação em tempo real via WebAssembly para processamento de frotas com mais de 500 células.
* **LIMITATIONS:** Regras complexas que dependem de modificações de terceiros (STCs) não cadastradas exigem intervenção humana via questionário.

---

### CAP-004: Interactive Technical Inquiry & Knowledge Facts Memory
* **NAME:** Ciclo de Perguntas Técnicas & Base de Fatos Consolidados (Knowledge Facts)
* **DESCRIPTION:** Sistema de resolução de lacunas de dados onde o sistema formula perguntas técnicas direcionadas ao engenheiro responsável. As respostas fundamentadas com referências documentais geram registros persistentes de memória técnica (`KnowledgeFact`).
* **STATUS:** `IMPLEMENTED`
* **VERSION:** 9.0.0
* **MODULES:** `server/dataStore.ts`, `src/components/AdDetailView.tsx`, `src/components/KnowledgeBaseView.tsx`
* **ENDPOINTS:** `POST /api/questions/:id/answer`, `POST /api/knowledge-facts/:id/action`
* **DEPENDENCIES:** `server/ruleEngine.ts`
* **TESTS:** `test/phase9-e2e-integration.test.ts`
* **SECURITY:** Rastreabilidade estrita: toda resposta registra usuário, licença, data/hora e referência probatória.
* **ARCHITECTURE:** Memória técnica vinculada à célula ou componente; reaproveitada automaticamente em reavaliações.
* **DOCUMENTATION:** `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md` (Seção 2).
* **ROADMAP:** Catalogação de Service Letters de fabricantes como evidência automatizada de esclarecimento.
* **LIMITATIONS:** Fatos inseridos manualmente dependem da integridade do operador para não inserir referências falsas.

---

### CAP-005: Formal FAPT Generation & Digital Signature Authority
* **NAME:** Emissão e Assinatura Digital de Folha de Análise e Parecer Técnico (FAPT)
* **DESCRIPTION:** Gerador de documento oficial de engenharia aeronáutica (FAPT) em conformidade com RBAC 121 Subparte L e EASA Part-M. Registra o parecer de aplicabilidade, ações mandatórias requeridas e assinatura com carimbo digital do engenheiro habilitado.
* **STATUS:** `IMPLEMENTED`
* **VERSION:** 9.0.0
* **MODULES:** `server/pdfGenerator.ts`, `src/components/FaptListView.tsx`, `src/components/AdDetailView.tsx`
* **ENDPOINTS:** `POST /api/fapt/:id/sign`, `POST /api/assessments/:id/approve`
* **DEPENDENCIES:** `pdfkit`
* **TESTS:** `test/phase9-e2e-integration.test.ts`
* **SECURITY:** Geração de hash SHA-256 para o PDF gerado e registro indelével no Audit Trail.
* **ARCHITECTURE:** Renderização de relatório técnico vetorial em PDF com layout institucional auditado.
* **DOCUMENTATION:** `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md` (Fase 2).
* **ROADMAP:** Suporte a certificados digitais ICP-Brasil / eIDAS padrão X.509 em hardware criptográfico (A3/HSM).
* **LIMITATIONS:** Assinatura atual utiliza carimbo digital interno com rastreio de credencial e IP, sem PKI externa.

---

### CAP-006: Official Regulatory Data Connectors (Federal Register)
* **NAME:** Conector Oficial de Dados da Federal Register API (FAA Part 39)
* **DESCRIPTION:** Conector REST live para consulta de publicações finais (Final Rules) da FAA no Federal Register, buscando por número de AD, fabricante, família de aeronave ou intervalo de datas.
* **STATUS:** `IMPLEMENTED`
* **VERSION:** 9.1.0
* **MODULES:** `server/regulatoryConnectors/federalRegisterConnector.ts`, `server/regulatoryConnectors/sourceRegistry.ts`
* **ENDPOINTS:** `GET /api/regulatory/sources`, `GET /api/regulatory/search`, `GET /api/regulatory/document/:docNumber`
* **DEPENDENCIES:** `node-fetch` / Axios
* **TESTS:** `test/phase9-stage4-regulatory-intelligence.test.ts`
* **SECURITY:** Conexão HTTPS com timeouts defensivos e sanitização de query parameters.
* **ARCHITECTURE:** Adapter pattern encapsulado em `SourceRegistry`.
* **DOCUMENTATION:** `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md` (Fase 3).
* **ROADMAP:** Conexão nativa similar para EASA Safety Publications Tool e ANAC SISAC.
* **LIMITATIONS:** Apenas a FAA disponibiliza API pública aberta em JSON sem necessidade de CAPTCHA.

---

### CAP-007: Cryptographic Document Vault & Multi-Layer Anti-SSRF Defense
* **NAME:** Cofre Criptográfico de Aquisição de Documentos com Proteção Anti-SSRF
* **DESCRIPTION:** Sistema de download seguro e arquivamento de PDFs oficiais com blindagem anti-SSRF de múltiplas camadas: whitelist de domínios governamentais, bloqueio de loopback, ranges privados e metadados de nuvem, inspeção hop-by-hop de redirects e deduplicação por hash SHA-256.
* **STATUS:** `IMPLEMENTED`
* **VERSION:** 9.1.0
* **MODULES:** `server/regulatoryConnectors/officialDocumentAcquisitionService.ts`, `src/components/RegulatorySourcesView.tsx`
* **ENDPOINTS:** `POST /api/regulatory/acquire-document`, `GET /api/regulatory/acquired-documents`, `GET /api/regulatory/acquired-documents/:id`
* **DEPENDENCIES:** `crypto`, `fs`, `path`
* **TESTS:** `test/phase9-stage6-security-architecture.test.ts`
* **SECURITY:** Bloqueio ativo de endereços `127.0.0.1`, `169.254.169.254`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.
* **ARCHITECTURE:** Armazenamento isolado em `data/acquired_documents/` com validação de assinatura binária de PDF.
* **DOCUMENTATION:** `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md` (Fase 4).
* **ROADMAP:** Criptografia em repouso AES-256 para os arquivos físicos armazenados.
* **LIMITATIONS:** Requer conexão de saída HTTP para os domínios do governo norte-americano aprovados.

---

### CAP-008: Continuous Regulatory Discovery Engine & Incremental Scoping
* **NAME:** Motor de Descoberta Regulatória Contínua
* **DESCRIPTION:** Varredura periódica e incremental de publicações oficiais, detectando novas diretrizes, emendas ou revisões, identificando deltas regulatórios e deduplicando registros conhecidos sem intervenção manual.
* **STATUS:** `IMPLEMENTED`
* **VERSION:** 9.2.0
* **MODULES:** `server/regulatoryConnectors/regulatoryDiscoveryEngine.ts`
* **ENDPOINTS:** `POST /api/regulatory/discovery/scan`, `GET /api/regulatory/discovery`, `GET /api/regulatory/discovery/:id`
* **DEPENDENCIES:** `federalRegisterConnector.ts`
* **TESTS:** `test/phase9-stage4-1-open-discovery.test.ts`
* **SECURITY:** Proteção anti-reexecução concorrente por chave de lock temporária.
* **ARCHITECTURE:** Engine incremental que registra o último timestamp processado.
* **DOCUMENTATION:** `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md` (Fase 5.1).
* **ROADMAP:** Webhooks de notificação push em tempo real.
* **LIMITATIONS:** Dependência de intervalo de polling programado.

---

### CAP-009: Automated Fleet Screening Engine
* **NAME:** Motor de Triagem Automatizada de Frota (Scoping Filter)
* **DESCRIPTION:** Triagem preliminar determinística em três vias (`POTENTIAL_MATCH`, `NO_MATCH`, `INSUFFICIENT_METADATA`) baseada em modelo canônico, fabricante e tipo de motor, separando rigorosamente famílias (ex: B737_NG vs B737_MAX).
* **STATUS:** `IMPLEMENTED`
* **VERSION:** 9.2.0
* **MODULES:** `server/regulatoryConnectors/fleetScreeningEngine.ts`
* **ENDPOINTS:** `POST /api/regulatory/screen`, `POST /api/regulatory/discovery/:id/screen`, `GET /api/regulatory/screenings/all`
* **DEPENDENCIES:** `server/dataStore.ts`
* **TESTS:** `test/phase9-stage4-regulatory-intelligence.test.ts`
* **SECURITY:** Segregação estrita: diretrizes com modelo ambíguo recebem `INSUFFICIENT_METADATA`, prevenindo falso-negativo.
* **ARCHITECTURE:** Filtro de escopo de alto desempenho executado antes do consumo de recursos pesados de IA.
* **DOCUMENTATION:** `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md` (Fase 5.2).
* **ROADMAP:** Suporte a filtros refinados por Part Number de APU e aviônicos.
* **LIMITATIONS:** Opera sobre metadados textuais da publicação inicial; não substitui o Rule Engine V2 sobre o PDF completo.

---

### CAP-010: Autonomous 8-Stage Compliance Pipeline Orchestrator
* **NAME:** Orquestrador Autônomo de Pipeline Regulatório End-to-End
* **DESCRIPTION:** Orquestrador sequencial de 8 estágios atômicos: 1. Discovery ➔ 2. Screening ➔ 3. Official Acquisition ➔ 4. Document Intelligence ➔ 5. Requirement Structuring ➔ 6. CAMO Rule Engine ➔ 7. Fleet Assessment ➔ 8. Human Review Gateway.
* **STATUS:** `IMPLEMENTED`
* **VERSION:** 9.3.0
* **MODULES:** `server/regulatoryConnectors/compliancePipelineOrchestrator.ts`, `src/components/PipelineExecutionModal.tsx`
* **ENDPOINTS:** `POST /api/pipeline/execute-discovery/:id`, `POST /api/pipeline/execute-batch`, `GET /api/pipeline/executions`
* **DEPENDENCIES:** Conectores, Gemini Service, Rule Engine, DataStore
* **TESTS:** `test/phase9-e2e-integration.test.ts`
* **SECURITY:** Curto-circuito seguro em `NO_MATCH`; recuperação de travamento (Crash Recovery) para jobs interrompidos.
* **ARCHITECTURE:** Pipeline transacional com histórico granular de cada estágio registrado no banco.
* **DOCUMENTATION:** `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md` (Fase 5.3).
* **ROADMAP:** Fila de execução distribuída baseada em RabbitMQ ou Redis para escala horizontal.
* **LIMITATIONS:** No ambiente de container único, execuções em lote pesadas utilizam fila sequencial assíncrona.

---

### CAP-011: Compliance Lifecycle Core & 13-State Deterministic State Machine
* **NAME:** Ciclo de Vida Regulatório & Máquina de Estados de 13 Estados
* **DESCRIPTION:** Máquina de estados formal para obrigações de conformidade regulatória: `IDENTIFIED`, `APPLICABILITY_PENDING`, `APPLICABLE`, `NOT_YET_EFFECTIVE`, `OPEN`, `DUE_SOON`, `OVERDUE`, `COMPLIED`, `NEXT_CYCLE_OPEN`, `NOT_APPLICABLE`, `REVIEW_REQUIRED`, `SUPERSEDED`, `CANCELLED`.
* **STATUS:** `IMPLEMENTED`
* **VERSION:** 9.4.0
* **MODULES:** `server/camoEngine/complianceObligationService.ts`, `src/components/ComplianceObligationsView.tsx`
* **ENDPOINTS:** `GET /api/compliance-obligations`, `POST /api/compliance-obligations/:id/transition`, `POST /api/compliance-obligations/evaluate-all`
* **DEPENDENCIES:** `server/dataStore.ts`, `server/camoEngine/dueDateThresholdEngine.ts`
* **TESTS:** `test/phase9-stage2-lifecycle.test.ts`
* **SECURITY:** **Invariante Crítica:** Transição para `COMPLIED` rejeitada sumariamente sem evidência probatória anexada e validada.
* **ARCHITECTURE:** Serviço singleton autoritativo com recálculo automático de ciclos repetitivos (`NEXT_CYCLE_OPEN`).
* **DOCUMENTATION:** `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md` (Fase 6.1 e 9.2).
* **ROADMAP:** Suporte a ações terminatórias parciais dependentes de mod status.
* **LIMITATIONS:** Ações terminatórias atualmente fecham a obrigação integralmente para a célula vinculada.

---

### CAP-012: Due Date & Temporal Threshold Engine
* **NAME:** Motor de Prazos e Limites Temporais de Aeronavegabilidade
* **DESCRIPTION:** Motor matemático determinístico de cálculo de vencimento em Horas de Voo (FH), Ciclos de Voo (FC) e Dias de Calendário. Aritmética de calendário exata com prevenção de rollover em fins de mês e anos bissextos.
* **STATUS:** `IMPLEMENTED`
* **VERSION:** 9.4.0
* **MODULES:** `server/camoEngine/dueDateThresholdEngine.ts`
* **ENDPOINTS:** `POST /api/compliance-obligations/:id/calculate-due`, `POST /api/due-date-engine/evaluate`
* **DEPENDENCIES:** Nenhuma dependência externa; lógica pura em TypeScript.
* **TESTS:** `test/phase9-stage2-lifecycle.test.ts`, `test/phase9-stage3-configuration.test.ts`
* **SECURITY:** Detecção de anomalias: horímetro regressivo ou datas futuras inválidas disparam `DATA_INTEGRITY_REVIEW`.
* **ARCHITECTURE:** Suporte a operadores `WITHIN`, `BEFORE`, `AFTER`, `WHICHEVER_OCCURS_FIRST`, `WHICHEVER_OCCURS_LATER`.
* **DOCUMENTATION:** `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md` (Fase 6.2).
* **ROADMAP:** Projeção preditiva de utilização diária da aeronave para estimativa antecipada de data de parada.
* **LIMITATIONS:** Utilização projetada atualmente baseia-se na média histórica dos últimos 90 dias cadastrada na aeronave.

---

### CAP-013: Evidence Verification Engine & Probatory Integrity
* **NAME:** Motor de Verificação de Evidências e Integridade Probatória
* **DESCRIPTION:** Validação e auditoria de conjuntos probatórios técnicos (Ordens de Serviço, Logs de Manutenção, EASA Form 1, FAA 8130-3). Atribui hash SHA-256 ao anexo, valida metadados e gerencia revogação de evidências com recálculo reativo da obrigação.
* **STATUS:** `IMPLEMENTED`
* **VERSION:** 9.4.0
* **MODULES:** `server/camoEngine/evidenceVerificationEngine.ts`, `src/components/EvidenceView.tsx`
* **ENDPOINTS:** `GET /api/evidence`, `POST /api/evidence/:evidenceId/validate`, `POST /api/evidence/:evidenceId/revoke`
* **DEPENDENCIES:** `server/camoEngine/complianceObligationService.ts`
* **TESTS:** `test/phase9-stage2-lifecycle.test.ts`
* **SECURITY:** Encadeamento de integridade SHA-256; revogação documentada em audit trail imutável com justificativa obrigatória.
* **ARCHITECTURE:** Segregação entre evidência anexada (`ATTACHED`) e validada (`VALIDATED`).
* **DOCUMENTATION:** `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md` (Fase 6.1).
* **ROADMAP:** Reconhecimento óptico inteligente de campos de Form 8130-3 via modelo dedicado.
* **LIMITATIONS:** Validação formal da autenticidade física da assinatura do mecânico depende do inspetor CAMO.

---

### CAP-014: Fleet Airworthiness Control Engine
* **NAME:** Motor de Controle de Aeronavegabilidade Operacional da Frota
* **DESCRIPTION:** Desacoplamento formal entre status de cumprimento de AD e determinação legal de voabilidade da aeronave. Aplica regras mandatórias como a interdição por descumprimento de AD (14 CFR § 39.7 / RBAC 39) gerando status `GROUNDED` preventivo.
* **STATUS:** `IMPLEMENTED`
* **VERSION:** 9.4.0
* **MODULES:** `server/camoEngine/fleetAirworthinessControlEngine.ts`, `src/components/DashboardView.tsx`
* **ENDPOINTS:** `GET /api/camo/airworthiness/fleet`, `GET /api/camo/airworthiness/aircraft/:id`, `POST /api/camo/airworthiness/snapshot`
* **DEPENDENCIES:** `complianceObligationService.ts`, `dataStore.ts`
* **TESTS:** `test/phase9-stage2-lifecycle.test.ts`
* **SECURITY:** Padrão Fail-Safe: Inconsistências de regras resultam em `NOT_DETERMINED` com recomendação de interdição.
* **ARCHITECTURE:** Motor de avaliação de alto nível que governa o status `AIRWORTHY` / `RESTRICTED` / `GROUNDED`.
* **DOCUMENTATION:** `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md` (Fase 6.4.1).
* **ROADMAP:** Integração com sistema de despacho de voo (Flight Operations / dispatch release).
* **LIMITATIONS:** A liberação técnica operacional depende de assinatura formal de Release to Service física/eletrônica.

---

### CAP-015: Aircraft Acquisition & Delivery Assessment Sandbox
* **NAME:** Sandbox de Auditoria de Aquisição e Devolução de Aeronaves (Delivery/Redelivery)
* **DESCRIPTION:** Ambiente isolado para auditoria técnica pré-entrega/redelivery de aeronaves de leasing. Permite cadastrar célula candidata (`isPreDeliveryAircraft: true`) sem contaminar a frota ativa, confrontar matriz do lessor contra o CAMO Register e emitir atestado com snapshot SHA-256.
* **STATUS:** `IMPLEMENTED`
* **VERSION:** 9.5.1
* **MODULES:** `server/camoEngine/aircraftDeliveryAssessmentEngine.ts`, `src/components/AircraftDeliveryView.tsx`
* **ENDPOINTS:** `GET /api/delivery-assessments`, `POST /api/delivery-assessments`, `POST /api/delivery-assessments/:id/discover`, `POST /api/delivery-assessments/:id/finalize`
* **DEPENDENCIES:** `regulatoryIntelligenceEngine.ts`, `dataStore.ts`
* **TESTS:** `test/phase7-delivery-assessment.test.ts`, `test/phase9-stage5-1-fleet-inventory.test.ts`
* **SECURITY:** Isolamento estrito de entidade: aeronaves candidatas pré-entrega não afetam métricas do Dashboard operacional.
* **ARCHITECTURE:** Sandbox desacoplado com snapshot criptográfico no encerramento.
* **DOCUMENTATION:** `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md` (Fase 7 e Fase 9.5).
* **ROADMAP:** Importação direta de relatórios de auditoria da IATA / ICAO via padrão XML/JSON.
* **LIMITATIONS:** A reconciliação com planilhas do lessor depende de padronização de nomenclatura de número de AD.

---

### CAP-016: Interactive Help Center, Guided Workflow & Operational Manual
* **NAME:** Central de Ajuda, Manual de Operação e Fluxo Guiado CAMO
* **DESCRIPTION:** Base de conhecimento técnico e operacional integrada com artigos categorizados, glossário de termos aeronáuticos oficiais, fluxo guiado em 6 etapas e drawer contextual de ajuda responsivo à tela ativa.
* **STATUS:** `IMPLEMENTED`
* **VERSION:** 9.4.0
* **MODULES:** `server/helpCenterService.ts`, `src/components/HelpCenterView.tsx`, `src/components/ContextualHelpDrawer.tsx`
* **ENDPOINTS:** `GET /api/help/metadata`, `GET /api/help/articles`, `GET /api/help/glossary`, `GET /api/help/search`
* **DEPENDENCIES:** `src/data/helpCenterData.ts`
* **TESTS:** `test/phase8-help-center.test.ts`
* **SECURITY:** Conteúdo estático versionado e auditado; proteção contra injeção em buscas.
* **ARCHITECTURE:** Motor de busca determinístico ponderado por relevância (título, termos-chave, corpo).
* **DOCUMENTATION:** `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md` (Fase 8).
* **ROADMAP:** Assistente interativo para busca semântica em manuais técnicos de manutenção (AMM/IPC).
* **LIMITATIONS:** Textos centralizados em arquivo fonte estruturado em TypeScript.

---

### CAP-017: Dynamic Aircraft Configuration Management
* **NAME:** Gestão Dinâmica de Configuração Real da Aeronave
* **DESCRIPTION:** Rastreabilidade de substituições de motores (ESN), troca de componentes rotáveis com diferentes Part Numbers e Serial Numbers, garantindo segregação canônica entre famílias (ex: CFM56-7B vs LEAP-1B) e recálculo determinístico de obrigações sem drift.
* **STATUS:** `IMPLEMENTED`
* **VERSION:** 9.4.0
* **MODULES:** `server/dataStore.ts`, `server/camoEngine/complianceObligationService.ts`, `src/components/FleetView.tsx`
* **ENDPOINTS:** `POST /api/fleet/component`, `POST /api/compliance-obligations/sync-from-fleet`
* **DEPENDENCIES:** `server/dataStore.ts`
* **TESTS:** `test/phase9-stage3-configuration.test.ts`
* **SECURITY:** Prevenção de rollback e datas futuras em atualizações de configuração.
* **ARCHITECTURE:** Sincronização reativa de obrigações afetadas por alteração de P/N instalado.
* **DOCUMENTATION:** `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md` (Fase 9 Etapa 3).
* **ROADMAP:** Histórico gráfico em linha do tempo das movimentações de componentes na célula.
* **LIMITATIONS:** Registro de remoção/instalação requer entrada estruturada do engenheiro ou via API de manutenção.

---

### CAP-018: Open Multi-Source Regulatory Intelligence & Knowledge Base
* **NAME:** Inteligência Regulatória Aberta Multi-Fonte & Base de Conhecimento
* **DESCRIPTION:** Motor de busca aberta por fabricante, família e modelo de aeronave, varrendo repositórios da FAA, EASA e ANAC. Extrai requisitos de configuração acumulando conhecimento técnico reutilizável (`RegulatoryKnowledgeItem`) desacoplado das aeronaves físicas.
* **STATUS:** `IMPLEMENTED`
* **VERSION:** 9.4.0
* **MODULES:** `server/camoEngine/regulatoryIntelligenceEngine.ts`, `src/components/RegulatoryIntelligenceView.tsx`
* **ENDPOINTS:** `POST /api/intel/candidates/search`, `POST /api/intel/candidates/analyze`, `GET /api/intel/knowledge-base`, `POST /api/intel/assess-configuration`
* **DEPENDENCIES:** `federalRegisterConnector.ts`, `dataStore.ts`, `geminiService.ts`
* **TESTS:** `test/phase9-stage4-regulatory-intelligence.test.ts`, `test/phase9-stage4-1-open-discovery.test.ts`
* **SECURITY:** Desacoplamento estrito: a Base de Conhecimento Regulatória não altera diretamente o status de conformidade de uma aeronave física.
* **ARCHITECTURE:** Motor ontológico que analisa a maturidade dos dados de configuração da aeronave frente aos requisitos da AD.
* **DOCUMENTATION:** `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md` (Fase 9 Etapa 4).
* **ROADMAP:** Indexação vetorial para cruzamento semântico de terminologias variantes entre FAA e EASA.
* **LIMITATIONS:** Consultas em tempo real com agências internacionais fora dos EUA operam sobre base catalogada e normalizada.

---

### CAP-019: CAMO Regulatory Register
* **NAME:** Livro-Razão Regulatório Permanente do Operador (CAMO Register)
* **DESCRIPTION:** Repositório mestre permanente, versionado e auditável de todas as ADs catalogadas pelo operador. A importação em lote a partir do motor de inteligência cria registros com status explícito `PENDING_ANALYSIS` sem acionamento prematuro de IA. Preserva histórico e hash SHA-256.
* **STATUS:** `IMPLEMENTED`
* **VERSION:** 9.5.1
* **MODULES:** `server/dataStore.ts`, `server/camoEngine/regulatoryIntelligenceEngine.ts`, `src/components/CamoRegulatoryRegisterView.tsx`
* **ENDPOINTS:** `GET /api/intel/register`, `POST /api/intel/register/import`, `GET /api/intel/fleet-search`
* **DEPENDENCIES:** `server/dataStore.ts`
* **TESTS:** `test/phase9-stage5-register.test.ts`, `test/phase9-stage5-1-fleet-inventory.test.ts`
* **SECURITY:** Idempotência com chave canônica `authority:adNumber`. Registros nunca são deletados silenciosamente; suporta versionamento de deltas (`v1`, `v2`).
* **ARCHITECTURE:** Master ledger regulatório do operador que alimenta a Fase de Análise e os relatórios de Delivery.
* **DOCUMENTATION:** `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md` (Fase 9 Etapa 5).
* **ROADMAP:** Sincronização bidirecional com sistemas legados de engenharia (ex: AMOS, Trax, Maintenix).
* **LIMITATIONS:** Exportação atual disponibilizada em formato CSV estruturado.

---

### CAP-020: Engineering Analysis Phase
* **NAME:** Fila de Triagem e Análise Técnica de Diretrizes
* **DESCRIPTION:** Fila de trabalho operacional especializada para os engenheiros CAMO realizarem a triagem deliberada de ADs ingeridas no Register. Converte registros de `PENDING_ANALYSIS` em `ANALYZED`, estruturando os requisitos e regras de aplicabilidade no CAMO.
* **STATUS:** `IMPLEMENTED`
* **VERSION:** 9.5.1
* **MODULES:** `src/components/AnalysisPhaseView.tsx`, `server/camoEngine/regulatoryIntelligenceEngine.ts`
* **ENDPOINTS:** `POST /api/intel/register/analyze`, `GET /api/intel/register`
* **DEPENDENCIES:** `geminiService.ts`, `ruleEngine.ts`, `dataStore.ts`
* **TESTS:** `test/phase9-stage5-register.test.ts`, `test/phase9-stage5-1-fleet-inventory.test.ts`
* **SECURITY:** Análise técnica sob demanda deliberada do usuário, garantindo auditoria do engenheiro responsável.
* **ARCHITECTURE:** Elo de transição entre o livro-razão de ADs descobertas e a geração de obrigações ativas na frota.
* **DOCUMENTATION:** `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md` (Fase 9 Etapa 5.1).
* **ROADMAP:** Triagem assistida com agrupamento automático por sistemas ATA afins.
* **LIMITATIONS:** Itens em fila exigem análise individual do corpo técnico de engenharia.

---

### CAP-021: Direct EASA SPT & ANAC SISAC Live Connectors
* **NAME:** Conectores REST em Tempo Real para EASA SPT e ANAC SISAC
* **DESCRIPTION:** Ingestão contínua direta e web scraping autorizado/API feeds para Diretrizes de Aeronavegabilidade da União Europeia (EASA) e do Brasil (ANAC) em tempo real, equiparando ao conector live da FAA Federal Register.
* **STATUS:** `PLANNED`
* **VERSION:** Roadmap Fase 10 (Release 10.0.0)
* **MODULES:** `server/regulatoryConnectors/easaSptConnector.ts`, `server/regulatoryConnectors/anacSisacConnector.ts`
* **ENDPOINTS:** `GET /api/regulatory/sources/easa/live`, `GET /api/regulatory/sources/anac/live`
* **DEPENDENCIES:** Acordos de integração governamental / Headless browser com resolução de desafios anti-bot.
* **TESTS:** A ser desenvolvido.
* **SECURITY:** Validação de certificados governamentais e controle rigoroso de rate limit.
* **ARCHITECTURE:** Extensão dos adaptadores em `regulatoryConnectors/`.
* **DOCUMENTATION:** `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md` (Seção 10).
* **ROADMAP:** Alvo Q1 2027.
* **LIMITATIONS:** EASA e ANAC não oferecem atualmente endpoints públicos REST estruturados sem necessidade de autenticação/token de sessão.

---

### CAP-022: Multi-Step Conditional Terminating Actions
* **NAME:** Ações Terminatórias Condicionais Multietapas
* **DESCRIPTION:** Modelagem de grafos de tarefas interdependentes para ações terminatórias onde o cumprimento definitivo de uma inspeção repetitiva exige modificações cumulativas em etapas distintas.
* **STATUS:** `PLANNED`
* **VERSION:** Roadmap Fase 10
* **MODULES:** `server/camoEngine/complianceObligationService.ts`
* **ENDPOINTS:** `POST /api/compliance-obligations/:id/terminating-step`
* **DEPENDENCIES:** `dueDateThresholdEngine.ts`
* **TESTS:** A ser desenvolvido.
* **SECURITY:** Bloqueio de status `TERMINATED` até a conclusão comprovada de todos os nós do grafo.
* **ARCHITECTURE:** Extensão da máquina de estados para suporte a sub-estados de terminação.
* **DOCUMENTATION:** `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md` (Seção 10).
* **ROADMAP:** Alvo Q2 2027.
* **LIMITATIONS:** Requer modelagem estruturada dos Service Bulletins envolvidos.

---

### CAP-023: Parametric Partial Supersedence Engine
* **NAME:** Motor de Superação Parcial Parametrizada por Configuração / MSN / S/N
* **DESCRIPTION:** Suporte a regras de substituição onde uma AD superadora revoga a anterior apenas para certos números de série de célula ou Part Numbers de componentes, mantendo a AD predecessora ativa para as demais aeronaves da frota.
* **STATUS:** `PLANNED`
* **VERSION:** Roadmap Fase 10
* **MODULES:** `server/camoEngine/complianceObligationService.ts`, `server/ruleEngine.ts`
* **ENDPOINTS:** `POST /api/compliance-obligations/supersede-partial`
* **DEPENDENCIES:** `applicabilityEvaluator.ts`
* **TESTS:** A ser desenvolvido.
* **SECURITY:** Rastreabilidade estrita de cisão de escopo regulatório.
* **ARCHITECTURE:** Matriz de supersedence por par `(Obligation, Entity)`.
* **DOCUMENTATION:** `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md` (Seção 10).
* **ROADMAP:** Alvo Q2 2027.
* **LIMITATIONS:** Complexidade combinatorial elevada em operadores com frotas mistas de gerações diferentes.

---

### CAP-024: Service Bulletins (SB) & Engineering Orders (EO) Module
* **NAME:** Gestão Integrada de Boletins de Serviço (SB) e Ordens de Engenharia (EO)
* **DESCRIPTION:** Repositório estruturado para Boletins de Serviço emitidos pelos fabricantes (Boeing, Airbus, CFM, GE, Pratt & Whitney) e emissão de Ordens de Engenharia internas vinculadas aos requisitos mandatórios de ADs.
* **STATUS:** `FUTURE_EXPLORATORY`
* **VERSION:** Roadmap Fase 11
* **MODULES:** Módulos a criar em `server/engineeringOrders/` e `src/components/EngineeringOrdersView.tsx`
* **ENDPOINTS:** `GET /api/engineering-orders`, `POST /api/engineering-orders`
* **DEPENDENCIES:** Integração com portais de clientes OEM (ex: Boeing MyBoeingFleet, AirbusWorld).
* **TESTS:** A ser desenvolvido.
* **SECURITY:** Proteção de propriedade intelectual e dados proprietários de engenharia dos fabricantes.
* **ARCHITECTURE:** Módulo de conexão entre a obrigação regulatória e a execução física no hangar.
* **DOCUMENTATION:** `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md` (Seção 10).
* **ROADMAP:** Alvo 2027/2028.
* **LIMITATIONS:** Acesso restrito via credenciais corporativas dos fabricantes.

---

### CAP-025: Fleet Asset Management CRUD, Inactivation & Safe Decommissioning
* **NAME:** Gestão Cadastral da Frota, Edição, Transição de Status e Descomissionamento Seguro
* **DESCRIPTION:** Capacidade de edição cadastral em tempo real de células de aeronaves (matrícula, MSN, horas TSN, ciclos CSN, pousos, notas), transição formal de status operacional (inutilização, estocagem, preservação, manutenção, descarte) com registro obrigatório de justificativa técnica e exclusão segura com desassociação em cascata de motores para status STORED e marcação de componentes como REMOVED, gerando registros indeléveis no Livro de Auditoria.
* **STATUS:** `IMPLEMENTED`
* **VERSION:** 9.5.2
* **MODULES:** `server.ts`, `server/dataStore.ts`, `src/components/FleetView.tsx`
* **ENDPOINTS:** `PUT /api/fleet/aircraft/:id`, `PATCH /api/fleet/aircraft/:id/status`, `DELETE /api/fleet/aircraft/:id`
* **DEPENDENCIES:** `server/dataStore.ts`, `server/camoEngine/fleetAirworthinessControlEngine.ts`
* **TESTS:** `test/phase9-aircraft-crud.test.ts`
* **SECURITY:** Validação estrita de unicidade de matrícula/MSN, obrigatoriedade de justificativa técnica para inativação e desvinculação em cascata impedindo registros órfãos.
* **ARCHITECTURE:** Gestão do ciclo de vida de ativos físicos com sincronização direta no motor de avaliação de aeronavegabilidade sem quebras operacionais.
* **DOCUMENTATION:** `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md` (Seção 4.14), `PRODUCT_VISION_ROADMAP.md` (Seção 3).
* **ROADMAP:** Integração com portais de registro aeronáutico (RAB ANAC / FAA Registry).
* **LIMITATIONS:** Exclusão definitiva permitida apenas para correções de cadastros incorretos; aeronaves com histórico de voo operacional devem utilizar o status `DECOMMISSIONED`.

---

### CAP-026: Living Governance, Product Vision, Strategic Roadmap & AI Dev Guide
* **NAME:** Governança Viva, Memória Estratégica Independente e Contrato de Desenvolvimento para IA
* **DESCRIPTION:** Estrutura documental canônica e viva no repositório, garantindo continuidade autônoma do produto sem dependência de janelas de contexto de chat. Inclui Visão de Longo Prazo integrada PCM + CAMO (`PRODUCT_VISION_ROADMAP.md`), Contrato Operacional Inegociável para Agentes de IA (`AI_DEVELOPMENT_GUIDE.md`), Catálogo de Capacidades Auditadas (`CAPABILITY_REGISTRY.md`) e Dossiê Arquitetural Completo (`DOSSIE_ARQUITETURA_SISTEMA_CAMO.md`), acessíveis e exportáveis diretamente pela interface web da plataforma.
* **STATUS:** `IMPLEMENTED`
* **VERSION:** 9.5.2
* **MODULES:** `server.ts`, `src/components/ArchitectureView.tsx`, `src/components/ArchitectureDossierModal.tsx`, `PRODUCT_VISION_ROADMAP.md`, `AI_DEVELOPMENT_GUIDE.md`
* **ENDPOINTS:** `GET /api/system/capabilities`, `GET /api/system/audit`, `GET /api/system/product-vision`, `GET /api/system/ai-development-guide`, `GET /api/architecture-dossier`
* **DEPENDENCIES:** Sistema de arquivos e integridade Markdown em UTF-8.
* **TESTS:** `test/phase9-governance-docs.test.ts`
* **SECURITY:** Rastreabilidade estrita de versões, validação de invariantes regulatórios e bloqueio de criação de arquiteturas paralelas.
* **ARCHITECTURE:** Cadeia integrada de governança: README (resumo) ➔ Product Vision (direção estratégica) ➔ Capability Registry (capacidades) ➔ Dossiê (arquitetura técnica) ➔ AI Dev Guide (regras de evolução).
* **DOCUMENTATION:** `DOSSIE_ARQUITETURA_SISTEMA_CAMO.md`, `AI_DEVELOPMENT_GUIDE.md`, `PRODUCT_VISION_ROADMAP.md`.
* **ROADMAP:** Validação de conformidade de código em tempo de commit contra os invariantes do AI Dev Guide via linter customizado.
* **LIMITATIONS:** Documentação mantida em sincronia manual disciplinada por agentes e desenvolvedores durante cada pull request ou etapa de desenvolvimento.

---

## 2. MATRIZ DE RASTREABILIDADE DE CAPACIDADES

| CAP-ID | Nome Curto | Status | Versão | Módulos Centrais | Cobertura de Teste |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CAP-001** | Domain & Fleet Model | `IMPLEMENTED` | 9.0.0 | `types.ts`, `dataStore.ts`, `FleetView.tsx` | PASS (100%) |
| **CAP-002** | Gemini AI AD Extraction | `IMPLEMENTED` | 9.4.0 | `geminiService.ts`, `AdUploadView.tsx` | PASS (100%) |
| **CAP-003** | Rule Engine V2 | `IMPLEMENTED` | 9.3.0 | `ruleEngine.ts`, `applicabilityEvaluator.ts` | PASS (100%) |
| **CAP-004** | Knowledge Facts & Questions | `IMPLEMENTED` | 9.0.0 | `dataStore.ts`, `AdDetailView.tsx` | PASS (100%) |
| **CAP-005** | FAPT Digital Signatures | `IMPLEMENTED` | 9.0.0 | `pdfGenerator.ts`, `FaptListView.tsx` | PASS (100%) |
| **CAP-006** | Federal Register Connector | `IMPLEMENTED` | 9.1.0 | `federalRegisterConnector.ts`, `sourceRegistry.ts` | PASS (100%) |
| **CAP-007** | Crypto Vault & Anti-SSRF | `IMPLEMENTED` | 9.1.0 | `officialDocumentAcquisitionService.ts` | PASS (100%) |
| **CAP-008** | Regulatory Discovery Engine | `IMPLEMENTED` | 9.2.0 | `regulatoryDiscoveryEngine.ts` | PASS (100%) |
| **CAP-009** | Automated Fleet Screening | `IMPLEMENTED` | 9.2.0 | `fleetScreeningEngine.ts` | PASS (100%) |
| **CAP-010** | 8-Stage Autonomous Pipeline | `IMPLEMENTED` | 9.3.0 | `compliancePipelineOrchestrator.ts` | PASS (100%) |
| **CAP-011** | 13-State Obligation Lifecycle | `IMPLEMENTED` | 9.4.0 | `complianceObligationService.ts` | PASS (100%) |
| **CAP-012** | Due Date & Threshold Engine | `IMPLEMENTED` | 9.4.0 | `dueDateThresholdEngine.ts` | PASS (100%) |
| **CAP-013** | Evidence Verification Engine | `IMPLEMENTED` | 9.4.0 | `evidenceVerificationEngine.ts` | PASS (100%) |
| **CAP-014** | Fleet Airworthiness Control | `IMPLEMENTED` | 9.4.0 | `fleetAirworthinessControlEngine.ts` | PASS (100%) |
| **CAP-015** | Delivery Assessment Sandbox | `IMPLEMENTED` | 9.5.1 | `aircraftDeliveryAssessmentEngine.ts` | PASS (100%) |
| **CAP-016** | Help Center & Guided Workflow | `IMPLEMENTED` | 9.4.0 | `helpCenterService.ts`, `HelpCenterView.tsx` | PASS (100%) |
| **CAP-017** | Dynamic Configuration | `IMPLEMENTED` | 9.4.0 | `dataStore.ts`, `FleetView.tsx` | PASS (100%) |
| **CAP-018** | Regulatory Intelligence & KB | `IMPLEMENTED` | 9.4.0 | `regulatoryIntelligenceEngine.ts` | PASS (100%) |
| **CAP-019** | CAMO Regulatory Register | `IMPLEMENTED` | 9.5.1 | `dataStore.ts`, `CamoRegulatoryRegisterView.tsx` | PASS (100%) |
| **CAP-020** | Engineering Analysis Phase | `IMPLEMENTED` | 9.5.1 | `AnalysisPhaseView.tsx`, `regulatoryIntelligenceEngine.ts` | PASS (100%) |
| **CAP-021** | Live EASA/ANAC Connectors | `PLANNED` | 10.0.0 | `easaSptConnector.ts`, `anacSisacConnector.ts` | Planejado |
| **CAP-022** | Multi-Step Terminating Action | `PLANNED` | 10.0.0 | `complianceObligationService.ts` | Planejado |
| **CAP-023** | Partial Supersedence Matrix | `PLANNED` | 10.0.0 | `complianceObligationService.ts`, `ruleEngine.ts` | Planejado |
| **CAP-024** | SBs & Engineering Orders (EO) | `FUTURE_EXPLORATORY` | 11.0.0 | A definir | Exploratório |
| **CAP-025** | Fleet CRUD & Decommissioning | `IMPLEMENTED` | 9.5.2 | `server.ts`, `FleetView.tsx`, `dataStore.ts` | PASS (100%) |
| **CAP-026** | Living Governance & AI Guide | `IMPLEMENTED` | 9.5.2 | `PRODUCT_VISION_ROADMAP.md`, `AI_DEVELOPMENT_GUIDE.md` | PASS (100%) |

---
*Capability Registry homologado pela Engenharia de Confiabilidade & Governança CAMO.*
