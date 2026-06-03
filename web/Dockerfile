FROM node:20-slim

WORKDIR /app

# Copy only package files first for caching
COPY web/package*.json ./web/

# Install dependencies
RUN cd web && npm install

# Copy everything from the root context
COPY . .

# Build the Web app
RUN cd web && npm run build

EXPOSE 3000

# Start from the web directory
CMD ["npm", "start", "--prefix", "web"]
