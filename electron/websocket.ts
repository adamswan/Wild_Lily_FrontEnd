import WebSocket from 'ws';
import mitt from 'mitt' // 发布订阅

const ws: any = new WebSocket('ws://127.0.0.1:8088')

export const mitter = mitt() as any


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
    mitter.emit(res.action, res.data)
})

// 发数据
export function sendDataWithJSON(type: string, oData: object | null,) {
    let sendData = {
        action: type
    } as any
    if (oData !== null) {
        sendData.data = oData
    }
    ws.send(JSON.stringify(sendData))
}

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