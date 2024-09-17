const { Value } = require('../proto/Value')

const connect = (socket) => {
  socket.on($.cmd.CS.PUB.VALUE, async ({ publisher, desc }) => {
    let uid = `value:publ.${publisher};desc.${desc.substring(0, 8)};ts.${$.ts()}`
    let value = new Value({ uid, publisher, desc })
    $.publishedValues[uid] = value
    await $.publishedValuesDb.put(uid, value)
    this.ms.republish($.cmd.SS.PUB.VALUE, { uid, publisher, desc })
  })
  socket.on($.cmd.SS.PUB.VALUE, async ({ uid, publisher, desc }) => {
    let value = new Value({ uid, publisher, desc })
    $.publishedValues[uid] = value
    await $.publishedValuesDb.put(uid, value)
  })
  socket.on($.cmd.CS.GET.VALUES, (cb) => {
    cb($.publishedValues)
  })
  socket.on($.cmd.SS.GET.VALUES, (cb) => {
    cb($.publishedValues)
  })
  socket.on($.cmd.CS.SUPPORT_VALUE, ({ supporter, value }, cb = null) => {
    if (! value.uid in $.publishedValues) {
      if (cb) cb({ error: 'value not found', data: value.uid })
      return null
    }
    $.publishedValues[value.uid].acceptedPeers.add(supporter)
    this.ms.republish($.cmd.SS.SUPPORT_VALUE, { supporter, value })
  })
  socket.on($.cmd.SS.SUPPORT_VALUE, ({ supporter, value }) => {
    if (! value.uid in $.publishedValues) {
      return null
    }
    $.publishedValues[value.uid].acceptedPeers.add(supporter)
  })

  return socket
}

module.exports = { connect }