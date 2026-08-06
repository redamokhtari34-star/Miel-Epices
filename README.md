# Miel et Épices

Boutique en ligne de baklawas et pâtisseries artisanales algériennes — React 19 + Vite, Supabase (base de données), Stripe (paiement) et Resend (emails transactionnels), déployée sur Netlify.

## Stack

- **Frontend** : React 19, Vite, Tailwind CSS
- **Base de données** : Supabase (Postgres), tables `me_products`, `me_orders`, `me_reviews`, `me_contact_messages`
- **Paiement** : Stripe Checkout, avec webhook de confirmation
- **Emails** : Resend
- **Hébergement** : Netlify (site statique + Netlify Functions)

## Développement local

1. Installer les dépendances : `npm install`
2. Copier `.env.example` vers `.env` et renseigner les clés (voir les commentaires dans le fichier)
3. Lancer le serveur de dev : `npm run dev` (boutique + checkout Stripe basique via Express)

Pour tester l'espace admin, le webhook Stripe et les emails de confirmation en local, utiliser plutôt la CLI Netlify (`netlify dev`), qui exécute les fonctions dans `netlify/functions/`.

## Architecture des données

- Le **catalogue** (`me_products`) est public en lecture (clé anon), les écritures passent uniquement par les fonctions admin authentifiées.
- Les **commandes** (`me_orders`) sont créées en statut `awaiting_payment` au moment du checkout, puis confirmées (`pending`) uniquement par le **webhook Stripe** une fois le paiement réellement validé — jamais côté client.
- L'**espace artisan** (`/admin`) est protégé par un mot de passe vérifié côté serveur (`ADMIN_PASSWORD`), qui délivre un jeton de session signé pour les appels aux fonctions d'administration.

## Déploiement

Le site est prévu pour Netlify (`netlify.toml`). Variables d'environnement à configurer dans les paramètres du site Netlify : voir `.env.example`. Le webhook Stripe doit pointer vers `https://<votre-site>.netlify.app/.netlify/functions/stripe-webhook`.

Site en production : https://mieletepices.netlify.app

Mot de passe Espace Artisan et clés Stripe/Supabase configurés côté Netlify (jamais dans ce dépôt).
