async function serverToUserPayment({ initiator, responder, wallet, dealToken, offerToken, values }) {
  //  здесь сервер должен платить деньги пользователю, и забирать свою комиссию
  //  deal по dealToken содержит timestamp заключения сделки, и сервер может считать комиссию
  //  с учётом того, кто такой initiator, кто такой responder, и сколько деньги пролежали в залоге
  //
  //  здесь сервер должен, имея dealToken, проверять, действительно ли деньги были переведены на
  //  бронирование, и если да, то сервер должен вычести свою комиссию любого размера
  //  и перевести values забронированных денег минус комиссия на кошелёк wallet
  //
  //  параметры:
  //    initiator - кросс-серверный uid заказчика, который бронирует на сервере оплату своей задачи
  //    responder - кросс-серверный uid получателя, который получает оплату минус комиссия сервера за выполнение задачи
  //    wallet - данные кошелька, который получает оплату за выполнение задачи, в виде
  //     {
  //       type: 'bitcoin',
  //       uid: '175KBEpoxSq9fvfe7HoYpbDXRsj44qUGcn',
  //       opts: {
  //         comment: 'donation'
  //       }
  //     }, или
  //     {
  //       type: 'bank',
  //       uid: '175KBEpoxSq9fvfe7HoYpbDXRsj44qUGcn',
  //       opts: {
  //         iban: '1323', ...bankOpts
  //       }
  //     }
  //
  //    dealToken - токен сделки о выполнении responder-ом задачи initiator-а offerToken за values,
  //    offerToken - токен задачи, за выполнение которой была забронирована оплата,
  //    values - сумма наград в виде объекта с полями [valueType]:value, которые были представлены в задаче
  //      {
  //        bitcoin: 0.1,
  //        bankThisAdvertisementPlaceCosts10BTCCashId123: 10000
  //      }
  //
  //  функция должна возвращать уникальные детали платежа, по которым пользователь responder
  //  может проверить, пришли ли ему деньги за выполнение задачи, в виде {
  //    values - сколько денег сервер перевёл, учитывая вычтенную комиссию
  //    ...data - любые другие детали платежа
  //
  //  uid некидающих серверов быстро станут популярными и они будут стабильно зарабатывать комиссию
}

const connect = (socket, dealsFunded, dealsFundedDb) => {
  socket.on($.cmd.SS.REPORT_DEAL_DONE, async ({ dealToken, reportData, wallet }) => {
    if (! dealToken in $.verifTokens) return null
    let deal = $.verifTokens[dealToken]
    deal.status = 'report_check'
    deal.reportData = reportData
    deal.responderWallet = wallet
    $.verifTokensDb.put(deal.verifToken, deal)
  })
  socket.on($.cmd.SC.REPORT_DEAL_DONE, async ({ dealToken, reportData, from, to }) => {
    this.emitToUser({ from, to, cmd: $.cmd.SC.REPORT_DEAL_DONE, data: { dealToken, reportData } })
  })
  socket.on($.cmd.CS.REPORT_DEAL_DONE, async ({ dealToken, reportData, wallet }, cb = null) => {
    if (! dealToken in $.verifTokens) {
      if (cb) cb({ error: 'deal not found', data: dealToken })
      return null
    }
    let deal = $.verifTokens[dealToken]
    deal.status = 'report_check'
    deal.reportData[`${$.ts()}`] = reportData
    deal.responderWallet = wallet
    $.verifTokensDb.put(deal.verifToken, deal)
    this.emitToUser({
      from: deal.responder,
      to: deal.initiator,
      cmd: $.cmd.SC.REPORT_DEAL_DONE,
      data: { dealToken, reportData }
    })
    this.ms.republish($.cmd.SS.REPORT_DEAL_DONE, { dealToken, reportData: deal.reportData, wallet })
  })
  socket.on($.cmd.SS.REPORT_CONFIRM, async ({ dealToken }) => {
    if (! dealToken in $.verifTokens) { return null }
    let deal = $.verifTokens[dealToken]
    if (deal.type == 'serverhold') {
      if (deal.verifToken in $.dealsFunded) {
        let holdReleaseData = await serverToUserPayment({
          initiator: deal.initiator,
          responder: deal.responder,
          wallet: deal.responderWallet,
          dealToken,
          offerToken: deal.offerToken,
          values: deal.values,
          server: { url: deal.server.url, uid: deal.server.uid }
        })
        this.emitToUser({
          from: this.uid,
          to: deal.responder,
          cmd: $.cmd.SC.TASK_PAYMENT,
          data: {
            deal,
            wallet: deal.responderWallet,
            valuesFundByInitiator: deal.values,
            valuesPaidByServer: holdReleaseData.values,
            holdReleaseData
          }
        })
        delete dealsFunded[deal.verifToken]
        dealsFundedDb.del(deal.verifToken)
        deal.status = 'paid'
        deal.holdRelease = holdReleaseData
        $.verifTokensDb.put(deal.verifToken, deal)
        this.ms.republish($.cmd.SS.DEAL_PAID, { holdReleaseData })
      }
    }
  })
  socket.on($.cmd.CS.REPORT_CONFIRM, async ({ dealToken }, cb) => {
    if (! dealToken in $.verifTokens) {
      cb({ error: 'deal not found', data: dealToken })
      return null
    }
    let deal = $.verifTokens[dealToken]
    if (deal.type == 'serverhold') {
      if (deal.verifToken in $.dealsFunded) {
        let holdReleaseData = await serverToUserPayment({
          initiator: deal.initiator,
          responder: deal.responder,
          wallet: deal.responderWallet,
          dealToken,
          offerToken: deal.offerToken,
          values: deal.values,
          server: { url: deal.server.url, uid: deal.server.uid }
        })
        this.emitToUser({
          from: this.uid,
          to: deal.responder,
          cmd: $.cmd.SC.TASK_PAYMENT,
          data: {
            deal,
            wallet: deal.responderWallet,
            valuesFundByInitiator: deal.values,
            valuesPaidByServer: holdReleaseData.values,
            holdReleaseData
          }
        })
        delete dealsFunded[deal.verifToken]
        dealsFundedDb.del(deal.verifToken)
        deal.status = 'paid'
        deal.holdRelease = holdReleaseData
        $.verifTokensDb.put(deal.verifToken, deal)
        this.ms.republish($.cmd.SS.REPORT_CONFIRM, { dealToken })
        cb(holdReleaseData)
        return null
      } else {
        this.ms.republish($.cmd.SS.REPORT_CONFIRM, { dealToken })
        cb('your request for payment has been broadcasted to servers')
        return null
      }
    }

    if (deal.server.url in this.ms.clientSockets.keys()) {
      cb(`server ${deal.server.url} with your money is online and pay request has been redirected to him\n
      use popular bank servers or cross-server hold to be sure you get your money paid!`)
    } else {
      cb(`server ${deal.server.url} with your money is not online\n
      but pay request has been redirected to all the servers online, and once server with your\n
      money is online or one of his mirror servers are online, then they will be notified\n
      use popular bank servers or cross-server hold to be sure you get your money paid!`)
    }
    return null
  })

  return socket
}

module.exports = { connect }