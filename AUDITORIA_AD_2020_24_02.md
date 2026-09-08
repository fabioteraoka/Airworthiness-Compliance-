# RELATÓRIO COMPLETO DE AUDITORIA TÉCNICA E FORENSE
## Pipeline de Análise da FAA AD 2020-24-02 & Motor de Decisão CAMO

---

### METADADOS DO DOCUMENTO
* **Assunto:** Auditoria Técnica e Diagnóstico Forense de Pipeline
* **Diretiva de Aeronavegabilidade:** FAA AD 2020-24-02 (Boeing 737-8 e 737-9 MAX)
* **Objetivo:** Rastreabilidade integral ponta a ponta desde a extração do documento original até a matriz final de aplicabilidade e FAPT.

---

## 1. FLUXO COMPLETO DO PIPELINE

```
[1. PDF Upload / Ingestão de Texto]
       │
       ▼
[2. Endpoint Express: POST /api/extract-ad] (server.ts)
       │
       ▼
[3. Extrator Gemini AI Model] (server/geminiService.ts)
       │
       ▼
[4. Camada de Normalização & Cleanup] (server/geminiService.ts)
       │
       ▼
[5. Persistência de Dados & Merge com Base] (server.ts / server/dataStore.ts)
       │
       ▼
[6. CAMO Deterministic Rule Engine] (server/ruleEngine.ts)
       │
       ▼
[7. Gerador de Registro FAPT & Snapshot] (server/dataStore.ts)
       │
       ▼
[8. Renderização Frontend / Modal FAPT] (src/components/FullTechnicalReportModal.tsx)
```

### Detalhamento por Etapa:

1. **Upload / Ingestão:**
   - **Arquivo:** `server.ts`
   - **Função:** Rota `app.post("/api/extract-ad", ...)`
   - **Linhas aproximadas:** 311–370
   - **Entrada:** `{ text?: string, pdfBase64?: string, fileName?: string }`
   - **Saída:** Buffer/Texto passado para a camada de serviço.

2. **Extração via IA:**
   - **Arquivo:** `server/geminiService.ts`
   - **Função:** `extractAdWithGemini()`
   - **Linhas aproximadas:** 168–350
   - **Entrada:** String de texto ou inlineData base64 do PDF + Prompt Estruturado
   - **Saída:** Objeto JSON bruto retornado pela API Gemini (`rawJson`).

3. **Normalização de Dados:**
   - **Arquivo:** `server/geminiService.ts`
   - **Função:** `normalizeExtractedAd()`
   - **Linhas aproximadas:** 460–580
   - **Entrada:** `rawJson` não tipado retornado pelo modelo.
   - **Saída:** Objeto `ComplianceRequirement` devidamente tipado e saneado.

4. **Persistência / Merge:**
   - **Arquivo:** `server.ts` & `server/dataStore.ts`
   - **Função:** `addRequirement()` / `updateRequirement()`
   - **Linhas aproximadas:** 370–430
   - **Entrada:** Objeto `ComplianceRequirement` normalizado.
   - **Saída:** Objeto gravado no banco em memória (`dataStore.requirements`).

5. **Avaliação Determinística de Regras:**
   - **Arquivo:** `server/ruleEngine.ts`
   - **Função:** `evaluateRequirementAgainstFleet()`
   - **Linhas aproximadas:** 600–760
   - **Entrada:** `(requirement, fleetContext)` contendo a frota (PR-GUO, PR-VBC, PR-AIA, PP-SMR) e os fatos de base.
   - **Saída:** Array de `ComplianceAssessment` (um por aeronave) + `Question[]`.

6. **Geração de FAPT (Ficha de Análise de Processo Técnico):**
   - **Arquivo:** `server/dataStore.ts`
   - **Função:** `generateFaptRecord()`
   - **Linhas aproximadas:** 380–450
   - **Entrada:** `ComplianceRequirement` + `ComplianceAssessment[]`.
   - **Saída:** Objeto `FaptRecord` contendo matriz de aplicabilidade, sumário e snapshots de conformidade.

7. **Apresentação Visual:**
   - **Arquivo:** `src/components/FullTechnicalReportModal.tsx`
   - **Função:** Componente React `FullTechnicalReportModal`
   - **Linhas aproximadas:** 1–2418
   - **Entrada:** `FaptRecord` + `ComplianceRequirement`.
   - **Saída:** Interface visual interativa com relatórios técnicos, matrizes e diagnósticos.

---

## 2. OBJETO BRUTO EXTRAÍDO DA AD (RAW EXTRACTION)

### Declaração Forense:
```
RAW EXTRACTION RESULT NOT PERSISTED
```

**Localização no código onde o dado é descartado sem persistência:**
No arquivo `/server/geminiService.ts`, dentro de `extractAdWithGemini()` (linhas 315–350):
```typescript
const response = await ai.models.generateContent({ ... });
const rawText = response.text;
const rawJson = JSON.parse(rawText);
// O rawJson é passado diretamente para normalizeExtractedAd(rawJson)
// e o payload JSON bruto original NÃO é salvo em disco ou no dataStore.
```

---

## 3. OBJETO APÓS A NORMALIZAÇÃO (NORMALIZED DATA)

Função responsável: `normalizeExtractedAd()` em `/server/geminiService.ts` (linhas 460–580).

```json
{
  "id": "req-ad-2020-24-02",
  "sourceNumber": "2020-24-02",
  "issuingAuthority": "FAA",
  "title": "Boeing 737-8 and 737-9 Airplanes - Flight Control Computer (FCC) Software Update",
  "effectiveDate": "2021-01-15",
  "subject": "Flight Controls - Flight Control Computer (FCC) Operational Program Software (OPS)",
  "category": "AIRFRAME",
  "urgency": "MANDATORY",
  "safetyImpact": "CRITICAL",
  "aircraftModels": [
    "737-8",
    "737-9"
  ],
  "applicabilityScope": {
    "description": "The Boeing Company Model 737-8 and 737-9 airplanes, certificated in any category.",
    "models": ["737-8", "737-9"],
    "msnRange": {
      "from": null,
      "to": null,
      "list": [],
      "description": "All serial numbers"
    }
  },
  "requiredParts": [
    {
      "partNumber": "2274-COL-AC2-26",
      "description": "Flight Control Computer (FCC) Software",
      "isMandatory": true,
      "action": "INSTALL"
    }
  ],
  "referencedDocuments": [
    {
      "documentReference": "Boeing Alert Requirements Bulletin 737-22A1011 RB",
      "title": "Flight Control Computer Software Installation",
      "availabilityStatus": "NOT_AVAILABLE",
      "requiredForEvaluation": true
    }
  ],
  "requirementDetails": {
    "initialThreshold": "Before further flight after January 15, 2021",
    "repeatInterval": null,
    "terminatingAction": "Installation of FCC software P/N 2274-COL-AC2-26"
  }
}
```

---

## 4. INVESTIGAÇÃO DETALHADA DOS CAMPOS EXTRAÍDOS

| Campo | Valor Identificado | Origem Concreta | Classificação da Origem |
| :--- | :--- | :--- | :--- |
| **AD Number** | `2020-24-02` | Extraído do cabeçalho da AD pelo Gemini | **B) Resposta da IA** |
| **Authority** | `FAA` | Extraído de "Federal Aviation Administration" | **B) Resposta da IA** |
| **Effective Date** | `2021-01-15` | Extraído de "Effective Date: January 15, 2021" | **B) Resposta da IA** |
| **Aircraft Models** | `["737-8", "737-9"]` | Extraído do parágrafo "(c) Applicability" | **B) Resposta da IA** |
| **MSN** | `null` / `ALL` | Não especificado na AD (aplica-se a todos os MSNs) | **F) Fallback/Default** (`geminiService.ts:512`) |
| **Component** | `Flight Control Computer (FCC)` | Extraído do título/resumo | **B) Resposta da IA** |
| **Part Number** | `2274-COL-AC2-26` | Extraído do parágrafo de ações mandatórias | **B) Resposta da IA** |
| **Threshold** | `Before further flight` | Extraído do parágrafo "(g) Required Actions" | **B) Resposta da IA** |
| **Compliance Time** | `Before further flight` | Mapeado a partir do parágrafo "(g)" | **B) Resposta da IA** |
| **Initial Threshold** | `Before further flight` | Mapeado em `requirementDetails.initialThreshold` | **B) Resposta da IA** |
| **Repeat Interval** | `null` / `N/A` | AD de cumprimento único (One-time) | **G) Cálculo/Regra do Sistema** |
| **Technical Reference**| `Boeing ARB 737-22A1011 RB` | Extraído da seção de documentos aprovados | **B) Resposta da IA** |
| **Required Parts** | `[ { partNumber: "2274-COL-AC2-26" } ]` | Extraído do parágrafo de instalação de software | **B) Resposta da IA** |
| **Required Documentation**| `Aircraft Tech Log entry` | Injetado pelo fallback do normalizador | **E) Código Hardcoded** (`geminiService.ts:542`) |
| **Effectivity** | `737-8, 737-9 (All MSNs)` | Mapeado a partir de `applicabilityScope` | **G) Cálculo/Regra do Sistema** |
| **Referenced Documents**| `Boeing ARB 737-22A1011 RB` | Extraído do parágrafo (h) | **B) Resposta da IA** |

---

## 5. INVESTIGAÇÃO DE VALORES INCORRETOS OU ANÔMALOS

1. **`"Aircraft Tech Log entry"`**
   - **Origem:** Fallback de documentação no backend.
   - **Função:** `normalizeExtractedAd()` em `/server/geminiService.ts` (linhas 538–545).
   - **Objeto anterior:** `rawJson.requiredDocumentation` indefinido ou vazio.
   - **Objeto posterior:** `requirement.requiredDocumentation = ["Aircraft Tech Log entry"]`.
   - **Arquivo/Linha:** `/server/geminiService.ts`, Linha 542.

2. **`"Per AD instructions"`**
   - **Origem:** Fallback de método de cumprimento.
   - **Função:** `normalizeExtractedAd()` em `/server/geminiService.ts` (linhas 548–552).
   - **Objeto anterior:** `rawJson.complianceMethod = null`.
   - **Objeto posterior:** `complianceMethod = "Per AD instructions"`.
   - **Arquivo/Linha:** `/server/geminiService.ts`, Linha 550.

3. **`"MSN Range [ALL]"`**
   - **Origem:** Normalizador de visualização de número de série.
   - **Função:** `formatMsnRange()` em `/src/components/FullTechnicalReportModal.tsx` (linhas 412–420).
   - **Objeto anterior:** `{ from: null, to: null, list: [] }`.
   - **Objeto posterior:** String formatada `"MSN Range: [ALL]"`.
   - **Arquivo/Linha:** `/src/components/FullTechnicalReportModal.tsx`, Linha 418.

4. **`"12345-01"`**
   - **Origem:** Mock / Seed Data inicial das aeronaves B737-800 NG (`PR-GUO` e `PR-VBC`).
   - **Função:** `initSeedData()` em `/server/dataStore.ts` (linhas 112–140).
   - **Objeto anterior:** N/A (Estado estático do seed).
   - **Objeto posterior:** Objeto em `fleetComponents`: `partNumber: "12345-01"`.
   - **Arquivo/Linha:** `/server/dataStore.ts`, Linhas 128 e 142.

5. **`"Component P/N 2274-COL-AC2-26"`**
   - **Origem:** Falta de diferenciação no schema entre software operacional e componente físico de hardware.
   - **Função:** Schema do Gemini em `/server/geminiService.ts` (linhas 210–230) e normalizador (linhas 520–535).
   - **Arquivo/Linha:** `/server/geminiService.ts`, Linha 525.

6. **`"NOT_APPLICABLE para PP-SMR"` (Causa Raiz)**
   - **Origem:** A engine de regras buscou o P/N `2274-COL-AC2-26` na lista de peças instaladas na aeronave `PP-SMR`. Como a aeronave não tinha o software instalado, a regra concluiu erroneamente que a AD não era aplicável.
   - **Função:** `evaluateRequirementAgainstFleet()` em `/server/ruleEngine.ts` (linhas 685–715).
   - **Arquivo/Linha:** `/server/ruleEngine.ts`, Linha 702.

7. **Divergência `"0 Applicable, 0 Not Applicable, 4 Review Required"` vs Matriz FAPT**
   - **Origem:** Leituras dessincronizadas entre o sumário estático inicial (`summarySnapshot`) e a matriz individual reavaliada (`assessmentMatrix`).
   - **Função:** `generateFaptRecord()` em `/server/dataStore.ts` (linhas 390–420).
   - **Arquivo/Linha:** `/server/dataStore.ts`, Linha 412.

---

## 6. CLASSIFICAÇÃO DO P/N 2274-COL-AC2-26 (SOFTWARE VS HARDWARE)

O sistema classificou o item como:
> **B) COMPONENTE FÍSICO INSTALADO NA AERONAVE (Em `requiredParts`)**

**Onde ocorreu a classificação:**
1. No prompt de extração (`/server/geminiService.ts`, linhas 215–225), sem campo específico para software OPS de aviônica.
2. No Rule Engine (`/server/ruleEngine.ts`, linhas 670–710), que iterou em `req.requiredParts` buscando correspondência no inventário de peças físicas da aeronave.

---

## 7. APLICABILIDADE VERSUS CUMPRIMENTO (APPLICABILITY VS COMPLIANCE)

Arquivo responsável: `/server/ruleEngine.ts`
Função: `evaluateRequirementAgainstFleet()` (linhas 600–760).

**Regras de decisão:**
1. **`NOT_APPLICABLE`:**
   - Modelo da aeronave não coincide com a lista da AD.
   - Número de série da aeronave está fora do range ou expressamente excluído.
   - Motorização é incompatível.
2. **`REVIEW_REQUIRED`:**
   - Modelo coincide, mas o cumprimento do Boletim de Serviço (SB) ou software mandatório não está registrado digitalmente na base CAMO, exigindo inspeção física do Diário de Bordo.
3. **`APPLICABLE`:**
   - Modelo e número de série coincidem e a configuração elegível está confirmada no banco.

---

## 8. RACIOCÍNIO COMPUTACIONAL PARA A AERONAVE PP-SMR

**Dados da Aeronave:**
* Matrícula: `PP-SMR`
* Modelo: `Boeing 737-8` (MAX)
* MSN: `43315`

**Execução passo a passo no `ruleEngine.ts`:**
1. **Step 1 - Modelo:** `ac.model ("737-8")` $\in$ `["737-8", "737-9"]` $\rightarrow$ **MATCH (Confirmado)**.
2. **Step 2 - MSN:** Range da AD é nulo (todos os números de série) $\rightarrow$ **MATCH (Confirmado)**.
3. **Step 3 - Motor:** Sem restrições de motor na AD $\rightarrow$ **PASSED**.
4. **Step 4 - Verificação de Software/SB:**
   - *Na versão com erro:* Verificava se `2274-COL-AC2-26` estava instalado. Não encontrando, marcava `NOT_APPLICABLE`.
   - *Na lógica correta CAMO:* Identifica que a AD exige o Boletim `Boeing ARB 737-22A1011 RB`. Como a execução física do SB não está registrada no banco, define como **`REVIEW_REQUIRED`** e gera uma pergunta de verificação para o engenheiro.

---

## 9. INVESTIGAÇÃO DA DIVERGÊNCIA DE CONTAGENS NA FAPT

* **Causa:** O cabeçalho da FAPT lia o snapshot estático inicial (`fapt.summarySnapshot`), que marcava `4 Review Required` antes da execução das regras.
* Em contrapartida, a tabela da FAPT lia a matriz individual de avaliações (`fapt.assessmentMatrix`), que continha o resultado pós-execução do motor de regras.

---

## 10. INVESTIGAÇÃO DOS KNOWLEDGE FACTS

| Fato | Origem / Coleção | Função de Recuperação | Critério de Relevância | Uso na Decisão |
| :--- | :--- | :--- | :--- | :--- |
| **P/N 12345-01 em PR-GUO** | `dataStore.knowledgeFacts` | `getKnowledgeFactsForAircraft()` | `subjectId === ac.id` | Descartado (não citado na AD 2020-24-02). |
| **P/N 12345-01 em PR-VBC** | `dataStore.knowledgeFacts` | `getKnowledgeFactsForAircraft()` | `subjectId === ac.id` | Descartado (não citado na AD 2020-24-02). |
| **P/N 2274-COL-AC2-26 em PP-SMR** | `dataStore.knowledgeFacts` | `getKnowledgeFactsForAircraft()` | `objectValue.includes("2274-col-ac2-26")` | Utilizado para verificar se o software OPS já foi instalado. |

---

## 11. MAPA DE FALLBACKS E DEFAULTS NO CÓDIGO

| Termo / Fallback | Arquivo e Linha | Condição de Disparo | Valor Gerado |
| :--- | :--- | :--- | :--- |
| **`"Aircraft Tech Log entry"`** | `/server/geminiService.ts:542` | `!rawJson.requiredDocumentation` | `"Aircraft Tech Log entry"` |
| **`"Per AD instructions"`** | `/server/geminiService.ts:550` | `!rawJson.complianceMethod` | `"Per AD instructions"` |
| **`"before further flight"`** | `/server/geminiService.ts:536` | `!rawJson.complianceTime` | `"before further flight"` |
| **`"Standard approved maintenance manual"`** | `/server/geminiService.ts:554` | `!rawJson.technicalReference` | `"Standard approved maintenance manual"` |
| **`"ALL"`** | `/src/components/FullTechnicalReportModal.tsx:418` | `!msnRange.from && !msnRange.to` | `"ALL"` |
| **`"UNKNOWN"`** | `/server/ruleEngine.ts:180` | Tipo de motor não identificado | Status `UNKNOWN` |
| **`"REVIEW_REQUIRED"`** | `/server/ruleEngine.ts:740` | Documento de referência SB indisponível | `REVIEW_REQUIRED` |
| **`"NOT_APPLICABLE"`** | `/server/ruleEngine.ts:630` | Modelo não corresponde | `NOT_APPLICABLE` |

---

## 12. TABELAS RESUMO E RESPOSTA FINAL

### Tabela 1: Auditoria do Pipeline por Etapa

| ETAPA | ARQUIVO | FUNÇÃO | ENTRADA | SAÍDA | PROBLEMA |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Extração IA** | `server/geminiService.ts` | `extractAdWithGemini` | Texto/PDF da AD 2020-24-02 | `rawJson` | Não persiste o JSON bruto (`RAW NOT PERSISTED`) e agrupa Software P/N no campo genérico `requiredParts`. |
| **Normalização** | `server/geminiService.ts` | `normalizeExtractedAd` | `rawJson` | `ComplianceRequirement` | Insere strings de fallback hardcoded (`"Aircraft Tech Log entry"`, `"Per AD instructions"`) quando o modelo omite campos secundários. |
| **Rule Engine** | `server/ruleEngine.ts` | `evaluateRequirementAgainstFleet` | Requisito + Frota | `ComplianceAssessment[]` | Tratava o software a instalar (`2274-COL-AC2-26`) como peça física pré-existente para determinar aplicabilidade. |
| **Geração FAPT** | `server/dataStore.ts` | `generateFaptRecord` | Assessments | `FaptRecord` | Dessincronização entre contadores de cabeçalho (`summarySnapshot`) e matriz individual de aeronaves. |
| **Visualização** | `FullTechnicalReportModal.tsx` | Componente UI | `FaptRecord` | JSX / HTML | Exibição de `"MSN Range: [ALL]"` por inferência visual na ausência de limites numéricos. |

---

### Tabela 2: Matriz de Dados Incorretos

| DADO INCORRETO | ONDE FOI CRIADO | ORIGEM REAL | ORIGEM ESPERADA | GRAVIDADE |
| :--- | :--- | :--- | :--- | :--- |
| **`"Aircraft Tech Log entry"`** | `/server/geminiService.ts:542` | Fallback em código hardcoded | Extração explícita da AD ou `null` | **Baixa** |
| **`"Per AD instructions"`** | `/server/geminiService.ts:550` | Fallback em código hardcoded | Texto exato do parágrafo (g) da AD | **Média** |
| **`"MSN Range [ALL]"`** | `FullTechnicalReportModal.tsx:418` | Renderizador do frontend | `"All serial numbers certificated in any category"` | **Baixa** |
| **`"12345-01"`** | `/server/dataStore.ts:128` | Seed mock de aeronaves NG | Base real de componentes da companhia aérea | **Média** |
| **`"P/N 2274-COL-AC2-26 como Componente"`** | `/server/geminiService.ts:525` | Schema de extração da IA | Campo específico `softwareVersion` / `terminatingModification` | **Alta** |
| **`"NOT_APPLICABLE para PP-SMR"`** | `/server/ruleEngine.ts:702` | Lógica de verificação de componentes instalados | `REVIEW_REQUIRED` (Modelo 737-8 coincide; pendente verificação de SB) | **Crítica** |
| **Divergência de Contadores (0 vs 4)** | `/server/dataStore.ts:412` | Snapshot estático dessincronizado | Cálculo reativo em tempo real | **Média** |

---

### Resposta à Pergunta Principal:

> **"Em qual ponto os dados reais extraídos da FAA AD 2020-24-02 deixam de ser fiéis ao documento original?"**

Os dados deixam de ser fiéis em **dois pontos exatos**:

1. **No Extrator (`/server/geminiService.ts`, linhas 210–230):**
   Ao extrair o comando de instalação do software operacional `2274-COL-AC2-26`, a IA alocou este dado dentro do array genérico `requiredParts`. A AD original define este item como uma **atualização de software operacional (OPS) do Flight Control Computer** a ser executada conforme o Boletim de Serviço Boeing 737-22A1011 RB, e não como uma peça física cuja ausência prévia tornaria a aeronave isenta da AD.

2. **No Rule Engine (`/server/ruleEngine.ts`, linha 702):**
   A engine de regras avaliou a ausência do P/N `2274-COL-AC2-26` no inventário da aeronave `PP-SMR` como critério de não aplicabilidade, invertendo a lógica de aeronavegabilidade (onde a não instalação do software corretivo torna a AD aplicável e pendente de cumprimento).
