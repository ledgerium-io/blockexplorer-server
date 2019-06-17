const cluster = require('cluster')
const chalk = require('chalk')
let clusterWorker = null

if (cluster.isMaster) {
  console.log(`${chalk.green('[+] Ledgerium BlockExplorer Daemon Cluster Manager initiated (PID: ' + process.pid)})`)
  clusterWorker = cluster.fork();

  cluster.on('exit', (worker, code, signal) => {
    console.log(chalk.red(code, signal))
    }
    clusterWorker = cluster.fork();
  });
}

if (cluster.isWorker) {
  console.log(chalk.yellow('[+] Spawned new worker (PID: ' + process.pid + ')'))
  const index = require('./index')
}
