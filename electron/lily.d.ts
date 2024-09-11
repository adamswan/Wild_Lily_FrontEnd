export type NumOrStr = number | string

declare global {
    interface RTCDataChannelInit {
        reliable?: boolean;
    }
}

export interface MouseupData {
    clientX: number
    clientY: number
    video: {
        width: number
        height: number
    }
    screen: {
        width: number
        height: number
    }
}

export interface Keyboard {
    [propName: string]: any
}

export type Mitter = Record<string, any>

export interface MsgObj {
    action: string
    [propName: string]: any
}