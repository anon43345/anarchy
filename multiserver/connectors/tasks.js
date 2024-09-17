const { TaskOffer } = require('../proto/TaskOffer')

const connect = (socket) => {
  socket.on($.cmd.CS.PUB.TASK, async ({ initiator, name, description, values }, cb) => {
    let offer = new TaskOffer({ initiator, name, description, values })
    let verifToken = offer.verifToken
    $.verifTokens[verifToken] = offer
    $.verifTokensDb.put(verifToken, offer)
    this.ms.republish($.cmd.SS.PUB.TASK, offer)
    cb(verifToken)
  })
  socket.on($.cmd.SS.PUB.TASK, async (offer) => {
    let localOffer = new TaskOffer(offer)
    $.verifTokens[offer.verifToken] = localOffer
    $.verifTokensDb.put(verifToken, localOffer)
  })
  socket.on($.cmd.CS.GET.TASKS, ({}, cb) => {
    let tasks = Array.from($.verifTokens.values())
    tasks = tasks.filter(x => (x instanceof TaskOffer))
    cb(tasks)
  })
  socket.on($.cmd.CS.ACCEPT_TASK, async ({ responder, verifToken }, cb = null) => {
    if (! verifToken in $.verifTokens) {
      if (cb) cb({ error: 'task not found', data: verifToken })
      return null
    }
    this.emitToUser({ from: responder, to: $.verifTokens[verifToken].initiator, cmd: $.cmd.CS.ACCEPT_TASK, data: { responder, verifToken } })
  })

  return socket
}

module.exports = { connect }