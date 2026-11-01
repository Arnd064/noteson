# NOTESON — Macadam / Liquid Glass (version 0.3)

Une application musicale **sur un seul écran**, prévue pour iPhone et hébergée gratuitement sur **GitHub Pages**. Pas de compte Apple Developer, pas de npm, pas de Cloudflare.

## Installer sur GitHub Pages

1. Décompresse `NOTESON-Macadam-GitHub-v0.3.zip`.
2. Crée un dépôt public via https://github.com/new ; nom suggéré : `noteson`.
3. Dans le dépôt, choisis **Add file → Upload files**. Ajoute le contenu **à l'intérieur du dossier décompressé**, directement à la racine du dépôt : `index.html`, `assets/`, `data/`, `manifest.webmanifest`, `sw.js`, etc. Clique sur **Commit changes**. Si tu remplaces une version existante, écrase les fichiers correspondants et conserve la même adresse GitHub Pages.
4. Dans **Settings → Pages**, choisis **Deploy from a branch**, puis `main`, dossier `/(root)`, et **Save**.
5. Ouvre `https://TON-PSEUDO.github.io/noteson/` (adresse exacte indiquée par GitHub). Sur iPhone, dans Safari : **Partager → Sur l'écran d'accueil**.

**Important :** si tu as une ancienne version en cache, actualise Safari puis ferme et rouvre la PWA. Le cache du service worker change d'identifiant avec cette version.

## Interface (un écran, sans scrolling)

La page principale montre uniquement **la pochette, le titre, l'artiste et la note**. Le fond est crème, le texte graphite, avec un accent jaune discret. La barre fixe est translucide, floutée et arrondie (« Liquid Glass »). Il n'y a **aucune liste, aucun curseur ni onglet** sur l'écran principal.

- **Glisser vers le haut** sur la zone de la pochette/la note : augmenter la note par pas de **0,5**. Glisser vers le bas : diminuer. Intervalle : **0,5 à 5**. La note préremplie est 3,0, sans être enregistrée avant validation.
- **Toucher la pochette** : enregistrer la note actuelle. Répéter un geste et valider pour modifier une note.
- **Flèches gauche/droite** : parcourir les albums du jour.
- **Dock Liquid Glass** : **Réécouter** (lien direct Apple Music vérifié, sinon recherche Apple Music), **Journal**, **Partager**, **Réglages**.
- **Journal** : en attente/notés, recherche, ajout d'un album existant depuis Apple Music, tous accessibles dans un panneau superposé. Choisir un album le ramène à l'écran central.
- **Réglages** : quota de **1 à 5 albums par jour**, genre fixe, alternance selon le jour, mélange, surprise, préférences, 3 coefficients, export et import des données. Panneau superposé (défilement **interne** uniquement pour les formulaires).
- Sur ordinateur : **↑ / ↓** pour la note, **Entrée** pour valider, **← / →** pour changer d'album, **Échap** pour fermer un panneau.

## Recommandations et données

- Algorithme local déterministe, alimenté par les notes des albums (demi-points acceptés), les références, genres et préférences. Nouveau tirage **à la première ouverture du jour**. Le tirage d'un jour donné reste stable et les albums non notés restent dans le Journal.
- Catalogue initial éditorial de **101 albums**, défini dans `data/catalog.json`. L'algorithme n'est **pas une IA générative**. Une future IA conversationnelle nécessiterait un service externe pour protéger ses clés API : **ne jamais inclure une clé API dans du JavaScript GitHub Pages**.
- Les données sont conservées dans `localStorage` **sur cet appareil et navigateur seulement**. Aucun compte, aucune synchronisation entre appareils. Utilise **Réglages → Exporter mon Atlas** régulièrement ; tu peux l'importer ailleurs. Les exports de version 0.2 restent compatibles, et les notes anciennes de 1 à 5 sont reconnues.
- Les pochettes et liens directs sont vérifiés, dans la mesure du possible, avec la recherche publique iTunes. Sinon une **recherche Apple Music** est proposée à la place ; aucune URL d'album n'est inventée. Il faut Internet pour cette vérification ou pour écouter les albums.

## Tester localement

Lance un serveur HTTP depuis le dossier contenant `index.html` :

```bash
python -m http.server 8000
```

Ouvre ensuite `http://localhost:8000/` (le double-clic `file://` ne permet généralement pas le chargement du catalogue). Pour les tests métier :

```bash
node --test tests/*.test.mjs
```

## Où modifier les éléments

| Fichier | Responsabilité |
|---|---|
| `assets/style.css` | Direction artistique Macadam, mise en page à écran unique, Liquid Glass, animations, adaptations iPhone |
| `assets/app.mjs` | Écran central, gestes, notation, dock, panneaux Journal et Réglages |
| `assets/core.mjs` | Moteur de recommandations et configuration des genres et du quota quotidien |
| `assets/storage.mjs` | Sauvegarde, migration, export/import et vérification des données |
| `assets/apple.mjs` | Recherche Apple, vérification des albums et liens externes |
| `data/catalog.json` | Base initiale des albums, enrichissable |
| `sw.js` / `manifest.webmanifest` | PWA et mise en cache |
| `tests/` | Tests Node sans dépendances |

Ce projet est indépendant d'Apple. Conserve les sauvegardes personnelles **hors du dépôt GitHub public**.
