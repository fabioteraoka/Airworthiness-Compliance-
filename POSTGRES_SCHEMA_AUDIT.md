# POSTGRES SCHEMA AUDIT — CAMO AIRWORTHINESS ENGINE
## Auditoria Factual de Infraestrutura e Schemas PostgreSQL — Fase 3D (Gate 1)
**Documento Canônico de Auditoria de Infraestrutura**  
**Data:** 22 de Setembro de 2026  
**Autoridade de Governança:** Engenharia de Dados & Governança CAMO  
**Status do Gate:** `BLOCKED` (Infraestrutura PostgreSQL Inacessível / Não Provisionada)

---

### 1. Infrastructure
* **Ambiente de Execução:** Container Cloud Run (`applet` runtime).
* **Conectividade de Rede:**
  * Portas em escuta local: `3000` (Vite/Node HTTP Server), `8080` (Reverse Proxy / Healthcheck).
  * Porta padrão PostgreSQL (`5432`): Inexistente no localhost do container.
  * Socket Unix PostgreSQL (`/var/run/postgresql`): Não presente.
* **Ferramentas de Linha de Comando:** Utilitários `psql` e `pg_isready` ausentes no container.

---

### 2. PostgreSQL Version
* **Versão Factual:** `UNAVAILABLE` (Nenhum servidor PostgreSQL respondeu a queries).
* **Versão Canônica Homologada (3C.1):** PostgreSQL 16+ com suporte nativo a UUIDv7 e índices parciais GIN.

---

### 3. Provider
* **Provider Factual:** `NONE / NOT PROVISIONED`.
* **Sondagem Cloud SQL via RPC Platform (`cloudsql.ExecuteSql`):**
  * Retorno: `generic::FAILED_PRECONDITION: Applet 4cd0dd49-56be-44d9-a420-e22bc9ac2f9a does not have a Cloud SQL instance.`
* **Sondagem de Elegibilidade GCP (`cloudsql.CheckFeatureEligibility`):**
  * Retorno: `{"reason": "NO_VALID_PROJECT", "results": [{"feature": "CLOUD_SQL_DEVELOPER_EDITION", "reasonCode": "NO_VALID_PROJECT", "reason": "No valid GCP project found with owner permissions and active billing."}]}`
* **Sondagem Firebase SQL Connect / Data Connect:** Nenhum conector ou arquivo `firebase_applet_config.json` ativo.

---

### 4. Database
* **Database Factual:** `NONE`.
* **Database Alvo (3C.1):** `camo_airworthiness_db` (planejado).

---

### 5. Schemas
* **Schemas Fatuais:** Nenhum schema físico criado.
* **Schemas Alvo (3C.1):** 6 namespaces lógicos planejados:
  1. `core_org`
  2. `regulatory_knowledge`
  3. `fleet_configuration`
  4. `compliance_state`
  5. `evidence_verification`
  6. `governance_audit`

---

### 6. Tables
* **Tabelas Fatuais:** `0` tabelas físicas.
* **Tabelas Alvo (3C.1):** 28 tabelas relacionais normalizadas estruturadas na Fase 3C.1.

---

### 7. Columns
* **Colunas Fatuais:** Não aplicável (ausência de tabelas).

---

### 8. Constraints
* **Constraints Fatuais:** Não aplicável.
* **Constraints Alvo (3C.1):** PKs em UUIDv7/v5, FKs estritas com `ON DELETE RESTRICT`, constraints compostas de unicidade e integridade contextual.

---

### 9. Indexes
* **Índices Fatuais:** Não aplicável.
* **Índices Alvo (3C.1):** B-Tree compostos em chaves de busca (`status`, `operator_id`, `next_due_date`) e GIN em campos JSONB de critérios dinâmicos.

---

### 10. Relationships
* **Relacionamentos Fatuais:** Não aplicável.
* **Relacionamentos Alvo (3C.1):** Modelo ER de alta coesão e baixo acoplamento respeitando a cadeia causal ontológica:
  `Regulatory Knowledge → Technical Analysis → Fleet Applicability → Compliance Obligation → Compliance Cycle → Evidence → FAPT`.

---

### 11. Extensions
* **Extensões Fatuais:** Nenhuma extensão instalada.
* **Extensões Alvo (3C.1):** `uuid-ossp` / `pgcrypto` para geração e resolução determinística de UUIDv5.

---

### 12. Security
* **Variáveis de Ambiente / Secrets:** Nenhuma credencial `DATABASE_URL`, `PGPASSWORD`, `SQL_PASSWORD` detectada no ambiente.
* **Permissões:** Sem exposição de segredos em logs, código ou repositório.

---

### 13. Tenant Isolation
* **Isolamento Factual:** Mantido em memória e no arquivo canônico `data/camo_db.json`.
* **Isolamento Alvo (3C.1):** Separação estrita entre Conhecimento Regulatório Universal (escopo global multi-operador) e Estado de Frota / Obrigações (escopo exclusivo de tenant por `operator_id`).

---

### 14. Versioning
* **Versionamento Factual no Banco:** Não aplicável.
* **Versionamento Alvo (3C.1):** Versionamento imutável de ADs (`supersedes_ad_number`), Technical References (`revision`) e FAPT (`fapt_number` com sufixo de revisão).

---

### 15. Audit
* **Auditoria Factual no Banco:** Inexistente fisicamente.
* **Auditoria Alvo (3C.1):** Tabelas append-only (`audit_trail_events`, `configuration_event_ledger`, `obligation_state_transitions`) com bloqueio de `UPDATE` e `DELETE`.

---

### 16. JSONB
* **Uso Factual no Banco:** Não aplicável.
* **Uso Alvo (3C.1):** Restrito estritamente a payloads brutos não tratados do Gemini (`raw_extraction_payload`), critérios booleanos dinâmicos (`dynamic_criteria_json`) e telemetria de IA (`ai_execution_traces`).

---

### 17. Comparison with 3C.1
* A arquitetura lógica e conceitual da Fase 3C.1 está 100% documentada e validada em `DATABASE_PERSISTENCE_ARCHITECTURE.md`.
* No entanto, a infraestrutura física de banco de dados PostgreSQL ainda não foi provisionada no Google Cloud / Cloud SQL para este applet.

---

### 18. Gaps (Lacunas Críticas)
1. **Ausência de Instância Cloud SQL / PostgreSQL:** O comando RPC `cloudsql.ExecuteSql` reporta ausência de instância associada ao applet.
2. **Ausência de Projeto GCP Elegível:** `cloudsql.CheckFeatureEligibility` aponta `NO_VALID_PROJECT` (sem faturamento ativo ou permissões de proprietário configuradas na UI do AI Studio).
3. **Ausência de Driver de Conexão no Runtime:** O `package.json` atual não contém drivers como `pg` ou conectores do Cloud SQL.

---

### 19. Conflicts (Conflitos Estruturais)
* **Nenhum conflito de dados:** Não há tabelas divergentes ou registros corrompidos no PostgreSQL porque o banco físico não foi criado.
* **Base Legada Íntegra:** `data/camo_db.json` permanece intacto com 35 nós de dados e 187/187 testes em memória aprovados.

---

### 20. Recommended Corrections (Recomendações para Desbloqueio)
1. **Configuração de Projeto GCP / Cloud SQL:** O usuário ou administrador deve associar um projeto Google Cloud com faturamento ativo ao applet via Settings / Cloud SQL Setup para habilitar o provisionamento da instância.
2. **Alternativa (PostgreSQL Externo / Conexão Direta):** Caso o usuário deseje conectar uma instância PostgreSQL externa existente (Neon, Supabase, Cloud SQL externo ou VM dedicada), injetar as variáveis de conexão seguras (`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`) via configurações de ambiente.
3. **Preservação de Integridade:** Manter a execução de motores e testes ancorada no `data/camo_db.json` até que o provisionamento físico do banco esteja concluído e testado.

---

## 21. Matriz de Paridade Arquitetural (3C.1 vs Banco Real)

| Domínio / Entidade | Arquitetura Canônica 3C.1 | Banco Real (Factual) | Resultado |
| :--- | :--- | :--- | :---: |
| **AD Documents** | `regulatory_knowledge.regulatory_ad_documents` | Inexistente (Sem banco físico) | **GAP** |
| **Technical Reference** | `regulatory_knowledge.technical_references` | Inexistente (Sem banco físico) | **GAP** |
| **AD × Tech Ref Dependency** | `regulatory_knowledge.ad_sb_dependencies` | Inexistente (Sem banco físico) | **GAP** |
| **Cross Validation** | `regulatory_knowledge.ad_technical_reference_cross_validations` | Inexistente (Sem banco físico) | **GAP** |
| **Analysis Completeness** | `regulatory_knowledge.ad_analysis_completeness_assessments` | Inexistente (Sem banco físico) | **GAP** |
| **Applicability Assessment** | `compliance_state.applicability_assessments` | Inexistente (Sem banco físico) | **GAP** |
| **Compliance Obligation** | `compliance_state.compliance_obligations` | Inexistente (Sem banco físico) | **GAP** |
| **Compliance Cycle** | `compliance_state.compliance_cycles` | Inexistente (Sem banco físico) | **GAP** |
| **Compliance Event** | `compliance_state.compliance_events` | Inexistente (Sem banco físico) | **GAP** |
| **Evidence Record** | `evidence_verification.evidence_records` | Inexistente (Sem banco físico) | **GAP** |
| **FAPT Document** | `evidence_verification.fapt_documents` | Inexistente (Sem banco físico) | **GAP** |
| **Audit Trail** | `governance_audit.audit_trail_events` | Inexistente (Sem banco físico) | **GAP** |
| **Base Legada (`camo_db.json`)** | 35 nós de dados preservados | 100% íntegro e intacto | **MATCH** |
| **Suíte de Testes (187/187)** | 187 testes em memória | 187 testes verdes | **MATCH** |

---

## 22. Decisão do Gate

```text
PHASE 3D GATE 1 = BLOCKED
REASON = PostgreSQL infrastructure unavailable
```
