class Deal {
  #verifToken = null
  constructor(opts) {
    this.type = opts.type
    this.initiator = opts.initiator
    this.responder = opts.responder
    this.offerToken = opts.offerToken
    this.values = opts.values
    this.status = opts?.status ?? 'open'
    this.reportData = {}
    this.responderWallet = null
    this.ts = 'ts' in opts ? opts.ts : $.ts()
    this.#verifToken = 'verifToken' in opts ? opts.verifToken : $.hash(`${this.ts}${this.initiator}${this.responder}${this.offerToken}${this.values.toSring()}`, 64)
    if (type == 'serverhold') {
      this.serverHoldsData = opts?.serverHoldsData ?? {},
      this.serverHoldsResults = opts?.serverHoldsResults ?? {},
      this.holdReleases = null
    }
  }
  get verifToken() { return this.#verifToken }
  set verifToken(x) { return false }
}

module.exports = { Deal }