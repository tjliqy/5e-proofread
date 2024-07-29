<template>
  <el-container v-loading="loading" element-loading-text="加载时间较长，请耐心等待..." :style="'height: '+ containerHeight+'px'">
    <el-aside>
      <el-tree :data="getFilesMenu" :props="defaultProps" style="overflow: auto;height: 100%;" @node-click="handleNodeClick" />
    </el-aside>
    <!-- <json-editor ref="jsonEditor" v-model="json_txt" /> -->
    <el-main>
      <p>点击左侧列表查看文件详情</p>
      <p>绿色：已确认文本。 蓝色：未确认文本。</p>
      <h1>{{ file_path }}</h1>
      <p v-for="jhtml, i in json_html" :key="i" style="white-space:pre;margin:0">
        <template v-for="x, j in jhtml">
          <el-link v-if="x.word" :key="j" :type="words[x.html].proofread?'success':'primary'" @click="toProofread(words[x.html])">{{ words[x.html].cn }}</el-link>
          <template v-else>{{ x.html }}</template>
        </template>

      </p>
    </el-main>
    <el-dialog :visible.sync="dialogFormVisible">
      <proofread ref="proofread" :word="temp" />
    </el-dialog>
  </el-container>
</template>

<script>
// import JsonEditor from '@/components/JsonEditor'
import { fetchFileSource } from '@/api/words'
import Proofread from '@/components/Proofread'

export default {
  name: 'FileList',
  components: { Proofread },
  data() {
    return {
      files: [],
      words: [],
      defaultProps: {
        children: 'children',
        label: 'label'
      },
      file_path: '',
      json_txt: '',
      json_html: [],
      dialogFormVisible: false,
      loading: false,
      temp: {
        id: undefined,
        en: '',
        cn: '',
        create_at: '',
        modified_at: '',
        is_key: 0,
        proofread: 0
      }
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
      console.log(data.children)
      if (data.children.length > 0) {
        return
      }
      this.json_html = ''
      this.file_path = data.path
      if (this.files[data.path] !== undefined && this.files[data.path] !== '') {
        this.json_txt = this.files[data.path]
      } else {
        this.$store.dispatch('file/loadJsonFile', data.path).then(file_data => {
          this.json_txt = file_data
          this.loading = true

          fetchFileSource(data.path).then(words_data => {
            console.log(words_data)
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
        const strs = cur_l.split('\"')
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
    toProofread(row) {
      // this.$router.push({ path: '/table/word/' + row.id })
      this.dialogFormVisible = true
      this.$nextTick(() => {
        this.temp = row
      })
    }
  }
}
</script>
