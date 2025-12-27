<template>
  <div>
    <!-- 处理数组类型的json_html -->
    <template v-if="Array.isArray(json_html)">
      <!-- 使用单个span容器确保同一行的所有内容都在视觉上保持一行 -->
      <div style="margin-bottom: 5px;">
        <span>
          <!-- 遍历所有数组项 -->
          <span v-for="(item, j) in json_html" :key="j">
            <!-- 处理单个句子片段（来自fuckLine的返回结果） -->
            <template v-if="item.word || item.html">
              <el-link
                v-if="item.word"
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
                    <TranslateLine :json_html="item.name_obj" :words="words" @to-proofread="$emit('to-proofread', $event)" />
                  </div>
                </template>
                <!-- 处理entries -->
                <div v-if="item.entries">
                  <TranslateLine :json_html="item.entries" :words="words" @to-proofread="$emit('to-proofread', $event)" />
                </div>
              </el-card>
            </template>
          </span>
        </span>
      </div>
    </template>

    <!-- 处理对象类型的json_html -->
    <template v-else-if="typeof json_html === 'object' && json_html !== null">
      <!-- 处理name_obj -->
      <span v-if="json_html.name_obj" style="margin-bottom: 5px; display: inline-block;">
        <TranslateLine :json_html="json_html.name_obj" :words="words" @to-proofread="$emit('to-proofread', $event)" />
      </span>
      <!-- 处理entries -->
      <span v-if="json_html.entries" style="display: inline-block;">
        <TranslateLine :json_html="json_html.entries" :words="words" @to-proofread="$emit('to-proofread', $event)" />
      </span>
    </template>
  </div>
</template>

<script>
export default {
  name: 'TranslateLine',
  props: {
    json_html: {
      type: [Array, Object],
      default: () => {}
    },
    words: {
      type: Object,
      default: () => {}
    }
  },
  emits: ['to-proofread'],
  watch: {
    // 监听 json_html 变化，确保不会传递函数类型
    json_html: {
      handler(newVal) {
        if (typeof newVal === 'function') {
          console.error('json_html received a function, which is not allowed:', newVal)
        }
      },
      deep: true
    }
  }
}
</script>

<style scoped>
/* 可以在这里添加一些样式来增强视觉效果 */
</style>
