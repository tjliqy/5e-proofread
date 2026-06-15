<template>
  <div v-loading="loading">
    <el-card>
      <p v-if="canProofread">已完成校对的内容无法继续上传校对</p>
      <el-button-group>
        <el-button v-for="t,i in tag_list" :key="i" size="mini" type="primary" class="tag-copy-button" @click="handleCopy(t.cn, $event)">
          <div class="tag-copy-content">
            <div class="tag-copy-label">EN</div>
            <div class="tag-copy-text">{{ t.en }}</div>
            <div class="tag-copy-label">CN</div>
            <div class="tag-copy-text">{{ t.cn }}</div>
          </div>
        </el-button>
      </el-button-group>

      <el-input
        v-model="proofread.cn"
        type="textarea"
        rows="5"
        placeholder="请输入翻译"
        :disabled="canProofread || submitting || independentSubmitting"
        style="margin:2px 0"
        @keydown.native="handleProofreadKeydown"
      />
      <div class="proofread-actions">
        <el-button plain icon="el-icon-arrow-left" :disabled="!hasPreviousUnproofread || submitting || independentSubmitting || loading" @click="$emit('previous-unproofread')">上一个</el-button>
        <el-button type="primary" :loading="submitting" :disabled="canProofread || submitting || independentSubmitting" @click="createProofread">提交校对</el-button>
        <el-button
          v-if="canCreateIndependentTranslation"
          type="warning"
          :loading="independentSubmitting"
          :disabled="submitting || independentSubmitting || !proofread.cn.trim()"
          @click="createIndependentTranslation"
        >
          新增独立翻译
        </el-button>
        <el-button plain icon="el-icon-arrow-right" :disabled="!hasNextUnproofread || submitting || independentSubmitting || loading" @click="$emit('next-unproofread')">下一个</el-button>
      </div>
    </el-card>
    <el-card>
      <el-descriptions :column="1">
        <el-descriptions-item label="英文原文">{{ word.en_str }}</el-descriptions-item>
        <el-descriptions-item label="当前翻译">{{ word.cn_str }}</el-descriptions-item>
        <el-descriptions-item label="引用文件">
          <el-tag v-for="s in source_files" :key="s" style="margin-right: 4px;" size="small">{{ s }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>
      <el-descriptions :column="3">
        <el-descriptions-item label="翻译来源">{{ word.source }}</el-descriptions-item>
        <el-descriptions-item label="已有校对">{{ word.is_key | boolFilter }}</el-descriptions-item>
        <el-descriptions-item label="已确认">{{ word.is_key | boolFilter }}</el-descriptions-item>
      </el-descriptions>
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
        <el-table-column label="校对用户" width="150px" align="center">
          <template slot-scope="{row}">
            <span>{{ row.modified_by_username }}</span>
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
    <el-card v-if="role == 'admin' && currentFile != ''" header="相关单词">
      <el-table
        :key="tableKey"
        v-loading="relationLoading"
        :data="relationList"
        border
        fit
        highlight-current-row
        style="width: 100%;"
        @sort-change="sortChange"
      >
        <el-table-column label="英文" align="center">
          <template slot-scope="{row}">
            <span>{{ row.en }}</span>
          </template>
        </el-table-column>

        <el-table-column label="翻译" align="center">
          <template slot-scope="{row}">
            <span>{{ row.cn }}</span>
          </template>
        </el-table-column>
        <el-table-column label="是否确认" align="center">
          <template slot-scope="{row}">
            <span>{{ row.is_proofread | boolFilter }}</span>
          </template>
        </el-table-column>
        <el-table-column label="来源" align="center">
          <template slot-scope="{row}">
            <span>{{ row.source }}</span>
          </template>
        </el-table-column>
        <el-table-column label="修改时间" width="180px" align="center">
          <template slot-scope="{row}">
            <span>{{ row.modified_at }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" width="150" class-name="small-padding fixed-width">
          <!-- <template slot-scope="{row,$index}"> -->
          <template slot-scope="{row}">
            <el-button type="primary" size="mini" @click="handleReplace(row)">
              替换
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
import {
  createIndependentTranslation as submitIndependentTranslation,
  fetchSourceFiles,
  fetchList,
  replaceTranslate
} from '@/api/words'
import { createProofread, fetchProofreadList, acceptProofread } from '@/api/proofread'
import clip from '@/utils/clipboard' // use clipboard directly

import waves from '@/directive/waves' // waves directive
import { parseTime } from '@/utils'
// import Pagination from '@/components/Pagination' // secondary package based on el-pagination
function countOccurrences(string, substring) {
  // 使用正则表达式全局搜索子字符串出现的次数
  // 这里我们使用match方法和全局g标志
  const matches = string.match(new RegExp(substring, 'g'))
  return matches ? matches.length : 0
}

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
          sql_id: undefined,
          en_str: '',
          cn_str: '',
          source: '',
          create_at: '',
          modified_at: '',
          is_key: 0,
          is_proofread: 0
        }
      }
    },
    jobs: {
      type: Array,
      default: () => []
    },
    currentFile: {
      type: String,
      default: ''
    },
    hasNextUnproofread: {
      type: Boolean,
      default: false
    },
    hasPreviousUnproofread: {
      type: Boolean,
      default: false
    },
    autoNextAfterProofread: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      role: '',
      id: undefined,
      tableKey: 0,
      list: null,
      total: 0,
      loading: false,
      proofreadLoading: true,
      proofreadList: null,
      relationLoading: true,
      relationList: [],
      proofreadQuery: {
        page: 1,
        limit: 20,
        sort: '-modified_at'
      },
      relationQuery: {
        eq_en: '',
        sort: '-modified_at'
      },
      proofread: {
        sql_id: undefined,
        cn: '',
        modified_by: ''
      },
      submitting: false,
      independentSubmitting: false,
      source_files: [],
      tag_list: []
    }
  },
  computed: {
    canProofread() {
      return this.word.sql_id !== undefined && this.word.is_proofread === 1 && this.role !== 'admin'
    },
    canCreateIndependentTranslation() {
      return this.role === 'admin' &&
        this.currentFile !== '' &&
        this.word.sql_id !== undefined &&
        this.word.sql_id !== null &&
        (Number(this.word.is_key) === 1 || Number(this.word.is_proofread) === 1)
    }
  },
  watch: {
    word: {
      handler: function(val) {
        this.loadNewWord(val)
      },
      deep: true
    },
    'proofread.cn': function() {
      this.updateTagList()
    },
    jobs() {
      this.updateTagList()
    }
  },
  mounted() {
    this.role = this.$store.getters.roles
    if (this.word.sql_id !== undefined) {
      this.loadNewWord(this.word)
    }
  },
  methods: {
    fillProofreadText(text) {
      this.proofread.cn = text || ''
    },
    // getInfo() {
    //   this.loading = true
    //   fetchWord(this.id).then(response => {
    //     this.word = response.data
    //     this.proofreadQuery.eq_word_id = this.word.id
    //     this.getProofreadList()
    //     // Just to simulate the time of the request
    //     setTimeout(() => {
    //       this.loading = false
    //     }, 1.5 * 1000)
    //   })
    // },
    loadNewWord(val) {
      this.loading = true
      this.id = val.sql_id
      this.proofread = {
        sql_id: undefined,
        cn: val.cn_str,
        modified_by: ''
      }
      if (val.sql_id !== undefined && val.sql_id !== null) {
        this.getSourceFiles()
        this.getProofreadList()
      } else {
        this.source_files = []
        this.proofreadList = []
        this.total = 0
        this.loading = false
        this.proofreadLoading = false
      }
      if (this.currentFile !== '') {
        this.getRelationList()
      }
      this.updateTagList()
    },
    getProofreadList(wordId = this.word.sql_id) {
      this.proofreadQuery.eq_word_id = wordId
      this.proofreadLoading = true
      console.log(this.proofreadQuery)
      fetchProofreadList(this.proofreadQuery).then(response => {
        this.proofreadList = response.data.items
        this.total = response.data.count
      }).finally(() => {
        this.proofreadLoading = false
      })
    },
    getRelationList() {
      this.relationQuery.eq_en = this.word.en_str
      this.relationQuery.neq_id = this.word.sql_id
      this.relationLoading = true
      fetchList(this.relationQuery).then(response => {
        this.relationList = response.data.items
        // this.total = response.data.count
      }).finally(() => {
        this.relationLoading = false
      })
    },
    getSourceFiles() {
      this.loading = true
      console.log(this.role)
      this.source_files.splice(0)
      fetchSourceFiles(this.word.sql_id).then(response => {
        const files = response.data.items
        for (let i = 0; i < files.length; i++) {
          this.source_files.push(files[i].file)
        }
      }).finally(() => {
        this.loading = false
      })
    },

    handleFilter() {
      this.proofreadQuery.page = 1
      this.getInfo()
    },
    handleProofreadKeydown(event) {
      if (!event || event.key !== 'Enter') return
      if (event.shiftKey || event.isComposing) return
      if (this.canProofread || this.submitting || this.independentSubmitting) return
      event.preventDefault()
      this.createProofread()
    },
    handleAccepted(row) {
      const previousCnStr = this.word.cn_str
      this.loading = true
      acceptProofread({ ...row, current_file: this.currentFile }).then((response) => {
        this.loading = false
        this.$message({
          message: '已采纳:' + row.cn,
          type: 'success'
        })
        this.word.is_proofread = 1
        this.word.is_key = 1
        this.word.cn_str = row.cn
        this.$emit('word-updated', { ...this.word, previousCnStr })
        this.$emit('progress-updated', response.data.progress || {})
        this.getProofreadList()
      }).finally(() => {
        this.loading = false
      })
    },
    handleReplace(row) {
      const previousCnStr = this.word.cn_str
      this.loading = true
      const data = {
        file: this.currentFile,
        word_id: this.word.sql_id,
        new_word_id: row.sql_id
      }
      replaceTranslate(data).then(() => {
        this.loading = false
        this.$message({
          message: '已采纳:' + row.cn,
          type: 'success'
        })
        this.word.is_proofread = 1
        this.word.cn_str = row.cn
        this.$emit('word-updated', { ...this.word, previousCnStr })
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
        this.proofreadQuery.sort = '+id'
      } else {
        this.proofreadQuery.sort = '-id'
      }
      this.handleFilter()
    },
    handleUpdate(row) {
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    createIndependentTranslation() {
      if (this.independentSubmitting) return
      const cn = this.proofread.cn.trim().replace(/\n/g, '')
      if (
        countOccurrences(this.word.en_str, '{@') !== countOccurrences(cn, '{@') ||
        countOccurrences(this.word.en_str, '}') !== countOccurrences(cn, '}')
      ) {
        this.$notify({
          title: 'Error',
          message: '无法新增，请核对文本中的标记符（类似{@spell light}）',
          type: 'error',
          duration: 5000
        })
        return
      }
      this.independentSubmitting = true
      submitIndependentTranslation({
        current_file: this.currentFile,
        word_id: this.word.sql_id,
        en_str: this.word.en_str,
        cn,
        uid: this.word.uid,
        tag: this.word.tag
      }).then((response) => {
        const result = response.data.word || {}
        const previousCnStr = this.word.cn_str
        this.$message.success(response.data.reused ? '已切换到已有独立翻译' : '已新增独立翻译')
        this.$emit('word-updated', {
          ...this.word,
          sql_id: result.id,
          cn_str: result.cn,
          is_key: result.is_key,
          is_proofread: result.proofread,
          previousCnStr
        })
        this.$emit('progress-updated', response.data.progress || {})
      }).finally(() => {
        this.independentSubmitting = false
      })
    },
    createProofread() {
      if (this.submitting) {
        return
      }
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
      tempData.word_id = this.word.sql_id
      tempData.en_str = this.word.en_str
      tempData.uid = this.word.uid
      tempData.tag = this.word.tag
      tempData.current_file = this.currentFile
      tempData.modified_at = undefined
      tempData.modified_by = undefined
      if (countOccurrences(this.word.en_str, '{@') !== countOccurrences(this.proofread.cn, '{@') ||
      countOccurrences(this.word.en_str, '}') !== countOccurrences(this.proofread.cn, '}')) {
        this.$notify({
          title: 'Error',
          message: '无法提交，请核对文本中的标记符（类似{@spell light}）',
          type: 'error',
          duration: 5000
        })
        return
      }
      this.submitting = true
      createProofread(tempData).then((response) => {
        const autoAccepted = response.data.auto_accepted === true
        const createdWord = response.data.word || {}
        this.$notify({
          title: 'Success',
          message: autoAccepted ? '校对已提交并自动确认' : '校对已提交',
          type: 'success',
          duration: 2000
        })
        this.proofread = {
          id: undefined,
          cn: '',
          modified_by: ''
        }
        this.$emit('word-updated', {
          ...this.word,
          sql_id: createdWord.id || this.word.sql_id,
          cn_str: tempData.cn,
          is_key: 1,
          is_proofread: autoAccepted ? 1 : this.word.is_proofread
        })
        this.$emit('progress-updated', response.data.progress || {})
        this.getProofreadList(createdWord.id || this.word.sql_id)
        if (this.autoNextAfterProofread) {
          this.$emit('next-unproofread')
        }
      }).finally(() => {
        this.submitting = false
      })
      this.word.is_key = true
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
      const sort = this.proofreadQuery.sort
      return sort === `+${key}` ? 'ascending' : 'descending'
    },
    splitOutsideTags(text) {
      if (!text) return []
      const result = []
      let current = ''
      let bracketLevel = 0
      let i = 0
      while (i < text.length) {
        if (text.slice(i, i + 2) === '{@') {
          bracketLevel += 1
          current += '{@'
          i += 2
          continue
        }
        if (text[i] === '{') {
          bracketLevel += 1
          current += text[i]
          i += 1
          continue
        }
        if (text[i] === '}') {
          bracketLevel = Math.max(0, bracketLevel - 1)
          current += text[i]
          i += 1
          continue
        }
        if (text[i] === '|' && bracketLevel === 0) {
          result.push(current)
          current = ''
          i += 1
          continue
        }
        current += text[i]
        i += 1
      }
      if (current) {
        result.push(current)
      }
      return result
    },
    parseTopLevelTags(text) {
      const tags = []
      if (!text) return tags
      let index = 0
      while (index < text.length) {
        const startIndex = text.indexOf('{@', index)
        if (startIndex === -1) break
        const tagStart = startIndex + 2
        const firstSpace = text.indexOf(' ', tagStart)
        const firstBrace = text.indexOf('}', tagStart)
        let tag = ''
        let value = ''
        let endIndex = -1

        if (firstSpace === -1 || (firstBrace !== -1 && firstBrace < firstSpace)) {
          if (firstBrace === -1) break
          tag = text.slice(tagStart, firstBrace)
          endIndex = firstBrace
        } else {
          tag = text.slice(tagStart, firstSpace)
          let braceCount = 1
          let cursor = firstSpace + 1
          while (cursor < text.length) {
            if (text.slice(cursor, cursor + 2) === '{@') {
              braceCount += 1
              cursor += 2
              continue
            }
            if (text[cursor] === '}') {
              braceCount -= 1
              if (braceCount === 0) {
                endIndex = cursor
                break
              }
            }
            cursor += 1
          }
          if (endIndex === -1) break
          value = text.slice(firstSpace + 1, endIndex)
        }

        tags.push({
          raw: text.slice(startIndex, endIndex + 1),
          tag,
          value
        })
        index = endIndex + 1
      }
      return tags
    },
    matchTagNodes(enNodes, cnNodes) {
      const matched = []
      const used = new Set()
      enNodes.forEach((enNode, index) => {
        let matchIndex = cnNodes.findIndex((node, idx) => !used.has(idx) && node.tag === enNode.tag)
        if (matchIndex === -1 && cnNodes[index]) {
          matchIndex = index
        }
        const cnNode = matchIndex === -1 ? null : cnNodes[matchIndex]
        if (matchIndex !== -1) {
          used.add(matchIndex)
        }
        matched.push({ enNode, cnNode })
      })
      return matched
    },
    buildCnTag(enNode, cnNode) {
      if (!enNode) return ''
      if (!enNode.value) {
        return `{@${enNode.tag}}`
      }
      const cnValue = this.buildCnValue(enNode.value, cnNode ? cnNode.value : '')
      return `{@${enNode.tag} ${cnValue}}`
    },
    buildCnValue(enValue, cnValue) {
      const enNodes = this.parseTopLevelTags(enValue)
      if (enNodes.length === 0) {
        const enParts = this.splitOutsideTags(enValue)
        const cnParts = this.splitOutsideTags(cnValue)
        if (enParts.length > 1) {
          return enParts.map((part, index) => {
            const currentCnPart = cnParts[index] !== undefined ? cnParts[index] : ''
            return this.buildCnValue(part, currentCnPart)
          }).join('|')
        }
        return cnValue && cnValue !== enValue ? cnValue : enValue
      }

      let result = cnValue || enValue
      const cnNodes = this.parseTopLevelTags(cnValue)
      const matchedPairs = this.matchTagNodes(enNodes, cnNodes)
      matchedPairs.forEach(({ enNode, cnNode }) => {
        const sourceRaw = cnNode ? cnNode.raw : enNode.raw
        result = result.replace(sourceRaw, this.buildCnTag(enNode, cnNode))
      })
      return result
    },
    updateTagList() {
      const enNodes = this.parseTopLevelTags(this.word.en_str || '')
      this.tag_list = enNodes.map(enNode => ({
        en: enNode.raw,
        cn: this.findCnTagFromJobs(enNode)
      }))
    },
    findCnTagFromJobs(enNode) {
      const lookups = [
        { key: this.getTagLookupKey(enNode, true), includeSource: true },
        { key: this.getTagLookupKey(enNode, false), includeSource: false }
      ]
      for (const lookup of lookups) {
        for (const job of this.jobs) {
          if (!job || !job.en_str || !job.cn_str || job.en_str === job.cn_str) {
            continue
          }
          const enNodes = this.parseTopLevelTags(job.en_str)
          const cnNodes = this.parseTopLevelTags(job.cn_str)
          const matchedPairs = this.matchTagNodes(enNodes, cnNodes)
          const pair = matchedPairs.find(({ enNode: jobEnNode }) => {
            return jobEnNode.raw === enNode.raw ||
              this.getTagLookupKey(jobEnNode, lookup.includeSource) === lookup.key
          })
          if (pair && pair.cnNode) {
            const cnTag = this.buildCnTag(pair.enNode, pair.cnNode)
            if (cnTag !== pair.enNode.raw) {
              return cnTag
            }
          }
        }
      }
      return this.buildCnTag(enNode, null)
    },
    getTagLookupKey(node, includeSource) {
      if (!node) return ''
      const parts = this.splitOutsideTags(node.value || '')
      const entityName = this.normalizeTagLookupPart(parts[0])
      const source = this.normalizeTagLookupPart(parts[1])
      return includeSource
        ? [node.tag.toLowerCase(), entityName, source].join('|')
        : [node.tag.toLowerCase(), entityName].join('|')
    },
    normalizeTagLookupPart(value) {
      return String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
    },
    handleCopy(text, event) {
      clip(text, event)
    }
  },
  emits: ['progress-updated', 'word-updated', 'next-unproofread', 'previous-unproofread']

}
</script>

<style lang="scss" scoped>
.proofread-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.tag-copy-button {
  height: auto;
  white-space: normal;
}

.tag-copy-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  line-height: 1.35;
  text-align: left;
}

.tag-copy-label {
  font-size: 10px;
  opacity: 0.75;
}

.tag-copy-text {
  max-width: 320px;
  word-break: break-all;
}
</style>
