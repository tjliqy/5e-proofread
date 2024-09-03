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
        <el-input v-model="source" placeholder="请输入来源简写(如:PHB)" style="width: 200px;" />
        <el-button type="primary" size="small" @click="loadJsonFile(file_path)">筛选来源</el-button>

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
      const tmp_dirs = []
      for (const f in this.files) {
        if (f.includes('/')) {
          const dir = f.split('/')[0]
          if (tmp_dirs.indexOf(dir) > -1) {
            for (const i in files) {
              if (files[i].label === dir) {
                files[i].children.push({ label: f.split('/')[1], children: [], path: f })
                break
              }
            }
          } else {
            tmp_dirs.push(dir)
            files.push({ label: dir, children: [{ label: f.split('/')[1], children: [], path: f }] })
          }
        } else {
          files.push({ label: f, children: [], path: f })
        }
      }
      return files
    }
  },
  mounted() {
    this.$store.dispatch('file/loadJsonFiles').then(files => {
      this.files = files
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
        this.$store.dispatch('file/loadJsonFile', { 'file': file_path, 'source': this.source }).then(file_data => {
          this.json_txt = file_data
          this.loading = true
          if (this.file_path === file_path) {
            this.getJsonHtml()
            this.loading = false
          } else {
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
