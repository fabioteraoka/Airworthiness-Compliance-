# DOSSIÊ EXECUTIVO DE ARQUITETURA DE SISTEMA & ENGENHARIA CAMO
## Airworthiness Compliance Intelligence Platform (PROJETO CAMO)
**Documento Técnico Oficial de Arquitetura, Engenharia de Software e Conformidade Regulatória**

---

### METADADOS DO SISTEMA
* **Nome do Sistema:** Airworthiness Compliance Intelligence (CAMO Intelligence)
* **Operador de Demonstração:** Blue-Sky Logistics (Certificado CAMO-PT.042)
* **Regulamentações Alvo:** FAA 14 CFR Part 39 / EASA Part-M (Subpart G/CAMO) / ANAC RBAC 121 & RBAC 39
* **Versão da Arquitetura:** Release 6.2.0 (Due Date & Threshold Engine — Deterministic Compliance Limits)
* **Data do Dossiê / Encerramento:** 03 de Setembro de 2026
* **Status Formal de Encerramento:** **GREEN — 100% AUDITADO** (Due Date & Threshold Engine Operacional & Integrado)

---

## 1. SUMÁRIO EXECUTIVO & MISSÃO DO SISTEMA

O **Airworthiness Compliance Intelligence** é uma plataforma de engenharia de software aeronáutico desenvolvida para revolucionar e blindar os processos de controle de aeronavegabilidade continuada (CAMO — *Continuing Airworthiness Management Organization*).

### O Princípio Zero da Segurança Aeronáutica (Tripartição de Responsabilidade)
A plataforma é rigidamente alicerçada sobre uma diretriz de segurança não negociável:
1. **Inteligência Artificial (Gemini 3.7 Flash):** Atua exclusivamente na **extração, leitura e estruturação de documentos técnicos complexos e não estruturados** (PDFs de Diretrizes de Aeronavegabilidade — ADs, Boletins de Serviço — SBs e Notificações Regulatórias), convertendo texto narrativo em esquemas tipados. **A IA nunca declara conformidade ou aplicabilidade de forma autônoma**.
2. **Motor de Regras Determinístico (CAMO Rule Engine V2):** Executa **lógica booleana e matemática estrita** contra a base de dados da frota do operador. Cruza fabricantes, modelos canônicos, faixas de números de série (MSN/ESN), part numbers (P/Ns) de rotáveis e modificações. Sob ausência de dados, a regra mandatória é: *Falta de informação gera `REVIEW_REQUIRED`, jamais `NOT_APPLICABLE`*.
3. **Engenheiro CAMO Humano:** Mantém a **autoridade regulatória exclusiva e final**. Responde a questionamentos técnicos gerados pelo sistema mediante evidências documentais (cadernetas, Form 8130-3, EASA Form 1), consolidando a memória técnica (*Knowledge Facts*) e chancelando digitalmente as Folhas de Análise e Parecer Técnico (FAPT).

---

## 2. MAPA EVOLUTIVO DE FASES IMPLEMENTADAS

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             PROJETO CAMO — EVOLUÇÃO ARQUITETURAL                                  │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│  [FASE 1] FUNDAÇÃO & 3 PILARES                                                                   │
│  ├─ IA Gemini 3.7 Flash (Extração de PDFs)                                                       │
│  ├─ Motor de Regras V1 (Booleano Estrito)                                                        │
│  ├─ Ciclo de Perguntas Interativo & Memória Técnica (Knowledge Facts)                            │
│  └─ Modelo de Domínio Relacional (Frota, Motores, Componentes, Trilha de Auditoria)              │
│                                                                                                  │
│  [FASE 2] MOTOR DE REGRAS V2 & GERAÇÃO DE FAPT                                                   │
│  ├─ Desacoplamento da Lógica de Avaliação de Regras                                              │
│  ├─ Resolução Canônica de Modelos (B737_NG vs B737_MAX vs A320)                                  │
│  ├─ Rastreabilidade de Softwares Embarcados & Modificações                                       │
│  └─ Emissão Formal e Assinatura Digital de FAPTs (Folhas de Parecer Técnico)                     │
│                                                                                                  │
│  [FASE 3] CONECTORES REGULATÓRIOS OFICIAIS                                                       │
│  ├─ Conexão com API Oficial da Federal Register (Governo dos EUA)                                │
│  ├─ Triagem Preliminar de Frota (Scoping Filter por Modelo Canônico)                             │
│  └─ Reconciliação Multi-Fonte (Metadados Oficiais vs Banco Interno)                              │
│                                                                                                  │
│  [FASE 4] COFRE CRIPTOGRÁFICO DE AQUISIÇÃO & SEGURANÇA SSRF                                      │
│  ├─ Aquisição Direta de PDFs Oficiais do GPO (govinfo.gov / federalregister.gov)                 │
│  ├─ Blindagem Anti-SSRF (Bloqueio de IPs Privados, Metadados e Validação Hop-by-Hop de Redirects)│
│  ├─ Cofre Idempotente com Deduplicação Baseada em Hash SHA-256                                   │
│  └─ Modo Dual: Modo 1 (Aquisição Criptográfica) & Modo 2 (Aquisição + Document Intelligence)     │
│                                                                                                  │
│  [FASE 5.1 & 5.1A] MOTOR DE DESCOBERTA CONTÍNUA & PROVENIÊNCIA GRANULAR                          │
│  ├─ Varredura Contínua e Incremental de Diretrizes FAA 14 CFR Part 39                            │
│  ├─ Deduplicação Idempotente de Varredura (NEW -> ALREADY_KNOWN com 0 Duplicatas)                │
│  ├─ Segregação Estrita de Proveniência (SOURCE_METADATA 100% vs DERIVED_METADATA 98%)            │
│  └─ Política Anti-Inferência Estrita (0 Números de AD Fabricados ou Especulativos)               │
│                                                                                                  │
│  [FASE 5.2] MOTOR DE TRIAGEM AUTOMATIZADA DE FROTA (Scoping Filter v5.2.0)                       │
│  ├─ Resolução Canônica Estrita de Fabricante & Família de Aeronaves                              │
│  ├─ Segregação Fina entre Famílias Canônicas (B737_MAX ≠ B737_NG -> NO_MATCH)                    │
│  ├─ Triagem Determinística em Três Vias (POTENTIAL_MATCH / NO_MATCH / INSUFFICIENT_METADATA)      │
│  └─ Rastreabilidade de Regra Aplicada & Proveniência de Extração                                 │
│                                                                                                  │
│  [FASE 5.3 & 5.3.1] PIPELINE END-TO-END AUTÔNOMO & HARDENING ADVERSARIAL                          │
│  ├─ Orquestrador Determinístico de 8 Estágios Atômicos e Idempotentes (v5.3.1)                    │
│  ├─ Execução Unitária, em Lote (Batch) e Reativa a Varreduras de Descoberta                      │
│  ├─ Curto-Circuito Seguro: COMPLETED_NO_MATCH sem Consumo de Recursos de Extração                │
│  ├─ Proteção Adversarial contra Falsos-Negativos em ADs Genéricas / Categoria Transporte          │
│  ├─ Detecção Proativa de STCs e Modificações de Configuração (Força INSUFFICIENT_METADATA)        │
│  ├─ Pareamento Natural de Motores e Resiliência a Inventários Incompletos                         │
│  ├─ Rastreamento e Enlace de ADs Revogadas/Superadas (Supersedence Tracking)                      │
│  ├─ Carimbo Rígido de Versões dos Submotores (Pipeline, Rule Engine, Screening, Extractor)        │
│  ├─ Mecanismo Automático de Recuperação de Travamento (Crash Recovery para Execuções RUNNING)     │
│  ├─ Estruturação Automática de Requisito de Conformidade (ComplianceRequirement)                 │
│  ├─ Avaliação Determinística no Motor de Regras V2 & Geração de FAPT Preliminar                  │
│  └─ Gateway de Revisão Humana Obrigatória para Discrepâncias e Perguntas Abertas                 │
│                                                                                                  │
│  [FASE 6.1] COMPLIANCE LIFECYCLE CORE & TEMPORAL MODEL (Release 6.1.0)                            │
│  ├─ Segregação Ontológica: Regulatory Requirement vs Compliance Obligation vs Compliance Evidence │
│  ├─ Máquina de Estados Determinística de 13 Estados (IDENTIFIED -> ... -> COMPLIED)               │
│  ├─ Invariante Estrita de Aeronavegabilidade: Transição para COMPLIED exige Evidência Verificada   │
│  ├─ Motor Temporal Contínuo: Limites de Calendário, Horas de Voo (FH) e Ciclos (FC)              │
│  ├─ Gestão de Ciclos Repetitivos (COMPLIED -> NEXT_CYCLE_OPEN com recálculo automático)           │
│  ├─ Ações Terminatórias (Terminating Action) com Encerramento Definitivo de Repetitivas           │
│  ├─ Superação de Diretrizes (SUPERSEDED) com Preservação Integral de Histórico e Evidências       │
│  ├─ Gateway de Revisão Humana (CONFIRMED / OVERRIDDEN / DISMISSED) com Trilha de Auditoria        │
│  └─ Bateria de 20 Testes Determinísticos Obrigatórios (100% GREEN)                               │
│                                                                                                  │
│  [FASE 6.2] DUE DATE & THRESHOLD ENGINE (Release 6.2.0)                                          │
│  ├─ Motor Determinístico de Cálculo de Limites Temporais (DueDateThresholdEngine)                │
│  ├─ Aritmética de Calendário Exata (Prevenção de Rollover em Fins de Mês e Anos Bissextos)       │
│  ├─ Operadores Temporais: WITHIN, BEFORE, AFTER, AT_ACCUMULATED, AT_TOTAL, NO_LATER_THAN         │
│  ├─ Operadores de Composição: WHICHEVER_OCCURS_FIRST, WHICHEVER_OCCURS_LATER, BOTH_AND           │
│  ├─ Resolução Canônica de Eventos de Referência (EFFECTIVE_DATE, LAST_COMPLIANCE, INSTALLATION)  │
│  ├─ Detecção de Invariantes: Rollback de Horímetro, Horas Negativas -> DATA_INTEGRITY_REVIEW      │
│  ├─ Trilha Criptográfica de Auditoria (Hash Determinístico de Cálculo e Entradas)                │
│  ├─ Parser Sintático de Requisitos Regulamentares em Linguagem Natural (FAA/EASA)                 │
│  └─ Bateria de 48 Testes Determinísticos & Adversariais (100% GREEN)                             │
│                                                                                                  │
│  [FASE 6.3+ ROADMAP] EXPANSÕES FUTURAS                                                           │
│  ├─ Conectores EASA (Safety Publications Tool) e ANAC (Brasil)                                   │
│  ├─ Gestão de Boletins de Serviço (SBs) e Ordens de Engenharia (EOs)                             │
│  └─ Programa de Manutenção de Aeronaves (AMP/MPD) e Peças de Vida Limite (LLP/Hard Time)         │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. DETALHAMENTO DAS FASES IMPLEMENTADAS

### FASE 1: FUNDAÇÃO CAMO, ARQUITETURA DE 3 PILARES & MEMÓRIA TÉCNICA
* **Pipeline de Ingestão de Documentos:** Suporte a upload de PDFs e textos de ADs de alta complexidade.
* **Extração Guiada por IA (Gemini 3.7 Flash):** Reconhecimento de dados de cabeçalho, autoridade emissora, datas mandatórias, regras de aplicabilidade (fabricante, modelo, faixa de MSN, P/Ns de componentes, modificações) e ações requeridas (inspeções, modificações, substituições, intervalos de repetição).
* **Ciclo de Resolução de Informações Faltantes:** Quando a AD cita um componente ou modificação cujo status é desconhecido na aeronave, o sistema formula uma pergunta técnica objetiva para o engenheiro CAMO.
* **Knowledge Facts:** Respostas do engenheiro com anexação de evidências documentais (caderneta, Form 8130-3) são transformadas em fatos permanentes auditados, que realimentam o motor de regras instantaneamente.

### FASE 2: MOTOR DE REGRAS V2 & GERAÇÃO DE FAPT
* **Modelo Canônico de Aeronaves:** Diferenciação matemática precisa entre modelos e gerações (ex: Boeing 737-800 pertence à família B737_NG, enquanto 737-8 pertence à família B737_MAX).
* **Avaliação Multinível:** Verificação hierárquica em 4 camadas: Célula (Make/Model/MSN) -> Motores Instalados (ESN/Position) -> Componentes Rotáveis (P/N e S/N) -> Softwares e Modificações.
* **Folha de Análise e Parecer Técnico (FAPT):** Geração automática do documento formal exigido pelas autoridades de aviação civil (ANAC/FAA/EASA), contendo matriz de aplicabilidade completa da frota, prazos, ações mandatórias, referências de evidências e hash de assinatura digital.

### FASE 3: CONECTORES REGULATÓRIOS OFICIAIS & TRIAGEM DE FROTA
* **Integração com Federal Register API:** Conexão live com o repositório governamental oficial dos Estados Unidos para consulta direta de publicações da FAA.
* **Mecanismo de Triagem de Frota (Fleet Regulatory Screening):** Avaliação prévia instantânea de impacto regulatório em lote contra todo o inventário do operador antes da ingestão detalhada.
* **Reconciliador Multi-Fonte:** Algoritmo que compara registros de diferentes fontes regulatórias e aponta discrepâncias de revisão, datas e números de docket.

### FASE 4: COFRE CRIPTOGRÁFICO DE AQUISIÇÃO OFICIAL & DEFESA SSRF
* **Aquisição Automatizada Segura:** Download de documentos oficiais a partir de URLs governamentais validadas (`govinfo.gov`, `federalregister.gov`, `drs.faa.gov`).
* **Proteção em Múltiplas Camadas contra SSRF:**
  - Whitelist estrita de domínios governamentais autorizados.
  - Bloqueio determinístico de endereços IP privados e de loopback (127.0.0.1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, link-local 169.254.169.254).
  - Bloqueio de evasões de representação (notações octal, hexadecimal, decimal dword e IPv4-mapped IPv6).
  - Validação per-hop em redirecionamentos HTTP (301, 302, 307, 308).
* **Cofre Idempotente com Deduplicação SHA-256:** Garantia de que cada arquivo PDF seja armazenado uma única vez com integridade criptográfica verificada por hash.
* **Modos de Execução:** Modo 1 (Aquisição e Validação no Cofre) e Modo 2 (Aquisição + Processamento no Pipeline de Inteligência de Documentos).

### FASE 5.1 & 5.1A: MOTOR DE DESCOBERTA CONTÍNUA & PROVENIÊNCIA GRANULAR
* **Motor de Descoberta Contínua (Regulatory Discovery Engine):** Varredura periódica e sob demanda na Federal Register API filtrada especificamente para FAA Title 14 CFR Part 39 Final Rules.
* **Deduplicação Idempotente de Varreduras:** Classificação exata em `NEW` (novas diretrizes ainda não registradas) e `ALREADY_KNOWN` (diretrizes já catalogadas), garantindo zero duplicações.
* **Rastreabilidade e Proveniência Granular Campo a Campo:**
  - `SOURCE_METADATA` (100% de confiança): Metadados extraídos diretamente dos campos oficiais da API (ex: `documentNumber`, `publicationDate`, `effectiveDate`, `citation`, `pdfUrl`).
  - `DERIVED_METADATA` (com regras explícitas): Metadados inferidos a partir de estruturas identificadoras (ex: `adNumber` derivado de `docket_ids` com 98% de confiança via regra `DOCKET_IDS_EXPLICIT_IDENTIFIER`).
* **Política Anti-Inferência Estrita:** Eliminação de fallbacks em textos livres narrativos. Se não houver evidência estruturada inequívoca, o número da AD permanece como indefinido para revisão manual, impedindo qualquer fabricação de dados técnicos.

### FASE 5.2: MOTOR DE TRIAGEM AUTOMATIZADA DE FROTA (Scoping Filter v5.2.0)
* **Resolução Canônica Estrita de Famílias:** Normalização determinística de modelos regulatórios e de frota em famílias canônicas (`B737_NG`, `B737_MAX`, `B737_CLASSIC`, `A320_CEO`, `A320_NEO`, `B747_SERIES`, `B777_SERIES`, etc.).
* **Regra Fundamental de Mesmo Fabricante:** O mesmo fabricante (ex: Boeing) **NÃO** é suficiente para gerar `POTENTIAL_MATCH` se as famílias canônicas divergirem (ex: AD para Boeing 747-400 contra frota de Boeing 737-800 resulta estritamente em `NO_MATCH`).
* **Segregação Entre Sub-Famílias:** Diferenciação estrita entre 737-8 (`B737_MAX`) e 737-800 (`B737_NG`), impedindo falsos positivos entre gerações distintas.
* **Triagem Tridimensional:**
  - `POTENTIAL_MATCH`: Fabricante compatível E modelo/família canônica compatível ou aplicabilidade genérica de série.
  - `NO_MATCH`: Fabricante divergente OU família canônica divergente.
  - `INSUFFICIENT_METADATA`: Falta de fabricante ou modelo na diretriz (aciona revisão de segurança).

### FASE 5.3 & 5.3.1: PIPELINE END-TO-END AUTÔNOMO DE CONFORMIDADE REGULATÓRIA & ENDURECIMENTO ADVERSARIAL
* **Orquestrador de 8 Estágios Atômicos (Orchestrator v5.3.1):**
  1. **DISCOVERY:** Detecção e ingestão do registro da Federal Register via Discovery Engine.
  2. **FLEET_SCREENING:** Triagem determinística contra o inventário da frota (Scoping Filter v5.2.1 com blindagem adversarial).
  3. **OFFICIAL_ACQUISITION:** Aquisição do PDF oficial via GovInfo/GPO com validação SSRF e cofre SHA-256 (`OfficialDocumentAcquisitionService v4.0.0`).
  4. **DOCUMENT_INTELLIGENCE:** Extração estruturada do documento via Gemini 3.7 Flash em esquema JSON tipado com fallback determinístico estruturado.
  5. **REQUIREMENT_STRUCTURING:** Criação atômica da entidade `ComplianceRequirement` e `ApplicabilityRule` no `camoDb`, com rastreamento e enlace de ADs superadas (`supersedes` / `supersededBy`).
  6. **CAMO_RULE_ENGINE:** Execução do CAMO Rule Engine V2 (`RuleEngine v2.1.0`) para cada aeronave da frota, identificando aplicabilidade e formulando perguntas técnicas se houver lacunas de dados.
  7. **FLEET_ASSESSMENT_CONSOLIDATION:** Geração automática da Folha de Análise e Parecer Técnico (FAPT) preliminar e consolidação da matriz de conformidade da frota.
  8. **HUMAN_REVIEW_GATEWAY:** Gateway de segurança que avalia a necessidade mandatória de intervenção humana (perguntas técnicas abertas, divergências de modelo, fallbacks acionados, ADs superadas ou datas futuras de efetividade).

* **Invariantes e Endurecimentos Adversariais (Fase 5.3.1):**
  - **Bloqueio de Falso-Negativo em ADs Genéricas / Categoria Transporte:** Diretrizes regulatórias que afetam múltiplos modelos ou classes de aeronaves (ex: *"Various Transport Category Airplanes"*, aviônicos Collins/Honeywell, modificações de galleys) sem lista explícita de `models` são categorizadas como `INSUFFICIENT_METADATA` e encaminhadas para aquisição oficial e análise documental, impedindo o curto-circuito indevido.
  - **Detecção Proativa de STCs e Modificações:** Menções a Certificados de Tipo Suplementar (STC) no título ou resumo forçam `INSUFFICIENT_METADATA` para aeronaves da mesma série/família (ex: STC de winglets em 737-800), impedindo que a ausência do registro de STC no inventário inicial resulte em falsa exclusão.
  - **Pareamento Natural de Motores e Resiliência de Inventário:** Isolamento estrito entre famílias de motores (ex: CFM56-7B de B737_NG vs LEAP-1B de B737_MAX), garantindo que diretrizes de motores excluam frotas não equipadas sem disparar falsos positivos, enquanto frotas com dados parciais de motor são protegidas.
  - **Rastreamento e Enlace de Superação (Supersedence Tracking):** Quando uma nova AD revoga ou substitui diretrizes anteriores (ex: AD 2025-99-99 revoga AD 2020-24-02), o orquestrador marca os requisitos anteriores com `status: 'SUPERSEDED'`, preenche `supersededBy`, preserva o histórico de cumprimento e aciona o Gateway de Revisão Humana para transição segura de obrigações repetitivas.
  - **Carimbo Rígido de Metadados de Versão:** Cada registro de execução armazena `pipelineVersion: '5.3.1'`, `ruleEngineVersion: '2.1.0'`, `screeningEngineVersion: '5.2.1'`, `acquisitionEngineVersion: '4.0.0'` e `extractorVersion: '4.0.0'`, garantindo reprodutibilidade estrita em auditorias regulatórias.
  - **Mecanismo de Recuperação de Travamento (Crash Recovery):** O método `recoverStuckExecutions(timeoutMinutes)` identifica execuções retidas no estado `RUNNING` (por reinicialização de servidor ou interrupção de rede), transiciona-as com segurança para `FAILED` com justificativa de timeout e registra a anomalia na trilha de auditoria.
  - **Curto-Circuito Seguro (`COMPLETED_NO_MATCH`):** Se a triagem de frota concluir que 100% das aeronaves resultam comprovadamente em `NO_MATCH`, o pipeline finaliza com status `COMPLETED_NO_MATCH`, economizando chamadas de IA e processamento com 100% de segurança determinística.

### FASE 6.1: COMPLIANCE LIFECYCLE CORE & TEMPORAL COMPLIANCE MODEL (Release 6.1.0)
* **Objetivo Estratégico:** Transição da plataforma de *Regulatory Compliance Intelligence* para *Continuous Regulatory Compliance Management*, estabelecendo um modelo temporal determinístico de obrigações físicas de aeronavegabilidade.
* **Segregação Ontológica Estrita:**
  1. `Regulatory Requirement` (`ComplianceRequirement`): A exigência jurídica e técnica abstrata presente na AD/SB.
  2. `Compliance Obligation` (`ComplianceObligation`): A instância física vinculativa dessa regra aplicada a uma entidade concreta (`Aircraft`, `Engine`, `Component`, `Software`, `Fleet`).
  3. `Compliance Evidence` (`ObligationEvidenceLink`): A prova documental objetiva de cumprimento técnico (Ordens de Serviço, Logs de Voo, Tags 8130-3, FAPTs).
* **Máquina de Estados Finita Determinística (13 Estados):**
  - Estados Iniciais / Avaliativos: `IDENTIFIED`, `APPLICABILITY_PENDING`, `APPLICABLE`, `NOT_APPLICABLE`, `REVIEW_REQUIRED`.
  - Estados Temporais Ativos: `NOT_YET_EFFECTIVE`, `OPEN`, `DUE_SOON`, `OVERDUE`.
  - Estados de Cumprimento & Ciclo: `COMPLIED`, `NEXT_CYCLE_OPEN`.
  - Estados Terminais / Administrativos: `SUPERSEDED`, `CANCELLED`.
* **Invariantes Inegociáveis de Aeronavegabilidade:**
  - *Invariante de Evidência:* Transição para `COMPLIED` **exige obrigatoriamente evidência objetiva verificada** (`verified === true`). Transições para `COMPLIED` sem evidência são categoricamente rejeitadas pelo motor (`TRANSITION_REJECTED`).
  - *Invariante de Não-Fabricação:* O sistema nunca inventa horas de voo (FH), ciclos (FC) ou datas inexistentes.
  - *Invariante de Incerteza:* `UNKNOWN ≠ NOT_APPLICABLE` e `UNKNOWN ≠ COMPLIED`. Qualquer lacuna gera `REVIEW_REQUIRED`.
  - *Invariante de Imutabilidade da Trilha:* Todas as transições gravam `fromStatus`, `toStatus`, `reason`, `timestamp`, `ruleResponsible`, `actor` e `actorRole`.
* **Motor de Cálculo Temporal Contínuo:**
  - Janelas de Alerta (`DUE_SOON`): <= 30 dias de calendário, <= 100 horas de voo (FH) ou <= 50 ciclos de voo (FC).
  - Vencimento Mandatório (`OVERDUE`): Dias restantes < 0, ou FH/FC restantes < 0.
  - Recálculo Automático de Repetitivas: `COMPLIED` -> `NEXT_CYCLE_OPEN` avança `cycleCount` e estabelece novo `nextDueFH = lastComplianceFH + intervalValue`.
  - Ação Terminatória (`isTerminatingAction`): Cumprimento da ação terminatória encerra permanentemente os ciclos de inspeção repetitiva.
  - Superação Regulatória (`markSuperseded`): Transição para `SUPERSEDED` preserva 100% das evidências, pareceres e transições passadas.
* **Gateway de Revisão Humana:**
  - Permite ao Engenheiro-Chefe registrar decisões formais (`CONFIRMED`, `OVERRIDDEN`, `DISMISSED`) com justificativa técnica e AMOC, sem apagar o estado gerado pelo motor automático (`originalAutoStatus`).

---

## 4. ESQUEMA DE ENTIDADES E DOMÍNIO RELACIONAL

```
┌─────────────────┐       1:N      ┌─────────────────┐       1:N      ┌─────────────────────────┐
│    Operator     ├────────────────┤    Aircraft     ├────────────────┤ ComponentInstallation   │
│ (Certificado    │                │ (MSN, Matrícula,│                │ (Posição, P/N, S/N,     │
│  CAMO-PT.042)   │                │  Horas, Ciclos) │                │  Data de Instalação)    │
└─────────────────┘                └────────┬────────┘                └────────────┬────────────┘
                                            │                                      │
                                            │ 1:N                                  │ N:1
                                            ▼                                      ▼
                                   ┌─────────────────┐                ┌─────────────────────────┐
                                   │     Engine      │                │        Component        │
                                   │ (ESN, Posição,  │                │ (Part Number, Descrição,│
                                   │  Horas, Ciclos) │                │  S/N, Tag EASA Form 1)  │
                                   └─────────────────┘                └─────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│                                DOMÍNIO REGULATÓRIO E DE CONFORMIDADE                          │
├───────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                               │
│  ┌─────────────────────────┐       1:1      ┌─────────────────────────┐                       │
│  │  ComplianceRequirement  ├────────────────┤    ApplicabilityRule    │                       │
│  │ (AD/SB Number, Órgão,   │                │ (Modelos, Faixas MSN,   │                       │
│  │  Datas, Ações, Status)  │                │  P/Ns Afetados, Mod)    │                       │
│  └────────────┬────────────┘                └─────────────────────────┘                       │
│               │                                                                               │
│               │ 1:N                                                                           │
│               ▼                                                                               │
│  ┌─────────────────────────┐       N:1      ┌─────────────────────────┐                       │
│  │  ComplianceAssessment   ├────────────────┤        Aircraft         │                       │
│  │ (APPLICABLE,            │                │ (Aeronave Avaliada      │                       │
│  │  NOT_APPLICABLE,        │                │  pelo Rule Engine)      │                       │
│  │  REVIEW_REQUIRED)       │                └─────────────────────────┘                       │
│  └────────────┬────────────┘                                                                  │
│               │                                                                               │
│               │ 1:N (instanciação física)                                                     │
│               ▼                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────────┐                 │
│  │                      ComplianceObligation (Fase 6.1)                     │                 │
│  │ (adNumber, targetEntity, status: OPEN/DUE_SOON/OVERDUE/COMPLIED, etc.)   │                 │
│  └──────┬────────────────────────────────────────────────────────────┬──────┘                 │
│         │                                                            │                        │
│         │ 1:N                                                        │ 1:N                    │
│         ▼                                                            ▼                        │
│  ┌─────────────────────────┐                                ┌─────────────────────────┐       │
│  │ ObligationEvidenceLink  │                                │ObligationStateTransition│       │
│  │ (WO, Logbook, Form 8130,│                                │(fromStatus, toStatus,   │       │
│  │  Accomplishment FH/FC)  │                                │ reason, rule, actor)    │       │
│  └─────────────────────────┘                                └─────────────────────────┘       │
│                                                                                               │
│  ┌─────────────────────────┐       1:1      ┌─────────────────────────┐                       │
│  │      UserQuestion       ├────────────────┤      KnowledgeFact      │                       │
│  │ (Pergunta Técnica       │ (quando resp.) │ (Memória Aeronáutica    │                       │
│  │  gerada para Engenheiro)│                │  com Evidência Anexa)   │                       │
│  └─────────────────────────┘                └─────────────────────────┘                       │
│                                                                                               │
│  ┌─────────────────────────┐       1:1      ┌─────────────────────────┐                       │
│  │  OfficialDocumentRecord ├────────────────┤      DiscoveryScan      │                       │
│  │ (PDF no Cofre, SHA-256, │ (descoberta)   │ (Varredura Contínua     │                       │
│  │  Validação SSRF)        │                │  Federal Register)      │                       │
│  └─────────────────────────┘                └─────────────────────────┘                       │
│                                                                                               │
│  ┌─────────────────────────┐       1:1      ┌─────────────────────────┐                       │
│  │      FAPTDocument       ├────────────────┤      AuditTrailLog      │                       │
│  │ (Folha de Parecer CAMO, │                │ (Trilha Imutável de     │                       │
│  │  Assinatura Digital)    │                │  Eventos e Ações)       │                       │
│  └─────────────────────────┘                └─────────────────────────┘                       │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. MATRIZ DE SEGURANÇA E CONFORMIDADE TÉCNICA

| Componente | Vetor de Risco | Medida de Mitigação Implementada | Status de Auditoria |
| :--- | :--- | :--- | :--- |
| **Ingestão de IA** | Alucinação de dados técnicos ou regras | Saída estritamente tipada com validação de esquema JSON e isolamento funcional (IA não toma decisões regulatórias). | **100% AUDITADO** |
| **Motor de Regras** | Falso-negativo de aplicabilidade | Política de segurança estrita: falta de informação resulta obrigatoriamente em `REVIEW_REQUIRED`. | **100% AUDITADO** |
| **Download de Documentos** | Ataques SSRF / Acesso à rede interna | Whitelist rigorosa de domínios governamentais, bloqueio de loopback/IPs privados e validação hop-by-hop de redirects. | **100% AUDITADO** |
| **Armazenamento de Arquivos** | Corrupção ou adulteração de PDFs | Cofre criptográfico com validação por hash SHA-256 e deduplicação idempotente. | **100% AUDITADO** |
| **Proveniência de Dados** | Identificação incorreta de números de AD | Prioridade em estruturas indexadas (`docket_ids`), eliminação de regex em texto livre e classificação por proveniência. | **100% AUDITADO** |
| **Rastreabilidade Regulatória** | Falta de evidência para auditoria aeronáutica | Registro imutável de todas as ações de usuários, execuções de regras e aprovações de FAPT com timestamps ISO 8601 UTC. | **100% AUDITADO** |
| **Ciclo de Vida de Obrigações** | Cumprimento sem evidência documental | Invariante estrita: transição para `COMPLIED` bloqueia sem evidência verificada (`TRANSITION_REJECTED`). | **100% AUDITADO (GREEN)** |
| **Controle Temporal (FH/FC)** | Atrasos operacionais em inspeções | Detecção de `DUE_SOON` (<= 30d/100FH/50FC) e `OVERDUE` automático. | **100% AUDITADO (GREEN)** |

### 5.1 PARECER DE AUDITORIA FORMAL DA FASE 6.1 (COMPLIANCE LIFECYCLE CORE)
* **Data do Parecer:** 02 de Setembro de 2026
* **Veredicto Final:** **GREEN — 100% AUDITADO / PASSED**
* **Maturidade da Fase 6.1:** 20/20 Testes Determinísticos Obrigatórios executados com sucesso absoluto (`test_phase6_1_obligations.ts`):
  1. `test_creation_obligation_from_ad` — Criação correta a partir de requisito regulatório com transição inicial. [PASS]
  2. `test_deduplication_same_ad_same_aircraft` — Deduplicação idempotente estrita (0 duplicatas no DB). [PASS]
  3. `test_state_transition_open_to_complied` — Transição para `COMPLIED` com evidência objetiva. [PASS]
  4. `test_state_transition_open_to_due_soon` — Transição para `DUE_SOON` na janela de alerta. [PASS]
  5. `test_state_transition_open_to_overdue` — Transição automática para `OVERDUE` com FH excedido. [PASS]
  6. `test_state_transition_not_yet_effective_to_open` — Transição ao atingir data de efetividade. [PASS]
  7. `test_repetitive_obligation_cycle` — Avanço de ciclo repetitivo para `NEXT_CYCLE_OPEN` com recálculo. [PASS]
  8. `test_terminating_action_closes_repetitive` — Ação terminatória encerra inspeções repetitivas. [PASS]
  9. `test_supersedence_preserves_history` — Superação preserva 100% de histórico e evidências. [PASS]
  10. `test_unknown_state_requires_review` — `UNKNOWN` mapeado estritamente para `REVIEW_REQUIRED`. [PASS]
  11. `test_evidence_link_to_obligation` — Enlace de evidência atualiza contadores temporais. [PASS]
  12. `test_reopen_obligation_on_rule_change` — Reabertura e atualização preservando trilha. [PASS]
  13. `test_multi_aircraft_obligation_independence` — Isolamento completo entre aeronaves distintas (PR-GOL vs PR-XYZ). [PASS]
  14. `test_obligation_component_transfer` — Obrigação a nível de componente rotável/LRU. [PASS]
  15. `test_state_machine_invalid_transition_rejected` — Rejeição de transição inválida sem evidência. [PASS]
  16. `test_human_override_obligation` — Override humano registrado com justificativa e AMOC. [PASS]
  17. `test_audit_trail_captures_all_transitions` — Trilha de auditoria captura 100% das transições e autores. [PASS]
  18. `test_obligation_calendar_threshold` — Cálculo exato de prazo de calendário. [PASS]
  19. `test_obligation_flight_hours_threshold` — Cálculo exato de saldo de horas de voo (FH). [PASS]
  20. `test_obligation_cycles_threshold` — Cálculo exato de saldo de ciclos de voo (FC). [PASS]

---

## 6. FASE 6.2 — DUE DATE & THRESHOLD ENGINE (MOTOR DETERMINÍSTICO DE LIMITES TEMPORAIS)

### 6.1 Missão e Princípios de Engenharia do Motor
A Fase 6.2 concebeu e implementou o **Due Date & Threshold Engine** (`DueDateThresholdEngine`), o motor matemático e determinístico do sistema CAMO encarregado de calcular, interpretar, projetar e controlar os limites temporais estritos das obrigações de aeronavegabilidade.

#### Princípios de Engenharia Não Negociáveis:
1. **Determinismo Estrito:** Dadas as mesmas entradas (parâmetros da aeronave/componente e requisitos regulatórios), a saída é **100% idêntica, reproduzível e auditável**, livre de variações heurísticas ou estocásticas.
2. **Anti-Inferência Regulatória:** **Nunca inferir FH, FC, data de calendário, instalação, remoção, cumprimento anterior ou limites quando esses dados não estiverem disponíveis**. Resultado imediato: status `REVIEW_REQUIRED` com código `INSUFFICIENT_DATA` ou `DATA_INTEGRITY_REVIEW`. Falso-positivo de revisão humana é sempre priorizado sobre falsa segurança regulatória.
3. **Cálculo de Calendário Exato (Anti-Rollover):** Tratamento rigoroso de aritmética de datas:
   - Adições de meses e anos realizam ancoragem exata no último dia do mês de destino, prevenindo rollovers acidentais (ex: 31 de Agosto + 1 mês resulta estritamente em **30 de Setembro**, e não 01 de Outubro).
   - Anos bissextos: 29 de Fevereiro de ano bissexto + 1 ano resulta estritamente em **28 de Fevereiro**.
   - Cálculos em dias utilizam tempo UTC absoluto com base de 86.400.000 ms sem distorções de fuso horário.

---

### 6.2 Dimensões Temporais Suportadas
O motor opera de forma simultânea e desacoplada sobre três dimensões contínuas e duas dimensões pontuais:

| Dimensão Temporal | Descrição & Unidades | Evento de Referência Base |
| :--- | :--- | :--- |
| **Calendário (Calendar Days)** | Dias, meses, anos ou prazo fixo | Data de efetividade (`EFFECTIVE_DATE`), data de emissão ou data de cumprimento anterior |
| **Horas de Voo (FH)** | Horas decimais acumuladas no horímetro | Total de Horas da Aeronave (TSN), Tempo Desde Revisão (TSO) ou Desde Instalação (TSI) |
| **Ciclos de Voo (FC)** | Ciclos/pousos operacionais acumulados | Total de Ciclos da Aeronave (CSN), Desde Revisão (CSO) ou Desde Instalação (CSI) |
| **Data Fixa de Calendário** | Data explícita estabelecida na AD | Ex: "No later than December 31, 2026" |
| **Zero Tolerância Operacional** | "Prior to further flight" | Vencimento imediato no horímetro/ciclo atual ou margem de 0 dias/horas/ciclos |

---

### 6.3 Álgebra de Operadores de Composição Regulamentar
Diretrizes de aeronavegabilidade combinam limites usando operadores lógicos complexos. O motor implementa:

1. **`WHICHEVER_OCCURS_FIRST` (Padrão Mandatório Conservador):**
   - O limite governante (*Controlling Limit*) é aquele que vencer mais cedo cronologicamente ou que possuir a menor margem operacional restante.
   - Projeção de taxa de utilização (`projectedDailyHours`, `projectedDailyCycles`) permite comparar a data equivalente de esgotamento de FH/FC com a data de calendário para identificar o gargalo de aeronavegabilidade.
2. **`WHICHEVER_OCCURS_LATER`:**
   - Aplicável a carências condicionais e janelas diferidas. O limite governante é o último a expirar entre os requisitos associados.
3. **`BOTH_AND`:**
   - Exige cumprimento cumulativo de múltiplos limites antes de autorizar a liberação.
4. **`NO_LATER_THAN` (Teto Regulamentar Máximo):**
   - Atua como uma barreira rígida (*Hard Ceiling*). Qualquer cálculo projetado baseado em FH, FC ou dias de calendário é truncado caso ultrapasse a data limite fixada pela autoridade.
5. **`NONE` (Unidimensional):**
   - Avaliação direta de um único parâmetro (apenas calendário, apenas FH ou apenas FC).

---

### 6.4 Gestão de Ações Repetitivas e Ações Terminatórias
- **Threshold Inicial vs Intervalo Repetitivo:** O motor segrega o limiar inicial (*initial compliance threshold*) dos ciclos de reinspeção recorrentes (*repetitive inspection interval*).
- **Avanço de Ciclo Idempotente:** Ao registrar cumprimento com evidência técnica, a obrigação repetitiva transiciona para `NEXT_CYCLE_OPEN`, e o motor recalcula os limites subsequentes tomando `LAST_COMPLIANCE` (data, FH e FC do cumprimento) como novo marco zero.
- **Ação Terminatória (*Terminating Action*):** A execução de uma modificação definitiva (ex: substituição de suporte por P/N aprimorado conforme SB do fabricante) encerra a obrigação com o status `COMPLIED` e *Controlling Limit* `TERMINATED`, bloqueando o agendamento de novas inspeções repetitivas.

---

### 6.5 Invariantes Estritas de Aeronavegabilidade & Fail-Safes
O motor incorpora guardrails de integridade e rejeição imediata:
1. **Detecção de Rollback de Horímetro:** Se o horímetro atual da aeronave for menor que o horímetro registrado no último cumprimento (`currentFH < lastComplianceFH`), o motor sinaliza anomalia de telemetria e o serviço transiciona imediatamente a obrigação para `REVIEW_REQUIRED` com `reviewReason = DATA_INTEGRITY_REVIEW`.
2. **Bloqueio de Horímetros/Ciclos Negativos:** Qualquer parâmetro de aeronave menor que zero aciona bloqueio e revisão obrigatória.
3. **Intervalo Repetitivo Nulo ou Negativo:** Rejeitado imediatamente para prevenir loops infinitos de agendamento.
4. **Isolamento da Janela de Alerta:** A janela operacional de `DUE_SOON` (ex: 30 dias, 100 FH, 50 FC) é estritamente um indicador de planejamento de manutenção e **nunca altera ou antecipa o limite legal de aeronavegabilidade**.

---

### 6.6 Trilha Criptográfica de Auditoria & Parser de Linguagem Natural
- **Hash Criptográfico Determinístico:** Cada cálculo gera uma assinatura MD5/SHA das entradas normatizadas e saídas (`calculationHash`). Qualquer alteração retrospectiva em parâmetros de cálculo invalida o hash, garantindo blindagem contra adulteração em auditorias ANAC/FAA/EASA.
- **Parser de Linguagem Natural Regulamentar:** O motor inclui um analisador léxico e sintático capaz de decompor cláusulas mandatórias padrão de ADs (ex: *"Within 500 flight hours or 12 months after the effective date, whichever occurs first"*) em estruturas formais de `threshold`, `interval` e operadores de composição.

---

### 6.7 Validação Formal e Testes da Fase 6.2
A conformidade da Fase 6.2 foi verificada através de uma suíte exaustiva de **48 testes determinísticos e adversariais** (`testPhase62DueDateEngine.ts`), cobrindo:
1. Cálculos de calendário estritos (dias, meses, anos, fins de mês, anos bissextos).
2. Cálculos de horímetro (FH) e ciclos (FC) com contadores acumulados e relativos.
3. Ações repetitivas, avanços de ciclo e recálculo após cumprimento.
4. Ações terminatórias bloqueando repetitivas.
5. Operadores `WHICHEVER_OCCURS_FIRST`, `WHICHEVER_OCCURS_LATER`, `BOTH_AND`, `NO_LATER_THAN`.
6. Detecção de anomalias (rollback de horímetro, dados faltantes, valores negativos).
7. Geração de justificativas legíveis para auditoria técnica.
8. Parser de linguagem natural regulatória.

*Resultado da Execução Formal:* **48/48 PASSADOS (100% GREEN)**.

---

## 7. FASE 6.3 — EVIDENCE MANAGEMENT & VERIFICATION ENGINE

### 7.1 Objetivo e Princípios da Verificação Probatória
A Fase 6.3 estabelece o motor de gestão e verificação determinística de evidências probatórias aeronáuticas. 
Nenhuma obrigação regulatória pode transicionar para `COMPLIED` sem evidências formais, verificadas e matematicamente consistentes:
1. **Invariante de Evidência Mandatória:** O cumprimento regulatório exige obrigatoriamente documentação probatória técnica (Form 8130-3, EASA Form 1, Logbook Entry, Ordem de Serviço MRO, Relatório NDT).
2. **Verificação Multidimensional Determinística:** Cada documento probatório é submetido a verificação em 4 dimensões obrigatórias:
   - **Entity Matching:** Validação de matrícula, número de série (MSN/ESN) e Part Number. Mismatches resultam em status `INVALID` com motivo `ENTITY_MISMATCH`.
   - **Requirement & Action Sufficiency:** Verificação se o tipo de ação documental (inspeção, substituição, teste) atende aos requisitos exatos da Diretriz de Aeronavegabilidade.
   - **Temporal Consistency:** Validação de que a data de cumprimento não é futura, ocorreu após a publicação/efetividade da AD e que os horímetros/ciclos relatados são estritamente inferiores ou iguais aos totais acumulados da aeronave.
   - **Integrity & Cryptographic Fingerprinting:** Cálculo de hash determinístico SHA-256 de 64 caracteres para cada documento e vínculo probatório.
3. **Conjunto Probatório (*Probatory Set*) & Detecção de Conflitos:** Evidências conflitantes (horímetros divergentes para a mesma tarefa) bloqueiam a obrigação em `REVIEW_REQUIRED`. Múltiplas evidências insuficientes nunca se somam para formar uma evidência válida.
4. **Imutabilidade e Revogação Rastreável:** A transição `VALID` -> `REVOKED` é permitida mediante justificativa formal auditável; a transição contrária `REVOKED` -> `VALID` é estritamente proibida (estado terminal de descarte probatório). A revogação de uma evidência-chave reabre automaticamente uma obrigação previamente cumprida.

---

## 8. FASE 6.4 — COMPLIANCE STATUS & FLEET AIRWORTHINESS CONTROL ENGINE

### 8.1 Princípio Obrigatório: Desacoplamento entre Compliance Regulatório e Determinação Operacional de Voo
A revisão de segurança arquitetural da Fase 6.4 estabelece um princípio fundamental e inegociável da engenharia de aeronavegabilidade contínua (CAMO):

> **"Um estado de compliance regulatório NÃO deve ser convertido automaticamente em uma decisão operacional de voo sem uma regra autorizada, procedimento aprovado ou disposição técnica humana formalmente rastreável."**

O motor separa estritamente duas dimensões que anteriormente eram acopladas de forma presumida:

1. **REGULATORY COMPLIANCE STATUS (Estado Objetivo da Obrigação/Requisito):**
   - `COMPLIED`: Obrigação plenamente cumprida com evidência técnica válida.
   - `OPEN`: Obrigação aberta dentro dos limites e prazos regulamentares normais.
   - `DUE_SOON`: Obrigação na janela preventiva de alerta de manutenção.
   - `OVERDUE`: Limite legal ou temporal de cumprimento extrapolado (Não Conforme).
   - `REVIEW_REQUIRED`: Discrepância de dados, incerteza técnica ou divergência probatória requerendo revisão de engenharia.
   - `NOT_APPLICABLE`: Aeronave ou componente fora da aplicabilidade técnica.
   - `SUPERSEDED`: Obrigação superada por revisão ou cancelamento do requisito de origem.

2. **OPERATIONAL AIRWORTHINESS DETERMINATION (Condição Operacional de Voo da Aeronave):**
   - `AIRWORTHY`: Aeronave liberada para operações de voo normais (`canFly = true`, `isGrounded = false`).
   - `AIRWORTHY_WITH_WARNINGS`: Aeronave liberada para voo com intervenção preventiva agendada (`canFly = true`, `isGrounded = false`).
   - `MAINTENANCE_HOLD`: Retenção preventiva de manutenção requerendo liberação técnica formal (`canFly = false`, `isGrounded = false`).
   - `GROUNDED`: Interdição operacional mandatória e imediata de voo (`canFly = false`, `isGrounded = true`).
   - `NOT_DETERMINED`: Condição operacional indeterminada por ausência de regra autorizada ou disposição humana formal (`canFly = null`, `isGrounded = false`).

### 8.2 Invariantes e Regras Proibitivas de Não-Suposição
O motor implementa as seguintes invariantes operacionais invioláveis:
- **`OVERDUE != GROUNDED` automaticamente:** Um prazo vencido torna a aeronave `complianceStatus: NON_COMPLIANT`, mas a consequência operacional de `GROUNDED` exige uma regra legal autorizada (ex: *14 CFR § 39.7 / RBAC 39*) ou diretiva de autoridade civil. Na ausência de regra, o status operacional assume o fail-safe seguro `NOT_DETERMINED` com `canFly: null` e `isGrounded: false`.
- **`REVIEW_REQUIRED != MAINTENANCE_HOLD` automaticamente:** Uma incerteza técnica coloca a obrigação em `PENDING_REVIEW`, mas a retenção operacional de manutenção exige procedimento CAMO aprovado (*CAMO SOP 04*), regra do operador (*FOM*) ou disposição formal do Engenheiro Responsável Técnico.
- **`NON_COMPLIANT != canFly=false` automaticamente:** A não-conformidade regulatória é classificada com severidade `CRITICAL` e bloqueadora (`isBlocking: true`), mas a suspensão de voo deve citar sua fonte formal de autorização e fundamento jurídico/regulamentar.

### 8.3 Contrato de Explicabilidade e Rastreabilidade Operacional
Para toda e qualquer determinação operacional gerada pelo motor, os seguintes campos são obrigatoriamente preenchidos no objeto `AircraftAirworthinessAssessment`:
- `airworthinessStatus`: Status operacional resultante (`AIRWORTHY`, `AIRWORTHY_WITH_WARNINGS`, `MAINTENANCE_HOLD`, `GROUNDED`, `NOT_DETERMINED`).
- `canFly`: Booleano tri-state (`true` se apta para voo, `false` se impedida de voar, `null` se não determinada).
- `isGrounded`: Booleano estrito (`true` apenas se interdição formalmente determinada por regra mandatória).
- `decisionSource`: Origem formal da autoridade decisória (`REGULATORY_REQUIREMENT`, `APPROVED_CAMO_PROCEDURE`, `AUTHORITY_DECISION`, `APPROVED_OPERATOR_RULE`, `HUMAN_REVIEW_DECISION`, `NOT_DETERMINED`).
- `decisionRule`: Identificador formal da regra ou procedimento aplicado (ex: `FAR_39_MANDATORY_GROUNDING`, `CAMO_SOP_04_DISCREPANCY_HOLD`, `NO_AUTHORIZED_OPERATIONAL_RULE`).
- `decisionReason`: Texto descritivo e transparente explicando o motivo técnico e a consequência operacional.
- `sourceReference`: Citação normativa ou procedimental formal (ex: `14 CFR § 39.7 / RBAC 39`, `CAMO-CMM-PROC-4.3`, `FOM-REV-12-CH8`, `EAD-2026-01-EXP`).

### 8.4 Catálogo de Regras Operacionais Pré-Autorizadas
O motor disponibiliza um catálogo auditado de regras operacionais autorizadas:
1. **`FAR_39_MANDATORY_GROUNDING`:**
   - Fonte: `REGULATORY_REQUIREMENT`
   - Referência: *14 CFR § 39.7 / RBAC 39*
   - Consequência: `OVERDUE` ou `NON_COMPLIANT` -> `GROUNDED / canFly=false`
2. **`CAMO_DISCREPANCY_HOLD`:**
   - Fonte: `APPROVED_CAMO_PROCEDURE`
   - Referência: *CAMO-CMM-PROC-4.3*
   - Consequência: `REVIEW_REQUIRED` -> `MAINTENANCE_HOLD / canFly=false`
3. **`AUTHORITY_DIRECTIVE_GROUNDING`:**
   - Fonte: `AUTHORITY_DECISION`
   - Referência: *EAD-2026-01-EXP*
   - Consequência: Interdição operacional emergencial de voo.
4. **`OPERATOR_FOM_RESTRICTION`:**
   - Fonte: `APPROVED_OPERATOR_RULE`
   - Referência: *FOM-REV-12-CH8*
   - Consequência: Limitação operacional de manual geral de operações do operador.
5. **`HUMAN_CHIEF_ENGINEER_DISPOSITION`:**
   - Fonte: `HUMAN_REVIEW_DECISION`
   - Referência: *ENG-DISP-2026-088*
   - Consequência: Decisão técnica formal assinada pelo Engenheiro Chefe de Manutenção.

### 8.5 Princípio de Zero-Diluição da Frota (*Zero-Dilution Principle*)
A conformidade da frota obedece à regra de não-diluição:
- Uma frota com 99 aeronaves perfeitamente conformes e 1 aeronave com obrigação `OVERDUE` (seja ela operacionalmente grounded ou indeterminada) é imediatamente classificada como `FLEET_CRITICAL_NON_COMPLIANT` com severidade `CRITICAL`.
- A conformidade legal **nunca é mascarada por médias percentuais de aeronavegabilidade**.
- O objeto `FleetAirworthinessAssessment` expõe de forma explícita e segregada:
  - `fleetComplianceStatus`: `FLEET_FULLY_COMPLIANT` | `FLEET_ATTENTION` | `FLEET_PENDING_REVIEW` | `FLEET_NON_COMPLIANT`
  - `fleetStatus`: `FLEET_COMPLIANT` | `FLEET_ATTENTION` | `FLEET_RESTRICTED` | `FLEET_CRITICAL_NON_COMPLIANT`

### 8.6 Blindagem Criptográfica SHA-256 com Proveniência Decisória
Todas as saídas do motor geram um hash criptográfico SHA-256 que contempla não apenas contadores e status de compliance, mas também os campos de explicabilidade e proveniência decisória (`decisionSource`, `decisionRule`). Qualquer alteração não autorizada no laudo ou supressão de motivo de interdição é instantaneamente acusada pelo método de verificação de integridade `verifyAssessmentIntegrity`.

---

## 9. CAPABILITY REGISTRY & AUDIT MATURITY REPORT (RELEASE 6.4.1)

O registro formal de capacidades operacionais do sistema CAMO reflete a arquitetura atualizada:

```json
{
  "system": "Airworthiness Compliance Intelligence",
  "release": "6.4.1",
  "releaseStatus": "GREEN_OPERATIONAL_AUDITED",
  "auditDate": "2026-09-05",
  "architecturalSecurity": {
    "complianceDecoupling": "ENFORCED",
    "zeroDilutionPrinciple": "ENFORCED",
    "safeFailSafe": "NOT_DETERMINED_ON_UNRULED_BLOCK"
  },
  "engineCapabilities": {
    "REGULATORY_DISCOVERY": {
      "version": "5.1.0",
      "status": "OPERATIONAL",
      "sources": ["FAA_FEDERAL_REGISTER_API"]
    },
    "CRYPTO_PDF_VAULT": {
      "version": "4.1.0",
      "status": "OPERATIONAL",
      "features": ["SSRF_SHIELD", "SHA256_DEDUPLICATION"]
    },
    "DOCUMENT_INTELLIGENCE_EXTRACTOR": {
      "version": "5.3.1",
      "status": "OPERATIONAL",
      "aiModel": "gemini-3.7-flash",
      "fallbacks": ["gemini-3.6-flash", "gemini-3.5-flash"]
    },
    "FLEET_SCREENING_ENGINE": {
      "version": "5.2.1",
      "status": "OPERATIONAL",
      "classification": "THREE_WAY_DETERMINISTIC"
    },
    "CAMO_RULE_ENGINE": {
      "version": "2.1.0",
      "status": "OPERATIONAL",
      "safetyPrinciple": "UNKNOWN_REQUIRES_HUMAN_REVIEW"
    },
    "COMPLIANCE_LIFECYCLE_CORE": {
      "version": "6.1.0",
      "status": "OPERATIONAL",
      "stateMachineStates": 13,
      "invariants": ["EVIDENCE_MANDATORY_FOR_COMPLIANCE"]
    },
    "DUE_DATE_THRESHOLD_ENGINE": {
      "version": "6.2.0",
      "status": "OPERATIONAL",
      "features": [
        "CALENDAR_ARITHMETIC_EXACT_END_OF_MONTH",
        "LEAP_YEAR_SAFE",
        "MULTI_PARAMETER_FH_FC_DAYS",
        "COMPOSITION_WHICHEVER_FIRST_LATER_AND_NO_LATER_THAN",
        "REPETITIVE_AND_TERMINATING_ACTIONS",
        "DATA_INTEGRITY_ROLLBACK_DETECTION",
        "CRYPTOGRAPHIC_AUDIT_HASH",
        "NATURAL_LANGUAGE_AD_PARSER"
      ]
    },
    "EVIDENCE_VERIFICATION_ENGINE": {
      "version": "6.3.0",
      "status": "OPERATIONAL",
      "features": [
        "FOUR_DIMENSION_VERIFICATION",
        "PROBATORY_SET_CONSOLIDATION",
        "CONFLICT_DETECTION",
        "IMMUTABLE_REVOCATION_LIFECYCLE",
        "AUTOMATIC_OBLIGATION_REOPEN"
      ]
    },
    "FLEET_AIRWORTHINESS_CONTROL_ENGINE": {
      "version": "6.4.1",
      "status": "OPERATIONAL",
      "features": [
        "REGULATORY_COMPLIANCE_VS_OPERATIONAL_DECOUPLING",
        "SAFE_FAIL_SAFE_NOT_DETERMINED",
        "AUTHORIZED_RULES_CATALOG",
        "EXPLAINABILITY_DECISION_PROVENANCE",
        "ZERO_DILUTION_FLEET_CONSOLIDATION",
        "TAMPER_EVIDENT_SHA256_INTEGRITY_AUDIT"
      ]
    }
  },
  "complianceTestMatrix": {
    "phase531HardeningSuite": "10/10 PASSED (100%)",
    "phase62DueDateEngineSuite": "48/48 PASSED (100%)",
    "phase63EvidenceEngineSuite": "45/45 PASSED (100%)",
    "phase64AirworthinessEngineSuite": "66/66 PASSED (100%)",
    "totalDeterministicTests": "169/169 PASSED (100% GREEN)"
  }
}
```

---

## 10. PRÓXIMAS ETAPAS (ROADMAP TECNOLÓGICO FASE 7+)

1. **Fase 7 — Módulo de Boletins de Serviço (SBs) & Ordens de Engenharia (EOs):**
   - Gestão de boletins de fabricantes (Boeing MOM, CFM SBs, Airbus OIT/AOT) e emissão de Ordens de Engenharia internas vinculadas às obrigações de ADs.
2. **Fase 8 — Programa de Manutenção da Aeronave (AMP / MPD) & Peças com Vida Limite (LLP/Hard Time):**
   - Controle preditivo de componentes com limite de descarte (*Life Limited Parts*) e tarefas periódicas de manutenção de linha/base.
3. **Fase 9 — Conectores Diretos de Autoridades (EASA SPT & ANAC SISAC):**
   - Ingestão contínua de PADs/EADs da EASA e Diretrizes ANAC em tempo real.

---
*Dossiê elaborado em conformidade com as melhores práticas de Engenharia Aeronáutica, Regulamentações FAA 14 CFR Part 39, EASA Part-M e Desenvolvimento Seguro de Software.*
