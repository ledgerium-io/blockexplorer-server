process.title = "Ledgerium Block Explorer Daemon"
const dotenv = require('dotenv').config()
const axios = require('axios');
const express = require('express');
const mongoose = require('mongoose');
const chalk = require('chalk');
const app = express();
const cors = require('cors');
const port = process.env.SERVER_PORT || 1337;
const socket = require('socket.io');
const server = app.listen(port, () => {
  const io = module.exports = socket(server);
  console.log(chalk.green(`[+] Listening on port: ${port}`))
  const router = require('./routes/');
  app.use(express.json());
  app.use(cors());
  app.use('/', router)
})

const commandLineArguments = process.argv.slice(2)
if(commandLineArguments.includes('--resetHead')) {
  console.log("Deleting databases")
}

mongoose.connect(`mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}/${process.env.MONGO_DB}`, { useNewUrlParser: true });
  mongoose.connection.on('connected', () => {
  console.log(chalk.green(`[+] Connected to MongoDB Server`));
});
mongoose.connection.on('error', (error) => {
  console.log(chalk.red(`[X] ${error}`))
});
