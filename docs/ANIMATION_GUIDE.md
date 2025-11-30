# Guide des Animations du Questionnaire

Ce guide explique comment utiliser les nouveaux composants d'animation pour créer des transitions fluides et engageantes dans le questionnaire.

## Composants Disponibles

### 1. QuestionTransition

Wrapper qui gère les transitions entre les questions avec des animations d'entrée/sortie fluides.

**Usage:**
```tsx
<QuestionTransition step={step}>
  <div className="space-y-6">
    {/* Contenu de la question */}
  </div>
</QuestionTransition>
```

**Props:**
- `step` (number): Le numéro de l'étape actuelle
- `children` (ReactNode): Le contenu à animer
- `className` (string, optional): Classes CSS additionnelles

**Comportement:**
- Applique une animation d'entrée scale-up quand une nouvelle question apparaît
- Gère automatiquement la transition entre les questions
- Utilise un timing optimal pour une expérience fluide

### 2. AnimatedCard

Carte avec animations intégrées pour les interactions (hover, sélection).

**Usage:**
```tsx
<AnimatedCard
  isSelected={isSelected}
  onClick={() => handleSelect()}
  delay={100}
  className="p-6"
>
  <div className="flex items-center space-x-4">
    <span className="text-5xl">🎯</span>
    <span>Option</span>
  </div>
</AnimatedCard>
```

**Props:**
- `isSelected` (boolean, optional): Si la carte est sélectionnée
- `onClick` (function, optional): Fonction appelée au clic
- `delay` (number, optional): Délai avant l'animation d'entrée (en ms)
- `className` (string, optional): Classes CSS additionnelles

**Effets visuels:**
- Shimmer au survol
- Scale et shadow au hover
- Glow effect quand sélectionné
- Animation d'entrée avec délai (pour effet cascade)

### 3. AnimatedButton

Bouton avec micro-animations pour un feedback visuel amélioré.

**Usage:**
```tsx
<AnimatedButton
  onClick={handleClick}
  disabled={!isValid}
  variant="hero"
  size="lg"
>
  Continuer
</AnimatedButton>
```

**Props:**
- `onClick` (function, optional): Fonction appelée au clic
- `disabled` (boolean, optional): Si le bouton est désactivé
- `variant` (string, optional): Style du bouton ("default", "hero", "outline", "ghost")
- `size` (string, optional): Taille du bouton ("default", "sm", "lg", "icon")
- `className` (string, optional): Classes CSS additionnelles
- `type` (string, optional): Type HTML du bouton

**Effets visuels:**
- Shimmer au survol
- Scale au hover (105%) et au clic (95%)
- Shadow dynamique
- Désactivation visuelle smooth

## Animations Tailwind Disponibles

### Classes d'animation
- `animate-fade-up`: Fade in avec mouvement vers le haut
- `animate-fade-in`: Simple fade in
- `animate-slide-in`: Slide depuis la gauche avec fade
- `animate-slide-out`: Slide vers la droite avec fade
- `animate-scale-up`: Scale up avec fade
- `animate-bounce-subtle`: Bounce léger continu
- `animate-shimmer`: Effet shimmer de gauche à droite

### Classes utilitaires
- `transition-question`: Transition optimisée pour les changements de question
- `card-hover-lift`: Effet de levée au hover pour les cartes

## Bonnes Pratiques

### 1. Utiliser QuestionTransition pour chaque question
```tsx
if (step === stepCounter) {
  return (
    <QuestionTransition step={step}>
      {/* Contenu */}
    </QuestionTransition>
  );
}
```

### 2. Appliquer un délai cascade aux cartes
```tsx
{options.map((option, index) => (
  <AnimatedCard
    key={option.id}
    delay={index * 100} // 100ms entre chaque carte
  >
    {/* Contenu */}
  </AnimatedCard>
))}
```

### 3. Animer les icônes au hover
```tsx
<span className="text-5xl transform group-hover:scale-110 transition-transform duration-300">
  🎯
</span>
```

### 4. Utiliser AnimatedButton pour tous les boutons principaux
```tsx
<AnimatedButton
  onClick={nextStep}
  disabled={!canProceed}
  variant="hero"
>
  {t('questionnaire.continue')}
</AnimatedButton>
```

## Timing et Performance

### Durées recommandées
- **Entrée de question**: 400ms (scale-up)
- **Sortie de question**: 300ms
- **Hover effects**: 200-300ms
- **Click effects**: 150ms

### Optimisation
- Les animations utilisent `transform` et `opacity` pour de meilleures performances
- `will-change` est appliqué automatiquement quand nécessaire
- Les animations sont désactivées pour les utilisateurs préférant `prefers-reduced-motion`

## Exemples Complets

### Question à choix unique
```tsx
<QuestionTransition step={step}>
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-center animate-fade-in">
      {t('questionnaire.title')}
    </h2>
    <div className="grid grid-cols-2 gap-4">
      {options.map((option, index) => (
        <AnimatedCard
          key={option.id}
          isSelected={selected === option.id}
          onClick={() => setSelected(option.id)}
          delay={index * 100}
          className="p-6"
        >
          <div className="flex items-center space-x-4">
            <span className="text-5xl transform group-hover:scale-110 transition-transform">
              {option.icon}
            </span>
            <span className="font-semibold">{option.label}</span>
          </div>
        </AnimatedCard>
      ))}
    </div>
    <div className="flex justify-center">
      <AnimatedButton
        onClick={handleContinue}
        disabled={!selected}
      >
        {t('questionnaire.continue')}
      </AnimatedButton>
    </div>
  </div>
</QuestionTransition>
```

### Question avec auto-avancement
```tsx
<AnimatedCard
  isSelected={isSelected}
  onClick={() => {
    setAnswer(value);
    setTimeout(() => nextStep(true), 300); // Délai pour voir la sélection
  }}
  delay={index * 100}
>
  {/* Contenu */}
</AnimatedCard>
```

## Accessibilité

- Toutes les animations respectent `prefers-reduced-motion`
- Les transitions n'interfèrent pas avec la navigation au clavier
- Les états focus sont toujours visibles
- Les animations ne bloquent jamais l'interaction

## Migration

Pour migrer une question existante:

1. Wrapper avec `QuestionTransition`
2. Remplacer `<Card>` par `<AnimatedCard>`
3. Remplacer `<Button>` par `<AnimatedButton>` (boutons principaux)
4. Ajouter des délais en cascade si plusieurs cartes
5. Ajouter `group-hover:scale-110` aux icônes

Avant:
```tsx
<div className="space-y-6 animate-fade-up">
  <Card className="p-6 hover:scale-105">
    {/* Contenu */}
  </Card>
</div>
```

Après:
```tsx
<QuestionTransition step={step}>
  <div className="space-y-6">
    <AnimatedCard className="p-6" delay={0}>
      {/* Contenu */}
    </AnimatedCard>
  </div>
</QuestionTransition>
```
