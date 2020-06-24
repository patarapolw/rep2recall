FROM node:10-alpine AS web
RUN mkdir -p /web
WORKDIR /web
COPY packages/web/package.json packages/web/package-lock.json /web/
RUN npm i
COPY packages/web /web
ARG VUE_APP_FIREBASE_CONFIG
ARG VUE_APP_BASE_URL
RUN npm run build

FROM node:12-alpine
RUN mkdir -p /server
WORKDIR /server
COPY packages/server/package.json packages/server/yarn.lock /server/
RUN yarn
COPY packages/server /server
RUN yarn build
RUN yarn install --production --ignore-scripts --prefer-offline
COPY --from=web /web/dist /server/public
EXPOSE 8080
CMD [ "yarn", "start" ]