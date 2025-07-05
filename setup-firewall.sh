#!/bin/bash

# Script de configuration firewall pour DeFi APY Server

echo "🔒 Configuration du firewall Ubuntu..."

# Vérifier si UFW est installé
if ! command -v ufw &> /dev/null; then
    echo "📦 Installation d'UFW..."
    sudo apt update
    sudo apt install -y ufw
fi

# Réinitialiser UFW
echo "🔄 Réinitialisation d'UFW..."
sudo ufw --force reset

# Règles par défaut
echo "📋 Configuration des règles par défaut..."
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Autoriser SSH (important pour ne pas se bloquer)
echo "🔑 Autorisation SSH..."
sudo ufw allow ssh
sudo ufw allow 22

# Autoriser le port 3000 pour l'API
echo "🌐 Autorisation du port 3000 pour l'API..."
sudo ufw allow 3000

# Autoriser HTTP et HTTPS pour le domaine
echo "🌐 Autorisation HTTP/HTTPS..."
sudo ufw allow 80
sudo ufw allow 443

# Activer UFW
echo "✅ Activation d'UFW..."
sudo ufw --force enable

# Afficher le statut
echo "📊 Statut du firewall:"
sudo ufw status verbose

echo "✅ Configuration du firewall terminée!"
echo ""
echo "🔧 Ports ouverts:"
echo "  - 22 (SSH)"
echo "  - 80 (HTTP)"
echo "  - 443 (HTTPS)"
echo "  - 3000 (API DeFi)"
echo ""
echo "🌐 Votre API devrait maintenant être accessible sur:"
echo "  http://154.42.7.65:3000" 