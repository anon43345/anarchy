const { Deal } = require('../proto/Deal')

async function checkUserToServerPayment({ initiator, offerToken, values, otp }) {
  //  здесь код проверки трансфера денег серверу на удержание на время выполнения задачи
  //  сюда можно подключить не только крипту, но и классические деньги
  //
  //  параметры:
  //    initiator - кросс-серверный uid заказчика, который бронирует на сервере оплату своей задачи
  //    offerToken - токен задачи, за выполнение которой он бронирует оплату
  //    values - список наград в виде массива пар значений валюта:сумма
  //    {
  //      btc: '0.1',  //  должно совпадать с тем, что получил сервер
  //      topBank3Cash2: '150'  //  должно совпадать с тем, что получил сервер
  //    }
  //    otp - одноразовый код этой проверки, который остаётся на других серверах, которые её запрашивают
  //
  //  функция должна вернуть результат в таком формате:
  //    {
  //      success: true, если сервер получил не меньше values оплаты от initiator
  //      ts: timestamp успешного чека, если success === true
  //      verifToken: уникальный одноразовый токен этой брони
  //      data: уникальные детали платежа для его идентификации
  //    }
}

const checkHoldsGroup = async (deal, serverHoldsData) => {
  let holdCheckPromises = new Map()
  for (let url in serverHoldsData) {
    holdCheckPromises.set(url, checkHold(deal.verifToken, url, serverHoldsData[url]))
  }
  let holdResults = await Promise.allSettled(holdCheckPromises.values())
  let urls = Object.keys(serverHoldsData)
  for (let i in holdResults) {
    if (! urls[i] in deal.serverHoldResults) deal.serverHoldsResults[urls[i]] = {}
    if (holdResults[i].status == 'fulfilled') {
      deal.serverHoldsResults[urls[i]][this.uid] = {
        ...holdResults[i].value,
        otp: $.holdOtps[`${deal.verifToken}:${this.uid}:${urls[i]}`],
        status: 'success'
      }
    } else if (holdResults[i].status == 'rejected') {
      deal.serverHoldsResults[urls[i]][this.uid] = {
        ...holdResults[i].value,
        otp: $.holdOtps[`${deal.verifToken}:${this.uid}:${urls[i]}`],
        status: 'failed'
      }
    }
  }
  return deal
}

const updateHoldsResults = (deal, results) => {
  for (let url in deal.serverHoldsResults) {
    if (! url in results) continue
    for (let uid in deal.serverHoldsResults[url]) {
      if (uid in results[url] && deal.serverHoldsResults[url][uid].status == 'failed' && results[url][uid].status == 'success') {
        deal.serverHoldsResults[url][uid] = results[url][uid]
      }
    }
    for (let uid in results[url]) {
      if (! uid in deal.serverHoldsResults[url]) deal.serverHoldsResults[url][uid] = results[url][uid]
    }
  }
  for (let url in results) {
    if (! url in deal.serverHoldsResults) deal.serverHoldsResults[url] = results[url]
  }
  $.verifTokens[deal.verifToken] = deal
  $.verifTokensDb.put(deal.verifToken, deal)
}

const connect = (socket, dealsFunded, dealsFundedDb) => {
  socket.on($.cmd.SS.SERVERHOLD_CHECK_REQ, async ({ dealToken, otp }, cb) => {
    if (! dealToken in $.verifTokens) {
      cb({ success: false, data: { url: this.url, uid: this.uid, otp, error: 'deal-to-offer link failed', data: { offerToken } } })
      return null
    }
    let deal = $.verifTokens[dealToken]
    let serverHoldConfirm = await checkUserToServerPayment({ initiator: deal.initiator, offerToken, values: offer.values, otp })
    if (! serverHoldConfirm.success) {
      cb({ success: false, data: { url: this.url, uid: this.uid, otp, error: 'hold not confirmed', data: { offerToken } } })
      return null
    }
    dealsFunded[dealToken] = serverHoldConfirm
    dealsFundedDb.put(dealToken, serverHoldConfirm)
    cb({ success: true, data: { ...serverHoldConfirm, url: this.url, uid: this.uid, otp } })
  })

  const checkHold = async (verifToken, url, serverHoldData) => {
    return new Promise((go, stop) => {
      if (! this.ms.clientSockets.keys().includes(url)) {
        this.ms.connectUrl(url)
      }
      let otp = $.hash(`${$.ts()}${verifToken}${$.ts()}${this.url}${$.ts()}${url}${$.ts()}`, 32)
      $.holdOtps[`${verifToken}:${this.uid}:${url}`] = otp
      $.holdOtpsDb.put(`${verifToken}:${this.uid}:${url}`, otp)
      this.ms.clientSockets.get(url).emit($.cmd.SS.SERVERHOLD_CHECK_REQ, {
        dealToken: verifToken,
        serverHoldData,
        otp
      }, (res) => {
        if (res?.success && res?.data?.otp === otp) {
          go(res.data)
        } else {
          stop({ error: res })
        }
      })
    })
  }

  socket.on($.cmd.SS.SERVERHOLD_CONFIRM, async ({ deal }, cb) => {
    if (! deal.offerToken in $.verifTokens) {
      return null
    }
    if (! deal.verifToken in $.verifTokens) {
      let deal = new Deal(deal)
      $.verifTokens[deal.verifToken] = deal
      $.verifTokensDb.put(deal.verifToken, deal)
    } else {
      updateHoldsResults($.verifTokens[deal.verifToken], deal.serverHoldsResults)
    }
    let serversConfirmed = new Set()
    for (let url in deal.serverHoldsData) {
      if (url in deal.serverHoldsResults && Object.keys(deal.serverHoldsResults[url]).length > 1) {
        for (let uid in deal.serverHoldsResults[url]) {
          if (deal.serverHoldsResults[url][uid].status == 'success') {
            serversConfirmed.add(url)
          }
        }
      }
    }
    let loose = []
    for (let url in deal.serverHoldsData) {
      if (! serversConfirmed.includes(url)) loose.push(url)
    }
    cb(loose.length == 0 ? deal.serverHoldsResults : { error: 'deal not confirmed', data: loose })
  })

  socket.on($.cmd.SS.SETUP_SERVERHOLD_DEAL, async ({ sourceDeal, serverHoldsData }, cb) => {
    if (! sourceDeal.offerToken in $.verifTokens) {
      return null
    }
    let deal = new Deal(sourceDeal)
    $.verifTokens[deal.verifToken] = deal
    for (let url in deal.serverHoldsResults) {
      if (! (this.uid in deal.serverHoldsResults[url])) {
        deal = await checkHoldsGroup(deal, serverHoldsData)
      }
    }
    $.verifTokensDb.put(deal.verifToken, deal)
    let errors = []
    await this.ms.republish($.cmd.SS.SERVERHOLD_CONFIRM, { deal }, (serverHoldsResults) => {
      if (res?.error) {
        errors.push(res)
        return null
      }
      updateHoldsResults(deal, serverHoldsResults)
    })
    if (errors.length > 0) {
      cb({ error: 'serverhold multiserver confirm failed', data: errors })
      return null
    }
    cb(deal.serverHoldsResults)
  })

  socket.on($.cmd.SS.DEAL_UPDATE, ({ dealToken, serverHoldsResults }) => {
    if (! dealToken in $.verifTokens) {
      return null
    }
    updateHoldsResults($.verifTokens[dealToken], serverHoldsResults)
  })

  socket.on($.cmd.CS.SETUP_SERVERHOLD_DEAL, async ({ responder, offerToken, serverHoldsData }, cb) => {
    if (! offerToken in $.verifTokens) {
      if (cb) cb({ error: 'deal-to-offer link failed', data: offerToken })
      return null
    }
    let initiator = socket.data.uuid
    let offer = $.verifTokens[offerToken]
    let deal = new Deal({ type: 'serverhold', initiator, responder, offerToken, values: offer.values, status: 'open', serverHoldsData })

    let verifToken = deal.verifToken
    $.verifTokens[verifToken] = deal
    $.verifTokensDb.put(verifToken, deal)

    deal = await checkHoldsGroup(deal, serverHoldsData)
    $.verifTokensDb.put(verifToken, deal)
    let holdsResults = await this.ms.republish($.cmd.SS.SETUP_SERVERHOLD_DEAL, { deal, serverHoldsData }).catch(({ error, data }) => {
      this.emitToUser({
        from: this.uid,
        to: initiator,
        cmd: $.cmd.SC.SERVERHOLD_ERR,
        data: { dealToken: verifToken, serverHoldsResults: deal.serverHoldsResults, error, data }
      })
    })
    for (let witnessRes of holdsResults) {
      updateHoldsResults(deal, witnessRes)
    }
    this.ms.republish($.cmd.SS.DEAL_UPDATE, { dealToken, serverHoldsResults })
    this.emitToUser({
      from: this.uid,
      to: deal.initiator,
      cmd: $.cmd.EV.DEAL_FUNDED,
      data: { deal }
    })
    this.emitToUser({
      from: this.uid,
      to: deal.responder,
      cmd: $.cmd.EV.DEAL_FUNDED,
      data: { deal }
    })
  })

  return socket
}

module.exports = { connect }