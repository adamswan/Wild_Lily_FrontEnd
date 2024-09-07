export const getDeskRealTimeVideoStream = (desktopCapturer: any, session: any) => {
    session.defaultSession.setDisplayMediaRequestHandler((request: any, callback: any) => {
        // 捕获电脑桌面
        desktopCapturer.getSources({ types: ['screen'] })
          .then((sources: any) => {
            // Grant access to the first screen found.
            callback({ video: sources[0], audio: 'loopback' })
          })
      })
}