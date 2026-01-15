#!/bin/bash

# RoomieSplit Automated Setup Script
# This script automatically sets up the RoomieSplit application on a Linux machine

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/html/RoomieSplit-main"
SERVICE_NAME="roomiesplit-backend"
NGINX_SITE_NAME="roomiesplit"
PORT="2211"
BACKEND_PORT="3001"

# Functions
print_step() {
    echo -e "${BLUE}==> $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then 
        print_error "Please run as root or with sudo"
        exit 1
    fi
}

check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        print_warning "Please install Node.js v18 or higher first"
        print_warning "Run: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version must be 18 or higher. Current version: $(node --version)"
        exit 1
    fi
    print_success "Node.js $(node --version) is installed"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    print_success "npm $(npm --version) is installed"
    
    # Check nginx
    if ! command -v nginx &> /dev/null; then
        print_warning "nginx is not installed. Installing..."
        apt-get update
        apt-get install -y nginx
        print_success "nginx installed"
    else
        print_success "nginx is installed"
    fi
    
    # Check if app directory exists
    if [ ! -d "$APP_DIR" ]; then
        print_error "Application directory not found: $APP_DIR"
        exit 1
    fi
    print_success "Application directory found"
}

install_backend_dependencies() {
    print_step "Installing backend dependencies..."
    cd "$APP_DIR/server"
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found in server directory"
        exit 1
    fi
    
    npm install --production
    print_success "Backend dependencies installed"
}

install_frontend_dependencies() {
    print_step "Installing frontend dependencies..."
    cd "$APP_DIR"
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found in application directory"
        exit 1
    fi
    
    npm install
    print_success "Frontend dependencies installed"
}

build_frontend() {
    print_step "Building frontend application..."
    cd "$APP_DIR"
    
    npm run build
    
    if [ ! -d "dist" ]; then
        print_error "Build failed - dist directory not found"
        exit 1
    fi
    
    print_success "Frontend built successfully"
}

setup_permissions() {
    print_step "Setting up permissions..."
    
    # Frontend dist directory
    chown -R www-data:www-data "$APP_DIR/dist"
    print_success "Frontend dist permissions set"
    
    # Backend server directory
    chown -R www-data:www-data "$APP_DIR/server"
    print_success "Backend server permissions set"
    
    # Data file
    if [ -f "$APP_DIR/data-template.json" ]; then
        chown www-data:www-data "$APP_DIR/data-template.json"
        chmod 664 "$APP_DIR/data-template.json"
        print_success "Data file permissions set"
    fi
}

setup_systemd_service() {
    print_step "Setting up systemd service..."
    
    SERVICE_FILE="$APP_DIR/server/roomiesplit-backend.service"
    SYSTEMD_FILE="/etc/systemd/system/$SERVICE_NAME.service"
    
    if [ ! -f "$SERVICE_FILE" ]; then
        print_error "Service file not found: $SERVICE_FILE"
        exit 1
    fi
    
    cp "$SERVICE_FILE" "$SYSTEMD_FILE"
    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    
    # Check if service is already running
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        systemctl restart "$SERVICE_NAME"
    else
        systemctl start "$SERVICE_NAME"
    fi
    
    # Wait a moment for service to start
    sleep 2
    
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        print_success "Backend service started successfully"
    else
        print_error "Backend service failed to start"
        print_warning "Check logs with: journalctl -u $SERVICE_NAME -n 50"
        exit 1
    fi
}

setup_nginx_http() {
    print_step "Setting up nginx (HTTP)..."
    
    NGINX_CONFIG="$APP_DIR/nginx-roomiesplit.conf"
    NGINX_AVAILABLE="/etc/nginx/sites-available/$NGINX_SITE_NAME"
    NGINX_ENABLED="/etc/nginx/sites-enabled/$NGINX_SITE_NAME"
    
    if [ ! -f "$NGINX_CONFIG" ]; then
        print_error "Nginx config file not found: $NGINX_CONFIG"
        exit 1
    fi
    
    cp "$NGINX_CONFIG" "$NGINX_AVAILABLE"
    ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"
    
    # Test nginx configuration
    if nginx -t > /dev/null 2>&1; then
        print_success "Nginx configuration is valid"
    else
        print_error "Nginx configuration test failed"
        nginx -t
        exit 1
    fi
    
    systemctl restart nginx
    
    if systemctl is-active --quiet nginx; then
        print_success "Nginx restarted successfully"
    else
        print_error "Nginx failed to restart"
        exit 1
    fi
}

setup_firewall() {
    print_step "Checking firewall..."
    
    if command -v ufw &> /dev/null; then
        if ufw status | grep -q "Status: active"; then
            print_warning "UFW firewall is active"
            ufw allow "$PORT/tcp" > /dev/null 2>&1
            print_success "Firewall rule added for port $PORT"
        else
            print_success "UFW firewall is not active (skipping)"
        fi
    else
        print_success "UFW not installed (skipping firewall setup)"
    fi
}

verify_setup() {
    print_step "Verifying setup..."
    
    # Check backend service
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        print_success "Backend service is running"
    else
        print_error "Backend service is not running"
        return 1
    fi
    
    # Check backend port
    if ss -tlnp 2>/dev/null | grep -q ":$BACKEND_PORT "; then
        print_success "Backend is listening on port $BACKEND_PORT"
    else
        print_warning "Backend port $BACKEND_PORT not found (may take a moment)"
    fi
    
    # Check nginx
    if systemctl is-active --quiet nginx; then
        print_success "Nginx is running"
    else
        print_error "Nginx is not running"
        return 1
    fi
    
    # Check nginx port
    if ss -tlnp 2>/dev/null | grep -q ":$PORT "; then
        print_success "Nginx is listening on port $PORT"
    else
        print_warning "Nginx port $PORT not found"
    fi
    
    # Test backend API
    sleep 1
    if curl -s http://localhost:$BACKEND_PORT/api/roommates > /dev/null 2>&1; then
        print_success "Backend API is responding"
    else
        print_warning "Backend API test failed (may need a moment to start)"
    fi
}

print_summary() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Setup completed successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Application is available at:"
    echo -e "  ${BLUE}HTTP:${NC} http://$(hostname -I | awk '{print $1}'):$PORT"
    echo ""
    echo "Useful commands:"
    echo "  Service status:  systemctl status $SERVICE_NAME"
    echo "  Service logs:    journalctl -u $SERVICE_NAME -f"
    echo "  Restart service: systemctl restart $SERVICE_NAME"
    echo "  Nginx status:    systemctl status nginx"
    echo "  Nginx logs:      tail -f /var/log/nginx/roomiesplit-error.log"
    echo ""
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "========================================="
    echo "RoomieSplit Automated Setup Script"
    echo "========================================="
    echo -e "${NC}"
    echo ""
    
    check_root
    check_prerequisites
    install_backend_dependencies
    install_frontend_dependencies
    build_frontend
    setup_permissions
    setup_systemd_service
    setup_nginx_http
    setup_firewall
    verify_setup
    print_summary
}

# Run main function
main

