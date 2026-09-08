import { describe, it, expect } from 'vitest';
import { 
  HELP_ARTICLES, 
  GLOSSARY_TERMS, 
  GUIDED_CAMO_WORKFLOW, 
  MODULE_CONTEXTUAL_HELP,
  DOCUMENTATION_METADATA 
} from '../src/data/helpCenterData';
import { helpCenterService } from '../server/helpCenterService';

describe('FASE 8 — Central de Ajuda, Manual e Guided CAMO Workflow', () => {
  
  describe('1. Integridade Estrutural e Cobertura do Manual de Utilização', () => {
    it('deve possuir pelo menos 17 artigos detalhados cobrindo todos os módulos do CAMO Engine', () => {
      expect(HELP_ARTICLES.length).toBeGreaterThanOrEqual(17);
    });

    it('todos os artigos devem possuir estrutura completa e não vazia', () => {
      for (const article of HELP_ARTICLES) {
        expect(article.id).toBeDefined();
        expect(article.id.length).toBeGreaterThan(0);
        expect(article.title).toBeDefined();
        expect(article.title.length).toBeGreaterThan(5);
        expect(article.subtitle).toBeDefined();
        expect(article.category).toBeDefined();
        expect(article.summary).toBeDefined();
        expect(article.summary.length).toBeGreaterThan(20);
        
        // Key Takeaways mínimos
        expect(Array.isArray(article.keyTakeaways)).toBe(true);
        expect(article.keyTakeaways.length).toBeGreaterThanOrEqual(3);
        
        // Regra operacional explícita
        expect(article.operationalRule).toBeDefined();
        expect(article.operationalRule.length).toBeGreaterThan(15);
        
        // Conteúdo detalhado aprofundado
        expect(article.detailedContent).toBeDefined();
        expect(article.detailedContent.length).toBeGreaterThan(200);
        
        // Gatilhos de Human Review obrigatório
        expect(Array.isArray(article.whenToUseHumanReview)).toBe(true);
        expect(article.whenToUseHumanReview.length).toBeGreaterThanOrEqual(2);
        
        // Consequências da não conformidade
        expect(article.consequences).toBeDefined();
        expect(article.consequences.length).toBeGreaterThan(15);
        
        // Termos do glossário relacionados
        expect(Array.isArray(article.relatedGlossaryTerms)).toBe(true);
        expect(article.relatedGlossaryTerms.length).toBeGreaterThanOrEqual(1);

        // Mapeamento de tela/view correspondente
        expect(article.relatedModuleView).toBeDefined();
        expect(article.version).toBe('8.0.0');
      }
    });

    it('deve cobrir todas as 8 categorias de conhecimento regulatório', () => {
      const categories = new Set(HELP_ARTICLES.map(a => a.category));
      expect(categories.has('FOUNDATION')).toBe(true);
      expect(categories.has('FLEET')).toBe(true);
      expect(categories.has('REGULATORY')).toBe(true);
      expect(categories.has('COMPLIANCE')).toBe(true);
      expect(categories.has('EVIDENCE')).toBe(true);
      expect(categories.has('AIRWORTHINESS')).toBe(true);
      expect(categories.has('DELIVERY')).toBe(true);
      expect(categories.has('OPERATIONS')).toBe(true);
    });

    it('deve explicar claramente a tríade: Requirement vs Obligation vs Evidence', () => {
      const triadArticle = HELP_ARTICLES.find(a => a.id === 'art-triad-req-obl-evid');
      expect(triadArticle).toBeDefined();
      expect(triadArticle?.detailedContent).toContain('Requirement');
      expect(triadArticle?.detailedContent).toContain('Obligation');
      expect(triadArticle?.detailedContent).toContain('Evidence');
      expect(triadArticle?.operationalRule).toContain('proibido alterar o Requirement');
    });

    it('deve explicar o desacoplamento entre Compliance e Operational Airworthiness (Fase 6.4.1)', () => {
      const deouplingArticle = HELP_ARTICLES.find(a => a.id === 'art-airworthiness-decoupling');
      expect(deouplingArticle).toBeDefined();
      expect(deouplingArticle?.detailedContent).toContain('Desacoplamento');
      expect(deouplingArticle?.detailedContent).toContain('canFly');
      expect(deouplingArticle?.keyTakeaways.some(k => k.includes('Compliance NÃO é Airworthiness'))).toBe(true);
    });

    it('deve detalhar os critérios de entrega e aquisição de aeronaves (Fase 7)', () => {
      const deliveryArticle = HELP_ARTICLES.find(a => a.id === 'art-delivery-assessment-audit');
      expect(deliveryArticle).toBeDefined();
      expect(deliveryArticle?.detailedContent).toContain('SHA-256');
      expect(deliveryArticle?.detailedContent).toContain('Lessor');
      expect(deliveryArticle?.detailedContent).toContain('Sandbox');
    });
  });

  describe('2. Guided CAMO Workflow em 6 Etapas Contínuas', () => {
    it('deve conter exatamente 6 etapas contínuas ordenadas de 1 a 6', () => {
      expect(GUIDED_CAMO_WORKFLOW.length).toBe(6);
      GUIDED_CAMO_WORKFLOW.forEach((step, index) => {
        expect(step.stepNumber).toBe(index + 1);
      });
    });

    it('cada etapa deve responder obrigatoriamente às 6 perguntas operacionais fundamentais', () => {
      for (const step of GUIDED_CAMO_WORKFLOW) {
        expect(step.stageId).toBeDefined();
        expect(step.module).toBeDefined();
        expect(step.title).toBeDefined();
        expect(step.summary).toBeDefined();

        // 1. Onde estou?
        expect(step.whereAmI).toBeDefined();
        expect(step.whereAmI.length).toBeGreaterThan(15);

        // 2. O que esta etapa faz?
        expect(step.whatItDoes).toBeDefined();
        expect(step.whatItDoes.length).toBeGreaterThan(20);

        // 3. O que preciso fornecer?
        expect(step.whatToProvide).toBeDefined();
        expect(step.whatToProvide.length).toBeGreaterThan(15);

        // 4. O que o sistema determina?
        expect(step.whatSystemDetermines).toBeDefined();
        expect(step.whatSystemDetermines.length).toBeGreaterThan(20);

        // 5. O que exige Human Review?
        expect(step.whatRequiresHumanReview).toBeDefined();
        expect(step.whatRequiresHumanReview.length).toBeGreaterThan(20);

        // 6. Qual é o próximo passo?
        expect(step.nextStep).toBeDefined();
        expect(step.nextStep.length).toBeGreaterThan(15);

        // Links de artigos relacionados válidos
        expect(step.relatedArticleIds.length).toBeGreaterThanOrEqual(1);
        for (const artId of step.relatedArticleIds) {
          const exists = HELP_ARTICLES.some(a => a.id === artId);
          expect(exists).toBe(true);
        }
      }
    });

    it('deve refletir a sequência correta da esteira CAMO', () => {
      expect(GUIDED_CAMO_WORKFLOW[0].module).toBe('Fleet Inventory');
      expect(GUIDED_CAMO_WORKFLOW[1].module).toBe('Regulatory Sources & Pipeline');
      expect(GUIDED_CAMO_WORKFLOW[2].module).toBe('AD Analysis & Extraction');
      expect(GUIDED_CAMO_WORKFLOW[3].module).toBe('Compliance Obligations & Due Dates');
      expect(GUIDED_CAMO_WORKFLOW[4].module).toBe('Evidence Verification');
      expect(GUIDED_CAMO_WORKFLOW[5].module).toBe('Airworthiness & Delivery Clearance');
    });
  });

  describe('3. Glossário Técnico Especializado CAMO', () => {
    it('deve possuir mais de 20 termos rigorosamente definidos', () => {
      expect(GLOSSARY_TERMS.length).toBeGreaterThanOrEqual(20);
    });

    it('todos os termos devem conter definições operacionais e referências normativas', () => {
      for (const term of GLOSSARY_TERMS) {
        expect(term.term).toBeDefined();
        expect(term.term.length).toBeGreaterThan(1);
        expect(term.category).toBeDefined();
        expect(term.definition).toBeDefined();
        expect(term.definition.length).toBeGreaterThan(20);
        expect(term.operationalRole).toBeDefined();
        expect(term.operationalRole.length).toBeGreaterThan(15);
        expect(term.authorityReference).toBeDefined();
      }
    });

    it('termos críticos da aviação civil devem estar indexados', () => {
      const termsIndex = GLOSSARY_TERMS.map(t => (t.acronym || t.term).toUpperCase());
      expect(termsIndex.some(t => t.includes('AD'))).toBe(true);
      expect(termsIndex.some(t => t.includes('AMOC'))).toBe(true);
      expect(termsIndex.some(t => t.includes('SB'))).toBe(true);
      expect(termsIndex.some(t => t.includes('CRS'))).toBe(true);
      expect(termsIndex.some(t => t.includes('FORM 1') || t.includes('8130-3'))).toBe(true);
      expect(termsIndex.some(t => t.includes('DUE DATE') || t.includes('THRESHOLD'))).toBe(true);
      expect(termsIndex.some(t => t.includes('HUMAN REVIEW'))).toBe(true);
      expect(termsIndex.some(t => t.includes('AIRWORTHINESS'))).toBe(true);
      expect(termsIndex.some(t => t.includes('DELIVERY'))).toBe(true);
      expect(termsIndex.some(t => t.includes('SHA-256'))).toBe(true);
    });
  });

  describe('4. Mecanismo de Busca Determinístico (HelpCenterService)', () => {
    it('deve retornar resultados vazios para busca em branco sem falhar', () => {
      const res = helpCenterService.search('');
      expect(res.totalResults).toBe(0);
      expect(res.results).toEqual([]);
    });

    it('deve encontrar artigos e termos quando buscado por "Airworthiness"', () => {
      const res = helpCenterService.search('Airworthiness');
      expect(res.totalResults).toBeGreaterThan(0);
      expect(res.results.some(r => r.title.toLowerCase().includes('airworthiness'))).toBe(true);
    });

    it('deve encontrar termos e artigos ao buscar por "AMOC"', () => {
      const res = helpCenterService.search('AMOC');
      expect(res.totalResults).toBeGreaterThan(0);
      const amocTerm = res.results.find(r => r.id.includes('AMOC') || r.title.includes('AMOC'));
      expect(amocTerm).toBeDefined();
      expect(amocTerm?.score).toBeGreaterThan(50);
    });

    it('deve ranquear no topo a correspondência exata de título ou acrônimo', () => {
      const res = helpCenterService.search('AD');
      expect(res.totalResults).toBeGreaterThan(0);
      expect(res.results[0].score).toBeGreaterThanOrEqual(100);
    });

    it('deve respeitar filtros de categoria', () => {
      const res = helpCenterService.search('Airworthiness', 'AIRWORTHINESS');
      for (const item of res.results) {
        if (item.type === 'ARTICLE') {
          expect(item.category).toBe('AIRWORTHINESS');
        }
      }
    });

    it('deve retornar artigo específico por ID', () => {
      const article = helpCenterService.getArticleById('art-applicability-rules');
      expect(article).toBeDefined();
      expect(article?.title).toContain('Applicability');
    });

    it('deve retornar null para ID inexistente', () => {
      const article = helpCenterService.getArticleById('art-inexistente-123');
      expect(article).toBeNull();
    });
  });

  describe('5. Ajuda Contextual de Módulos (ModuleContextHelp)', () => {
    const modules = [
      'dashboard',
      'fleet',
      'regulatory',
      'obligations',
      'ads',
      'detail',
      'upload',
      'knowledge',
      'fapt',
      'audit',
      'architecture',
      'delivery'
    ];

    it('todos os módulos operacionais devem possuir guia contextual configurado', () => {
      for (const mod of modules) {
        const guide = MODULE_CONTEXTUAL_HELP[mod];
        expect(guide).toBeDefined();
        expect(guide.moduleId).toBe(mod);
        expect(guide.moduleName.length).toBeGreaterThan(3);
        expect(guide.whatAmISeeing.length).toBeGreaterThan(15);
        expect(guide.whatItMeans.length).toBeGreaterThan(15);
        expect(guide.whatShouldIDoNow.length).toBeGreaterThan(15);
        expect(guide.consequences.length).toBeGreaterThan(15);
        expect(guide.whenToSendToHumanReview.length).toBeGreaterThanOrEqual(2);
        expect(guide.primaryArticleId).toBeDefined();
        
        // Verifica se o artigo primário existe
        const article = HELP_ARTICLES.find(a => a.id === guide.primaryArticleId);
        expect(article).toBeDefined();
      }
    });
  });

  describe('6. Versionamento e Governança Documental', () => {
    it('deve possuir versão 8.0.0 com status HOMOLOGATED', () => {
      const meta = DOCUMENTATION_METADATA;
      expect(meta.version).toBe('8.0.0');
      expect(meta.status).toBe('HOMOLOGATED');
      expect(meta.releaseDate).toBeDefined();
      expect(meta.authorityCompliance.length).toBeGreaterThanOrEqual(3);
      expect(meta.revisionHistory.length).toBeGreaterThanOrEqual(8);
    });

    it('o histórico de revisões deve registrar as Fases 1 a 8', () => {
      const versions = DOCUMENTATION_METADATA.revisionHistory.map(r => r.version);
      expect(versions).toContain('8.0.0');
      expect(versions).toContain('7.0.0');
      expect(versions).toContain('6.4.1');
      expect(versions).toContain('6.3.0');
      expect(versions).toContain('6.2.0');
    });
  });
});
