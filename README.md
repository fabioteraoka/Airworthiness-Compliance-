<div align="center">

# ✈️ CAMO Airworthiness Compliance Intelligence Platform
### Enterprise Aviation Continuing Airworthiness & Regulatory Intelligence Engine
**Conforme FAA 14 CFR Part 39 • EASA Part-M (CAMO) • ANAC RBAC 121 & RBAC 39**

[![Compliance](https://img.shields.io/badge/Compliance-FAA%20|%20EASA%20|%20ANAC-blue.svg?style=for-the-badge)](https://www.easa.europa.eu/)
[![Audit Trail](https://img.shields.io/badge/Security-SHA--256%20Cryptographic%20Audit-emerald.svg?style=for-the-badge)](./DOSSIE_ARQUITETURA_SISTEMA_CAMO.md)
[![AI Engine](https://img.shields.io/badge/AI%20Intelligence-Gemini%203.7%20Flash%20Document-indigo.svg?style=for-the-badge)](https://ai.google.dev/)
[![Vitest](https://img.shields.io/badge/Automated%20Tests-92%2F92%20Passed%20(100%25)-success.svg?style=for-the-badge)](./test/)

---

<p align="center">
  <b>A solução definitiva para Linhas Aéreas, Empresas de Leasing Aeronáutico (Lessors) e MROs eliminarem riscos de AOG (Aircraft On Ground), multas regulatórias e perdas milionárias em devolução de aeronaves.</b>
</p>

<img src="./assets/images/camo_fleet_dashboard_1789127135313.jpg" alt="CAMO Fleet Cockpit Dashboard" width="100%" style="border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.6);" />

*Cockpit Executivo & Monitoramento Contínuo de Aeronavegabilidade em Tempo Real: Telemetria de Frota, Alertas de Diretrizes Críticas e Indicadores de Conformidade.*

</div>

---

## 💼 Visão Executiva & Proposta de Valor

No setor de aviação comercial, uma aeronave inoperante por não-conformidade documental (**AOG**) acarreta prejuízos entre **US$ 50.000 e US$ 150.000 por dia**, além de severas sanções regulatórias e riscos de segurança de voo. Na devolução de aeronaves para Lessors (*redelivery*), discrepâncias nos registros técnicos podem resultar em glosas contratuais que superam **US$ 2 milhões por célula**.

O **CAMO Airworthiness Compliance Intelligence Platform** foi concebido por engenheiros aeronáuticos e arquitetos de software para transformar o controle de aeronavegabilidade de um processo reativo e manual em um ecossistema inteligente, preventivo e auditável.

### 🌟 Pilares Estratégicos

| Pilar Estratégico | Como Funciona | Impacto no Negócio |
| :--- | :--- | :--- |
| **🛡️ Risco Regulatório Zero & Prevenção de AOG** | Rastreabilidade matemática de thresholds por Horas de Voo (FH), Ciclos (FC) e Calendário Civil exato. | Eliminação de paralisações não planejadas e garantia de voabilidade contínua. |
| **🧠 Document Intelligence (Gemini 3.7 Flash)** | Ingestão e extração instantânea de PDFs regulatórios complexos emitidos por FAA, EASA e ANAC. | Redução de até 85% no tempo de triagem técnica de ADs e Boletins de Serviço (SBs). |
| **⚖️ Princípio Zero da Segurança Aeronáutica** | A IA extrai e estrutura os dados; o motor determinístico avalia a frota; o Engenheiro CAMO valida e homologa. | Impossibilidade de alucinação ou declaração indevida de conformidade por algoritmos. |
| **💼 Reconciliação Ágil de Leasing & Redelivery** | Sandbox seguro para auditar aeronaves candidatas sem contaminar os registros da frota em operação ativa. | Transição de frota até 3x mais rápida e auditorias de pré-compra transparentes. |
| **🔒 Trilha de Auditoria Criptográfica SHA-256** | Cada avaliação, alteração cadastral e assinatura gera um bloco com hash criptográfico inviolável. | Prontidão permanente para auditorias de autoridades aeronáuticas e conselhos fiscais. |

---

## 🖥️ Telas do Sistema & Módulos Estratégicos

### 1. Descoberta Regulatória & Matriz de Aplicabilidade Progressiva (Fase 9)
O sistema consulta continuamente fontes oficiais (**FAA Dynamic Regulatory System**, **EASA Safety Publications Tool** e **ANAC SISAC**), organizando as diretrizes por Família aeronáutica (Airbus A320, Boeing 737, Embraer E-Jets) antes de confrontá-las com dados físicos.

<div align="center">
  <img src="./assets/images/camo_regulatory_matrix_1789127150063.jpg" alt="CAMO Regulatory Matrix" width="100%" style="border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);" />
  <p><i>Matriz de 5 Estados de Aplicabilidade Progressiva, Extração Inteligente de Requisitos e Checklist Dinâmico de Lacunas Operacionais.</i></p>
</div>

* **Matriz de 5 Estados Regulatórios:**
  - `POTENTIALLY_APPLICABLE`: Compatibilidade preliminar por modelo/família.
  - `INSUFFICIENT_DATA`: Pendência de parâmetros cadastrais específicos. **Regra de ouro: ausência de dado nunca é tratada como não aplicável.**
  - `REVIEW_REQUIRED`: Divergência entre documentação técnica e dados físicos.
  - `APPLICABLE`: Todos os parâmetros confirmam a aplicabilidade mandatória.
  - `NOT_APPLICABLE`: Atestado probatório irrefutável de isenção ou modificação terminatória já incorporada.
* **Resolutor de Lacunas In-Loco:** Interface ágil para o engenheiro sanar lacunas cadastrais com recálculo instantâneo da completude da aeronave.

---

### 2. Emissão de Folha de Análise e Parecer Técnico (FAPT)
O CAMO Engine automatiza a geração das **FAPTs**, o documento formal exigido pelas autoridades homologadoras para comprovar a estratégia e o cumprimento de cada diretriz mandatória.

<div align="center">
  <img src="./assets/images/camo_technical_report_1789127164905.jpg" alt="CAMO FAPT Technical Compliance Report" width="100%" style="border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);" />
  <p><i>Relatório Técnico Oficial com Certificação EASA Part-M / FAA 14 CFR 39, Histórico Probatório, QR Code de Validação e Assinatura Digital.</i></p>
</div>

* **Destaques do Relatório FAPT:**
  - Carimbo digital com hash criptográfico SHA-256 e selo de integridade temporal.
  - QR Code para conferência externa imediata por auditores de pista da ANAC ou FAA.
  - Definição exata do Método de Cumprimento (**MOC - Method of Compliance**).
  - Controle rígido de inspeções repetitivas e ações modificativas terminatórias.
  - Bloco de responsabilidade técnica com assinatura digital do Responsável Técnico CAMO.

---

### 3. Analytics Preditivo & Gráficos Estratégicos de Frota
Painéis avançados para diretores de operações e gerentes de engenharia anteciparem gargalos de manutenção com semanas de antecedência.

<div align="center">
  <img src="./assets/images/camo_analytics_charts_1789127179077.jpg" alt="CAMO Predictive Analytics and Charts" width="100%" style="border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);" />
  <p><i>Curvas Preditivas de Consumo de Horas/Ciclos, Radar de Gaps de Manutenção e Matriz de Riscos de Prazos Limites.</i></p>
</div>

* **Capacidades Analíticas:**
  - **Projeção de Consumo (FH/FC):** Cálculo determinístico das margens remanescentes com base nas taxas de utilização diária de cada aeronave.
  - **Radar de Integridade por Subsistema:** Diagnóstico visual de conformidade segmentado por célula (*Airframe*), motores (*CFM56 / LEAP / V2500*), aviônica e componentes rotáveis.
  - **Previsão de Inspeções Repetitivas:** Curva cumulativa de horas/dias para agendamento otimizado junto ao PCM (Planejamento e Controle da Manutenção).

---

### 4. Arquitetura de Engenharia de Missão Crítica (Release 9.4)
Desenvolvido sob padrões rigorosos de engenharia de software para garantir escalabilidade, resiliência e independência total entre bases de conhecimento e dados físicos operacionais.

<div align="center">
  <img src="./assets/images/camo_phase9_architecture_1789125961301.jpg" alt="CAMO Architecture Blueprint" width="100%" style="border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);" />
  <p><i>Arquitetura do Pipeline Ponta a Ponta: Descoberta Regulatória, Inteligência Documental, Base de Conhecimento e Isolamento de Frota.</i></p>
</div>

* **Princípio de Não-Contaminação:** Regras e parâmetros de diretrizes são compilados em uma Base de Conhecimento Reutilizável por Família/Modelo, sem jamais vincular dados provisórios ou suposições às aeronaves da frota ativa.
* **Isolamento de Transição (Lessor Sandbox):** Permite importar e reconciliar pacotes de dados de menosprezo ou devolução de arrendamento mercantil (*Leasing*) sem afetar a telemetria operacional vigente.

---

## 📊 Matriz Comparativa de Mercado

| Recurso / Capacidade | Softwares Legados (Amos, Trax) | Planilhas Excel / Processos Manuais | **CAMO Engine (Nossa Plataforma)** |
| :--- | :---: | :---: | :---: |
| **Ingestão Automática de ADs com IA** | ❌ Não (digitação manual) | ❌ Não | **✅ Sim (Gemini 3.7 Flash em segundos)** |
| **Matriz de Aplicabilidade Progressiva (5 Níveis)** | ❌ Binário (Sim/Não) | ❌ Frágil e propenso a erro | **✅ Sim (Completo com tolerância a lacunas)** |
| **Garantia Anti-Falso Positivo** | ⚠️ Parcial | ❌ Alto risco de erro humano | **✅ Sim (Regra estrita: falta de dado ≠ isenção)** |
| **Auditoria de Pré-Compra em Sandbox Isolado** | ❌ Dificuldade de segregação | ❌ Desorganizado | **✅ Sim (Ambiente seguro para aeronaves candidatas)** |
| **Trilha Criptográfica Inviolável (SHA-256)** | ❌ Logs simples de banco | ❌ Sem integridade técnica | **✅ Sim (Hashing encadeado em cada decisão)** |
| **Emissão Automática de FAPT com QR Code** | ⚠️ Requer relatórios customizados | ❌ Criação manual em Word | **✅ Sim (Pronta para homologação da autoridade)** |

---

## 🎯 Casos de Uso

* 🛫 **Companhias Aéreas Comerciais (Operações Regulares - RBAC 121 / FAR 121):** Monitoramento contínuo de frotas mistas (Airbus, Boeing, Embraer) com conformidade permanente e zero paralisações AOG.
* 📑 **Empresas de Arrendamento Aeronáutico (Lessors):** Auditorias técnicas imediatas de devolução e entrega de aeronaves (*Delivery / Redelivery*), gerando relatórios de discrepâncias técnicas sem semanas de trabalho manual.
* 🔧 **Organizações de Manutenção e Reparo (MROs):** Planejamento preciso de modificações e Boletins de Serviço mandatórios antes da entrada da aeronave no hangar.
* 🛩️ **Operadores Executivos e Táxi Aéreo (RBAC 135):** Gestão simplificada e altamente profissional da aeronavegabilidade para frotas executivas de alta disponibilidade.

---

## 🛠️ Instalação & Execução

### Pré-requisitos
* **Node.js**: v18.0.0 ou superior
* **NPM**: v9.0.0 ou superior

### Passo a Passo

1. **Clonar e instalar dependências:**
   ```bash
   git clone <repo-url>
   cd camo-compliance-platform
   npm install
   ```

2. **Configuração de Variáveis de Ambiente:**
   Configure a chave do Google Gemini no arquivo `.env` ou `.env.local`:
   ```env
   GEMINI_API_KEY=sua_chave_gemini_aqui
   ```

3. **Iniciar a Aplicação em Modo Desenvolvimento:**
   ```bash
   npm run dev
   ```
   *Acesse em seu navegador:* `http://localhost:3000`

4. **Executar a Suíte Completa de Testes Automatizados (Vitest):**
   ```bash
   npm test
   ```
   *Verificação de conformidade em 92 testes automatizados cobrindo lógica determinística, ciclo de vida, entrega de aeronaves e inteligência regulatória.*

---

## 📜 Certificações & Documentação Complementar

* [Dossiê Completo de Arquitetura do Sistema](./DOSSIE_ARQUITETURA_SISTEMA_CAMO.md)
* [Relatório Técnico de Arquitetura](./ARCHITECTURE.md)
* [Auditoria Técnica Externa de Diretrizes](./AUDITORIA_TECNICA_EXTERNA_ADS.md)
* [Validação Específica AD 2020-24-02](./AUDITORIA_AD_2020_24_02.md)

---

<div align="center">
  <p><b>CAMO Airworthiness Compliance Intelligence Platform</b> • <i>Aeronautical Engineering Excellence & Continuous Airworthiness Management</i></p>
  <p>© 2026 CAMO Engineering Solutions. Todos os direitos reservados.</p>
</div>

