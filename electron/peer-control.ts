import { ipcRenderer } from 'electron'
import mitte from 'mitt'
import { MouseupData } from './lily'

const mitter2 = mitte() // 发布订阅

const video: HTMLVideoElement = document.getElementById('screen-video') as HTMLVideoElement

export const getVideoStream = () => {
    return new Promise((resolve) => {
        navigator.mediaDevices.getDisplayMedia({
            audio: false,
            video: {
                width: { max: window.screen.width },
                height: { max: window.screen.height }
            }
        })
            .then(stream => {
                // 将视频流传出去
                resolve(stream)
            })
            .catch(e => console.log(e))
    })
}

// 1、创建控制端的 SDP 邀请
const pc: any = new window.RTCPeerConnection({})

// 创建控制端的 RTCDataChannel
const dataChannel: RTCDataChannel = pc.createDataChannel('robotchannel', { reliable: false })
dataChannel.onopen = () => {// 监听数据通道打开
    // 监听鼠标事件
    mitter2.on('mouseup', (obj) => {
        // 通过 dataChannel 发给傀儡端
        dataChannel.send(JSON.stringify(obj))
    })
    // 监听键盘事件
    mitter2.on('keydown', (obj) => {
        // 通过 dataChannel 发给傀儡端
        dataChannel.send(JSON.stringify(obj))
    })
}

dataChannel.onmessage = (event: MessageEvent<any>) => {
    console.log('dataChannel onmessage', event)
}
dataChannel.onerror = (event: Event) => {
    console.log('dataChannel onerror', event)
}

// webRTC NAT穿透：ICE, 交互式连接创建
let bFlag = true
pc.onicecandidate = function (e: RTCPeerConnectionIceEvent) {
    if (e.candidate && bFlag === true) {
        console.log('candidate', video, JSON.stringify(e.candidate))
        ipcRenderer.send('send-candidate-to-small-win', JSON.stringify(e.candidate))
        bFlag = false
    }
}

let candidateForControl: RTCIceCandidateInit[] = []

export async function addIceCandidateForControl(candidate: RTCIceCandidateInit) {
    if (candidate) {
        candidateForControl.push(candidate)
    }
    if (pc.remoteDescription && pc.remoteDescription.type) {
        for (let i = 0; i < candidateForControl.length; i++) {
            await pc.addIceCandidate(new RTCIceCandidate(candidateForControl[i]))
        }
        candidateForControl = []
    }
}

// 2、将 SDP 邀请发出去
const createOffer = async () => {
    const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: true
    })
    await pc.setLocalDescription(offer)
    console.log('pc offer', JSON.stringify(offer))
    return pc.localDescription
}
createOffer().then(async (offer) => {
    if (video !== null) { // 大窗口
        ipcRenderer.send('pcOfferSendToWS', JSON.stringify(offer))
    }

})

// 监听 addstream 事件，显示视频
pc.onaddstream = (e: any) => {
    console.log('add-stream', e.stream)
    // 给 video 标签设定视频流地址
    video.srcObject = e.stream
    // 元数据加载完成后播放
    video.onloadedmetadata = (e) => video.play()
}


// 傀儡端
const pc2: any = new window.RTCPeerConnection({})
// 监听通道
pc2.ondatachannel = (e: any) => {
    // 监听datachannel消息
    e.channel.onmessage = (event: any) => {
        let { type, widthAndHeight, data } = JSON.parse(event.data)
        if (type === 'mouse') { // 将数据传给robotjs, 让它自动控制鼠标
            data.screen = {
                width: widthAndHeight.windowWidth,
                height: widthAndHeight.windowHeight
            }
            ipcRenderer.send('autoOperateMouse', data)
        } else if (type === 'keyboard') {
            ipcRenderer.send('autoOperateKeyboard', data)
        }
    }
}

pc2.onicecandidate = function (e: any) {// webRTC NAT穿透：ICE, 交互式连接创建
    if (e.candidate) {
        ipcRenderer.send('forward', 'puppet-candidate', JSON.stringify(e.candidate))
    }
}

let count = 0
ipcRenderer.on('set-addIce', (e, candidate) => {
    if (!video) { // 小窗
        count++
        if (count === 3) {
            setTimeout(() => {
                addIceCandidateForPupe(JSON.parse(candidate))
            }, 1000)
        }

    }
})

let candidateForPupe: any = []
export async function addIceCandidateForPupe(candidate: any) {
    if (candidate) {
        candidateForPupe.push(candidate)
    }
    // if (pc2.remoteDescription && pc2.remoteDescription.type) {
    for (let i = 0; i < candidateForPupe.length; i++) {
        await pc2.addIceCandidate(new RTCIceCandidate(candidateForPupe[i]))
    }
    candidateForPupe = []
    // }
}


// 3、傀儡端收到 SDP 邀请，做 3 件事：
// 1) 将 SDP 设置为自己的 remote
// 2) 也创建一个 RTCPeerConnection 连接，并将视频流放进去
// 3）向控制端发送一个 SDP 应答
ipcRenderer.on('gen-answer', async (e, offer: string) => {
    if (!document.getElementById('screen-video')) {// 小窗
        let answer = await createAnswer(JSON.parse(offer))
        ipcRenderer.send('send-answer', JSON.stringify(answer))
    }
})


export async function createAnswer(offer: string) {
    let screenStream = await getVideoStream() // 获取视频流
    pc2.addStream(screenStream)
    await pc2.setRemoteDescription(offer)
    await pc2.setLocalDescription(await pc2.createAnswer())
    return pc2.localDescription
}


// 将傀儡端响应的 SDP 应答设置为控制端的 remote
export const setRemote = async (answer: string) => {
    await pc.setRemoteDescription(answer)
}

ipcRenderer.on('set-remote', (event, answer) => {
    if (video) {
        setRemote(JSON.parse(answer))
    }
})

// 监听控制端的键盘
export const listenToKey = () => {
    window.addEventListener('keydown', (e) => {
        let data = {
            keyCode: e.keyCode,
            shift: e.shiftKey,
            meta: e.metaKey,
            control: e.ctrlKey,
            alt: e.altKey
        }
        // 抛出键盘事件
        mitter2.emit('keydown', {
            type: "keyboard",
            data
        })
    })
}

// 监听控制端的鼠标
export const listentoMouse = () => {
    window.addEventListener('mouseup', (e) => {
        let data: Partial<MouseupData> = {}
        data.clientX = e.clientX
        data.clientY = e.clientY
        data.video = { // 获取视频区域的真实宽高
            width: video.getBoundingClientRect().width,
            height: video.getBoundingClientRect().height
        }
        // 抛出鼠标事件
        mitter2.emit('mouseup', {
            type: 'mouse',
            widthAndHeight: {
                windowWidth: window.screen.width,
                windowHeight: window.screen.height
            },
            data
        })
    })
}