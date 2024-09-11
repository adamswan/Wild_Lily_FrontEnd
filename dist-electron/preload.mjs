"use strict";
const electron = require("electron");
const video = document.getElementById("screen-video");
const getVideoStream = () => {
  return new Promise((resolve) => {
    navigator.mediaDevices.getDisplayMedia({
      audio: false,
      video: {
        width: { max: window.screen.width },
        height: { max: window.screen.height }
      }
    }).then((stream) => {
      resolve(stream);
    }).catch((e) => console.log(e));
  });
};
const pc = new window.RTCPeerConnection({});
//! webRTC NAT穿透：ICE, 交互式连接创建
let bFlag = true;
pc.onicecandidate = function(e) {
  if (e.candidate && bFlag === true) {
    console.log("candidate", video, JSON.stringify(e.candidate));
    electron.ipcRenderer.send("send-candidate-to-small-win", JSON.stringify(e.candidate));
    bFlag = false;
  }
};
let candidateForControl = [];
async function addIceCandidateForControl(candidate) {
  if (candidate) {
    candidateForControl.push(candidate);
  }
  if (pc.remoteDescription && pc.remoteDescription.type) {
    for (let i = 0; i < candidateForControl.length; i++) {
      await pc.addIceCandidate(new RTCIceCandidate(candidateForControl[i]));
    }
    candidateForControl = [];
  }
}
const createOffer = async () => {
  const offer = await pc.createOffer({
    offerToReceiveAudio: false,
    offerToReceiveVideo: true
  });
  await pc.setLocalDescription(offer);
  console.log("pc offer", JSON.stringify(offer));
  return pc.localDescription;
};
createOffer().then(async (offer) => {
  if (video !== null) {
    electron.ipcRenderer.send("pcOfferSendToWS", JSON.stringify(offer));
  }
});
pc.onaddstream = (e) => {
  console.log("add-stream", e.stream);
  video.srcObject = e.stream;
  video.onloadedmetadata = (e2) => video.play();
};
const pc2 = new window.RTCPeerConnection({});
//! webRTC NAT穿透：ICE, 交互式连接创建
pc2.onicecandidate = function(e) {
  console.log("candidate2", JSON.stringify(e.candidate));
  if (e.candidate) {
    electron.ipcRenderer.send("forward", "puppet-candidate", JSON.stringify(e.candidate));
  }
};
let count = 0;
electron.ipcRenderer.on("set-addIce", (e, candidate) => {
  if (!video) {
    count++;
    if (count === 3) {
      console.log("count", count);
      setTimeout(() => {
        addIceCandidateForPupe(JSON.parse(candidate));
      }, 1e3);
    }
  }
});
let candidateForPupe = [];
async function addIceCandidateForPupe(candidate) {
  console.log("addIceCandidateForPupe----執行");
  if (candidate) {
    console.log("进入for1");
    candidateForPupe.push(candidate);
  }
  console.log("进入for2");
  for (let i = 0; i < candidateForPupe.length; i++) {
    console.log("进入for3");
    await pc2.addIceCandidate(new RTCIceCandidate(candidateForPupe[i]));
  }
  candidateForPupe = [];
}
electron.ipcRenderer.on("gen-answer", async (e, offer) => {
  if (!document.getElementById("screen-video")) {
    console.log("我是小窗口1", offer);
    let answer = await createAnswer(JSON.parse(offer));
    console.log("我是小窗口2", JSON.stringify(answer));
    electron.ipcRenderer.send("send-answer", JSON.stringify(answer));
  }
});
async function createAnswer(offer) {
  console.error("createAnswer---done");
  let screenStream = await getVideoStream();
  pc2.addStream(screenStream);
  await pc2.setRemoteDescription(offer);
  await pc2.setLocalDescription(await pc2.createAnswer());
  console.log("answer", JSON.stringify(pc2.localDescription));
  return pc2.localDescription;
}
window.createAnswer = createAnswer;
const setRemote = async (answer) => {
  console.error("setRemote---done");
  await pc.setRemoteDescription(answer);
};
electron.ipcRenderer.on("set-remote", (event, answer) => {
  console.log("set-remote---hhhh", answer);
  if (video) {
    setRemote(JSON.parse(answer));
  }
});
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
  },
  createAnswer,
  setRemote,
  // listenAnswer: () => {
  //     ipcRenderer.on('answer', (event, answer) => {
  //       setRemote(answer)
  //     })
  // },
  // sendOffer: (obj: any) => {
  //   ipcRenderer.send('forward', 'offer', obj)
  // },
  // sendControlCandidate: (data: any) => {
  //   ipcRenderer.send('forward', 'control-candidate', data)
  // },
  // sendPupeCandidate: (data: any) => {
  //   ipcRenderer.send('forward', 'puppet-candidate', data)
  // },
  // listenControlCandidate: () => {
  //   ipcRenderer.on('candidate', (event, candidate) => {
  //     addIceCandidateForControl(candidate)
  //   })
  // },
  addIceCandidateForControl,
  addIceCandidateForPupe,
  pupeIsControled: (event, remote) => {
    return new Promise((resolve) => {
      electron.ipcRenderer.on("pupeIsControled", (event2, remote2) => {
        resolve(remote2);
      });
    });
  }
};
electron.contextBridge.exposeInMainWorld("myAPI", myAPI);
if (document.getElementById("screen-video")) {
  console.log("video存在");
  listenToKey();
  listentoMouse();
} else {
  console.log("video不存在");
}
