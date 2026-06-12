<template>
  <div v-loading="loading" class="render-preview" element-loading-text="加载预览中...">
    <div v-if="message" class="render-preview__message" v-html="message" />
    <table v-else class="render-preview__content w-100 stats" v-html="outputHtml" />
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
    }
  },
  data() {
    return {
      loading: false,
      ready: false,
      renderer: null,
      outputHtml: '',
      message: ''
    }
  },
  watch: {
    filePath: {
      immediate: true,
      handler(value) {
        if (!value) {
          this.outputHtml = ''
          this.message = '暂无可预览文件'
          return
        }
        this.prepareAndLoad(value)
      }
    }
  },
  methods: {
    async prepareAndLoad(filePath) {
      this.loading = true
      try {
        await this.ensureRendererReady()
        await this.loadPreview(filePath)
      } catch (error) {
        console.error('加载预览失败:', error)
        this.message = `加载预览失败: ${error.message || error}`
        this.outputHtml = ''
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
      if (!data || !data.cn_content) {
        this.message = '文件内容为空或格式错误'
        this.outputHtml = ''
        return
      }

      const renderJson = prepareRenderJson(data.cn_content)

      this.renderPreview(renderJson)
      this.message = ''
    },
    renderPreview(json) {
      const renderStack = []
      this.renderer.setFirstSection(true)
      this.renderer.resetHeaderIndex()
      this.renderer.recursiveRender(json, renderStack)
      this.outputHtml = `
        <tr><th class="ve-tbl-border" colspan="6"></th></tr>
        <tr><td colspan="6">${renderStack.join('')}</td></tr>
        <tr><th class="ve-tbl-border" colspan="6"></th></tr>
      `
    }
  }
}
</script>

<style scoped>
.render-preview {
  height: 100%;
  overflow: auto;
  padding: 12px 14px 18px;
  background: #fff;
}

.render-preview__message {
  color: #64748b;
  font-size: 13px;
  line-height: 1.7;
}

.render-preview__content {
  width: 100%;
}
</style>
