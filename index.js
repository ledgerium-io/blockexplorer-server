process.title = "Ledgerium Block Explorer Daemon v1.0"
require('dotenv').config()
const chalk = require('chalk');
const cluster = require('cluster')

const express = require('express');
const mongoose = require('mongoose');
const app = express();
const cors = require('cors');

const port = process.env.SERVER_PORT || 1337;
const socket = require('socket.io');
const server = app.listen(port, () => {
 console.log(chalk.green(`[+] Listening on port: ${port}`))
 const router = require('./routes/');
 app.use(express.json());
 app.use(cors());
 app.use('/', router)
})

if(!process.env.WEB3_HTTP) {
 process.exit(401)
}
if(!process.env.WEB3_WS) {
 process.exit(402)
}

mongoose.set('useCreateIndex', true);
mongoose.connect(`mongodb://${process.env.MONGO_HOST}:27017/${process.env.MONGO_DB}`, {useNewUrlParser: true});
 mongoose.connection.on('connected', () => {
 console.log(chalk.green(`[+] Connected to MongoDB Server`));
});
mongoose.connection.on('error', (error) => {
 console.log(chalk.red(`[X] ${error}`))
 process.exit(500)
});

const commandLineArguments = process.argv.slice(2)
if(commandLineArguments.includes('--resync')) {
 console.log(chalk.bgRed('[!] Started with --resync'))
 console.log(chalk.bgRed('[!] Resetting database'))
 const Block = require('./models/Block')
 const Transaction = require('./models/Transaction')
 const Address = require('./models/Address')
 let promises = []
 promises.push(Block.deleteMany({}))
 promises.push(Transaction.deleteMany({}))
 promises.push(Address.deleteMany({}))
 Promise.all(promises)
   .then(() => {
     console.log(chalk.bgRed("[!] Database reset"))
     global.isReady=true
   })

} else {
   global.isReady=true
}


if (cluster.isMaster) {
 console.log(chalk.red('\n Run application with `node daemon`'))
 process.exit(1)
}

module.exports = socket(server);
