import { ipcRenderer } from 'electron'

const video: HTMLVideoElement = document.getElementById('screen-video') as HTMLVideoElement

export const showVideo = () => {
    navigator.mediaDevices.getDisplayMedia({
        audio: false,
        video: {
            width: { max: window.screen.width },
            height: { max: window.screen.height }
        }
    })
        .then(stream => {
            // 给video标签设定视频流地址
            video.srcObject = stream
            // 元数据加载完成后播放
            video.onloadedmetadata = (e) => video.play()
        })
        .catch(e => console.log(e))
}

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
        ipcRenderer.send('inputMouseToNet',{
            windowWidth: window.screen.width,
            windowHeight: window.screen.height
        }, data)
    })
}