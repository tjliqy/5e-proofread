<template>
  <div class="viewport-wrapper">
    <div class="view-col-wrapper">
      <div id="wrp-jsoninput" class="view-col no-print">
        <pre id="jsoninput" class="inputArea ace_editor" />
        <div class="ve-flex-h-right">
          <!-- <select class="form-control input-sm mr-2" id="demoSelectRenderer" v-model="rendererType"
                        @change="onRendererTypeChange">
                        <option value="html">HTML</option>
                        <option value="md">Markdown</option>
                        <option value="cards">RPG Cards</option>
                    </select> -->
          <!-- <button class="ve-btn ve-btn-default ve-btn-sm mr-2" id="demoRender"
                        @click="demoRender">Render</button> -->
          <button
            id="demoRender"
            class="ve-btn ve-btn-default ve-btn-sm mr-2"
            @click="doSubmit"
          >提交</button>
          <button id="demoReset" class="ve-btn ve-btn-default ve-btn-sm" @click="demoReset">重置</button>
          <span id="message" v-html="message" />
        </div>
      </div>

      <div id="wrp-output" class="view-col">
        <table id="pagecontent" class="w-100 stats" v-html="outputHtml">
          <!-- populate with JS -->
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import { updateFile } from '@/api/files'
import { prepareRenderJson } from '@/utils/render-json'

export default {
  name: 'RenderDemo',
  data() {
    return {
      JSON_URL: 'data/renderdemo.json',
      STORAGE_LOCATION: 'demoInput',
      defaultJson: null,
      editor: null,
      renderer: null,
      rendererType: 'html',
      message: '',
      outputHtml: '',
      file_path: '',
      pendingFileContent: null
    }
  },
  watch: {
    // 监听路由参数变化
    '$route.query.file_path'(newPath) {
      if (newPath) {
        this.loadFileFromApi(newPath)
      }
    }
  },
  mounted() {
    this.initDemo()
    // 检查路由参数，如果有file_path则加载该文件
    if (this.$route.query.file_path) {
      this.loadFileFromApi(this.$route.query.file_path)
    }
  },
  methods: {
    async initDemo() {
      try {
        // 确保PrereleaseUtil和BrewUtil2已经加载完成
        await this.waitForTools()

        // 加载必要的工具和数据
        await Promise.all([
          window.PrereleaseUtil.pInit(),
          window.BrewUtil2.pInit()
        ])

        // 获取保存的渲染器类型
        const savedRendererType = await window.StorageUtil.pGetForPage('renderer')
        if (savedRendererType) {
          this.rendererType = savedRendererType
        }

        // 初始化渲染器
        this.setRenderer(this.rendererType)

        // 加载演示数据
        const data = await window.DataUtil.loadJSON(this.JSON_URL)
        this.defaultJson = data.data[0]
        delete this.defaultJson.__prop

        // 初始化编辑器
        this.editor = await window.EditorUtil.pInitEditor('jsoninput', { mode: 'ace/mode/json' })

        // 加载之前的输入或使用默认值
        try {
          // 检查是否有等待设置的文件内容
          if (this.pendingFileContent) {
            this.editor.setValue(this.pendingFileContent, -1)
            this.demoRender()
            this.message = '文件加载成功'
            this.pendingFileContent = null
          } else {
            const prevInput = await window.StorageUtil.pGetForPage(this.STORAGE_LOCATION)
            if (prevInput) {
              this.editor.setValue(prevInput, -1)
              this.demoRender()
            } else {
              this.demoReset()
            }
          }
        } catch (ignored) {
          this.demoReset()
        }

        // 添加事件监听
        this.editor.on('change', () => this.renderAndSaveDebounced())

        window.dispatchEvent(new Event('toolsLoaded'))
      } catch (error) {
        console.error('初始化演示失败:', error)
      }
    },

    // 等待工具类加载完成
    waitForTools(maxAttempts = 20, delay = 200) {
      return new Promise((resolve, reject) => {
        let attempts = 0

        const checkTools = () => {
          attempts++

          if (window.PrereleaseUtil && window.BrewUtil2) {
            resolve()
          } else if (attempts >= maxAttempts) {
            reject(new Error('PrereleaseUtil和BrewUtil2加载超时'))
          } else {
            setTimeout(checkTools, delay)
          }
        }

        checkTools()
      })
    },

    setRenderer(rendererType) {
      const out = document.getElementById('pagecontent')
      switch (rendererType) {
        case 'html': {
          this.renderer = window.Renderer.get()
          out.classList.remove('whitespace-pre', 'code')
          break
        }
        case 'md': {
          this.renderer = window.RendererMarkdown.get()
          out.classList.add('whitespace-pre', 'code')
          break
        }
        case 'cards': {
          this.renderer = window.RendererCard.get()
          out.classList.add('whitespace-pre', 'code')
          break
        }
        default: throw new Error(`未处理的渲染器类型: ${rendererType}`)
      }
    },

    demoRender() {
      this.message = ''
      const renderStack = []
      let json

      try {
        json = JSON.parse(this.editor.getValue())
      } catch (e) {
        this.message = `Json格式错误，请按照<a href="https://jsonlint.com/" target="_blank" rel="noopener noreferrer">JSONLint</a>的格式进行修正。`
        setTimeout(() => {
          throw e
        })
        return
      }

      this.renderer.setFirstSection(true)
      this.renderer.resetHeaderIndex()
      this.renderer.recursiveRender(json, renderStack)

      this.outputHtml = `
        <tr><th class="ve-tbl-border" colspan="6"></th></tr>
        <tr><td colspan="6">${renderStack.join('')}</td></tr>
        <tr><th class="ve-tbl-border" colspan="6"></th></tr>
      `
    },

    demoReset() {
      this.editor.setValue(JSON.stringify(this.defaultJson, null, '\t'))
      this.editor.clearSelection()
      this.demoRender()
      this.editor.selection.moveCursorToPosition({ row: 0, column: 0 })
    },

    // 从API加载文件
    loadFileFromApi(filePath) {
      this.file_path = filePath
      this.message = '加载文件中...'

      this.$store.dispatch('file/loadJsonFiles', { 'file_path': filePath })
        .then(file_data => {
          const data = file_data[0]
          if (data && data.cn_content) {
            // 检查cn_content是否已经是对象
            this.defaultJson = prepareRenderJson(data.cn_content)

            // 检查编辑器是否已经初始化
            if (this.editor) {
              this.editor.setValue(JSON.stringify(this.defaultJson, null, '\t'))
              this.demoRender()
              this.message = '文件加载成功'
            } else {
              // 编辑器未初始化，存储内容等初始化后再设置
              this.pendingFileContent = JSON.stringify(this.defaultJson, null, '\t')
              this.message = '文件已加载，等待编辑器准备就绪...'
            }
          } else {
            this.message = '文件内容为空或格式错误'
          }
        })
        .catch(error => {
          console.error('加载文件失败:', error)
          this.message = '加载文件失败: ' + error.message
        })
    },
    doSubmit() {
      this.renderAndSaveDebounced()

      // 弹出确认提示框
      if (!confirm('此操作将锁定数据文件，锁定后无法通过普通模式校对，请在全部内容完成校对并确认无误后继续')) {
        return // 用户取消操作
      }

      const jsonContent = JSON.parse(this.editor.getValue())
      let pureJson = null
      if (Object.prototype.hasOwnProperty.call(jsonContent, 'entries')) {
        pureJson = jsonContent.entries[0]
      } else if (Object.prototype.hasOwnProperty.call(jsonContent, 'data')) {
        pureJson = jsonContent.data
      } else {
        this.message = '保存失败，请联系管理员'
        return
      }

      updateFile(this.file_path, {
        cn_json: pureJson
      }).then(res => {
        this.message = '文件保存成功'
      }).catch(error => {
        console.error('保存文件失败:', error)
        this.message = '保存文件失败: ' + error.message
      })
    },
    renderAndSaveDebounced: window.MiscUtil.debounce(function() {
      this.demoRender()
      window.StorageUtil.pSetForPage(this.STORAGE_LOCATION, this.editor.getValue())
    }, 150)

    // onRendererTypeChange() {
    //     this.setRenderer(this.rendererType);
    //     this.demoRender();
    //     window.StorageUtil.pSetForPage("renderer", this.rendererType);
    // }
  }
}
</script>

<style scoped>
/* 这里可以添加组件特定的样式 */
.top-info {
    font-size: 12px;
    line-height: 36px;
    margin: 0 4px;
}
.view-col-wrapper {
    display: flex;
}
.viewport-wrapper {
    height: calc(100vh - 100px);
    width: calc(100vw - 80px);
}
</style>
