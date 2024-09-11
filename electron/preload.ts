import { ipcRenderer, contextBridge } from 'electron'
import { listenToKey, listentoMouse } from './peer-control'

// --------- Expose some API to the Renderer process ---------
// 在这里向 window 上添加自定义的属性、方法
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...

})

const myAPI = {
  // 登录
  doLogin: async () => {
    let res = await ipcRenderer.invoke('login')
    return res
  },
  // 控制状态发生变化
  controlStateChange: () => {
    return new Promise((resolve) => {
      ipcRenderer.on('controlStateChange', (event, data) => {
        resolve(data)
      })
    })
  },
  // 渲染进程向主进程单向通信，告知主进程，控制开始
  startControl: (code: string) => {
    ipcRenderer.send('control', code)
  },
  pupeIsControled: (event: any, remote: number) => {
    return new Promise((resolve) => {
      ipcRenderer.on('pupeIsControled', (event, remote) => {
        resolve(remote)
      })
    })
  }
}

contextBridge.exposeInMainWorld('myAPI', myAPI)

if (document.getElementById('screen-video')) {
  listenToKey() // 监听控制端键盘
  listentoMouse()// 监听控制端鼠标
}