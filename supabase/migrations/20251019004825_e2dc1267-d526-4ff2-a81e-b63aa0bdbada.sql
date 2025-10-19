-- Ajouter les nouvelles colonnes pour les détails enfants, sécurité et biorythme
ALTER TABLE public.questionnaire_responses
ADD COLUMN IF NOT EXISTS children jsonb,
ADD COLUMN IF NOT EXISTS security jsonb,
ADD COLUMN IF NOT EXISTS biorhythm jsonb;

-- Ajouter des commentaires pour documenter les colonnes
COMMENT ON COLUMN public.questionnaire_responses.children IS 'Liste des enfants avec leur âge: [{age: number}]';
COMMENT ON COLUMN public.questionnaire_responses.security IS 'Contraintes de sécurité et phobies sélectionnées';
COMMENT ON COLUMN public.questionnaire_responses.biorhythm IS 'Horloge biologique et habitudes de voyage';