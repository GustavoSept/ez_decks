FROM node:20.17-bookworm-slim

WORKDIR /usr/src/app

RUN apt-get update -y && apt-get install -y openssl

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --silent

# Copy the rest of the application code
COPY . .

# Build the NestJS application
RUN npm run build

# Default command to be overridden based on environment
ARG NODE_ENV
ENV NODE_ENV=${NODE_ENV}

# Different commands for different environments
CMD if [ "$NODE_ENV" = "production" ]; then npm run start:prod; \
   elif [ "$NODE_ENV" = "development" ]; then npm run start:dev; \
   elif [ "$NODE_ENV" = "test" ]; then npm run test:watch; \
   else npm run start; fi
