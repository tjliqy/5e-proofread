<template>
  <el-container v-loading="loading" element-loading-text="加载时间较长，请耐心等待..." :style="'height: '+ containerHeight+'px'">

    <el-main>
      <div style="display: flex; width: 100%; height: 36px">
        <p class="top-info">
          <span>当前文件：<b>{{ file_path }}</b>。</span>
          <span style="color: green;">绿色</span>：已确认文本。
          <span style="color: yellow">黄色</span>：有校对未确认的文本。
          <span style="color: blue;">蓝色</span>：未确认文本。
        </p>
      </div>
      <!-- <json-editor ref="jsonEditor" v-model="json_txt" /> -->
      <split-pane split="horizontal" :style="'height: '+ (containerHeight - 40)+'px'">
        <template slot="paneL" style="overflow-y:scroll;">
          <div style="overflow-y:scroll;height:100%; padding: 10px;">
            <translate-line
              v-if="json_html"
              :json_html="json_html"
              :words="words"
              @to-proofread="toProofread"
            />
          </div>
        </template>
        <template slot="paneR">
          <div style="overflow-y:scroll;height:100%">
            <div v-if="temp.sql_id === undefined" style="  display: flex;justify-content: center;align-items: center;">
              <h3>校对窗口:请先选择要校对的文本</h3>
            </div>
            <proofread v-else ref="proofread" :word="temp" :current-file="file_path" />
          </div>
        </template>
      </split-pane>
    </el-main>
    <!-- <el-dialog :visible.sync="dialogFormVisible" :title="en_in_file">
      <proofread ref="proofread" :word="temp" :current-file="file_path" />
    </el-dialog> -->
  </el-container>
</template>

<script>
// import JsonEditor from '@/components/JsonEditor'
import Proofread from '@/components/Proofread'
import splitPane from 'vue-splitpane'
import TranslateLine from '@/components/TranslateLine'

export default {
  name: 'FileList',
  components: { Proofread, splitPane, TranslateLine },
  data() {
    return {
      drawVisible: false,
      files: [],
      words: {},
      defaultProps: {
        children: 'children',
        label: 'label'
      },
      file_path: '',
      json_txt: '',
      json_html: [],
      en_in_file: '',
      loading: false,
      temp: {
        sql_id: undefined,
        en_str: '',
        cn_str: '',
        create_at: '',
        modified_at: '',
        is_key: 0,
        is_proofread: 0
      },
      source: ''
    }
  },
  computed: {
    containerHeight() {
      return window.innerHeight - 90
    }
  },
  watch: {
    // 监听路由参数变化
    '$route.query.file_path'(newPath) {
      if (newPath) {
        this.loadJsonFile(newPath)
      }
    }
  },
  // 添加created钩子和watch路由参数变化的逻辑
  created() {
    // 检查路由参数，如果有file_path则直接加载该文件
    if (this.$route.query.file_path) {
      this.loadJsonFile(this.$route.query.file_path)
    }
  },
  mounted() {
    // this.$store.dispatch('file/loadJsonFiles').then(files => {
    //   this.files = files.map(f => f.file)
    // }
    // ).catch(error => {
    //   console.log(error)
    // })
  },
  methods: {
    handleNodeClick(data) {
      if (data.children.length > 0) {
        return
      }
      this.loadJsonFile(data.path)
    },
    loadJsonFile(file_path) {
      if (file_path === '') {
        this.$message.error('请选择文件')
        return
      }
      this.json_html = []
      if (this.files[file_path] !== undefined && this.files[file_path] !== '') {
        this.json_txt = this.files[file_path]
      } else {
        this.$store.dispatch('file/loadJsonFiles', { 'file_path': file_path }).then(file_data => {
          console.log(file_data)
          const data = file_data[0]
          this.json_txt = data.json_content
          this.loading = true
          if (this.file_path === file_path) {
            this.getJsonHtml()
            this.loading = false
          } else {
            const words_ = {}
            data.job_list.map(job => {
              console.log(job)
              words_[job.en_str.toLowerCase()] = job
            })
            this.words = words_
            this.getJsonHtml()
            this.loading = false
          }
          this.file_path = file_path
          this.loading = false
        }
        ).catch(error => {
          console.log(error)
        })
      }
    },
    getJsonHtml() {
      // 判断this.json_txt的类型是否为字符串
      console.log(typeof this.json_txt)
      if (typeof this.json_txt !== 'object' && this.json_txt !== null) {
        this.$message.error('文件内容不是有效的对象')
        return
      }
      const fuckLine = (in_line) => {
        let res_line = []
        // 检查整个字符串值是否在words中（用于原句校对）
        const lowerValueContent = in_line.toLowerCase()
        const isWholeSentenceInWords = lowerValueContent in this.words

        const wholeSentenceValue = isWholeSentenceInWords ? lowerValueContent : undefined

        if ((!in_line.includes('{@')) && (!in_line.includes('|') && !in_line.includes('='))) {
          // 普通文本 - 使用完整句子作为word
          if (wholeSentenceValue !== undefined) {
            res_line.push({
              html: in_line,
              word: wholeSentenceValue
            })
          }
          return res_line
        }

        let currentContent = '' // 当前已经读取的内容
        let markUpContent = '' // 当前正在读取的标记符内容
        let markUpLevel = 0 // 标记符嵌套层级
        for (const i in in_line) {
          const c = in_line[i]
          if (c === '{') {
            markUpLevel++
          } else if (c === '}') {
            markUpLevel--
            if (markUpLevel === 0) {
              // 将第一个空格到}之间的内容递归处理，前后的内容放到currentContent里
              currentContent += markUpContent.substring(0, markUpContent.indexOf(' ') + 1)
              res_line.push({
                html: currentContent,
                word: wholeSentenceValue
              })
              const subContent = markUpContent.substring(markUpContent.indexOf(' ') + 1, markUpContent.length)
              res_line = res_line.concat(fuckLine(subContent))
              currentContent = '}'
              markUpContent = ''
              continue
            }
          }
          if (markUpLevel === 0) {
            if (c === '|' || c === '=') {
              res_line = res_line.concat(fuckLine(currentContent))
              res_line.push({
                html: c,
                word: undefined
              })
              currentContent = ''
            } else {
              currentContent += c
            }
          } else {
            // 标记符开始或中间内容
            markUpContent += c
          }
        }
        if (currentContent.length > 0) {
          const last_part = fuckLine(currentContent)
          if (last_part.length > 0) {
            res_line = res_line.concat(last_part)
          } else {
            res_line.push({
              html: currentContent,
              word: wholeSentenceValue
            })
          }
        }
        return res_line
      }

      const process = (obj) => {
        const res_obj = {
          name_obj: null,
          entries: []
        }
        if (typeof obj === 'object' && obj !== null) {
          // 先处理name属性
          if (obj.name !== undefined) {
            console.log(obj.name)
            res_obj.name_obj = fuckLine(obj.name)
          }
          // 再处理name之外的其他属性
          for (const key in obj) {
            // 跳过name属性
            if (key === 'name') {
              continue
            }
            const proc_obj = process(obj[key])
            if (proc_obj.name_obj !== null) {
              res_obj.entries.push(proc_obj)
            } else if (proc_obj.entries.length > 0) {
              // 展开数组，避免嵌套
              res_obj.entries.push(...proc_obj.entries)
            }
          }
        } else if (typeof obj === 'string') {
          const line = fuckLine(obj)
          // 展开数组，避免嵌套
          if (line && line.length > 0) {
            res_obj.entries.push({ entries: line })
          }
        }
        return res_obj
      }
      // 直接使用process的结果，不需要包装在数组中
      this.json_html = process(this.json_txt)
      console.log(this.json_html)
    },
    toProofread(row, en_in_file) {
      this.$nextTick(() => {
        if (row) {
          this.temp = row
          this.en_in_file = en_in_file
        } else {
          // 原句校对逻辑，创建临时word对象
          console.log(en_in_file)
          this.temp = { sql_id: undefined, en_str: en_in_file }
          this.en_in_file = en_in_file
        }
      })
    }
  }
}
</script>
<style>
  .top-info {
    font-size: 12px;
    line-height:36px;
    margin:0 4px;
  }
</style>
