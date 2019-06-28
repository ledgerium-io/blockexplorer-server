class TransactionProcessor {

  constructor() {
    this.transactionProcessQue = []
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
