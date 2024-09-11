import WebSocket from 'ws';
import mitt from 'mitt' // 发布订阅
import { mainBigWinToRender, mainToRender, sendControlWindow } from './main'
import { ipcMain } from 'electron';

const ws: WebSocket = new WebSocket('ws://127.0.0.1:8088')

export const mitter = mitt() as any

// // 监听不同事件
// mitter.on('offer', (data: any) => {
//     console.log('offer----done')
//     sendDataWithJSON('offer', data)
// })
// mitter.on('answer', (data: any) => {
//     console.log('answer----done')
//     sendControlWindow('answer', data)
// })
// mitter.on('pupe-candidate', (data: any) => {
//     console.log('pupe-candidate----done')
//     sendControlWindow('candidate', data)
// })
// mitter.on('control-candidate', (data: any) => {
//     console.log('control-candidate----done')
//     sendDataWithJSON('candidate', data)
// })

// 监听连接成功的事件
ws.on('open', () => {
    console.log('connect success')
})

// 监听 message 事件
ws.on('message', (message: any) => {
    let res = {} as any
    try {
        res = JSON.parse(message)
    } catch (err) {
        console.log('err', err)
    }
    // 向外抛出数据
    console.log('paochu--emit', res.action)
    mitter.emit(res.action, res.data)
})

// 发数据
export function sendDataWithJSON(type: string, oData: object | null) {
    let sendData = {
        action: type
    } as any
    if (oData !== null) {
        sendData.data = oData
    }
    ws.send(JSON.stringify(sendData))
}

// ipcMain.on('forward', (e, action, data) => {
//     console.log('forward being excute',data )
//     sendDataWithJSON('forward', { action, data })
// })

export function invoke(type: string, oData: object | null, answerEvent: any) {
    return new Promise((resolve, reject) => {
        sendDataWithJSON(type, oData)
        console.log('answerEvent', answerEvent)

        mitter.emit(answerEvent, resolve)

        setTimeout(() => {
            reject('timeout')
        }, 5000)
    })
}

// 自动登录
export function autoLogin(type: string, oData: object | null) {
    return new Promise((resolve) => {
        sendDataWithJSON(type, oData)
        mitter.on('login-success', (data: object) => {
            console.log('data--login-success', data)
            resolve(data)
        })
    })
}

// 控制端发消息 要求控制对象
export function sendDataToControl(type: string, oData: object | null) {
    return new Promise((resolve) => {
        sendDataWithJSON(type, oData)
        mitter.on('control-success', (data: object) => {
            console.log('control-success', data)
            resolve(data)
        })
    })
}

// 傀儡端监听被控制的事件，切换页面文字
export function listenToBeControl() {
    return new Promise((resolve) => {
        mitter.on('controlled-by', (data: object) => {
            console.log('controlled-by', data)
            resolve(data)
        })
    })
}

// 转发消息
export function forwardInfo(type: string, oData: object) {
    return new Promise((resolve) => {
        sendDataWithJSON(type, oData)
        // 监听 forward 事件
        mitter.on('forward', (data: object) => {
            console.log('backkkkkkkk', data)
            resolve(data)
        })
    })
}


ipcMain.on('pcOfferSendToWS', (e, offer) => {
    let oData = {
        action: 'pcoffer',
        data: {
            pcoffer: offer
        }
    }
    // 发出去
    ws.send(JSON.stringify(oData))
    // 监听回来的数据
    mitter.on('pcoffer-for-createAnswer', (data: any) => {
        console.log('pcoffer-for-createAnswer', data.res)
        // 主进程 -> 渲染进程
        mainToRender('gen-answer', data.res)
    })
})

ipcMain.on('send-answer', (e, answer) => {
    console.log('yingda', answer)
    let oData = {
        action: 'answer',
        data: {
            answer: answer
        }
    }
    // 发出去
    ws.send(JSON.stringify(oData))
    mitter.on('answer-for-set-remote', (data: any) => {
        console.log('answer-for-set-remote', data.res)
        // 主进程 -> 渲染进程
        mainBigWinToRender('set-remote', data.res)
    })
})

ipcMain.on('send-candidate-to-small-win', (e, candidate) => {
    console.log('got---candidate', candidate)
    let oData = {
        action: 'candidate',
        data: {
            candidate: candidate
        }
    }
    console.log('got---candidate++++oData', oData)
    // 发出去
    ws.send(JSON.stringify(oData))
    mitter.on('for-pupe-addIce', (data: any) => {
        console.log('for-pupe-addIce', data.res)
        // 主进程 -> 渲染进程
        mainToRender('set-addIce', data.res)
    })
})
