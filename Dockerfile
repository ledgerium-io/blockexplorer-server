FROM mhart/alpine-node:8

RUN apk add --no-cache --virtual .build-deps \
       git \
       bash \
       curl \
       python \
       make \
       g++

RUN mkdir -p /app/server
WORKDIR /app/server

COPY package.json /app/server/

RUN npm install

COPY . /app/server/

ENTRYPOINT ["tail", "-f", "/dev/null"]
