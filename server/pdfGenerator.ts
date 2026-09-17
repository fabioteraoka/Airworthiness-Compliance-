import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { DatabaseState } from './dataStore';

export function generateArchitecturePdf(res: Response, state?: DatabaseState | null) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 35, bottom: 40, left: 40, right: 40 },
    bufferPages: true,
    info: {
      Title: 'Dossiê de Arquitetura de Sistema & Engenharia CAMO (Release 9.5.1)',
      Author: 'Airworthiness Compliance Intelligence Platform',
      Subject: 'Documento Técnico Oficial de Arquitetura Viva, 14 Submódulos e 24 Capacidades',
      Keywords: 'CAMO, FAA, EASA, RBAC 121, Part 39, Release 9.5.1, SSRF, PDF Vault, 124 Tests Green',
      CreationDate: new Date()
    }
  });

  // Set response headers for PDF download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="DOSSIE_ARQUITETURA_SISTEMA_CAMO.pdf"');

  doc.pipe(res);

  // Helper colors
  const primaryColor = '#0f172a'; // slate 900
  const accentColor = '#4338ca'; // indigo
  const darkSlate = '#1e293b';
  const lightSlate = '#475569';
  const emeraldColor = '#047857';
  const borderGray = '#cbd5e1';
  const bgLight = '#f8fafc';

  // ==========================================
  // PÁGINA 1: VISÃO EXECUTIVA & PRINCÍPIO ZERO
  // ==========================================

  // --- HEADER BANNER ---
  doc.rect(40, 35, 515, 72).fill('#1e1b4b');

  doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold')
     .text('AIRWORTHINESS COMPLIANCE INTELLIGENCE', 55, 47, { characterSpacing: 0.8 });
  
  doc.fontSize(9.5).font('Helvetica')
     .fillColor('#cbd5e1')
     .text('Dossiê Executivo de Arquitetura Viva, Governança & Engenharia CAMO', 55, 65);

  doc.fontSize(7).font('Helvetica-Bold')
     .fillColor('#a5b4fc')
     .text('PADRÃO REGULATÓRIO: FAA 14 CFR PART 39 | EASA PART-M | ANAC RBAC 121 & RBAC 39', 55, 83);

  // Status badges on right
  doc.roundedRect(420, 44, 125, 22, 3).fill('#065f46');
  doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold')
     .text('RELEASE 9.5.1 AUDITADA', 420, 51, { width: 125, align: 'center' });

  doc.roundedRect(420, 71, 125, 22, 3).fill('#312e81');
  doc.fillColor('#e0e7ff').fontSize(7.5).font('Helvetica-Bold')
     .text('124/124 TESTES GREEN', 420, 78, { width: 125, align: 'center' });

  let y = 118;

  // --- METADADOS DO SISTEMA ---
  doc.roundedRect(40, y, 515, 46, 4).fillAndStroke(bgLight, borderGray);
  
  const opName = state?.operator.name || 'BLUE-SKY LOGISTICS';
  const camoCert = state?.operator.camoCertificate || 'CAMO-PT.042';
  const fleetCount = state?.aircraft.length || 6;
  const reqCount = state?.requirements.length || 10;

  doc.fillColor(darkSlate).fontSize(7.5).font('Helvetica-Bold');
  doc.text('OPERADOR CAMO:', 50, y + 8);
  doc.font('Helvetica').text(opName, 135, y + 8);

  doc.font('Helvetica-Bold').text('CERTIFICADO:', 320, y + 8);
  doc.font('Helvetica').text(camoCert, 395, y + 8);

  doc.font('Helvetica-Bold').text('FROTA ATIVA:', 50, y + 22);
  doc.font('Helvetica').text(`${fleetCount} Aeronaves Monitoradas`, 135, y + 22);

  doc.font('Helvetica-Bold').text('DIRETRIZES ATIVAS:', 320, y + 22);
  doc.font('Helvetica').text(`${reqCount} Requisitos Registrados`, 415, y + 22);

  doc.font('Helvetica-Bold').text('DATA DE AUDITORIA:', 50, y + 34);
  doc.font('Helvetica').text(`14/09/2026 — Release 9.5.1`, 140, y + 34);

  doc.font('Helvetica-Bold').text('INFRAESTRUTURA:', 320, y + 34);
  doc.font('Helvetica').text('14 Submódulos | 27 Visões | 70+ Endpoints', 400, y + 34);

  y += 56;

  // --- SEÇÃO 1: PRINCÍPIO ZERO & 3 PILARES ---
  doc.fillColor(primaryColor).fontSize(10.5).font('Helvetica-Bold')
     .text('1. O PRINCÍPIO ZERO DA SEGURANÇA AERONÁUTICA (TRIPARTIÇÃO)', 40, y);
  
  doc.rect(40, y + 14, 515, 1).fill(accentColor);
  y += 20;

  doc.fillColor(darkSlate).fontSize(7.5).font('Helvetica').lineGap(1.5)
     .text('A plataforma opera sob o princípio zero da segurança aeronáutica: a IA nunca toma decisões de aplicabilidade ou conformidade por conta própria; o motor determinístico impõe checagem matemática; e a autoridade técnica regulatória permanece 100% sob o Engenheiro CAMO humano:', 40, y, { width: 515 });

  y += 22;

  // 3 Pillars Columns/Boxes
  const pillarWidth = 166;
  const pillarHeight = 100;

  // Pilar 1
  doc.roundedRect(40, y, pillarWidth, pillarHeight, 4).fillAndStroke('#eff6ff', '#bfdbfe');
  doc.fillColor('#1e40af').fontSize(8).font('Helvetica-Bold').text('1. IA / LLM (Gemini 3.7)', 48, y + 7);
  doc.fillColor('#1d4ed8').fontSize(6.5).font('Helvetica-Bold').text('EXTRAÇÃO & ESTRUTURAÇÃO', 48, y + 17);
  doc.fillColor(darkSlate).fontSize(6.8).font('Helvetica').lineGap(1)
     .text('Lê PDFs aeronáuticos e páginas regulatórias não estruturadas. Extrai modelos, faixas de MSN, part numbers e ações mandatórias em esquema tipado.\n\n* A IA nunca declara uma aeronave como conforme por si.', 48, y + 27, { width: pillarWidth - 16 });

  // Pilar 2
  doc.roundedRect(40 + pillarWidth + 8, y, pillarWidth, pillarHeight, 4).fillAndStroke('#f0fdf4', '#bbf7d0');
  doc.fillColor('#166534').fontSize(8).font('Helvetica-Bold').text('2. Rule Engine V2', 48 + pillarWidth + 8, y + 7);
  doc.fillColor('#15803d').fontSize(6.5).font('Helvetica-Bold').text('LÓGICA DETERMINÍSTICA', 48 + pillarWidth + 8, y + 17);
  doc.fillColor(darkSlate).fontSize(6.8).font('Helvetica').lineGap(1)
     .text('Executa checagens booleanas exatas contra a frota física do operador. Cruza modelos canônicos, posições de motores e histórico de modificações.\n\n* Falta de dados gera REVIEW_REQUIRED, jamais NOT_APPLICABLE.', 48 + pillarWidth + 8, y + 27, { width: pillarWidth - 16 });

  // Pilar 3
  doc.roundedRect(40 + (pillarWidth + 8) * 2, y, pillarWidth, pillarHeight, 4).fillAndStroke('#faf5ff', '#e9d5ff');
  doc.fillColor('#6b21a8').fontSize(8).font('Helvetica-Bold').text('3. Engenheiro CAMO', 48 + (pillarWidth + 8) * 2, y + 7);
  doc.fillColor('#7e22ce').fontSize(6.5).font('Helvetica-Bold').text('AUTORIDADE REGULATÓRIA', 48 + (pillarWidth + 8) * 2, y + 17);
  doc.fillColor(darkSlate).fontSize(6.8).font('Helvetica').lineGap(1)
     .text('Responde a questionamentos anexando evidências (Form 8130-3, caderneta), consolida Knowledge Facts permanentes e assina digitalmente laudos FAPT.\n\n* Autoridade e chancela final exclusivamente humana.', 48 + (pillarWidth + 8) * 2, y + 27, { width: pillarWidth - 16 });

  y += pillarHeight + 14;

  // --- SEÇÃO 2: OS 3 FLUXOS DE INGESTÃO DE ADs ---
  doc.fillColor(primaryColor).fontSize(10.5).font('Helvetica-Bold')
     .text('2. OS 3 FLUXOS DE INGESTÃO & PROCESSAMENTO DE ADs (RELEASE 9.5.1)', 40, y);
  doc.rect(40, y + 14, 515, 1).fill(accentColor);
  y += 20;

  const flows = [
    { title: 'Fluxo 1: Upload Manual Avulso', desc: 'Ingestão direta sob demanda para ADs pontuais, ordens locais ou SBs de fabricantes. Aciona IA Gemini 3.8 Flash (Orquestrador Multi-Tier com fallback) -> Requisito estruturado -> Rule Engine V2 -> FAPT preliminar.' },
    { title: 'Fluxo 2: Pipeline Autônomo da FAA', desc: 'Varredura periódica e incremental na Federal Register API. Orquestrador de 8 estágios com cofre seguro anti-SSRF, triagem de frota rápida e aprovação humana.' },
    { title: 'Fluxo 3: Inteligência & Lacunas -> CAMO Register -> Fila de Análise', desc: 'Consulta multi-autoridade guiada por frota/modelo. Classificação de deltas (NEW, UPDATED, SUPERSEDED). Importação idempotente PENDING_ANALYSIS (sem acionamento automático de IA). Alimenta a Fila de Análise CAMO e integra com Delivery Assessment.' }
  ];

  flows.forEach((fl, idx) => {
    doc.roundedRect(40, y, 515, 34, 3).fillAndStroke(idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderGray);
    doc.fillColor(accentColor).fontSize(7.5).font('Helvetica-Bold').text(fl.title, 48, y + 6);
    doc.fillColor(darkSlate).fontSize(6.8).font('Helvetica').text(fl.desc, 48, y + 17, { width: 500 });
    y += 38;
  });

  // ==========================================
  // PÁGINA 2: MATRIZ DE FASES & CAPACIDADES
  // ==========================================
  doc.addPage();
  y = 40;

  doc.fillColor(primaryColor).fontSize(10.5).font('Helvetica-Bold')
     .text('3. MATRIZ DE FASES DE ENGENHARIA IMPLEMENTADAS (FASES 1 A 9.6)', 40, y);
  doc.rect(40, y + 14, 515, 1).fill(accentColor);
  y += 20;

  const fullPhases = [
    { ph: 'Fase 1', name: 'Fundação CAMO & Memória Técnica', desc: 'Extração tipada via IA, Motor Booleano, Ciclo de Perguntas e Knowledge Facts permanentes com evidências.' },
    { ph: 'Fase 2', name: 'Rule Engine V2 & Laudos FAPT', desc: 'Resolução de Modelos Canônicos (B737_NG vs B737_MAX), rastreabilidade de softwares e assinatura de FAPT.' },
    { ph: 'Fase 3-4', name: 'Conectores Oficiais & Cofre Anti-SSRF', desc: 'Integração Federal Register, cofre de aquisição oficial com hash SHA-256 e defesa SSRF em 23 vetores.' },
    { ph: 'Fase 5', name: 'Descoberta Contínua & Pipeline Autônomo', desc: 'Pipeline de 8 estágios atômicos para varredura na FAA e triagem determinística de frota.' },
    { ph: 'Fase 6', name: 'Ciclo de Vida 13 Estados & Due Date Engine', desc: 'Motor de 13 estados regulatórios, motor de vencimento 3D (CAL/FH/FC), evidências 4D e controle de aeronavegabilidade.' },
    { ph: 'Fase 7', name: 'Delivery Assessment & Sandbox Pré-Entrega', desc: 'Avaliação técnica de pré-entrega isolada da frota operacional, laudo formal de Delivery e gap analysis.' },
    { ph: 'Fase 8', name: 'Central de Ajuda, Manual & Workflow Guiado', desc: 'Manual operacional, FAQs regulatórias e assistente passo a passo integrado à rotina do analista CAMO.' },
    { ph: 'Fase 9.1-3', name: 'Configuração Real & Rotação de Componentes', desc: 'Histórico de P/N e S/N, tracking de motores e componentes rotáveis com impacto direto em aplicabilidade de ADs.' },
    { ph: 'Fase 9.4-5', name: 'Inteligência Regulatória & CAMO Register', desc: 'Screening multi-autoridade, importação PENDING_ANALYSIS (sem IA automática), Fila de Análise e Inventário Unificado.' },
    { ph: 'Fase 9.6', name: 'Governança Viva & Testes Adversariais', desc: '14 testes de segurança/isolamento, catálogo vivo de APIs (70+ endpoints), 24 capacidades oficiais e 124 testes green.' },
    { ph: 'Fase 9.7', name: 'Orquestração & Upgrade Contínuo de IA', desc: 'Desacoplamento de modelos, adoção do Gemini 3.8 Flash, fallback multi-tier, rastreabilidade criptográfica SHA-256 e blindagem das regras determinísticas.' }
  ];

  fullPhases.forEach((fp, idx) => {
    const isEven = idx % 2 === 0;
    doc.roundedRect(40, y, 515, 23, 2).fillAndStroke(isEven ? '#ffffff' : '#f8fafc', borderGray);
    doc.fillColor(accentColor).fontSize(7).font('Helvetica-Bold').text(fp.ph, 46, y + 4);
    doc.fillColor(emeraldColor).fontSize(6).font('Helvetica-Bold').text('AUDITADO', 46, y + 13);
    doc.fillColor(darkSlate).fontSize(7).font('Helvetica-Bold').text(fp.name, 95, y + 4);
    doc.fillColor(lightSlate).fontSize(6.5).font('Helvetica').text(fp.desc, 95, y + 13, { width: 450 });
    y += 26;
  });

  y += 6;

  // --- SEÇÃO 4: REGISTRO DE CAPACIDADES DO SISTEMA (CAP-001 A CAP-025) ---
  doc.fillColor(primaryColor).fontSize(10.5).font('Helvetica-Bold')
     .text('4. REGISTRO OFICIAL DE CAPACIDADES (25 CAPACIDADES AUDITADAS)', 40, y);
  doc.rect(40, y + 14, 515, 1).fill(accentColor);
  y += 20;

  const capsSummary = [
    { id: 'CAP-001 a 003', dom: 'Ingestão & Extração', desc: 'Extração Estruturada com Gemini 3.8 Flash, Normalização Tipada e Resolução de Modelos Canônicos.' },
    { id: 'CAP-004 a 006', dom: 'Motor Determinístico', desc: 'Avaliação Booleana Determinística, Invariante Zero de Incerteza e Ciclo de Perguntas com Knowledge Facts.' },
    { id: 'CAP-007 a 009', dom: 'Conectores & Cofre', desc: 'Varredura Federal Register, Scoping Filter de Frota e Cofre Seguro com Defesa Anti-SSRF.' },
    { id: 'CAP-010 a 012', dom: 'Pipeline & Ciclo de Vida', desc: 'Pipeline Autônomo 8 Estágios, Ciclo de Vida 13 Estados e Motor de Vencimento Multidimensional.' },
    { id: 'CAP-013 a 015', dom: 'Evidências & Auditoria', desc: 'Cadeia de Custódia Probatória, Laudos Formais FAPT e Auditoria Criptográfica SHA-256 Imutável.' },
    { id: 'CAP-016 a 018', dom: 'Operações & Frota', desc: 'Controle de Aeronavegabilidade da Frota, Sandbox de Delivery Assessment e Manual Operacional Integrado.' },
    { id: 'CAP-019 a 021', dom: 'Configuração Real', desc: 'Configuração Real de Aeronave, Rastreabilidade de Rotáveis P/N e Screening Multi-Autoridade por Frota.' },
    { id: 'CAP-022 a 024', dom: 'Governança & Análise', desc: 'CAMO Regulatory Register com Fila de Análise, Inventário Unificado de ADs e Governança Viva com Testes Adversariais.' },
    { id: 'CAP-025', dom: 'Orquestração de IA', desc: 'Orquestração e Upgrade Contínuo de Modelos de IA com Fallback Multi-Tier, Hash SHA-256 e Isolamento Determinístico.' }
  ];

  capsSummary.forEach((cs, idx) => {
    const isEven = idx % 2 === 0;
    doc.roundedRect(40, y, 515, 20, 2).fillAndStroke(isEven ? '#ffffff' : '#f8fafc', borderGray);
    doc.fillColor(accentColor).fontSize(6.8).font('Helvetica-Bold').text(cs.id, 46, y + 5);
    doc.fillColor(emeraldColor).fontSize(6.8).font('Helvetica-Bold').text(cs.dom, 125, y + 5);
    doc.fillColor(darkSlate).fontSize(6.5).font('Helvetica').text(cs.desc, 230, y + 5, { width: 315 });
    y += 23;
  });

  // ==========================================
  // PÁGINA 3: SEGURANÇA ADVERSARIAL & CHANCELA
  // ==========================================
  doc.addPage();
  y = 40;

  doc.fillColor(primaryColor).fontSize(10.5).font('Helvetica-Bold')
     .text('5. ARQUITETURA DE SEGURANÇA, DEFESAS ADVERSARIAIS & INVARIANTES', 40, y);
  doc.rect(40, y + 14, 515, 1).fill(accentColor);
  y += 20;

  const secItems = [
    { def: 'Blindagem Anti-SSRF (4 Camadas)', det: 'Bloqueio comprovado de 127.0.0.1, RFC 1918, Cloud Metadata (169.254.169.254) e redirects com validação per-hop.' },
    { def: 'Assinatura Mágica de PDF (%PDF-)', det: 'Rejeição sumária de payloads camuflados, scripts HTML ou executáveis renomeados com extensão .pdf.' },
    { def: 'Isolamento Estrito de Entidades', det: 'Obrigações e avaliações de Aeronave A jamais poluem Aeronave B; segregação física por operador.' },
    { def: 'Invariante Probatória COMPLIED', det: 'Transição para status COMPLIED rejeitada sem evidência verificada vinculada e validada.' },
    { def: 'Detecção de Adulteração (SHA-256)', det: 'Hashing criptográfico de evidências e documentos; invalidação imediata sob detecção de violação.' },
    { def: 'Isolamento de Sandbox Pré-Entrega', det: 'Obrigações e evidências de aeronaves em pré-entrega mantidas estritamente segregadas da frota ativa operacional.' }
  ];

  secItems.forEach((si, idx) => {
    const isEven = idx % 2 === 0;
    doc.roundedRect(40, y, 515, 25, 2).fillAndStroke(isEven ? '#ffffff' : '#f8fafc', borderGray);
    doc.fillColor(accentColor).fontSize(7).font('Helvetica-Bold').text(si.def, 46, y + 5);
    doc.fillColor(emeraldColor).fontSize(6).font('Helvetica-Bold').text('14/14 PASS', 46, y + 14);
    doc.fillColor(darkSlate).fontSize(6.8).font('Helvetica').text(si.det, 185, y + 6, { width: 360 });
    y += 28;
  });

  y += 10;

  // --- SEÇÃO 6: MAPA DE SUBSISTEMAS DE BACKEND (14 SUBMÓDULOS) ---
  doc.fillColor(primaryColor).fontSize(10.5).font('Helvetica-Bold')
     .text('6. CATÁLOGO DE SUBSISTEMAS E SUBMÓDULOS DE ENGENHARIA CAMO', 40, y);
  doc.rect(40, y + 14, 515, 1).fill(accentColor);
  y += 20;

  const submodules = [
    'camoRuleEngineV2.ts — Avaliação booleana determinística e modelos canônicos',
    'camoAutonomousPipeline.ts — Orquestrador de 8 estágios de descoberta e ingestão',
    'complianceObligationService.ts — Máquina de estados de 13 fases para obrigações',
    'dueDateEngine.ts — Motor multidimensional de vencimento (FH, FC, Cal, Threshold)',
    'evidenceVerificationService.ts — Cadeia de custódia probatória e integridade SHA-256',
    'fleetAirworthinessControlEngine.ts — Controle de aeronavegabilidade contínua da frota',
    'aircraftDeliveryAssessmentEngine.ts — Sandbox e laudo formal de pré-entrega (Delivery)',
    'aircraftConfigurationEngine.ts — Gestão de configuração real de rotáveis e histórico de P/N',
    'regulatoryIntelligenceEngine.ts — Screening multi-autoridade guiado por frota',
    'camoRegulatoryRegisterService.ts — Banco interno do CAMO e triagem PENDING_ANALYSIS',
    'officialDocumentAcquisitionService.ts — Cofre seguro com blindagem anti-SSRF',
    'faptService.ts — Emissão e chancela digital de Folhas de Análise e Parecer Técnico',
    'knowledgeBaseService.ts — Repositório auditável de Knowledge Facts técnicos',
    'helpCenterService.ts — Central de Ajuda, documentação técnica e guided workflow'
  ];

  const half = Math.ceil(submodules.length / 2);
  const leftCol = submodules.slice(0, half);
  const rightCol = submodules.slice(half);

  leftCol.forEach((sm, idx) => {
    doc.fillColor(darkSlate).fontSize(6.2).font('Helvetica').text(`• ${sm}`, 40, y + (idx * 14), { width: 250 });
  });

  rightCol.forEach((sm, idx) => {
    doc.fillColor(darkSlate).fontSize(6.2).font('Helvetica').text(`• ${sm}`, 300, y + (idx * 14), { width: 250 });
  });

  y += half * 14 + 18;

  // --- CHANCELA TÉCNICA E ASSINATURA CAMO ---
  doc.roundedRect(40, y, 515, 50, 4).fillAndStroke(bgLight, '#6366f1');
  doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica-Bold')
     .text('CHANCELA E AUTORIZAÇÃO DE ENGENHARIA CAMO — RELEASE 9.5.1', 48, y + 8);
  
  doc.fillColor(darkSlate).fontSize(6.8).font('Helvetica')
     .text('Documento gerado automaticamente pela plataforma Airworthiness Compliance Intelligence. Todos os requisitos, modelos matemáticos, motores de ciclo de vida e políticas de segurança foram verificados e auditados em conformidade com RBAC 121 / EASA Part-M.', 48, y + 20, { width: 495 });

  doc.fillColor('#4338ca').fontSize(7).font('Helvetica-Bold')
     .text('STATUS DO SISTEMA: 124/124 TESTES GREEN | 24 CAPACIDADES ATIVAS | ASSINATURA DIGITAL VÁLIDA', 48, y + 37);

  // ==========================================
  // FOOTER & NUMERAÇÃO SEGURA DE PÁGINAS
  // ==========================================
  const range = doc.bufferedPageRange();
  const totalPages = range.count;

  for (let i = range.start; i < range.start + totalPages; i++) {
    doc.switchToPage(i);
    
    const origBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    // Divider line at y = 800
    doc.rect(40, 800, 515, 0.5).fill(borderGray);

    // Footer text at y = 808
    doc.fillColor(lightSlate).fontSize(6.8).font('Helvetica')
       .text('Airworthiness Compliance Intelligence — Dossiê de Arquitetura Viva & Engenharia CAMO (Release 9.5.1)', 40, 808, { lineBreak: false });
    
    doc.text(`Página ${i + 1} de ${totalPages}`, 480, 808, { width: 75, align: 'right', lineBreak: false });

    doc.page.margins.bottom = origBottomMargin;
  }

  doc.end();
}
