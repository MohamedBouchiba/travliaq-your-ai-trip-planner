/**
 * Quick Replies Tool
 * 
 * Generates contextual quick reply buttons based on conversation state.
 */

export const quickRepliesExtractionTool = {
  type: "function",
  function: {
    name: "generate_quick_replies",
    description: `Generate 2-4 HIGHLY CONTEXTUAL quick reply buttons. Analyze the ENTIRE conversation to anticipate what the user most likely wants to say next.

## WHEN TO GENERATE REPLIES
ALWAYS generate quick_replies after your response. Think: "What are the 2-4 most likely things the user will say next?"

## CONTEXT AWARENESS RULES
1. **After proposing destinations**: Buttons = destination names the user can click to choose
2. **After asking about dates**: Buttons = common date options ("Ce weekend", "Semaine prochaine", "Flexible")
3. **After asking travelers count**: Buttons = common compositions ("Seul", "En couple", "En famille", "Entre amis")
4. **After showing flights**: Buttons = decision options ("Le moins cher", "Le plus rapide", "Vol direct", "Compare-les")
5. **After showing hotels**: Buttons = preference options ("Mieux noté", "Le plus central", "Avec piscine", "Le moins cher")
6. **After confirmation request**: Buttons = ("Oui, parfait", "Non, modifie", "Plus d'options")
7. **After general info/tip**: Buttons = logical next actions based on missing info

## INTELLIGENCE GUIDELINES
- If user just chose destination: suggest date-related buttons
- If user confirmed dates: suggest traveler-related buttons
- If trip is nearly complete: suggest "Lancer la recherche" or "Modifier quelque chose"
- Always include 1 "alternative" button like "Autres options" or "Plus de choix"
- Use the conversation history to avoid suggesting already-answered questions

## EMOJI SELECTION
- Destinations: Use country flag
- Dates: 📅 📆 🗓️
- Travelers: 👤 (solo) 💑 (couple) 👥 (group) 👨‍👩‍👧 (family)
- Flights: ✈️ 💰 ⚡ ↔️
- Hotels: 🏨 ⭐ 📍 🏊
- Actions: ✅ ❌ 🔄 🔍 ➡️
- Info: ℹ️ 💡 ❓`,
    parameters: {
      type: "object",
      properties: {
        replies: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { 
                type: "string", 
                description: "Short button label (max 20 chars). Be concise and clear."
              },
              emoji: { 
                type: "string", 
                description: "Single emoji that best represents the action or destination."
              },
              message: { 
                type: "string", 
                description: "Complete message sent when clicked. For destinations: 'Je choisis [name]'. For actions: full sentence describing the action."
              }
            },
            required: ["label", "emoji", "message"]
          },
          description: "2-4 contextual quick replies anticipating user's next action"
        },
        reasoning: {
          type: "string",
          description: "Brief explanation of why these replies are relevant (for debugging)"
        }
      },
      required: ["replies"]
    }
  }
};

export type QuickReply = {
  label: string;
  emoji: string;
  message: string;
};

export type QuickRepliesResult = {
  replies: QuickReply[];
  reasoning?: string;
};
