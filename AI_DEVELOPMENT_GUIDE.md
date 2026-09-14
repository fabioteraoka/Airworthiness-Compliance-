# AI DEVELOPMENT GUIDE — CONTRATO DE DESENVOLVIMENTO AUTÔNOMO
## Diretrizes Operacionais, Invariantes e Protocolo de Execução para Agentes de IA
**Documento Canônico de Governança para Engenharia Assistida por IA**  
**Versão:** Release 9.5.2 (Active Living Architecture)  
**Data:** 14 de Setembro de 2026  
**Autoridade:** Governança Técnica & Arquitetura do Sistema CAMO  
**Status:** VIVO • OBRIGATÓRIO • CONTRATO INEGOCIÁVEL  

---

## 1. PROPÓSITO DO GUIA

Este documento é o **contrato operacional e arquitetural** que rege a atuação de qualquer Inteligência Artificial que trabalhe neste repositório. O objetivo primordial é garantir a **continuidade perfeita da arquitetura**, impedindo a criação de silos paralelos, a alucinação de regras regulatórias, a contaminação de dados operacionais e a divergência entre código e documentação.

A memória do projeto reside **estritamente dentro deste repositório**, e não na janela de contexto de conversas anteriores.

---

## 2. ETAPA 0: LEITURA OBRIGATÓRIA (ANTES DE QUALQUER MODIFICAÇÃO)

Antes de propor planos, executar edições em código ou criar arquivos, a IA **DEVE** obrigatoriamente ler e absorver os seguintes documentos canônicos nesta ordem:

1. **`AI_DEVELOPMENT_GUIDE.md`** (este documento): Regras de ouro e invariantes de segurança.
2. **`PRODUCT_VISION_ROADMAP.md`**: Visão do produto, limites de escopo e priorização estratégica.
3. **`DOSSIE_ARQUITETURA_SISTEMA_CAMO.md`**: Topologia de componentes, submódulos e comportamento de engenharia.
4. **`CAPABILITY_REGISTRY.md`**: Catálogo de capacidades oficiais cadastradas (`CAP-001` a `CAP-026`).
5. **`SYSTEM_CURRENT_STATE_AUDIT.md`**: Auditoria do estado real mais recente do sistema.

Após a leitura dos documentos de governança, a IA deve **auditar o código-fonte real**:
* Modelos de dados em `src/types.ts`.
* Armazenamento e persistência em `server/dataStore.ts`.
* Motores de regras e submódulos em `server/camoEngine/`.
* Conectores em `server/regulatoryConnectors/`.
* Rotas da API em `server.ts`.
* Suíte de testes existente em `test/`.

---

## 3. AS 12 REGRAS INEGOCIÁVEIS (INVARIANTES REGULATÓRIOS)

Toda IA que opere neste repositório está estritamente submetida às 12 regras inegociáveis abaixo. Qualquer violação constitui falha crítica de segurança e integridade:

1. **Proibição de Arquitetura Paralela:** Jamais crie uma estrutura de dados, componente ou serviço paralelo se já existir uma capacidade equivalente ou análoga cadastrada no `CAPABILITY_REGISTRY.md`. Reutilize, estenda e respeite os módulos existentes.
2. **Fonte Única da Verdade:** Não duplique entidades de domínio. A frota e suas instalações residem em `dataStore.ts` e `camoDb`. Diretrizes regulatórias e bases de conhecimento possuem seus repositórios próprios já homologados.
3. **Imutabilidade de Invariantes sem Decisão Expressa:** Não altere máquinas de estados regulatórias (como a máquina de 13 estados de obrigações de cumprimento) ou regras booleanas de aplicabilidade sem comando explícito e fundamentado.
4. **Informação NÃO é Compliance:** A simples presença de um documento, número de AD ou texto normativo nunca converte automaticamente uma obrigação em `COMPLIED`. O cumprimento exige evidência física atestada e verificação humana.
5. **OVERDUE NÃO é GROUNDED Automático:** Uma obrigação vencida (`OVERDUE`) afeta severamente os índices de aeronavegabilidade contínua da aeronave (`UNSERVICEABLE` / `REVIEW_REQUIRED`), mas a decisão de interdição física de aeronave (*grounding*) ou aplicação de MEL pertence exclusivamente aos gestores e autoridades operacionais.
6. **REVIEW_REQUIRED NÃO é HOLD Arbitrário:** Incerteza técnica requer questionamento e diligência de engenharia (`REVIEW_REQUIRED` / perguntas técnicas), não paralisação descontrolada do pipeline de dados.
7. **Proibição Absoluta de Inventar Dados Ausentes (Anti-Alucinação):** Ausência de dados de frota (ex: falta de número de série de atuador ou histórico de SB) gera estritamente `INSUFFICIENT_DATA` ou `REVIEW_REQUIRED`. É terminantemente proibido assumir conformidade ou declarar `NOT_APPLICABLE` por falta de informação.
8. **Isolamento Rígido entre Contextos:** Preservar a segregação entre frotas de operadores distintos e, criticamente, entre a **Frota Ativa em Operação** e o **Sandbox de Pré-Entrega / Lessors (CAP-015)**. Uma aeronave candidata em auditoria nunca deve afetar a telemetria da frota operacional.
9. **Preservação de Histórico e Auditabilidade Append-Only:** Jamais sobrescreva ou apague registros históricos de auditoria. Modificações de dados de aeronaves, status ou componentes devem gerar registros rastreáveis no Livro de Auditoria com carimbo temporal.
10. **Princípio Zero da IA Confinada:** Modelos de Linguagem e IA generativa (Gemini 3.7 Flash) atuam unicamente na extração, tradução e estruturação documental a partir de texto bruto. A IA nunca toma decisões de aplicabilidade nem declara conformidade de aeronaves.
11. **Significado do Hash SHA-256:** Hashes criptográficos gerados no sistema representam **integridade e verificação matemática contra adulteração acidental ou intencional**, e não uma barreira mágica contra intervenções em banco local.
12. **Rastreabilidade Completa de Mudanças:** Toda evolução de código deve preservar referências a usuários, licenças de engenharia (quando aplicável) e justificativas técnicas documentadas.

---

## 4. O CICLO OBRIGATÓRIO DE DESENVOLVIMENTO (7 PASSOS)

Qualquer implementação executada por IA deve percorrer estritamente as seguintes 7 fases:

```
┌─────────┐     ┌────────┐     ┌───────────┐     ┌────────┐
│  AUDIT  │ ──► │ DESIGN │ ──► │ IMPLEMENT │ ──► │  TEST  │
└─────────┘     └────────┘     └───────────┘     └────────┘
                                                      │
                                                      ▼
┌──────────────┐     ┌────────────┐     ┌───────────────────┐
│ SYNCHRONIZE  │ ◄── │ REGRESSION │ ◄── │ SECURITY & INTEGR │
│     DOCS     │     │   TESTS    │     │      CHECKS       │
└──────────────┘     └────────────┘     └───────────────────┘
```

1. **AUDIT (Auditoria Preliminar):** Identifique o estado real do código, os tipos TypeScript envolvidos, endpoints existentes e a suíte de testes em vigor.
2. **DESIGN (Desenho da Solução):** Projete a modificação respeitando a arquitetura modular existente, verificando a matriz de dependências de `PRODUCT_VISION_ROADMAP.md`.
3. **IMPLEMENT (Implementação Cirúrgica):** Escreva código TypeScript estritamente tipado, modular e limpo. Não crie componentes gigantescos monolíticos em um único arquivo.
4. **TEST (Testes Automatizados Vitest):** Crie testes automatizados comprovando a nova funcionalidade ou correção. Teste cenários de sucesso, falha e casos de borda.
5. **SECURITY & INTEGRITY CHECKS (Segurança e Invariantes):** Valide que regras de Anti-SSRF, sanitização de inputs, validação de IDs e integridade SHA-256 foram integralmente respeitadas.
6. **REGRESSION TESTS (Verificação de Regressão Completa):** Execute toda a suíte de testes (`npx vitest run`), o linter (`npm run lint` / `tsc --noEmit`) e a compilação de produção (`compile_applet`). Todos os testes devem passar (100% GREEN).
7. **SYNCHRONIZE DOCUMENTATION (Sincronização Documental):** Atualize a documentação canônica para refletir as alterações no código.

---

## 5. SINCRONIZAÇÃO DOCUMENTAL OBRIGATÓRIA (CRITÉRIO DE CONCLUSÃO)

> **REGRA DE OURO:** Uma tarefa NÃO está concluída se o código estiver implementado mas a documentação estiver defasada ou divergente.

Ao finalizar qualquer implementação, a IA deve inspecionar e atualizar:
* **`DOSSIE_ARQUITETURA_SISTEMA_CAMO.md`**: Atualizar número de endpoints, catálogo de módulos, fluxos e versão.
* **`CAPABILITY_REGISTRY.md`**: Atualizar status, versão e cobertura de testes da capacidade afetada.
* **`PRODUCT_VISION_ROADMAP.md`**: Atualizar a matriz de dependências, limitações e próximos passos.
* **`SYSTEM_CURRENT_STATE_AUDIT.md`**: Registrar a auditoria do estado atual com indicadores atualizados.
* **`README.md`**: Atualizar contadores de testes, capacidades e links institucionais.

---

## 6. MODELO PADRONIZADO DE RELATÓRIO FINAL

Ao concluir sua resposta, a IA deve fornecer um relatório final claro, objetivo e estruturado contendo exatamente as seguintes seções:

```markdown
### RELATÓRIO DE EXECUÇÃO E GOVERNANÇA

1. **Estado Inicial Encontrado:** (Descrever a release, contadores de teste e baseline auditada).
2. **Documentos Criados:** (Lista de novos documentos com seus propósitos).
3. **Documentos Atualizados:** (Lista de documentos sincronizados).
4. **Capacidades Afetadas / Confirmadas:** (IDs de CAP envolvidos com status real).
5. **Roadmap e Dependências:** (Como a alteração se posiciona na esteira P0/P1/P2/FUTURE).
6. **Implementações no Backend & Frontend:** (Módulos e telas alterados).
7. **Testes Automatizados Executados:** (Arquivos de teste e quantidade de testes passando).
8. **Verificação de Compilação & Linter:** (Status do `tsc --noEmit` e `compile_applet`).
9. **Segurança & Invariantes Auditados:** (Anti-SSRF, SHA-256, regras determinísticas).
10. **Limitações Conhecidas:** (Fronteiras funcionais remanescentes).
11. **Estado Final:** [PASS | PASS WITH LIMITATIONS | FAIL]
```
