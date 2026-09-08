/**
 * CAMO Engine — Phase 8: Central de Ajuda, Manual de Utilização & Base de Conhecimento Operacional
 * Versão da Documentação: 8.0.0 (Setembro de 2026)
 * Alinhado estritamente com as Regulamentações:
 * - FAA 14 CFR Part 39 (Airworthiness Directives)
 * - EASA Part-M (M.A.708 / CAMO.A.315 Continuing Airworthiness Tasks)
 * - ANAC RBAC 39 & RBAC 121
 */

export interface HelpArticle {
  id: string;
  category: 'FOUNDATION' | 'FLEET' | 'REGULATORY' | 'COMPLIANCE' | 'EVIDENCE' | 'AIRWORTHINESS' | 'DELIVERY' | 'OPERATIONS';
  title: string;
  subtitle: string;
  summary: string;
  keyTakeaways: string[];
  operationalRule: string;
  detailedContent: string;
  whenToUseHumanReview: string[];
  consequences: string;
  relatedGlossaryTerms: string[];
  relatedModuleView: string;
  lastUpdated: string;
  version: string;
}

export interface GlossaryTerm {
  term: string;
  acronym?: string;
  category: 'REGULATORY' | 'ENGINEERING' | 'MAINTENANCE' | 'COMPLIANCE' | 'OPERATIONAL' | 'DELIVERY';
  definition: string;
  operationalRole: string;
  authorityReference: string;
  warningNote?: string;
}

export interface GuidedWorkflowStep {
  stepNumber: number;
  stageId: string;
  title: string;
  module: string;
  viewId: string;
  summary: string;
  whereAmI: string;
  whatItDoes: string;
  whatToProvide: string;
  whatSystemDetermines: string;
  whatRequiresHumanReview: string;
  nextStep: string;
  relatedArticleIds: string[];
}

export interface DocumentationMetadata {
  version: string;
  releaseDate: string;
  status: 'HOMOLOGATED' | 'OFFICIAL' | 'DRAFT' | 'SUPERSEDED';
  author: string;
  authorityCompliance: string[];
  revisionHistory: {
    version: string;
    date: string;
    summary: string;
    author: string;
  }[];
}

export const DOCUMENTATION_METADATA: DocumentationMetadata = {
  version: '8.0.0',
  releaseDate: '2026-09-06',
  status: 'HOMOLOGATED',
  author: 'Engenharia CAMO & Diretoria Técnica de Aeronavegabilidade',
  authorityCompliance: [
    'FAA 14 CFR Part 39 (Airworthiness Directives)',
    'EASA Part-M / Part-CAMO (Continuing Airworthiness Management)',
    'ANAC RBAC 39 (Diretrizes de Aeronavegabilidade)',
    'ANAC RBAC 121 Subparte L (Manutenção e Aeronavegabilidade Continuada)'
  ],
  revisionHistory: [
    {
      version: '8.0.0',
      date: '2026-09-06',
      summary: 'Fase 8: Lançamento oficial da Central de Ajuda, Manual de Operação e Guided CAMO Workflow integrado.',
      author: 'Equipe CAMO Intelligence'
    },
    {
      version: '7.1.0',
      date: '2026-09-05',
      summary: 'Fase 7: Módulo de Aircraft Acquisition & Delivery Assessment com reconciliação de documentação de lessor e selo SHA-256.',
      author: 'Equipe CAMO Intelligence'
    },
    {
      version: '7.0.0',
      date: '2026-09-04',
      summary: 'Fase 7: Versão inicial de auditoria de entrega e reconciliação pré-aquisição.',
      author: 'Equipe CAMO Intelligence'
    },
    {
      version: '6.4.1',
      date: '2026-09-03',
      summary: 'Fase 6.4.1: Desacoplamento formal entre Status de Compliance Regulatório e Determinação Operacional de Aeronavegabilidade.',
      author: 'Equipe CAMO Intelligence'
    },
    {
      version: '6.3.0',
      date: '2026-09-02',
      summary: 'Fase 6.3: Motor de Verificação Probatória de Evidências em 4 Dimensões.',
      author: 'Equipe CAMO Intelligence'
    },
    {
      version: '6.2.0',
      date: '2026-08-30',
      summary: 'Fase 6.2: Motor Determinístico de Prazos (Due Date & Threshold Engine) com aritmética de calendário e safe-leap.',
      author: 'Equipe CAMO Intelligence'
    },
    {
      version: '6.1.0',
      date: '2026-08-25',
      summary: 'Fase 6.1: Motor de Conexão com Fontes Regulatórias Oficiais e Cofre de Aquisição Criptográfico.',
      author: 'Equipe CAMO Intelligence'
    },
    {
      version: '5.3.1',
      date: '2026-08-20',
      summary: 'Fase 5.3.1: CAMO Rule Engine V2 Determinístico com Gestão de Knowledge Facts e Perguntas de Dados Ausentes.',
      author: 'Equipe CAMO Intelligence'
    }
  ]
};

export const HELP_ARTICLES: HelpArticle[] = [
  // 4.1 Introdução
  {
    id: 'intro-camo-engine',
    category: 'FOUNDATION',
    title: 'Introdução ao CAMO Engine & Princípio de Tripartição',
    subtitle: 'Missão do sistema, fluxo regulatório e separação entre automação e decisão humana autorizada',
    summary: 'O CAMO Engine é uma plataforma de inteligência de conformidade regulatória para aeronavegabilidade continuada, projetada para eliminar o risco de erro humano e garantir total rastreabilidade.',
    keyTakeaways: [
      'A IA nunca declara conformidade de forma autônoma — apenas extrai e estrutura dados técnicos.',
      'O Motor de Regras é 100% determinístico e segue o princípio da precedência estrita.',
      'Na dúvida ou ausência de dados, o sistema emite REVIEW_REQUIRED — jamais presume não-aplicabilidade.',
      'A responsabilidade regulatória final é intransferível do Engenheiro CAMO certificado.'
    ],
    operationalRule: 'O sistema auxilia o cálculo e o rastreio; a autoridade técnica operacional permanece com o corpo técnico credenciado perante a autoridade de aviação civil (FAA, EASA, ANAC).',
    detailedContent: `
### Visão Geral do Sistema
O CAMO Engine atua como a espinha dorsal de controle de aeronavegabilidade da frota. Ele integra:
1. **Conectores Regulatórios Oficiais:** Conexão direta com APIs do Federal Register (GPO) e repositórios oficiais.
2. **Cofre Criptográfico de Aquisição:** Download de PDFs originais, validação de integridade por hash SHA-256 e proteção anti-SSRF.
3. **Document Intelligence (IA Especializada):** Extração de cabeçalhos, datas efetivas, applicability e mandated actions.
4. **CAMO Rule Engine V2 (Determinístico):** Avaliação lógica booleana cruzando inventário e requisitos.
5. **Due Date & Threshold Engine:** Projeção temporal exata de prazos em dias de calendário, Horas de Voo (FH) e Ciclos (FC).
6. **Evidence Verification Engine:** Validação de certificados de liberação (CRS, EASA Form 1, FAA 8130-3).
7. **Fleet Airworthiness Control Engine:** Decoupling rigoroso entre conformidade regulatória e liberação de voo.

### O Princípio Zero da Segurança Aeronáutica
A plataforma adota o princípio de tripartição:
* **IA:** Tradução de texto não estruturado para esquemas de dados tipados.
* **Algoritmo Determinístico:** Lógica booleana estrita e cálculos matemáticos.
* **Humano:** Decisão técnica em situações ambíguas, aprovação de AMOC e liberação de aeronaves.
    `,
    whenToUseHumanReview: [
      'Sempre que houver divergência entre o texto do documento e os dados extraídos.',
      'Quando houver falta de número de série ou part number no inventário da frota.',
      'Para avaliar a validade jurídica de Métodos Alternativos de Cumprimento (AMOC).'
    ],
    consequences: 'Interpretar equivocadamente uma regra automatizada pode levar à operação de aeronave em desacordo com diretrizes compulsórias, acarretando interdição ou perda de aeronavegabilidade.',
    relatedGlossaryTerms: ['AD', 'AMOC', 'Human Review', 'Auditability', 'Traceability'],
    relatedModuleView: 'dashboard',
    lastUpdated: '2026-09-06',
    version: '8.0.0'
  },

  // Tríade Regulatória
  {
    id: 'art-triad-req-obl-evid',
    category: 'FOUNDATION',
    title: 'A Tríade Regulatória: Requirement vs Obligation vs Evidence',
    subtitle: 'A distinção conceitual e prática fundamental entre Regra Universal, Dever Concreto e Prova Material',
    summary: 'A integridade do CAMO Engine repousa sobre a separação estrita da Tríade Regulatória: Requirement é a regra jurídica universal extraída da AD; Obligation é a instância vinculante atrelada a uma aeronave física real; Evidence é o documento probatório que atesta a execução material da tarefa.',
    keyTakeaways: [
      'Requirement: Regra abstrata, atemporal e reutilizável por múltiplas aeronaves do mesmo tipo.',
      'Obligation: Vínculo individual e intransferível atrelado a um MSN, com prazos e status próprios.',
      'Evidence: Documento probatório formal (CRS, caderneta, Form 1) que valida o cumprimento físico.',
      'Obrigações e Evidências NUNCA podem ser copiadas entre aeronaves da frota.'
    ],
    operationalRule: 'É terminantemente proibido alterar o Requirement para acomodar uma divergência ou falha física de uma aeronave; inconformidades devem ser resolvidas com documentação técnica idônea, AMOC homologado ou encaminhamento para Human Review.',
    detailedContent: `
### Os Três Pilares da Conformidade CAMO
Compreender a diferença entre **Requirement**, **Obligation** e **Evidence** é a regra de ouro para qualquer engenheiro de aeronavegabilidade continuada:

1. **Requirement (A Regra Abstrata):**
   * Extraído de uma Diretriz de Aeronavegabilidade (AD) ou regulamento da autoridade (FAA, EASA, ANAC).
   * Define *o que* deve ser feito, *quais modelos* são afetados, *quais limites* se aplicam e *quais Service Bulletins* são mandatórios.
   * É global e compartilhado: serve como molde para avaliar todas as aeronaves daquele modelo na frota.

2. **Obligation (O Dever Concreto por Aeronave):**
   * Criada quando o Rule Engine determina que o Requirement é aplicável ao MSN, motor ou componente instalado em uma aeronave real.
   * Possui seu próprio ciclo de vida (OPEN, DUE_SOON, OVERDUE, COMPLIED) e seus próprios contadores de tempo (Due Date, FH restantes, FC restantes).
   * É intransferível: mesmo que duas aeronaves tenham o mesmo modelo (ex: B737-800), cada uma possui seu horômetro e seu histórico próprio.

3. **Evidence (A Prova Material):**
   * Registro documental emitido por organização de manutenção autorizada (Part-145) comprovando a execução do serviço.
   * Exemplos: Certificado de Liberação de Serviço (CRS), EASA Form 1, FAA Form 8130-3 ou lançamento assinado em caderneta de bordo.
   * Deve ser validada pelo Evidence Verification Engine em 4 dimensões (entidade, tempo, escopo e integridade).
    `,
    whenToUseHumanReview: [
      'Quando houver dúvida se uma ordem de serviço atende a todos os critérios descritos no Requirement.',
      'Ao aplicar créditos de cumprimento anterior (Unless Already Accomplished) em uma Obligation em aberto.'
    ],
    consequences: 'Confundir Requirement com Obligation induz à cópia espúria de cumprimento entre aeronaves, uma infração regulatória grave passível de cassação de licença e interdição de voo.',
    relatedGlossaryTerms: ['Requirement', 'Obligation', 'Evidence', 'CRS', 'Human Review'],
    relatedModuleView: 'dashboard',
    lastUpdated: '2026-09-06',
    version: '8.0.0'
  },

  // 4.2 Aircraft / Fleet
  {
    id: 'fleet-aircraft-configuration',
    category: 'FLEET',
    title: 'Inventário da Frota, Aeronave & Configuração Técnica',
    subtitle: 'Por que a integridade dos dados de MSN, Motores e Componentes é crítica para a Aplicabilidade',
    summary: 'A avaliação de conformidade depende diretamente da exatidão dos dados cadastrais da aeronave, incluindo número de série do fabricante (MSN), matrícula, modelos de motores e part numbers de componentes.',
    keyTakeaways: [
      'Mesmo modelo de aeronave (ex: Boeing 737-800) não significa mesma aplicabilidade de AD.',
      'Uma AD pode ser aplicável apenas a uma faixa restrita de MSN ou a um P/N específico de atuador.',
      'Horas de Voo (FH) e Ciclos de Voo (FC) devem ser atualizados continuamente para precisão de vencimentos.',
      'Modificações incorporadas via STC (Supplemental Type Certificate) alteram a aplicabilidade de ADs.'
    ],
    operationalRule: 'Qualquer alteração física na aeronave (troca de motor, substituição de componente rotável ou incorporação de SB) deve ser imediatamente refletida no inventário para reavaliação automática do Rule Engine.',
    detailedContent: `
### Estrutura de Entidades
No CAMO Engine, a entidade central é a **Aeronave Física (Aircraft)** vinculada a um Operador aéreo.
* **Registration (Matrícula):** Identificador civil nacional (ex: PR-CAM, N737AA).
* **MSN (Manufacturer Serial Number):** Identificador permanente e imutável atribuído pelo fabricante (ex: Boeing MSN 38124).
* **Model & Family:** Modelo canônico da aeronave (ex: B737-800 pertencente à família B737 NG).
* **Engines (Motores Instalados):** Posição (Pos 1, Pos 2), modelo (ex: CFM56-7B26), número de série (ESN) e tempo acumulado (FH/FC).
* **Components / Rotables:** Peças críticas monitoradas por Part Number (P/N) e Serial Number (S/N), como atuadores de bordo de fuga ou atuadores de flap.
* **Accumulated Counters (FH / FC / Landings):** Horas e ciclos totais da célula e de cada motor.

### Por que a configuração correta é vital para a Applicabilidade?
A maioria das Diretrizes de Aeronavegabilidade possui parágrafos de aplicabilidade altamente específicos, por exemplo:
*"This AD applies to Boeing Model 737-800 airplanes, line numbers 1000 through 2500, equipped with CFM56-7B engines, that have incorporated Boeing Service Bulletin 737-57A1234."*
Se o sistema não possuir o registro exato do MSN ou do histórico de modificações, ele não pode declarar segurança. Nesses casos, o motor gera **REVIEW_REQUIRED** para evitar falso-positivo ou falso-negativo.
    `,
    whenToUseHumanReview: [
      'Quando uma aeronave receber uma peça rotável (P/N) sem histórico de revisão conhecido.',
      'Quando houver troca de motores de modelos diferentes (ex: CFM56-7B24 para CFM56-7B26).',
      'Quando uma modificação por STC de terceiros tiver sido instalada na aeronave.'
    ],
    consequences: 'Dados desatualizados de FH ou FC levam ao cálculo errôneo da Due Date, podendo fazer com que a aeronave voe além do limite regulatório mandatório (OVERDUE).',
    relatedGlossaryTerms: ['MSN', 'FH', 'FC', 'Applicability', 'Configuration'],
    relatedModuleView: 'fleet',
    lastUpdated: '2026-09-06',
    version: '8.0.0'
  },

  // 5. Regulatory Discovery
  {
    id: 'regulatory-discovery',
    category: 'REGULATORY',
    title: 'Regulatory Discovery: Monitoramento e Triagem de ADs',
    subtitle: 'Como o sistema detecta novas regras e a distinção fundamental: Discovery ≠ Applicability ≠ Compliance',
    summary: 'O Regulatory Discovery varre fontes oficiais governamentais para identificar diretrizes de aeronavegabilidade publicadas recentemente. A descoberta é apenas o primeiro passo de triagem.',
    keyTakeaways: [
      'Discovery significa apenas: "Esta regra foi publicada pela autoridade e menciona um modelo de aeronave de nosso interesse".',
      'Discovery NÃO significa que a AD é aplicável a uma aeronave específica de nossa frota.',
      'Discovery NÃO significa conformidade ou liberação.',
      'Metadados de cabeçalho podem ser incompletos, exigindo análise textual aprofundada via IA ou revisão humana.'
    ],
    operationalRule: 'Todo registro descoberto que passe pelo Scoping Filter deve ser submetido à extração documental completa antes de qualquer conclusão de aplicabilidade.',
    detailedContent: `
### Princípio Fundamental: Discovery ≠ Applicability ≠ Compliance
É mandatório para qualquer engenheiro CAMO compreender esta hierarquia de três estágios:
1. **Regulatory Discovery (Descoberta):** O conector encontrou a publicação oficial (ex: Federal Register 14 CFR Part 39, DOC # 2026-14520) associada a palavras-chave ou modelos do operador.
2. **Applicability (Aplicabilidade):** O motor cruza os critérios da AD (MSN, P/N, STC, configuração) com a aeronave real. Apenas uma parcela das ADs descobertas será declarada APPLICABLE.
3. **Compliance (Cumprimento):** Mesmo que aplicável, a obrigação só será considerada cumprida (COMPLIED) após inspeção física realizada e apresentação de Evidência documental válida com Certificado de Liberação Autorizada.

### Origem das Informações
* **Federal Register API (FAA):** Publicações em tempo real do Diário Oficial Norte-Americano.
* **GPO GovInfo:** Repositório oficial para aquisição de arquivos PDF originais carimbados.
* **EASA Safety Publications Tool:** Diretrizes de segurança europeias (PAD / EAD).
* **ANAC SISAC:** Diretrizes emitidas pela autoridade brasileira.
    `,
    whenToUseHumanReview: [
      'Quando o conector identificar uma AD de emergência (EAD) com cumprimento imediato (ex: before further flight).',
      'Quando a AD estiver escrita em linguagem com ressalvas complexas que os metadados do conector não estruturaram.',
      'Quando a autoridade publicar uma AD com correção (Correction / Republished).'
    ],
    consequences: 'Ignorar a etapa de discovery pode levar ao desconhecimento de uma diretriz mandatória de segurança emitida pela autoridade.',
    relatedGlossaryTerms: ['AD', 'Discovery', 'Scoping Filter', 'Federal Register'],
    relatedModuleView: 'regulatory',
    lastUpdated: '2026-09-06',
    version: '8.0.0'
  },

  // 6. Airworthiness Directive — AD
  {
    id: 'airworthiness-directive-concept',
    category: 'REGULATORY',
    title: 'Diretrizes de Aeronavegabilidade (AD): Conceito e Estrutura',
    subtitle: 'O que é uma AD, autoridades emissoras, componentes de uma regra e valor como conhecimento reutilizável',
    summary: 'Uma Diretriz de Aeronavegabilidade (AD) é um regulamento compulsório emitido pelo Estado de Projeto ou de Matrícula para corrigir uma condição insegura em um produto aeronáutico.',
    keyTakeaways: [
      'O cumprimento de uma AD é mandatório por lei (ex: 14 CFR § 39.7). Operar em não-conformidade é ilegal.',
      'Uma AD é um ativo de conhecimento reutilizável: suas regras aplicam-se a diversas aeronaves ao longo do tempo.',
      'A conformidade, no entanto, é individual por número de série e histórico físico de cada aeronave.',
      'Uma AD pode conter ações repetitivas, ações iniciais e ações terminativas (terminating actions).'
    ],
    operationalRule: 'Nenhuma aeronave pode voar sem que todas as ADs aplicáveis estejam estritamente cumpridas dentro dos prazos limites regulamentares.',
    detailedContent: `
### Elementos Constitutivos de uma AD
Cada AD processada pelo CAMO Engine é decomposta em:
* **Issuing Authority:** FAA, EASA, ANAC, Transport Canada, etc.
* **AD Number:** Identificador oficial (ex: FAA AD 2020-24-02).
* **Effective Date:** Data em que a diretriz passa a vigorar juridicamente. Nenhuma obrigação pode ser exigida antes da data efetiva, exceto se a AD estipular ações prévias.
* **Applicability Statement:** Parágrafo que define as aeronaves, motores, hélices ou peças afetadas.
* **Mandated Actions:** Ações obrigatórias especificadas em parágrafos (ex: (g), (h), (i)), detalhando inspeções, testes funcionais, modificações ou substituições de peças.
* **Compliance Times:** Thresholds iniciais e intervalos repetitivos expressos em dias, meses, FH ou FC.
* **Service Bulletins (SBs):** Documentos do fabricante referenciados pela AD contendo o passo-a-passo do cumprimento.
* **Supersedence:** Indicação de se esta AD cancela e substitui diretrizes anteriores (ex: supersedes AD 2018-12-05).
    `,
    whenToUseHumanReview: [
      'Quando o texto da AD referenciar um Service Bulletin não disponível na biblioteca interna do operador.',
      'Quando a AD contiver parágrafos de exceção ou concessão com texto livre condicional.',
      'Quando houver dúvida sobre qual parágrafo de ação mandatória se aplica à configuração específica da aeronave.'
    ],
    consequences: 'Deixar de cumprir uma AD acarreta a perda automática do Certificado de Aeronavegabilidade (CofA) da aeronave.',
    relatedGlossaryTerms: ['AD', 'Effective Date', 'Service Bulletin', 'Terminating Action', 'Supersedence'],
    relatedModuleView: 'ads',
    lastUpdated: '2026-09-06',
    version: '8.0.0'
  },

  // 7. Requirement
  {
    id: 'regulatory-requirement-concept',
    category: 'COMPLIANCE',
    title: 'Regulatory Requirement: A Regra Abstrata Reutilizável',
    subtitle: 'Compreendendo o conceito de Requisito Regulatório e sua relação com a AD e com as Obrigações',
    summary: 'Um Regulatory Requirement é a representação computacional e estruturada de uma regra técnica extraída de uma AD. Ele é abstrato e existe independentemente de haver aeronaves na frota.',
    keyTakeaways: [
      'Regulatory Requirement = regra regulatória pura (abstrata).',
      'Ele contém os critérios de aplicabilidade, limites de cumprimento e ações mandatórias em formato tipado.',
      'Pode ser reutilizado centenas de vezes para avaliar qualquer aeronave do mesmo tipo.',
      'Ele não possui estado de cumprimento em si; quem possui estado é a obrigação associada à aeronave.'
    ],
    operationalRule: 'Nunca altere a definição de um Regulatory Requirement para contornar uma falha de conformidade de uma aeronave específica; caso haja variação autorizada, utilize um AMOC ou Human Override.',
    detailedContent: `
### Anatomia de um Regulatory Requirement
No modelo de dados do CAMO Engine, o \`ComplianceRequirement\` contém:
* **sourceNumber:** Número oficial da diretriz.
* **title / subject:** Título descritivo do defeito ou inspeção.
* **applicabilityRule:** Estrutura contendo modelos canônicos, faixas de MSN, part numbers e regras lógicas (AND/OR).
* **mandatedActions:** Lista de ações atômicas numeradas, com parágrafo de referência e limites.
* **supersededBy / supersedes:** Cadeia de sucessão regulatória.
* **isTerminatingActionAvailable:** Flag booleana indicando se existe modificação definitiva que extingue inspeções repetitivas.
    `,
    whenToUseHumanReview: [
      'Quando a IA extrair um threshold com formato não reconhecido pelo parser matemático.',
      'Quando a AD sofrer emenda ou revisão pela autoridade.'
    ],
    consequences: 'Um requisito mal estruturado replica erros de avaliação para todas as aeronaves da frota avaliadas por ele.',
    relatedGlossaryTerms: ['Requirement', 'Obligation', 'Threshold', 'Mandated Action'],
    relatedModuleView: 'ads',
    lastUpdated: '2026-09-06',
    version: '8.0.0'
  },

  // 8. Compliance Obligation
  {
    id: 'compliance-obligation-concept',
    category: 'COMPLIANCE',
    title: 'Compliance Obligation: A Instância Vinculante por Aeronave',
    subtitle: 'Diferença entre Requirement e Obligation e por que obrigações jamais devem ser copiadas entre aeronaves',
    summary: 'Uma Compliance Obligation é a instância viva e vinculante de um Requirement aplicada a uma aeronave física real. Ela rastreia prazos, evidências e conformidade individualizada.',
    keyTakeaways: [
      'Requirement é abstrato e universal; Obligation é concreta e individual.',
      'Uma obrigação pertence exclusivamente a uma aeronave e a um componente/motor.',
      'A obrigação de uma aeronave JAMAIS pode ser copiada para outra, mesmo que tenham o mesmo modelo e matrícula semelhante.',
      'Cada aeronave possui seu próprio horômetro (FH/FC), suas próprias ordens de serviço e seus próprios certificados CRS.'
    ],
    operationalRule: 'Toda nova aeronave adicionada à frota deve ter suas obrigações geradas a partir da avaliação de aplicabilidade limpa, nunca por cópia de outra aeronave.',
    detailedContent: `
### A Regra de Ouro do CAMO Engine: Reutilização de Conhecimento ≠ Cópia de Obrigações
* O **conhecimento regulatório** (a interpretação da AD, os intervalos calculados, as peculiaridades de engenharia) é global e reutilizável.
* A **obrigação de cumprimento** (se a tarefa foi executada no hangar, quem foi o mecânico responsável, qual o número do formulário CRS) é estritamente individual.

### Ciclo de Vida de uma Obrigação
1. **OPEN:** Obrigação aplicável pendente de execução ou registro de evidência.
2. **DUE_SOON:** Entrou na janela de alerta operacional (ex: faltam menos de 30 dias ou 100 FH).
3. **OVERDUE:** Ultrapassou o limite mandatório sem evidência verificada.
4. **COMPLIED:** Evidência válida foi anexada e verificada pelo motor probatório.
5. **NEXT_CYCLE_OPEN:** Em tarefas repetitivas, quando o ciclo atual é cumprido, o sistema abre automaticamente a próxima ocorrência.
    `,
    whenToUseHumanReview: [
      'Quando uma obrigação for gerada para uma aeronave com configuração mista de componentes.',
      'Quando houver solicitação de encerramento de obrigação repetitiva por alegação de ação terminativa.'
    ],
    consequences: 'Copiar status de conformidade entre aeronaves é infração aeronáutica grave sujeita a sanções criminais e perda de homologação CAMO.',
    relatedGlossaryTerms: ['Obligation', 'Requirement', 'COMPLIED', 'OVERDUE', 'DUE_SOON'],
    relatedModuleView: 'obligations',
    lastUpdated: '2026-09-06',
    version: '8.0.0'
  },

  // 9. Applicability
  {
    id: 'art-applicability-rules',
    category: 'COMPLIANCE',
    title: 'Applicability: Motor de Regras, Critérios e Resolução',
    subtitle: 'Como o Rule Engine avalia modelos, números de série e modificações sem inventar dados',
    summary: 'A avaliação de aplicabilidade determina se uma AD afeta juridicamente uma aeronave. O motor utiliza lógica booleana estrita e o princípio de Zero-Fabrication.',
    keyTakeaways: [
      '"Mesmo modelo" não significa automaticamente "mesma aplicabilidade".',
      'Critérios comuns incluem faixas de MSN, modelos de motores instalados e part numbers de componentes.',
      'Ausência de metadados no inventário gera obrigatoriamente REVIEW_REQUIRED, jamais NOT_APPLICABLE.',
      'Modificações por STC podem introduzir ou afastar a aplicabilidade de uma diretriz.'
    ],
    operationalRule: 'Nunca assuma que uma AD não se aplica apenas porque o modelo geral parece diferente; confirme sempre se não afeta motores, hélices ou componentes instalados.',
    detailedContent: `
### Dimensões de Avaliação da Aplicabilidade
O CAMO Rule Engine V2 decompõe a aplicabilidade em 4 eixos principais:
1. **Model & Family Compatibility:** Verifica se o modelo canônico da aeronave (ex: B737_800) pertence à lista de modelos afetados.
2. **Serial Number (MSN) Boundary:** Avalia se o MSN da aeronave está dentro de faixas inclusivas (ex: MSN 30000 a 35000) ou listas explícitas de exclusão.
3. **Equipment & Powerplant:** Verifica se a AD afeta o motor (ex: CFM56-7B) ou APU instalado no momento.
4. **Component & Part Number:** Avalia se componentes rotáveis críticos com P/N específico estão instalados nas posições especificadas.

### O Princípio de Precedência Estrita
Se um componente exigir inspeção mas o inventário não listar o número de série da peça instalada naquela posição, o sistema **NÃO pode declarar NOT_APPLICABLE**. O resultado mandatório é **REVIEW_REQUIRED (Dados Insuficientes)**.
    `,
    whenToUseHumanReview: [
      'Quando o status resultar em REVIEW_REQUIRED devido à falta de P/N ou S/N do componente no inventário.',
      'Quando a AD listar números de linha (Line Numbers) e o inventário contiver apenas MSN.',
      'Quando a aplicabilidade depender de uma inspeção visual prévia descrita no Service Bulletin.'
    ],
    consequences: 'Declarar erroneamente NOT_APPLICABLE faz com que uma diretriz mandatória de segurança seja omitida do plano de manutenção da aeronave.',
    relatedGlossaryTerms: ['Applicability', 'REVIEW_REQUIRED', 'NOT_APPLICABLE', 'APPLICABLE', 'MSN'],
    relatedModuleView: 'ads',
    lastUpdated: '2026-09-06',
    version: '8.0.0'
  },

  // 10. Due Date & Threshold
  {
    id: 'due-date-threshold-engine',
    category: 'COMPLIANCE',
    title: 'Due Date & Threshold: Limites Regulatórios vs Janelas de Alerta',
    subtitle: 'Aritmética de calendário, composição de limites (FH/FC/Dias) e a regra: Regulatory Limit ≠ Operational Alert',
    summary: 'O motor de prazos calcula a data e o horômetro exatos em que cada ação mandatória deve ser cumprida, prevenindo ultrapassagens de limites de voo.',
    keyTakeaways: [
      'Regulatory Limit ≠ Operational Alert Window.',
      'DUE_SOON é um alerta operacional preventivo da empresa para planejamento de hangar; NÃO é vencimento regulatório.',
      'OVERDUE ocorre única e exclusivamente quando o limite legal imposto pela AD foi ultrapassado sem cumprimento comprovado.',
      'WHICHEVER_OCCURS_FIRST adota o prazo mais restritivo entre calendário, horas e ciclos de voo.'
    ],
    operationalRule: 'Uma aeronave em status DUE_SOON está legalmente autorizada a voar, mas deve ter manutenção programada antes que o contador atinja o valor limite.',
    detailedContent: `
### Tipos de Limites Suportados pelo Motor
* **Calendar Threshold:** Dias, meses ou anos a partir da data efetiva ou da data do último cumprimento (ex: "Within 6 months after the effective date").
* **Flight Hours (FH):** Horas de voo acumuladas na célula ou no motor (ex: "Within 500 flight hours").
* **Flight Cycles (FC):** Ciclos de pressurização/decolagens e pousos (ex: "Within 300 flight cycles").
* **Fixed Date:** Data fixa de corte imposta pela autoridade (ex: "No later than December 31, 2026").
* **Composição Lógica:**
  - \`WHICHEVER_OCCURS_FIRST\`: O sistema calcula a data calendário equivalente para as horas e ciclos projetados e escolhe o limite que vencer primeiro.
  - \`WHICHEVER_OCCURS_LATER\`: Utilizado em casos específicos de concessão regulatória.

### Aritmética de Calendário Segura (Leap-Year Safe)
O motor trata com precisão anos bissextos (29 de fevereiro) e regras de final de mês (ex: 31 de agosto + 1 mês = 30 de setembro), evitando deslocamentos indevidos de dias.
    `,
    whenToUseHumanReview: [
      'Quando o operador possuir uma projeção de utilização de frota atípica (ex: aumento repentino de horas voadas por dia).',
      'Quando a AD utilizar termos de limite compostos com cláusulas condicionais atípicas (ex: "at the next C-check or within 24 months").'
    ],
    consequences: 'Confundir DUE_SOON com OVERDUE causa cancelamentos de voos desnecessários; confundir OVERDUE com DUE_SOON resulta em voo ilegal não-aeronavegável.',
    relatedGlossaryTerms: ['Due Date', 'Threshold', 'DUE_SOON', 'OVERDUE', 'WHICHEVER_OCCURS_FIRST'],
    relatedModuleView: 'obligations',
    lastUpdated: '2026-09-06',
    version: '8.0.0'
  },

  // 11. Evidence
  {
    id: 'evidence-management',
    category: 'EVIDENCE',
    title: 'Gestão de Evidências: Documento Anexado ≠ Obrigação Cumprida',
    subtitle: 'Princípio probatório: Evidence Attached ≠ Evidence Valid ≠ Obligation Complied',
    summary: 'A existência de um documento no repositório não confere conformidade imediata. O documento deve passar por validação de integridade, autoria e aderência aos requisitos.',
    keyTakeaways: [
      'Evidence Attached ≠ Evidence Valid ≠ Obligation Complied.',
      'Anexar um PDF de ordem de serviço não altera o status para COMPLIED até que a verificação probatória seja aprovada.',
      'Evidências aceitáveis incluem CRS (Certificate of Release to Service), EASA Form 1, FAA Form 8130-3 e extratos autenticados de caderneta.',
      'Toda evidência deve possuir rastreabilidade de data, horas, ciclos e identificação do engenheiro ou técnico certificador.'
    ],
    operationalRule: 'Nunca aprove uma evidência que não mencione expressamente o número da AD ou o parágrafo mandatório do Service Bulletin cumprido.',
    detailedContent: `
### O Tripé Probatório
Para que uma obrigação seja declarada cumprida, o sistema exige:
1. **Evidência Anexada (Attached):** O arquivo PDF ou registro digital foi associado à obrigação.
2. **Evidência Verificada (Valid):** O motor de verificação probatória validou que a peça, a data e o técnico atendem aos requisitos da diretriz.
3. **Obrigação Cumprida (Complied):** O status da obrigação é atualizado com registro em trilha de auditoria e cálculo do próximo vencimento caso seja tarefa repetitiva.

### Tipos de Evidências Suportados
* **CRS (Certificate of Release to Service):** Liberação de manutenção de aeronave após serviço de hangar ou linha.
* **EASA Form 1 / FAA 8130-3:** Certificado de liberação autorizada de componente novo ou revisado em oficina homologada (Part-145).
* **Aircraft Logbook Entry:** Registro em caderneta de voo assinado por mecânico qualificado para tarefas simples.
* **Engineering Order (EO) Compliance Sheet:** Registro de engenharia do operador atestando cumprimento de modificação.
    `,
    whenToUseHumanReview: [
      'Quando o documento anexado estiver com assinatura ilegível ou sem carimbo de licença técnica.',
      'Quando houver divergência entre o número de série da peça instalada e o número listado na nota de liberação.',
      'Quando o texto do documento fizer ressalvas de limitações operacionais.'
    ],
    consequences: 'Considerar uma obrigação cumprida com evidência inválida mascara não-conformidades críticas e expõe o operador a multas e acidentes.',
    relatedGlossaryTerms: ['Evidence', 'CRS', 'EASA Form 1', 'FAA 8130-3', 'Document Integrity'],
    relatedModuleView: 'obligations',
    lastUpdated: '2026-09-06',
    version: '8.0.0'
  },

  // 12. Evidence Verification
  {
    id: 'evidence-verification-engine',
    category: 'EVIDENCE',
    title: 'Evidence Verification Engine: Validação Probatória em 4 Dimensões',
    subtitle: 'Validação de Entidade, Temporal, de Evento e de Integridade. Diferença entre INVALID, INSUFFICIENT e REVIEW_REQUIRED',
    summary: 'O motor de verificação probatória analisa a evidência sob quatro prismas rigorosos antes de permitir a alteração do status da obrigação.',
    keyTakeaways: [
      'Validação de Entidade: A evidência refere-se exatamente à aeronave, motor ou peça afetada?',
      'Validação Temporal: O evento de manutenção ocorreu após a data efetiva da AD ou atende à cláusula "Unless Already Accomplished"?',
      'Validação de Evento: A tarefa descrita corresponde exatamente à inspeção ou modificação mandada?',
      'Diferença crucial: INVALID (prova rejeitada por erro factual) vs INSUFFICIENT (faltam dados) vs REVIEW_REQUIRED (requer julgamento humano).'
    ],
    operationalRule: 'Se a evidência for marcada como INVALID ou INSUFFICIENT, a obrigação permanece aberta (OPEN ou OVERDUE) até que documentação idônea seja anexada.',
    detailedContent: `
### As 4 Dimensões de Verificação
1. **Entidade (Physical Identity):** Confere se a matrícula, MSN, ESN ou P/N/S/N coincidem matematicamente com os ativos do operador.
2. **Temporal (Chronological Bounds):** Compara a data do trabalho (\`eventDate\`) com a \`effectiveDate\` da AD e verifica se o horômetro registrado não ultrapassou o limite mandatório.
3. **Escopo da Tarefa (Task Match):** Verifica se o parágrafo cumprido no Service Bulletin corresponde à ação requerida.
4. **Integridade & Autoria (Integrity & Origin):** Confirma a presença de número de OS/WO, carimbo de organização Part-145 e referência formal.

### Categorias de Conclusão da Verificação
* **VALID:** Evidência atende a 100% dos critérios objetivos. Cumprimento homologável.
* **INVALID:** Existe informação suficiente para concluir que o documento NÃO é aceitável (ex: motor de número de série diferente ou serviço executado antes da data permitida sem cláusula UAA).
* **INSUFFICIENT:** O documento não contém informações suficientes para decisão (ex: falta data do serviço ou falta número de horas da peça).
* **REVIEW_REQUIRED:** A situação técnica requer decisão interpretativa de engenharia humana.
    `,
    whenToUseHumanReview: [
      'Sempre que o resultado do motor probatório for REVIEW_REQUIRED.',
      'Quando duas evidências anexadas apresentarem dados conflitantes entre si.',
      'Quando a evidência tiver sido revogada pela oficina de manutenção após a emissão.'
    ],
    consequences: 'Aprovar evidências inválidas contamina a trilha probatória do operador e invalida auditorias perante a autoridade de aviação.',
    relatedGlossaryTerms: ['Evidence Verification', 'INVALID', 'INSUFFICIENT', 'REVIEW_REQUIRED', 'UAA'],
    relatedModuleView: 'obligations',
    lastUpdated: '2026-09-06',
    version: '8.0.0'
  },

  // 13. Compliance Status
  {
    id: 'compliance-status-lifecycle',
    category: 'COMPLIANCE',
    title: 'Estados de Compliance: O Ciclo de Vida Completo',
    subtitle: 'Significado e regras de transição dos 13 status do CAMO Engine',
    summary: 'Cada obrigação no sistema passa por uma máquina de estados finita bem definida, garantindo que nenhum passo seja pulado ou presumido.',
    keyTakeaways: [
      'IDENTIFIED: AD localizada pelo conector, aguardando extração de dados.',
      'APPLICABILITY_PENDING: Aguardando dados adicionais de inventário para definir aplicabilidade.',
      'APPLICABLE: Aplicabilidade confirmada pelo Rule Engine; obrigação gerada.',
      'OPEN: Obrigação ativa aguardando cumprimento; prazo dentro da normalidade.',
      'DUE_SOON: Alerta operacional ativado (dentro da janela de tolerância de planejamento).',
      'OVERDUE: Limite legal estourado sem cumprimento comprovado.',
      'COMPLIED: Evidência válida aprovada pelo motor probatório.',
      'NEXT_CYCLE_OPEN: Ciclo anterior cumprido; próximo ciclo repetitivo aberto.',
      'NOT_APPLICABLE: Confirmado que a aeronave/peça está fora do escopo da diretriz.',
      'REVIEW_REQUIRED: Requer análise técnica manual por dados incompletos ou ambiguidade.',
      'SUPERSEDED: Requisito substituído formalmente por uma nova AD da autoridade.',
      'CANCELLED: Cancelamento oficial da diretriz pela autoridade emissora.'
    ],
    operationalRule: 'O status COMPLIED exige evidência documental verificada e válida em 100% dos casos quando a AD exigir ação física de manutenção.',
    detailedContent: `
### Diagrama de Transição de Estados
\`\`\`
IDENTIFIED ──> APPLICABILITY_PENDING ──> APPLICABLE ──> OPEN ──> DUE_SOON ──> OVERDUE
      │                                       │           │           │
      └──> NOT_APPLICABLE                     │           └──> COMPLIED <───┘
                                              │                   │
                                              └──> REVIEW_REQ.    └──> NEXT_CYCLE_OPEN
\`\`\`

### Invariantes do Sistema
1. Nenhuma obrigação pode transitar para \`COMPLIED\` sem que haja pelo menos uma \`Evidence\` com \`verificationStatus === 'VALID'\`.
2. Uma obrigação \`COMPLIED\` que seja repetitiva gera deterministicamente um novo registro com status \`NEXT_CYCLE_OPEN\` e novos prazos calculados.
3. Se uma evidência aprovada for posteriormente revogada, a obrigação retrocede automaticamente para \`OPEN\` ou \`OVERDUE\`.
    `,
    whenToUseHumanReview: [
      'Quando uma obrigação permanecer em APPLICABILITY_PENDING por mais de 48 horas.',
      'Para avaliar obrigações em SUPERSEDED e verificar se a nova AD impõe créditos prévios.',
      'Sempre que o status for REVIEW_REQUIRED.'
    ],
    consequences: 'Transições manuais indevidas corrompem a integridade dos relatórios técnicos oficiais (FAPT).',
    relatedGlossaryTerms: ['Compliance Status', 'OPEN', 'COMPLIED', 'OVERDUE', 'DUE_SOON', 'SUPERSEDED'],
    relatedModuleView: 'obligations',
    lastUpdated: '2026-09-06',
    version: '8.0.0'
  },

  // 14. Aircraft Airworthiness
  {
    id: 'art-airworthiness-decoupling',
    category: 'AIRWORTHINESS',
    title: 'Aeronavegabilidade Operacional vs Compliance Regulatório',
    subtitle: 'A separação fundamental homologada na Fase 6.4.1: OVERDUE ≠ GROUNDED e o valor NOT_DETERMINED',
    summary: 'Conformidade técnica regulatória e liberação operacional de voo são conceitos distintos. O CAMO Engine não inventa autoridade operacional sem base autorizada.',
    keyTakeaways: [
      'Compliance NÃO é Airworthiness: conformidade avalia o cumprimento de regras (OPEN, OVERDUE, COMPLIED) enquanto aeronavegabilidade autoriza a operação segura de voo (canFly: true, false ou null).',
      'Airworthiness Status determina se a aeronave possui liberação operacional de voo (canFly: true, false ou null).',
      'OVERDUE regulatório NÃO significa automaticamente GROUNDED operacional imediato — pode haver AMOC, ferry permit ou base autorizada.',
      'REVIEW_REQUIRED NÃO significa automaticamente MAINTENANCE_HOLD.',
      'NOT_DETERMINED (canFly = null) é a resposta correta e segura quando não há base autorizada suficiente para emitir um juízo operacional.'
    ],
    operationalRule: 'O sistema fornece os dados objetivos de conformidade; a decisão operacional de interditar (ground) ou liberar com restrição depende de base legal e autoridade técnica competente.',
    detailedContent: `
### Desacoplamento Arquitetural (Fase 6.4.1)
Historicamente, sistemas simplificados cometeram o erro de programar: \`if (ad.isOverdue) aircraft.isGrounded = true;\`. No mundo real da aviação, isso é conceitualmente incorreto:
* Uma aeronave pode ter uma AD vencida e possuir uma autorização especial de traslado (*Special Flight Permit* / *Ferry Permit*) emitida pela autoridade para voar até a base de manutenção.
* Uma aeronave pode operar sob um AMOC aprovado pelo fabricante e pela FAA que estenda o prazo.
* Por outro lado, um sistema não pode inventar autoridade operacional: se faltam dados, ele deve declarar **NOT_DETERMINED** (\`canFly = null\`).

### Campos do Registro de Aeronavegabilidade
* **airworthinessStatus:** DETERMINED, NOT_DETERMINED, PENDING_INSPECTION.
* **canFly:** \`true\` (apto), \`false\` (inapto), \`null\` (indeterminado / base insuficiente).
* **isGrounded:** Booleano formal de interdição.
* **decisionSource:** Origem da regra de decisão (ex: CAMO_REGULATORY_DISPATCH, AMOC_EXTENSION, FERRY_PERMIT).
* **decisionRule:** Identificador formal da regra de despacho.
* **decisionReason:** Justificativa técnica completa rastreável.
    `,
    whenToUseHumanReview: [
      'Sempre que canFly for null (NOT_DETERMINED).',
      'Quando houver solicitação de voo de traslado (Ferry Flight) para aeronave com obrigação pendente.',
      'Quando houver conflito entre o parecer do inspetor de linha e o status de compliance do sistema.'
    ],
    consequences: 'Assumir canFly = true sem base autorizada expõe vidas e a empresa a risco catastrófico; assumir grounded indevido causa prejuízos operacionais milionários.',
    relatedGlossaryTerms: ['Airworthiness', 'canFly', 'NOT_DETERMINED', 'isGrounded', 'Ferry Permit'],
    relatedModuleView: 'fleet',
    lastUpdated: '2026-09-06',
    version: '8.0.0'
  },

  // 15. Human Review
  {
    id: 'human-review-guidelines',
    category: 'OPERATIONS',
    title: 'Human Review: O Guardião da Decisão Humana',
    subtitle: 'Quando encaminhar para revisão, catálogo de cenários e por que Human Review não é uma falha do sistema',
    summary: 'O status REVIEW_REQUIRED é uma funcionalidade de proteção aeronáutica, sinalizando que a situação técnica requer a autoridade e o discernimento de um engenheiro habilitado.',
    keyTakeaways: [
      'Human Review NÃO significa que o sistema falhou.',
      'Significa que o sistema identificou corretamente a falta de dados determinísticos suficientes para uma decisão segura.',
      'Cenários típicos: metadados insuficientes, aplicabilidade ambígua, evidências conflitantes, configurações especiais e AMOCs.',
      'A decisão do engenheiro é registrada na trilha de auditoria com justificativa e credenciais.'
    ],
    operationalRule: 'Nunca aprove ou descarte um item em Human Review sem antes consultar a documentação física da aeronave e a íntegra da AD.',
    detailedContent: `
### Catálogo de Cenários de Acionamento do Human Review
1. **Insufficient Metadata:** A AD exige verificação por Part Number, mas o inventário da aeronave possui o componente cadastrado sem o número de peça exato.
2. **Ambiguous Applicability:** O texto da AD contém condições disjuntivas complexas dependentes de inspeções anteriores não registradas.
3. **Conflicting Evidence:** Há duas ordens de serviço cadastradas com datas diferentes informando a mesma execução da tarefa.
4. **Temporal Inconsistency:** O horômetro registrado na caderneta na data do serviço é superior ao horômetro atual da aeronave (indicativo de erro de digitação ou substituição de tacômetro).
5. **Unknown Evidence Type:** O operador anexou um documento não padronizado que exige conferência de validade jurídica.
6. **AMOC Validation:** Avaliação se um documento de AMOC aplica-se juridicamente ao número de série daquela aeronave.
    `,
    whenToUseHumanReview: [
      'Sempre que o sistema indicar a flag reviewRequired = true.',
      'Ao receber alertas de discrepância de dados de manutenção emitidos por oficinas terceiras.',
      'Antes de homologar a aceitação final de aeronave em processo de entrega (Delivery).'
    ],
    consequences: 'Ignorar itens de Human Review acumula passivos regulatórios que podem resultar na interdição da frota pela autoridade aeronáutica.',
    relatedGlossaryTerms: ['Human Review', 'Audit Trail', 'Knowledge Facts', 'Zero-Fabrication'],
    relatedModuleView: 'knowledge',
    lastUpdated: '2026-09-06',
    version: '8.0.0'
  },

  // 16. AMOC
  {
    id: 'amoc-procedures',
    category: 'REGULATORY',
    title: 'AMOC: Métodos Alternativos de Cumprimento',
    subtitle: 'O que é um AMOC, autoridade competente, perigos da suposição e impacto na conformidade',
    summary: 'Um AMOC (Alternative Method of Compliance) é uma autorização formal e específica emitida pela autoridade de aviação permitindo cumprir uma AD por um método alternativo.',
    keyTakeaways: [
      'AMOC NÃO pode ser inventado pelo operador ou pela inteligência artificial.',
      'Registrar uma referência a um AMOC é diferente de presumir que ele exista ou que seja válido.',
      'Um AMOC emitido para uma empresa aérea NÃO se aplica automaticamente a outra empresa, salvo se for de aprovação global pela autoridade.',
      'Todo AMOC deve possuir documento comprobatório oficial da autoridade (FAA, EASA, ANAC) anexado à obrigação.'
    ],
    operationalRule: 'Nenhum override de conformidade baseado em AMOC pode ser homologado sem a carta oficial de aprovação da autoridade anexada à evidência.',
    detailedContent: `
### A Natureza Jurídica do AMOC
Conforme 14 CFR § 39.19 e regulamentos correlatos, uma vez publicada uma AD, nenhum operador pode desviar de suas instruções mandatórias, exceto se obtiver aprovação formal de AMOC emitida pelo escritório da autoridade responsável pelo certificado de tipo (ACO - Aircraft Certification Office).
* Um AMOC pode alterar o método de inspeção (ex: permitir ensaio por correntes parasitas em vez de ultrassom).
* Pode estender temporariamente um intervalo para acomodar disponibilidade de peças.
* Pode aprovar um reparo estrutural não contemplado pelo manual de manutenção.

### Gestão de AMOC no CAMO Engine
O sistema permite registrar o identificador do AMOC, data de concessão, autoridade emissora e arquivo em PDF da autorização. O Rule Engine avalia o cumprimento considerando os parâmetros específicos estabelecidos nos termos da aprovação.
    `,
    whenToUseHumanReview: [
      'Sempre que um AMOC for invocado para cumprir uma obrigação em aberto.',
      'Para verificar se as condições e limitações impostas na carta de AMOC continuam sendo atendidas pela operação.'
    ],
    consequences: 'Operar sob pretexto de um AMOC não homologado pela autoridade constitui violação direta de diretriz de aeronavegabilidade.',
    relatedGlossaryTerms: ['AMOC', 'ACO', 'FAA', 'EASA', 'Human Review'],
    relatedModuleView: 'obligations',
    lastUpdated: '2026-09-06',
    version: '8.0.0'
  },

  // 17. Supersedence
  {
    id: 'supersedence-rules',
    category: 'REGULATORY',
    title: 'Supersedence: Sucessão e Substituição de Diretrizes',
    subtitle: 'Como o sistema trata ADs substituídas, preservação de histórico probatório e transição para novas regras',
    summary: 'Quando uma autoridade emite uma nova AD substituindo uma anterior, o histórico de cumprimento da regra antiga não deve ser apagado, mas preservado para fins de crédito e auditoria.',
    keyTakeaways: [
      'AD Superseded = diretriz que perdeu a eficácia jurídica a partir da data de vigência da nova diretriz.',
      'O histórico probatório da AD antiga deve ser permanentemente mantido.',
      'A nova AD frequentemente concede crédito regulatório para ações já executadas sob a regra anterior.',
      'O sistema vincula a cadeia de sucessão (supersedes / supersededBy) de ponta a ponta.'
    ],
    operationalRule: 'Nunca delete registros de uma AD substituída; o histórico probatório é exigido por autoridades em revisões de aeronavegabilidade (ARC).',
    detailedContent: `
### Dinâmica da Sucessão Regulatória
Geralmente uma AD é substituída quando:
1. O fabricante identifica que a inspeção anterior era insuficiente para detectar trincas prematuras e encurta o intervalo.
2. É desenvolvida uma modificação definitiva (terminating action) que substitui inspeções repetitivas.
3. A autoridade expande a aplicabilidade para outros números de série de aeronaves ou modelos de motores.

### Transição no CAMO Engine
* A obrigação antiga recebe o status \`SUPERSEDED\`.
* Uma nova obrigação é gerada sob a nova AD.
* O motor de evidências analisa se as evidências anexadas à AD antiga atendem aos requisitos de crédito da nova regra.
    `,
    whenToUseHumanReview: [
      'Quando a nova AD exigir novas ações adicionais não cobertas pela inspeção da regra antiga.',
      'Quando houver dúvida se o trabalho executado no passado confere crédito pleno sob a nova diretriz.'
    ],
    consequences: 'Apagar o histórico de uma AD substituída destrói a rastreabilidade exigida pela EASA Part-M e ANAC RBAC 121.',
    relatedGlossaryTerms: ['Supersedence', 'SUPERSEDED', 'Credit', 'Audit Trail'],
    relatedModuleView: 'ads',
    lastUpdated: '2026-09-06',
    version: '8.0.0'
  },

  // 18. Terminating Action
  {
    id: 'terminating-action-concept',
    category: 'COMPLIANCE',
    title: 'Terminating Action: Extinção de Obrigações Repetitivas',
    subtitle: 'Diferença entre cumprimento rotineiro e ação terminativa definitiva, e impacto no planejamento de manutenção',
    summary: 'Uma Ação Terminativa é uma modificação física ou substituição de componente que corrige em definitivo a condição insegura, dispensando inspeções repetitivas futuras.',
    keyTakeaways: [
      'Cumprimento rotineiro: Renova o ciclo de inspeção e gera NEXT_CYCLE_OPEN.',
      'Ação Terminativa (Terminating Action): Encerra permanentemente a exigência de novas inspeções repetitivas.',
      'O histórico do cumprimento da ação terminativa permanece eternamente registrado na vida da aeronave.',
      'A execução parcial de um Service Bulletin não configura ação terminativa salvo se expressamente previsto na AD.'
    ],
    operationalRule: 'Para marcar uma obrigação como definitivamente encerrada por Terminating Action, certifique-se de que a ordem de serviço comprova a instalação do kit de modificação completo.',
    detailedContent: `
### Exemplo Prático
Uma AD determina inspeção por ultrassom das fixações do estabilizador horizontal a cada 1.500 horas de voo (tarefa repetitiva). O parágrafo (h) estipula:
*"Installation of Boeing Reinforcement Kit P/N 65-43210 constitutes terminating action for the repetitive inspections required by paragraph (g) of this AD."*
* Enquanto o operador apenas inspeciona, a obrigação transita para \`COMPLIED\` e imediatamente abre um novo ciclo \`NEXT_CYCLE_OPEN\` para +1.500 FH.
* Quando o operador instala o kit de reforço e anexa o CRS correspondente, o motor probatório reconhece a \`Terminating Action\` e encerra a obrigação com status \`COMPLIED\` permanente (sem novo ciclo).
    `,
    whenToUseHumanReview: [
      'Ao avaliar se um reparo estrutural cumpre os requisitos de ação terminativa descritos na AD.',
      'Quando o fabricante emitir uma revisão de Service Bulletin que altere os critérios da ação definitiva.'
    ],
    consequences: 'Encerrar erroneamente uma inspeção repetitiva sem que o kit de modificação tenha sido instalado coloca a aeronave em risco de falha catastrófica de componente.',
    relatedGlossaryTerms: ['Terminating Action', 'Repetitive Action', 'CRS', 'NEXT_CYCLE_OPEN'],
    relatedModuleView: 'obligations',
    lastUpdated: '2026-09-06',
    version: '8.0.0'
  },

  // 19. Aircraft Delivery / Acquisition
  {
    id: 'art-delivery-assessment-audit',
    category: 'DELIVERY',
    title: 'Aircraft Acquisition & Delivery: Workflow Completo da Fase 7',
    subtitle: 'Do cadastro de candidato pré-entrega ao Snapshot Final com Selo Criptográfico SHA-256',
    summary: 'O módulo de Aircraft Acquisition & Delivery Compliance implementa a avaliação minuciosa de aeronaves candidatas a incorporação ou devolução de leasing, blindando o operador contra passivos regulatórios ocultos.',
    keyTakeaways: [
      'Avaliação completa de aeronaves candidatas antes da assinatura do termo de recebimento (Acceptance Certificate).',
      'Fluxo estruturado de 10 etapas da configuração inicial à reconciliação de documentação de lessor.',
      'Emissão de Snapshot Final Imutável com carimbo de tempo e hash criptográfico SHA-256 de auditoria.',
      'Isolamento estrito: dados e evidências da aeronave pré-entrega não se misturam com a frota ativa até a homologação final.'
    ],
    operationalRule: 'Nunca autorize a aceitação técnica de uma aeronave arrendada enquanto houver divergências não reconciliadas entre as declarações do lessor e as evidências técnicas primárias.',
    detailedContent: `
### O Fluxo Homologado de 10 Etapas (Fase 7)
\`\`\`
Aircraft Candidate (Dados do Arrendador/Lessor)
       ↓
Configuration (MSN, Matrícula, Motores, P/Ns, FH/FC Totais)
       ↓
Regulatory Discovery (Varredura de ADs para o Modelo e Família)
       ↓
Potential Applicability (Scoping Filter e Triagem Preliminar)
       ↓
Known Regulatory Knowledge (Reutilização de Requisitos já analisados)
       ↓
Requirement / Obligation Binding (Geração de Obrigações Pré-Entrega)
       ↓
Lessor Documentation Ingestion (Declarações, Status Lists e CRS)
       ↓
Evidence Verification (Motor probatório em 4 dimensões)
       ↓
Compliance Assessment (Identificação de Gaps, Overdues e Discrepâncias)
       ↓
Final Delivery Snapshot & SHA-256 Seal (Homologação Final com Carimbo Imutável)
\`\`\`

### Isolamento de Contexto & Sandbox
Aeronaves candidatas possuem a flag \`isPreDeliveryAircraft: true\`. Suas obrigações e determinações operacionais permanecem em Sandbox isolado para não poluir os índices de prontidão da frota em operação regular.
    `,
    whenToUseHumanReview: [
      'Quando o lessor apresentar listas de cumprimento de ADs sem cópia das ordens de serviço correspondentes.',
      'Quando a data de entrega pretendida estiver muito próxima e houver inspeções mandatórias com prazo estourado.',
      'Para autorizar concessões comerciais negociadas com o lessor (Technical Delivery Conditions).'
    ],
    consequences: 'Receber uma aeronave com passivo oculto de ADs pode forçar o operador a custear inspeções de alto custo imediatamente após o recebimento.',
    relatedGlossaryTerms: ['Delivery Assessment', 'Lessor Documentation', 'Audit Hash', 'Snapshot', 'Pre-Delivery'],
    relatedModuleView: 'delivery',
    lastUpdated: '2026-09-06',
    version: '8.0.0'
  },

  // 20. Lessor Documentation
  {
    id: 'lessor-documentation-reconciliation',
    category: 'DELIVERY',
    title: 'Documentação de Lessor: Reconciliação e Princípio de Não-Presunção',
    subtitle: 'Lessor documentation is evidence/information, not automatic truth. Como reconciliar declarações com evidências primárias',
    summary: 'Declarações emitidas pelo arrendador (lessor status sheets) são apenas declarações unilaterais. O CAMO Engine exige confronto direto com evidências primárias idôneas.',
    keyTakeaways: [
      'Lessor documentation is evidence/information, not automatic truth.',
      'Uma planilha fornecida pelo lessor afirmando que a AD está "Complied" NÃO é prova suficiente perante a autoridade.',
      'O sistema reconcilia o que o lessor declarou com os certificados CRS, cadernetas e Form 8130-3 reais.',
      'Divergências permanecem explicitamente visíveis na interface e no relatório final de aceitação.'
    ],
    operationalRule: 'Toda declaração de cumprimento do lessor que não possua evidência primária associada deve ser sinalizada como DIVERGENTE até que o documento comprobatório seja entregue.',
    detailedContent: `
### Tipos de Documentos do Arrendador
* **Lessor AD Status Summary:** Planilha ou extrato emitido pelo operador anterior ou pela empresa de leasing resumindo o status das diretrizes.
* **Maintenance Records Package:** Pasta digital de ordens de serviço (Work Orders), fichas de tarefas (Task Cards) e relatórios de ensaios não destrutivos (NDT).
* **Authorized Release Certificates:** Formulários originais CRS, EASA Form 1 e FAA Form 8130-3 emitidos pelas oficinas que executaram as tarefas.
* **Aircraft Logbook Records:** Páginas das cadernetas da célula, motores e APU contendo os lançamentos de fechamento de pacotes de manutenção pesada (C-Checks).

### A Matriz de Reconciliação do CAMO Engine
O sistema compara automaticamente:
* Status declarado pelo lessor vs Status calculado pelo Rule Engine.
* Data e horômetro declarados vs Registros nos documentos de suporte anexados.
* Quando há discrepância (ex: Lessor diz "Not Applicable", mas a AD é aplicável pelo MSN da aeronave), o sistema emite alerta crítico e impede a aprovação automática.
    `,
    whenToUseHumanReview: [
      'Quando o lessor alegar cumprimento com base em norma de autoridade estrangeira diferente da autoridade de matrícula pretendida.',
      'Quando faltarem páginas originais de pacotes de manutenção executados há mais de um ano.'
    ],
    consequences: 'Confiar cegamente em declarações de lessor sem auditar evidências primárias é a causa número um de retenção de aeronaves por autoridades em processos de importação.',
    relatedGlossaryTerms: ['Lessor Documentation', 'CRS', 'Reconciliation', 'Divergence'],
    relatedModuleView: 'delivery',
    lastUpdated: '2026-09-06',
    version: '8.0.0'
  },

  // 21. Knowledge Reuse
  {
    id: 'regulatory-knowledge-reuse',
    category: 'FOUNDATION',
    title: 'Reutilização de Conhecimento: Requisitos Globais vs Conformidade Local',
    subtitle: 'Como o CAMO Engine capitaliza a inteligência regulatória sem copiar conformidade entre aeronaves',
    summary: 'A plataforma armazena o aprendizado técnico sobre cada AD, permitindo acelerar em até 95% a análise de novas aeronaves, mantendo a independência probatória.',
    keyTakeaways: [
      'Knowledge can be reused; compliance cannot simply be copied.',
      'O conhecimento reutilizável engloba a interpretação da AD, a extração de ações, regras de aplicabilidade e thresholds padronizados.',
      'Ao adicionar uma segunda aeronave do mesmo tipo (ex: novo Boeing 737-800), o sistema reutiliza os requisitos já refinados por engenheiros.',
      'Porém, a conformidade de cada aeronave continua exigindo sua própria avaliação de applicability, sua própria obrigação e suas próprias evidências.'
    ],
    operationalRule: 'Aproveite os requisitos já consolidados na base de conhecimento, mas exija sempre a documentação física individualizada para cada número de série de aeronave.',
    detailedContent: `
### Como Funciona a Reutilização no CAMO Engine
1. **Primeira Aeronave (ex: MSN 30120):** A AD é carregada pela primeira vez. A IA extrai o texto, o engenheiro revisa os parágrafos, define as ações mandatórias e consolida um \`Knowledge Fact\`.
2. **Segunda Aeronave (ex: MSN 38124 - Nova Entrega):** O sistema reconhece imediatamente que a AD já foi analisada e estruturada. Ele instancia o \`ComplianceRequirement\` existente sem necessidade de nova extração de PDF.
3. **Avaliação Individual:** O Rule Engine cruza os parâmetros específicos do MSN 38124 com a regra existente e gera uma nova \`ComplianceObligation\` exclusiva.

### Benefícios Práticos
* **Velocidade:** Processamento instantâneo de frotas inteiras.
* **Padronização:** Todo o corpo de engenheiros segue a mesma interpretação homologada.
* **Segurança Jurídica:** Elimina interpretações contraditórias dentro da mesma organização CAMO.
    `,
    whenToUseHumanReview: [
      'Quando uma nova aeronave possuir uma modificação de cabine ou aviônica que divirja do padrão do operador.',
      'Quando o fabricante publicar um novo Service Bulletin revisando as instruções técnicas.'
    ],
    consequences: 'Re-analisar manualmente a mesma AD do zero para cada aeronave gera inconsistências e desperdiça centenas de horas de engenharia.',
    relatedGlossaryTerms: ['Knowledge Reuse', 'Knowledge Facts', 'Requirement', 'Obligation'],
    relatedModuleView: 'knowledge',
    lastUpdated: '2026-09-06',
    version: '8.0.0'
  }
];

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    term: 'Airworthiness Directive (AD)',
    acronym: 'AD',
    category: 'REGULATORY',
    definition: 'Regulamento compulsório de cumprimento obrigatório emitido por uma autoridade de aviação civil (FAA, EASA, ANAC) para corrigir uma condição insegura comprovada em um produto aeronáutico.',
    operationalRole: 'Ativo regulatório de conhecimento reutilizável que impõe obrigações mandatórias de cumprimento a aeronaves afetadas.',
    authorityReference: 'FAA 14 CFR Part 39 / EASA Part-21 / ANAC RBAC 39',
    warningNote: 'Operar aeronave sem cumprimento de AD aplicável acarreta perda imediata de aeronavegabilidade.'
  },
  {
    term: 'Alternative Method of Compliance (AMOC)',
    acronym: 'AMOC',
    category: 'REGULATORY',
    definition: 'Aprovação formal e específica concedida pela autoridade competente autorizando o cumprimento de uma AD por um método técnico, intervalo ou procedimento diferente do prescrito originalmente.',
    operationalRole: 'Base jurídica para validação de desvios técnicos ou concessões de prazo em obrigações ativas.',
    authorityReference: 'FAA 14 CFR § 39.19',
    warningNote: 'AMOCs nunca devem ser presumidos ou inventados; exigem carta oficial de aprovação da autoridade.'
  },
  {
    term: 'Service Bulletin (SB)',
    acronym: 'SB',
    category: 'MAINTENANCE',
    definition: 'Documento técnico oficial emitido pelo fabricante da aeronave ou do motor detalhando procedimentos de inspeção, modificação ou reparo recomendados ou mandados por AD.',
    operationalRole: 'Descreve o método técnico de execução mandatório quando incorporado por referência (IBR) em uma AD.',
    authorityReference: 'FAA Advisory Circular 20-114'
  },
  {
    term: 'Applicability',
    acronym: 'APPL',
    category: 'COMPLIANCE',
    definition: 'Condição jurídica e técnica que estabelece se uma diretriz afeta uma determinada aeronave com base em modelo, fabricante, número de série (MSN), motor ou componentes instalados.',
    operationalRole: 'Portão lógico inicial de avaliação. Se aplicável, gera uma Compliance Obligation; se não aplicável, encerra o ciclo.',
    authorityReference: 'FAA 14 CFR § 39.5',
    warningNote: 'Mesmo modelo não significa mesma aplicabilidade. Ausência de dados cadastrais impõe REVIEW_REQUIRED.'
  },
  {
    term: 'Regulatory Requirement',
    acronym: 'REQ',
    category: 'COMPLIANCE',
    definition: 'Estruturação abstrata e universal de uma regra técnica contida em uma AD, definindo parâmetros, prazos, ações mandatórias e condições de cumprimento de forma tipada.',
    operationalRole: 'Entidade de conhecimento que serve de modelo para gerar obrigações vinculantes em aeronaves da frota.',
    authorityReference: 'CAMO Core Architecture'
  },
  {
    term: 'Compliance Obligation',
    acronym: 'OBLIG',
    category: 'COMPLIANCE',
    definition: 'Instância vinculante de um Regulatory Requirement associada a uma entidade física específica (uma aeronave, motor ou componente), contendo prazos e evidências individuais.',
    operationalRole: 'Controla o estado de cumprimento da aeronave física e alimenta o cálculo de aeronavegabilidade.',
    authorityReference: 'EASA Part-M (M.A.708)',
    warningNote: 'Obrigações nunca devem ser copiadas indiscriminadamente entre aeronaves.'
  },
  {
    term: 'Evidence',
    acronym: 'EVID',
    category: 'MAINTENANCE',
    definition: 'Registro documental formal comprovando a execução de uma tarefa de manutenção (ordem de serviço, CRS, formulário autorizado de liberação de componente ou caderneta de voo).',
    operationalRole: 'Suporte probatório obrigatório para que qualquer obrigação de ação física transite para COMPLIED.',
    authorityReference: 'FAA 14 CFR § 43.9 / EASA Part-M (M.A.614)'
  },
  {
    term: 'Evidence Verification',
    acronym: 'EV-VERIF',
    category: 'COMPLIANCE',
    definition: 'Processo sistemático e determinístico que avalia a integridade física, temporal, de escopo de tarefa e autoria de uma evidência técnica.',
    operationalRole: 'Classifica a prova em VALID, INVALID, INSUFFICIENT ou REVIEW_REQUIRED.',
    authorityReference: 'Evidence Verification Engine V6.3'
  },
  {
    term: 'Compliance Status',
    acronym: 'STATUS',
    category: 'COMPLIANCE',
    definition: 'Estado atual de conformidade de uma obrigação perante a regra mandatória dentro de seu ciclo de vida regulatório.',
    operationalRole: 'Indica a situação da tarefa (ex: OPEN, DUE_SOON, OVERDUE, COMPLIED, REVIEW_REQUIRED).',
    authorityReference: 'CAMO State Machine V2'
  },
  {
    term: 'Due Date & Threshold',
    acronym: 'DUE DATE / THRESHOLD',
    category: 'MAINTENANCE',
    definition: 'Limite regulatório matemático imposto pela AD para a execução de uma ação, expresso em calendário, Horas de Voo (FH), Ciclos de Voo (FC) ou composição lógica.',
    operationalRole: 'Determina a data limite fatal de cumprimento legal e aciona janelas operacionais de alerta (DUE_SOON).',
    authorityReference: 'FAA 14 CFR Part 39',
    warningNote: 'Regulatory Limit ≠ Operational Alert Window. DUE_SOON não é vencimento legal.'
  },
  {
    term: 'Flight Hours (FH)',
    acronym: 'FH',
    category: 'OPERATIONAL',
    definition: 'Tempo total decorrido desde o momento em que a aeronave começa a se movimentar com tração própria para decolagem até sua parada total de motores no destino.',
    operationalRole: 'Contador fundamental para rastreio de limites de vida e inspeções de fadiga estrutural.',
    authorityReference: 'ICAO Annex 6 / 14 CFR § 1.1'
  },
  {
    term: 'Flight Cycles (FC)',
    acronym: 'FC',
    category: 'OPERATIONAL',
    definition: 'Número de sequências de pressurização e alívio da fuselagem, geralmente coincidente com a quantidade de decolagens e pousos realizados.',
    operationalRole: 'Métrica crítica para componentes sujeitos a desgaste por ciclagem de carga e pressurização.',
    authorityReference: 'ICAO Annex 6'
  },
  {
    term: 'Terminating Action',
    acronym: 'TERM-ACT',
    category: 'MAINTENANCE',
    definition: 'Modificação de engenharia, substituição definitiva ou kit de reforço aprovado pela autoridade que elimina permanentemente a necessidade de inspeções repetitivas de uma AD.',
    operationalRole: 'Encerra o ciclo repetitivo da obrigação, impedindo a geração do estado NEXT_CYCLE_OPEN.',
    authorityReference: 'FAA Advisory Circular 39-8'
  },
  {
    term: 'Supersedence',
    acronym: 'SUPER',
    category: 'REGULATORY',
    definition: 'Ato oficial da autoridade de aviação de substituir uma AD em vigor por uma nova diretriz atualizada, encerrando a eficácia jurídica da regra anterior.',
    operationalRole: 'Transita a regra antiga para SUPERSEDED mantendo a cadeia de custódia e histórico probatório invioláveis.',
    authorityReference: 'FAA 14 CFR § 39.27'
  },
  {
    term: 'Human Review',
    acronym: 'HUMAN REVIEW / HR',
    category: 'COMPLIANCE',
    definition: 'Intervenção técnica mandatória atribuída a um engenheiro CAMO credenciado perante casos de ambiguidade, ausência de metadados ou evidências conflitantes.',
    operationalRole: 'Garante o princípio Zero-Fabrication, impedindo que algoritmos automatizados tomem decisões em situações cinzentas.',
    authorityReference: 'CAMO Core Safety Tenet'
  },
  {
    term: 'Aircraft Airworthiness',
    acronym: 'AIRWORTHINESS',
    category: 'OPERATIONAL',
    definition: 'Condição operacional e legal da aeronave em conformidade com seu projeto de tipo homologado e em condições de operação segura.',
    operationalRole: 'Determina formalmente se a aeronave está apta para liberação de voo (canFly = true, false ou null).',
    authorityReference: '14 CFR § 21.183 / EASA Part-M (M.A.201)'
  },
  {
    term: 'NOT_DETERMINED',
    acronym: 'NOT_DET',
    category: 'OPERATIONAL',
    definition: 'Estado de segurança adotado quando o sistema não possui dados autorizados suficientes para emitir uma determinação formal de aeronavegabilidade.',
    operationalRole: 'Resulta em canFly = null, exigindo avaliação e chancela do corpo de engenharia antes de qualquer voo.',
    authorityReference: 'Fleet Airworthiness Engine V6.4.1'
  },
  {
    term: 'Delivery Assessment',
    acronym: 'DELIVERY',
    category: 'DELIVERY',
    definition: 'Auditoria técnica de conformidade completa executada em aeronave candidata em processo de recebimento, aquisição ou devolução de contrato de leasing.',
    operationalRole: 'Gera o snapshot final de aceitação com integridade selada por hash SHA-256 e reconciliação documental.',
    authorityReference: 'CAMO Phase 7 Workflow'
  },
  {
    term: 'Selo Criptográfico de Auditoria (SHA-256)',
    acronym: 'SHA-256',
    category: 'DELIVERY',
    definition: 'Assinatura criptográfica calculada sobre o snapshot do estado de conformidade da aeronave no momento de entrega ou auditoria, garantindo integridade e imutabilidade dos dados.',
    operationalRole: 'Sela o relatório de aceitação técnica (Delivery Acceptance) e impede qualquer alteração retroativa dos registros.',
    authorityReference: 'CAMO Cryptographic Audit Standard'
  },
  {
    term: 'Lessor Documentation',
    acronym: 'LESSOR-DOC',
    category: 'DELIVERY',
    definition: 'Conjunto de planilhas, relatórios de status e extratos fornecidos pela empresa de arrendamento (lessor) sobre o histórico de manutenção da aeronave.',
    operationalRole: 'Informação que deve ser confrontada com evidências primárias antes de qualquer homologação.',
    authorityReference: 'CAMO Phase 7 Tenet: Evidence ≠ Truth'
  },
  {
    term: 'Certificate of Release to Service (CRS)',
    acronym: 'CRS',
    category: 'MAINTENANCE',
    definition: 'Declaração formal assinada por pessoal autorizado certificando que os serviços de manutenção foram realizados de acordo com os dados aplicáveis e a aeronave está apta para retorno ao serviço.',
    operationalRole: 'Evidência primária máxima de cumprimento de manutenção em nível de aeronave.',
    authorityReference: 'EASA Part-145 (145.A.50) / 14 CFR § 43.9'
  },
  {
    term: 'EASA Form 1 / FAA 8130-3',
    acronym: 'FORM 1 / 8130',
    category: 'MAINTENANCE',
    definition: 'Certificado de Liberação Autorizada emitido por oficina homologada atestando que um componente ou motor foi revisado, inspecionado ou modificado em conformidade com as normas.',
    operationalRole: 'Evidência primária indispensável para validação de componentes e motores rotáveis.',
    authorityReference: 'EASA Part-145 / FAA Order 8130.21'
  },
  {
    term: 'Unless Already Accomplished (UAA)',
    acronym: 'UAA',
    category: 'REGULATORY',
    definition: 'Cláusula regulatória padrão presente na maioria das ADs ("unless already accomplished"), permitindo que trabalhos executados antes da data efetiva da diretriz sirvam de cumprimento válido.',
    operationalRole: 'Permite que o motor de verificação probatória aceite ordens de serviço anteriores à effectiveDate se o método for idêntico.',
    authorityReference: 'FAA 14 CFR Part 39 standard clause'
  }
];

export const GUIDED_CAMO_WORKFLOW: GuidedWorkflowStep[] = [
  {
    stepNumber: 1,
    stageId: 'fleet-config',
    title: 'Cadastro e Configuração Técnica da Frota',
    module: 'Fleet Inventory',
    viewId: 'fleet',
    summary: 'Cadastro rigoroso dos ativos físicos da frota: matrículas, MSN, modelos canônicos, motores instalados e componentes com part numbers críticos.',
    whereAmI: 'Módulo de Frota: Gestão de Ativos Físicos e Horômetros (FH/FC).',
    whatItDoes: 'Mantém a fotografia técnica atualizada de cada aeronave e seus limites de voo acumulados para fins de cálculo de aplicabilidade e vencimentos.',
    whatToProvide: 'Número de série do fabricante (MSN), matrícula civil, família/modelo, horas totais (FH), ciclos totais (FC), motores por posição e lista de componentes rotáveis com P/N e S/N.',
    whatSystemDetermines: 'Modelos canônicos compatíveis, estrutura de posições e vínculo com o operador.',
    whatRequiresHumanReview: 'Aeronaves com componentes sem Part Number ou motores com histórico de modificação por terceiros.',
    nextStep: 'Passo 2: Regulatory Discovery & Conectores para varredura de novas regras aplicáveis.',
    relatedArticleIds: ['fleet-aircraft-configuration', 'art-applicability-rules']
  },
  {
    stepNumber: 2,
    stageId: 'discovery',
    title: 'Descoberta Regulatória & Conexão Oficial',
    module: 'Regulatory Sources & Pipeline',
    viewId: 'regulatory',
    summary: 'Monitoramento contínuo de publicações oficiais de autoridades (Federal Register, GPO, EASA, ANAC) e triagem de diretrizes potencialmente relevantes.',
    whereAmI: 'Módulo de Conectores Regulatórios: Coleta e Scoping Filter de ADs.',
    whatItDoes: 'Varre APIs governamentais, baixa metadados oficiais e identifica publicações que mencionem a frota do operador, aplicando o filtro de triagem preliminar.',
    whatToProvide: 'Critérios de busca (fabricantes da frota: Boeing, CFM, Airbus) e periodicidade de sincronização.',
    whatSystemDetermines: 'Identificação de novas publicações no Diário Oficial e aquisição criptográfica de PDFs oficiais via cofre seguro anti-SSRF.',
    whatRequiresHumanReview: 'Diretrizes com texto de aplicabilidade com condições excepcionais que o conector classifique como "Review Recommended".',
    nextStep: 'Passo 3: Upload & Análise Inteligente de AD para extração estruturada.',
    relatedArticleIds: ['regulatory-discovery', 'airworthiness-directive-concept']
  },
  {
    stepNumber: 3,
    stageId: 'ad-analysis',
    title: 'Extração Estruturada & Análise de Requisitos',
    module: 'AD Analysis & Extraction',
    viewId: 'upload',
    summary: 'Conversão do documento PDF não estruturado da AD em requisitos computacionais tipados (Regulatory Requirements) via IA Gemini especializada.',
    whereAmI: 'Módulo de Análise e Ingestão de Diretrizes: Tradução Documental.',
    whatItDoes: 'Lê o PDF original, identifica parágrafos mandatórios (g, h, i), extrai thresholds em FH/FC/dias, detecta ações repetitivas e identifica ações terminativas.',
    whatToProvide: 'Arquivo PDF oficial da Diretriz de Aeronavegabilidade ou número de documento oficial.',
    whatSystemDetermines: 'Extração determinística de campos estruturados: datas efetivas, fabricantes afetados, parágrafos mandatórios e referências a Service Bulletins.',
    whatRequiresHumanReview: 'O engenheiro CAMO deve auditar e chancelar a extração da IA antes da consolidação do Requisito no sistema.',
    nextStep: 'Passo 4: Avaliação de Aplicabilidade e Geração de Obrigações de Frota.',
    relatedArticleIds: ['regulatory-requirement-concept', 'human-review-guidelines']
  },
  {
    stepNumber: 4,
    stageId: 'applicability-generation',
    title: 'Motor de Regras V2 & Vinculação de Obrigações',
    module: 'Compliance Obligations & Due Dates',
    viewId: 'ads',
    summary: 'Execução booleana do CAMO Rule Engine V2 para cruzar o Requisito com cada aeronave da frota e gerar instâncias de Compliance Obligation.',
    whereAmI: 'Módulo de Diretrizes: Motor de Regras Determinístico e Avaliação de Aplicabilidade.',
    whatItDoes: 'Compara modelos, faixas de MSN, motores e P/Ns. Se aplicável, gera a Compliance Obligation com prazos regulatórios calculados.',
    whatToProvide: 'Chancela do Requisito e comando para execução do Rule Engine sobre a frota.',
    whatSystemDetermines: 'Classificação exata: APPLICABLE, NOT_APPLICABLE ou REVIEW_REQUIRED para cada aeronave individual.',
    whatRequiresHumanReview: 'Casos em que o Rule Engine retornar REVIEW_REQUIRED por falta de dados de inventário ou ambiguidade de texto.',
    nextStep: 'Passo 5: Controle de Prazos, Limites e Vinculação de Evidências de Manutenção.',
    relatedArticleIds: ['art-applicability-rules', 'compliance-obligation-concept', 'due-date-threshold-engine']
  },
  {
    stepNumber: 5,
    stageId: 'evidence-due-dates',
    title: 'Controle de Prazos & Verificação Probatória',
    module: 'Evidence Verification',
    viewId: 'obligations',
    summary: 'Monitoramento diário de limites regulatórios (FH/FC/Calendário) e verificação rigorosa de evidências de manutenção (CRS, Form 8130-3, cadernetas).',
    whereAmI: 'Módulo de Prazos e Limites: Acompanhamento de Vencimentos e Motor Probatório.',
    whatItDoes: 'Calcula projeção de datas de vencimento, sinaliza DUE_SOON e OVERDUE, e analisa evidências em 4 dimensões (entidade, tempo, escopo e integridade).',
    whatToProvide: 'Documentos probatórios digitalizados (CRS, relatórios de oficina, folhas de caderneta) associados às ordens de serviço.',
    whatSystemDetermines: 'Verificação automática: VALID, INVALID ou INSUFFICIENT; transição para COMPLIED ou abertura de NEXT_CYCLE_OPEN se repetitiva.',
    whatRequiresHumanReview: 'Evidências com divergências de número de série, documentos sem assinatura identificável ou solicitações de crédito de AMOC.',
    nextStep: 'Passo 6: Determinação de Aeronavegabilidade, Emissão de FAPT e Entrega de Aeronaves.',
    relatedArticleIds: ['evidence-management', 'evidence-verification-engine', 'compliance-status-lifecycle']
  },
  {
    stepNumber: 6,
    stageId: 'airworthiness-delivery',
    title: 'Aeronavegabilidade Operacional & Homologação de Entrega',
    module: 'Airworthiness & Delivery Clearance',
    viewId: 'delivery',
    summary: 'Decisão de aeronavegabilidade operacional (canFly), reconciliação de documentação de lessor e emissão de Folhas de Análise Técnica (FAPT).',
    whereAmI: 'Módulo de Aeronavegabilidade & Entrega: Homologação Final e Liberação Operacional.',
    whatItDoes: 'Separa conformidade regulatória de despacho operacional, emite o parecer FAPT chancelado e sela auditorias com carimbo SHA-256.',
    whatToProvide: 'Revisão final de engenharia, conferência de discrepâncias de lessor e assinatura digital do Engenheiro CAMO responsável.',
    whatSystemDetermines: 'Relatório formal de conformidade, histórico imutável na trilha de auditoria e cálculo do índice de integridade documental.',
    whatRequiresHumanReview: 'Autorização final de recebimento de aeronave arrendada e decisões de interdição operacional (isGrounded).',
    nextStep: 'Ciclo contínuo de aeronavegabilidade mantido; monitoramento de novos ciclos repetitivos.',
    relatedArticleIds: ['art-airworthiness-decoupling', 'art-delivery-assessment-audit', 'lessor-documentation-reconciliation']
  }
];

export interface ModuleContextHelp {
  moduleId: string;
  moduleName: string;
  shortSummary: string;
  whatAmISeeing: string;
  whatItMeans: string;
  whatShouldIDoNow: string;
  consequences: string;
  whenToSendToHumanReview: string[];
  primaryArticleId: string;
  secondaryArticleIds: string[];
}

export const MODULE_CONTEXTUAL_HELP: Record<string, ModuleContextHelp> = {
  dashboard: {
    moduleId: 'dashboard',
    moduleName: 'CAMO Dashboard Executivo',
    shortSummary: 'Painel gerencial consolidado do status de conformidade da frota, alertas críticos e atividade recente.',
    whatAmISeeing: 'Métricas gerais da frota, quantidade de ADs ativas, obrigações pendentes, alertas de vencimento próximo (DUE_SOON) e casos em REVIEW_REQUIRED.',
    whatItMeans: 'Fornece uma visão panorâmica instantânea da saúde regulatória da empresa aérea, identificando gargalos imediatos.',
    whatShouldIDoNow: 'Verifique se há obrigações em OVERDUE ou itens pendentes de revisão de engenharia (REVIEW_REQUIRED) e priorize sua resolução.',
    consequences: 'Deixar passar pendências críticas no dashboard pode levar ao vencimento despercebido de diretrizes mandatórias.',
    whenToSendToHumanReview: [
      'Sempre que o contador de "Review Required" ou "Missing Data" estiver acima de zero.',
      'Quando houver discrepância entre o status de aeronavegabilidade (canFly) e o número de obrigações abertas.'
    ],
    primaryArticleId: 'intro-camo-engine',
    secondaryArticleIds: ['art-airworthiness-decoupling', 'compliance-status-lifecycle']
  },
  regulatory: {
    moduleId: 'regulatory',
    moduleName: 'Conectores Regulatórios Oficiais',
    shortSummary: 'Interface de comunicação com diários oficiais e repositórios de autoridades aeronáuticas (FAA, FR, GPO).',
    whatAmISeeing: 'Lista de ADs descobertas em tempo real, status de conexão com o Federal Register e logs de sincronização.',
    whatItMeans: 'O sistema está monitorando continuamente o ambiente regulatório externo para garantir que nenhuma nova diretriz seja omitida.',
    whatShouldIDoNow: 'Revise as novas ADs detectadas e clique em "Analisar / Processar" para iniciar a extração das regras aplicáveis à frota.',
    consequences: 'Falhar na triagem de novas ADs impede a geração tempestiva de planos de cumprimento.',
    whenToSendToHumanReview: [
      'Quando uma diretriz de emergência for detectada com prazo de cumprimento inferior a 24 horas.',
      'Quando a publicação oficial contiver correções republicadas ou emendas de numeração duplicada.'
    ],
    primaryArticleId: 'regulatory-discovery',
    secondaryArticleIds: ['airworthiness-directive-concept', 'human-review-guidelines']
  },
  obligations: {
    moduleId: 'obligations',
    moduleName: 'Prazos, Limites & Obrigações de Compliance',
    shortSummary: 'Quadro analítico de obrigações vinculantes, cálculos de Due Date e acompanhamento probatório.',
    whatAmISeeing: 'Todas as obrigações ativas por aeronave com horômetros atuais, limites calculados, status (OPEN, DUE_SOON, OVERDUE) e evidências anexadas.',
    whatItMeans: 'É o coração operacional do CAMO: mostra exatamente quando cada manutenção deve acontecer para manter as aeronaves em voo.',
    whatShouldIDoNow: 'Anexe documentos de comprovação (CRS, caderneta) para tarefas executadas e programe hangar para as obrigações DUE_SOON.',
    consequences: 'Não anexar evidências válidas resulta no bloqueio da liberação técnica da aeronave.',
    whenToSendToHumanReview: [
      'Quando houver conflito entre datas de OS e horômetro registrado.',
      'Ao aplicar créditos de cumprimento anterior (Unless Already Accomplished).'
    ],
    primaryArticleId: 'due-date-threshold-engine',
    secondaryArticleIds: ['evidence-management', 'evidence-verification-engine', 'compliance-obligation-concept']
  },
  delivery: {
    moduleId: 'delivery',
    moduleName: 'Aircraft Acquisition & Delivery Compliance (Fase 7)',
    shortSummary: 'Auditoria especializada para aceitação ou devolução de aeronaves de leasing.',
    whatAmISeeing: 'Avaliações de entrega em andamento, configurações de aeronaves candidatas, reconciliação de declarações de lessor e selo SHA-256.',
    whatItMeans: 'Garante que nenhuma aeronave seja integrada à frota ativa com passivos regulatórios ou divergências de manutenção.',
    whatShouldIDoNow: 'Crie uma nova avaliação para aeronaves candidatas, carregue a declaração do lessor e anexe os certificados de liberação autorizados.',
    consequences: 'Receber aeronaves com ADs pendentes transfere custos e penalidades milionárias para o operador.',
    whenToSendToHumanReview: [
      'Quando o lessor não fornecer cópias completas das ordens de serviço primárias.',
      'Ao decidir sobre a aceitação técnica com discrepâncias abertas.'
    ],
    primaryArticleId: 'art-delivery-assessment-audit',
    secondaryArticleIds: ['lessor-documentation-reconciliation', 'evidence-verification-engine']
  },
  upload: {
    moduleId: 'upload',
    moduleName: 'Upload & Análise Inteligente de AD',
    shortSummary: 'Extração automática de requisitos a partir de documentos PDF oficiais.',
    whatAmISeeing: 'Interface para upload de arquivos PDF de ADs e visualização da extração estruturada de parágrafos mandatórios e prazos.',
    whatItMeans: 'A inteligência artificial está lendo o texto da autoridade para convertê-lo em dados que o motor de regras possa avaliar.',
    whatShouldIDoNow: 'Carregue o PDF da diretriz, verifique a extração na tela de diagnóstico e confirme o salvamento do Requisito.',
    consequences: 'Salvar um Requisito com erro de extração compromete a avaliação das aeronaves da frota.',
    whenToSendToHumanReview: [
      'Sempre que a IA indicar confiança baixa ou parágrafo com redação condicional complexa.',
      'Quando o documento referenciar Service Bulletins de terceiros não anexados.'
    ],
    primaryArticleId: 'regulatory-requirement-concept',
    secondaryArticleIds: ['human-review-guidelines', 'airworthiness-directive-concept']
  },
  ads: {
    moduleId: 'ads',
    moduleName: 'Gestão de Diretrizes de Aeronavegabilidade (ADs)',
    shortSummary: 'Catálogo de Requisitos homologados e acionamento do CAMO Rule Engine V2.',
    whatAmISeeing: 'Lista de todas as ADs estruturadas na base de conhecimento e matriz de aplicabilidade por aeronave.',
    whatItMeans: 'Representa a memória técnica de engenharia da empresa aérea sobre as regras emitidas pelas autoridades.',
    whatShouldIDoNow: 'Consulte detalhes técnicos das diretrizes, execute a reavaliação de aplicabilidade sobre a frota ou revise supersedências.',
    consequences: 'Manter requisitos desatualizados gera lacunas de conformidade perante novas emendas regulatórias.',
    whenToSendToHumanReview: [
      'Ao cadastrar regras com cláusulas de AMOC ou exceções de fabricante.',
      'Quando uma nova AD superseder diretrizes anteriores com cumprimento parcial em andamento.'
    ],
    primaryArticleId: 'airworthiness-directive-concept',
    secondaryArticleIds: ['art-applicability-rules', 'supersedence-rules']
  },
  detail: {
    moduleId: 'detail',
    moduleName: 'Detalhamento Técnico de Requisito & AD',
    shortSummary: 'Visualização minuciosa dos parâmetros de uma AD, ações mandatórias, referências de SB e status da frota.',
    whatAmISeeing: 'Texto original da diretriz, parágrafos mandatórios decompostos, thresholds de cumprimento e lista de aplicabilidade por aeronave.',
    whatItMeans: 'Permite ao engenheiro validar cada detalhe técnico da regra antes de liberar ou autorizar ordens de engenharia.',
    whatShouldIDoNow: 'Examine as ações requeridas e certifique-se de que a aplicabilidade gerada pelo motor reflete a frota real.',
    consequences: 'Interpretar incorretamente uma ação mandatória leva à execução de manutenção divergente da exigida pela autoridade.',
    whenToSendToHumanReview: [
      'Quando houver dúvida na redação do parágrafo de ação obrigatória.',
      'Ao solicitar métodos alternativos de cumprimento (AMOC).'
    ],
    primaryArticleId: 'regulatory-requirement-concept',
    secondaryArticleIds: ['airworthiness-directive-concept', 'human-review-guidelines']
  },
  fleet: {
    moduleId: 'fleet',
    moduleName: 'Inventário e Configuração da Frota',
    shortSummary: 'Cadastro mestre de aeronaves, motores, componentes críticos e contadores operacionais.',
    whatAmISeeing: 'Aeronaves ativas, prefixos, MSN, modelos canônicos, motores instalados por posição e horas/ciclos totais.',
    whatItMeans: 'Base cadastral física da operação; sem esses dados corretos, nenhum cálculo de aplicabilidade é confiável.',
    whatShouldIDoNow: 'Atualize os contadores de voo (FH/FC) e registre trocas de motores ou substituições de componentes rotáveis.',
    consequences: 'Dados defasados de horômetro causam cálculos errôneos de vencimento de inspeções.',
    whenToSendToHumanReview: [
      'Quando uma aeronave incorporar uma modificação por STC não catalogada.',
      'Ao cadastrar uma aeronave nova na frota com histórico prévio de operadores estrangeiros.'
    ],
    primaryArticleId: 'fleet-aircraft-configuration',
    secondaryArticleIds: ['art-airworthiness-decoupling', 'art-applicability-rules']
  },
  knowledge: {
    moduleId: 'knowledge',
    moduleName: 'Base de Conhecimento & Memória Técnica',
    shortSummary: 'Repositório de fatos de engenharia consolidados e central de resposta a perguntas técnicas pendentes.',
    whatAmISeeing: 'Knowledge Facts confirmados por engenheiros e lista de perguntas de dados ausentes geradas pelo sistema.',
    whatItMeans: 'Armazena decisões humanas anteriores para evitar perguntas repetitivas e acelerar avaliações futuras.',
    whatShouldIDoNow: 'Responda aos questionamentos pendentes fornecendo os dados técnicos requeridos para que o Rule Engine destrave a avaliação.',
    consequences: 'Deixar perguntas sem resposta mantém as aeronaves em status REVIEW_REQUIRED.',
    whenToSendToHumanReview: [
      'Todas as perguntas técnicas pendentes nesta tela exigem intervenção de engenheiro CAMO.',
      'Ao confirmar um novo fato técnico que altere a interpretação de uma diretriz.'
    ],
    primaryArticleId: 'regulatory-knowledge-reuse',
    secondaryArticleIds: ['human-review-guidelines', 'intro-camo-engine']
  },
  fapt: {
    moduleId: 'fapt',
    moduleName: 'Folhas de Análise e Parecer Técnico (FAPT)',
    shortSummary: 'Emissão, assinatura digital e arquivamento de pareceres técnicos formais para auditoria.',
    whatAmISeeing: 'Relatórios FAPT emitidos por diretriz e aeronave com assinatura eletrônica e declaração formal de conformidade.',
    whatItMeans: 'É o documento oficial comprobatório exigido por inspetores de autoridades de aviação civil em auditorias de CAMO.',
    whatShouldIDoNow: 'Gere o FAPT formal para diretrizes recém-cumpridas e proceda à assinatura digital como Engenheiro Responsável.',
    consequences: 'Não emitir o parecer formal impede a comprovação jurídica do cumprimento perante a autoridade.',
    whenToSendToHumanReview: [
      'A emissão e assinatura do FAPT é um ato exclusivo do Engenheiro CAMO credenciado.',
      'Quando a autoridade de aviação civil solicitar esclarecimentos técnicos sobre parecer emitido.'
    ],
    primaryArticleId: 'compliance-status-lifecycle',
    secondaryArticleIds: ['art-airworthiness-decoupling', 'intro-camo-engine']
  },
  audit: {
    moduleId: 'audit',
    moduleName: 'Trilha de Auditoria & Logs Criptográficos',
    shortSummary: 'Registro imutável de todas as ações, mudanças de estado, uploads e avaliações do sistema.',
    whatAmISeeing: 'Histórico cronológico completo com timestamp, identificação de usuário, ação executada e hash de integridade.',
    whatItMeans: 'Garante a auditabilidade total e atesta que nenhum dado foi alterado retroativamente ou forjado.',
    whatShouldIDoNow: 'Utilize para investigações de conformidade, preparação para auditorias de autoridades e verificação de rastreabilidade.',
    consequences: 'Qualquer tentativa de adulteração de histórico é imediatamente detectada pela quebra da cadeia de hashes.',
    whenToSendToHumanReview: [
      'Ao identificar anomalias nos registros de auditoria ou discrepâncias de timestamp.',
      'Durante auditorias oficiais externas de autoridades regulatórias.'
    ],
    primaryArticleId: 'intro-camo-engine',
    secondaryArticleIds: ['evidence-management', 'art-delivery-assessment-audit']
  },
  architecture: {
    moduleId: 'architecture',
    moduleName: 'Dossiê de Arquitetura & Registro de Capacidades',
    shortSummary: 'Documentação técnica oficial do sistema, pipeline de dados e mapa de capacidades operacionais.',
    whatAmISeeing: 'Visão dos motores do sistema (Rule Engine, Due Date Engine, Evidence Engine, Delivery Engine) e download do Dossiê em PDF.',
    whatItMeans: 'Comprova perante auditores e autoridades a conformidade arquitetural e os controles de segurança do software.',
    whatShouldIDoNow: 'Consulte as especificações dos motores ou baixe o PDF oficial do Dossiê para homologação externa.',
    consequences: 'Divergências entre a arquitetura documentada e o código em produção invalidam a homologação do software.',
    whenToSendToHumanReview: [
      'Ao revisar novas capacidades antes de submissão a órgãos certificadores.',
      'Quando houver modificação de regras regulatórias que exijam atualização do Capability Registry.'
    ],
    primaryArticleId: 'intro-camo-engine',
    secondaryArticleIds: ['due-date-threshold-engine', 'evidence-verification-engine']
  }
};
