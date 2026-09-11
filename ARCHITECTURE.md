# Arquitetura do Sistema — CAMO Engine

## Airworthiness Compliance Intelligence Platform
**Continuing Airworthiness Management Organization (CAMO) Enterprise Software**
*Conforme FAA 14 CFR Part 39, EASA Part-M e ANAC RBAC 121 / RBAC 39*

---

### Visão Geral da Arquitetura (Release 9.4.0)

O CAMO Engine é estruturado em torno do **Princípio Zero da Segurança Aeronáutica**:
1. **Inteligência Artificial (Gemini 3.7 Flash):** Leitura, extração e estruturação documental de diretrizes não estruturadas (PDFs de ADs, SBs, Notificações). A IA nunca declara conformidade de forma autônoma.
2. **Motor de Regras Determinístico (CAMO Rule Engine):** Lógica booleana estrita para cruzamento com dados da frota. Falta de informação gera obrigatoriamente `REVIEW_REQUIRED` ou `INSUFFICIENT_DATA`, jamais `NOT_APPLICABLE`.
3. **Engenheiro CAMO Humano:** Autoridade regulatória exclusiva com chancela digital e responsabilidade técnica.

---

### Pipeline Ponta a Ponta Homologado (Fases 1 a 9)

```
Regulatory Sources (FAA/EASA/ANAC)
       │
       ▼
Regulatory Discovery & Candidate List (Por Família / Modelo)
       │
       ▼
Document Intelligence (Gemini 3.7 Flash)
       │
       ▼
Deterministic Extraction of Required Configuration Parameters
       │
       ▼
Regulatory Knowledge Base (Conhecimento Reutilizável por Família)
       │
       ├──────────────────────────────────────────────┐
       │ [Princípio de Não-Contaminação]              │
       ▼                                              ▼
Aircraft Configuration Assessment (Entidade Fís.)    Candidate / Delivery Aircraft
       │                                              │
       ▼                                              ▼
Progressive Applicability (5 Estados Estritos)        Lessor Reconciliation
  • POTENTIALLY_APPLICABLE                            (Sandboxed Snapshot)
  • INSUFFICIENT_DATA
  • REVIEW_REQUIRED
  • APPLICABLE
  • NOT_APPLICABLE
       │
       ▼
Compliance Obligation Lifecycle (13 Estados Determinísticos)
       │
       ▼
Due Date & Thresholds (FH / FC / Calendário Exato)
       │
       ▼
Evidence Probatory Set & Verification
       │
       ▼
FAPT Compliance Sheet & Technical Airworthiness Status
```

---

### Fase 9 — Etapa 4: Inteligência Regulatória Integrada

#### 1. Separação Estrita: Conhecimento vs. Entidade Física
* **Conhecimento Regulatório:** Regras de aplicabilidade, limites temporais e ações mandatórias podem ser reutilizados em toda a família ou modelo (`A320`, `B737`, `E-Jets`).
* **Condição de Aeronavegabilidade:** Aplicabilidade, obrigação, evidência, cumprimento e status de aeronavegabilidade pertencem única e exclusivamente à entidade individual (aeronave, motor ou componente) e **nunca** são herdados.

#### 2. Matriz de Aplicabilidade Progressiva (5 Estados)
* `POTENTIALLY_APPLICABLE`: Família/modelo compatível, parâmetros de configuração física pendentes de validação.
* `INSUFFICIENT_DATA`: Faltam dados essenciais na aeronave (ex: S/N do motor ou P/N do atuador). Falta de informação **nunca** é tratada como `NOT_APPLICABLE`.
* `REVIEW_REQUIRED`: Inconsistências de configuração física ou divergência com documentação do lessor.
* `APPLICABLE`: Todos os parâmetros foram atestados e confirmam a aplicabilidade integral da AD.
* `NOT_APPLICABLE`: Atestado formal e comprobatório de não aplicabilidade (ex: modelo excluído ou modificação já incorporada).

#### 3. Aferição de Completude da Configuração
* `totalParametersRequired`: Quantidade de parâmetros exigidos pelas ADs da família.
* `satisfiedParametersCount`: Parâmetros atestados com dados válidos na aeronave.
* `missingParametersCount`: Parâmetros faltantes (`operationalMissingList`) com contagem de ADs impactadas e trilha de rastreabilidade.
* `completionPercentage`: Percentual determinístico de completude cadastral.

Para aprofundamento completo, consulte o documento executivo:
`DOSSIE_ARQUITETURA_SISTEMA_CAMO.md`
