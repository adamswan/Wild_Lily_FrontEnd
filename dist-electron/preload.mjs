"use strict";
const electron = require("electron");
function mitte(n) {
  return { all: n = n || /* @__PURE__ */ new Map(), on: function(t, e) {
    var i = n.get(t);
    i ? i.push(e) : n.set(t, [e]);
  }, off: function(t, e) {
    var i = n.get(t);
    i && (e ? i.splice(i.indexOf(e) >>> 0, 1) : n.set(t, []));
  }, emit: function(t, e) {
    var i = n.get(t);
    i && i.slice().map(function(n2) {
      n2(e);
    }), (i = n.get("*")) && i.slice().map(function(n2) {
      n2(t, e);
    });
  } };
}
const mitter2 = mitte();
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
const dataChannel = pc.createDataChannel("robotchannel", { reliable: false });
dataChannel.onopen = () => {
  mitter2.on("mouseup", (obj) => {
    dataChannel.send(JSON.stringify(obj));
  });
  mitter2.on("keydown", (obj) => {
    dataChannel.send(JSON.stringify(obj));
  });
};
dataChannel.onmessage = (event) => {
  console.log("dataChannel onmessage", event);
};
dataChannel.onerror = (event) => {
  console.log("dataChannel onerror", event);
};
let bFlag = true;
pc.onicecandidate = function(e) {
  if (e.candidate && bFlag === true) {
    console.log("candidate", video, JSON.stringify(e.candidate));
    electron.ipcRenderer.send("send-candidate-to-small-win", JSON.stringify(e.candidate));
    bFlag = false;
  }
};
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
pc2.ondatachannel = (e) => {
  e.channel.onmessage = (event) => {
    let { type, widthAndHeight, data } = JSON.parse(event.data);
    if (type === "mouse") {
      data.screen = {
        width: widthAndHeight.windowWidth,
        height: widthAndHeight.windowHeight
      };
      electron.ipcRenderer.send("autoOperateMouse", data);
    } else if (type === "keyboard") {
      electron.ipcRenderer.send("autoOperateKeyboard", data);
    }
  };
};
pc2.onicecandidate = function(e) {
  if (e.candidate) {
    electron.ipcRenderer.send("forward", "puppet-candidate", JSON.stringify(e.candidate));
  }
};
let count = 0;
electron.ipcRenderer.on("set-addIce", (e, candidate) => {
  if (!video) {
    count++;
    if (count === 3) {
      setTimeout(() => {
        addIceCandidateForPupe(JSON.parse(candidate));
      }, 1e3);
    }
  }
});
let candidateForPupe = [];
async function addIceCandidateForPupe(candidate) {
  if (candidate) {
    candidateForPupe.push(candidate);
  }
  for (let i = 0; i < candidateForPupe.length; i++) {
    await pc2.addIceCandidate(new RTCIceCandidate(candidateForPupe[i]));
  }
  candidateForPupe = [];
}
electron.ipcRenderer.on("gen-answer", async (e, offer) => {
  if (!document.getElementById("screen-video")) {
    let answer = await createAnswer(JSON.parse(offer));
    electron.ipcRenderer.send("send-answer", JSON.stringify(answer));
  }
});
async function createAnswer(offer) {
  let screenStream = await getVideoStream();
  pc2.addStream(screenStream);
  await pc2.setRemoteDescription(offer);
  await pc2.setLocalDescription(await pc2.createAnswer());
  return pc2.localDescription;
}
const setRemote = async (answer) => {
  await pc.setRemoteDescription(answer);
};
electron.ipcRenderer.on("set-remote", (event, answer) => {
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
    mitter2.emit("keydown", {
      type: "keyboard",
      data
    });
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
    mitter2.emit("mouseup", {
      type: "mouse",
      widthAndHeight: {
        windowWidth: window.screen.width,
        windowHeight: window.screen.height
      },
      data
    });
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
  listenToKey();
  listentoMouse();
}
