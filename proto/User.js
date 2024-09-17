class User {
  #uid = 0
  constructor({ uid, name, fp, transformations, checkers, authorizeCb }) {
    this.#uid = uid
    this.name = name
    this.fp = fp
    this.transformations = transformations
    this.checkers = checkers
    this.authorizeCb = authorizeCb
    this.tfp = null
  }
  get uid() { return this.#uid }
  set uid(x) { return false }
  
  async initTfp() {
    this.tfp = this.transformations.reduce(async (acc, cur) => {
      let tfp = await cur(acc)
      return tfp
    }, this.fp)
  }

  async authenticate(operation) {
    let checkPromises = []
    for (let checker of this.checkers) {
      checkPromises.push(checker({ ...operation, tfp: this.tfp }))
    }
    let checks = await Promise.all(checkPromises)
    let failures = []
    for (let check of checks) {
      if (!check) {
        failures.push(check)
      }
    }
    if (failures.length > 0) throw new Error('access denied: ', failures.join('\n'))
  }

  async requestAuthorization(operation) {
    let failures = await this.authenticate(operation)
    if (failures.length > 0) {
      throw new Error('access denied: ', failures.join('\n'))
    }
    return await this.authorizeCb(operation)
  }
}

module.exports = { User }