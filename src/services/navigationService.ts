/**
 * CAMO Engine — Navigation Service & Canonical Routing Engine (v2.1)
 *
 * Provides a single source of truth for application routing,
 * deep linking via URL Hash, backward compatibility aliases,
 * business-labeled breadcrumbs without raw UUIDs, and contextual state preservation.
 */

import { DatabaseState } from '../../server/dataStore';

// 8 Primary Navigation Routes defined in Architecture v2.1
export type PrimaryView = 
  | 'dashboard'
  | 'fleet'
  | 'delivery'
  | 'regulatory-intel'
  | 'ads'
  | 'technical-references'
  | 'obligations'
  | 'knowledge'
  | 'governance'
  // Contextual views & backward-compat legacy views
  | 'detail'
  | 'fleet-ad-search'
  | 'analysis-phase'
  | 'camo-register'
  | 'regulatory'
  | 'upload'
  | 'fapt'
  | 'audit'
  | 'architecture'
  | 'help';

export const PRIMARY_NAVIGATION_ENTRIES: PrimaryView[] = [
  'dashboard',
  'fleet',
  'delivery',
  'regulatory-intel',
  'ads',
  'technical-references',
  'obligations',
  'governance'
];

export interface WorkspaceDefinition {
  id: string;
  name: string;
  badge?: string;
  items: Array<{
    id: PrimaryView;
    label: string;
    description: string;
  }>;
}

export const CANONICAL_WORKSPACES: WorkspaceDefinition[] = [
  {
    id: 'w1-fleet-operations',
    name: 'Frota & Operações',
    items: [
      { id: 'fleet', label: 'Gestão da Frota', description: 'Aeronaves, Motores, Componentes e Matriz Frota × AD' },
      { id: 'delivery', label: 'Delivery & Pré-Compra', description: 'Transição, Aquisição e Redelivery Técnico' }
    ]
  },
  {
    id: 'w2-regulatory-engineering',
    name: 'Engenharia Regulatória',
    items: [
      { id: 'regulatory-intel', label: 'Inteligência Regulatória', description: 'Descoberta Operacional, Fontes Oficiais & Vault' },
      { id: 'ads', label: 'Diretrizes (ADs)', description: 'Acervo Ativo, Mesa de Análise IA e Extração' },
      { id: 'technical-references', label: 'Referências Técnicas (SB/RB)', description: 'Service Bulletins, Documentos OEM e Validação Cruzada' }
    ]
  },
  {
    id: 'w3-compliance-airworthiness',
    name: 'Conformidade & Aeronavegabilidade',
    items: [
      { id: 'obligations', label: 'Obrigações & Prazos Limites', description: 'Due Dates, Timeline Temporal e Acervo FAPT' }
    ]
  },
  {
    id: 'w4-governance-knowledge-system',
    name: 'Governança, Conhecimento & Sistema',
    items: [
      { id: 'governance', label: 'Governança & Suporte', description: 'Auditoria, Manual CAMO, Dossiê e Base de Conhecimento' }
    ]
  }
];

/**
 * Resolves the primary sidebar navigation item for any given view (handling detail & legacy aliases)
 */
export function getPrimaryNavForView(view: PrimaryView | string): PrimaryView {
  if (view === 'detail') return 'ads';
  if (view === 'knowledge') return 'governance';
  if (view in LEGACY_ROUTE_ALIASES) {
    const aliasView = LEGACY_ROUTE_ALIASES[view].view;
    return aliasView === 'knowledge' ? 'governance' : aliasView;
  }
  return view as PrimaryView;
}

// Detailed SubTab identifiers per workspace
export type FleetSubTab = 'aircraft' | 'engines' | 'components' | 'fleet-matrix';
export type RegulatoryIntelSubTab = 'discovery' | 'connectors' | 'vault';
export type AdsSubTab = 'active' | 'analysis' | 'upload';
export type AdDetailSubTab = 'matrix' | 'document' | 'technical-refs' | 'questions' | 'fapt' | 'evidence' | 'audit';
export type TechnicalReferencesSubTab = 'all' | 'pending' | 'matrix';
export type ObligationsSubTab = 'timeline' | 'rules-sandbox' | 'fapt-repository';
export type KnowledgeSubTab = 'missing-data' | 'facts';
export type GovernanceSubTab = 'audit' | 'manual' | 'dossier';

export interface NavigationContext {
  fromView?: PrimaryView;
  fromSubTab?: string;
  searchQuery?: string;
  filters?: Record<string, any>;
  page?: number;
  timestamp?: number;
}

export interface NavigationState {
  view: PrimaryView;
  subTab?: string;
  entityId?: string | null;
  entityTitle?: string | null;
  helpArticleId?: string;
  context?: NavigationContext;
}

export interface BreadcrumbItem {
  id: string;
  label: string;
  view: PrimaryView;
  subTab?: string;
  entityId?: string;
  clickable: boolean;
  iconName?: string;
}

// Map legacy views to the new v2.1 canonical targets
export const LEGACY_ROUTE_ALIASES: Record<string, { view: PrimaryView; subTab?: string }> = {
  'analysis-phase': { view: 'ads', subTab: 'analysis' },
  'camo-register': { view: 'ads', subTab: 'active' },
  'regulatory': { view: 'regulatory-intel', subTab: 'connectors' },
  'fleet-ad-search': { view: 'fleet', subTab: 'fleet-matrix' },
  'upload': { view: 'ads', subTab: 'upload' },
  'fapt': { view: 'obligations', subTab: 'fapt-repository' },
  'audit': { view: 'governance', subTab: 'audit' },
  'architecture': { view: 'governance', subTab: 'dossier' },
  'help': { view: 'governance', subTab: 'manual' },
};

// Friendly labels for Primary Views
export const VIEW_DISPLAY_NAMES: Record<PrimaryView, string> = {
  'dashboard': 'Dashboard Operacional',
  'fleet': 'Gestão da Frota',
  'delivery': 'Delivery & Pré-Compra',
  'regulatory-intel': 'Inteligência & Descoberta',
  'ads': 'Diretrizes de Aeronavegabilidade',
  'technical-references': 'Documentos do Fabricante (SB/RB)',
  'obligations': 'Obrigações & Prazos Limites',
  'knowledge': 'Base de Conhecimento',
  'governance': 'Governança & Suporte',
  // Legacy / Contextual displays
  'detail': 'Ficha da Diretriz',
  'fleet-ad-search': 'Matriz Frota × Diretrizes',
  'analysis-phase': 'Fase de Análise',
  'camo-register': 'Registro Regulatório',
  'regulatory': 'Fontes & Conectores',
  'upload': 'Upload de Diretriz',
  'fapt': 'Relatórios FAPT',
  'audit': 'Trilha de Auditoria',
  'architecture': 'Dossiê de Arquitetura',
  'help': 'Central de Suporte & Manuais',
};

// SubTab Friendly Names
export const SUBTAB_DISPLAY_NAMES: Record<string, string> = {
  'aircraft': 'Aeronaves',
  'engines': 'Motores',
  'components': 'Componentes',
  'fleet-matrix': 'Matriz Frota × Diretrizes',
  'discovery': 'Descoberta Externa',
  'connectors': 'Conectores Oficiais',
  'vault': 'Cofre de Documentos',
  'active': 'Acervo da Frota',
  'analysis': 'Mesa de Análise IA',
  'upload': 'Nova Diretriz',
  'matrix': 'Matriz de Afetação',
  'document': 'Texto & Requisitos Oficiais',
  'technical-refs': 'Referências Técnicas & SBs',
  'questions': 'Esclarecimento de Lacunas',
  'fapt': 'Folha de Parecer Técnico',
  'evidence': 'Evidências & CRS',
  'audit': 'Trilha de Auditoria',
  'timeline': 'Linha do Tempo de Prazos',
  'rules-sandbox': 'Simulador de Regras',
  'fapt-repository': 'Acervo FAPT',
  'missing-data': 'Dados Ausentes',
  'facts': 'Memória Operacional',
  'manual': 'Manual Operacional CAMO',
  'dossier': 'Dossiê Institucional',
};

/**
 * Parses current location hash into a structured NavigationState
 * Supports:
 *   #/fleet
 *   #/fleet?tab=fleet-matrix
 *   #/ads/req-faa-2020-24-02
 *   #/ads/req-faa-2020-24-02/technical-refs
 *   #/governance?article=art-applicability-rules
 */
export function parseHashRoute(hashString: string = window.location.hash): NavigationState {
  const cleanHash = hashString.startsWith('#') ? hashString.substring(1) : hashString;
  const [pathPart, queryPart] = cleanHash.split('?');
  const segments = pathPart.split('/').filter(Boolean);

  const queryParams = new URLSearchParams(queryPart || '');
  const subTabFromQuery = queryParams.get('tab') || undefined;
  const articleFromQuery = queryParams.get('article') || undefined;

  if (segments.length === 0) {
    return { view: 'dashboard' };
  }

  const rawFirstSegment = segments[0] as PrimaryView;

  // Check if legacy alias
  if (LEGACY_ROUTE_ALIASES[rawFirstSegment]) {
    const alias = LEGACY_ROUTE_ALIASES[rawFirstSegment];
    return {
      view: alias.view,
      subTab: subTabFromQuery || alias.subTab,
      helpArticleId: articleFromQuery
    };
  }

  // AD Detail route: #/ads/:adId or #/ads/:adId/:subTab or #/detail/:adId
  if (rawFirstSegment === 'ads' && segments.length >= 2) {
    const adId = decodeURIComponent(segments[1]);
    const subTab = segments[2] || subTabFromQuery || 'matrix';
    return {
      view: 'detail',
      entityId: adId,
      subTab
    };
  }

  if (rawFirstSegment === 'detail' && segments.length >= 2) {
    const adId = decodeURIComponent(segments[1]);
    const subTab = segments[2] || subTabFromQuery || 'matrix';
    return {
      view: 'detail',
      entityId: adId,
      subTab
    };
  }

  // Normal view route: #/fleet, #/delivery, etc.
  return {
    view: rawFirstSegment,
    subTab: segments[1] || subTabFromQuery,
    helpArticleId: articleFromQuery
  };
}

/**
 * Builds the canonical hash URL string for a given state
 */
export function buildHashRoute(state: NavigationState): string {
  if (state.view === 'detail' && state.entityId) {
    const sub = state.subTab ? `/${encodeURIComponent(state.subTab)}` : '';
    return `#/ads/${encodeURIComponent(state.entityId)}${sub}`;
  }

  let route = `#/${state.view}`;
  const params = new URLSearchParams();

  if (state.subTab) {
    params.set('tab', state.subTab);
  }
  if (state.helpArticleId) {
    params.set('article', state.helpArticleId);
  }

  const queryString = params.toString();
  return queryString ? `${route}?${queryString}` : route;
}

/**
 * Resolves a human-friendly business label for an AD Requirement ID
 * (Ensures no raw UUIDs like req-743a... are presented to CAMO users)
 */
export function resolveAdBusinessLabel(adId: string, state: DatabaseState | null): string {
  if (!state) return adId;
  const req = state.requirements.find(r => r.id === adId);
  if (!req) {
    // Check camo register
    const reg = state.camoRegulatoryRegister?.find(r => r.id === adId || r.analyzedRequirementId === adId || r.analysisId === adId);
    if (reg) {
      return `${reg.authority} AD ${reg.adNumber}`;
    }
    return adId;
  }
  const sn = req.sourceNumber || '';
  if (sn.toLowerCase().includes(req.issuingAuthority.toLowerCase())) {
    return sn;
  }
  return `${req.issuingAuthority} AD ${sn}`;
}

/**
 * Resolves an aircraft registration label from an aircraft ID or reg
 */
export function resolveAircraftBusinessLabel(aircraftId: string, state: DatabaseState | null): string {
  if (!state) return aircraftId;
  const ac = state.aircraft.find(a => a.id === aircraftId || a.registration === aircraftId);
  if (ac) {
    return `${ac.registration} (${ac.model})`;
  }
  return aircraftId;
}

/**
 * Generates the breadcrumb hierarchy for the current navigation state
 */
export function generateBreadcrumbs(
  navState: NavigationState,
  dbState: DatabaseState | null
): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [];

  // Home root is always Dashboard
  breadcrumbs.push({
    id: 'dashboard',
    label: 'Dashboard Operacional',
    view: 'dashboard',
    clickable: navState.view !== 'dashboard'
  });

  if (navState.view === 'dashboard') {
    return breadcrumbs;
  }

  // Handle Detail view (AD)
  if (navState.view === 'detail' && navState.entityId) {
    // Parent depends on previousContext if coming from fleet
    if (navState.context?.fromView === 'fleet' || navState.context?.fromView === 'fleet-ad-search') {
      breadcrumbs.push({
        id: 'fleet',
        label: 'Gestão da Frota',
        view: 'fleet',
        subTab: 'fleet-matrix',
        clickable: true
      });
      breadcrumbs.push({
        id: 'fleet-matrix',
        label: 'Matriz Frota × Diretrizes',
        view: 'fleet',
        subTab: 'fleet-matrix',
        clickable: true
      });
    } else {
      breadcrumbs.push({
        id: 'ads-catalog',
        label: 'Diretrizes de Aeronavegabilidade',
        view: 'ads',
        subTab: 'active',
        clickable: true
      });
    }

    const adBusinessLabel = resolveAdBusinessLabel(navState.entityId, dbState);
    breadcrumbs.push({
      id: `ad-${navState.entityId}`,
      label: adBusinessLabel,
      view: 'detail',
      entityId: navState.entityId,
      subTab: navState.subTab || 'matrix',
      clickable: Boolean(navState.subTab && navState.subTab !== 'matrix')
    });

    if (navState.subTab && navState.subTab !== 'matrix') {
      breadcrumbs.push({
        id: `ad-subtab-${navState.subTab}`,
        label: SUBTAB_DISPLAY_NAMES[navState.subTab] || navState.subTab,
        view: 'detail',
        entityId: navState.entityId,
        subTab: navState.subTab,
        clickable: false
      });
    }

    return breadcrumbs;
  }

  // Primary view item
  const primaryName = VIEW_DISPLAY_NAMES[navState.view] || navState.view;
  breadcrumbs.push({
    id: navState.view,
    label: primaryName,
    view: navState.view,
    subTab: navState.subTab,
    clickable: Boolean(navState.subTab)
  });

  // Optional SubTab item
  if (navState.subTab) {
    const subTabName = SUBTAB_DISPLAY_NAMES[navState.subTab] || navState.subTab;
    breadcrumbs.push({
      id: `${navState.view}-${navState.subTab}`,
      label: subTabName,
      view: navState.view,
      subTab: navState.subTab,
      clickable: false
    });
  }

  return breadcrumbs;
}
