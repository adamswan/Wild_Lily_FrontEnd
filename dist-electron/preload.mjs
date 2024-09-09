"use strict";
const electron = require("electron");
const video = document.getElementById("screen-video");
const showVideo = () => {
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
const listenToKey = () => {
  window.addEventListener("keydown", (e) => {
    let data = {
      keyCode: e.keyCode,
      shift: e.shiftKey,
      meta: e.metaKey,
      control: e.ctrlKey,
      alt: e.altKey
    };
    console.log("data", data);
    electron.ipcRenderer.send("inputKeyboardToNet", data);
  });
};
const listentoMouse = () => {
  window.addEventListener("mouseup", (e) => {
    let data = {};
    data.clientX = e.clientX;
    data.clientY = e.clientY;
    data.video = {
      // 获取视频区域的真实宽高
      width: video.getBoundingClientRect().width,
      height: video.getBoundingClientRect().height
    };
    electron.ipcRenderer.send("inputMouseToNet", {
      windowWidth: window.screen.width,
      windowHeight: window.screen.height
    }, data);
  });
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
  listenToKey();
  listentoMouse();
} else {
  console.log("video不存在");
}
