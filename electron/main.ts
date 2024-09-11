import { app, BrowserWindow, ipcMain, desktopCapturer, session } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { getDeskRealTimeVideoStream } from './getRealTime.ts'
// import { listenOprateAndToControl, handleNet } from './robotToControlUser.ts'
import { autoLogin, sendDataToControl, listenToBeControl, forwardInfo } from './websocket.ts'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
// const mitt  = require('./websocket.ts')
// console.log('mitt', mitt)

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

// 初始窗口
let win: BrowserWindow | null
// 用于 webRTC 的新窗口
let newWin: BrowserWindow

function createWindow() {
  win = new BrowserWindow({
    width: 410,
    height: 530,
    autoHideMenuBar: true,
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools() //自动打开控制台
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

function createNEWWindow() {
  newWin = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    x: 0,
    y: 0,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: true,
      webSecurity: false,
      // contextIsolation: false,
    }
  })
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)


// 1、处理登录
handleLogin()
function handleLogin() {
  ipcMain.handle('login', async () => {
    // 先返回一个假数据
    const { code } = await autoLogin('login', null) as any
    return code
  })
}

// 2、监听控制端发起的控制行为
linstenToControl()
function linstenToControl() {
  ipcMain.on('control', async (event, code) => {
    await sendDataToControl('control', { 'remote': code })
    controlSuccess(1, code)
  })
}

// 3、当控制成功时
async function controlSuccess(type: number, name: number) {
  // 通知渲染进程控制成功了
  win?.webContents.send('controlStateChange', { type, name })
  // 新建窗口
  createNEWWindow()
  if (newWin) {
    // 捕获傀儡端的实时视频流
    getDeskRealTimeVideoStream(desktopCapturer, session)

    //! 坑: loadFile 方法通常用于加载本地文件系统中的 HTML 文件，而不是从开发服务器（如 Vite 开发服务器）加载。如果你的 HTML 文件是通过 Vite 打包或服务的，你应该使用 loadURL 方法并指向 Vite 开发服务器的 URL
    newWin.loadURL('http://localhost:5173/new-win-controled.html');

    newWin.webContents.openDevTools(); // 自动打开F12  

    // 监听控制端的键鼠, 进而触发傀儡端的键鼠操作
    // listenOprateAndToControl()
    // handleNet()

    // 监听窗口关闭事件  
    newWin.on('close', () => {
      // 初始窗口也一并关闭
      win?.close()
      app.quit()
      win = null
    });
  }
}

// 4、告知傀儡端，它被控制了
tellPupeIsControled()
async function tellPupeIsControled() {
  const res: any = await listenToBeControl() // 开启监听
  console.log('tellPupeIsControled', res)
  win?.webContents.send('pupeIsControled', res.remote)
}

// 5、监听转发事件
listenForward()
function listenForward() {
  ipcMain.on('forward', (e, type, oData) => {
    forwardInfo(type, oData)
  })
}

export function sendControlWindow(channel: any, ...args: any) {
  win?.webContents.send(channel, ...args)
}
// 小窗
export function mainToRender(channel: any, data: any) {
  win?.webContents.send(channel, data)
}
// 大窗
export function mainBigWinToRender(channel: any, data: any) {
  newWin?.webContents.send(channel, data)
}