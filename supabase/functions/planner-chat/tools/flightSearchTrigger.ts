/**
 * Flight Search Trigger Tool
 * 
 * Triggers flight search when user confirms they want to search.
 */

export const flightSearchTriggerTool = {
  type: "function",
  function: {
    name: "trigger_flight_search",
    description: `Pré-remplit le formulaire de recherche de vols dans l'onglet Vols avec l'itinéraire configuré.
NE LANCE PAS de recherche automatique. L'utilisateur devra vérifier le formulaire et lancer manuellement.

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

IMPORTANT : Dans ta réponse, dis que le formulaire est prêt dans l'onglet Vols et que l'utilisateur peut vérifier les détails et lancer la recherche. NE DIS JAMAIS "je recherche" ou "les résultats arrivent".`,
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
