<template>
  <div class="profile-page">
    <div class="profile-header">
      <div>
        <div class="profile-kicker">ACCOUNT SETTINGS</div>
        <h1>个人信息</h1>
        <p>管理你的显示昵称和登录密码。</p>
      </div>
      <div class="identity-card">
        <div class="identity-avatar">
          {{ displayName.slice(0, 1).toUpperCase() }}
        </div>
        <div>
          <strong>{{ displayName }}</strong>
          <span>用户名：{{ username }}</span>
        </div>
      </div>
    </div>

    <el-row :gutter="24">
      <el-col :xs="24" :md="12">
        <el-card class="settings-card" shadow="never">
          <div slot="header" class="card-header">
            <div class="card-icon card-icon--profile">
              <i class="el-icon-user" />
            </div>
            <div>
              <strong>基本信息</strong>
              <span>昵称会作为你的显示名称</span>
            </div>
          </div>

          <el-form
            ref="profileForm"
            :model="profileForm"
            :rules="profileRules"
            label-position="top"
          >
            <el-form-item label="用户名">
              <el-input :value="username" disabled />
            </el-form-item>
            <el-form-item label="昵称" prop="nickname">
              <el-input
                v-model.trim="profileForm.nickname"
                maxlength="255"
                show-word-limit
                placeholder="请输入昵称"
                @keyup.enter.native="submitProfile"
              />
            </el-form-item>
            <el-button
              type="primary"
              :loading="profileSubmitting"
              @click="submitProfile"
            >
              保存昵称
            </el-button>
          </el-form>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="12">
        <el-card class="settings-card" shadow="never">
          <div slot="header" class="card-header">
            <div class="card-icon card-icon--password">
              <i class="el-icon-lock" />
            </div>
            <div>
              <strong>修改密码</strong>
              <span>修改前需要验证当前密码</span>
            </div>
          </div>

          <el-form
            ref="passwordForm"
            :model="passwordForm"
            :rules="passwordRules"
            label-position="top"
          >
            <el-form-item label="当前密码" prop="current_password">
              <el-input
                v-model="passwordForm.current_password"
                type="password"
                autocomplete="current-password"
                show-password
              />
            </el-form-item>
            <el-form-item label="新密码" prop="new_password">
              <el-input
                v-model="passwordForm.new_password"
                type="password"
                autocomplete="new-password"
                show-password
              />
            </el-form-item>
            <el-form-item label="确认新密码" prop="confirm_password">
              <el-input
                v-model="passwordForm.confirm_password"
                type="password"
                autocomplete="new-password"
                show-password
                @keyup.enter.native="submitPassword"
              />
            </el-form-item>
            <el-button
              type="primary"
              :loading="passwordSubmitting"
              @click="submitPassword"
            >
              更新密码
            </el-button>
          </el-form>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { updateProfile } from '@/api/user'

export default {
  name: 'Profile',
  data() {
    const validateConfirmPassword = (rule, value, callback) => {
      if (value !== this.passwordForm.new_password) {
        callback(new Error('两次输入的新密码不一致'))
        return
      }
      callback()
    }

    return {
      profileSubmitting: false,
      passwordSubmitting: false,
      profileForm: {
        nickname: ''
      },
      passwordForm: {
        current_password: '',
        new_password: '',
        confirm_password: ''
      },
      profileRules: {
        nickname: [
          { required: true, message: '请输入昵称', trigger: 'blur' },
          { max: 255, message: '昵称不能超过 255 个字符', trigger: 'blur' }
        ]
      },
      passwordRules: {
        current_password: [
          { required: true, message: '请输入当前密码', trigger: 'blur' }
        ],
        new_password: [
          { required: true, message: '请输入新密码', trigger: 'blur' },
          { min: 6, message: '新密码至少 6 位', trigger: 'blur' }
        ],
        confirm_password: [
          { required: true, message: '请再次输入新密码', trigger: 'blur' },
          { validator: validateConfirmPassword, trigger: 'blur' }
        ]
      }
    }
  },
  computed: {
    ...mapGetters({
      username: 'name',
      nickname: 'nickname'
    }),
    displayName() {
      return this.nickname || this.username || '用户'
    }
  },
  created() {
    this.profileForm.nickname = this.nickname || this.username
  },
  methods: {
    submitProfile() {
      this.$refs.profileForm.validate(valid => {
        if (!valid) return

        this.profileSubmitting = true
        updateProfile({ nickname: this.profileForm.nickname })
          .then(response => {
            this.$store.commit('user/SET_NICKNAME', response.data.nickname)
            this.profileForm.nickname = response.data.nickname
            this.$message.success('昵称已更新')
          })
          .finally(() => {
            this.profileSubmitting = false
          })
      })
    },
    submitPassword() {
      this.$refs.passwordForm.validate(valid => {
        if (!valid) return

        this.passwordSubmitting = true
        updateProfile(this.passwordForm)
          .then(() => {
            this.$message.success('密码已更新')
            this.$refs.passwordForm.resetFields()
          })
          .finally(() => {
            this.passwordSubmitting = false
          })
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.profile-page {
  min-height: calc(100vh - 68px);
  padding: 36px;
  background:
    radial-gradient(circle at top right, rgba(64, 158, 255, 0.12), transparent 30%),
    #f5f7fa;
}

.profile-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  max-width: 1120px;
  margin: 0 auto 28px;

  h1 {
    margin: 6px 0 8px;
    color: #1f2937;
    font-size: 32px;
  }

  p {
    margin: 0;
    color: #7a8493;
  }
}

.profile-kicker {
  color: #409eff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.identity-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 230px;
  padding: 14px 18px;
  border: 1px solid #e5eaf2;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 12px 30px rgba(31, 42, 55, 0.06);

  strong,
  span {
    display: block;
  }

  strong {
    margin-bottom: 4px;
    color: #253044;
  }

  span {
    color: #9099a8;
    font-size: 12px;
  }
}

.identity-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  color: #fff;
  background: linear-gradient(135deg, #409eff, #6f7bf7);
  font-size: 18px;
  font-weight: 700;
}

.el-row {
  max-width: 1120px;
  margin-right: auto !important;
  margin-left: auto !important;
}

.settings-card {
  min-height: 454px;
  border: 1px solid #e6ebf2;
  border-radius: 16px;

  ::v-deep .el-card__header {
    padding: 22px 24px;
    border-bottom-color: #edf0f5;
  }

  ::v-deep .el-card__body {
    padding: 26px 24px;
  }

  ::v-deep .el-form-item__label {
    color: #4b5563;
    font-weight: 600;
  }

  .el-button {
    min-width: 112px;
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 13px;

  strong,
  span {
    display: block;
  }

  strong {
    margin-bottom: 4px;
    color: #263044;
    font-size: 17px;
  }

  span {
    color: #929baa;
    font-size: 12px;
  }
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  font-size: 18px;

  &--profile {
    color: #2778d8;
    background: #eaf4ff;
  }

  &--password {
    color: #c27718;
    background: #fff4df;
  }
}

@media (max-width: 991px) {
  .profile-page {
    padding: 24px 16px;
  }

  .profile-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .identity-card {
    width: 100%;
  }

  .settings-card {
    min-height: auto;
    margin-bottom: 20px;
  }
}
</style>
