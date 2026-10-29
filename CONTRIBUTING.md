# Contribuer

## Mise en route

```bash
nix develop        # Node 22 (ou n'importe quel Node >= 22.12)
npm ci
npm test           # noyau : blocs, édition, mouvements
npm run dev        # http://localhost:5173
```

`npm test` est la barrière : toute modification de `src/lib/deck.js` ou
`src/lib/motions.js` doit passer les 24 vérifications, et en ajouter une quand elle
change un comportement.

## Architecture en deux règles

1. **`lib/keys.js` est la seule table de raccourcis.** Elle alimente à la fois le
   gestionnaire d'événements et l'aide `?`. Ajouter une touche sans l'y déclarer casse
   la promesse que l'aide dit la vérité.
2. **Une édition remplace des lignes.** Un bloc connaît sa plage `startLine`-`endLine`
   dans le markdown de la slide. Ne jamais raccourcir ce chemin en réécrivant la slide
   entière : les notes `<!-- note: -->` et les `<!-- pause -->` doivent survivre.

## Périmètre

Dans le périmètre : le rendu markdown, le curseur et ses mouvements, l'export, les
thèmes, l'accessibilité au clavier.

Hors périmètre, volontairement : backend, comptes, collaboration temps réel,
télémétrie, dépendance à un service tiers. Le projet doit rester un dossier statique
qui fonctionne hors-ligne.

## Style

- Français pour le code, les commentaires, la documentation et les messages de commit
  (l'interface et le public sont francophones).
- Pas de tiret cadratin dans la prose : ` - `.
- Les commentaires expliquent **pourquoi**, pas ce que le code fait déjà.

## Pull requests

Une PR = un comportement. Décris le geste observable (« `d` `w` supprime le mot sans
laisser d'espace double »), pas la liste des fichiers touchés. La CI construit et
déploie ; elle doit être verte.
