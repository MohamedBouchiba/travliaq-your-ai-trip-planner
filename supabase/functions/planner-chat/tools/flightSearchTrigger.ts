/**
 * Flight Search Trigger Tool
 * 
 * Triggers flight search when user confirms they want to search.
 */

export const flightSearchTriggerTool = {
  type: "function",
  function: {
    name: "trigger_flight_search",
    description: `À utiliser quand l'utilisateur confirme vouloir lancer la recherche de vols.

DÉCLENCHEURS (appeler cet outil si l'utilisateur dit) :
- "oui" (en réponse à "Souhaitez-vous que je lance la recherche des vols ?")
- "lance la recherche"
- "cherche les vols"
- "ok, recherche"
- "vas-y"
- "go"
- "c'est bon, lance"
- "trouve-moi des vols"
- "recherche maintenant"

NE PAS UTILISER SI:
- Il manque des informations (dates, destination, nombre de voyageurs, ville de départ)
- L'utilisateur pose une question
- L'utilisateur veut modifier quelque chose

Cet outil déclenche la recherche de vols côté client et affiche les résultats.`,
    parameters: {
      type: "object",
      properties: {
        confirmed: {
          type: "boolean",
          description: "TRUE si l'utilisateur a confirmé vouloir lancer la recherche"
        },
        message: {
          type: "string",
          description: "Message d'accompagnement pendant la recherche (ex: 'Je lance la recherche...')"
        }
      },
      required: ["confirmed"]
    }
  }
};

export type FlightSearchTriggerResult = {
  confirmed: boolean;
  message?: string;
};
