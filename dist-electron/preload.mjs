"use strict";
const electron = require("electron");
const showVideo = () => {
  const video = document.getElementById("screen-video");
  navigator.mediaDevices.getDisplayMedia({
    audio: false,
    video: {
      width: { max: window.screen.width },
      height: { max: window.screen.height }
    }
  }).then((stream) => {
    video.srcObject = stream;
    video.onloadedmetadata = (e) => video.play();
  }).catch((e) => console.log(e));
};
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
  // You can expose other APTs you need here.
  // ...
});
const myAPI = {
  // 登录
  doLogin: async () => {
    let res = await electron.ipcRenderer.invoke("login");
    return res;
  },
  // 控制状态发生变化
  controlStateChange: () => {
    return new Promise((resolve) => {
      electron.ipcRenderer.on("controlStateChange", (event, data) => {
        resolve(data);
      });
    });
  },
  // 渲染进程向主进程单向通信，告知主进程，控制开始
  startControl: (code) => {
    electron.ipcRenderer.send("control", code);
  }
};
electron.contextBridge.exposeInMainWorld("myAPI", myAPI);
if (document.getElementById("screen-video")) {
  showVideo();
} else {
  console.log("video不存在");
}
