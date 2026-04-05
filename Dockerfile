FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/serve.cjs ./
COPY --from=build /app/package.json ./
RUN npm install express http-proxy-middleware --production
EXPOSE ${PORT:-4173}
CMD ["node", "serve.cjs"]
