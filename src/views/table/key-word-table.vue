<template>
  <div class="app-container">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card>
          <div class="filter-container">
            <el-input v-model="listQuery.in_en" placeholder="英文" clearable style="width: 200px;" class="filter-item" @keyup.enter.native="handleFilter" />
            <el-input v-model="listQuery.nin_cn" placeholder="正确翻译" clearable style="width: 200px;" class="filter-item" @keyup.enter.native="handleFilter" />
            <el-input v-model="listQuery.in_cn" placeholder="错误翻译" clearable style="width: 200px;" class="filter-item" />
            <!-- <el-select v-model="listQuery.eq_is_key" placeholder="关键词" clearable style="width: 90px" class="filter-item">
              <el-option :key="1" :label="'是'" :value="1" />
              <el-option :key="0" :label="'否'" :value="0" />
            </el-select> -->
            <el-select v-model="listQuery.eq_proofread" placeholder="确认" clearable style="width: 90px" class="filter-item">
              <el-option :key="1" :label="'已确认'" :value="1" />
              <el-option :key="0" :label="'未确认'" :value="0" />
            </el-select>
            <el-select v-model="listQuery.eq_is_key" placeholder="校对" clearable style="width: 90px" class="filter-item">
              <el-option :key="1" :label="'已校对'" :value="1" />
              <el-option :key="0" :label="'未校对'" :value="0" />
            </el-select>
            <el-select v-model="listQuery.source_file" style="width: 140px" class="filter-item" clearable filterable placeholder="引用文件" @change="handleFilter">
              <el-option v-for="item in files" :key="item" :label="item" :value="item" />
            </el-select>
            <el-select v-model="listQuery.sort" style="width: 140px" class="filter-item" @change="handleFilter">
              <el-option v-for="item in sortOptions" :key="item.key" :label="item.label" :value="item.key" />
            </el-select>
            <el-button v-waves class="filter-item" type="primary" icon="el-icon-search" @click="handleFilter">
              搜索
            </el-button>
            <el-button v-waves class="filter-item" type="danger" @click="handleReplace">
              批量替换
            </el-button>
            <!-- <el-button class="filter-item" style="margin-left: 10px;" type="primary" icon="el-icon-edit" @click="handleCreate">
              Add
            </el-button> -->
            <!-- <el-button v-waves :loading="downloadLoading" class="filter-item" type="primary" icon="el-icon-download" @click="handleDownload">
              Export
            </el-button> -->
          </div>

          <el-table
            :key="tableKey"
            v-loading="listLoading"
            :data="list"
            border
            fit
            highlight-current-row
            style="width: 100%;"
            @sort-change="sortChange"
          >
            <el-table-column label="ID" prop="id" sortable="custom" align="center" width="80" :class-name="getSortClass('id')">
              <template slot-scope="{row}">
                <span>{{ row.id }}</span>
              </template>
            </el-table-column>
            <el-table-column label="英文原文" align="center">
              <template slot-scope="{row}">
                <span>{{ row.en }}</span>
              </template>
            </el-table-column>
            <el-table-column label="翻译" align="center">
              <template slot-scope="{row}">
                <span>{{ row.cn }}</span>
              </template>
            </el-table-column>
            <el-table-column label="修改时间" width="160px" align="center">
              <template slot-scope="{row}">
                <span>{{ row.modified_at }}</span>
              </template>
            </el-table-column>
            <el-table-column label="是否确认" width="110px" align="center">
              <template slot-scope="{row}">
                <span>{{ row.proofread | boolFilter }}</span>
              </template>
            </el-table-column>
            <el-table-column label="是否校对" width="110px" align="center">
              <template slot-scope="{row}">
                <span>{{ row.is_key | boolFilter }}</span>
              </template>
            </el-table-column>
            <!-- <el-table-column v-if="showReviewer" label="Reviewer" width="110px" align="center">
              <template slot-scope="{row}">
                <span style="color:red;">{{ row.reviewer }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Imp" width="80px">
              <template slot-scope="{row}">
                <svg-icon v-for="n in + row.importance" :key="n" icon-class="star" class="meta-item__icon" />
              </template>
            </el-table-column>
            <el-table-column label="Readings" align="center" width="95">
              <template slot-scope="{row}">
                <span v-if="row.pageviews" class="link-type" @click="handleFetchPv(row.pageviews)">{{ row.pageviews }}</span>
                <span v-else>0</span>
              </template>
            </el-table-column>
            <el-table-column label="Status" class-name="status-col" width="100">
              <template slot-scope="{row}">
                <el-tag :type="row.status | statusFilter">
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column> -->
            <el-table-column label="操作" align="center" width="150" class-name="small-padding fixed-width">
              <!-- <template slot-scope="{row,$index}"> -->
              <template slot-scope="{row}">
                <el-button type="primary" size="mini" @click="toProofread(row)">
                  校对
                </el-button>
                <!-- <router-link :to="'/table/word/'+row.id">
                  Excel{{ $index }}
                </router-link> -->
              </template>
            </el-table-column>
          </el-table>

          <pagination v-show="total>0" :total="total" :page.sync="listQuery.page" :limit.sync="listQuery.limit" @pagination="getList" />
        </el-card>
      </el-col>
    </el-row>
    <el-dialog :visible.sync="dialogFormVisible">
      <proofread ref="proofread" :word="temp" />
    </el-dialog>

    <el-dialog :title="textMap[dialogStatus]">
      <!-- <el-dialog :title="textMap[dialogStatus]" :visible.sync="dialogFormVisible"> -->
      <el-form ref="dataForm" :rules="rules" :model="temp" label-position="left" label-width="70px" style="width: 400px; margin-left:50px;">
        <el-form-item label="Type" prop="type">
          <el-select v-model="temp.type" class="filter-item" placeholder="Please select">
            <el-option v-for="item in calendarTypeOptions" :key="item.key" :label="item.display_name" :value="item.key" />
          </el-select>
        </el-form-item>
        <el-form-item label="Date" prop="timestamp">
          <el-date-picker v-model="temp.timestamp" type="datetime" placeholder="Please pick a date" />
        </el-form-item>
        <el-form-item label="Title" prop="title">
          <el-input v-model="temp.title" />
        </el-form-item>
        <el-form-item label="Status">
          <el-select v-model="temp.status" class="filter-item" placeholder="Please select">
            <el-option v-for="item in statusOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="Imp">
          <el-rate v-model="temp.importance" :colors="['#99A9BF', '#F7BA2A', '#FF9900']" :max="3" style="margin-top:8px;" />
        </el-form-item>
        <el-form-item label="Remark">
          <el-input v-model="temp.remark" :autosize="{ minRows: 2, maxRows: 4}" type="textarea" placeholder="Please input" />
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogFormVisible = false">
          Cancel
        </el-button>
        <el-button type="primary" @click="dialogStatus==='create'?createData():updateData()">
          Confirm
        </el-button>
      </div>
    </el-dialog>

    <el-dialog :visible.sync="dialogPvVisible" title="Reading statistics">
      <el-table :data="pvData" border fit highlight-current-row style="width: 100%">
        <el-table-column prop="key" label="Channel" />
        <el-table-column prop="pv" label="Pv" />
      </el-table>
      <span slot="footer" class="dialog-footer">
        <el-button type="primary" @click="dialogPvVisible = false">Confirm</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
// import { fetchList, fetchPv, createArticle, updateArticle } from '@/api/article'
import { fetchList, replaceKeyWords } from '@/api/words'
// import RightPanel from '@/components/RightPanel'

import waves from '@/directive/waves' // waves directive
import { parseTime } from '@/utils'
import Pagination from '@/components/Pagination' // secondary package based on el-pagination
import Proofread from '@/components/Proofread'

const calendarTypeOptions = [
  { key: 'CN', display_name: 'China' },
  { key: 'US', display_name: 'USA' },
  { key: 'JP', display_name: 'Japan' },
  { key: 'EU', display_name: 'Eurozone' }
]

// arr to obj, such as { CN : "China", US : "USA" }
const calendarTypeKeyValue = calendarTypeOptions.reduce((acc, cur) => {
  acc[cur.key] = cur.display_name
  return acc
}, {})

export default {
  name: 'KeyTable',
  components: { Pagination, Proofread },
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
    typeFilter(type) {
      return calendarTypeKeyValue[type]
    },
    boolFilter(b) {
      return b === 1 ? '是' : '否'
    }
  },
  data() {
    return {
      files: [],
      tableKey: 0,
      list: null,
      total: 0,
      listLoading: true,
      listQuery: {
        page: 1,
        limit: 20,
        in_en: undefined,
        in_cn: undefined,
        eq_is_key: undefined,
        eq_proofread: 0,
        has_proofread: undefined,
        sort: '+id'
      },
      importanceOptions: [1, 2, 3],
      calendarTypeOptions,
      sortOptions: [
        { label: 'ID 升序', key: '+id' },
        { label: 'ID 降序', key: '-id' },
        { label: '修改时间 升序', key: '+modified_at' },
        { label: '修改时间 降序', key: '-modified_at' }
      ],
      statusOptions: ['published', 'draft', 'deleted'],
      showReviewer: false,
      temp: {
        id: undefined,
        en: '',
        cn: '',
        create_at: '',
        modified_at: '',
        is_key: 0,
        proofread: 0
      },
      wrongCn: '',
      dialogFormVisible: false,
      dialogStatus: '',
      textMap: {
        update: 'Edit',
        create: 'Create'
      },
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
  created() {
    this.loadFiles()
    this.getList()
  },
  methods: {
    loadFiles() {
      this.$store.dispatch('file/loadJsonFiles').then(files => {
        console.log(files)
        for (const k in files) {
          this.files.push(k)
        }
        // this.files = files
      })
    },
    getList() {
      this.listLoading = true
      fetchList(this.listQuery).then(response => {
        this.list = response.data.items
        this.total = response.data.count

        // Just to simulate the time of the request
        setTimeout(() => {
          this.listLoading = false
        }, 1.5 * 1000)
      })
    },
    handleFilter() {
      this.listQuery.page = 1
      // this.listQuery.in_cn = this.listQuery.in_cn ? this.listQuery.in_cn.trim() : undefined
      // this.listQuery.in_en = this.listQuery.in_en ? this.listQuery.in_en.trim() : undefined
      this.getList()
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
    resetTemp() {
      this.temp = {
        id: undefined,
        importance: 1,
        remark: '',
        timestamp: new Date(),
        title: '',
        status: 'published',
        type: ''
      }
    },
    handleCreate() {
      this.resetTemp()
      this.dialogStatus = 'create'
      this.dialogFormVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    // createData() {
    //   this.$refs['dataForm'].validate((valid) => {
    //     if (valid) {
    //       this.temp.id = parseInt(Math.random() * 100) + 1024 // mock a id
    //       this.temp.author = 'vue-element-admin'
    //       createArticle(this.temp).then(() => {
    //         this.list.unshift(this.temp)
    //         this.dialogFormVisible = false
    //         this.$notify({
    //           title: 'Success',
    //           message: 'Created Successfully',
    //           type: 'success',
    //           duration: 2000
    //         })
    //       })
    //     }
    //   })
    // },
    toProofread(row) {
      // this.$router.push({ path: '/table/word/' + row.id })
      this.dialogFormVisible = true
      this.$nextTick(() => {
        this.temp = row
      })
    },
    handleUpdate(row) {
      this.temp = Object.assign({}, row) // copy obj
      this.temp.timestamp = new Date(this.temp.timestamp)
      this.dialogStatus = 'update'
      this.dialogFormVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    handleReplace(row) {
      if (this.listQuery.in_cn === '') {
        this.$message({
          message: '请输入错误翻译',
          type: 'warning'
        })
      } else if (this.listQuery.nin_cn === '') {
        this.$message({
          message: '请输入正确翻译',
          type: 'warning'
        })
      } else if (this.listQuery.in_en === '') {
        this.$message({
          message: '请输入英文',
          type: 'warning'
        })
      } else {
        replaceKeyWords({ wrongCn: this.listQuery.in_cn, rightCn: this.listQuery.nin_cn, en: this.listQuery.in_en }).then(response => {
          const data = response.data
          this.$message({
            message: '已修正:' + data.count + '条',
            type: 'success'
          })
          this.handleFilter()
        })
      }
    },
    handleDelete(row, index) {
      this.$notify({
        title: 'Success',
        message: 'Delete Successfully',
        type: 'success',
        duration: 2000
      })
      this.list.splice(index, 1)
    },
    // handleFetchPv(pv) {
    //   fetchPv(pv).then(response => {
    //     this.pvData = response.data.pvData
    //     this.dialogPvVisible = true
    //   })
    // },
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
    getSortClass: function(key) {
      const sort = this.listQuery.sort
      return sort === `+${key}` ? 'ascending' : 'descending'
    }
  }
}
</script>
