import { app, BrowserWindow, ipcMain } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 1e3,
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
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
function createNEWWindow() {
  const newWin = new BrowserWindow({
    width: 1200,
    height: 900,
    autoHideMenuBar: true,
    x: 0,
    y: 0,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      nodeIntegration: true,
      webSecurity: false
      // contextIsolation: false, 
    }
  });
  return newWin;
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
function controlSuccess(type, name) {
  win == null ? void 0 : win.webContents.send("controlStateChange", { type, name });
  const newWin = createNEWWindow();
  if (newWin) {
    //! 坑: loadFile 方法通常用于加载本地文件系统中的 HTML 文件，而不是从开发服务器（如 Vite 开发服务器）加载。如果你的 HTML 文件是通过 Vite 打包或服务的，你应该使用 loadURL 方法并指向 Vite 开发服务器的 URL
    newWin.loadURL("http://localhost:5173/new-win-controled.html");
    newWin.webContents.openDevTools();
  }
}
linstenFromRednerer();
function linstenFromRednerer() {
  ipcMain.on("control", (event, code) => {
    console.log("start-controling:", code);
    controlSuccess(1, code);
  });
}
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
