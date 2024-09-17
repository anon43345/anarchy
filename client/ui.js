const { socketClient } = require('./socketClient')
const { User } = require('../proto/User')

let userUid = 'username:user_1;uniqueTrail:111'
let knownServers = [
  'localhost:3000',
  'localhost:3001',
  'localhost:3002'
]

let exampleACLAsyncCheck = async (operation) => true
let user = new User({
  uid: userUid,
  name: 'Alice',
  fp: $.hash(userUid, 32),
  transformations: [
    //  у каждого пользователя сети свои функции для неузнаваемого превращения отпечатка
    x => x * 2,
    x => `${x}${$.hash(x, x.toString().length)}`,
    x => x + (x * 0.18349)
  ],
  checkers: [
    (operation) => {
      if (! 'cmd' in operation) return 'command is not defined'
      if (! JSON.stringify(cmd).includes(operation.cmd)) return 'command is not defined'
    },
    async (operation) => await exampleACLAsyncCheck(operation)
  ],
  //  здесь клиент должен спрашивать у пользователя разрешения на операцию - как пароль
  authorizeCb: async (operation) => {
    if ('password' === 'password') return true
  }
})

let client = socketClient({ user, knownServers, './database'})

//  эту функцию вызывает клиент, который хочет опубликовать валюту в оборот
const publishValue = async ({ desc }) => {
  let authRes = await user.requestAuthorization({ cmd: $.cmd.CS.PUB.VALUE, desc })
  if (! authRes) throw new Error('authorization failed: ', user.uid, $.cmd.CS.PUB.VALUE)
  client.ms.emit($.cmd.CS.PUB.VALUE, {
    desc,
    publisher: user.name
  })
}

//  эту функцию вызывает клиент, который хочет увидеть все валюты в обороте
const getValues = async () => {
  net.query({ cmd: $.cmd.CS.GET.VALUES, data: null })
}

//  эту функцию вызывает клиент, который принимает валюту uid в качестве платежа
const supportValue = async ({ uid }) => {
  let authRes = await user.requestAuthorization({ cmd: $.cmd.CS.SUPPORT_VALUE, value })
  if (! authRes) throw new Error('authorization failed: ', user.uid, $.cmd.CS.SUPPORT_VALUE)
  client.ms.emit($.cmd.CS.SUPPORT_VALUE, {
    supporter: user.uid,
    value: {
      uid
    }
  })
}

//  эту функцию вызывает клиент, который публикует задачу к выполнению
//  name - уникальное имя задачи
//  desc - детали задачи
//  values - сколько этот клиент готов заплатить за выполнение этой задачи
const publishTask = async ({ name, desc, values }) => {
  let authRes = await user.requestAuthorization({ cmd: $.cmd.CS.PUB.TASK, task })
  if (! authRes) throw new Error('authorization failed: ', user.uid, $.cmd.CS.PUB.TASK)
  client.ms.emit($.cmd.CS.PUB.TASK, {
    uuid: user.uid,
    name,
    desc,
    values
  })
}

//  эту функцию вызывает клиент, чтобы получить все актуальные задачи
const getTasks = async ({}) => {
  client.ms.emit($.cmd.CS.GET.TASKS, {})
}

//  эту функцию вызывает клиент, который согласен выполнять задачу verifToken
//  запостивший задачу клиент будет оповещён об этом
const acceptTask = async ({ verifToken }) => {
  let authRes = await user.requestAuthorization({ cmd: $.cmd.CS.ACCEPT_TASK, task })
  if (! authRes) throw new Error('authorization failed: ', user.uid, $.cmd.CS.ACCEPT_TASK)
  client.ms.emit($.cmd.CS.ACCEPT_TASK, {
    uuid: user.uid,
    verifToken
  })
}

//  используйте этот код на свой страх и риск!
//  этой функцией вы подтверждаете перевод денег на бронь на указанные сервера!
//  доверяйте только людям, которых знаете, как Ваши соседи или партнёры или
//  предпочитайте доверенные ip и uid банков, которые не будут воровать ваши деньги!

//  эту функцию вызывает клиент, который выбрал, с кем из откликнувшихся на задачу заключить сделку
//  responder - это uuid исполнителя, с которым заключается сделка
//  offerToken - токен задачи
//  serverHoldsData - это идентифицикационные данные платежей на каждый сервер в виде
//    объекта с парами значений url:holdData, например
//    {
//      'topbank17.com': {
//        'bank_specific_data_fields': 'hold confirm',
//        'amount': '1000'
//        'time': '1w',
//        'comission': '0.02'
//      },
//      'gfjr43uyhrmg97ehj84rmg97ehj84rmg97ehj84.onion': {
//        'msg': 'neighboor hold confirm all good go beer',
//        'amount': '1'
//        'time': '1w',
//        'comission': '0.01'
//      }, ...
//    }
//
const serverHoldDeal = async ({ responder, offerToken, serverHoldsData }) => {
  let authRes = await user.requestAuthorization({ cmd: $.cmd.CS.SETUP_DEAL, task })
  if (! authRes) throw new Error('authorization failed: ', user.uid, $.cmd.CS.SETUP_DEAL)
  client.ms.emit($.cmd.CS.SETUP_SERVERHOLD_DEAL, {
    uuid: user.uid,
    responder,
    offerToken,
    serverHoldsData
  })
}

//  эту функцию вызывает клиент пользователя, который выполнил условия сделки dealToken
//  и хочет получить values своих денег, оговорённых в задаче которую выполняет эта сделка
//  минус комиссия сервера
//  на кошелёк wallet = {
//    type - это тип платёжной системы
//    uid - это уникальный номер кошелька, банковской карты, данные банковского счёта, и т.д., может быть не только числом и передаётся платёжной системе "как есть" в виде строки
//    opts - это любые дополнительные опции для этого конкретного плажета, передаются на сервер платёжной системы, если она требует дополнительные опции для идентификации получателя денег }
//  и предоставляет заказчику reportData в качестве отчёта о выполнении задачи
const reportDealDone = async ({ dealToken, reportData, wallet: { type, uid, opts: {} } }) => {
  let authRes = await user.requestAuthorization({ cmd: $.cmd.CS.REPORT_DEAL_DONE, task })
  if (! authRes) throw new Error('authorization failed: ', user.uid, $.cmd.CS.REPORT_DEAL_DONE)
  client.ms.emit($.cmd.CS.REPORT_DEAL_DONE, {
    uuid: user.uid,
    dealToken,
    reportData,
    wallet: { type, uid, opts: {} }
  })
}

//  эту функцию в любой момент вызывает клиент, который хочет получить отчёт
//  to - это uid пользователя, которому с того сервера, к которому он подключён, придёт событие CALL с uid звонящего и сообщением
//  data - это сообщение, которое нужно отправить
const emitTo = async ({ to, data }) => {
  let authRes = await user.requestAuthorization({ cmd: $.cmd.CS.REPORT_CONFIRM, task })
  if (! authRes) throw new Error('authorization failed: ', user.uid, $.cmd.CS.REPORT_CONFIRM)
  client.ms.emit($.cmd.CS.EMIT_TO, {
    to,
    data
  })
}

//  эту функцию вызывает клиент, который доволен отчётом о выполненной работе
//  и даёт своё авторизованное разрешение на перевод своих забронированных денег исполнителю
const reportConfirm = async ({ dealToken }) => {
  let authRes = await user.requestAuthorization({ cmd: $.cmd.CS.REPORT_CONFIRM, task })
  if (! authRes) throw new Error('authorization failed: ', user.uid, $.cmd.CS.REPORT_CONFIRM)
  client.ms.emit($.cmd.CS.REPORT_CONFIRM, {
    uuid: user.uid,
    dealToken
  })
}