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

// 监听键盘
export const listenToKey = () => {
    window.onkeydown = (e) => {
        let data = {
            keyCode: e.keyCode,
            shift: e.shiftKey,
            meta: e.metaKey,
            control: e.ctrlKey,
            alt: e.altKey
        }
        // 将data传出去
        ipcRenderer.send('inputKeyboard', data)
    }
}

// 监听鼠标
export const listentoMouse = () => {
    window.onmouseup = (e) => {
        let data: any = {}
        data.clientX = e.clientX
        data.clientY = e.clientY
        data.video = {
            width: video.getBoundingClientRect().width,
            height: video.getBoundingClientRect().height
        }
        // 将data传出去
        ipcRenderer.send('inputMouse', data)
    }

}