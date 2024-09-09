import { app, BrowserWindow, ipcMain, desktopCapturer, session } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { getDeskRealTimeVideoStream } from './getRealTime.ts'
// import robot from 'robotjs'
// import { handleMouse } from './robotToControlUser.ts'


const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const robot = require('robotjs')
console.log('robot', robot)
const { mouse, left, right, up, down } = require('@nut-tree/nut-js')
async function doit() {
  await mouse.move(right(500));
  await mouse.move(down(500));
  await mouse.move(left(500));
  await mouse.move(up(500));
}
doit()


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
    // win.webContents.openDevTools() //自动打开控制台
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
      contextIsolation: false,
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
  ipcMain.handle('login', () => {
    // 先返回一个假数据
    return 456789
  })
}

// 2、监听渲染进程
linstenFromRednerer()
function linstenFromRednerer() {
  ipcMain.on('control', (event, code) => {
    console.log('start-controling:', code)
    controlSuccess(1, code)
  })
}

// 3、控制成功后，告知渲染进程
function controlSuccess(type: number, name: number) {
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

    console.log('justTest--main')

    // 监听窗口关闭事件  
    newWin.on('close', () => {
      // 初始窗口也一并关闭
      win?.close()
      app.quit()
      win = null
    });
  }
}

// 4. 监听键盘输入的数据
function onInputKeyBoard() {
  ipcMain.on('inputKeyboard', (e, data) => {
    console.log('get-keyboard', data)
  })
}
onInputKeyBoard()

// 5. 监听鼠标点击事件
function onInputMouse() {
  ipcMain.on('inputMouse', (e, data) => {
    console.log('get-Mouse', data)
  })
}
onInputMouse()



// setTimeout(() => {
//   try {
//     console.log('robot', robot)
//   } catch (error) {
//     console.log('----error', error)
//   }
// }, 3000)