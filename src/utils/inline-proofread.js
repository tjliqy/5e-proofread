import { createProofread } from '@/api/proofread'

export default {
  methods: {
    prepareInlineProofreadRows(items) {
      return items.map(item => ({
        ...item,
        editCn: item.cn,
        submitting: false
      }))
    },
    isTranslationEdited(row) {
      return row.editCn !== row.cn
    },
    handleRowAction(row) {
      if (this.isTranslationEdited(row)) {
        this.submitInlineProofread(row)
      } else {
        this.toProofread(row)
      }
    },
    handleInlineSubmit(row) {
      if (!this.isTranslationEdited(row) || row.submitting) {
        return
      }
      this.submitInlineProofread(row).then(submitted => {
        if (submitted) {
          this.focusNextTranslation(row)
        }
      })
    },
    submitInlineProofread(row) {
      const cn = row.editCn.trim().replace(/\n/g, '')
      if (!cn) {
        this.$message({
          message: '翻译内容不能为空',
          type: 'warning'
        })
        return Promise.resolve(false)
      }
      if (this.countInlineOccurrences(row.en, '{@') !== this.countInlineOccurrences(cn, '{@') ||
        this.countInlineOccurrences(row.en, '}') !== this.countInlineOccurrences(cn, '}')) {
        this.$notify({
          title: '无法提交',
          message: '请核对文本中的标记符（类似 {@spell light}）',
          type: 'error',
          duration: 5000
        })
        return Promise.resolve(false)
      }

      row.submitting = true
      return createProofread({
        word_id: row.id,
        cn
      }).then(response => {
        const autoAccepted = response.data.auto_accepted === true
        if (autoAccepted) {
          row.cn = cn
          row.proofread = 1
        }
        row.editCn = row.cn
        row.is_key = 1
        this.$message({
          message: autoAccepted ? '校对已提交并自动确认' : '校对已提交',
          type: 'success'
        })
        return true
      }).catch(() => false).finally(() => {
        row.submitting = false
      })
    },
    focusNextTranslation(row) {
      const currentIndex = this.list.findIndex(item => item.id === row.id)
      const nextRow = this.list[currentIndex + 1]
      if (!nextRow) {
        return
      }
      this.$nextTick(() => {
        const editor = this.$refs[`translationEditor-${nextRow.id}`]
        if (editor && editor.focus) {
          editor.focus()
        }
      })
    },
    countInlineOccurrences(value, part) {
      return value ? value.split(part).length - 1 : 0
    }
  }
}
