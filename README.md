# ardoise

Scène de présentation **pilotée au clavier** : un deck markdown, un curseur unique,
une palette de commandes, des notes orateur — dans une seule fenêtre.

Pensé pour les vidéos où l'on **tape pendant qu'on parle**. La présentation et
l'édition ne sont pas deux écrans : c'est le même curseur, à deux granularités.

```
j k      paragraphe        i        éditer sur place      w b e    mot à mot
espace   pas suivant       échap    rendre               .        écran noir
```

## Démarrage

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/ — statique, ouvrable n'importe où
npm run preview    # sert dist/
node tests/core.test.mjs   # noyau : blocs, édition, mouvements
```

Sur NixOS : `nix develop` (Node 22 fourni), puis les mêmes commandes.

L'application démarre sur un deck de démonstration (`decks/bienvenue.md`) qui explique
aussi le format. Glisse n'importe quel fichier `.md` sur la fenêtre pour le présenter.

## Un seul curseur

Le deck est un texte, la scène en est le rendu. Le curseur vit dans le texte :

- **`j` / `k`** descendent et remontent de **paragraphe** en paragraphe. Pour une
  présentation finie, un paragraphe = un pas : la navigation *est* le rythme des slides.
- **`w` `b` `e` `h` `l` `0` `$`** affinent jusqu'au mot et au caractère, avec compteurs
  (`3w`, `2x`, `d2w`).
- **`i` `a` `A` `I` `O`** ouvrent le paragraphe sous le curseur : il devient **sa propre
  source**, au même endroit, à la même taille. Aucune fenêtre, aucun panneau.
- **`échap`** valide et le rend de nouveau.

Pendant la frappe, seul le paragraphe courant change d'apparence ; le reste de la slide
ne bouge pas. C'est la contrainte du genre « je pense à voix haute ».

`u` annule la dernière édition. `s` télécharge le deck à jour.

## Le clavier

| touche | geste |
|---|---|
| `j` / `k` | paragraphe suivant / précédent |
| `espace` | pas suivant (groupe `<!-- pause -->`), puis slide |
| `n` / `p` | slide suivante / précédente |
| `3` `G` | aller au paragraphe 3 |
| `gg` / `G` | début / fin du deck |
| `h` `l` | caractère |
| `w` `b` `e` | mot suivant, précédent, fin |
| `0` `$` | début / fin de ligne |
| `↑` `↓` | ligne à l'intérieur du bloc |
| `i` `a` `A` `I` | insérer : avant, après, fin de ligne, début de ligne |
| `O` | nouveau paragraphe après |
| `x` | supprimer le caractère |
| `d` + mouvement | supprimer (`dw`, `de`, `d$`, `dd`) |
| `c` + mouvement | changer (`cw`, `cc`) |
| `u` | annuler |
| `échap` | valider et revenir au rendu |
| `.` | écran noir (une touche pour revenir) |
| `o` | vue d'ensemble (`h j k l`, `entrée`) |
| `t` | chrono marche / arrêt |
| `f` | plein écran |
| `P` | fenêtre orateur |
| `s` | télécharger le deck |
| `:` | palette de commandes |
| `+` / `-` | taille du texte (pas de 5 %) |
| `?` | aide clavier |

`j`/`k` sont volontairement le paragraphe, pas la ligne : c'est ce qui fait coïncider
navigation et tournage. Les lignes internes se parcourent avec `↑`/`↓`.

## Format du deck

```markdown
---
title: Mon sujet
author: David
theme: ardoise
---

# Titre de couverture

---

## Une slide

- un point
<!-- pause -->
- révélé au pas suivant

<!-- note: à dire à l'oral, jamais affiché sur scène -->
```

| syntaxe | effet |
|---|---|
| `---` seul sur une ligne | sépare deux slides (ignoré dans les blocs de code) |
| `<!-- pause -->` | révèle la suite au pas suivant |
| `<!-- note: … -->` | note orateur, visible seulement dans la fenêtre `P` |
| `<!-- layout: center -->` | centre verticalement la slide |
| `::: key` … `:::` | encadré (variantes : `key`, `warn`, `ok`, `note`, `quote`) |
| ```` ```mermaid ```` | diagramme rendu à l'affichage |
| ```` ```nix ```` | coloration syntaxique (js, ts, bash, nix, rust, python, json, yaml, css, html, go, c, diff, toml) |

Les commentaires HTML ordinaires sont retirés du rendu. Une slide est découpée en
**blocs** (titres, paragraphes, listes, fences, encadrés, tableaux) : c'est l'unité du
curseur et de l'édition.

## Fenêtre orateur

`P` ouvre une seconde fenêtre (à mettre sur l'autre écran, hors captation) qui affiche :

- les **notes** de la slide courante, en gros ;
- la position, le nombre de pas, le chrono, l'heure ;
- le titre de la slide **suivante**.

La synchronisation passe par `BroadcastChannel` : même origine, aucun serveur, aucun
compte. Si la fenêtre est ouverte après coup, elle se raccroche au premier changement.

## Captation (OBS)

- `?raw=1` masque le pied de scène **et le repère de paragraphe** : la scène ne montre
  que la slide.
- Source « navigateur » en 1920×1080 sur `http://localhost:5173/?raw=1`.
- `f` pour le plein écran si tu captures l'écran plutôt que le navigateur.
- `screenkey` (ou l'overlay clavier OBS) rend les raccourcis lisibles — c'est ce qui
  donne au genre « je tape en direct » sa lisibilité.

Paramètres d'URL utiles :

| paramètre | effet |
|---|---|
| `?raw=1` | mode captation (sans pied de scène) |
| `?slide=7` | démarrer à la slide 7 |
| `?theme=paper` | forcer un thème |
| `?deck=/chemin/deck.md` | charger un deck par URL |
| `?presenter=1` | ouvrir directement la fenêtre orateur |

## Thème et taille du texte

Quatre palettes : `ardoise` (défaut, sombre), `paper` (clair), `gruvbox`, `nord`.

```
:theme nord        # choisir une palette
:theme             # passer à la suivante
:size 120          # taille du texte à 120 %
:size +            # +5 %
:size reset        # revenir à 100 %
```

Au clavier, `+` et `-` ajustent la taille par pas de 5 % (80 % à 160 %).

**Le deck peut déclarer sa propre palette** dans son en-tête YAML :

```yaml
---
title: Mon sujet
theme: paper
---
```

Elle s'applique à l'ouverture du deck (un `?theme=` dans l'URL reste prioritaire).
Le choix fait ensuite avec `:theme` est mémorisé pour la session et au-delà.

La taille du texte ne s'applique qu'à la scène (titres, paragraphes, code, source
éditée) : le pied de scène et les surcouches gardent leur taille, pour rester discrets
à l'écran. Les deux réglages sont conservés dans `localStorage`.

## Ce qui est mémorisé

Dans `localStorage` : le deck tel qu'édité, le thème, la dernière slide.
`:reset` revient au deck de démonstration. Rien ne quitte le navigateur.

## Architecture

```
src/
├── App.svelte            état, curseur, modes, clavier, commandes
├── app.css               thèmes, typographie, blocs, source en place
├── components/
│   ├── SlideView.svelte  liste de blocs d'une slide
│   ├── BlockView.svelte  un bloc : rendu HTML ou source éditable
│   ├── Chrome.svelte     pied de scène (titre, chrono, position)
│   ├── CommandBar.svelte palette `:`
│   ├── HelpOverlay.svelte aide générée depuis la table de raccourcis
│   ├── Overview.svelte   vue d'ensemble (miniatures réelles)
│   └── Presenter.svelte  fenêtre orateur (entrée séparée)
└── lib/
    ├── deck.js           parsing en blocs + édition du source par plages de lignes
    ├── motions.js        mouvements (w, b, e, 0, $, ↑↓) et opérateurs (d, c)
    ├── render.js         markdown-it + highlight.js + mermaid
    ├── keys.js           table unique des raccourcis (aide incluse)
    └── storage.js        persistance locale

tests/core.test.mjs       vérifications du noyau, sans navigateur
```

Deux principes tiennent l'ensemble :

1. **la table `KEYMAP`** de `lib/keys.js` alimente à la fois le gestionnaire
   d'événements et l'aide `?` : l'aide ne peut pas mentir sur le comportement ;
2. **l'édition remplace des lignes** : chaque bloc connaît sa plage dans le markdown,
   donc une modification ne réécrit jamais le fichier — les notes et les pauses
   restent intactes.

## Limites assumées

- **Pas de backend** : le « terminal » est une palette de commandes, pas un vrai shell.
  Un vrai pty demanderait un serveur ; ici, tout est statique et hors-ligne.
- **PDF** : `:export` passe par l'impression du navigateur (« Enregistrer en PDF »),
  toutes les slides dépliées, une par page.
- **Mermaid** est chargé à la demande (~1 Mo) et seulement s'il y a un diagramme.
- **La fenêtre orateur** peut être bloquée par le bloqueur de pop-ups : autoriser le site.
- **Édition = markdown brut** : le paragraphe édité montre sa source, pas son rendu.
  C'est le prix de l'exactitude — et ce qui rend le geste lisible à l'écran.
- **Pas de sélection visuelle** (`v`), pas de presse-papier interne (`y`/`p`).
- **Pas de multi-écran synchronisé** au-delà des notes : une seule scène pilote.

## Licence

MIT.
