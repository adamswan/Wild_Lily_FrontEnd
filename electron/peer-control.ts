import { ipcRenderer } from 'electron'

const video: HTMLVideoElement = document.getElementById('screen-video') as HTMLVideoElement

export const showVideo = () => {
    return new Promise((resolve) => {
        navigator.mediaDevices.getDisplayMedia({
            audio: false,
            video: {
                width: { max: window.screen.width },
                height: { max: window.screen.height }
            }
        })
            .then(stream => {
                // 给video标签设定视频流地址
                // video.srcObject = stream
                // // 元数据加载完成后播放
                // video.onloadedmetadata = (e) => video.play()
                resolve(stream)
            })
            .catch(e => console.log(e))
    })

}

// 创建控制端的 SDP 邀请
const pc = new window.RTCPeerConnection({}) as any
const createOffer = async () => {
    const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: true
    })
    await pc.setLocalDescription(offer)
    console.log('pc offer', JSON.stringify(offer))
    return pc.localDescription
}
createOffer()

// 将傀儡端响应会的 SDP 应答设置为控制端的 remote
export const setRemote = async (answer: any) => {
    await pc.setRemoteDescription(answer)
}

(window as any).setRemote = setRemote

// 监听傀儡端的添加桌面视频流事件
pc.onaddstream = (e: any) => {
    console.log('add-stream', e.stream)
    // 要发出去
}


// 创建傀儡端的 SDP 应答
const pc2: any = new window.RTCPeerConnection({})
export async function createAnswer(offer: any) {
    let screenStream = await showVideo()
    console.log('screenStream', screenStream)
    pc2.addStream(screenStream)
    await pc2.setRemoteDescription(offer)
    await pc2.setLocalDescription(await pc2.createAnswer())
    console.log('answer', JSON.stringify(pc2.localDescription))
    return pc2.localDescription
}
(window as any).createAnswer = createAnswer


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
