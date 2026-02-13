/**
 * Reasoning Engine Tool - Chain of Thought (CoT)
 * 
 * Forces the LLM to think step-by-step before responding.
 * This produces more thoughtful, personalized responses.
 */

/**
 * Tool definition for structured reasoning
 */
export const reasoningTool = {
  type: "function",
  function: {
    name: "plan_response",
    description: `RECOMMANDÉ pour les cas complexes : Appelle cet outil pour structurer ta réflexion avant de répondre.

Cet outil structure ta pensée en 4 étapes:
1. COMPRENDRE - Quelle est l'intention réelle de l'utilisateur ?
2. ANALYSER - Que sais-tu du contexte (mémoire, préférences, historique) ?
3. PLANIFIER - Quelle stratégie de réponse adopter ?
4. ANTICIPER - Quelles seront les prochaines questions probables ?

QUAND L'UTILISER :
- Indécision utilisateur ("je sais pas", "aide-moi")
- Changement de sujet ou de phase
- Première interaction de la session
- Demandes complexes multi-critères

QUAND NE PAS L'UTILISER :
- Confirmations simples (oui, non, merci)
- Réponses factuelles directes
- Sélection dans une liste proposée`,
    parameters: {
      type: "object",
      properties: {
        understanding: {
          type: "string",
          description: "Ce que l'utilisateur veut RÉELLEMENT. Inclut les sous-entendus, besoins implicites, état émotionnel (pressé, indécis, excité, frustré)."
        },
        context_analysis: {
          type: "string", 
          description: "Analyse du contexte disponible: mémoire voyage (destination, dates, voyageurs), préférences utilisateur, widgets déjà affichés, phase actuelle du voyage."
        },
        response_strategy: {
          type: "string",
          description: "Stratégie de réponse choisie: ton à adopter, widget à déclencher, informations à fournir, comment personnaliser."
        },
        key_insights: {
          type: "array",
          items: { type: "string" },
          description: "2-3 insights clés qui guident ta réponse (ex: 'utilisateur semble pressé', 'a déjà refusé Rome', 'budget serré mentionné')"
        },
        anticipated_next_steps: {
          type: "array",
          items: { type: "string" },
          description: "2-3 prochaines étapes/questions probables de l'utilisateur après ta réponse."
        },
        widget_decision: {
          type: "object",
          properties: {
            should_show: { type: "boolean", description: "Faut-il afficher un widget ?" },
            widget_type: { type: "string", description: "Type de widget: dateRange, travelers, citySelection, etc." },
            reason: { type: "string", description: "Pourquoi ce widget maintenant ?" }
          },
          required: ["should_show"]
        },
        confidence: {
          type: "number",
          description: "Confiance dans ta compréhension et ton plan (0-100). Moins de 70 = demander clarification."
        }
      },
      required: ["understanding", "context_analysis", "response_strategy", "confidence"]
    }
  }
};

/**
 * Parsed reasoning result
 */
export interface ReasoningResult {
  understanding: string;
  contextAnalysis: string;
  responseStrategy: string;
  keyInsights?: string[];
  anticipatedNextSteps?: string[];
  widgetDecision?: {
    shouldShow: boolean;
    widgetType?: string;
    reason?: string;
  };
  confidence: number;
}

/**
 * Parse reasoning tool arguments
 */
export function parseReasoningResult(args: string): ReasoningResult | null {
  try {
    const parsed = JSON.parse(args);
    return {
      understanding: parsed.understanding || "",
      contextAnalysis: parsed.context_analysis || "",
      responseStrategy: parsed.response_strategy || "",
      keyInsights: parsed.key_insights || [],
      anticipatedNextSteps: parsed.anticipated_next_steps || [],
      widgetDecision: parsed.widget_decision ? {
        shouldShow: parsed.widget_decision.should_show || false,
        widgetType: parsed.widget_decision.widget_type,
        reason: parsed.widget_decision.reason,
      } : undefined,
      confidence: parsed.confidence || 0,
    };
  } catch (e) {
    console.error("Failed to parse reasoning result:", e);
    return null;
  }
}

/**
 * Chain of Thought instructions to add to system prompt
 */
export const CHAIN_OF_THOUGHT_INSTRUCTIONS = `
## RÉFLEXION STRUCTURÉE (Chain of Thought)

Pour les interactions complexes, tu es FORTEMENT ENCOURAGÉ à appeler l'outil "plan_response" pour structurer ta pensée.

CAS OÙ C'EST CRITIQUE (appelle plan_response) :
- Utilisateur indécis ou qui change de sujet
- Première interaction de la session
- Demandes multi-critères (destination + budget + dates)
- Quand tu hésites sur le widget à afficher

CAS OÙ C'EST DISPENSABLE (réponds directement) :
- Confirmations simples ("oui", "non", "merci")
- Sélection dans une liste ("le 2", "Tokyo")
- Questions factuelles directes

### Étape 1: COMPRENDRE
- Quelle est l'intention RÉELLE de l'utilisateur ?
- Y a-t-il des sous-entendus ou des besoins implicites ?
- Quel est son état émotionnel (pressé, indécis, excité, frustré) ?
- Que demande-t-il explicitement vs implicitement ?

### Étape 2: ANALYSER LE CONTEXTE
- Que sait-on déjà ? (destination, dates, voyageurs, préférences)
- Quelle est la phase actuelle du voyage ? (inspiration, recherche, comparaison, réservation)
- Quels widgets ont déjà été affichés et que l'utilisateur a confirmés ?
- Y a-t-il des préférences négatives à éviter ?

### Étape 3: PLANIFIER LA RÉPONSE
- Quelle est la meilleure approche pour cette situation ?
- Quel ton adopter ? (chaleureux, efficace, informatif, rassurant)
- Quel widget déclencher ensuite (si nécessaire) ?
- Comment personnaliser la réponse avec le contexte ?

### Étape 4: ANTICIPER
- Quelles seront les 2-3 prochaines questions probables ?
- Comment préparer le terrain pour la suite ?
- Quels quick replies seraient les plus utiles ?

### RÈGLES D'OR
1. Si confiance < 70%, demande une clarification au lieu de deviner
2. Utilise les insights pour personnaliser ta réponse
3. Les anticipated_next_steps guident tes quick_replies
4. Le widget_decision prend le dessus sur l'heuristique classique

### RÈGLE CRITIQUE: PARCOURS INDÉCISION
Si l'utilisateur est indécis (comprendre: "il ne sait pas où aller", "je sais pas trop", "aide-moi"):
- Vérifier le [CONTEXTE PRÉFÉRENCES] dans la mémoire
- Si style = NON DÉFINI → stratégie = "collecter le style via widget preferenceStyle"
- Si style défini mais intérêts = vide → stratégie = "collecter les intérêts via widget preferenceInterests"
- Si tout est rempli → stratégie = "proposer des destinations basées sur ses préférences"
- JAMAIS proposer des destinations quand les préférences sont vides

### RÈGLE: QUICK REPLIES OBLIGATOIRES
Tu DOIS recommander d'appeler generate_quick_replies dans ta stratégie pour CHAQUE réponse.

Réfléchir avant de répondre produit des réponses plus intelligentes et personnalisées.
`;

/**
 * Quick Chain of Thought - lighter version for simple queries
 */
export const QUICK_COT_INSTRUCTIONS = `
## RÉFLEXION RAPIDE

Pour chaque message, pense brièvement :
1. Que veut l'utilisateur ?
2. Que sais-je déjà ?
3. Quelle est la prochaine étape logique ?

Let me think step by step before responding.
`;
