# Quorum Block Explorer Backend


### Quick start

`git clone https://github.com/SkyTradeInc/quorumblockexporer.git`

`cd quorumblockexporer`

`npm i`

`touch .env`

Edit the .env and add the following fields

```
SERVER_PORT=
MONGO_USERNAME=
MONGO_PASSWORD=
MONGO_HOST=
MONGO_DB=
WEB3_HTTP=
WEB3_WS=
```

`node daemon`

To reset Sync start with flag '--resync'

`node daemon --resync`
