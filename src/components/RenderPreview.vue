<template>
  <div v-loading="loading" class="render-preview" element-loading-text="加载预览中...">
    <div v-if="message" class="render-preview__message" v-html="message" />
    <div v-else class="render-preview__columns">
      <div class="render-preview__legend">
        <span class="render-preview__legend-item">
          <span class="render-preview__legend-dot render-preview__legend-dot--proofread" />
          已确认文本
        </span>
        <span class="render-preview__legend-item">
          <span class="render-preview__legend-dot render-preview__legend-dot--pending" />
          有校对未确认的文本
        </span>
        <span class="render-preview__legend-item">
          <span class="render-preview__legend-dot render-preview__legend-dot--unconfirmed" />
          未确认文本
        </span>
      </div>
      <section
        ref="englishColumn"
        class="render-preview__column"
        @mousedown.capture="handlePreviewPointerDown($event, 'en')"
        @click.capture="handlePreviewClick($event, 'en')"
        @scroll.passive="handleColumnScroll('en')"
      >
        <h3 class="render-preview__title">英文原文（main）</h3>
        <table
          v-if="englishOutputHtml"
          class="render-preview__content w-100 stats"
          v-html="englishOutputHtml"
        />
        <div v-else class="render-preview__empty">暂无英文内容</div>
      </section>
      <section
        ref="chineseColumn"
        class="render-preview__column"
        @mousedown.capture="handlePreviewPointerDown($event, 'cn')"
        @click.capture="handlePreviewClick($event, 'cn')"
        @scroll.passive="handleColumnScroll('cn')"
      >
        <h3 class="render-preview__title">中文译文（cn2.0）</h3>
        <table
          v-if="chineseOutputHtml"
          class="render-preview__content w-100 stats"
          v-html="chineseOutputHtml"
        />
        <div v-else class="render-preview__empty">暂无中文内容</div>
      </section>
    </div>
  </div>
</template>

<script>
import { prepareRenderJson } from '@/utils/render-json'

export default {
  name: 'RenderPreview',
  props: {
    filePath: {
      type: String,
      default: ''
    },
    englishContent: {
      type: [String, Object, Array],
      default: ''
    },
    chineseContent: {
      type: [String, Object, Array],
      default: ''
    },
    jobs: {
      type: Array,
      default: () => []
    },
    currentWordKey: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      loading: false,
      ready: false,
      renderer: null,
      englishOutputHtml: '',
      chineseOutputHtml: '',
      message: '',
      scrollSyncFrame: null,
      scrollSyncSource: ''
    }
  },
  computed: {
    jobsByEnglishKey() {
      return this.jobs.reduce((result, job) => {
        if (job && job.en_str) {
          result[job.en_str.toLowerCase()] = job
        }
        return result
      }, {})
    },
    searchableJobs() {
      return this.jobs
        .filter(job => job && job.en_str)
        .map(job => ({
          job,
          en: this.normalizeSourceText(job.en_str),
          cn: this.normalizeSourceText(job.cn_str || job.en_str)
        }))
    }
  },
  watch: {
    filePath: {
      immediate: true,
      handler(value) {
        if (!value) {
          this.clearPreview()
          this.message = '暂无可预览文件'
          return
        }
        this.prepareAndLoad(value)
      }
    },
    englishContent() {
      this.prepareFromProps()
    },
    chineseContent() {
      this.prepareFromProps()
    },
    jobs() {
      this.decorateClickableEntries()
    },
    currentWordKey() {
      this.decorateClickableEntries()
    }
  },
  beforeDestroy() {
    if (this.scrollSyncFrame) {
      cancelAnimationFrame(this.scrollSyncFrame)
    }
  },
  methods: {
    async prepareAndLoad(filePath) {
      this.loading = true
      try {
        await this.ensureRendererReady()
        if (this.englishContent || this.chineseContent) {
          this.renderContents(this.englishContent, this.chineseContent)
        } else {
          await this.loadPreview(filePath)
        }
      } catch (error) {
        console.error('加载预览失败:', error)
        this.message = `加载预览失败: ${error.message || error}`
        this.clearPreview()
      } finally {
        this.loading = false
      }
    },
    async prepareFromProps() {
      if (!this.englishContent && !this.chineseContent) {
        return
      }
      this.loading = true
      try {
        await this.ensureRendererReady()
        this.renderContents(this.englishContent, this.chineseContent)
      } catch (error) {
        console.error('渲染双语预览失败:', error)
        this.message = `渲染双语预览失败: ${error.message || error}`
        this.clearPreview()
      } finally {
        this.loading = false
      }
    },
    async ensureRendererReady() {
      if (this.ready && this.renderer) {
        return
      }
      await this.waitForTools()
      await Promise.all([
        window.PrereleaseUtil.pInit(),
        window.BrewUtil2.pInit()
      ])
      this.renderer = window.Renderer.get()
      this.ready = true
    },
    waitForTools(maxAttempts = 20, delay = 200) {
      return new Promise((resolve, reject) => {
        let attempts = 0
        const checkTools = () => {
          attempts++
          if (window.PrereleaseUtil && window.BrewUtil2 && window.Renderer) {
            resolve()
            return
          }
          if (attempts >= maxAttempts) {
            reject(new Error('预览工具加载超时'))
            return
          }
          setTimeout(checkTools, delay)
        }
        checkTools()
      })
    },
    async loadPreview(filePath) {
      this.message = '加载预览中...'
      const fileData = await this.$store.dispatch('file/loadJsonFiles', { file_path: filePath, force: true })
      const data = fileData && fileData[0] ? fileData[0] : null
      if (!data || (!data.json_content && !data.cn_content)) {
        this.message = '文件内容为空或格式错误'
        this.clearPreview()
        return
      }

      this.renderContents(data.json_content, data.cn_content)
    },
    renderContents(englishContent, chineseContent) {
      this.englishOutputHtml = englishContent
        ? this.renderPreview(prepareRenderJson(englishContent))
        : ''
      this.chineseOutputHtml = chineseContent
        ? this.renderPreview(prepareRenderJson(chineseContent))
        : ''
      this.message = this.englishOutputHtml || this.chineseOutputHtml
        ? ''
        : '文件内容为空或格式错误'
      this.decorateClickableEntries()
    },
    renderPreview(json) {
      const renderStack = []
      this.renderer.setFirstSection(true)
      this.renderer.resetHeaderIndex()
      this.renderer.recursiveRender(json, renderStack)
      return `
        <tr><th class="ve-tbl-border" colspan="6"></th></tr>
        <tr><td colspan="6">${renderStack.join('')}</td></tr>
        <tr><th class="ve-tbl-border" colspan="6"></th></tr>
      `
    },
    clearPreview() {
      this.englishOutputHtml = ''
      this.chineseOutputHtml = ''
    },
    handlePreviewClick(event, language) {
      const match = this.findJobFromTarget(event.target, event.currentTarget, language)
      if (!match) {
        return
      }
      this.stopRendererEvent(event)
      this.$emit('to-proofread', match, match.en_str.toLowerCase())
    },
    handlePreviewPointerDown(event, language) {
      const match = this.findJobFromTarget(event.target, event.currentTarget, language)
      if (match) {
        this.stopRendererEvent(event)
      }
    },
    stopRendererEvent(event) {
      event.preventDefault()
      event.stopPropagation()
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation()
      }
    },
    findJobFromTarget(target, boundary, language) {
      let element = target
      while (element && element !== boundary) {
        const wordKey = element.getAttribute && element.getAttribute('data-word-key')
        if (wordKey && this.jobsByEnglishKey[wordKey]) {
          return this.jobsByEnglishKey[wordKey]
        }
        const match = this.findJobByText(element.textContent, language)
        if (match) {
          return match
        }
        element = element.parentElement
      }
      return null
    },
    findJobByText(text, language) {
      const normalizedText = this.normalizeText(text)
      if (!normalizedText) {
        return null
      }
      const field = language === 'cn' ? 'cn_str' : 'en_str'
      const normalizedField = field === 'cn_str' ? 'cn' : 'en'
      const candidates = this.searchableJobs
        .map(item => ({
          job: item.job,
          text: item[normalizedField]
        }))
        .filter(item => item.text && (normalizedText === item.text || normalizedText.includes(item.text)))
        .sort((a, b) => b.text.length - a.text.length)
      return candidates.length ? candidates[0].job : null
    },
    normalizeSourceText(value) {
      if (!value) {
        return ''
      }
      if (window.Renderer && typeof window.Renderer.stripTags === 'function') {
        try {
          return this.normalizeText(window.Renderer.stripTags(String(value)))
        } catch (error) {
          console.warn('清理渲染标签失败，使用基础文本匹配:', error)
        }
      }
      return this.normalizeText(String(value).replace(/\{@\w+\s+([^}|]+)(?:\|[^}]*)?}/g, '$1'))
    },
    normalizeText(value) {
      return String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
    },
    decorateClickableEntries() {
      this.$nextTick(() => {
        this.decorateColumn(this.$refs.englishColumn, 'en')
        this.decorateColumn(this.$refs.chineseColumn, 'cn')
      })
    },
    decorateColumn(column, language) {
      if (!column) {
        return
      }
      const nodes = column.querySelectorAll('p, li, td, th, h1, h2, h3, h4, h5, span')
      nodes.forEach(node => {
        node.classList.remove(
          'render-preview__entry--clickable',
          'render-preview__entry--active',
          'render-preview__entry--proofread',
          'render-preview__entry--pending',
          'render-preview__entry--unconfirmed'
        )
        node.removeAttribute('data-word-key')
        const match = this.findJobByText(node.textContent, language)
        if (!match) {
          return
        }
        const wordKey = match.en_str.toLowerCase()
        node.setAttribute('data-word-key', wordKey)
        node.classList.add('render-preview__entry--clickable')
        node.classList.add(this.getJobStatusClass(match))
        if (wordKey === this.currentWordKey) {
          node.classList.add('render-preview__entry--active')
        }
      })
    },
    getJobStatusClass(job) {
      if (Number(job.is_proofread) === 1) {
        return 'render-preview__entry--proofread'
      }
      if (Number(job.is_key) === 1) {
        return 'render-preview__entry--pending'
      }
      return 'render-preview__entry--unconfirmed'
    },
    handleColumnScroll(language) {
      if (this.scrollSyncSource && this.scrollSyncSource !== language) {
        return
      }
      this.scrollSyncSource = language
      if (this.scrollSyncFrame) {
        cancelAnimationFrame(this.scrollSyncFrame)
      }
      this.scrollSyncFrame = requestAnimationFrame(() => {
        const source = language === 'en' ? this.$refs.englishColumn : this.$refs.chineseColumn
        const target = language === 'en' ? this.$refs.chineseColumn : this.$refs.englishColumn
        if (source && target) {
          target.scrollTop = this.getSyncedScrollTop(source, target)
        }
        this.scrollSyncFrame = requestAnimationFrame(() => {
          this.scrollSyncSource = ''
          this.scrollSyncFrame = null
        })
      })
    },
    getSyncedScrollTop(source, target) {
      const sourceAnchors = this.getScrollAnchors(source)
      const targetAnchors = this.getScrollAnchors(target)
      const targetByKey = targetAnchors.reduce((result, anchor) => {
        result[anchor.key] = anchor.top
        return result
      }, {})
      const sharedAnchors = sourceAnchors
        .filter(anchor => Object.prototype.hasOwnProperty.call(targetByKey, anchor.key))
        .map(anchor => ({
          sourceTop: anchor.top,
          targetTop: targetByKey[anchor.key]
        }))

      if (sharedAnchors.length < 2) {
        return this.getProportionalScrollTop(source, target)
      }

      const sourceTop = source.scrollTop
      let previous = {
        sourceTop: 0,
        targetTop: 0
      }
      let next = {
        sourceTop: Math.max(source.scrollHeight - source.clientHeight, 0),
        targetTop: Math.max(target.scrollHeight - target.clientHeight, 0)
      }

      for (let index = 0; index < sharedAnchors.length; index++) {
        const anchor = sharedAnchors[index]
        if (anchor.sourceTop <= sourceTop) {
          previous = anchor
          continue
        }
        next = anchor
        break
      }

      const sourceDistance = next.sourceTop - previous.sourceTop
      if (sourceDistance <= 0) {
        return this.clampScrollTop(previous.targetTop, target)
      }
      const progress = Math.min(Math.max((sourceTop - previous.sourceTop) / sourceDistance, 0), 1)
      return this.clampScrollTop(
        previous.targetTop + ((next.targetTop - previous.targetTop) * progress),
        target
      )
    },
    getScrollAnchors(column) {
      const columnRect = column.getBoundingClientRect()
      const seenKeys = new Set()
      return Array.from(column.querySelectorAll('[data-word-key]'))
        .map(element => ({
          key: element.getAttribute('data-word-key'),
          top: element.getBoundingClientRect().top - columnRect.top + column.scrollTop
        }))
        .filter(anchor => {
          if (!anchor.key || seenKeys.has(anchor.key)) {
            return false
          }
          seenKeys.add(anchor.key)
          return true
        })
        .sort((a, b) => a.top - b.top)
    },
    getProportionalScrollTop(source, target) {
      const sourceRange = source.scrollHeight - source.clientHeight
      const targetRange = target.scrollHeight - target.clientHeight
      if (sourceRange <= 0 || targetRange <= 0) {
        return 0
      }
      return (source.scrollTop / sourceRange) * targetRange
    },
    clampScrollTop(scrollTop, column) {
      return Math.min(
        Math.max(scrollTop, 0),
        Math.max(column.scrollHeight - column.clientHeight, 0)
      )
    }
  }
}
</script>

<style scoped>
.render-preview {
  height: 100%;
  overflow: hidden;
  padding: 12px 14px 18px;
  background: #fff;
  box-sizing: border-box;
}

.render-preview__message {
  color: #64748b;
  font-size: 13px;
  line-height: 1.7;
}

.render-preview__columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
  min-width: 900px;
  height: 100%;
}

.render-preview__legend {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 9px 12px;
  border: 1px solid #e4eaf3;
  border-radius: 10px;
  background: rgba(247, 249, 252, 0.96);
  color: #506078;
  font-size: 12px;
}

.render-preview__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.render-preview__legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.render-preview__legend-dot--proofread {
  background: #67c23a;
}

.render-preview__legend-dot--pending {
  background: #e6a23c;
}

.render-preview__legend-dot--unconfirmed {
  background: #409eff;
}

.render-preview__column {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 0 12px 16px;
  border: 1px solid #e4eaf3;
  border-radius: 10px;
  background: #fff;
}

.render-preview__title {
  margin: 0 -12px 12px;
  padding: 10px 12px;
  border-bottom: 1px solid #e4eaf3;
  border-radius: 10px 10px 0 0;
  background: #f7f9fc;
  color: #334155;
  font-size: 13px;
}

.render-preview__empty {
  padding: 18px 4px;
  color: #94a3b8;
  font-size: 13px;
}

.render-preview__content {
  width: 100%;
}

.render-preview__column ::v-deep .render-preview__entry--clickable {
  cursor: pointer;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
}

.render-preview__column ::v-deep .render-preview__entry--clickable:hover {
  filter: brightness(0.96);
}

.render-preview__column ::v-deep .render-preview__entry--proofread {
  color: #529b2e;
  background: rgba(103, 194, 58, 0.1);
}

.render-preview__column ::v-deep .render-preview__entry--pending {
  color: #b88230;
  background: rgba(230, 162, 60, 0.11);
}

.render-preview__column ::v-deep .render-preview__entry--unconfirmed {
  color: #337ecc;
  background: rgba(64, 158, 255, 0.09);
}

.render-preview__column ::v-deep .render-preview__entry--active {
  border-radius: 4px;
  box-shadow: 0 0 0 2px rgba(255, 145, 0, 0.5);
}
</style>
