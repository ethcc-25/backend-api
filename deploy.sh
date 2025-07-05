#!/bin/bash

# Script de déploiement pour DeFi APY Server

echo "🚀 Démarrage du déploiement DeFi APY Server..."

# Vérifier si PM2 est installé
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installation de PM2..."
    npm install -g pm2
    
    # Configurer PM2 pour démarrer au boot
    pm2 startup
    echo "⚠️  Veuillez exécuter la commande affichée ci-dessus pour configurer PM2 au démarrage"
else
    echo "✅ PM2 est déjà installé"
fi

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm install

# Arrêter l'application si elle tourne déjà
echo "🛑 Arrêt de l'application existante..."
pm2 delete defi-apy-server 2>/dev/null || echo "Aucune application en cours"

# Démarrer l'application avec PM2
echo "🚀 Démarrage de l'application..."
pm2 start ecosystem.config.js --env production

# Sauvegarder la configuration PM2
echo "💾 Sauvegarde de la configuration PM2..."
pm2 save

# Afficher le statut
echo "📊 Statut de l'application:"
pm2 status

echo "✅ Déploiement terminé!"
echo ""
echo "🔧 Commandes utiles:"
echo "  npm run pm2:logs    - Voir les logs"
echo "  npm run pm2:restart - Redémarrer l'app"
echo "  npm run pm2:status  - Voir le statut"
echo "  npm run pm2:monit   - Monitoring en temps réel"
echo ""
echo "🌐 Votre serveur devrait être accessible sur:"
echo "  http://localhost:3000"
echo "  http://VOTRE_IP_PUBLIQUE:3000" 