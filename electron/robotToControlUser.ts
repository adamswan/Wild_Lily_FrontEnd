import { ipcMain } from "electron"
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const robot = require('robotjs')
const vkey = require('vkey')

// 控制傀儡端的鼠标操作
export const handleMouse = (data: any) => {
    let { clientX, clientY, screen, video } = data
    // 根据比例关系,转换为在傀儡端桌面真实的鼠标坐标
    let x = clientX * screen.width / video.width
    let y = clientY * screen.height / video.height
    // 移动鼠标到坐标位置
    robot.moveMouse(x, y)
    // 点击鼠标
    robot.mouseClick()
}

// 控制傀儡端的键盘操作
export const handleKey = (data: any) => {
    console.log(333)
    // 处理组合键
    const modifiers = [] // 收集组合键
    if (data.meta) {
        modifiers.push('meta')
    }
    if (data.shift) {
        modifiers.push('shift')
    }
    if (data.alt) {
        modifiers.push('alt')
    }
    if (data.ctrl) {
        modifiers.push('ctrl')
    }

    let key = vkey[data.keyCode].toLowerCase()
    console.log('print key', key)
    if (key[0] !== '<') { // 过滤 <shift> 键
        // 按下按键
        robot.keyTap(key, modifiers)
    }
}

export const listenOprateAndToControl = () => {
    // 主进程监听控制端的键盘, 进而触发傀儡端的键盘操作
    ipcMain.on('inputKeyboard', (e, data) => {
        console.log('keyboard', data)
        handleKey(data)
    })

    // 主进程监听控制端的鼠标, 进而触发傀儡端的鼠标操作
    ipcMain.on('inputMouse', (e, data) => {
        // 添加控制端的点击坐标
        data.screen = {
            width: window.screen.width,
            height: window.screen.height
        }
        handleMouse(data)
    })
}

export const handleNet = () => {
    ipcMain.on('inputKeyboardToNet', (e, data) => {
        console.log(2222)
        handleKey(data)
    })

    ipcMain.on('inputMouseToNet', (e, obj, data) => {
        data.screen = {
            width: obj.windowWidth,
            height: obj.windowHeight
        }
        handleMouse(data)
    })
}
