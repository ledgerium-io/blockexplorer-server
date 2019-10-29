class BlockProcessor {
  constructor() {
    this.blockProcessQue = [];
  }

  getFirstFromQue() {
    if (this.blockProcessQue.length > 0) {
      const block = this.blockProcessQue[0];
      this.blockProcessQue.shift();
      return block;
    }
    return false;
  }

  addBlockProcessQue(block) {
    if (!block) return;
    this.blockProcessQue.push(block);
  }
}

module.exports = BlockProcessor;
