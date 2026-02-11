/**
 * Destination Suggestions Tool
 * 
 * Triggers destination suggestion requests when user asks for recommendations.
 */

export const destinationSuggestionTool = {
  type: "function",
  function: {
    name: "request_destination_suggestions",
    description: `À utiliser UNIQUEMENT quand l'utilisateur demande EXPLICITEMENT des recommandations de destinations ou ACCEPTE une proposition de suggestions.

DÉCLENCHEURS - Appeler cet outil SEULEMENT si l'utilisateur dit :
DEMANDES DIRECTES :
- "Fais-moi X recommandations de destinations"
- "Suggère-moi des destinations"
- "Propose-moi des pays"
- "Où partir ?"
- "Quelle destination me conseilles-tu ?"
- "Donne-moi des idées de voyage"
- "Recommande-moi X pays/destinations"
- "inspire-moi"
- "oui" (en réponse à "Souhaitez-vous que je vous propose des destinations ?")

RÈGLE ANTI-PROACTIVITÉ (TRÈS IMPORTANT) :
- N'appelle PAS cet outil automatiquement après la collecte des préférences.
- Attends que l'utilisateur DEMANDE des suggestions ou ACCEPTE ta proposition.
- Si l'utilisateur dit "non", "pas pour l'instant", ou mentionne une destination, ne propose PAS de suggestions.
- Après les préférences, pose d'abord la question : "Souhaitez-vous que je vous propose des destinations ?"

RÈGLES :
1. Le nombre maximum de recommandations est 5
2. Le nombre par défaut dépend du contexte :
   - Escapade courte (1-3 jours) : 2 suggestions
   - Voyage moyen (4-7 jours) : 3 suggestions
   - Voyage long (8+ jours) : 4-5 suggestions
3. Cet outil déclenche l'appel à l'API de suggestions côté client
4. Tu dois AUSSI générer un message d'accompagnement chaleureux`,
    parameters: {
      type: "object",
      properties: {
        requestedCount: {
          type: "number",
          description: "Nombre de destinations demandées par l'utilisateur (max 5, par défaut 3)"
        },
        reason: {
          type: "string",
          description: "Raison de la demande (inspiration, comparaison, etc.)"
        },
        exceededLimit: {
          type: "boolean",
          description: "TRUE si l'utilisateur a demandé plus de 5 recommandations (pour générer un message d'explication)"
        }
      },
      required: ["requestedCount"]
    }
  }
};

export type DestinationSuggestionResult = {
  requestedCount: number;
  reason?: string;
  exceededLimit?: boolean;
};
