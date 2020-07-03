FROM node:12-alpine AS builder
RUN apk add jq
WORKDIR /app
COPY submodules/web-server/package.json submodules/web-server/yarn.lock ./
RUN echo $(cat package.json | jq 'del(.devDependencies)') > package.json
RUN yarn --frozen-lockfile

FROM astefanutti/scratch-node:12
WORKDIR /app
COPY --from=builder /app/node_modules node_modules
COPY submodules/web-server/dist dist
COPY submodules/web-frontend/dist public
EXPOSE 8080
ENTRYPOINT ["node", "dist/index.js"]
