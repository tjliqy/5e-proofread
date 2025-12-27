<template>
  <el-container v-loading="loading" element-loading-text="加载时间较长，请耐心等待..." :style="'height: '+ containerHeight+'px'">
    <el-drawer
      title="文件列表"
      :visible.sync="drawVisible"
      direction="rtl"
      style="height: 100%;"
    >
      <el-tree :data="getFilesMenu" :props="defaultProps" style="overflow-y: scroll;height: 100%;" @node-click="handleNodeClick" />
    </el-drawer>

    <el-main>
      <div style="display: flex; width: 100%; height: 36px">
        <el-button type="primary" size="small" @click="drawVisible = true">打开文件列表</el-button>
        <p class="top-info">
          <span v-if="file_path == ''">点击左侧列表查看文件详情。</span>
          <span v-else>当前文件：<b>{{ file_path }}</b>。</span>
          <span style="color: green;">绿色</span>：已确认文本。
          <span style="color: yellow">黄色</span>：有校对未确认的文本。
          <span style="color: blue;">蓝色</span>：未确认文本。
        </p>
      </div>
      <!-- <json-editor ref="jsonEditor" v-model="json_txt" /> -->
      <split-pane split="horizontal" :style="'height: '+ (containerHeight - 40)+'px'">
        <template slot="paneL" style="overflow-y:scroll;">

          <div style="overflow-y:scroll;height:100%">
            <p v-for="jhtml, i in json_html" :key="i" style="white-space:pre;margin:0">
              <template v-for="x, j in jhtml">
                <el-link v-if="x.word" :key="j" :type="words[x.html].proofread?'success':(words[x.html].is_key?'warning':'primary')" @click="toProofread(words[x.html], x.html)">{{ words[x.html].cn }}</el-link>
                <template v-else>{{ x.html }}</template>
              </template>
            </p>
          </div>
        </template>
        <template slot="paneR">
          <div style="overflow-y:scroll;height:100%">
            <div v-if="temp.id === undefined" style="  display: flex;justify-content: center;align-items: center;">
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
import { fetchFileSource } from '@/api/words'
import Proofread from '@/components/Proofread'
import splitPane from 'vue-splitpane'

export default {
  name: 'FileList',
  components: { Proofread, splitPane },
  data() {
    return {
      drawVisible: false,
      files: [],
      words: [],
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
        id: undefined,
        en: '',
        cn: '',
        create_at: '',
        modified_at: '',
        is_key: 0,
        proofread: 0
      },
      source: ''
    }
  },
  computed: {
    containerHeight() {
      return window.innerHeight - 90
    },
    getFilesMenu() {
      const files = []

      // 辅助函数：递归查找或创建目录结构
      const findOrCreatePath = (pathSegments, currentLevel, fullPath) => {
        if (pathSegments.length === 0) return

        const segment = pathSegments[0]
        const isLastSegment = pathSegments.length === 1

        // 查找当前层级是否已存在该段
        let existingNode = currentLevel.find(node => node.label === segment)

        if (!existingNode) {
          // 创建新节点
          existingNode = {
            label: segment,
            children: [],
            path: isLastSegment ? fullPath : '' // 只有文件才有完整路径
          }
          currentLevel.push(existingNode)
        }

        // 如果不是最后一段，继续递归创建下一级目录
        if (!isLastSegment) {
          findOrCreatePath(pathSegments.slice(1), existingNode.children, fullPath)
        }
      }
      // 处理所有文件路径
      for (const f in this.files) {
        if (f.includes('/')) {
          // 处理带目录的文件路径
          const pathSegments = f.split('/')
          findOrCreatePath(pathSegments, files, f)
        } else {
          // 处理根目录下的文件
          files.push({ label: f, children: [], path: f })
        }
      }
      return files
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
    this.$store.dispatch('file/loadJsonFiles').then(files => {
      this.files = files.map(f => f.file)
    }
    ).catch(error => {
      console.log(error)
    })
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
      this.json_html = ''
      if (this.files[file_path] !== undefined && this.files[file_path] !== '') {
        this.json_txt = this.files[file_path]
      } else {
        this.$store.dispatch('file/loadJsonFile', { 'file_path': file_path }).then(file_data => {
          this.json_txt = file_data
          this.loading = true
          if (this.file_path === file_path) {
            this.getJsonHtml()
            this.loading = false
          } else {
            // 判断json_txt是否有[_meta][origin_file],如果有，则file_path改为[_meta][origin_file]
            console.log(this.json_txt.file['_meta'])
            if (this.json_txt.file['_meta'] !== undefined && this.json_txt.file['_meta']['origin_file'] !== undefined) {
              file_path = this.json_txt.file['_meta']['origin_file']
            }
            fetchFileSource(file_path).then(words_data => {
              const words_ = {}
              words_data.data.items.map(d => {
                words_[d.words.en] = d.words
              })
              words_data.data.items.map(d => {
                if (d.words.en.toLowerCase() in words_) {
                  words_[d.words.en.toLowerCase()] = d.words
                }
              })
              this.words = words_
              this.getJsonHtml()
            }).finally(() => {
              this.loading = false
            })
          }
          this.file_path = file_path
        }
        ).catch(error => {
          console.log(error)
        })
      }
    },
    getJsonHtml() {
      const txt = JSON.stringify(this.json_txt, null, 2)
      const res = []
      const lines = txt.split('\n')
      for (const i in lines) {
        const res_line = []
        let cur_l = lines[i]
        if (cur_l.indexOf('\":\"') > -1) {
          res_line.push({ html: cur_l.split('\":\"')[0] + '\":\"' })
          cur_l = cur_l.split('\":\"')[1]
        }
        const origin_str = cur_l.split('\"')
        const strs = []
        let tmp_str = ''
        for (const j in origin_str) {
          if (origin_str[j] === '') {
            // res_line.push({ html: '\"', word: undefined })
            continue
          }
          if (origin_str[j].endsWith('\\')) {
            tmp_str = tmp_str + origin_str[j].slice(0, -1) + '\"'
          } else {
            strs.push(tmp_str + origin_str[j])
            tmp_str = ''
          }
        }
        for (const j in strs) {
          if (strs[j] === '') {
            // res_line.push({ html: '\"', word: undefined })
            continue
          }
          if (strs[j] in this.words) {
            res_line.push({ html: strs[j], word: strs[j] })
          } else if (strs[j].indexOf('|') > -1) {
            const sub_strs = strs[j].split('|')
            for (const s in sub_strs) {
              const sub_s = sub_strs[s]
              if (sub_s in this.words) {
                res_line.push({ html: sub_s, word: sub_s })
              } else {
                res_line.push({ html: sub_s, word: undefined })
              }
            }
          } else {
            res_line.push({ html: strs[j], word: undefined })
          }
        }
        res.push(res_line)
      }
      this.json_html = res
    },
    toProofread(row, en_in_file) {
      // this.$router.push({ path: '/table/word/' + row.id })
      this.$nextTick(() => {
        this.temp = row
        this.en_in_file = en_in_file
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
