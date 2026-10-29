# Sécurité

## Modèle de menace

ardoise est une application **entièrement côté navigateur** : aucun serveur, aucun
compte, aucune requête réseau au chargement (hors polices système et diagrammes
calculés localement). Il n'y a donc ni clé d'API, ni session, ni donnée à exfiltrer
côté serveur.

La seule entrée non fiable est **le markdown que tu ouvres** (fichier local, URL
distante, ou contenu déjà présent dans `localStorage`).

Ce qui borne cette entrée :

- markdown-it est configuré avec `html: false` : le HTML brut d'un deck n'est jamais
  interprété, il est échappé ;
- Mermaid est initialisé avec `securityLevel: 'strict'` ;
- les liens externes sont ouverts en `rel="noreferrer noopener"` ;
- l'application ne lit ni cookie, ni `location.hash`, ni paramètre d'URL autre que
  `slide`, `theme`, `raw`, `deck`, `presenter`.

Risque résiduel assumé : un deck importé peut contenir des liens vers des sites
tiers, et `?deck=` fait une requête `fetch` vers l'URL demandée (soumise à CORS).

## Signaler une faille

Ouvre un rapport privé :
<https://github.com/dbeley/ardoise/security/advisories/new>

Merci de ne pas créer d'issue publique avant correction. Un délai de 30 jours est
raisonnable pour un correctif ; ce projet est maintenu sur temps libre.
