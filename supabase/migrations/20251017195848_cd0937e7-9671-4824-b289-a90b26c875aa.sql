-- Suppression de la colonne open_comments qui n'est plus utilisée dans le questionnaire
-- Elle a été remplacée par additional_info
ALTER TABLE questionnaire_responses DROP COLUMN IF EXISTS open_comments;