import { ipcMain } from "electron"
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const robot = require('robotjs')


// 响应控制端发送的键盘指令


// 响应控制端发送的鼠标指令
export const handleMouse = () => {
    console.log('robot9999', robot)
    // let { clientX, clientY, screen, video } = data
    // let x = clientX * screen.width / video.width
    // let y = clientY * screen.height / video.height
    // console.log('x', x)
    // console.log('y', y)
}

ipcMain.on('robot', (e, type, data) => {
    if (type === 'keyboard') {
        console.log('keyboard', type, data)
    } else if (type === 'mouse') {
        console.log('mouse', type, data)
    }
})


