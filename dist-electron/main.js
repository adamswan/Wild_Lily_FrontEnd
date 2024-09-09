import { app, BrowserWindow, ipcMain, session, desktopCapturer } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
const getDeskRealTimeVideoStream = (desktopCapturer2, session2) => {
  session2.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer2.getSources({ types: ["screen"] }).then((sources) => {
      callback({ video: sources[0], audio: "loopback" });
    });
  });
};
const require2 = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const robot = require2("robotjs");
console.log("robot", robot);
const { mouse, left, right, up, down } = require2("@nut-tree/nut-js");
async function doit() {
  await mouse.move(right(500));
  await mouse.move(down(500));
  await mouse.move(left(500));
  await mouse.move(up(500));
}
doit();
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
let newWin;
function createWindow() {
  win = new BrowserWindow({
    width: 410,
    height: 530,
    autoHideMenuBar: true,
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
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
      preload: path.join(__dirname, "preload.mjs"),
      nodeIntegration: true,
      webSecurity: false,
      contextIsolation: false
    }
  });
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(createWindow);
handleLogin();
function handleLogin() {
  ipcMain.handle("login", () => {
    return 456789;
  });
}
linstenFromRednerer();
function linstenFromRednerer() {
  ipcMain.on("control", (event, code) => {
    console.log("start-controling:", code);
    controlSuccess(1, code);
  });
}
function controlSuccess(type, name) {
  win == null ? void 0 : win.webContents.send("controlStateChange", { type, name });
  createNEWWindow();
  if (newWin) {
    getDeskRealTimeVideoStream(desktopCapturer, session);
    //! 坑: loadFile 方法通常用于加载本地文件系统中的 HTML 文件，而不是从开发服务器（如 Vite 开发服务器）加载。如果你的 HTML 文件是通过 Vite 打包或服务的，你应该使用 loadURL 方法并指向 Vite 开发服务器的 URL
    newWin.loadURL("http://localhost:5173/new-win-controled.html");
    newWin.webContents.openDevTools();
    console.log("justTest--main");
    newWin.on("close", () => {
      win == null ? void 0 : win.close();
      app.quit();
      win = null;
    });
  }
}
function onInputKeyBoard() {
  ipcMain.on("inputKeyboard", (e, data) => {
    console.log("get-keyboard", data);
  });
}
onInputKeyBoard();
function onInputMouse() {
  ipcMain.on("inputMouse", (e, data) => {
    console.log("get-Mouse", data);
  });
}
onInputMouse();
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
