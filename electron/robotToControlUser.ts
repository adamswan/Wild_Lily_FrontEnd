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
    // 转换为真实按键名
    let key = vkey[data.keyCode].toLowerCase()
    if (key[0] !== '<') { // 过滤 <shift> 键
        // 按下按键
        robot.keyTap(key, modifiers)
    }
}

ipcMain.on('autoOperateMouse', (e, data) => {
    handleMouse(data)
})

ipcMain.on('autoOperateKeyboard', (e, data) => {
    console.log('autoOperateKeyboard', data)
    handleKey(data)
})

