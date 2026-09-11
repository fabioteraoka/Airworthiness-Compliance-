<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Airworthiness Compliance Intelligence Platform (CAMO Engine)

Sistema avançado de engenharia de software aeronáutico para controle de aeronavegabilidade continuada, estruturado para atendimento estrito às normas **FAA 14 CFR Part 39**, **EASA Part-M (Subpart G/CAMO)** e **ANAC RBAC 121 / RBAC 39**.

---

## Módulos Principais & Fluxo Operacional

1. **Frota & Operações:**
   - Inventário físico de células, motores (ESN) e componentes rotáveis (P/N e S/N).
   - Horas de voo (FH) e ciclos de pouso (FC) com recálculo determinístico e inviolabilidade temporal.

2. **Inteligência Regulatória (Fase 9 — Etapa 4):**
   - Descoberta por família e modelo (Airbus A320, Boeing 737, Embraer E-Jets) em fontes oficiais (FAA, EASA, ANAC).
   - Extração automática de parâmetros de configuração exigidos pelas ADs.
   - Base de Conhecimento Regulatório reutilizável sem contaminação entre aeronaves.
   - Aferição de completude de configuração e checklist de lacunas operacionais com resolução in-place.
   - Matriz de aplicabilidade progressiva com 5 estados regulatórios estritos.

3. **Conformidade & Diretrizes:**
   - Gestão de Diretrizes de Aeronavegabilidade (ADs) e Boletins de Serviço (SBs).
   - Triagem e busca cruzada por frota.
   - Extração inteligente de PDFs de diretrizes via Gemini 3.7 Flash.
   - Emissão de Folhas de Análise e Parecer Técnico (FAPT) com assinatura digital.

4. **Aeronavegabilidade & Prazos:**
   - Cálculo determinístico de Due Dates e Thresholds (limites por FH, FC e calendário civil exato).
   - Rastreabilidade de ações repetitivas, ações terminatórias e supersedência.

5. **Transição de Aeronaves & Delivery:**
   - Módulo de pré-compra e redelivery com reconciliação de dados de Lessors.
   - Avaliação de aeronaves candidatas em sandbox criptografado.

6. **Governança & Auditoria:**
   - Trilha de auditoria criptográfica com hashing SHA-256 e integridade de proveniência de decisões.
   - Dossiê executivo completo (`DOSSIE_ARQUITETURA_SISTEMA_CAMO.md`).

---

## Como Executar

**Pré-requisitos:** Node.js 18+

1. Instalar dependências:
   ```bash
   npm install
   ```
2. Configurar a chave de API Gemini no arquivo `.env` ou `.env.local`:
   ```env
   GEMINI_API_KEY=sua_chave_aqui
   ```
3. Iniciar o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Executar os testes de validação:
   ```bash
   npm test
   ```
