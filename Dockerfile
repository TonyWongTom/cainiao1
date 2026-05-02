FROM node:20-alpine AS build
# Add libc6-compat for some native modules if needed
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
# Use --legacy-peer-deps to bypass react-datepicker dependency conflicts
RUN npm install --legacy-peer-deps
COPY . .

# Build-time environment variables
# These need to be passed as --build-arg during docker build
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_APP_PASSWORD

ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
ENV VITE_APP_PASSWORD=$VITE_APP_PASSWORD

RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/firebase-applet-config.json ./firebase-applet-config.json
COPY --from=build /app/package*.json ./
COPY --from=build /app/server.ts ./
COPY --from=build /app/tsconfig.json ./
COPY --from=build /app/node_modules ./node_modules

EXPOSE 8080
CMD ["npm", "run", "start"]
