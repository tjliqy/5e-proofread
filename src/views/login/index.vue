<template>
  <div class="login-container">
    <el-form ref="loginForm" :model="loginForm" :rules="loginRules" class="login-form" autocomplete="on" label-position="left">
      <div class="title-container">
        <h3 class="title">5etools & Wiki共库资源搬运平台</h3>
        <div class="mode-switch">
          <button :class="['mode-switch-item', { active: authMode === 'login' }]" type="button" @click="switchMode('login')">
            登录
          </button>
          <button :class="['mode-switch-item', { active: authMode === 'register' }]" type="button" @click="switchMode('register')">
            注册
          </button>
        </div>
      </div>

      <el-form-item prop="username">
        <span class="svg-container">
          <svg-icon icon-class="user" />
        </span>
        <el-input
          ref="username"
          v-model="loginForm.username"
          placeholder="用户名"
          name="username"
          type="text"
          tabindex="1"
          autocomplete="on"
        />
      </el-form-item>

      <el-tooltip v-model="capsTooltip" content="Caps lock is On" placement="right" manual>
        <el-form-item prop="password">
          <span class="svg-container">
            <svg-icon icon-class="password" />
          </span>
          <el-input
            :key="passwordType"
            ref="password"
            v-model="loginForm.password"
            :type="passwordType"
            placeholder="密码"
            name="password"
            tabindex="2"
            autocomplete="on"
            @keyup.native="checkCapslock"
            @blur="capsTooltip = false"
            @keyup.enter.native="handleSubmit"
          />
          <span class="show-pwd" @click="showPwd">
            <svg-icon :icon-class="passwordType === 'password' ? 'eye' : 'eye-open'" />
          </span>
        </el-form-item>
      </el-tooltip>

      <el-form-item v-if="authMode === 'register'" prop="confirmPassword">
        <span class="svg-container">
          <svg-icon icon-class="password" />
        </span>
        <el-input
          :key="confirmPasswordType"
          ref="confirmPassword"
          v-model="loginForm.confirmPassword"
          :type="confirmPasswordType"
          placeholder="确认密码"
          name="confirmPassword"
          tabindex="3"
          autocomplete="off"
          @keyup.enter.native="handleSubmit"
        />
        <span class="show-pwd" @click="showConfirmPwd">
          <svg-icon :icon-class="confirmPasswordType === 'password' ? 'eye' : 'eye-open'" />
        </span>
      </el-form-item>

      <el-form-item v-if="authMode === 'register'" prop="inviteCode">
        <span class="svg-container">
          <svg-icon icon-class="user" />
        </span>
        <el-input
          ref="inviteCode"
          v-model="loginForm.inviteCode"
          placeholder="邀请码（联系管理员获取）"
          name="inviteCode"
          tabindex="4"
          autocomplete="off"
          @keyup.enter.native="handleSubmit"
        />
      </el-form-item>

      <el-button :loading="loading" type="primary" style="width:100%;margin-bottom:18px;" @click.native.prevent="handleSubmit">
        {{ authMode === 'login' ? '登录' : '注册' }}
      </el-button>
      <div class="form-tip">
        <span v-if="authMode === 'login'">还没有账号？</span>
        <span v-else>已有账号？</span>
        <button type="button" class="switch-link" @click="switchMode(authMode === 'login' ? 'register' : 'login')">
          {{ authMode === 'login' ? '去注册' : '去登录' }}
        </button>
      </div>

      <!-- <div style="position:relative">
        <div class="tips">
          <span>Username : admin</span>
          <span>Password : any</span>
        </div>
        <div class="tips">
          <span style="margin-right:18px;">Username : editor</span>
          <span>Password : any</span>
        </div>

        <el-button class="thirdparty-button" type="primary" @click="showDialog=true">
          Or connect with
        </el-button> -->
      <!-- </div> -->
    </el-form>

    <el-dialog title="Or connect with" :visible.sync="showDialog">
      Can not be simulated on local, so please combine you own business simulation! ! !
      <br>
      <br>
      <br>
      <social-sign />
    </el-dialog>
  </div>
</template>

<script>
import SocialSign from './components/SocialSignin'

export default {
  name: 'Login',
  components: { SocialSign },
  data() {
    const validateUsername = (rule, value, callback) => {
      if (!value || value.trim().length < 3) {
        callback(new Error('用户名至少 3 位'))
      } else {
        callback()
      }
    }
    const validatePassword = (rule, value, callback) => {
      if (!value || value.length < 6) {
        callback(new Error('密码不能少于 6 位'))
      } else {
        callback()
      }
    }
    const validateConfirmPassword = (rule, value, callback) => {
      if (this.authMode !== 'register') {
        callback()
      } else if (!value) {
        callback(new Error('请再次输入密码'))
      } else if (value !== this.loginForm.password) {
        callback(new Error('两次输入的密码不一致'))
      } else {
        callback()
      }
    }
    const validateInviteCode = (rule, value, callback) => {
      if (this.authMode !== 'register') {
        callback()
      } else if (!value || value.trim().length < 6) {
        callback(new Error('请输入有效邀请码'))
      } else {
        callback()
      }
    }
    return {
      loginForm: {
        username: '',
        password: '',
        confirmPassword: '',
        inviteCode: ''
      },
      loginRules: {
        username: [{ required: true, trigger: 'blur', validator: validateUsername }],
        password: [{ required: true, trigger: 'blur', validator: validatePassword }],
        confirmPassword: [{ required: true, trigger: 'blur', validator: validateConfirmPassword }],
        inviteCode: [{ required: true, trigger: 'blur', validator: validateInviteCode }]
      },
      authMode: 'login',
      passwordType: 'password',
      confirmPasswordType: 'password',
      capsTooltip: false,
      loading: false,
      showDialog: false,
      redirect: undefined,
      otherQuery: {}
    }
  },
  watch: {
    $route: {
      handler: function(route) {
        const query = route.query
        if (query) {
          this.redirect = query.redirect
          this.otherQuery = this.getOtherQuery(query)
        }
      },
      immediate: true
    }
  },
  created() {
    // window.addEventListener('storage', this.afterQRScan)
  },
  mounted() {
    if (this.loginForm.username === '') {
      this.$refs.username.focus()
    } else if (this.loginForm.password === '') {
      this.$refs.password.focus()
    }
  },
  destroyed() {
    // window.removeEventListener('storage', this.afterQRScan)
  },
  methods: {
    checkCapslock(e) {
      const { key } = e
      this.capsTooltip = key && key.length === 1 && (key >= 'A' && key <= 'Z')
    },
    showPwd() {
      if (this.passwordType === 'password') {
        this.passwordType = ''
      } else {
        this.passwordType = 'password'
      }
      this.$nextTick(() => {
        this.$refs.password.focus()
      })
    },
    showConfirmPwd() {
      if (this.confirmPasswordType === 'password') {
        this.confirmPasswordType = ''
      } else {
        this.confirmPasswordType = 'password'
      }
      this.$nextTick(() => {
        if (this.$refs.confirmPassword) {
          this.$refs.confirmPassword.focus()
        }
      })
    },
    switchMode(mode) {
      this.authMode = mode
      this.loading = false
      this.capsTooltip = false
      this.loginForm.password = ''
      this.loginForm.confirmPassword = ''
      this.loginForm.inviteCode = ''
      this.passwordType = 'password'
      this.confirmPasswordType = 'password'
      this.$nextTick(() => {
        if (this.$refs.loginForm) {
          this.$refs.loginForm.clearValidate()
        }
      })
    },
    handleSubmit() {
      if (this.authMode === 'login') {
        this.handleLogin()
      } else {
        this.handleRegister()
      }
    },
    handleLogin() {
      this.$refs.loginForm.validate(valid => {
        if (valid) {
          this.loading = true
          this.$store.dispatch('user/login', this.loginForm)
            .then(() => {
              this.$router.push({ path: this.redirect || '/', query: this.otherQuery })
              this.loading = false
            })
            .catch(() => {
              this.loading = false
            })
        } else {
          console.log('error submit!!')
          return false
        }
      })
    },
    handleRegister() {
      this.$refs.loginForm.validate(valid => {
        if (!valid) {
          return false
        }
        this.loading = true
        this.$store.dispatch('user/register', this.loginForm)
          .then(() => {
            const username = this.loginForm.username
            this.$message.success('注册成功，请登录')
            this.switchMode('login')
            this.loginForm.username = username
            this.$nextTick(() => {
              if (this.$refs.password) {
                this.$refs.password.focus()
              }
            })
          })
          .catch(() => {})
          .finally(() => {
            this.loading = false
          })
      })
    },
    getOtherQuery(query) {
      return Object.keys(query).reduce((acc, cur) => {
        if (cur !== 'redirect') {
          acc[cur] = query[cur]
        }
        return acc
      }, {})
    }
    // afterQRScan() {
    //   if (e.key === 'x-admin-oauth-code') {
    //     const code = getQueryObject(e.newValue)
    //     const codeMap = {
    //       wechat: 'code',
    //       tencent: 'code'
    //     }
    //     const type = codeMap[this.auth_type]
    //     const codeName = code[type]
    //     if (codeName) {
    //       this.$store.dispatch('LoginByThirdparty', codeName).then(() => {
    //         this.$router.push({ path: this.redirect || '/' })
    //       })
    //     } else {
    //       alert('第三方登录失败')
    //     }
    //   }
    // }
  }
}
</script>

<style lang="scss">
/* 修复input 背景不协调 和光标变色 */
/* Detail see https://github.com/PanJiaChen/vue-element-admin/pull/927 */

$bg:#283443;
$light_gray:#fff;
$cursor: #fff;

@supports (-webkit-mask: none) and (not (cater-color: $cursor)) {
  .login-container .el-input input {
    color: $cursor;
  }
}

/* reset element-ui css */
.login-container {
  .el-input {
    display: inline-block;
    height: 47px;
    width: 85%;

    input {
      background: transparent;
      border: 0px;
      -webkit-appearance: none;
      border-radius: 0px;
      padding: 12px 5px 12px 15px;
      color: $light_gray;
      height: 47px;
      caret-color: $cursor;

      &:-webkit-autofill {
        box-shadow: 0 0 0px 1000px $bg inset !important;
        -webkit-text-fill-color: $cursor !important;
      }
    }
  }

  .el-form-item {
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.1);
    border-radius: 5px;
    color: #454545;
  }

  .mode-switch-item,
  .switch-link {
    border: 0;
    background: transparent;
  }
}
</style>

<style lang="scss" scoped>
$bg:#2d3a4b;
$dark_gray:#889aa4;
$light_gray:#eee;

.login-container {
  min-height: 100%;
  width: 100%;
  background-color: $bg;
  overflow: hidden;

  .login-form {
    position: relative;
    width: 520px;
    max-width: 100%;
    padding: 160px 35px 0;
    margin: 0 auto;
    overflow: hidden;
  }

  .tips {
    font-size: 14px;
    color: #fff;
    margin-bottom: 10px;

    span {
      &:first-of-type {
        margin-right: 16px;
      }
    }
  }

  .svg-container {
    padding: 6px 5px 6px 15px;
    color: $dark_gray;
    vertical-align: middle;
    width: 30px;
    display: inline-block;
  }

  .title-container {
    position: relative;

    .title {
      font-size: 26px;
      color: $light_gray;
      margin: 0px auto 40px auto;
      text-align: center;
      font-weight: bold;
    }

    .mode-switch {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 24px;
    }

    .mode-switch-item {
      min-width: 88px;
      height: 34px;
      border-radius: 999px;
      color: rgba(255, 255, 255, 0.72);
      cursor: pointer;
      transition: all .2s ease;

      &.active {
        background: rgba(255, 255, 255, 0.16);
        color: #fff;
      }
    }
  }

  .show-pwd {
    position: absolute;
    right: 10px;
    top: 7px;
    font-size: 16px;
    color: $dark_gray;
    cursor: pointer;
    user-select: none;
  }

  .thirdparty-button {
    position: absolute;
    right: 0;
    bottom: 6px;
  }

  .form-tip {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 6px;
    color: rgba(255, 255, 255, 0.76);
    font-size: 13px;
  }

  .switch-link {
    color: #9dc1ff;
    cursor: pointer;
    padding: 0;
  }

  @media only screen and (max-width: 470px) {
    .thirdparty-button {
      display: none;
    }
  }
}
</style>
