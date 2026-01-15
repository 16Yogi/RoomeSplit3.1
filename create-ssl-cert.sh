#!/bin/bash
# Script to create self-signed SSL certificate for RoomieSplit
# This creates a certificate for development/testing purposes

SSL_DIR="/etc/ssl/roomiesplit"
DOMAIN="networkchef.online"

# Create SSL directory if it doesn't exist
sudo mkdir -p $SSL_DIR

# Generate private key
sudo openssl genrsa -out $SSL_DIR/roomiesplit.key 2048

# Generate certificate signing request
sudo openssl req -new -key $SSL_DIR/roomiesplit.key -out $SSL_DIR/roomiesplit.csr \
  -subj "/C=IN/ST=State/L=City/O=RoomieSplit/CN=$DOMAIN"

# Generate self-signed certificate (valid for 365 days)
sudo openssl x509 -req -days 365 -in $SSL_DIR/roomiesplit.csr \
  -signkey $SSL_DIR/roomiesplit.key -out $SSL_DIR/roomiesplit.crt

# Set appropriate permissions
sudo chmod 600 $SSL_DIR/roomiesplit.key
sudo chmod 644 $SSL_DIR/roomiesplit.crt

echo "SSL certificate created successfully!"
echo "Certificate: $SSL_DIR/roomiesplit.crt"
echo "Private Key: $SSL_DIR/roomiesplit.key"

