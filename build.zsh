#!/bin/zsh

# Cores para output
autoload -U colors && colors
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
NC="\033[0m"

status() {
    echo -e "${YELLOW}➜ $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "🔨 Building Tiny Reactive..."

# Limpa tudo
status "Cleaning old builds..."
rm -rf public/dist
rm -rf worker/pkg worker/target
success "Clean complete"

# Build 1: WASM com glue (legacy/worker)
status "Building WASM (glue mode)..."
cd worker
if wasm-pack build --target web --out-dir ../public/dist; then
    success "WASM glue build successful"
else
    error "WASM glue build failed"
    exit 1
fi

# Build 2: WASM puro (SAB) - COM GLUE CODE PARA INICIAR!
status "Building WASM (SAB mode)..."
if wasm-pack build --target web --out-dir ../public/dist --out-name worker_sab; then
    success "WASM SAB build successful"
else
    error "WASM SAB build failed"
    exit 1
fi
cd ..

# Build TypeScript
status "Building Legacy mode..."
if bun run build:legacy; then
    success "Legacy mode built"
else
    error "Legacy mode failed"
fi

status "Building Worker mode (UI)..."
if bun run build:worker; then
    success "Worker UI built"
else
    error "Worker UI failed"
fi

status "Building Worker script..."
if bun run build:worker-ts; then
    success "Worker script built"
else
    error "Worker script failed"
fi

status "Building Worker+SAB mode (UI)..."
if bun run build:worker-sab; then
    success "Worker+SAB UI built"
else
    error "Worker+SAB UI failed"
fi

status "Building Worker+SAB script..."
if bun run build:worker-sab-ts; then
    success "Worker+SAB script built"
else
    error "Worker+SAB script failed"
fi

# Show results
status "Build complete! Files in public/dist:"
ls -la public/dist/

echo ""
echo -e "${GREEN}🚀 Ready to serve!${NC}"
echo ""
echo "📦 Legacy mode:    http://localhost:3000/legacy.html"
echo "⚙️ Worker mode:     http://localhost:3000/worker.html"
echo "⚡ Worker+SAB mode: http://localhost:3000/worker-sab.html"
echo ""
#!/bin/zsh

# Cores para output
autoload -U colors && colors
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
NC="\033[0m"

status() {
    echo -e "${YELLOW}➜ $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "🔨 Building Tiny Reactive..."

# Limpa tudo
status "Cleaning old builds..."
rm -rf public/dist
rm -rf worker/pkg worker/target
success "Clean complete"

# Build 1: WASM com glue (legacy/worker)
status "Building WASM (glue mode)..."
cd worker
if wasm-pack build --target web --out-dir ../public/dist; then
    success "WASM glue build successful"
else
    error "WASM glue build failed"
    exit 1
fi

# Build 2: WASM puro (SAB) - COM ATOMICS!
status "Building WASM (SAB mode)..."
if RUSTFLAGS='-C target-feature=+atomics,+bulk-memory' \
   wasm-pack build --target web --out-dir ../public/dist --out-name worker_sab; then
    success "WASM SAB build successful"
else
    error "WASM SAB build failed"
    exit 1
fi
cd ..

# Build TypeScript
status "Building Legacy mode..."
if bun run build:legacy; then
    success "Legacy mode built"
else
    error "Legacy mode failed"
fi

status "Building Worker mode (UI)..."
if bun run build:worker; then
    success "Worker UI built"
else
    error "Worker UI failed"
fi

status "Building Worker script..."
if bun run build:worker-ts; then
    success "Worker script built"
else
    error "Worker script failed"
fi

status "Building Worker+SAB mode (UI)..."
if bun run build:worker-sab; then
    success "Worker+SAB UI built"
else
    error "Worker+SAB UI failed"
fi

status "Building Worker+SAB script..."
if bun run build:worker-sab-ts; then
    success "Worker+SAB script built"
else
    error "Worker+SAB script failed"
fi

# Show results
status "Build complete! Files in public/dist:"
ls -la public/dist/

echo ""
echo -e "${GREEN}🚀 Ready to serve!${NC}"
echo ""
echo "📦 Legacy mode:    http://localhost:3000/legacy.html"
echo "⚙️ Worker mode:     http://localhost:3000/worker.html"
echo "⚡ Worker+SAB mode: http://localhost:3000/worker-sab.html"
echo ""
echo "Run: bun run serve:dev  (development server)"
echo "Run: bun run serve:prod (production server with SAB headers)"echo "Run: bun run serve:dev  (development server)"
