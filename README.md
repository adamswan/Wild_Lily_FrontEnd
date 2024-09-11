# 项目介绍
【野百合远程控制】是我的第 2 个全栈项目，这是前端部分。基于 Electron 从 0 到 1 实现了一个 PC 桌面端远程控制软件。后端部分采用 Nodejs 实现的 websocket 服务，以简单支撑前端的业务。

# 技术栈
Electron、Vue3、Vite、TypeScript、Element Plus、Robotjs、Mitt、Electron-Vite CLI 等

# 野百合使用
根据关系分为两个端，控制端，就是能控制对方电脑桌面的端；傀儡端，就是电脑桌面被控制的一方。

双方都使用同一个客户端，服务端会给每个客户端生成一个 6 位数字的控制码。

控制方输入控制码，即可打开另一个大窗口，实时显示傀儡端的电脑桌面。控制方使用自己的键鼠在大窗口内操作，傀儡端的键鼠将自动同步控制方的任何操作。

# 实现思路
## 1. 捕获傀儡端的桌面实时画面
Electron 提供的 desktopCapturer.getSources() API 能捕获傀儡端的桌面画面，并形成视频流

## 2. 获取傀儡端的视频流数据
浏览器提供的 navigator.mediaDevices.getDisplayMedia() API 能获取上一步得到的视频流

## 3. 传输傀儡端的视频流数据
使用 webRTC 技术的 P2P 技术能建立两个端之间的连接，并传输数据。

大致过程如下：
1. 双方都 new 一个 RTCPeerConnection 对象，控制端发送一个 SDP 邀请给傀儡端，傀儡端接收到 SDP 邀请后，将其设置为自己的 remote 远端，然后再回应一个 SDP 应答，并将视频流塞进去。
2. 控制端收到 SDP 应答，将其也设定为自己的 remote 远端，即双方互为彼此的远端，双向奔赴了。
3. 至此，P2P 建立完成，视频传输完成。当然，这个过程还涉及了NAT穿透技术，web 做的主要事情就是使用 IceCandidate 获取双方的公网IP和端口号。

## 4. 控制端显示视频
事先准备一个空的 video 标签，监听 addstream 事件，将傀儡端的视频流塞入 video 标签的 srcObject 属性，即可在控制端大窗口内显示傀儡端的桌面。

## 5. 控制端操作傀儡端的键鼠
1. 监听控制端的键鼠操作，将键鼠事件的数据通过 RTCPeerConnection 对象上的RTCDataChannel 对象，借助 P2P，将数据传给傀儡端。
2. 傀儡端监听数据，通过 Electron 的 node 环境下的 robotjs 模块，将数据转成实际的键鼠操作，这样就实现了对傀儡端的键鼠控制。