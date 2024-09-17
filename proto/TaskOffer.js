class TaskOffer {
  #verifToken = null
  constructor(opts) {
    this.initiator = opts.initiator
    this.name = opts.name
    this.uid = `toffer:uuid.${this.uuid};name.${this.name.substring(0, 8)};ts.${$.ts()}`
    this.description = opts.description
    this.values = opts.values
    this.ts = $.ts()
    this.#verifToken = 'verifToken' in opts ? opts.verifToken : $.hash(`${this.ts}${this.name}${this.description}${this.values.toSring()}`, 64)
    this.acceptedUser = false
  }
  get verifToken() { return this.#verifToken }
  set verifToken(x) { return false }
}

module.exports = { Task }

class ServiceProvider {
  constructor(opts) {
    this.name = opts.name
    this.net = opts.net
    this.tasks = []
    this.management = opts.management
  }

  participate() {
    this.management.registerParticipant(this.name, this)
  }
  connect() {
    
  }
}

module.exports = {
  TaskOffer
}