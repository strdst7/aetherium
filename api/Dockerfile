FROM node:20-slim

WORKDIR /app

# Copy package files for npm workspaces (root + both workspaces)
COPY package.json package-lock.json* ./
COPY api/package*.json ./api/
COPY web/package*.json ./web/

# Install all workspace dependencies
RUN npm install

# Copy everything and build
COPY . .
RUN cd api && npm run build

EXPOSE 8080

CMD ["npm", "start", "--prefix", "api"]
