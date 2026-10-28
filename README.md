# ardoise

Scène de présentation **pilotée au clavier** : un deck markdown, une zone de saisie
en direct, une palette de commandes, des notes orateur — dans une seule fenêtre.

Pensé pour les vidéos où l'on **tape pendant qu'on parle** : le public voit l'idée se
poser, pas un curseur qui tremble.

```
espace   avancer          c   écrire un bloc        e   éditer la slide
b        écran noir       ?   aide                  :   commandes
```

## Démarrage

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/ — statique, ouvrable n'importe où
npm run preview    # sert dist/
```

Sur NixOS : `nix develop` (Node 22 fourni), puis les mêmes commandes.

L'application démarre sur un deck de démonstration (`decks/bienvenue.md`) qui explique
aussi le format. Glisse n'importe quel fichier `.md` sur la fenêtre pour le présenter.

## Le geste central : ancrer une idée

`c` ouvre le composeur. Tu tapes une phrase, `entrée` l'ancre sur la slide avec une
animation discrète. `tab` change le type de bloc :

| type | rendu |
|---|---|
| puce | `- texte` (une ligne = une puce) |
| texte | paragraphe |
| encadré | `::: key` … `:::` |

Rien ne se réorganise pendant la frappe : le bloc apparaît à la fin, la mise en page
au-dessus ne bouge pas. C'est la contrainte principale du genre « je pense à voix haute ».

`r` efface les blocs live de la slide courante (pour refaire une prise).
`s` télécharge le deck complet, blocs live inclus.

## Le clavier

| touche | geste |
|---|---|
| `espace` `j` `l` `→` | pas suivant (révèle la suite, puis slide suivante) |
| `k` `h` `←` | pas précédent |
| `n` / `p` | slide suivante / précédente, sans les pas |
| `3` `G` | aller à la slide 3 |
| `gg` / `G` | première / dernière slide |
| `c` | composer un bloc en direct |
| `e` | éditer le markdown de la slide (`échap` **enregistre**) |
| `r` | effacer les blocs live de la slide |
| `s` | télécharger le deck |
| `b` | écran noir (une touche pour revenir) |
| `o` | vue d'ensemble (`h j k l`, `entrée`) |
| `t` | chrono marche / arrêt |
| `f` | plein écran |
| `P` | fenêtre orateur |
| `:` | palette de commandes |
| `?` | aide clavier |

Les flèches et `PageUp`/`PageDown` fonctionnent aussi. La répétition d'une touche de
navigation est ignorée : une touche tenue n'empile pas les slides.

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

Les commentaires HTML ordinaires sont retirés du rendu.

## Fenêtre orateur

`P` ouvre une seconde fenêtre (à mettre sur l'autre écran, hors captation) qui affiche :

- les **notes** de la slide courante, en gros ;
- la position, le nombre de pas, le chrono, l'heure ;
- le titre de la slide **suivante**.

La synchronisation passe par `BroadcastChannel` : même origine, aucun serveur, aucun
compte. Si la fenêtre est ouverte après coup, elle se raccroche au premier changement.

## Captation (OBS)

- `?raw=1` masque le pied de scène et le curseur : la scène ne montre que la slide.
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

## Thèmes

`ardoise` (défaut, sombre), `paper` (clair), `gruvbox`, `nord`.
`:theme nord`, ou `:theme` seul pour passer au suivant. Le thème est mémorisé.

## Ce qui est mémorisé

Dans `localStorage` : le deck édité, les blocs live, le thème, la dernière slide.
`:reset` revient au deck de démonstration. Rien ne quitte le navigateur.

## Architecture

```
src/
├── App.svelte            état, clavier, commandes, orchestration
├── app.css               thèmes, typographie, mise en page (globale)
├── components/
│   ├── SlideView.svelte  rendu d'une slide, pas révélés
│   ├── Chrome.svelte     pied de scène (titre, chrono, position)
│   ├── Composer.svelte   saisie live + ancrage
│   ├── Editor.svelte     édition du markdown de la slide
│   ├── CommandBar.svelte palette `:`
│   ├── HelpOverlay.svelte aide générée depuis la table de raccourcis
│   ├── Overview.svelte   vue d'ensemble (miniatures réelles)
│   └── Presenter.svelte  fenêtre orateur (entrée séparée)
└── lib/
    ├── deck.js           parsing / sérialisation du format
    ├── render.js         markdown-it + highlight.js + mermaid
    ├── keys.js           table unique des raccourcis (aide incluse)
    └── storage.js        persistance locale
```

La table `KEYMAP` de `lib/keys.js` alimente à la fois le gestionnaire d'événements et
l'aide `?` : l'aide ne peut pas mentir sur le comportement.

## Limites assumées

- **Pas de backend** : le « terminal » est une palette de commandes, pas un vrai shell.
  Un vrai pty demanderait un serveur ; ici, tout est statique et hors-ligne.
- **PDF** : `:export` passe par l'impression du navigateur (« Enregistrer en PDF »),
  toutes les slides dépliées, une par page.
- **Mermaid** est chargé à la demande (~1 Mo) et seulement s'il y a un diagramme.
- **La fenêtre orateur** peut être bloquée par le bloqueur de pop-ups : autoriser le site.
- **`échap` enregistre** dans l'éditeur. C'est volontaire : en direct, on veut valider
  d'un geste. Le bouton `annuler` n'existe pas — le markdown précédent reste dans `git`.
- **Pas de multi-écran synchronisé** au-delà des notes : une seule scène pilote.

## Licence

MIT.

