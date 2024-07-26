<template>
  <div v-loading="loading">
    <el-card header="单词校对">
      <h4>英文原文</h4>
      <p>{{ word.en }}</p>
      <h4>当前翻译</h4>
      <!-- <el-input v-model="word.cn" type="textarea" rows=5 disabled/> -->
      <p>{{ word.cn }}</p>
      <p><b>是否关键词：</b>{{ word.is_key | boolFilter }}</p>
      <p><b>是否已确认：</b>{{ word.proofread | boolFilter }}</p>
      <p><b>引用文件：</b>{{ source_files }}</p>
    </el-card>

    <el-card header="校对内容">
      <p v-if="canProofread">已完成校对的内容无法继续上传校对</p>
      <p v-else>请在此处输入校对内容</p>
      <el-input v-model="proofread.cn" type="textarea" rows="5" placeholder="请输入翻译" :disabled="canProofread" />
      <el-button type="primary" :disabled="canProofread" @click="createProofread">提交校对</el-button>
    </el-card>

    <el-card header="校对列表">
      <el-table
        :key="tableKey"
        v-loading="proofreadLoading"
        :data="proofreadList"
        border
        fit
        highlight-current-row
        style="width: 100%;"
        @sort-change="sortChange"
      >
        <el-table-column label="校对翻译" align="center">
          <template slot-scope="{row}">
            <span>{{ row.cn }}</span>
          </template>
        </el-table-column>

        <el-table-column label="被采纳" width="150px" align="center">
          <template slot-scope="{row}">
            <span>{{ row.accepted | boolFilter }}</span>
          </template>
        </el-table-column>
        <el-table-column label="修改时间" width="180px" align="center">
          <template slot-scope="{row}">
            <span>{{ row.modified_at }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="role == 'admin'" label="操作" align="center" width="150" class-name="small-padding fixed-width">
          <!-- <template slot-scope="{row,$index}"> -->
          <template slot-scope="{row}">
            <el-button type="primary" size="mini" @click="handleAccepted(row)">
              采纳
            </el-button>
            <!-- <router-link :to="'/table/word/'+row.id">
                  Excel{{ $index }}
                </router-link> -->
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
// import { fetchList, fetchPv, createArticle, updateArticle } from '@/api/article'
import { updateArticle, fetchSourceFiles } from '@/api/words'
import { createProofread, fetchProofreadList, acceptProofread } from '@/api/proofread'

import waves from '@/directive/waves' // waves directive
import { parseTime } from '@/utils'
// import Pagination from '@/components/Pagination' // secondary package based on el-pagination

export default {
  name: 'Proofread',
  // components: { Pagination },
  directives: { waves },
  filters: {
    statusFilter(status) {
      const statusMap = {
        published: 'success',
        draft: 'info',
        deleted: 'danger'
      }
      return statusMap[status]
    },
    boolFilter(b) {
      return b === 1 ? '是' : '否'
    }
  },
  props: {
    word: {
      type: Object,
      default(rowProps) {
        return {
          id: undefined,
          en: '',
          cn: '',
          create_at: '',
          modified_at: '',
          is_key: 0,
          proofread: 0
        }
      }
    }
  },
  data() {
    return {
      role: '',
      id: undefined,
      tableKey: 0,
      list: null,
      total: 0,
      loading: true,
      proofreadLoading: true,
      proofreadList: null,
      listQuery: {
        page: 1,
        limit: 20,
        sort: '-modified_at'
      },
      proofread: {
        id: undefined,
        cn: '',
        modified_by: ''
      },
      dialogFormVisible: false,
      dialogStatus: '',
      textMap: {
        update: 'Edit',
        create: 'Create'
      },
      source_files: [],
      dialogPvVisible: false,
      pvData: [],
      rules: {
        type: [{ required: true, message: 'type is required', trigger: 'change' }],
        timestamp: [{ type: 'date', required: true, message: 'timestamp is required', trigger: 'change' }],
        title: [{ required: true, message: 'title is required', trigger: 'blur' }]
      },
      downloadLoading: false
    }
  },
  computed: {
    canProofread() {
      return this.word.id !== undefined && this.word.proofread === 1
    }
  },
  watch: {
    word: {
      handler: function(val) {
        this.id = val.id
        this.proofread = {
          id: undefined,
          cn: val.cn,
          modified_by: ''
        }
        this.getSourceFiles()
        this.getProofreadList()
      },
      deep: true
    }
  },
  mounted() {
    this.role = this.$store.getters.roles
  },
  methods: {
    // getInfo() {
    //   this.loading = true
    //   fetchWord(this.id).then(response => {
    //     this.word = response.data
    //     this.listQuery.eq_word_id = this.word.id
    //     this.getProofreadList()
    //     // Just to simulate the time of the request
    //     setTimeout(() => {
    //       this.loading = false
    //     }, 1.5 * 1000)
    //   })
    // },
    getProofreadList() {
      this.listQuery.eq_word_id = this.word.id
      this.proofreadLoading = true
      fetchProofreadList(this.listQuery).then(response => {
        this.proofreadList = response.data.items
        this.total = response.data.count
      }).finally(() => {
        this.proofreadLoading = false
      })
    },
    getSourceFiles() {
      this.loading = true
      console.log(this.role)
      this.source_files.splice(0)
      fetchSourceFiles(this.word.id).then(response => {
        const files = response.data.items
        for (let i = 0; i < files.length; i++) {
          this.source_files.push(files[i].file)
        }
      }).finally(() => {
        this.loading = false
      })
    },

    handleFilter() {
      this.listQuery.page = 1
      this.getInfo()
    },
    handleAccepted(row) {
      this.loading = true
      acceptProofread(row).then(() => {
        this.loading = false
        this.$message({
          message: '已采纳:' + row.cn,
          type: 'success'
        })
        this.word.proofread = 1
        this.getProofreadList()
      }).finally(() => {
        this.loading = false
      })
    },
    handleModifyStatus(row, status) {
      this.$message({
        message: '操作Success',
        type: 'success'
      })
      row.status = status
    },
    sortChange(data) {
      const { prop, order } = data
      if (prop === 'id') {
        this.sortByID(order)
      }
    },
    sortByID(order) {
      if (order === 'ascending') {
        this.listQuery.sort = '+id'
      } else {
        this.listQuery.sort = '-id'
      }
      this.handleFilter()
    },
    handleUpdate(row) {
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    createProofread() {
      this.proofread.cn = this.proofread.cn.trim().replace(/\n/g, '')
      // if (this.proofread.cn === this.word.cn) {
      //   this.$notify({
      //     title: 'Error',
      //     message: '请勿提交重复的翻译内容',
      //     type: 'error',
      //     duration: 2000
      //   })
      //   return
      // }
      const tempData = Object.assign({}, this.proofread)
      tempData.modified_by = this.word.modified_by
      tempData.word_id = this.word.id
      tempData.modified_at = undefined
      tempData.modified_by = undefined
      createProofread(tempData).then(() => {
        this.$notify({
          title: 'Success',
          message: 'Create Successfully',
          type: 'success',
          duration: 2000
        })
        this.proofread = {
          id: undefined,
          cn: '',
          modified_by: ''
        }
        this.getProofreadList()
      })
    },
    updateData() {
      this.$refs['dataForm'].validate((valid) => {
        if (valid) {
          const tempData = Object.assign({}, this.word)
          tempData.modified_at = +new Date(tempData.timestamp) // change Thu Nov 30 2017 16:41:05 GMT+0800 (CST) to 1512031311464
          updateArticle(tempData).then(() => {
            // const index = this.list.findIndex(v => v.id === this.word.id)
            // this.list.splice(index, 1, this.temp)
            // this.dialogFormVisible = false
            this.$notify({
              title: 'Success',
              message: 'Update Successfully',
              type: 'success',
              duration: 2000
            })
          })
        }
      })
    },
    handleDownload() {
      this.downloadLoading = true
      import('@/vendor/Export2Excel').then(excel => {
        const tHeader = ['timestamp', 'title', 'type', 'importance', 'status']
        const filterVal = ['timestamp', 'title', 'type', 'importance', 'status']
        const data = this.formatJson(filterVal)
        excel.export_json_to_excel({
          header: tHeader,
          data,
          filename: 'table-list'
        })
        this.downloadLoading = false
      })
    },
    formatJson(filterVal) {
      return this.list.map(v => filterVal.map(j => {
        if (j === 'timestamp') {
          return parseTime(v[j])
        } else {
          return v[j]
        }
      }))
    },
    getSortClass(key) {
      const sort = this.listQuery.sort
      return sort === `+${key}` ? 'ascending' : 'descending'
    }
  }

}
</script>
