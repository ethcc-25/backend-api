#!/bin/bash

# Script de mise à jour pour DeFi APY Server

echo "🔄 Mise à jour du serveur DeFi APY..."

# Tirer les dernières modifications depuis GitHub
echo "📥 Récupération des dernières modifications..."
git pull origin master

# Vérifier si des changements ont été apportés
if [ $? -eq 0 ]; then
    echo "✅ Modifications récupérées avec succès"
    
    # Installer les nouvelles dépendances si nécessaire
    echo "📦 Vérification des dépendances..."
    npm install
    
    # Redémarrer l'application
    echo "🔄 Redémarrage de l'application..."
    pm2 restart defi-apy-server
    
    # Afficher le statut
    echo "📊 Statut de l'application:"
    pm2 status
    
    echo "✅ Mise à jour terminée!"
else
    echo "❌ Erreur lors de la récupération des modifications"
    exit 1
fi

# Afficher les logs récents
echo "📋 Logs récents:"
pm2 logs defi-apy-server --lines 10 