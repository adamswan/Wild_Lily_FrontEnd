<template>
    <div class="container">
        <img :src="lily" class="lily"></img>
        <h3 v-show="isShow">您的控制码: {{ localCode }}</h3>
        <h3 v-show="controlText.length !== 0">当前状态: {{ controlText }}</h3>
        <el-divider v-show="isShow" />
        <el-form v-show="isShow" ref="ruleFormRef" style="max-width: 600px" :model="ruleForm" :rules="rules"
            label-width="auto" class="demo-ruleForm" size="large" status-icon>
            <el-form-item label="控制码" prop="remoteCode">
                <el-input v-model.number="ruleForm.remoteCode" placeholder="请输入对方控制码" />
            </el-form-item>
            <el-form-item class="btn-to-right">
                <el-button type="primary" @click="submitForm(ruleFormRef)">
                    连接
                </el-button>
            </el-form-item>
        </el-form>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ControlInfo, RuleForm } from '../Types/controlPage';
import lily from '../assets/lily.jpg?url'

const ruleFormRef = ref<FormInstance>()

const ruleForm = reactive<RuleForm>({
    // 远程控制码
    remoteCode: ''
})
const setRemoteCode = () => {

}

// 本地控制码
const localCode = ref<number>(88888)
const setLocalCode = async (code: Promise<any>) => {
    let res = await code
    localCode.value = res
}

// 控制后的文字提示
const controlText = ref<string>('')
const setControlText = (status: string) => {
    controlText.value = status
}
const isShow = computed(() => {
    if (controlText.value.length === 0) {
        return true
    }
    return false
})

const checkRemoteCode = (rule: any, value: any, callback: any) => {
    if (!value) {
        return callback(new Error('不能为空'))
    }

    if (Number.isInteger(value) === false) {
        callback(new Error('只能为数字'))
    }
    if (value.toString().length !== 6) {
        callback(new Error('长度只能6位'))
    }
    callback()
}
const rules = reactive<FormRules<RuleForm>>({
    remoteCode: [{ validator: checkRemoteCode, trigger: 'change' }],
})

// 开始控制
const startControl = (code: any) => {
    // 触发预加载脚本的自定义函数
    (window as any).myAPI.startControl(code)
}

const submitForm = async (formEl: FormInstance | undefined) => {
    if (!formEl) return
    await formEl.validate((valid, fields) => {
        if (valid) {
            console.log('submit!')
            startControl(ruleForm.remoteCode)
        } else {
            console.log('error submit!', fields)
        }
    })
}

const login = async () => {
    // 让主进程去登录，获取本地状态码
    const code = (window as any).myAPI.doLogin()
    // 设置本地状态码
    setLocalCode(code)
}

const wiredFun = () => {
    // 监听傀儡端被控制
    (window as any).myAPI.pupeIsControled()
        .then((remote: number) => {
            console.log('.vue got remote code', remote)
            setControlText(`被${remote}远程控制中...`)
        })
}

// 监听主进程发的控制消息
(window as any).myAPI.controlStateChange().then((obj: ControlInfo) => {
    const { type, name } = obj
    if (type === 1) { // 在控制别人
        setControlText(`正在远程控制${name}`)
    }
})

onMounted(() => {
    login()
    wiredFun()
})
</script>

<style scoped lang="less">
.container {
    overflow: hidden;
    height: 100%;
    padding-top: 30px;
    display: flex;
    justify-content: center;
    flex-direction: column;
    align-items: center;
    background-color: rgba(244, 244, 244);

    .btn-to-right {
        :deep(.el-form-item__content) {
            justify-content: end;
        }

    }

    .lily {
        width: 200px;
        height: 200px;
    }
}
</style>