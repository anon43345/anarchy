class HashAlgorithm {
  constructor(opts) {
    this.name = opts.name
    this.fn = opts.fn
    this.schema = opts.schema
  }
}

class Schema {
  constructor(opts) {
    this.name = opts.name
    this.provider = opts.provider
  }
}