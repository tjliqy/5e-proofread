<template>
  <div class="app-container">
    <el-card>
      <div class="filter-container">
        <el-switch
          v-model="showUsed"
          active-text="显示已使用"
          inactive-text="仅看未使用"
          @change="getList"
        />
        <el-button
          v-waves
          :loading="creating"
          class="filter-item"
          type="primary"
          icon="el-icon-plus"
          @click="handleCreate"
        >
          生成邀请码
        </el-button>
      </div>

      <el-table v-loading="listLoading" :data="list" border fit highlight-current-row style="width: 100%;">
        <el-table-column prop="code" label="邀请码" min-width="220" />
        <el-table-column label="状态" width="120" align="center">
          <template slot-scope="{ row }">
            <el-tag :type="row.used ? 'info' : 'success'">
              {{ row.used ? '已使用' : '未使用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="生成时间" width="180" />
        <el-table-column prop="used_at" label="使用时间" width="180" />
        <el-table-column prop="created_by" label="生成人" width="100" align="center" />
        <el-table-column prop="used_by" label="使用用户" width="100" align="center" />
        <el-table-column label="操作" width="120" align="center">
          <template slot-scope="{ row }">
            <el-button type="text" size="mini" @click="copyCode(row.code)">
              复制
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import waves from '@/directive/waves'
import { createInviteCode, fetchInviteCodes } from '@/api/user'

export default {
  name: 'InviteCodeTable',
  directives: { waves },
  data() {
    return {
      list: [],
      listLoading: false,
      creating: false,
      showUsed: true
    }
  },
  created() {
    this.getList()
  },
  methods: {
    getList() {
      this.listLoading = true
      fetchInviteCodes({ show_used: this.showUsed ? 1 : 0 }).then((res) => {
        this.list = (res.data && res.data.items) || []
      }).finally(() => {
        this.listLoading = false
      })
    },
    handleCreate() {
      this.creating = true
      createInviteCode().then((res) => {
        const code = res.data && res.data.code
        this.$message.success(`邀请码已生成：${code}`)
        this.getList()
      }).finally(() => {
        this.creating = false
      })
    },
    copyCode(code) {
      if (!navigator.clipboard) {
        this.$message.warning('当前环境不支持一键复制')
        return
      }
      navigator.clipboard.writeText(code).then(() => {
        this.$message.success('邀请码已复制')
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.filter-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}
</style>
