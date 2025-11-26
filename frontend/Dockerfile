FROM node:20-alpine AS builder

WORKDIR /app

# Install yarn v4.12.0
RUN corepack enable && yarn set version 4.12.0

# Copy package and yarn files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --immutable

# Copy source code
COPY . .

# Build Next.js app
RUN yarn build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install yarn v4.12.0
RUN corepack enable && yarn set version 4.12.0

# Copy built application and yarn files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./

# Install production dependencies only
RUN yarn install --immutable --production

# Expose port
EXPOSE 3000

# Start Next.js
CMD ["yarn", "start"]
