<div align="center">

# ✈️ CAMO Airworthiness Compliance Intelligence Platform
### Enterprise Aviation Continuing Airworthiness Management (CAMO) & Maintenance Control System
**Conforme FAA 14 CFR Part 39 • EASA Part-M / Part-CAMO • ANAC RBAC 121 & RBAC 39**

[![Compliance](https://img.shields.io/badge/Compliance-FAA%20|%20EASA%20|%20ANAC-blue.svg?style=for-the-badge)](https://www.easa.europa.eu/)
[![Audit Trail](https://img.shields.io/badge/Security-SHA--256%20Cryptographic%20Audit-emerald.svg?style=for-the-badge)](./DOSSIE_ARQUITETURA_SISTEMA_CAMO.md)
[![AI Engine](https://img.shields.io/badge/AI%20Intelligence-Gemini%203.7%20Flash%20Document-indigo.svg?style=for-the-badge)](https://ai.google.dev/)
[![Vitest](https://img.shields.io/badge/Automated%20Tests-148%2F148%20Passed%20(100%25)-success.svg?style=for-the-badge)](./test/)
[![Living Governance](https://img.shields.io/badge/Living%20Governance-Release%209.5.2%20Audited-purple.svg?style=for-the-badge)](./PRODUCT_VISION_ROADMAP.md)

---

<p align="center">
  <b>Plataforma de alta precisão para Linhas Aéreas, Empresas de Arrendamento Aeronáutico (Lessors) e MROs eliminarem riscos de AOG (Aircraft On Ground), penalidades regulatórias e glosas milionárias em devolução de aeronaves.</b>
</p>

<img src="./assets/images/camo_fleet_dashboard_1789127135313.jpg" alt="CAMO Fleet Cockpit Dashboard" width="100%" style="border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.6);" />

*Cockpit Executivo & Monitoramento Contínuo de Aeronavegabilidade em Tempo Real: Telemetria de Frota, Alertas de Diretrizes Críticas e Indicadores de Conformidade.*

</div>

---

## 1. O QUE É O CAMO ENGINE

O **CAMO Airworthiness Compliance Intelligence Platform** é um ecossistema de software de missão crítica para aviação civil comercial e executiva. Concebido segundo os rigorosos padrões do **FAA Title 14 CFR Part 39**, **EASA Part-M (Subpart G / Part-CAMO)** e **ANAC RBAC 121 / RBAC 39**, o sistema integra o monitoramento proativo de Diretrizes de Aeronavegabilidade (ADs), a rastreabilidade física de células, motores e componentes rotáveis e o atesto de conformidade técnica com validade jurídica e probatória.

O sistema opera sob o **Princípio Zero da Segurança Aeronáutica**:
* **Inteligência Artificial Confinada (Gemini 3.7 Flash):** Executa OCR, leitura e estruturação de dados não estruturados contidos em PDFs complexos de autoridades internacionais.
* **Motor Determinístico Booleano (CAMO Rule Engine V2):** Processa o cruzamento matemático entre requisitos mandatórios e dados físicos da frota. Falta de informação gera obrigatoriamente `REVIEW_REQUIRED`, nunca `NOT_APPLICABLE`.
* **Engenheiro CAMO Humano:** Mantém 100% da autoridade regulatória e responsabilidade técnica, emitindo e assinando laudos oficiais (FAPTs) com selo digital SHA-256.

---

## 2. PROBLEMA QUE RESOLVE

Na aviação comercial e executiva, o controle manual de conformidade por planilhas ou sistemas legados fragmentados gera prejuízos catastróficos:
* **Paradas Não Planejadas (AOG - Aircraft On Ground):** Custam entre **US$ 50.000 e US$ 150.000 por dia**, além de cancelamentos de voos e sanções das autoridades de aviação civil.
* **Transições e Devoluções Contratuais para Lessors (*Redelivery*):** Falhas em prontuários técnicos e registros de cumprimento de ADs causam glosas contratuais que superam **US$ 2 milhões por aeronave**.
* **Contaminação de Dados e Falsos Positivos:** Sistemas legados que marcam diretrizes como "cumpridas" sem validação probatória de evidências (Form 8130-3 / EASA Form 1) expõem operadores à interdição imediata em auditorias de pista.

O CAMO Engine resolve essa vulnerabilidade através de **automatização inteligente**, **regras matemáticas estritas** e **trilha de auditoria criptográfica inviolável**.

---

## 3. VISÃO DO PRODUTO (MAINTENANCE CONTROL + CAMO)

O CAMO Engine não se limita ao controle estático de diretrizes passadas. Sua visão estratégica é consolidar-se como a **Plataforma Unificada de Maintenance Control System (PCM/MRO) + CAMO Compliance**, integrando o ciclo de vida completo:

```
AIRCRAFT ➔ CONFIGURATION ➔ MAINTENANCE ➔ COMPONENTS / ENGINES ➔ MAINTENANCE RECORDS ➔ REGULATORY REQUIREMENTS ➔ COMPLIANCE OBLIGATIONS ➔ EVIDENCE ➔ AIRWORTHINESS ➔ DELIVERY
```

Essa cadeia causal garante que qualquer intervenção física no hangar alimente em tempo real a configuração da aeronave, liquide obrigações regulatórias e sustente o despacho seguro da frota.

> Para detalhes da evolução e visão estratégica, consulte o [Product Vision & Roadmap](./PRODUCT_VISION_ROADMAP.md).

---

## 4. ARQUITETURA RESUMIDA DO SISTEMA

A arquitetura do CAMO Engine é desacoplada, orientada a eventos e estritamente auditável:

```
  [FONTES REGULATÓRIAS]          [INTELIGÊNCIA DOCUMENTAL]         [BASE DE CONHECIMENTO]
  FAA, EASA e ANAC Live          Gemini 3.7 Flash Confinado        Knowledge Facts Reutilizáveis
          │                                  │                                  │
          ▼                                  ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                             CAMO REGULATORY REGISTER & SCREENING                            │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                           CAMO DETERMINISTIC RULE ENGINE V2                                 │
│  Avaliação em 4 Níveis: Célula ➔ Motores (ESN) ➔ Componentes (P/N, S/N) ➔ Softwares         │
└──────────────────────┬───────────────────────────────────────────────┬──────────────────────┘
                       │                                               │
                       ▼                                               ▼
┌──────────────────────────────────────────────┐     ┌────────────────────────────────────────┐
│     COMPLIANCE OBLIGATION LIFECYCLE          │     │    SANDBOX DE PRÉ-ENTREGA (DELIVERY)   │
│  Máquina de 13 Estados Determinísticos       │     │  Reconciliação Isolada com Lessors     │
│  Due Date 3D (FH, FC, Calendário Exato)      │     │  Selo Criptográfico SHA-256            │
└──────────────────────┬───────────────────────┘     └────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                  CONTROLE DE AERONAVEGABILIDADE OPERACIONAL DA FROTA (CAMO)                 │
│  Princípio da Não-Diluição • Laudos FAPT Oficiais • Trilha de Auditoria Append-Only         │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

> A especificação detalhada de cada submódulo e invariante encontra-se no [Dossiê de Arquitetura do Sistema](./DOSSIE_ARQUITETURA_SISTEMA_CAMO.md).

---

## 5. ESTADO ATUAL (RELEASE 9.5.2)

* **Versão Canônica:** `Release 9.5.2` (Active Living Architecture)
* **Suíte de Testes Automatizados:** 14 arquivos de teste no Vitest, **148 testes unitários, de integração e de máquinas de estado — 100% PASSING**.
* **Frontend:** 27 Visões de cockpit executivo e engenharia em React 18, Tailwind CSS e Lucide Icons.
* **Backend:** Servidor Express com **73+ endpoints REST especializados** e 14 submódulos de domínio.
* **Integridade TypeScript & Linter:** 0 erros no compilador (`tsc --noEmit`), compilação de produção aprovada via Vite + esbuild.

---

## 6. CAPACIDADES IMPLEMENTADAS (CAP-001 A CAP-026)

O sistema possui **22 capacidades ativas homologadas** no [Capability Registry](./CAPABILITY_REGISTRY.md):

* **CAP-001 a CAP-005:** Inventário de Frota, Extração Gemini AI, Motor Booleano V2, Memória Técnica e Emissão de FAPTs Digitais.
* **CAP-006 a CAP-010:** Conector Federal Register FAA, Cofre com Anti-SSRF, Descoberta Contínua, Screening de Frota e Pipeline de 8 Estágios.
* **CAP-011 a CAP-015:** Máquina de 13 Estados, Motor Due Date 3D, Verificação de Evidências em 4D, Controle de Aeronavegabilidade e Sandbox de Delivery.
* **CAP-016 a CAP-020:** Central de Ajuda, Gestão de Configuração Real, Descoberta Aberta Universal, CAMO Register e Fila de Análise Técnica.
* **CAP-025:** Gestão Cadastral da Frota, Edição, Inativação de Status (`DECOMMISSIONED`, `STORED`) e Exclusão Segura com Desassociação em Cascata.
* **CAP-026:** Governança Viva, Memória Estratégica Independente e Contrato de Desenvolvimento para IA.

---

## 7. ROADMAP ESTRATÉGICO

O roadmap priorizado define o sequenciamento técnico por dependência arquitetural:

* **P0 — Fundamentos / Críticos:** Isolamento transacional fino em `dataStore.ts`, governança viva e trilha de auditoria encadeada Merkle Tree.
* **P1 — Próxima Evolução (Q1/Q2 2027):** Conectores diretos live REST para EASA SPT e ANAC SISAC (`CAP-021`), ações terminatórias multietapas (`CAP-022`) e superação parcial parametrizada por MSN/PN (`CAP-023`).
* **P2 — Expansão Maintenance Control (Q3/Q4 2027):** Programa de Manutenção Aprovado (AMP/MPD), Ordens de Serviço (Work Orders) e controle de vida limite de partes descartáveis (LLP).
* **FUTURE — Visão de Longo Prazo (2028+):** Telemetria ACARS em tempo real, inteligência de redelivery contratual de leasing e integração com portais OEM Boeing/Airbus.

---

## 8. PRÓXIMOS PASSOS IMEDIATOS

1. Conectar a esteira de CI/CD para validação automática dos 148 testes a cada push.
2. Expandir a suite de conectores oficiais com o protótipo do conector EASA Safety Publications Tool (SPT).
3. Implementar a interface de estruturação de tarefas recorrentes do Programa de Manutenção da Aeronave (AMP).

---

## 9. GOVERNANÇA DOCUMENTAL VIVA

A governança do projeto é organizada em uma **cadeia documental interligada e complementar**, garantindo alinhamento total entre estratégia, arquitetura e execução:

```
[README.md]
  │  Visão rápida institucional, propósito e inicialização
  ▼
[PRODUCT_VISION_ROADMAP.md]
  │  Direção estratégica de produto (PCM + CAMO), limites e priorização
  ▼
[CAPABILITY_REGISTRY.md]
  │  Catálogo canônico e auditado de capacidades (CAP-001 a CAP-026)
  ▼
[DOSSIE_ARQUITETURA_SISTEMA_CAMO.md]
  │  Especificação técnica profunda, submódulos, endpoints e invariantes
  ▼
[AI_DEVELOPMENT_GUIDE.md]
     Contrato inegociável de desenvolvimento para agentes de IA autônomos
```

---

## 10. COMO UMA IA DEVE CONTINUAR O PROJETO

Qualquer Inteligência Artificial designada para atuar neste repositório **DEVE OBRIGATORIAMENTE**:

1. **Ler o [AI Development Guide](./AI_DEVELOPMENT_GUIDE.md) e os documentos da cadeia de governança ANTES de propor planos ou editar arquivos.**
2. **Respeitar as 12 Regras Inegociáveis:** Não criar arquitetura paralela; não alucinar conformidade; preservar isolamento de frota e sandbox de delivery; tratar ausência de dado como `REVIEW_REQUIRED` ou `INSUFFICIENT_DATA`, jamais como `NOT_APPLICABLE`.
3. **Seguir o Ciclo Obrigatório de 7 Passos:**
   `Audit ➔ Design ➔ Implement ➔ Test ➔ Security ➔ Regression ➔ Synchronize Docs`
4. **Manter Código e Documentação Rigorosamente Sincronizados:** A tarefa é considerada inconclusa enquanto houver qualquer divergência entre código, testes e os 4 documentos mestres de governança.

---

## 🛠️ Instalação & Execução

```bash
# 1. Instalação de dependências
npm install

# 2. Configuração de Variáveis de Ambiente (.env)
GEMINI_API_KEY=sua_chave_gemini_aqui

# 3. Execução em Modo Desenvolvimento
npm run dev
# Acesse: http://localhost:3000

# 4. Execução da Suíte Completa de Testes Automatizados (Vitest)
npm test
```

---

<div align="center">
  <p><b>CAMO Airworthiness Compliance Intelligence Platform</b> • <i>Aeronautical Engineering Excellence & Continuous Airworthiness Management</i></p>
  <p>© 2026 CAMO Engineering Solutions. Todos os direitos reservados.</p>
</div>
