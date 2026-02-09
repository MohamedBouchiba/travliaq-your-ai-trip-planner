/**
 * Destination Suggestions Tool
 * 
 * Triggers destination suggestion requests when user asks for recommendations.
 */

export const destinationSuggestionTool = {
  type: "function",
  function: {
    name: "request_destination_suggestions",
    description: `À utiliser OBLIGATOIREMENT quand l'utilisateur demande des recommandations de destinations ou exprime de l'incertitude sur sa destination.

DÉCLENCHEURS - Appeler cet outil si l'utilisateur dit :
DEMANDES DIRECTES :
- "Fais-moi X recommandations de destinations"
- "Suggère-moi des destinations"
- "Propose-moi des pays"
- "Où partir ?"
- "Quelle destination me conseilles-tu ?"
- "Donne-moi des idées de voyage"
- "Recommande-moi X pays/destinations"
- "Quelles sont les meilleures destinations pour moi ?"

EXPRESSIONS D'INCERTITUDE (TRÈS IMPORTANT) :
- "je ne sais pas où aller"
- "je ne sais pas trop où aller"
- "je ne sais pas trop"
- "je sais pas où partir"
- "aucune idée de destination"
- "pas d'idée de destination"
- "j'hésite sur la destination"
- "aide-moi à choisir une destination"
- "aide-moi à choisir"
- "inspire-moi"
- "besoin d'inspiration"
- "où me conseilles-tu"
- "des idées ?"

RÈGLES IMPORTANTES :
1. Le nombre maximum de recommandations est 5 (si l'utilisateur demande plus, expliquer poliment)
2. Le nombre par défaut est 3
3. Cet outil déclenche l'appel à l'API de suggestions côté client
4. Tu dois AUSSI générer un message d'accompagnement chaleureux
5. En cas d'incertitude de l'utilisateur, TOUJOURS appeler cet outil`,
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
