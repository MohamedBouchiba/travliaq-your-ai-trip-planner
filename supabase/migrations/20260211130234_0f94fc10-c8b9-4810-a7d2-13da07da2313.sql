
-- Create destination_aliases table for multilingual destination name mappings
CREATE TABLE public.destination_aliases (
  alias TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'fr',
  PRIMARY KEY (alias, lang)
);

-- Enable RLS
ALTER TABLE public.destination_aliases ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can read destination aliases"
  ON public.destination_aliases FOR SELECT USING (true);

-- Seed French translations
INSERT INTO public.destination_aliases (alias, canonical_name, lang) VALUES
  ('Japon', 'Japan', 'fr'),
  ('Thailande', 'Thailand', 'fr'),
  ('Thaïlande', 'Thailand', 'fr'),
  ('Cambodge', 'Cambodia', 'fr'),
  ('Grece', 'Greece', 'fr'),
  ('Grèce', 'Greece', 'fr'),
  ('Espagne', 'Spain', 'fr'),
  ('Italie', 'Italy', 'fr'),
  ('Turquie', 'Turkey', 'fr'),
  ('Maroc', 'Morocco', 'fr'),
  ('Mexique', 'Mexico', 'fr'),
  ('Croatie', 'Croatia', 'fr'),
  ('Egypte', 'Egypt', 'fr'),
  ('Égypte', 'Egypt', 'fr'),
  ('Tunisie', 'Tunisia', 'fr'),
  ('Norvege', 'Norway', 'fr'),
  ('Norvège', 'Norway', 'fr'),
  ('Suede', 'Sweden', 'fr'),
  ('Suède', 'Sweden', 'fr'),
  ('Islande', 'Iceland', 'fr'),
  ('Colombie', 'Colombia', 'fr'),
  ('Perou', 'Peru', 'fr'),
  ('Pérou', 'Peru', 'fr'),
  ('Argentine', 'Argentina', 'fr'),
  ('Bresil', 'Brazil', 'fr'),
  ('Brésil', 'Brazil', 'fr'),
  ('Singapour', 'Singapore', 'fr'),
  ('Dubai', 'Dubai', 'fr'),
  ('Dubaï', 'Dubai', 'fr'),
  ('Maurice', 'Mauritius', 'fr'),
  ('Londres', 'London', 'fr'),
  ('Barcelone', 'Barcelona', 'fr'),
  ('Lisbonne', 'Lisbon', 'fr'),
  ('Vienne', 'Vienna', 'fr'),
  ('Madere', 'Madeira', 'fr'),
  ('Madère', 'Madeira', 'fr'),
  ('Chypre', 'Cyprus', 'fr'),
  ('Etats-Unis', 'United States', 'fr'),
  ('Allemagne', 'Germany', 'fr'),
  ('Autriche', 'Austria', 'fr'),
  ('Belgique', 'Belgium', 'fr'),
  ('Pays-Bas', 'Netherlands', 'fr'),
  ('Royaume-Uni', 'United Kingdom', 'fr'),
  ('Inde', 'India', 'fr'),
  ('Chine', 'China', 'fr'),
  ('Coree du Sud', 'South Korea', 'fr'),
  ('Corée du Sud', 'South Korea', 'fr'),
  ('Nouvelle-Zelande', 'New Zealand', 'fr'),
  ('Nouvelle-Zélande', 'New Zealand', 'fr'),
  ('Afrique du Sud', 'South Africa', 'fr'),
  ('Tanzanie', 'Tanzania', 'fr'),
  ('Mongolie', 'Mongolia', 'fr'),
  ('Philippines', 'Philippines', 'fr'),
  ('Malaisie', 'Malaysia', 'fr'),
  ('Jordanie', 'Jordan', 'fr'),
  ('Senegal', 'Senegal', 'fr'),
  ('Sénégal', 'Senegal', 'fr'),
  ('Montenegro', 'Montenegro', 'fr'),
  ('Monténégro', 'Montenegro', 'fr'),
  ('Vietnam', 'Vietnam', 'fr'),
  ('Maldives', 'Maldives', 'fr'),
  ('Seychelles', 'Seychelles', 'fr'),
  ('Costa Rica', 'Costa Rica', 'fr'),
  ('Portugal', 'Portugal', 'fr');
