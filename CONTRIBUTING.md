# Contribuer à Opencadkid

## Signaler un problème ou proposer une idée

Le plus simple : le bouton **« Donner mon avis »** dans l'espace parents (derrière la petite question pour les adultes). Il ouvre, dans un nouvel onglet,
la page des formulaires du dépôt. On peut aussi passer par l'onglet *Issues* puis **New issue**.

Deux formulaires courts, en français :

- **Quelque chose ne marche pas** : quel jeu, ce qui s'est passé, sur quel appareil ;
- **J'ai une idée** : ce que vous aimeriez voir ou changer.

Seule la description est obligatoire. Un adulte peut aider un enfant à écrire.
Ce que vous écrivez est **public** : pas de nom, d'adresse, d'école ni de photo d'enfant.

Le jeu lui-même n'envoie rien : le bouton est un simple lien, sans compteur ni traceur.

Une faille de sécurité se signale en privé, comme indiqué dans [SECURITY.md](SECURITY.md).

## Proposer une modification

Les propositions de code sont les bienvenues, en français ou en anglais. Avant d'envoyer :
`npm run lint`, `npm test` et `npm run build` doivent passer.

Les tests de navigateur (Playwright) ne se lancent jamais en entier. `node scripts/e2e-impact.js --base <commit>`
indique ceux que la modification demande : les specs du jeu touché, ceux des jeux qui importent un module partagé
modifié, ou un test court par jeu quand l'effet ne peut pas être déterminé. La CI applique la même sélection.
Un nouveau fichier `tests/e2e/*.spec.ts` doit être inscrit dans un groupe de `scripts/e2e-impact.js` ;
`npm run test:impact` échoue sinon.

En contribuant, vous acceptez que votre contribution soit publiée sous la
[licence MIT](LICENSE) du projet.
