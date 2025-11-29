#!/bin/bash

echo "🏗️ Building Arc Traitors frontends..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${YELLOW}📦 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Build frontend
print_status "Building frontend..."
cd frontend
if npm run build; then
    print_success "Frontend built successfully"
else
    print_error "Frontend build failed"
    exit 1
fi
cd ..

# Build backoffice
print_status "Building backoffice..."
cd backoffice
if npm run build; then
    print_success "Backoffice built successfully"
else
    print_error "Backoffice build failed"
    exit 1
fi
cd ..

# Create output directory structure
print_status "Creating output directory structure..."
mkdir -p dist/public
mkdir -p dist/admin

# Copy built files
print_status "Copying built files..."
cp -r frontend/dist/* dist/public/
cp -r backoffice/dist/* dist/admin/

print_success "All frontends built successfully!"
print_status "Frontend available in: dist/public/"
print_status "Admin available in: dist/admin/"