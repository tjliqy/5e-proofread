<template>
  <el-input
    ref="input"
    :value="value"
    type="textarea"
    :autosize="{ minRows: 1, maxRows: 4 }"
    resize="none"
    class="translation-editor"
    :disabled="disabled"
    @input="$emit('input', $event)"
    @keydown.native="handleKeydown"
  />
</template>

<script>
export default {
  name: 'InlineTranslationEditor',
  props: {
    value: {
      type: String,
      default: ''
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    handleKeydown(event) {
      if (!event || event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229) {
        return
      }
      event.preventDefault()
      this.$emit('submit')
    },
    focus() {
      this.$refs.input.focus()
    }
  }
}
</script>

<style lang="scss" scoped>
.translation-editor {
  ::v-deep .el-textarea__inner {
    min-height: 28px !important;
    padding: 4px 8px;
    line-height: 18px;
  }
}
</style>
