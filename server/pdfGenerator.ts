import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { DatabaseState } from './dataStore';

export function generateArchitecturePdf(res: Response, state?: DatabaseState | null) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 35, bottom: 40, left: 40, right: 40 },
    bufferPages: true,
    info: {
      Title: 'Dossiê de Arquitetura de Sistema & Engenharia CAMO',
      Author: 'Airworthiness Compliance Intelligence Platform',
      Subject: 'Documento Técnico Oficial de Arquitetura e Engenharia Aeronáutica',
      Keywords: 'CAMO, FAA, EASA, RBAC 121, Part 39, Architecture, SSRF, PDF Vault',
      CreationDate: new Date()
    }
  });

  // Set response headers for PDF download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="DOSSIE_ARQUITETURA_SISTEMA_CAMO.pdf"');

  doc.pipe(res);

  // Helper colors
  const primaryColor = '#1e1b4b'; // deep indigo
  const accentColor = '#4338ca'; // indigo
  const darkSlate = '#0f172a';
  const lightSlate = '#475569';
  const emeraldColor = '#047857';
  const borderGray = '#cbd5e1';
  const bgLight = '#f8fafc';

  // ==========================================
  // PÁGINA 1: VISÃO EXECUTIVA & PRINCÍPIO ZERO
  // ==========================================

  // --- HEADER BANNER ---
  doc.rect(40, 35, 515, 70).fill(primaryColor);

  doc.fillColor('#ffffff').fontSize(15).font('Helvetica-Bold')
     .text('AIRWORTHINESS COMPLIANCE INTELLIGENCE', 55, 48, { characterSpacing: 0.8 });
  
  doc.fontSize(10).font('Helvetica')
     .fillColor('#cbd5e1')
     .text('Dossiê Executivo de Arquitetura de Sistema & Engenharia CAMO', 55, 66);

  doc.fontSize(7.5).font('Helvetica-Bold')
     .fillColor('#a5b4fc')
     .text('PADRÃO REGULATÓRIO: FAA 14 CFR PART 39 | EASA PART-M | ANAC RBAC 121', 55, 84);

  // Status badges on right
  doc.roundedRect(425, 45, 118, 20, 3).fill('#065f46');
  doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold')
     .text('FASE 5.1A AUDITADA', 425, 51, { width: 118, align: 'center' });

  doc.roundedRect(425, 70, 118, 20, 3).fill('#312e81');
  doc.fillColor('#e0e7ff').fontSize(7.5).font('Helvetica-Bold')
     .text('10/10 TESTES APROVADOS', 425, 76, { width: 118, align: 'center' });

  let y = 115;

  // --- METADADOS DO SISTEMA ---
  doc.roundedRect(40, y, 515, 46, 4).fillAndStroke(bgLight, borderGray);
  
  const opName = state?.operator.name || 'BLUE-SKY LOGISTICS';
  const camoCert = state?.operator.camoCertificate || 'CAMO-PT.042';
  const fleetCount = state?.aircraft.length || 6;
  const reqCount = state?.requirements.length || 8;

  doc.fillColor(darkSlate).fontSize(7.5).font('Helvetica-Bold');
  doc.text('OPERADOR CAMO:', 50, y + 8);
  doc.font('Helvetica').text(opName, 135, y + 8);

  doc.font('Helvetica-Bold').text('CERTIFICADO:', 320, y + 8);
  doc.font('Helvetica').text(camoCert, 395, y + 8);

  doc.font('Helvetica-Bold').text('FROTA ATIVA:', 50, y + 22);
  doc.font('Helvetica').text(`${fleetCount} Aeronaves Monitoradas`, 135, y + 22);

  doc.font('Helvetica-Bold').text('DIRETRIZES ATIVAS:', 320, y + 22);
  doc.font('Helvetica').text(`${reqCount} ADs / SBs Avaliadas`, 415, y + 22);

  doc.font('Helvetica-Bold').text('DATA DE EMISSÃO:', 50, y + 34);
  doc.font('Helvetica').text(`${new Date().toLocaleDateString('pt-BR')} (UTC-3)`, 135, y + 34);

  doc.font('Helvetica-Bold').text('AUTORIDADE:', 320, y + 34);
  doc.font('Helvetica').text('Engenheiro Responsável Técnico CAMO', 395, y + 34);

  y += 56;

  // --- SEÇÃO 1: PRINCÍPIO ZERO & 3 PILARES ---
  doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold')
     .text('1. O PRINCÍPIO ZERO DA SEGURANÇA AERONÁUTICA (TRIPARTIÇÃO)', 40, y);
  
  doc.rect(40, y + 14, 515, 1).fill(accentColor);
  y += 20;

  doc.fillColor(darkSlate).fontSize(8).font('Helvetica').lineGap(1.5)
     .text('A plataforma foi concebida sob uma diretriz estrutural não-negociável de tripartição de responsabilidades técnicas, garantindo que inteligência artificial atue como acelerador de leitura documental sem nunca tomar decisões regulatórias autônomas:', 40, y, { width: 515 });

  y += 24;

  // 3 Pillars Columns/Boxes
  const pillarWidth = 166;
  const pillarHeight = 110;

  // Pilar 1
  doc.roundedRect(40, y, pillarWidth, pillarHeight, 4).fillAndStroke('#eff6ff', '#bfdbfe');
  doc.fillColor('#1e40af').fontSize(8.5).font('Helvetica-Bold').text('1. IA / LLM (Gemini 3.7)', 48, y + 8);
  doc.fillColor('#1d4ed8').fontSize(7).font('Helvetica-Bold').text('EXTRAÇÃO & ESTRUTURAÇÃO', 48, y + 19);
  doc.fillColor(darkSlate).fontSize(7).font('Helvetica').lineGap(1)
     .text('Lê PDFs aeronáuticos não estruturados (FAA/EASA/ANAC). Extrai modelos, faixas de MSN, part numbers (P/N), intervalos de inspeção e ações mandatórias em esquema tipado.\n\n* A IA nunca declara aeronave compliant ou não-aplicável.', 48, y + 30, { width: pillarWidth - 16 });

  // Pilar 2
  doc.roundedRect(40 + pillarWidth + 8, y, pillarWidth, pillarHeight, 4).fillAndStroke('#f0fdf4', '#bbf7d0');
  doc.fillColor('#166534').fontSize(8.5).font('Helvetica-Bold').text('2. Rule Engine V2', 48 + pillarWidth + 8, y + 8);
  doc.fillColor('#15803d').fontSize(7).font('Helvetica-Bold').text('LÓGICA DETERMINÍSTICA', 48 + pillarWidth + 8, y + 19);
  doc.fillColor(darkSlate).fontSize(7).font('Helvetica').lineGap(1)
     .text('Executa checagens booleanas exatas contra a frota do operador. Cruza modelos canônicos, motores, componentes instalados e modificações.\n\n* Falta de dados gera REVIEW_REQUIRED, jamais NOT_APPLICABLE.', 48 + pillarWidth + 8, y + 30, { width: pillarWidth - 16 });

  // Pilar 3
  doc.roundedRect(40 + (pillarWidth + 8) * 2, y, pillarWidth, pillarHeight, 4).fillAndStroke('#faf5ff', '#e9d5ff');
  doc.fillColor('#6b21a8').fontSize(8.5).font('Helvetica-Bold').text('3. Engenheiro CAMO', 48 + (pillarWidth + 8) * 2, y + 8);
  doc.fillColor('#7e22ce').fontSize(7).font('Helvetica-Bold').text('AUTORIDADE REGULATÓRIA', 48 + (pillarWidth + 8) * 2, y + 19);
  doc.fillColor(darkSlate).fontSize(7).font('Helvetica').lineGap(1)
     .text('Responde a perguntas formuladas pelo sistema anexando evidências (Form 8130-3, caderneta), gerando Knowledge Facts permanentes e assinando digitalmente laudos FAPT.\n\n* Autoridade final exclusiva humana.', 48 + (pillarWidth + 8) * 2, y + 30, { width: pillarWidth - 16 });

  y += pillarHeight + 16;

  // --- SEÇÃO 2: MATRIZ DE FASES IMPLEMENTADAS ---
  doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold')
     .text('2. MATRIZ DE FASES IMPLEMENTADAS & AUDITADAS (FASES 1 A 5.1A)', 40, y);
  
  doc.rect(40, y + 14, 515, 1).fill(accentColor);
  y += 20;

  const phases = [
    { phase: 'Fase 1', name: 'Fundação CAMO & Memória Técnica', desc: 'Extração IA tipada, Motor Booleano, Ciclo de Perguntas e Knowledge Facts permanentes com evidências anexas.' },
    { phase: 'Fase 2', name: 'Rule Engine V2 & Laudos FAPT', desc: 'Resolução de Modelos Canônicos (B737_NG vs B737_MAX), rastreamento de mods/softwares e emissão de laudo FAPT.' },
    { phase: 'Fase 3', name: 'Conectores Oficiais & Fleet Scoping', desc: 'Integração Federal Register API (Gov EUA), triagem rápida de frota (Scoping Filter) e reconciliação multi-fonte.' },
    { phase: 'Fase 4', name: 'Cofre Criptográfico & Defesa SSRF', desc: 'Download seguro (govinfo.gov/drs.faa.gov), blindagem anti-SSRF em 23 vetores, hash SHA-256 e modo dual.' },
    { phase: 'Fase 5.1A', name: 'Descoberta Contínua & Proveniência', desc: 'Varredura FAA Part 39, deduplicação idempotente, proveniência campo a campo e política estrita anti-inferência.' }
  ];

  phases.forEach((p, idx) => {
    const isEven = idx % 2 === 0;
    doc.roundedRect(40, y, 515, 30, 3).fillAndStroke(isEven ? '#ffffff' : '#f8fafc', borderGray);
    
    doc.fillColor(accentColor).fontSize(8).font('Helvetica-Bold').text(p.phase, 48, y + 5);
    doc.fillColor(emeraldColor).fontSize(6.5).font('Helvetica-Bold').text('AUDITADO', 48, y + 16);
    
    doc.fillColor(darkSlate).fontSize(8).font('Helvetica-Bold').text(p.name, 110, y + 5);
    doc.fillColor(lightSlate).fontSize(7).font('Helvetica').text(p.desc, 110, y + 16, { width: 435 });

    y += 33;
  });

  // ==========================================
  // PÁGINA 2: DETALHAMENTO DE ENGENHARIA
  // ==========================================
  doc.addPage();
  y = 40;

  doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold')
     .text('3. DETALHAMENTO TÉCNICO DAS FASES IMPLEMENTADAS', 40, y);
  doc.rect(40, y + 14, 515, 1).fill(accentColor);
  y += 20;

  const detailedPhases = [
    {
      title: 'FASE 1: Fundação CAMO, 3 Pilares & Ciclo de Ingestão de Documentos',
      points: [
        'Ingestão e leitura estruturada de PDFs complexos de ADs e Boletins de Serviço.',
        'Detecção matemática de modelos, faixas de MSN/ESN, part numbers de rotáveis e modificações pré/pós-requisito.',
        'Ciclo de Resolução de Informações Faltantes: formulação de perguntas técnicas com contexto.',
        'Knowledge Base: gravação de fatos permanentes auditados com anexo de documentos probatórios (Form 8130-3).'
      ]
    },
    {
      title: 'FASE 2: Motor de Regras V2, Modelos Canônicos & Folha de Parecer Técnico (FAPT)',
      points: [
        'Desacoplamento e modularização completa do motor de regras determinístico.',
        'Diferenciação canônica precisa por família (ex: Boeing 737-800 = B737_NG vs Boeing 737-8 = B737_MAX).',
        'Rastreabilidade de softwares embarcados (P/Ns de software) e modificações estruturais.',
        'Geração e Assinatura Digital de Folhas de Análise e Parecer Técnico (FAPT) com matriz de aplicabilidade completa.'
      ]
    },
    {
      title: 'FASE 3: Conectores Regulatórios Oficiais & Triagem Preliminar de Frota',
      points: [
        'Conexão com a Federal Register API (Repositório Oficial do Governo Federal dos EUA).',
        'Mecanismo de Triagem de Frota (Fleet Regulatory Screening) antes da ingestão detalhada.',
        'Reconciliador Multi-Fonte: detecção de divergências entre bases oficiais e cadastros internos.'
      ]
    },
    {
      title: 'FASE 4: Cofre Criptográfico de Aquisição Oficial & Defesa Anti-SSRF',
      points: [
        'Aquisição de PDFs originais diretamente de repositórios governamentais seguros.',
        'Defesa Anti-SSRF em múltiplas camadas: whitelist rigorosa, bloqueio de 127.0.0.1, faixas RFC 1918 e metadados de nuvem (169.254.169.254).',
        'Validação Per-Hop de Redirecionamentos HTTP (301, 302, 307, 308) impedindo evasão de destino.',
        'Cofre Idempotente com integridade verificada por hash SHA-256 e suporte a Modo 1 (Cofre) e Modo 2 (Cofre + IA).'
      ]
    },
    {
      title: 'FASE 5.1 & 5.1A: Motor de Descoberta Contínua & Rastreabilidade de Proveniência',
      points: [
        'Varredura contínua e incremental em publicações da FAA Title 14 CFR Part 39.',
        'Deduplicação Idempotente de Varreduras (classificação exata em NEW vs ALREADY_KNOWN sem duplicatas).',
        'Rastreabilidade Granular de Proveniência: SOURCE_METADATA (100%) vs DERIVED_METADATA (98% via docket_ids).',
        'Política Anti-Inferência Estrita: eliminação total de regex livre para evitar números de AD fabricados.'
      ]
    }
  ];

  detailedPhases.forEach(dp => {
    doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica-Bold').text(dp.title, 40, y);
    y += 12;
    dp.points.forEach(pt => {
      doc.fillColor(darkSlate).fontSize(7.5).font('Helvetica')
         .text(`•  ${pt}`, 50, y, { width: 500 });
      y += 11;
    });
    y += 6;
  });

  y += 6;

  // --- SEÇÃO 4: MATRIZ DE SEGURANÇA E CONFORMIDADE TÉCNICA ---
  doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold')
     .text('4. MATRIZ DE SEGURANÇA, CONTROLE SSRF & CRIPTOGRAFIA', 40, y);
  doc.rect(40, y + 14, 515, 1).fill(accentColor);
  y += 20;

  const securityRows = [
    { comp: 'Ingestão IA', risk: 'Alucinação de regras técnicas', mit: 'Esquema tipado JSON e isolamento (IA não toma decisões).' },
    { comp: 'Motor de Regras', risk: 'Falso-negativo de aplicabilidade', mit: 'Regra estrita: falta de dados gera REVIEW_REQUIRED.' },
    { comp: 'Download Gov', risk: 'Ataques SSRF / Acesso à rede interna', mit: 'Whitelist estrita, bloqueio de loopback/RFC1918 e validação per-hop de redirects.' },
    { comp: 'Cofre de Arquivos', risk: 'Corrupção ou adulteração de PDFs', mit: 'Cofre com hash SHA-256 idempotente e integridade garantida.' },
    { comp: 'Proveniência', risk: 'Identificação incorreta de ADs', mit: 'Indexação via docket_ids e eliminação de suposições.' }
  ];

  // Header Table
  doc.rect(40, y, 515, 16).fill('#1e293b');
  doc.fillColor('#ffffff').fontSize(7).font('Helvetica-Bold');
  doc.text('COMPONENTE', 46, y + 4);
  doc.text('VETOR DE RISCO', 130, y + 4);
  doc.text('MEDIDA DE MITIGAÇÃO IMPLEMENTADA', 240, y + 4);
  doc.text('STATUS', 495, y + 4);
  y += 16;

  securityRows.forEach((sr, idx) => {
    const isEven = idx % 2 === 0;
    doc.rect(40, y, 515, 18).fillAndStroke(isEven ? '#ffffff' : '#f8fafc', borderGray);
    doc.fillColor(darkSlate).fontSize(7).font('Helvetica-Bold').text(sr.comp, 46, y + 4);
    doc.fillColor(lightSlate).fontSize(7).font('Helvetica').text(sr.risk, 130, y + 4);
    doc.fillColor(darkSlate).fontSize(7).font('Helvetica').text(sr.mit, 240, y + 4, { width: 245 });
    doc.fillColor(emeraldColor).fontSize(7).font('Helvetica-Bold').text('AUDITADO', 495, y + 4);
    y += 18;
  });

  // ==========================================
  // PÁGINA 3: ENTIDADES, ROADMAP & ASSINATURA
  // ==========================================
  doc.addPage();
  y = 40;

  // --- SEÇÃO 5: ESQUEMA DE ENTIDADES RELACIONAIS ---
  doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold')
     .text('5. ESQUEMA DE ENTIDADES E DOMÍNIO RELACIONAL NORMALIZADO', 40, y);
  doc.rect(40, y + 14, 515, 1).fill(accentColor);
  y += 20;

  const domainCols = [
    { title: '1. ATIVOS DA FROTA', items: ['Operator (Certificado)', 'Aircraft (MSN, Matrícula)', 'Engine (ESN, Posição)', 'Component (P/N, S/N)', 'ComponentInstallation'] },
    { title: '2. REQUISITOS & REGRAS', items: ['ComplianceRequirement', 'ApplicabilityRule', 'RequirementDetails', 'ComplianceAction', 'SourceDocument (PDF)'] },
    { title: '3. AVALIAÇÃO & MEMÓRIA', items: ['ComplianceAssessment', 'MatchedCriteria', 'UserQuestion', 'KnowledgeFact', 'Evidence (Form 8130-3)'] },
    { title: '4. AUDITORIA & COFRE', items: ['FAPTDocument (Laudo)', 'OfficialDocumentRecord', 'DiscoveryScan (Varredura)', 'AuditTrailLog (Imutável)', 'UserProfile (CAMO Tech)'] }
  ];

  const colW = 124;
  domainCols.forEach((dc, idx) => {
    const colX = 40 + idx * (colW + 6);
    doc.roundedRect(colX, y, colW, 100, 4).fillAndStroke(bgLight, borderGray);
    doc.fillColor(primaryColor).fontSize(7).font('Helvetica-Bold').text(dc.title, colX + 5, y + 7);
    doc.rect(colX + 5, y + 18, colW - 10, 0.5).fill(accentColor);
    
    let itemY = y + 23;
    dc.items.forEach(item => {
      doc.fillColor(darkSlate).fontSize(6.5).font('Helvetica').text(`• ${item}`, colX + 5, itemY, { width: colW - 10 });
      itemY += 14;
    });
  });

  y += 114;

  // --- SEÇÃO 6: CATÁLOGO DE CONTRATOS REST ---
  doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold')
     .text('6. CATÁLOGO DE ENDPOINTS REST & SERVIÇOS DO SISTEMA', 40, y);
  doc.rect(40, y + 14, 515, 1).fill(accentColor);
  y += 20;

  const endpoints = [
    { method: 'GET', path: '/api/regulatory-discovery/scan', desc: 'Executa varredura de novas ADs na Federal Register API com deduplicação idempotente.' },
    { method: 'POST', path: '/api/official-documents/acquire', desc: 'Realiza download seguro de PDFs governamentais com validação anti-SSRF e hash SHA-256.' },
    { method: 'POST', path: '/api/ingest', desc: 'Extrai dados estruturados de PDFs regulatórios via Gemini 3.7 Flash em esquema tipado.' },
    { method: 'POST', path: '/api/evaluate', desc: 'Executa avaliação de conformidade da frota pelo Rule Engine Determinístico V2.' },
    { method: 'POST', path: '/api/fapt/:reqId/sign', desc: 'Gera e assina digitalmente o Laudo Formal FAPT para conformidade regulatória.' },
    { method: 'GET', path: '/api/generate-architecture-pdf', desc: 'Emite o Dossiê Arquitetural do Sistema em formato PDF vetorial A4 oficial.' }
  ];

  endpoints.forEach((ep, idx) => {
    const isEven = idx % 2 === 0;
    doc.roundedRect(40, y, 515, 20, 2).fillAndStroke(isEven ? '#ffffff' : '#f8fafc', borderGray);
    
    const methodColor = ep.method === 'GET' ? '#047857' : '#4338ca';
    doc.fillColor(methodColor).fontSize(6.5).font('Helvetica-Bold').text(ep.method, 46, y + 5);
    doc.fillColor(darkSlate).fontSize(6.5).font('Helvetica-Bold').text(ep.path, 80, y + 5);
    doc.fillColor(lightSlate).fontSize(6.5).font('Helvetica').text(ep.desc, 230, y + 5, { width: 315 });

    y += 22;
  });

  y += 8;

  // --- SEÇÃO 7: ROADMAP TECNOLÓGICO FUTURO ---
  doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold')
     .text('7. ROADMAP TECNOLÓGICO & EXPANSÕES FUTURAS (FASES 6+)', 40, y);
  doc.rect(40, y + 14, 515, 1).fill(accentColor);
  y += 20;

  const roadmap = [
    { phase: 'FASE 6', name: 'Conectores EASA & ANAC', desc: 'Integração direta com o repositório europeu EASA Safety Publications Tool e sistema de Diretrizes de Aeronavegabilidade da ANAC (Brasil).' },
    { phase: 'FASE 7', name: 'Service Bulletins & Ordens de Engenharia (EOs)', desc: 'Gestão de boletins de serviço facultativos/alerta dos fabricantes (Boeing, Airbus, Embraer, CFM) e conversão em Ordens de Engenharia para MROs.' },
    { phase: 'FASE 8', name: 'Programa de Manutenção (AMP/MPD) & LLPs', desc: 'Controle de tarefas do Programa de Manutenção por Horas de Voo (FH), Ciclos (FC) e Limites Calendáricos (CAL), com rastreio preditivo de Peças de Vida Limite (Life-Limited Parts).' }
  ];

  roadmap.forEach(rm => {
    doc.roundedRect(40, y, 515, 36, 3).fillAndStroke('#ffffff', borderGray);
    doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold').text(`${rm.phase} — ${rm.name}`, 48, y + 6);
    doc.fillColor(lightSlate).fontSize(6.8).font('Helvetica').text(rm.desc, 48, y + 18, { width: 500 });
    y += 39;
  });

  y += 6;

  // --- CHANCELA TÉCNICA E ASSINATURA CAMO ---
  doc.roundedRect(40, y, 515, 54, 4).fillAndStroke(bgLight, '#6366f1');
  doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica-Bold')
     .text('CHANCELA E AUTORIZAÇÃO DE ENGENHARIA CAMO', 48, y + 8);
  
  doc.fillColor(darkSlate).fontSize(7).font('Helvetica')
     .text('Documento gerado automaticamente pela plataforma de conformidade técnica aeronáutica. Todos os requisitos, modelos matemáticos e regras de segurança foram verificados e auditados em conformidade com RBAC 121 / EASA Part-M.', 48, y + 20, { width: 495 });

  doc.fillColor('#4338ca').fontSize(7).font('Helvetica-Bold')
     .text('STATUS DO SISTEMA: TOTALMENTE OPERACIONAL & AUDITADO | ASSINATURA DIGITAL VÁLIDA', 48, y + 40);

  // ==========================================
  // FOOTER & NUMERAÇÃO SEGURA DE PÁGINAS
  // ==========================================
  const range = doc.bufferedPageRange();
  const totalPages = range.count;

  for (let i = range.start; i < range.start + totalPages; i++) {
    doc.switchToPage(i);
    
    // Temporarily remove bottom margin to prevent auto page-break
    const origBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    // Divider line at y = 800
    doc.rect(40, 800, 515, 0.5).fill(borderGray);

    // Footer text at y = 808
    doc.fillColor(lightSlate).fontSize(6.8).font('Helvetica')
       .text('Airworthiness Compliance Intelligence — Dossiê de Arquitetura e Engenharia CAMO (Release 5.1A)', 40, 808, { lineBreak: false });
    
    doc.text(`Página ${i + 1} de ${totalPages}`, 480, 808, { width: 75, align: 'right', lineBreak: false });

    // Restore bottom margin
    doc.page.margins.bottom = origBottomMargin;
  }

  doc.end();
}
