const socketIO = require('socket.io')
const levelup = require('levelup')
const leveldown = require('leveldown')
const memdown = require('memdown')

const msClient = require('./client')
const connectors = {
  deals: require('./connectors/deals').connect,
  reports: require('./connectors/reports').connect,
  tasks: tasks('./connectors/tasks').connect,
  values: require('./connectors/values').connect
}

if (! '$' in global) global.$ = {}
$.publishedValues = {}
$.publishedValuesDb = levelup(memdown())
$.verifTokens = {}
$.verifTokensDb = levelup(memdown())
$.holdOtps = {}
$.holdOtpsDb = levelup(memdown())
$.clients = {}

const dealsFunded = {}
const dealsFundedDb = levelup(memdown())

async function socketServer({ knownServers, url, port, socketIOOpts = {
  connectionStateRecovery: {  //  переподключение пользователя при падении вайфая или переключеннии сети
    maxDisconnectionDuration: 2 * 60 * 1000  //  сколько ждать онлайна пользователя в случае падения подключения
  }
} }) {
  global.$.publishedValuesDb = levelup(leveldown(`${dbPath}.publishedValues`))
  global.$.verifTokensDb = levelup(leveldown(`${dbPath}.taskVerifTokens`))
  global.$.holdOtpsDb = levelup(leveldown(`${dbPath}.holdOtps`))
  dealsFundedDb = levelup(leveldown(`${dbPath}.dealsFunded`))

  for await (const [key, value] of $.publishedValuesDb.iterator()) { $.publishedValues[key] = value }
  for await (const [key, value] of $.verifTokensDb.iterator()) { $.verifTokens[key] = value }
  for await (const [key, value] of $.holdOtpsDb.iterator()) { $.holdOtps[key] = value }
  for await (const [key, value] of dealsFundedDb.iterator()) { dealsFunded[key] = value }
  
  let url = this.url = url
  this.uid = `server:url.${url};ts.${$.ts()}`
  this.ms = new msClient(knownServers, { uuid: this.uid }, this.uid)
  $.clients = {}
  $.msClients = {}
  this.io = new socketIO.Server(socketIOOpts)

  this.emitToUser = ({ from, to, cmd, data }, cb) => {
    if (to in $.clients) {
      $.clients[to].emit(cmd, { ...data, from, to }, cb)
      return null
    }
    for (let serverUrl in $.msClients) {
      if ($.msClients[serverUrl].includes(to)) {
        this.ms.emit(cmd, { ...data, from, to }, cb, serverUrl)
        return null
      }
    }
  }
  
  this.pub = {}
  this.pub.dealInitiators = {}
  this.SERVERHOLD_CHECK_REQ = {}
  
  this.io.on('connection', (socket) => {
    if (! socket.recovered) {
      socket.data = {
        uuid: socket.handshake.auth.uuid,
        username: socket.handshake.auth?.username ?? socket.handshake.auth.uuid
      }
    }
    socket.on($.cmd.SS.PUB.CLIENT_CONNECT, ({ to, uuid }) => {
      if (! to in $.msClients) $.msClients[to] = []
      $.msClients[to].push(uuid)
    })
    socket.on('connect', () => {
      this.ms.republish($.cmd.SS.PUB.CLIENT_CONNECT, {
        to: this.url,
        uuid: socket.data.uuid
      })
      $.clients[socket.data.uuid] = socket
    })
    socket.on($.cmd.CS.GET.SERVERINFO, ({}, cb) => {
      cb({
        url: this.url,
        uid: this.uid
      })
    })
    socket.on($.cmd.CS.EMIT_TO, ({ to, data }) => {
      this.emitToUser({ from: socket.data.uuid, to, cmd: $.cmd.CALL, data })
    })
    socket.on($.cmd.SS.EMIT_TO, ({ from, to, cmd, data }) => {
      this.emitToUser({ from, to, cmd, data })
    })
    socket.on($.cmd.CS.GET.SERVERLIST, (cb) => {
      cb(Array.from(serverList))
    })
    socket.on($.cmd.SS.GET.SERVERLIST, (cb) => {
      cb(Array.from(serverList))
    })
    
    for (let i in connectors) {
      let binded = connectors[i].bind(this)
      socket = binded(socket)
    }
    
  })

  io.listen(port)
  this.io = io

  this.client = this.ms.connectUrl(url)

  return this
}

module.exports = { server }