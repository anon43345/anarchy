class Value {
  constructor({ publisher, uid, desc }) {
    this.publisher = publisher
    this.uid = uid
    this.desc = desc
    this.acceptedPeers = new Set()
  }
}

module.exports = { Value }