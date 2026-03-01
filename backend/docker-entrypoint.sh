#!/bin/bash
set -e

# Run migrations
php artisan migrate --force

# Seed database if users table is empty
php artisan db:seed --force || true

# Cache config and routes
php artisan config:cache
php artisan route:cache

# Start Apache
apache2-foreground
