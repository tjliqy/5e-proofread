<template>
  <div
    v-loading="loading"
    class="file-page"
    element-loading-text="加载文件中，请稍候..."
    element-loading-spinner="el-icon-loading"
    element-loading-background="rgba(255, 255, 255, 0.72)"
  >
    <el-container class="file-layout">
      <el-main class="file-main">
        <split-pane
          split="horizontal"
          class="file-split-pane"
          :min-percent="4"
          :default-percent="proofreadCollapsed ? 94 : 55"
        >
          <template slot="paneL" style="overflow-y:scroll;">
            <div
              ref="leftPane"
              class="bilingual-preview-pane"
              @scroll.passive="handlePaneScroll"
              @contextmenu="handleTextContextMenu"
            >
              <div ref="batchWorkspace" class="inline-batch-workspace">
                <svg v-if="batchSegments.length" class="inline-batch-lines">
                  <g
                    v-for="line in batchLinePaths"
                    :key="line.id"
                    class="inline-batch-line-group"
                    @mouseenter="batchHoveredLineId = line.id"
                    @mouseleave="batchHoveredLineId = ''"
                  >
                    <path
                      :d="line.path"
                      :class="['inline-batch-line', `inline-batch-line--${line.status}`]"
                    />
                    <path :d="line.path" class="inline-batch-line-hit" />
                    <g
                      v-if="batchHoveredLineId === line.id"
                      class="inline-batch-line-remove"
                      @mousedown.stop.prevent
                      @click.stop.prevent="unlinkBatchSegment(line.segmentId)"
                    >
                      <title>解除</title>
                      <circle :cx="line.midX" :cy="line.midY" r="9" />
                      <text :x="line.midX" :y="line.midY">×</text>
                    </g>
                  </g>
                  <path
                    v-if="batchDrag.active"
                    :d="batchDrag.path"
                    class="inline-batch-line inline-batch-line--dragging"
                  />
                </svg>
                <render-preview
                  ref="renderPreview"
                  class="inline-batch-preview"
                  :file-path="file_path"
                  :english-content="json_txt"
                  :chinese-content="cn_json_txt"
                  :jobs="jobSequence"
                  :current-word-key="activeWordKey"
                  @to-proofread="handlePreviewProofread"
                  @layout-updated="refreshBatchLines"
                  @preview-scroll="handlePreviewScroll"
                />
                <button
                  v-if="batchSegments.length"
                  type="button"
                  class="inline-batch-panel-resizer"
                  title="拖动调整导入译文栏宽度"
                  @mousedown.prevent="startBatchPanelResize"
                />
                <aside
                  v-if="batchSegments.length"
                  ref="batchPanel"
                  class="inline-batch-panel"
                  :style="{ width: `${batchPanelWidth}px` }"
                  @scroll="refreshBatchLines"
                >
                  <div class="inline-batch-panel__header">
                    <div>
                      <strong>导入译文</strong>
                      <span>{{ batchLinks.length }}/{{ batchSegments.length }}</span>
                    </div>
                    <div>
                      <el-button type="text" size="mini" @click="clearBatchImport">清空</el-button>
                      <el-button type="primary" size="mini" :loading="batchSubmitting" @click="submitBatchImport">
                        最终确认
                      </el-button>
                    </div>
                  </div>
                  <div
                    v-for="segment in batchSegments"
                    :key="segment.id"
                    :ref="`batch-segment-${segment.id}`"
                    :class="[
                      'inline-batch-segment',
                      {
                        'inline-batch-segment--unmatched': !getBatchLinkBySegment(segment.id),
                        'inline-batch-segment--active': isActiveBatchSegment(segment.id)
                      }
                    ]"
                    @click="connectBatchSegment(segment.id)"
                  >
                    <button
                      v-if="!getBatchLinkBySegment(segment.id)"
                      type="button"
                      class="inline-batch-segment__connector"
                      title="拖动连接到中文译文"
                      @mousedown.stop.prevent="startBatchLinkDrag(segment.id, $event)"
                    />
                    <el-input
                      v-model="segment.text"
                      type="textarea"
                      :autosize="{ minRows: 1, maxRows: 5 }"
                      @click.native.stop
                      @input="handleBatchSegmentInput(segment.id)"
                      @blur="finalizeBatchSegmentInput(segment.id)"
                    />
                    <div class="inline-batch-segment__meta">
                      <span v-if="getBatchLinkBySegment(segment.id)">
                        {{ getBatchLinkLabel(getBatchLinkBySegment(segment.id)) }}
                      </span>
                      <span v-else>未匹配</span>
                      <el-button
                        v-if="getBatchLinkBySegment(segment.id)"
                        type="text"
                        size="mini"
                        @click.stop="unlinkBatchSegment(segment.id)"
                      >
                        解除
                      </el-button>
                    </div>
                    <el-button-group v-if="getBatchSegmentTags(segment.id).length" class="inline-batch-tags">
                      <el-button
                        v-for="(tag, index) in getBatchSegmentTags(segment.id)"
                        :key="index"
                        size="mini"
                        type="primary"
                        @click.stop="handleCopy(tag.cn, $event)"
                      >
                        {{ tag.cn }}
                      </el-button>
                    </el-button-group>
                  </div>
                </aside>
              </div>
            </div>
          </template>
          <template slot="paneR">
            <div class="proofread-pane">
              <button
                type="button"
                class="proofread-pane__toggle"
                @click="proofreadCollapsed = !proofreadCollapsed"
              >
                <span>{{ proofreadCollapsed ? '展开校对面板' : '收起校对面板' }}</span>
                <i :class="proofreadCollapsed ? 'el-icon-arrow-up' : 'el-icon-arrow-down'" />
              </button>
              <div
                v-show="!proofreadCollapsed"
                ref="rightPane"
                class="proofread-content"
                @scroll.passive="handlePaneScroll"
              >
                <div v-if="temp.sql_id === undefined" class="proofread-empty">
                  <h3>校对窗口:请先选择要校对的文本</h3>
                </div>
                <proofread
                  v-else
                  ref="proofread"
                  :word="temp"
                  :jobs="jobSequence"
                  :current-file="file_path"
                  :has-next-unproofread="hasNextUnproofread"
                  :has-previous-unproofread="hasPreviousUnproofread"
                  :auto-next-after-proofread="autoNextAfterProofread"
                  @previous-unproofread="goToPreviousUnproofread"
                  @progress-updated="handleProgressUpdated"
                  @next-unproofread="goToNextUnproofread"
                  @word-updated="handleWordUpdated"
                />
              </div>
            </div>
          </template>
        </split-pane>
      </el-main>
    </el-container>
    <batch-proofread
      ref="batchProofread"
      :jobs="jobSequence"
      @analyzed="handleBatchAnalyzed"
    />
    <div
      v-if="textContextMenu.visible"
      class="text-context-menu"
      :style="{ left: `${textContextMenu.left}px`, top: `${textContextMenu.top}px` }"
    >
      <button type="button" class="text-context-menu__item" @click="searchSelectionInChm">
        在资料库中搜索
      </button>
    </div>
  </div>
</template>

<script>
// import JsonEditor from '@/components/JsonEditor'
import Proofread from '@/components/Proofread'
import splitPane from 'vue-splitpane'
import RenderPreview from '@/components/RenderPreview'
import BatchProofread from '@/components/BatchProofread'
import { createBatchProofread } from '@/api/proofread'
import {
  getCopyableTagPairs,
  prepareImportedTranslation,
  validateTranslationTags
} from '@/utils/batch-proofread'
import clip from '@/utils/clipboard'

export default {
  name: 'FileList',
  components: { Proofread, splitPane, RenderPreview, BatchProofread },
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
      cn_json_txt: '',
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
      source: '',
      jobSequence: [],
      batchTargets: [],
      batchSegments: [],
      batchLinks: [],
      batchLinePaths: [],
      batchPendingTargetId: '',
      batchHoveredLineId: '',
      batchDrag: {
        active: false,
        segmentId: '',
        targetId: '',
        path: ''
      },
      batchSubmitting: false,
      batchPanelWidth: 330,
      resizingBatchPanel: false,
      headerCollapsed: false,
      proofreadCollapsed: true,
      autoNextAfterProofread: true,
      textContextMenu: {
        visible: false,
        left: 0,
        top: 0,
        text: ''
      }
    }
  },
  computed: {
    activeWordKey() {
      return this.temp && this.temp.en_str ? this.temp.en_str.toLowerCase() : ''
    },
    activeBatchTargetId() {
      if (!this.temp || !this.temp.uid) return ''
      const target = this.batchTargets.find(item => item.job.uid === this.temp.uid)
      return target ? target.id : ''
    },
    hasNextUnproofread() {
      const currentIndex = this.findCurrentWordIndex()
      if (currentIndex === -1) {
        return this.findNextUnproofreadIndex(-1) !== -1
      }
      return this.findNextUnproofreadIndex(currentIndex) !== -1
    },
    hasPreviousUnproofread() {
      const currentIndex = this.findCurrentWordIndex()
      if (currentIndex === -1) {
        return false
      }
      return this.findPreviousUnproofreadIndex(currentIndex) !== -1
    }
  },
  watch: {
    // 监听路由参数变化
    '$route.query.file_path'(newPath) {
      if (newPath) {
        this.loadJsonFile(newPath)
      }
    },
    '$route.query.refreshAt'() {
      if (this.$route.query.file_path) {
        this.loadJsonFile(this.$route.query.file_path, true)
      }
    },
    jobSequence() {
      this.updateHeaderToolbarState()
    }
  },
  // 添加created钩子和watch路由参数变化的逻辑
  created() {
    this.restoreAutoNextAfterProofread()
    // 检查路由参数，如果有file_path则直接加载该文件
    if (this.$route.query.file_path) {
      this.loadJsonFile(this.$route.query.file_path)
    }
    this.updateHeaderCompact(false)
  },
  beforeDestroy() {
    document.removeEventListener('click', this.closeTextContextMenu)
    window.removeEventListener('keydown', this.handleGlobalKeydown)
    window.removeEventListener('resize', this.refreshBatchLines)
    window.removeEventListener('file-proofread-batch-import', this.openBatchProofread)
    window.removeEventListener('file-proofread-auto-next-change', this.handleAutoNextAfterProofreadChange)
    this.removeBatchDragListeners()
    this.removeBatchPanelResizeListeners()
    this.updateHeaderCompact(false)
    this.updateHeaderToolbarState(false)
  },
  mounted() {
    document.addEventListener('click', this.closeTextContextMenu)
    window.addEventListener('keydown', this.handleGlobalKeydown)
    window.addEventListener('resize', this.refreshBatchLines)
    window.addEventListener('file-proofread-batch-import', this.openBatchProofread)
    window.addEventListener('file-proofread-auto-next-change', this.handleAutoNextAfterProofreadChange)
    this.updateHeaderToolbarState()
  },
  methods: {
    restoreAutoNextAfterProofread() {
      this.autoNextAfterProofread = window.localStorage.getItem('file-proofread-auto-next') !== 'false'
    },
    handleAutoNextAfterProofreadChange(event) {
      if (!event || !event.detail) return
      this.autoNextAfterProofread = event.detail.enabled !== false
    },
    startBatchPanelResize() {
      this.resizingBatchPanel = true
      window.addEventListener('mousemove', this.handleBatchPanelResize)
      window.addEventListener('mouseup', this.stopBatchPanelResize)
      document.body.classList.add('batch-panel-resizing')
    },
    handleBatchPanelResize(event) {
      if (!this.resizingBatchPanel || !this.$refs.batchWorkspace) return
      const rect = this.$refs.batchWorkspace.getBoundingClientRect()
      const maxWidth = Math.max(280, rect.width - 560)
      this.batchPanelWidth = Math.min(
        Math.max(rect.right - event.clientX, 240),
        maxWidth
      )
      this.refreshBatchLines()
    },
    stopBatchPanelResize() {
      if (!this.resizingBatchPanel) return
      this.resizingBatchPanel = false
      this.removeBatchPanelResizeListeners()
      this.refreshBatchLines()
    },
    removeBatchPanelResizeListeners() {
      window.removeEventListener('mousemove', this.handleBatchPanelResize)
      window.removeEventListener('mouseup', this.stopBatchPanelResize)
      document.body.classList.remove('batch-panel-resizing')
    },
    openBatchProofread() {
      if (!this.jobSequence.length || !this.$refs.batchProofread) return
      this.$refs.batchProofread.open()
    },
    updateHeaderToolbarState(active = true) {
      if (typeof window === 'undefined') return
      window.dispatchEvent(new CustomEvent('file-proofread-toolbar-state', {
        detail: {
          active,
          canBatchImport: active && this.jobSequence.length > 0
        }
      }))
    },
    handleTextContextMenu(event) {
      const selection = window.getSelection ? window.getSelection().toString().trim() : ''
      if (!selection) {
        this.closeTextContextMenu()
        return
      }
      event.preventDefault()
      this.textContextMenu = {
        visible: true,
        left: event.clientX,
        top: event.clientY,
        text: selection
      }
    },
    closeTextContextMenu() {
      if (!this.textContextMenu.visible) return
      this.textContextMenu.visible = false
    },
    handleGlobalKeydown(event) {
      if (event.key === 'Escape') {
        this.closeTextContextMenu()
        this.cancelBatchLinkDrag()
      }
    },
    searchSelectionInChm() {
      if (!this.textContextMenu.text) return
      window.dispatchEvent(new CustomEvent('chm-search-request', {
        detail: {
          query: this.textContextMenu.text
        }
      }))
      this.closeTextContextMenu()
    },
    handlePaneScroll(event) {
      this.closeTextContextMenu()
      this.updateHeaderFromScroll(event && event.target ? event.target.scrollTop : 0)
    },
    handlePreviewScroll(scrollTop) {
      this.closeTextContextMenu()
      this.updateHeaderFromScroll(scrollTop)
    },
    updateHeaderFromScroll(scrollTop) {
      const normalizedScrollTop = Math.max(Number(scrollTop) || 0, 0)
      if (!this.headerCollapsed && normalizedScrollTop >= 56) {
        this.setHeaderCollapsed(true)
      } else if (this.headerCollapsed && normalizedScrollTop <= 8) {
        this.setHeaderCollapsed(false)
      }
    },
    setHeaderCollapsed(shouldCollapse) {
      if (shouldCollapse === this.headerCollapsed) {
        return
      }
      this.headerCollapsed = shouldCollapse
      this.updateHeaderCompact(shouldCollapse)
    },
    updateHeaderCompact(compact) {
      if (typeof window === 'undefined') return
      window.dispatchEvent(new CustomEvent('file-proofread-scroll', {
        detail: {
          compact
        }
      }))
    },
    handleNodeClick(data) {
      if (data.children.length > 0) {
        return
      }
      this.loadJsonFile(data.path, true)
    },
    loadJsonFile(file_path, force = true) {
      if (file_path === '') {
        this.$message.error('请选择文件')
        return
      }
      if (this.file_path && this.file_path !== file_path) {
        this.clearBatchImport()
      }
      this.headerCollapsed = false
      this.updateHeaderCompact(false)
      this.loading = true
      this.cn_json_txt = ''
      if (!force && this.files[file_path] !== undefined && this.files[file_path] !== '') {
        this.json_txt = this.files[file_path]
        this.file_path = file_path
        this.loading = false
      } else {
        this.$store.dispatch('file/loadJsonFiles', { 'file_path': file_path, force }).then(file_data => {
          console.log(file_data)
          const data = file_data[0]
          this.json_txt = data.json_content
          this.cn_json_txt = data.cn_content
          this.jobSequence = Array.isArray(data.job_list) ? data.job_list : []
          this.$store.dispatch('file/setCurrentFileProgress', {
            filePath: file_path,
            total: data.total || 0,
            translate: data.translate || 0,
            proofread: data.proofread || 0
          })
          if (this.file_path === file_path) {
            this.loading = false
          } else {
            const words_ = {}
            data.job_list.map(job => {
              // console.log(job)
              words_[job.en_str.toLowerCase()] = job
            })
            this.words = words_
            this.selectInitialUnproofread()
            this.loading = false
          }
          this.file_path = file_path
          this.loading = false
        }
        ).catch(error => {
          console.log(error)
          this.loading = false
        })
      }
    },
    handleProgressUpdated(progress) {
      if (!progress) return
      const fileProgress = progress[this.file_path] || progress
      if (typeof fileProgress.total === 'undefined') return
      this.$store.dispatch('file/setCurrentFileProgress', {
        filePath: this.file_path,
        total: fileProgress.total || 0,
        translate: fileProgress.translate || 0,
        proofread: fileProgress.proofread || 0
      })
    },
    handleBatchSubmitted(data) {
      const updatedByUid = (data.items || []).reduce((result, item) => {
        result[item.uid] = item
        return result
      }, {})
      this.jobSequence = this.jobSequence.map((job) => {
        const updated = updatedByUid[job.uid]
        return updated ? { ...job, ...updated } : job
      })
      this.handleProgressUpdated(data.progress || {})
      this.loadJsonFile(this.file_path, true)
    },
    handleBatchAnalyzed(data) {
      this.batchTargets = data.targets
      this.batchSegments = data.segments
      this.batchLinks = data.links.map(link => ({
        ...link,
        id: `${link.targetId}-${link.segmentId}`
      }))
      this.batchPendingTargetId = ''
      this.refreshBatchLines()
    },
    clearBatchImport() {
      this.batchTargets = []
      this.batchSegments = []
      this.batchLinks = []
      this.batchLinePaths = []
      this.batchPendingTargetId = ''
      this.batchHoveredLineId = ''
      this.cancelBatchLinkDrag()
    },
    handlePreviewProofread(row, wordKey) {
      this.toProofread(row, wordKey)
    },
    getBatchLinkBySegment(segmentId) {
      return this.batchLinks.find(link => link.segmentId === segmentId)
    },
    isActiveBatchSegment(segmentId) {
      const link = this.getBatchLinkBySegment(segmentId)
      return Boolean(link && link.targetId === this.activeBatchTargetId)
    },
    scrollToLinkedBatchSegment(targetId) {
      const link = this.batchLinks.find(item => item.targetId === targetId)
      if (!link) return
      this.$nextTick(() => {
        const segmentRef = this.$refs[`batch-segment-${link.segmentId}`]
        const segment = Array.isArray(segmentRef) ? segmentRef[0] : segmentRef
        if (segment && typeof segment.scrollIntoView === 'function') {
          segment.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      })
    },
    connectBatchSegment(segmentId) {
      if (!this.batchPendingTargetId) {
        const existing = this.getBatchLinkBySegment(segmentId)
        if (existing) this.batchPendingTargetId = existing.targetId
        return
      }
      this.batchLinks = this.batchLinks.filter(link => {
        return link.targetId !== this.batchPendingTargetId && link.segmentId !== segmentId
      })
      const link = this.createBatchLink(this.batchPendingTargetId, segmentId)
      const segment = this.batchSegments.find(item => item.id === segmentId)
      segment.text = link.cn
      this.batchLinks.push(link)
      this.batchPendingTargetId = ''
      this.refreshBatchLines()
    },
    createBatchLink(targetId, segmentId, score = 0, confidence = 'manual') {
      const target = this.batchTargets.find(item => item.id === targetId)
      const segment = this.batchSegments.find(item => item.id === segmentId)
      const restored = prepareImportedTranslation(target.job, segment.text, this.jobSequence)
      return {
        id: `${targetId}-${segmentId}`,
        targetId,
        segmentId,
        score,
        confidence,
        cn: restored.text,
        unresolvedTags: restored.unresolvedTags
      }
    },
    unlinkBatchSegment(segmentId) {
      this.batchLinks = this.batchLinks.filter(link => link.segmentId !== segmentId)
      this.refreshBatchLines()
    },
    startBatchLinkDrag(segmentId, event) {
      const workspace = this.$refs.batchWorkspace
      if (!workspace || this.getBatchLinkBySegment(segmentId)) return
      const connector = event.currentTarget
      const workspaceRect = workspace.getBoundingClientRect()
      const connectorRect = connector.getBoundingClientRect()
      const startX = connectorRect.left + (connectorRect.width / 2) - workspaceRect.left
      const startY = connectorRect.top + (connectorRect.height / 2) - workspaceRect.top
      this.batchDrag = {
        active: true,
        segmentId,
        targetId: '',
        startX,
        startY,
        path: `M ${startX} ${startY} L ${startX} ${startY}`
      }
      window.addEventListener('mousemove', this.handleBatchLinkDrag)
      window.addEventListener('mouseup', this.finishBatchLinkDrag)
    },
    handleBatchLinkDrag(event) {
      if (!this.batchDrag.active) return
      const workspace = this.$refs.batchWorkspace
      if (!workspace) return
      const workspaceRect = workspace.getBoundingClientRect()
      const endX = event.clientX - workspaceRect.left
      const endY = event.clientY - workspaceRect.top
      const curve = Math.max((this.batchDrag.startX - endX) * 0.45, 32)
      this.batchDrag.path = `M ${this.batchDrag.startX} ${this.batchDrag.startY} C ${this.batchDrag.startX - curve} ${this.batchDrag.startY}, ${endX + curve} ${endY}, ${endX} ${endY}`
      this.updateBatchDragTarget(event.clientX, event.clientY)
    },
    updateBatchDragTarget(clientX, clientY) {
      const preview = this.$refs.renderPreview
      const chineseColumn = preview && preview.$refs.chineseColumn
      if (!chineseColumn) return
      const hit = document.elementsFromPoint(clientX, clientY).find((element) => {
        return element &&
          element.getAttribute &&
          element.getAttribute('data-word-key') &&
          chineseColumn.contains(element)
      })
      const wordKey = hit ? hit.getAttribute('data-word-key') : ''
      const target = wordKey
        ? this.batchTargets.find(item => item.job.en_str.toLowerCase() === wordKey)
        : null
      const targetId = target ? target.id : ''
      if (targetId === this.batchDrag.targetId) return
      this.clearBatchDragTargetHighlight()
      this.batchDrag.targetId = targetId
      if (targetId) {
        this.getBatchTargetElements(targetId).forEach(element => {
          element.classList.add('render-preview__entry--drag-target')
        })
      }
    },
    finishBatchLinkDrag() {
      if (this.batchDrag.active && this.batchDrag.targetId) {
        this.batchPendingTargetId = this.batchDrag.targetId
        this.connectBatchSegment(this.batchDrag.segmentId)
      }
      this.cancelBatchLinkDrag()
    },
    cancelBatchLinkDrag() {
      this.clearBatchDragTargetHighlight()
      this.removeBatchDragListeners()
      this.batchDrag = {
        active: false,
        segmentId: '',
        targetId: '',
        path: ''
      }
    },
    removeBatchDragListeners() {
      window.removeEventListener('mousemove', this.handleBatchLinkDrag)
      window.removeEventListener('mouseup', this.finishBatchLinkDrag)
    },
    clearBatchDragTargetHighlight() {
      document.querySelectorAll('.render-preview__entry--drag-target').forEach(element => {
        element.classList.remove('render-preview__entry--drag-target')
      })
    },
    getBatchTargetElements(targetId) {
      const preview = this.$refs.renderPreview
      const chineseColumn = preview && preview.$refs.chineseColumn
      const target = this.batchTargets.find(item => item.id === targetId)
      if (!chineseColumn || !target) return []
      const wordKey = target.job.en_str.toLowerCase()
      return Array.from(chineseColumn.querySelectorAll('[data-word-key]')).filter(
        element => element.getAttribute('data-word-key') === wordKey
      )
    },
    handleBatchSegmentInput(segmentId) {
      const index = this.batchLinks.findIndex(link => link.segmentId === segmentId)
      if (index !== -1) {
        const link = this.batchLinks[index]
        this.$set(this.batchLinks, index, this.createBatchLink(
          link.targetId,
          segmentId,
          link.score,
          link.confidence
        ))
      }
      this.refreshBatchLines()
    },
    finalizeBatchSegmentInput(segmentId) {
      const link = this.getBatchLinkBySegment(segmentId)
      const segment = this.batchSegments.find(item => item.id === segmentId)
      if (link && segment) segment.text = link.cn
      this.refreshBatchLines()
    },
    getBatchSegmentTags(segmentId) {
      const link = this.getBatchLinkBySegment(segmentId)
      if (!link) return []
      const target = this.batchTargets.find(item => item.id === link.targetId)
      return getCopyableTagPairs(target.job.en_str, link.cn)
    },
    getBatchLinkLabel(link) {
      if (link.unresolvedTags.length) return 'TAG 待确认'
      if (link.confidence === 'manual') return '手动连接'
      return `${link.score}%`
    },
    handleCopy(text, event) {
      clip(text, event)
    },
    refreshBatchLines() {
      this.$nextTick(() => {
        const workspace = this.$refs.batchWorkspace
        const preview = this.$refs.renderPreview
        if (!workspace || !preview || !this.batchSegments.length) return
        const chineseColumn = preview.$refs.chineseColumn
        const workspaceRect = workspace.getBoundingClientRect()
        this.batchLinePaths = this.batchLinks.map((link) => {
          const target = this.batchTargets.find(item => item.id === link.targetId)
          const targetElement = Array.from(chineseColumn.querySelectorAll('[data-word-key]')).find(
            element => element.getAttribute('data-word-key') === target.job.en_str.toLowerCase()
          )
          const segmentRef = this.$refs[`batch-segment-${link.segmentId}`]
          const segmentElement = Array.isArray(segmentRef) ? segmentRef[0] : segmentRef
          if (!targetElement || !segmentElement) return null
          const targetRect = targetElement.getBoundingClientRect()
          const segmentRect = segmentElement.getBoundingClientRect()
          const startX = targetRect.right - workspaceRect.left
          const startY = targetRect.top + (targetRect.height / 2) - workspaceRect.top
          const endX = segmentRect.left - workspaceRect.left
          const endY = segmentRect.top + (segmentRect.height / 2) - workspaceRect.top
          const curve = Math.max((endX - startX) * 0.45, 32)
          return {
            id: link.id,
            segmentId: link.segmentId,
            status: link.targetId === this.activeBatchTargetId
              ? 'active'
              : (link.unresolvedTags.length ? 'warning' : link.confidence),
            path: `M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`,
            midX: (startX + endX) / 2,
            midY: (startY + endY) / 2
          }
        }).filter(Boolean)
      })
    },
    submitBatchImport() {
      const items = this.batchLinks.map((link) => {
        const target = this.batchTargets.find(item => item.id === link.targetId)
        return {
          word_id: target.job.sql_id,
          uid: target.job.uid,
          en_str: target.job.en_str,
          tag: target.job.tag,
          cn: link.cn.trim()
        }
      }).filter(item => item.cn)
      if (!items.length) return
      const tagErrors = items.map((item, index) => {
        const validation = validateTranslationTags(item.en_str, item.cn)
        if (validation.valid) return null
        return {
          index: index + 1,
          en: item.en_str,
          message: validation.message
        }
      }).filter(Boolean)
      if (tagErrors.length) {
        const firstError = tagErrors[0]
        const sourcePreview = firstError.en.length > 80
          ? `${firstError.en.slice(0, 80)}...`
          : firstError.en
        this.$notify({
          title: `TAG 检查失败（${tagErrors.length} 条）`,
          message: `第 ${firstError.index} 条：${firstError.message}；英文：${sourcePreview}`,
          type: 'error',
          duration: 8000
        })
        return
      }
      this.batchSubmitting = true
      createBatchProofread({ current_file: this.file_path, items }).then((response) => {
        this.$message.success(`已提交 ${response.data.items.length} 条批量校对`)
        this.handleBatchSubmitted(response.data)
        this.clearBatchImport()
      }).finally(() => {
        this.batchSubmitting = false
      })
    },
    handleWordUpdated(word) {
      if (!word || !word.en_str) return
      const { previousCnStr, ...updatedWord } = word
      const wordKey = word.en_str.toLowerCase()
      const previousWord = this.words[wordKey] || this.jobSequence.find(
        job => job.en_str && job.en_str.toLowerCase() === wordKey
      )
      const previousCn = previousCnStr || (previousWord && previousWord.cn_str)
      if (previousCn && updatedWord.cn_str && previousCn !== updatedWord.cn_str) {
        this.cn_json_txt = this.replaceChinesePreviewText(this.cn_json_txt, previousCn, updatedWord.cn_str)
      }
      this.jobSequence = this.jobSequence.map((job) => {
        if (job.en_str.toLowerCase() !== wordKey) return job
        return {
          ...job,
          ...updatedWord
        }
      })
      this.words = {
        ...this.words,
        [wordKey]: {
          ...(this.words[wordKey] || {}),
          ...updatedWord
        }
      }
      this.temp = {
        ...this.temp,
        ...updatedWord
      }
    },
    replaceChinesePreviewText(content, previousText, nextText) {
      if (!content || !previousText || previousText === nextText) {
        return content
      }
      const wasString = typeof content === 'string'
      let parsedContent = content
      if (wasString) {
        try {
          parsedContent = JSON.parse(content)
        } catch (error) {
          console.error('更新中文预览失败，中文 JSON 无法解析:', error)
          return content
        }
      }

      const replaceText = (value) => {
        if (typeof value === 'string') {
          return value.includes(previousText)
            ? value.split(previousText).join(nextText)
            : value
        }
        if (Array.isArray(value)) {
          return value.map(item => replaceText(item))
        }
        if (value && typeof value === 'object') {
          return Object.keys(value).reduce((result, key) => {
            result[key] = replaceText(value[key])
            return result
          }, {})
        }
        return value
      }

      const updatedContent = replaceText(parsedContent)
      return wasString ? JSON.stringify(updatedContent) : updatedContent
    },
    selectInitialUnproofread() {
      const nextIndex = this.findNextUnproofreadIndex(-1)
      if (nextIndex === -1) {
        return
      }
      this.selectJobAtIndex(nextIndex)
    },
    goToNextUnproofread() {
      const currentIndex = this.findCurrentWordIndex()
      const nextIndex = this.findNextUnproofreadIndex(currentIndex)
      if (nextIndex === -1) {
        this.$message.info('当前文件已没有下一个未校对文本')
        return
      }
      this.selectJobAtIndex(nextIndex)
    },
    goToPreviousUnproofread() {
      const currentIndex = this.findCurrentWordIndex()
      const previousIndex = this.findPreviousUnproofreadIndex(currentIndex)
      if (previousIndex === -1) {
        this.$message.info('当前文件已没有上一个未校对文本')
        return
      }
      this.selectJobAtIndex(previousIndex)
    },
    findCurrentWordIndex() {
      if (!this.activeWordKey) return -1
      return this.jobSequence.findIndex((job) => job.en_str && job.en_str.toLowerCase() === this.activeWordKey)
    },
    findNextUnproofreadIndex(startIndex) {
      for (let index = startIndex + 1; index < this.jobSequence.length; index++) {
        const job = this.jobSequence[index]
        if (!job || !job.en_str) continue
        if (Number(job.is_proofread) !== 1) {
          return index
        }
      }
      return -1
    },
    findPreviousUnproofreadIndex(startIndex) {
      for (let index = startIndex - 1; index >= 0; index--) {
        const job = this.jobSequence[index]
        if (!job || !job.en_str) continue
        if (Number(job.is_proofread) !== 1) {
          return index
        }
      }
      return -1
    },
    selectJobAtIndex(index) {
      const job = this.jobSequence[index]
      if (!job || !job.en_str) return
      const wordKey = job.en_str.toLowerCase()
      const word = this.words[wordKey] || job
      this.toProofread(word, wordKey)
      this.scrollToWord(wordKey)
    },
    scrollToWord(wordKey) {
      this.$nextTick(() => {
        const target = Array.from(document.querySelectorAll('[data-word-key]')).find(
          (item) => item.getAttribute('data-word-key') === wordKey
        )
        if (target && typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      })
    },
    getJsonHtml() {
      // 判断this.json_txt的类型是否为字符串
      // console.log(typeof this.json_txt)
      if (typeof this.json_txt !== 'object' && this.json_txt !== null) {
        this.$message.error('文件内容不是有效的对象')
        return
      }
      const words = this.words // 将响应式属性保存到局部变量
      const fuckLine = (in_line) => {
        if (in_line === '') {
          return ''
        }
        let res_line = []
        // 检查整个字符串值是否在words中（用于原句校对）
        const lowerValueContent = in_line.toLowerCase()
        const isWholeSentenceInWords = lowerValueContent in words

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
        // 使用for...of循环遍历字符串，避免遍历到原型链上的方法
        for (const c of in_line) {
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
            // console.log(obj.name)
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
      // console.log(this.json_html)
    },
    toProofread(row, en_in_file) {
      this.proofreadCollapsed = false
      this.$nextTick(() => {
        if (row) {
          this.temp = row
          this.en_in_file = en_in_file
        } else {
          // 原句校对逻辑，创建临时word对象
          // console.log(en_in_file)
          this.temp = { sql_id: undefined, en_str: en_in_file }
          this.en_in_file = en_in_file
        }
        if (this.en_in_file) {
          this.scrollToWord(this.en_in_file)
        }
        this.focusLinkedBatchTranslation(row)
        this.$nextTick(() => {
          this.fillLinkedBatchTranslation(row)
        })
      })
    },
    focusLinkedBatchTranslation(row) {
      if (!this.batchSegments.length || !row || !row.uid) {
        this.refreshBatchLines()
        return
      }
      const target = this.batchTargets.find(item => item.job.uid === row.uid)
      if (target) {
        this.batchPendingTargetId = target.id
        this.scrollToLinkedBatchSegment(target.id)
      }
      this.refreshBatchLines()
    },
    fillLinkedBatchTranslation(row) {
      if (!row) return
      const target = this.batchTargets.find(item => {
        if (row.uid && item.job.uid === row.uid) return true
        return row.en_str && item.job.en_str === row.en_str
      })
      if (!target) return
      const link = this.batchLinks.find(item => item.targetId === target.id)
      if (!link || !link.cn || !this.$refs.proofread) return
      this.$refs.proofread.fillProofreadText(link.cn)
      this.$message({
        message: '已自动填入该条目连接的导入译文，请确认后提交',
        type: 'info',
        duration: 2500
      })
    }
  }
}
</script>
<style>
  body.render-preview-resizing,
  body.batch-panel-resizing {
    cursor: col-resize;
    user-select: none;
  }

  .file-page {
    position: relative;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
  }

  .file-layout,
  .file-main,
  .file-split-pane {
    height: 100%;
  }

  .file-main {
    padding: 0;
  }

  .proofread-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .proofread-pane {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background: #fff;
  }

  .proofread-pane__toggle {
    display: flex;
    flex-shrink: 0;
    justify-content: center;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 36px;
    padding: 7px 12px;
    border: 0;
    border-bottom: 1px solid #dcdfe6;
    background: #f5f7fa;
    color: #409eff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .proofread-pane__toggle:hover {
    background: #ecf5ff;
  }

  .proofread-empty {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .bilingual-preview-pane {
    height: 100%;
    overflow: hidden;
  }

  .inline-batch-workspace {
    position: relative;
    display: flex;
    height: 100%;
    min-width: 0;
  }

  .inline-batch-preview {
    flex: 1;
    min-width: 0;
  }

  .inline-batch-panel-resizer {
    position: relative;
    z-index: 5;
    flex: 0 0 8px;
    width: 8px;
    height: 100%;
    padding: 0;
    border: 0;
    background: #f5f7fa;
    cursor: col-resize;
  }

  .inline-batch-panel-resizer::before {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 3px;
    width: 2px;
    background: #d8e1ec;
    content: "";
    transition: background 0.15s ease, box-shadow 0.15s ease;
  }

  .inline-batch-panel-resizer:hover::before {
    background: #409eff;
    box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.14);
  }

  .inline-batch-panel {
    position: relative;
    z-index: 3;
    flex: 0 0 auto;
    min-width: 240px;
    height: 100%;
    overflow-y: auto;
    padding: 0 8px 8px;
    border-left: 1px solid #dcdfe6;
    background: #f5f7fa;
    box-sizing: border-box;
  }

  .inline-batch-panel__header {
    position: sticky;
    top: 0;
    z-index: 4;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin: 0 -8px 6px;
    padding: 7px 9px;
    border-bottom: 1px solid #dcdfe6;
    background: #fff;
    font-size: 12px;
  }

  .inline-batch-panel__header span {
    margin-left: 6px;
    color: #909399;
  }

  .inline-batch-segment {
    position: relative;
    margin-bottom: 5px;
    padding: 6px;
    border: 1px solid #c6e2ff;
    border-radius: 5px;
    background: #fff;
    cursor: pointer;
  }

  .inline-batch-segment__connector {
    position: absolute;
    top: 50%;
    left: -7px;
    z-index: 5;
    width: 13px;
    height: 13px;
    padding: 0;
    border: 2px solid #409eff;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.14);
    cursor: crosshair;
    transform: translateY(-50%);
  }

  .inline-batch-segment__connector:hover {
    background: #409eff;
  }

  .inline-batch-segment--unmatched {
    border-color: #dcdfe6;
    background: #ebeef5;
    color: #909399;
  }

  .inline-batch-segment--active {
    border-color: #f56c6c;
    background: #fff3f3;
    box-shadow: 0 0 0 3px rgba(245, 108, 108, 0.24), 0 8px 20px rgba(245, 108, 108, 0.2);
  }

  .inline-batch-segment__meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 18px;
    color: #909399;
    font-size: 11px;
  }

  .inline-batch-tags {
    display: flex;
    flex-wrap: wrap;
    margin-top: 3px;
  }

  .inline-batch-tags .el-button {
    max-width: 290px;
    padding: 4px 6px;
    overflow: hidden;
    font-size: 10px;
    text-overflow: ellipsis;
  }

  .inline-batch-lines {
    position: absolute;
    inset: 0;
    z-index: 2;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
  }

  .inline-batch-line {
    fill: none;
    stroke: #409eff;
    stroke-width: 1.5;
  }

  .inline-batch-line-hit {
    fill: none;
    stroke: transparent;
    stroke-width: 14;
    pointer-events: stroke;
    cursor: pointer;
  }

  .inline-batch-line-remove {
    pointer-events: all;
    cursor: pointer;
  }

  .inline-batch-line-remove circle {
    fill: #f56c6c;
    stroke: #fff;
    stroke-width: 2;
  }

  .inline-batch-line-remove text {
    fill: #fff;
    font-size: 16px;
    font-weight: 700;
    text-anchor: middle;
    dominant-baseline: central;
    user-select: none;
  }

  .inline-batch-line--high {
    stroke: #67c23a;
  }

  .inline-batch-line--active {
    stroke: #f56c6c;
    stroke-width: 4;
    filter: drop-shadow(0 0 4px rgba(245, 108, 108, 0.75));
  }

  .inline-batch-line--dragging {
    stroke: #f56c6c;
    stroke-width: 2.5;
    stroke-dasharray: 6 4;
  }

  .render-preview__entry--drag-target {
    position: relative;
    z-index: 6;
    color: #b42318 !important;
    background: #ffe0e0 !important;
    box-shadow: 0 0 0 4px rgba(245, 108, 108, 0.75), 0 8px 20px rgba(245, 108, 108, 0.28) !important;
    font-weight: 700;
  }

  .inline-batch-line--warning,
  .inline-batch-line--medium,
  .inline-batch-line--low {
    stroke: #e6a23c;
    stroke-dasharray: 5 3;
  }

  .text-context-menu {
    position: fixed;
    z-index: 30;
    min-width: 168px;
    padding: 6px;
    border: 1px solid #dbe3ef;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.98);
    box-shadow: 0 14px 32px rgba(18, 28, 45, 0.14);
  }

  .text-context-menu__item {
    width: 100%;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: #314157;
    font-size: 13px;
    font-weight: 600;
    text-align: left;
    padding: 10px 12px;
    cursor: pointer;
  }

  .text-context-menu__item:hover {
    background: #eef4ff;
    color: #1749b9;
  }
</style>
