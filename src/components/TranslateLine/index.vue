<template>
  <div>
    <!-- 处理数组类型的 jsonHtml -->
    <template v-if="Array.isArray(jsonHtml)">
      <!-- 使用单个span容器确保同一行的所有内容都在视觉上保持一行 -->
      <div style="margin-bottom: 5px;">
        <span>
          <!-- 遍历所有数组项 -->
          <span v-for="(item, j) in jsonHtml" :key="j">
            <!-- 处理单个句子片段（来自fuckLine的返回结果） -->
            <template v-if="item.word || item.html">
              <el-link
                v-if="item.word"
                :class="{ 'translate-link--active': item.word === currentWordKey }"
                :data-word-key="item.word"
                :type="(item.word in words) ? (words[item.word].is_proofread ? 'success' : (words[item.word].is_key ? 'warning' : 'primary')) : 'info'"
                @click="$emit('to-proofread', (item.word in words) ? words[item.word] : null, item.word)"
              >
                {{ item.html }}
              </el-link>
              <span v-else>{{ item.html }}</span>
            </template>
            <!-- 处理子层级对象（包含name_obj和entries） -->
            <template v-else>
              <el-card shadow="never" style="margin-left: 20px; border-left: 1px solid #eee; padding-left: 10px; display: inline-block; margin-top: 5px;">
                <!-- 处理name_obj -->
                <template #header>
                  <div v-if="item.name_obj" class="card-title" style="display: inline-block; margin-bottom: 5px;">
                    <TranslateLine
                      :json-html="item.name_obj"
                      :words="words"
                      :current-word-key="currentWordKey"
                      @to-proofread="relayToProofread"
                    />
                  </div>
                </template>
                <!-- 处理entries -->
                <div v-if="item.entries">
                  <TranslateLine
                    :json-html="item.entries"
                    :words="words"
                    :current-word-key="currentWordKey"
                    @to-proofread="relayToProofread"
                  />
                </div>
              </el-card>
            </template>
          </span>
        </span>
      </div>
    </template>

    <!-- 处理对象类型的 jsonHtml -->
    <template v-else-if="typeof jsonHtml === 'object' && jsonHtml !== null">
      <!-- 处理name_obj -->
      <span v-if="jsonHtml.name_obj" style="margin-bottom: 5px; display: inline-block;">
        <TranslateLine
          :json-html="jsonHtml.name_obj"
          :words="words"
          :current-word-key="currentWordKey"
          @to-proofread="relayToProofread"
        />
      </span>
      <!-- 处理entries -->
      <span v-if="jsonHtml.entries" style="display: inline-block;">
        <TranslateLine
          :json-html="jsonHtml.entries"
          :words="words"
          :current-word-key="currentWordKey"
          @to-proofread="relayToProofread"
        />
      </span>
    </template>
  </div>
</template>

<script>
export default {
  name: 'TranslateLine',
  props: {
    jsonHtml: {
      type: [Array, Object],
      default: () => {}
    },
    words: {
      type: Object,
      default: () => {}
    },
    currentWordKey: {
      type: String,
      default: ''
    }
  },
  emits: ['to-proofread'],
  watch: {
    // 监听 jsonHtml 变化，确保不会传递函数类型
    jsonHtml: {
      handler(newVal) {
        if (typeof newVal === 'function') {
          console.error('jsonHtml received a function, which is not allowed:', newVal)
        }
      },
      deep: true
    }
  },
  methods: {
    relayToProofread(row, enInFile) {
      this.$emit('to-proofread', row, enInFile)
    }
  }
}
</script>

<style scoped>
.translate-link--active {
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
  padding: 2px 6px;
  border-radius: 6px;
  box-shadow: 0 0 0 2px rgba(255, 145, 0, 0.2);
  background: rgba(255, 145, 0, 0.12);
}
</style>
