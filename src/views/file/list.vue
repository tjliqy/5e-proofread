<template>
  <el-container>
    <el-aside>
      <el-tree :data="getFilesMenu" :props="defaultProps" @node-click="handleNodeClick" />
    </el-aside>
    <!-- <json-editor ref="jsonEditor" v-model="json_txt" /> -->
    <el-main>
      <div style="white-space: pre-wrap;">{{ JSON.stringify(json_txt, null, 2) }}</div>
    </el-main>
  </el-container>
</template>

<script>
// import JsonEditor from '@/components/JsonEditor'

export default {
  name: 'FileList',
  //   components: { JsonEditor },
  data() {
    return {
      files: [],
      defaultProps: {
        children: 'children',
        label: 'label'
      },
      json_txt: ''
    }
  },
  computed: {
    getFilesMenu() {
      const files = []
      const tmp_dirs = []
      for (const f in this.files) {
        if (f.includes('/')) {
          const dir = f.split('/')[0]
          if (tmp_dirs.indexOf(dir) > -1) {
            for (const i in files) {
              if (files[i].label === dir) {
                files[i].children.push({ label: f.split('/')[1], children: [], path: f })
                break
              }
            }
          } else {
            tmp_dirs.push(dir)
            files.push({ label: dir, children: [{ label: f.split('/')[1], children: [], path: f }] })
          }
        } else {
          files.push({ label: f, children: [], path: f })
        }
      }
      return files
    }
  },
  mounted() {
    this.$store.dispatch('file/loadJsonFiles').then(files => {
      this.files = files
    }
    ).catch(error => {
      console.log(error)
    })
  },
  methods: {
    handleNodeClick(data) {
      if (this.files[data.path] !== undefined && this.files[data.path] !== '') {
        this.json_txt = this.files[data.path]
      } else {
        console.log(data)
        this.$store.dispatch('file/loadJsonFile', data.path).then(data => {
          this.json_txt = data
        }
        ).catch(error => {
          console.log(error)
        })
      }
    }
  }
}
</script>
