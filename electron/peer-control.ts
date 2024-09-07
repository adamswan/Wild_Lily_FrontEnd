export const showVideo = () => {
    const video: HTMLVideoElement = document.getElementById('screen-video') as HTMLVideoElement
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