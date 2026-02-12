/**
 * SmartTagsWidget v2
 * Displays top 3 hashtags calculated from user chat messages via LLM.
 * Recalculates every X messages to optimize token usage.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Hash, X, Plus, Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { eventBus } from "@/lib/eventBus";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface SmartTagsWidgetProps {
  className?: string;
}

// Hashtags prédéfinis par catégorie (suggestions)
const ALL_HASHTAGS = [
  "#Aventurier", "#Explorateur", "#Détente", "#Luxe", "#Budget", "#Nature", "#Urbain", "#Culture",
  "#Romantique", "#Famille", "#Solo", "#EntreAmis", "#Fête", "#Zen", "#Sport", "#Foodie",
  "#Plage", "#Montagne", "#Histoire", "#Gastronomie", "#Shopping", "#Wellness", "#Photo", "#Nightlife",
];

import { STORAGE_KEYS } from "@/config/storageKeys";
const STORAGE_KEY = STORAGE_KEYS.SMART_TAGS;
const MESSAGES_THRESHOLD = 4; // Recalculate every N user messages

interface StoredTags {
  tags: string[];
  messageCount: number;
  lastCalculated: string;
  isManuallySet: boolean;
  conversationHistory: string[];
}

function loadStoredTags(): StoredTags {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("[SmartTags] Failed to load:", e);
  }
  return { tags: [], messageCount: 0, lastCalculated: "", isManuallySet: false, conversationHistory: [] };
}

function saveStoredTags(data: StoredTags) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("[SmartTags] Failed to save:", e);
  }
}

export function SmartTagsWidget({ className }: SmartTagsWidgetProps) {
  const { t, i18n } = useTranslation();
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newTag, setNewTag] = useState("");
  
  const messageCountRef = useRef(0);
  const isManuallySetRef = useRef(false);
  const conversationHistoryRef = useRef<string[]>([]);
  const hasInitializedRef = useRef(false);

  // Load stored tags on mount
  useEffect(() => {
    const stored = loadStoredTags();
    if (stored.tags.length > 0) {
      setTags(stored.tags);
      messageCountRef.current = stored.messageCount;
      isManuallySetRef.current = stored.isManuallySet;
      conversationHistoryRef.current = stored.conversationHistory || [];
      hasInitializedRef.current = true;
    }
  }, []);

  // Save when tags change
  useEffect(() => {
    if (hasInitializedRef.current || tags.length > 0) {
      saveStoredTags({
        tags,
        messageCount: messageCountRef.current,
        lastCalculated: new Date().toISOString(),
        isManuallySet: isManuallySetRef.current,
        conversationHistory: conversationHistoryRef.current,
      });
    }
  }, [tags]);

  // Calculate hashtags from conversation history using LLM
  const calculateHashtagsFromChat = useCallback(async (history: string[]) => {
    if (isManuallySetRef.current || history.length < 2) return;
    
    setIsLoading(true);
    
    try {
      // Build a summary of the conversation (last 10 messages max)
      const recentMessages = history.slice(-10).join("\n");
      const isEnglish = i18n.language?.startsWith("en");
      
      const systemPrompt = isEnglish
        ? `You are an assistant that analyzes user messages to determine their traveler profile.
Based on the messages below, generate EXACTLY 3 hashtags that best describe this traveler.

Rules:
- Each hashtag starts with #
- One word per hashtag (e.g.: #Adventurer, #Romantic, #Foodie)
- Reply ONLY with the 3 hashtags separated by commas
- Valid examples: #Adventurer, #Luxury, #Culture

User messages:
${recentMessages}`
        : `Tu es un assistant qui analyse les messages d'un utilisateur pour déterminer son profil de voyageur.
Basé sur les messages ci-dessous, génère EXACTEMENT 3 hashtags qui décrivent le mieux ce voyageur.

Règles:
- Chaque hashtag commence par #
- Un seul mot par hashtag (ex: #Aventurier, #Romantique, #Foodie)
- Réponds UNIQUEMENT avec les 3 hashtags séparés par des virgules
- Exemples valides: #Aventurier, #Luxe, #Culture

Messages de l'utilisateur:
${recentMessages}`;

      const userPrompt = isEnglish
        ? "Generate the 3 hashtags that best describe me."
        : "Génère les 3 hashtags qui me décrivent le mieux.";
      
      const response = await supabase.functions.invoke("planner-chat", {
        body: {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          stream: false,
        },
      });

      if (response.data?.content) {
        const content = response.data.content as string;
        // Parse hashtags from response
        const extractedTags = content
          .split(/[,\n]+/)
          .map((tag: string) => tag.trim())
          .filter((tag: string) => tag.startsWith("#") && tag.length > 1)
          .slice(0, 3);
        
        if (extractedTags.length > 0) {
          setTags(extractedTags);
          hasInitializedRef.current = true;
        }
      }
    } catch (error) {
      console.error("[SmartTags] LLM error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [i18n.language]);

  // Listen for user chat messages
  useEffect(() => {
    const handleUserMessage = (payload: { text: string; messageCount: number }) => {
      if (!payload.text || payload.text.length < 3) return;
      
      // Add message to conversation history
      conversationHistoryRef.current.push(payload.text);
      
      // Keep only last 20 messages
      if (conversationHistoryRef.current.length > 20) {
        conversationHistoryRef.current = conversationHistoryRef.current.slice(-20);
      }
      
      messageCountRef.current = payload.messageCount;

      // Recalculate every N messages if not manually set
      if (payload.messageCount % MESSAGES_THRESHOLD === 0 && !isManuallySetRef.current) {
        calculateHashtagsFromChat(conversationHistoryRef.current);
      }
    };

    eventBus.on("chat:userMessage", handleUserMessage);
    return () => {
      eventBus.off("chat:userMessage", handleUserMessage);
    };
  }, [calculateHashtagsFromChat]);

  // Manual refresh
  const handleRefresh = () => {
    if (conversationHistoryRef.current.length >= 2) {
      isManuallySetRef.current = false;
      calculateHashtagsFromChat(conversationHistoryRef.current);
    }
  };

  // Remove a tag
  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove));
    isManuallySetRef.current = true;
  };

  // Add a new tag
  const handleAddTag = () => {
    if (!newTag.trim()) return;
    
    let tagToAdd = newTag.trim();
    if (!tagToAdd.startsWith("#")) {
      tagToAdd = "#" + tagToAdd;
    }
    
    // Capitalize first letter after #
    tagToAdd = "#" + tagToAdd.slice(1).charAt(0).toUpperCase() + tagToAdd.slice(2);
    
    if (tags.length < 3 && !tags.includes(tagToAdd)) {
      setTags((prev) => [...prev, tagToAdd]);
      isManuallySetRef.current = true;
    }
    setNewTag("");
    setIsEditing(false);
  };

  // Select from predefined
  const handleSelectPredefined = (tag: string) => {
    if (tags.length < 3 && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag]);
      isManuallySetRef.current = true;
    }
  };

  // No tags yet
  if (tags.length === 0 && !isLoading) {
    return (
      <div className={cn(
        "flex items-center gap-2 text-xs text-muted-foreground/60 py-2",
        className
      )}>
        <Hash className="w-3 h-3" />
        <span className="italic">{t("planner.preferences.smartTags.emptyState")}</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Sparkles className="h-3 w-3" />
          <span>{t("planner.preferences.smartTags.title")}</span>
        </div>
        <div className="flex items-center gap-1">
          {isLoading ? (
            <span className="text-[10px] text-muted-foreground animate-pulse">
              {t("planner.preferences.smartTags.analyzing")}
            </span>
          ) : conversationHistoryRef.current.length >= 2 ? (
            <button
              onClick={handleRefresh}
              className="text-muted-foreground hover:text-primary transition-colors p-1"
              title={t("planner.preferences.smartTags.recalculate")}
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && tags.length === 0 && (
        <div className="flex gap-1.5">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className="h-6 w-16 rounded-full bg-muted animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Tags display */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 group cursor-pointer text-xs py-0.5 px-2"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}

          {/* Add button */}
          {tags.length < 3 && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-0.5 rounded-full border border-dashed border-muted-foreground/30 hover:border-primary/50"
            >
              <Plus className="w-3 h-3" />
              <span>{t("planner.preferences.smartTags.add")}</span>
            </button>
          )}
        </div>
      )}

      {/* Edit mode */}
      {isEditing && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder={t("planner.preferences.smartTags.placeholder")}
              className="h-7 text-xs"
              onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              autoFocus
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={handleAddTag}
            >
              {t("common.ok")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => {
                setIsEditing(false);
                setNewTag("");
              }}
            >
              ✕
            </Button>
          </div>

          {/* Suggestions */}
          <div className="flex flex-wrap gap-1">
            {ALL_HASHTAGS
              .filter((h) => !tags.includes(h))
              .slice(0, 8)
              .map((hashtag) => (
                <button
                  key={hashtag}
                  onClick={() => handleSelectPredefined(hashtag)}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {hashtag}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SmartTagsWidget;
