# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies for building native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install runtime dependencies if needed (better-sqlite3)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

# Create a directory for the database
RUN mkdir -p /app/data

ENV PORT=3000
ENV DB_PATH=/app/data/task_workflow.db

EXPOSE 3000

CMD ["npm", "start"]
