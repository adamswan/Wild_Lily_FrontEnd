import { ipcRenderer } from 'electron'

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
const pc = new window.RTCPeerConnection({}) as any
//! webRTC NAT穿透：ICE, 交互式连接创建
let bFlag = true
pc.onicecandidate = function (e: any) {
    // if (e.candidate) {
    //     ipcRenderer.send('forward', 'control-candidate', JSON.stringify(e.candidate))
    // }
    // console.log('candidate',video, JSON.stringify(e.candidate))

    if (e.candidate && bFlag === true) {
        console.log('candidate', video, JSON.stringify(e.candidate))
        ipcRenderer.send('send-candidate-to-small-win', JSON.stringify(e.candidate))
        bFlag = false
    }

}

// ipcRenderer.on('candidate', (event, candidate) => {
//     addIceCandidateForControl(candidate)
// })



let candidateForControl: any = []

export async function addIceCandidateForControl(candidate: any) {
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
    // console.log('offer9999', JSON.stringify(offer))
    // ipcRenderer.send('forward', 'offer', {
    //     type: offer.type,
    //     sdp: offer.sdp
    // })
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


const pc2: any = new window.RTCPeerConnection({})

//! webRTC NAT穿透：ICE, 交互式连接创建
pc2.onicecandidate = function (e: any) {
    console.log('candidate2', JSON.stringify(e.candidate))
    if (e.candidate) {
        // (window as any).myAPI.sendPupeCandidate(e.candidate)
        ipcRenderer.send('forward', 'puppet-candidate', JSON.stringify(e.candidate))
    }
}

// ipcRenderer.on('candidate', (event, candidate) => {
//     addIceCandidateForPupe(candidate)
// })

let count = 0
// let theCan = ''
// console.log('theCan', theCan)
ipcRenderer.on('set-addIce', (e, candidate) => {
    if (!video) { // 小窗
        count++
        // theCan = candidate

        if (count === 3) {
            console.log('count',  count)
            setTimeout(() => {
                // console.log('定时器的theCan', theCan)
                addIceCandidateForPupe(JSON.parse(candidate))
            }, 1000)
        }

    }
})

let candidateForPupe: any = []

export async function addIceCandidateForPupe(candidate: any) {
    console.log('addIceCandidateForPupe----執行')
    if (candidate) {
        console.log('进入for1')
        candidateForPupe.push(candidate)
    }
    // if (pc2.remoteDescription && pc2.remoteDescription.type) {
    console.log('进入for2')
    for (let i = 0; i < candidateForPupe.length; i++) {
        console.log('进入for3')
        await pc2.addIceCandidate(new RTCIceCandidate(candidateForPupe[i]))
    }
    candidateForPupe = []
    // }
}


// 3、傀儡端收到 SDP 邀请，做 3 件事：
// 1) 将 SDP 设置为自己的 remote
// 2) 也创建一个 RTCPeerConnection 连接，并将视频流放进去
// 3）向控制端发送一个 SDP 应答

// ipcRenderer.on('offer', async (e, offer) => {
//     let answer = await createAnswer(offer)
//     ipcRenderer.send('forward', 'answer', {
//         type: answer.type,
//         sdp: answer.sdp
//     })
// })


ipcRenderer.on('gen-answer', async (e, offer: any) => {
    if (!document.getElementById('screen-video')) {// 小窗
        console.log('我是小窗口1', offer)
        let answer = await createAnswer(JSON.parse(offer))
        console.log('我是小窗口2', JSON.stringify(answer))
        ipcRenderer.send('send-answer', JSON.stringify(answer))
    }
})


export async function createAnswer(offer: any) {
    console.error('createAnswer---done')
    let screenStream = await getVideoStream() // 获取视频流
    pc2.addStream(screenStream)
    await pc2.setRemoteDescription(offer)
    await pc2.setLocalDescription(await pc2.createAnswer())
    console.log('answer', JSON.stringify(pc2.localDescription))
    return pc2.localDescription
}
(window as any).createAnswer = createAnswer


// 将傀儡端响应的 SDP 应答设置为控制端的 remote
export const setRemote = async (answer: any) => {
    console.error('setRemote---done')
    await pc.setRemoteDescription(answer)
}

// (window as any).setRemote = setRemote

// 监听 answer ，并设置为 Remote
// ipcRenderer.on('answer', (event, answer) => {
//     setRemote(answer)
// })


ipcRenderer.on('set-remote', (event, answer) => {
    console.log('set-remote---hhhh', answer)
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
        console.log('data', data)
        // 将data传出去
        ipcRenderer.send('inputKeyboardToNet', data)
    })
}

// 监听控制端的鼠标
export const listentoMouse = () => {
    window.addEventListener('mouseup', (e) => {
        let data: any = {}
        data.clientX = e.clientX
        data.clientY = e.clientY
        data.video = { // 获取视频区域的真实宽高
            width: video.getBoundingClientRect().width,
            height: video.getBoundingClientRect().height
        }
        // 将data传出去
        ipcRenderer.send('inputMouseToNet', {
            windowWidth: window.screen.width,
            windowHeight: window.screen.height
        }, data)
    })
}

// (window as any).addIceCandidateForControl = addIceCandidateForControl

// { (window as any).addIceCandidateForPupe = addIceCandidateForPupe }
