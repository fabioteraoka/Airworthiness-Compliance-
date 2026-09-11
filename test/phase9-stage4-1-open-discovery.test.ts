import { describe, it, expect } from 'vitest';
import { 
  regulatoryIntelligenceEngine, 
  normalizeAeronauticalQuery 
} from '../server/camoEngine/regulatoryIntelligenceEngine';

describe('CAMO Engine — Phase 9 Stage 4.1: Regulatory Discovery Audit & Open Aircraft Family Model', () => {

  it('1. Deve normalizar consultas aeronáuticas abertas para qualquer modelo sem lista fechada', () => {
    // Airbus A320
    const a320 = normalizeAeronauticalQuery({ query: 'Airbus A320-200' });
    expect(a320.family).toBe('A320');
    expect(a320.manufacturer).toBe('Airbus');
    expect(a320.searchTerms).toContain('Airbus A320');

    // Boeing 777-300ER (fora do quarteto tradicional)
    const b777 = normalizeAeronauticalQuery({ query: 'Boeing 777-300ER' });
    expect(b777.family).toBe('777');
    expect(b777.manufacturer).toBe('Boeing');
    expect(b777.searchTerms[0]).toContain('Boeing 777');

    // Pilatus PC-12 (aviação executiva/utilitária)
    const pc12 = normalizeAeronauticalQuery({ query: 'Pilatus PC-12/47E' });
    expect(pc12.manufacturer).toBe('Pilatus');
    expect(pc12.family).toBe('PC-12');
    expect(pc12.searchTerms[0]).toContain('Pilatus PC-12');

    // Gulfstream G650
    const g650 = normalizeAeronauticalQuery({ query: 'Gulfstream G650' });
    expect(g650.manufacturer).toBe('Gulfstream');
    expect(g650.family).toBe('G650');

    // Modelo totalmente customizado pelo usuário
    const custom = normalizeAeronauticalQuery({ query: 'Diamond DA42 Twin Star' });
    expect(custom.rawQuery).toContain('Diamond DA42 Twin Star');
    expect(custom.searchTerms.length).toBeGreaterThan(0);
  });

  it('2. Deve realizar busca aberta e produzir o RegulatoryDiscoveryDiagnostic completo', async () => {
    const res = await regulatoryIntelligenceEngine.searchCandidatesByFamilyOrModel({
      query: 'Airbus A320',
      perPage: 25
    });

    expect(res).toBeDefined();
    expect(res.diagnostic).toBeDefined();
    expect(res.diagnosticReportText).toBeDefined();

    // Validação da auditoria por autoridade (FAA, EASA, ANAC)
    const diag = res.diagnostic;
    expect(diag.query).toBe('Airbus A320');
    expect(diag.authorities.FAA).toBeDefined();
    expect(diag.authorities.EASA).toBeDefined();
    expect(diag.authorities.ANAC).toBeDefined();

    // Verificação dos campos do pipeline auditável
    expect(typeof diag.authorities.FAA.rawRetrieved).toBe('number');
    expect(typeof diag.authorities.FAA.normalized).toBe('number');
    expect(typeof diag.authorities.FAA.candidatesBeforeFilter).toBe('number');
    expect(typeof diag.authorities.FAA.candidatesAfterFilter).toBe('number');
    expect(typeof diag.authorities.FAA.duplicatesRemoved).toBe('number');
    expect(typeof diag.authorities.FAA.finalCandidates).toBe('number');

    // Totais do funil
    expect(diag.totals.finalCandidates).toBe(res.candidates.length);
    expect(diag.totals.finalCandidates).toBe(
      diag.authorities.FAA.finalCandidates +
      diag.authorities.EASA.finalCandidates +
      diag.authorities.ANAC.finalCandidates
    );
  });

  it('3. Deve formatar o relatório de diagnóstico textual conforme padrão da Seção 6', async () => {
    const res = await regulatoryIntelligenceEngine.searchCandidatesByFamilyOrModel({
      query: 'Boeing 737',
      perPage: 25
    });

    const report = res.diagnosticReportText;
    expect(report).toContain('REGULATORY DISCOVERY DIAGNOSTIC');
    expect(report).toContain('Query:');
    expect(report).toContain('Boeing 737');
    expect(report).toContain('FAA');
    expect(report).toContain('EASA');
    expect(report).toContain('ANAC');
    expect(report).toContain('Raw records retrieved:');
    expect(report).toContain('Records after normalization:');
    expect(report).toContain('Candidates before filtering:');
    expect(report).toContain('Candidates after filtering:');
    expect(report).toContain('Duplicates removed:');
    expect(report).toContain('Final candidates:');
    expect(report).toContain('TOTAL');
  });

  it('4. Deve filtrar por autoridade e manter rastreabilidade precisa', async () => {
    const faaOnly = await regulatoryIntelligenceEngine.searchCandidatesByFamilyOrModel({
      query: 'A320',
      authority: 'FAA'
    });

    expect(faaOnly.candidates.every(c => c.authority === 'FAA')).toBe(true);
    expect(faaOnly.diagnostic.authorities.EASA.finalCandidates).toBe(0);
    expect(faaOnly.diagnostic.authorities.ANAC.finalCandidates).toBe(0);
    expect(faaOnly.diagnostic.authorities.FAA.finalCandidates).toBe(faaOnly.candidates.length);
  });

  it('5. Deve suportar paginação e metadados de paginação configuráveis', async () => {
    const page1 = await regulatoryIntelligenceEngine.searchCandidatesByFamilyOrModel({
      query: 'Airbus A320',
      page: 1,
      perPage: 10
    });

    expect(page1.pagination.page).toBe(1);
    expect(page1.pagination.perPage).toBe(10);
    expect(page1.pagination.totalPages).toBeGreaterThanOrEqual(1);
    expect(page1.pagination.totalDiscovered).toBeGreaterThanOrEqual(page1.candidates.length);
  });
});
