FROM node:20-slim

WORKDIR /app

# Copy only package files first for caching
COPY api/package*.json ./api/

# Install dependencies
RUN cd api && npm install

# Copy everything from the root context
COPY . .

# Build the API
RUN cd api && npm run build

EXPOSE 8080

# Start from the api directory
CMD ["npm", "start", "--prefix", "api"]
