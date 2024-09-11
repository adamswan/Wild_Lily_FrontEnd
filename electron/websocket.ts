import WebSocket from 'ws';
import mitt from 'mitt' // 发布订阅
import { mainBigWinToRender, mainToRender } from './main'
import { ipcMain } from 'electron';
import { Mitter, MsgObj } from './lily';

const ws: WebSocket = new WebSocket('ws://127.0.0.1:8088')

export const mitter = mitt() as Mitter


// 监听连接成功的事件
ws.on('open', () => {
    console.log('connect success')
})

// 监听 message 事件
ws.on('message', (message: string) => {
    let res = {} as MsgObj
    try {
        res = JSON.parse(message)
    } catch (err) {
        console.log('err', err)
    }
    // 向外抛出数据
    mitter.emit(res.action, res.data)
})

// 发数据
export function sendDataWithJSON(type: string, oData: object | null) {
    let sendData = {
        action: type
    } as MsgObj
    if (oData !== null) {
        sendData.data = oData
    }
    ws.send(JSON.stringify(sendData))
}

// 自动登录
export function autoLogin(type: string, oData: object | null) {
    return new Promise((resolve) => {
        sendDataWithJSON(type, oData)
        mitter.on('login-success', (data: object) => {
            resolve(data)
        })
    })
}

// 控制端发消息 要求控制对象
export function sendDataToControl(type: string, oData: object | null) {
    return new Promise((resolve) => {
        sendDataWithJSON(type, oData)
        mitter.on('control-success', (data: object) => {
            resolve(data)
        })
    })
}

// 傀儡端监听被控制的事件，切换页面文字
export function listenToBeControl() {
    return new Promise((resolve) => {
        mitter.on('controlled-by', (data: object) => {
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
    mitter.on('pcoffer-for-createAnswer', (data: MsgObj) => {
        // 主进程 -> 渲染进程
        mainToRender('gen-answer', data.res)
    })
})

ipcMain.on('send-answer', (e, answer) => {
    let oData = {
        action: 'answer',
        data: {
            answer: answer
        }
    }
    // 发出去
    ws.send(JSON.stringify(oData))
    mitter.on('answer-for-set-remote', (data: MsgObj) => {
        // 主进程 -> 渲染进程
        mainBigWinToRender('set-remote', data.res)
    })
})

ipcMain.on('send-candidate-to-small-win', (e, candidate) => {
    let oData = {
        action: 'candidate',
        data: {
            candidate: candidate
        }
    }
    // 发出去
    ws.send(JSON.stringify(oData))
    mitter.on('for-pupe-addIce', (data: any) => {
        // 主进程 -> 渲染进程
        mainToRender('set-addIce', data.res)
    })
})
