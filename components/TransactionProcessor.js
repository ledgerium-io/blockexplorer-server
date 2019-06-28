class TransactionProcessor {

  constructor() {
    this.transactionProcessQue = []
    // this.queWatcher()
  }

  queWatcher() {
    const tx = this.getFirstFromQue()
    this.processTransaction(tx)
      .then(result => {
        this.queWatcher()
      })
      .catch(error => {
        console.log(error)
        setTimeout(()=>{
          this.queWatcher()
        },5000)
      })
  }

  getFirstFromQue() {
    if(this.transactionProcessQue.length > 0) {
      const tx = this.transactionProcessQue[0]
      this.transactionProcessQue.shift()
      return tx
    } else {
      return false
    }
  }

  addTransactionProcessQue(tx) {
    if(!tx) return
    this.transactionProcessQue.push(tx)
  }

}

module.exports = TransactionProcessor
