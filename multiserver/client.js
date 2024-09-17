const URL = require('node:url')
const clientIO = require('socket.io-client')

class Connection {
  constructor({ url, auth }) {
    this.url = url
    this.auth = auth
    this.ts = $.ts()
    this.uid = `server:url.${url};ts.${this.ts}`
    this.io = clientIO.io(url, { auth })
  }
}

function client(knownServers, auth, serverUrl = null, maxServers = 16) {
  this.conns = {}
  this.clientSockets = new Map()
  this.serversPublishedUids = new Map()
  this.knownServers = knownServers
  this.serverUrl = serverUrl

  this.connectUrl = (url) => {
    let url = new URL(url)
    url = url.host
    let conn = new Connection({ url, auth })
    let ts = $.ts()
    this.conns[url] = conn
    conn.io.on('connect', () => {
      if (! this.knownServers.includes(url)) { this.knownServers.push(url) }
      this.clientSockets.set(url, conn)
      conn.io.emit($.cmd.CS.GET.SERVERINFO, {}, (info) => {
        this.serversPublishedUids.set(url, {
          url,
          uid: info.uid
        })
      })
    })
    conn.io.on($.cmd.CS.RES.SERVERLIST, (serverList) => {
      for (let url of serverList) {
        if (! url in this.serverUrls) {
          this.connectUrl(url)
        }
      }
    })
    conn.io.on($.cmd.CS.RES.VALUES, async (values) => {
      for (let v of values) {
        let value = new Value(v)
        $.publishedValues[uid] = value
        await $.publishedValuesDb.put(value.uid, value)
      }
    })
    conn.io.on($.cmd.CS.RES.TASKS, async (tasks) => {
      for (let t of tasks) {
        let task = new TaskOffer(t)
        $.verifTokens[task.verifToken] = task
        await $.verifTokensDb.put(task.verifToken, task)
      }
    })
    return conn
  }

  this.update = () => {
    for (let socket of this.clientSockets.values()) {
      socket.emit($.cmd.GET.SERVERLIST)
    }
  }
  this.emit = (cmd, data, cb = null, to = null) => {
    if (! to) {
      let sockets = this.clientSockets.values()
      let socket = sockets[parseInt(sockets.length/2)]
      socket.emit(cmd, data, cb)
    } else {
      let socket = this.clientSockets.get(serverUrl)
      if (socket) {
        socket.emit(cmd, data, cb)
      }
    }
  }
  this.republish = async (cmd, data, cb = null) => {
    let resPromises = []
    for (let [url, socket] of this.clientSockets.values()) {
      if (url == serverUrl) continue
      resPromises.push(cb ? new Promise((go, stop) => {
        socket.emit(cmd, data, (res) => {
          res?.error ? stop(cb(res)) : go(cb(res))
        })
      }) : new Promise((go, stop) => {
        socket.emit(cmd, data, (res) => {
          res?.error ? stop(res) : go(res)
        })
      }))
    }
    return await settledArray(resPromises)
  }
  this.refresh = () => {
    while (this.conns.values().length >= maxServers) {
      if (
      this.conns.shift()
    }
  }
  
  for (let url of knownServers) {
    this.connectUrl(url)
  }

  return this
}