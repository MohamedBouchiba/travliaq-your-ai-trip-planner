# Documentation Système de Voyages Dynamique Travliaq

Cette documentation décrit le système complet de gestion des voyages dynamiques avec support multilingue.

## 📚 Fichiers de Documentation

### Guides Principaux

#### [README_DYNAMIC_SYSTEM.md](./README_DYNAMIC_SYSTEM.md)
Vue d'ensemble complète du système dynamique de recommandations de voyages.
- Architecture de la base de données
- Fonctionnalités principales
- Cas d'utilisation
- Exemples de démonstration

#### [DYNAMIC_TRIPS_GUIDE.md](./DYNAMIC_TRIPS_GUIDE.md)
Guide pratique d'utilisation du système.
- Structure des tables `trips` et `steps`
- Liste complète des champs obligatoires et optionnels
- Instructions d'insertion SQL
- **NOUVEAU**: Support multilingue
- **NOUVEAU**: Types d'étapes
- Exemples minimalistes et complets

### Schémas et Formats

#### [TRIP_JSON_SCHEMA.md](./TRIP_JSON_SCHEMA.md)
Définition complète du schéma JSON pour les voyages.
- JSON Schema conforme à Draft 7
- Exemple JSON complet (Tokyo & Kyoto)
- Fonction SQL `insert_trip_from_json()` mise à jour
- Statistiques dynamiques du footer
- Guide d'utilisation

#### [TRIP_INSERT_EXAMPLE.sql](./TRIP_INSERT_EXAMPLE.sql)
Template SQL prêt à l'emploi pour créer des voyages.
- Exemple complet d'insertion d'un voyage (Bali)
- Plusieurs types d'étapes (complètes, minimalistes, sans GPS)
- Requêtes de vérification
- Notes et bonnes pratiques

### Exemples Détaillés

#### [TRIP_EXAMPLE.md](./TRIP_EXAMPLE.md) 🆕
Exemple complet d'un trip avec **tous** les paramètres possibles.
- Structure JSON complète
- Insertion SQL détaillée
- Explication de tous les champs
- Support multilingue (destination_en, travel_style_en)

#### [STEP_EXAMPLE.md](./STEP_EXAMPLE.md) 🆕
Exemple complet d'une step avec **tous** les paramètres possibles.
- Structure JSON complète avec traductions
- Insertion SQL avec tous les champs
- **NOUVEAU**: Champ `step_type` (activité, restaurant, transport, etc.)
- Support multilingue complet (7 champs traduits)
- Types d'étapes suggérés
- Exemple minimaliste pour comparaison

## 🆕 Nouveautés

### Support Multilingue

Le système supporte désormais les traductions anglaises (extensible à d'autres langues).

#### Champs Trips Traduits
- `destination_en` : Traduction de la destination
- `travel_style_en` : Traduction du style de voyage

#### Champs Steps Traduits
- `title_en` : Titre en anglais
- `subtitle_en` : Sous-titre en anglais
- `why_en` : Raison de la visite en anglais
- `tips_en` : Conseils en anglais
- `transfer_en` : Info de transport en anglais
- `suggestion_en` : Suggestions en anglais
- `weather_description_en` : Description météo en anglais

### Type d'Étape (step_type)

Nouveau champ facultatif pour catégoriser les étapes visuellement.

**Types suggérés** :
- `activité` : Visites, excursions, expériences
- `restaurant` : Repas, cafés, marchés
- `transport` : Transferts, trajets
- `hébergement` : Check-in/check-out
- `visite` : Monuments, musées
- `loisir` : Détente, plage, spa
- `shopping` : Marchés, boutiques
- `spectacle` : Concerts, événements

**Affichage** : Badge semi-transparent avec icône Tag, positionné entre "Étape X" et les badges durée/prix.

## 🔄 Migrations Effectuées

### Migration 1 : Ajout des Colonnes Multilingues et step_type
```sql
-- Colonnes ajoutées à trips
ALTER TABLE trips ADD COLUMN destination_en TEXT;
ALTER TABLE trips ADD COLUMN travel_style_en TEXT;

-- Colonnes ajoutées à steps
ALTER TABLE steps ADD COLUMN title_en TEXT;
ALTER TABLE steps ADD COLUMN subtitle_en TEXT;
ALTER TABLE steps ADD COLUMN why_en TEXT;
ALTER TABLE steps ADD COLUMN tips_en TEXT;
ALTER TABLE steps ADD COLUMN transfer_en TEXT;
ALTER TABLE steps ADD COLUMN suggestion_en TEXT;
ALTER TABLE steps ADD COLUMN weather_description_en TEXT;
ALTER TABLE steps ADD COLUMN step_type TEXT;
```

### Migration 2 : Mise à Jour de la Fonction insert_trip_from_json
La fonction PostgreSQL a été mise à jour pour supporter tous les nouveaux champs.

## 📖 Comment Utiliser Cette Documentation

### Pour Créer un Nouveau Voyage

1. **Référence rapide** : Consultez [TRIP_INSERT_EXAMPLE.sql](./TRIP_INSERT_EXAMPLE.sql)
2. **Structure complète** : Consultez [TRIP_EXAMPLE.md](./TRIP_EXAMPLE.md) et [STEP_EXAMPLE.md](./STEP_EXAMPLE.md)
3. **Validation** : Vérifiez avec [TRIP_JSON_SCHEMA.md](./TRIP_JSON_SCHEMA.md)

### Pour Comprendre le Système

1. **Vue d'ensemble** : Lisez [README_DYNAMIC_SYSTEM.md](./README_DYNAMIC_SYSTEM.md)
2. **Guide pratique** : Consultez [DYNAMIC_TRIPS_GUIDE.md](./DYNAMIC_TRIPS_GUIDE.md)
3. **Exemples** : Explorez [TRIP_EXAMPLE.md](./TRIP_EXAMPLE.md) et [STEP_EXAMPLE.md](./STEP_EXAMPLE.md)

### Pour Ajouter le Multilingue

1. Consultez la section "Support Multilingue" dans [DYNAMIC_TRIPS_GUIDE.md](./DYNAMIC_TRIPS_GUIDE.md)
2. Référez-vous aux exemples dans [TRIP_EXAMPLE.md](./TRIP_EXAMPLE.md) et [STEP_EXAMPLE.md](./STEP_EXAMPLE.md)
3. Utilisez les champs `*_en` pour les traductions anglaises

### Pour Utiliser les Types d'Étapes

1. Consultez la section "Type d'Étape" dans [DYNAMIC_TRIPS_GUIDE.md](./DYNAMIC_TRIPS_GUIDE.md)
2. Voir l'exemple complet dans [STEP_EXAMPLE.md](./STEP_EXAMPLE.md)
3. Ajoutez le champ `step_type` avec l'une des valeurs suggérées

## 🎯 Accès aux Voyages

Les voyages sont accessibles via :
- URL avec query parameter : `/recommendations?code=TOKYO2025`
- URL avec path parameter : `/recommendations/TOKYO2025`

Le code est insensible à la casse et aux caractères spéciaux.

## 🔧 Outils et Ressources

### Fonction SQL d'Insertion JSON
```sql
-- Insérer un voyage depuis un objet JSON
SELECT insert_trip_from_json('{ ... }'::jsonb);
```

### Validation du Schéma
Le JSON Schema complet est disponible dans [TRIP_JSON_SCHEMA.md](./TRIP_JSON_SCHEMA.md)

## 📝 Notes Importantes

### Champs Obligatoires

#### Pour les Trips
- `code` : Code unique du voyage
- `destination` : Nom de la destination
- `total_days` : Nombre de jours

#### Pour les Steps
- `trip_id` : ID du voyage parent
- `step_number` : Numéro d'ordre
- `day_number` : Jour du voyage
- `title` : Titre de l'étape

### Tous les Autres Champs Sont Optionnels

Le système est conçu pour une flexibilité maximale. Vous pouvez créer :
- Des voyages ultra-détaillés avec traductions complètes
- Des itinéraires minimalistes (juste les titres)
- Des expériences hybrides (certaines étapes détaillées, d'autres basiques)

## 🌍 Extension Future

Pour ajouter d'autres langues (espagnol, allemand, italien, etc.) :
1. Ajoutez les colonnes avec le suffixe approprié (ex: `_es`, `_de`, `_it`)
2. Mettez à jour les interfaces TypeScript
3. Adaptez la logique de sélection de langue dans l'application

## 🤝 Support

Pour toute question :
- Consultez d'abord cette documentation
- Référez-vous aux exemples SQL
- Testez avec les trips de démonstration (TOKYO2025, SIDIBEL2025)
