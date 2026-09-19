import { describe, it, expect } from 'vitest';
import {
  parseHashRoute,
  buildHashRoute,
  generateBreadcrumbs,
  resolveAdBusinessLabel,
  resolveAircraftBusinessLabel,
  LEGACY_ROUTE_ALIASES,
  NavigationState
} from '../src/services/navigationService';
import { DatabaseState } from '../server/dataStore';

describe('CAMO Navigation Foundation & Canonical Routing (Phase 1)', () => {
  const mockDbState = {
    aircraft: [
      { id: 'ac-01', registration: 'PR-GUO', model: '737-800' }
    ],
    requirements: [
      { id: 'req-01', sourceNumber: '2020-24-02', issuingAuthority: 'FAA', adNumber: '2020-24-02' }
    ],
    camoRegulatoryRegister: [
      { id: 'reg-01', authority: 'FAA', adNumber: '2024-12-05', analyzedRequirementId: 'req-02' }
    ]
  } as unknown as DatabaseState;

  describe('1. Canonical Hash Parsing (parseHashRoute)', () => {
    it('deve resolver hash vazio para view dashboard', () => {
      const state = parseHashRoute('');
      expect(state.view).toBe('dashboard');
    });

    it('deve resolver rotas canônicas de primeiro nível', () => {
      expect(parseHashRoute('#/fleet').view).toBe('fleet');
      expect(parseHashRoute('#/delivery').view).toBe('delivery');
      expect(parseHashRoute('#/regulatory-intel').view).toBe('regulatory-intel');
      expect(parseHashRoute('#/ads').view).toBe('ads');
      expect(parseHashRoute('#/technical-references').view).toBe('technical-references');
      expect(parseHashRoute('#/obligations').view).toBe('obligations');
      expect(parseHashRoute('#/knowledge').view).toBe('knowledge');
      expect(parseHashRoute('#/governance').view).toBe('governance');
    });

    it('deve extrair subTabs via query parameter', () => {
      const state = parseHashRoute('#/fleet?tab=fleet-matrix');
      expect(state.view).toBe('fleet');
      expect(state.subTab).toBe('fleet-matrix');
    });

    it('deve fazer parse de deep link de detalhe de AD com subTab', () => {
      const state = parseHashRoute('#/ads/req-01/technical-refs');
      expect(state.view).toBe('detail');
      expect(state.entityId).toBe('req-01');
      expect(state.subTab).toBe('technical-refs');
    });

    it('deve mapear rotas legadas para seus equivalentes canônicos com preservação de intenção', () => {
      for (const [legacyKey, alias] of Object.entries(LEGACY_ROUTE_ALIASES)) {
        const parsed = parseHashRoute(`#/${legacyKey}`);
        expect(parsed.view).toBe(alias.view);
        if (alias.subTab) {
          expect(parsed.subTab).toBe(alias.subTab);
        }
      }
    });
  });

  describe('2. Canonical Hash Building (buildHashRoute)', () => {
    it('deve construir rota canônica simples', () => {
      expect(buildHashRoute({ view: 'fleet' })).toBe('#/fleet');
      expect(buildHashRoute({ view: 'delivery' })).toBe('#/delivery');
    });

    it('deve construir rota com subTab em query string', () => {
      expect(buildHashRoute({ view: 'fleet', subTab: 'fleet-matrix' })).toBe('#/fleet?tab=fleet-matrix');
    });

    it('deve construir rota canônica de AD detail', () => {
      expect(buildHashRoute({ view: 'detail', entityId: 'req-01' })).toBe('#/ads/req-01');
      expect(buildHashRoute({ view: 'detail', entityId: 'req-01', subTab: 'technical-refs' })).toBe('#/ads/req-01/technical-refs');
    });
  });

  describe('3. Human-Friendly Business Labels', () => {
    it('deve resolver identificador amigável de AD sem expor UUIDs crús', () => {
      const label = resolveAdBusinessLabel('req-01', mockDbState);
      expect(label).toContain('FAA AD 2020-24-02');
    });

    it('deve resolver identificador amigável a partir do CAMO Register se não estiver em requirements', () => {
      const label = resolveAdBusinessLabel('reg-01', mockDbState);
      expect(label).toContain('FAA AD 2024-12-05');
    });

    it('deve resolver identificador amigável de aeronave com matrícula e modelo', () => {
      const label = resolveAircraftBusinessLabel('ac-01', mockDbState);
      expect(label).toBe('PR-GUO (737-800)');
    });
  });

  describe('4. Deterministic Breadcrumb Generation', () => {
    it('deve gerar breadcrumb para tela inicial Dashboard', () => {
      const crumbs = generateBreadcrumbs({ view: 'dashboard' }, mockDbState);
      expect(crumbs).toHaveLength(1);
      expect(crumbs[0].label).toBe('Dashboard Operacional');
      expect(crumbs[0].clickable).toBe(false);
    });

    it('deve gerar breadcrumbs hierárquicos para visão primária com subTab', () => {
      const crumbs = generateBreadcrumbs({ view: 'fleet', subTab: 'fleet-matrix' }, mockDbState);
      expect(crumbs).toHaveLength(3);
      expect(crumbs[0].view).toBe('dashboard');
      expect(crumbs[0].clickable).toBe(true);
      expect(crumbs[1].label).toBe('Gestão da Frota');
      expect(crumbs[1].clickable).toBe(true);
      expect(crumbs[2].label).toBe('Matriz Frota × Diretrizes');
      expect(crumbs[2].clickable).toBe(false);
    });

    it('deve gerar breadcrumb contextual quando navega para AD detail vindo da frota', () => {
      const navState: NavigationState = {
        view: 'detail',
        entityId: 'req-01',
        subTab: 'technical-refs',
        context: {
          fromView: 'fleet',
          fromSubTab: 'fleet-matrix'
        }
      };
      const crumbs = generateBreadcrumbs(navState, mockDbState);
      expect(crumbs.length).toBeGreaterThanOrEqual(4);
      expect(crumbs[0].label).toBe('Dashboard Operacional');
      expect(crumbs[1].label).toBe('Gestão da Frota');
      expect(crumbs[2].label).toBe('Matriz Frota × Diretrizes');
      expect(crumbs.some(c => c.label.includes('FAA AD 2020-24-02'))).toBe(true);
    });
  });
});
