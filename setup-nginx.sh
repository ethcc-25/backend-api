#!/bin/bash

# Script de configuration nginx pour l'API DeFi

echo "🌐 Configuration de nginx pour api.mondeapp.app..."

# Créer le fichier de configuration nginx
echo "📝 Création du fichier de configuration nginx..."
sudo tee /etc/nginx/sites-available/api.mondeapp.app > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    
    server_name api.mondeapp.app;
    
    # Logs
    access_log /var/log/nginx/api.mondeapp.app.access.log;
    error_log /var/log/nginx/api.mondeapp.app.error.log;
    
    # Reverse proxy vers l'API Node.js sur le port 3000
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # Gestion des erreurs
    error_page 502 503 504 /50x.html;
    location = /50x.html {
        root /var/www/html;
    }
}
EOF

# Activer le site
echo "🔗 Activation du site..."
sudo ln -sf /etc/nginx/sites-available/api.mondeapp.app /etc/nginx/sites-enabled/

# Désactiver le site par défaut pour éviter les conflits
echo "🚫 Désactivation du site par défaut..."
sudo rm -f /etc/nginx/sites-enabled/default

# Tester la configuration
echo "🧪 Test de la configuration nginx..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuration nginx valide!"
    
    # Recharger nginx
    echo "🔄 Rechargement de nginx..."
    sudo systemctl reload nginx
    
    echo "✅ Configuration nginx terminée!"
    echo ""
    echo "🌐 Votre API est maintenant accessible sur:"
    echo "  http://api.mondeapp.app/api/health"
    echo ""
    echo "📊 Vérification des services:"
    echo "  - Nginx: $(sudo systemctl is-active nginx)"
    echo "  - API sur port 3000: $(ss -tlnp | grep :3000 | wc -l) processus"
else
    echo "❌ Erreur dans la configuration nginx!"
    exit 1
fi 