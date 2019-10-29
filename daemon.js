const cluster = require('cluster')
const chalk = require('chalk')

if (cluster.isMaster) {
  console.log(`${chalk.green('[+] Ledgerium Block Explorer Daemon Cluster Manager initiated (PID: ' + process.pid)})`)
  cluster.fork();

  cluster.on('exit', (worker, code, signal) => {
    console.log(chalk.yellow('[+] worker' + worker + ' code' + code + ' signal' + signal + ')'))
    switch(code) {
      case 401:
        console.log(chalk.red('\n[X] Missing WEB3_HTTP in .env'))
        process.exit(1)
        break;
      case 402:
      console.log(chalk.red('\n[X] Missing WEB3_WS in .env'))
        process.exit(1)
        break;
      case 403:
      console.log(chalk.red('\n[X] Missing MONGO_DB, MONGO_HOST, MONGO_PASSWORD or MONGO_USERNAME in .env'))
        process.exit(1)
        break;
      case 500:
          process.exit(1)
          break;
      default:
        break;
    }
    cluster.fork();
  });
}

if (cluster.isWorker) {
  console.log(chalk.yellow('[+] Spawned new worker (PID: ' + process.pid + ')'))
  require('./index')
}
