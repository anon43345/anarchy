const multiserver = require('../multiserver/client')

global.$ = require('./tools')

async function socketClient({ user, knownServers, dbPath }) {
  //  пользователь подключается одновременно к например 16 серверам
  //  сервера шарят все бд в реалтайме
  //  тогда если 1 сервер кинет на деньги
  //  то потеряется только 1/16 суммы
  let ms = multiserver({ knownServers, auth: { uuid: user.uid } })

  await user.initTfp()
 
  for (let [serverUrl, io] of ms.clientSockets) {
    io.on('connect', () => {
      console.log(`connected to ${serverUrl}`)
    })

    //  это событие приходит, когда пользователь uuid готов выполнить задачу этого клиента
    io.on($.cmd.CS.ACCEPT_TASK, async ({ uuid, token }) => {
      console.log(`user ${uuid} is ready to accept your task ${token}`)
    })

    //  это событие приходит заказчику в случае неподтверждения брони
    io.on($.cmd.SC.SERVERHOLD_ERR, async ({ dealToken, serverHoldsResults, error, data }) => {
      console.log(`server ${serverUrl} notifies you about deal ${dealToken} serverholds check results:\n
        ${serverHoldConfirms}`)
    })

    //  когда все сервера в брони подтвердили бронь, то и заказчик, и отозвавшийся по сделке получают
    //  событие EV_DEAL_FUNDED и исполнитель может приступать к выполнению задачи
    //  и знать, что за неё уже уплачен залог и этот залог будет ему автоматически
    //  переведён честными серверами как только заказчику понравится отчёт о выполнении
    //  задачи.
    //
    //  по идее, заказчик не должен иметь возможности вернуть свои деньги с сервера
    //  без разбирательства с участием заказчика, исполнителя, и любых серверов, которые
    //  за комиссию готовы помочь разбираться
    //  но это я ещё пишу

    //  это событие приходит, когда сервера подтвердили кросс-серверную бронь
    //  каждый сервер в сети подписывает своё свидетельство успешной оплаты денег
    //  серверу на котором бронируются деньги.
    //  deal.serverHoldsConfirms - это объект такого вида:
    //    {
    //      'topbank17.com': {
    //        '46f27453e225c050a898f85f2ae52fa5': {
    //          url: cheapwitness23452342.onion,
    //          uid: 'hawaihive:business:cheap_witness_23:pubserver:17',
    //          otp: '46f27453e225c050a898f85f2ae52fa5',
    //          result: 'we witness this payment yes we do'
    //        },
    //        ...
    //      },
    //      'gfjr43uyhrmg97ehj84rmg97ehj84rmg97ehj84.onion': {
    //        '4529544bdc49d438b8a582f2c8e22ed3': {
    //          url: cheapwitness23452342.onion,
    //          uid: 'hawaihive:business:cheap_witness_23:pubserver:17',
    //          otp: '4529544bdc49d438b8a582f2c8e22ed3',
    //          result: 'we witness this payment yes we do'
    //        },
    //        ...
    //      },
    //      ...
    io.on($.cmd.EV.DEAL_FUNDED, async (deal) => {
      console.log(`deal ${deal.dealToken} is successfully funded by ${deal.initiator}\n
      at servers: ${Object.keys(deal.serverHoldsData)}\n
      hold confirmations are: ${deal.serverHoldsResults}\n`)
    })

    //  это событие приходит, когда пользователь успешно выполнил задачу этого клиента
    //  и предоставляет об этом отчёт
    io.on($.cmd.SC.REPORT_DEAL_DONE, async ({ dealToken, reportData, from }) => {
      console.log(`${from} reports deal ${dealToken} is done by this report data:\n\n
      ${reportData}\n
      check it out and reply with ${$.cmd.CS.REPORT_CONFIRM} event with deal token to any server\n
      to pay ${from} for the deal!`)
    })

    //  это событие приходит, когда отчёт этого клиента понравился заказчику и заказчик
    //  аутентифицировал своё разрешение передать забронированные деньги выполнившему заказ
    //  с вычетом комиссии сервера
    //  это событие успешной оплаты денег за выполнение задачи
    io.on($.cmd.SC.TASK_PAYMENT, async ({ deal, wallet, valuesFundByInitiator, valuesPaidByServer, holdReleaseData }) => {
      console.log(`check your wallet you now!\n
      the server ${server.uid} on ip ${server.url} had just transferred your money\n
      to wallet ${wallet}\n
      value submitted by ${initiator} is ${valuesFundByInitiator}\n
      value paid by server is ${valuesPaidByServer}\n
      payment details are:\n\n
      ${holdReleaseData}`)
    })

    //  кинуть на деньги в этой сети очень легко
    //  но все uid кросс-серверные, и каждый сервер реализует любую свою авторизацию
    //  так что вся сеть будет знать всех кидал
    //  и сервера просто не авторизуют их uid
    //  или будут требовать отдать долги для использования сети
  }
  
  return this
}

module.exports = {
  socketClient
}