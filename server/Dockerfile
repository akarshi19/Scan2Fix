FROM node:18-alpine

WORKDIR /app

# Install deps first (cached layer — only re-runs if package.json changes)
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Create uploads directory (persisted via Docker volume)
RUN mkdir -p uploads/complaints uploads/profiles

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "server.js"]
