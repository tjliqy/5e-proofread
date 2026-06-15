<template>
  <el-dialog
    title="批量导入中文译文"
    :visible.sync="visible"
    width="72%"
    append-to-body
    @closed="reset"
  >
    <div class="batch-proofread-options">
      <span>
        <strong>自动关联</strong>
        <small>根据段落顺序与内容特征匹配待校对文本</small>
      </span>
      <el-switch v-model="autoAssociate" />
    </div>
    <el-input
      v-model="rawText"
      type="textarea"
      :rows="18"
      placeholder="粘贴普通文本或 Markdown。解析后，拆分结果会显示在文件校对页面右侧。"
    />
    <span slot="footer">
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :disabled="!rawText.trim()" @click="analyze">
        解析到校对页面
      </el-button>
    </span>
  </el-dialog>
</template>

<script>
import {
  buildBatchMatches,
  cleanImportedText,
  getBatchTargets
} from '@/utils/batch-proofread'

export default {
  name: 'BatchProofread',
  props: {
    jobs: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      visible: false,
      rawText: '',
      autoAssociate: true
    }
  },
  methods: {
    open() {
      this.visible = true
    },
    reset() {
      this.rawText = ''
    },
    analyze() {
      const targets = getBatchTargets(this.jobs).map((job, index) => ({
        id: `target-${index}`,
        job
      }))
      const segments = cleanImportedText(this.rawText).map((text, index) => ({
        id: `segment-${index}`,
        text
      }))
      const matches = this.autoAssociate
        ? buildBatchMatches(this.jobs, this.rawText)
        : []
      const usedSegments = new Set()
      const links = matches.map((match) => {
        const target = targets.find(item => item.job.uid === match.job.uid)
        const segment = segments.find(item => {
          return !usedSegments.has(item.id) && item.text === match.sourceText
        })
        if (!target || !segment) return null
        usedSegments.add(segment.id)
        return {
          targetId: target.id,
          segmentId: segment.id,
          score: match.score,
          confidence: match.confidence,
          cn: match.cn,
          unresolvedTags: match.unresolvedTags
        }
      }).filter(Boolean)
      links.forEach((link) => {
        const segment = segments.find(item => item.id === link.segmentId)
        segment.text = link.cn
      })
      if (!segments.length) {
        this.$message.warning('没有找到可导入的译文段落')
        return
      }
      this.$emit('analyzed', { targets, segments, links })
      this.visible = false
    }
  }
}
</script>

<style scoped>
.batch-proofread-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background: #f8f9fb;
}

.batch-proofread-options span {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.batch-proofread-options small {
  color: #909399;
  font-size: 12px;
}
</style>
