import { 
  HELP_ARTICLES, 
  GLOSSARY_TERMS, 
  GUIDED_CAMO_WORKFLOW, 
  MODULE_CONTEXTUAL_HELP, 
  DOCUMENTATION_METADATA,
  HelpArticle,
  GlossaryTerm,
  GuidedWorkflowStep,
  ModuleContextHelp,
  DocumentationMetadata
} from '../src/data/helpCenterData';

export interface SearchResultItem {
  type: 'ARTICLE' | 'GLOSSARY' | 'WORKFLOW_STEP';
  id: string;
  title: string;
  subtitle?: string;
  snippet: string;
  category: string;
  score: number;
  highlightTerms: string[];
  linkId: string;
  viewId?: string;
}

export interface SearchResponse {
  query: string;
  categoryFilter?: string;
  totalResults: number;
  results: SearchResultItem[];
  tookMs: number;
}

export class HelpCenterService {
  private articles: HelpArticle[] = HELP_ARTICLES;
  private glossary: GlossaryTerm[] = GLOSSARY_TERMS;
  private workflow: GuidedWorkflowStep[] = GUIDED_CAMO_WORKFLOW;
  private contextual: Record<string, ModuleContextHelp> = MODULE_CONTEXTUAL_HELP;
  private metadata: DocumentationMetadata = DOCUMENTATION_METADATA;

  public getMetadata(): DocumentationMetadata {
    return this.metadata;
  }

  public getAllArticles(category?: string): HelpArticle[] {
    if (!category || category === 'ALL') {
      return this.articles;
    }
    return this.articles.filter(a => a.category === category);
  }

  public getArticleById(id: string): HelpArticle | null {
    const article = this.articles.find(a => a.id === id);
    return article || null;
  }

  public getAllGlossaryTerms(category?: string): GlossaryTerm[] {
    if (!category || category === 'ALL') {
      return this.glossary;
    }
    return this.glossary.filter(g => g.category === category);
  }

  public getGlossaryTermByName(termName: string): GlossaryTerm | null {
    const clean = termName.toLowerCase().trim();
    return this.glossary.find(g => 
      g.term.toLowerCase() === clean || 
      (g.acronym && g.acronym.toLowerCase() === clean)
    ) || null;
  }

  public getWorkflowSteps(): GuidedWorkflowStep[] {
    return this.workflow;
  }

  public getWorkflowStepByNumber(num: number): GuidedWorkflowStep | null {
    return this.workflow.find(s => s.stepNumber === num) || null;
  }

  public getContextualHelp(moduleId: string): ModuleContextHelp | null {
    return this.contextual[moduleId] || null;
  }

  /**
   * Deterministic, relevance-weighted search engine across all documentation assets.
   * Ranks exact title/term matches highest, followed by acronyms, key takeaways, and content body.
   */
  public search(rawQuery: string, categoryFilter?: string): SearchResponse {
    const startTime = Date.now();
    const query = (rawQuery || '').trim().toLowerCase();

    if (!query) {
      return {
        query: '',
        categoryFilter,
        totalResults: 0,
        results: [],
        tookMs: 0
      };
    }

    const queryTokens = query.split(/\s+/).filter(t => t.length > 0);
    const results: SearchResultItem[] = [];

    // 1. Search Glossary Terms
    for (const item of this.glossary) {
      if (categoryFilter && categoryFilter !== 'ALL' && categoryFilter !== 'GLOSSARY' && item.category !== categoryFilter) {
        continue;
      }

      let score = 0;
      const termLower = item.term.toLowerCase();
      const acronymLower = (item.acronym || '').toLowerCase();
      const defLower = item.definition.toLowerCase();
      const roleLower = item.operationalRole.toLowerCase();

      // Exact phrase match in term or acronym
      if (termLower === query || acronymLower === query) {
        score += 100;
      } else if (termLower.includes(query) || acronymLower.includes(query)) {
        score += 60;
      }

      // Token matches
      for (const token of queryTokens) {
        if (termLower.includes(token)) score += 20;
        if (acronymLower.includes(token)) score += 30;
        if (defLower.includes(token)) score += 5;
        if (roleLower.includes(token)) score += 5;
      }

      if (score > 0) {
        results.push({
          type: 'GLOSSARY',
          id: `glossary-${item.term}`,
          title: item.acronym ? `${item.term} (${item.acronym})` : item.term,
          subtitle: `Glossário • Categoria: ${item.category}`,
          snippet: item.definition.length > 180 ? item.definition.slice(0, 180) + '...' : item.definition,
          category: item.category,
          score,
          highlightTerms: queryTokens,
          linkId: item.term
        });
      }
    }

    // 2. Search Articles
    for (const article of this.articles) {
      if (categoryFilter && categoryFilter !== 'ALL' && article.category !== categoryFilter) {
        continue;
      }

      let score = 0;
      const titleLower = article.title.toLowerCase();
      const subtitleLower = article.subtitle.toLowerCase();
      const summaryLower = article.summary.toLowerCase();
      const contentLower = article.detailedContent.toLowerCase();
      const takeawaysLower = article.keyTakeaways.join(' ').toLowerCase();

      // Exact phrase match
      if (titleLower === query) {
        score += 120;
      } else if (titleLower.includes(query)) {
        score += 70;
      } else if (subtitleLower.includes(query)) {
        score += 40;
      }

      // Token matches
      for (const token of queryTokens) {
        if (titleLower.includes(token)) score += 25;
        if (subtitleLower.includes(token)) score += 15;
        if (summaryLower.includes(token)) score += 10;
        if (takeawaysLower.includes(token)) score += 10;
        if (contentLower.includes(token)) score += 3;
      }

      if (score > 0) {
        results.push({
          type: 'ARTICLE',
          id: article.id,
          title: article.title,
          subtitle: article.subtitle,
          snippet: article.summary,
          category: article.category,
          score,
          highlightTerms: queryTokens,
          linkId: article.id,
          viewId: article.relatedModuleView
        });
      }
    }

    // 3. Search Guided Workflow Steps
    for (const step of this.workflow) {
      let score = 0;
      const titleLower = step.title.toLowerCase();
      const summaryLower = step.summary.toLowerCase();
      const whatItDoesLower = step.whatItDoes.toLowerCase();
      const moduleLower = step.module.toLowerCase();

      if (titleLower.includes(query) || moduleLower.includes(query)) {
        score += 50;
      }
      for (const token of queryTokens) {
        if (titleLower.includes(token)) score += 20;
        if (moduleLower.includes(token)) score += 15;
        if (summaryLower.includes(token)) score += 8;
        if (whatItDoesLower.includes(token)) score += 5;
      }

      if (score > 0) {
        results.push({
          type: 'WORKFLOW_STEP',
          id: `step-${step.stepNumber}`,
          title: `Passo ${step.stepNumber}: ${step.title}`,
          subtitle: `Guided Workflow • Módulo: ${step.module}`,
          snippet: step.summary,
          category: 'WORKFLOW',
          score,
          highlightTerms: queryTokens,
          linkId: step.stageId,
          viewId: step.viewId
        });
      }
    }

    // Deterministic sorting by score descending, then by title ascending
    results.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.title.localeCompare(b.title);
    });

    const tookMs = Date.now() - startTime;

    return {
      query,
      categoryFilter,
      totalResults: results.length,
      results,
      tookMs
    };
  }
}

export const helpCenterService = new HelpCenterService();
