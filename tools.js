const { Buffer } = require('node:buffer')

const cmd = {
  CS: {
    GET: {
      SERVERLIST: 'CS_GET_SERVERLIST',
      VALUES: 'CS_GET_VALUES',
      TASK: 'CS_GET_TASK',
      TASKS: 'CS_GET_TASKS',
      SERVERINFO: 'CS_GET_SERVERINFO',
    },
    RES: {},
    PUB: {
      VALUE: 'CS_PUB_VALUE'
    },
    EMIT_TO: 'CS_EMIT_TO',
    SUPPORT_VALUE: 'CS_SUPPORT_VALUE',
    ACCEPT_TASK: 'CS_ACCEPT_TASK',
    SETUP_SERVERHOLD_DEAL: 'CS_SETUP_SERVERHOLD_DEAL',
    REPORT_DEAL_DONE: 'CS_REPORT_DEAL_DONE',
    REPORT_CONFIRM: 'CS_REPORT_CONFIRM'
  },
  SS: {
    GET: {
      SERVERLIST: 'SS_GET_SERVERLIST',
      VALUES: 'SS_GET_VALUES',
      TASK: 'SS_GET_TASK',
      TASKS: 'SS_GET_TASKS',
      SERVERINFO: 'SS_GET_SERVERINFO',
    },
    RES: {},
    PUB: {
      VALUE: 'SS_PUB_VALUE',
      CLIENT_CONNECT: 'SS_PUB_CLIENT_CONNECT',
    },
    EMIT_TO: 'SS_EMIT_TO',
    SUPPORT_VALUE: 'SS_SUPPORT_VALUE',
    SETUP_SERVERHOLD_DEAL: 'SS_SETUP_SERVERHOLD_DEAL',
    REPORT_DEAL_DONE: 'SS_REPORT_DEAL_DONE',
    REPORT_CONFIRM: 'SS_REPORT_CONFIRM'
  },
  SC: {
    REPORT_DEAL_DONE: 'SC_REPORT_DEAL_DONE',
    TASK_PAYMENT: 'SC_TASK_PAYMENT',
    SERVERHOLD_ERR: 'SC_SERVERHOLD_ERR',
  },
  CALL: 'CALL',
  EV: {
    VALUE_PUBLISHED: 'VALUE_PUBLISHED',
    TASK_PUBLISHED: 'TASK_PUBLISHED',
    DEAL_FUNDED: 'DEAL_FUNDED',
  },
  ERR: 'ERR',
}
for (let command in cmd.CS.GET) {
  cmd.CS.RES[command] = `CS_RES_${cmd.CS.GET[command].substring(7)}`
  cmd.SS.RES[command] = `SS_RES_${cmd.SS.GET[command].substring(7)}`
}

function compact(bits) {
  let compacted = []
  for (let i = 0; i < bits.length; i++) {
    let bitsArray = Array.from(bits[i])
    if (i % 4 == 0) {
      for (let j = bitsArray.length - 1; j > 0; j--) {
        compacted.push(bitsArray[j])
      }
    } else if (i % 2 == 0 && i % 3 == 0) {
      for (let j = 0; j < bitsArray.length; j++) {
        compacted.push(bitsArray[j] == '1' ? '0' : '1')
      }
    } else if (i % 3 == 0) {
      for (let j = bitsArray.length - 1; j > 0; j--) {
        compacted.push(bitsArray[j] == '1' ? '0' : '1')
      }
    }
    compacted.push(bitsArray[bitsArray.length - 1])
  }
  return compacted
}

function hash(value, len) {
  let b64 = Buffer.from(value)
  let b64hex = b64.toString('hex')
  let b64hexSymbols = Array.from(b64hex)

  function compacter(hex) {
    let digits = []
    for (let symbol of hex) {
      digits.push(parseInt(symbol, 16))
    }
    let bits = []
    for (let digit of digits) {
      bits.push(digit.toString(2))
    }
    let compactedBits = compact(bits)
    let mixed = []
    for (let i = compactedBits.length; i > 0; i--) {
      if (i % 5 == 0) {
        mixed.push(compactedBits[i] == '1' ? '0' : '1')
      } else if (i % 4 == 0) {
        mixed.push(compactedBits[i])
      } else if (i % 3 == 0) {
        mixed.push(compactedBits[i] == '1' ? '0' : '1')
      } else {
        mixed.push(compactedBits[i])
      }
    }
    let compactedDigits = []
    for (let i = 0; i < mixed.length; i += 16) {
      let vbits = mixed.slice(i, i + 16).join('')
      compactedDigits.push(parseInt(vbits, 2))
    }
    let compactedHex = compactedDigits.map(d => d.toString(16)).join('')
    return compactedHex
  }

  let compacted = compacter(b64hexSymbols)
  if (compacted.length < len) {
    while (compacted.length < len) {
      compacted = compacted + compacter(b64hexSymbols)
    }
  }
  if (compacted.length > len) {
    compacted = compacted.substring(0, len)
  }
  return compacted
}

const settledArray = async (arr) => {
  let settled = await Promise.allSettled(arr)
  let res = []
  for (let x of settled) {
    res.push(x.status == 'fulfilled' ? x.value : x.reason)
  }
  return res
}

const ts = () => new Date().getTime()

module.exports = {
  hash,
  cmd,
  ts,
  settledArray
}