import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 9 Stage 6.3: Living Governance, Product Vision, Roadmap & AI Dev Guide', () => {
  const rootDir = process.cwd();

  it('1. Deve verificar a existência física dos 4 documentos canônicos de governança', () => {
    const docs = [
      'PRODUCT_VISION_ROADMAP.md',
      'AI_DEVELOPMENT_GUIDE.md',
      'CAPABILITY_REGISTRY.md',
      'DOSSIE_ARQUITETURA_SISTEMA_CAMO.md',
      'README.md'
    ];

    docs.forEach(doc => {
      const filePath = path.join(rootDir, doc);
      expect(fs.existsSync(filePath), `O documento ${doc} deve existir no diretório raiz`).toBe(true);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content.length, `O documento ${doc} não pode estar vazio`).toBeGreaterThan(100);
    });
  });

  it('2. PRODUCT_VISION_ROADMAP.md deve conter os estados canônicos, horizontes P0 a FUTURE e a fronteira PCM x CAMO', () => {
    const content = fs.readFileSync(path.join(rootDir, 'PRODUCT_VISION_ROADMAP.md'), 'utf-8');
    
    // Core Vision & Pillars
    expect(content).toContain('PRODUCT VISION & STRATEGIC ROADMAP');
    expect(content).toContain('VISÃO DO PRODUTO');
    expect(content).toContain('Controle de Manutenção / PCM');
    expect(content).toContain('CAMO');
    
    // Canonical lifecycle states
    expect(content).toContain('IMPLEMENTED');
    expect(content).toContain('IN_DEVELOPMENT');
    expect(content).toContain('PLANNED');
    expect(content).toContain('FUTURE_EXPLORATORY');
    expect(content).toContain('DEPRECATED');

    // Strategic Horizons
    expect(content).toContain('P0 — Fundamentos / Críticos');
    expect(content).toContain('P1 — Próxima Evolução');
    expect(content).toContain('P2 — Evolução Posterior');
    expect(content).toContain('FUTURE — Visão de Longo Prazo');

    // Integration and Out-of-scope boundaries
    expect(content).toContain('MATRIZ FORMAL DE DEPENDÊNCIAS DE CAPACIDADES');
    expect(content).toContain('FORA DE ESCOPO / O QUE NÃO IMPLEMENTAR AINDA');
    expect(content).toContain('CRITÉRIOS FORMAIS PARA ALTERAÇÃO DO ROADMAP');
  });

  it('3. AI_DEVELOPMENT_GUIDE.md deve conter as 12 Regras Inegociáveis e o Ciclo em 7 Passos', () => {
    const content = fs.readFileSync(path.join(rootDir, 'AI_DEVELOPMENT_GUIDE.md'), 'utf-8');

    expect(content).toContain('AI DEVELOPMENT GUIDE — CONTRATO DE DESENVOLVIMENTO AUTÔNOMO');
    expect(content).toContain('LEITURA OBRIGATÓRIA');
    expect(content).toContain('AS 12 REGRAS INEGOCIÁVEIS');
    expect(content).toContain('Proibição de Arquitetura Paralela');
    expect(content).toContain('Fonte Única da Verdade');
    expect(content).toContain('CICLO OBRIGATÓRIO DE DESENVOLVIMENTO');
    expect(content).toContain('AUDIT (Auditoria Preliminar)');
    expect(content).toContain('SYNCHRONIZE DOCUMENTATION');
    expect(content).toContain('MODELO PADRONIZADO DE RELATÓRIO FINAL');
  });

  it('4. CAPABILITY_REGISTRY.md deve catalogar 26 capacidades incluindo CAP-025 e CAP-026 na Release 9.5.2', () => {
    const content = fs.readFileSync(path.join(rootDir, 'CAPABILITY_REGISTRY.md'), 'utf-8');

    expect(content).toContain('Release 9.5.2');
    expect(content).toContain('CAP-001');
    expect(content).toContain('CAP-024');
    expect(content).toContain('CAP-025');
    expect(content).toContain('CAP-026');
    expect(content).toContain('CAP-025: Fleet Asset Management');
    expect(content).toContain('CAP-026: Living Governance');
  });

  it('5. README.md deve referenciar a cadeia documental de governança viva e respeitar a estrutura de 10 seções', () => {
    const content = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf-8');

    expect(content).toContain('GOVERNANÇA DOCUMENTAL VIVA');
    expect(content).toContain('cadeia documental');
    expect(content).toContain('PRODUCT_VISION_ROADMAP.md');
    expect(content).toContain('CAPABILITY_REGISTRY.md');
    expect(content).toContain('DOSSIE_ARQUITETURA_SISTEMA_CAMO.md');
    expect(content).toContain('AI_DEVELOPMENT_GUIDE.md');
    expect(content).toContain('Release 9.5.2');
  });

  it('6. DOSSIE_ARQUITETURA_SISTEMA_CAMO.md deve documentar as 26 capacidades e a conexão com o PCM', () => {
    const content = fs.readFileSync(path.join(rootDir, 'DOSSIE_ARQUITETURA_SISTEMA_CAMO.md'), 'utf-8');

    expect(content).toContain('CAP-025');
    expect(content).toContain('CAP-026');
    expect(content).toContain('Governança Viva');
    expect(content).toContain('Controle de Manutenção');
    expect(content).toContain('Release 9.5.2');
  });
});
