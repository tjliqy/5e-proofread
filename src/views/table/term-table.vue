<template>
  <div class="app-container term-page">
    <el-card class="term-card">
      <div class="term-summary">
        <div>
          <h2>术语库</h2>
          <p>集中查看翻译流程中使用的标准英文术语、中文译名与分类来源。</p>
        </div>
        <div class="term-count">
          <strong>{{ total }}</strong>
          <span>条术语</span>
        </div>
      </div>

      <div class="filter-container term-filters">
        <el-input v-model="listQuery.en" placeholder="英文术语" clearable class="filter-item" @keyup.enter.native="handleFilter" />
        <el-input v-model="listQuery.cn" placeholder="中文译名" clearable class="filter-item" @keyup.enter.native="handleFilter" />
        <el-input v-model="listQuery.category" placeholder="分类" clearable class="filter-item" @keyup.enter.native="handleFilter" />
        <el-input v-model="listQuery.source" placeholder="来源" clearable class="filter-item" @keyup.enter.native="handleFilter" />
        <el-select v-model="listQuery.to_be_discussed" placeholder="讨论状态" clearable class="filter-item" @change="handleFilter">
          <el-option label="待讨论" :value="1" />
          <el-option label="已确定" :value="0" />
        </el-select>
        <el-button class="filter-item" type="primary" icon="el-icon-search" @click="handleFilter">
          搜索
        </el-button>
        <el-button class="filter-item" icon="el-icon-refresh-left" @click="resetFilter">
          重置
        </el-button>
      </div>

      <el-table
        v-loading="listLoading"
        :data="list"
        border
        fit
        size="mini"
        stripe
        class="term-table"
      >
        <el-table-column type="index" label="#" width="70" align="center" :index="tableIndex" />
        <el-table-column prop="en" label="英文术语" min-width="240">
          <template slot-scope="{row}">
            <span class="term-en">{{ row.en }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="cn" label="中文译名" min-width="220" />
        <el-table-column prop="category" label="分类" min-width="130">
          <template slot-scope="{row}">
            <el-tag v-if="row.category" size="mini" effect="plain">{{ row.category }}</el-tag>
            <span v-else class="term-muted">未分类</span>
          </template>
        </el-table-column>
        <el-table-column prop="source" label="来源" min-width="160">
          <template slot-scope="{row}">
            <span>{{ row.source || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="note" label="备注" min-width="200">
          <template slot-scope="{row}">
            <span>{{ row.note || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="to_be_discussed" label="状态" width="100" align="center">
          <template slot-scope="{row}">
            <el-tag v-if="row.to_be_discussed" type="warning" size="mini">待讨论</el-tag>
            <el-tag v-else type="success" size="mini">已确定</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="modified_reson" label="修改说明" min-width="210">
          <template slot-scope="{row}">
            <span>{{ row.modified_reson || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="modified_at" label="修改时间" width="170" align="center">
          <template slot-scope="{row}">
            <span>{{ row.modified_at || '—' }}</span>
          </template>
        </el-table-column>
      </el-table>

      <pagination
        v-show="total > 0"
        :total="total"
        :page.sync="listQuery.page"
        :limit.sync="listQuery.limit"
        @pagination="getList"
      />
    </el-card>
  </div>
</template>

<script>
import { fetchTerms } from '@/api/terms'
import Pagination from '@/components/Pagination'

export default {
  name: 'TermTable',
  components: { Pagination },
  data() {
    return {
      list: [],
      total: 0,
      listLoading: false,
      listQuery: {
        page: 1,
        limit: 100,
        en: undefined,
        cn: undefined,
        category: undefined,
        source: undefined,
        to_be_discussed: undefined
      }
    }
  },
  created() {
    this.getList()
  },
  methods: {
    getList() {
      this.listLoading = true
      fetchTerms(this.listQuery).then(response => {
        this.list = response.data.items
        this.total = response.data.count
      }).finally(() => {
        this.listLoading = false
      })
    },
    handleFilter() {
      this.listQuery.page = 1
      for (const field of ['en', 'cn', 'category', 'source']) {
        this.listQuery[field] = this.listQuery[field] ? this.listQuery[field].trim() : undefined
      }
      this.getList()
    },
    resetFilter() {
      this.listQuery = {
        page: 1,
        limit: this.listQuery.limit,
        en: undefined,
        cn: undefined,
        category: undefined,
        source: undefined,
        to_be_discussed: undefined
      }
      this.getList()
    },
    tableIndex(index) {
      return (this.listQuery.page - 1) * this.listQuery.limit + index + 1
    }
  }
}
</script>

<style lang="scss" scoped>
.term-card {
  border: 0;
  box-shadow: 0 12px 32px rgba(27, 52, 78, 0.08);
}

.term-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
  padding-bottom: 18px;
  border-bottom: 1px solid #e8eef5;

  h2 {
    margin: 0 0 6px;
    color: #1d2d3d;
    font-size: 22px;
  }

  p {
    margin: 0;
    color: #718096;
    font-size: 13px;
  }
}

.term-count {
  display: flex;
  align-items: baseline;
  gap: 6px;
  color: #718096;
  white-space: nowrap;

  strong {
    color: #d47718;
    font-size: 28px;
    font-weight: 700;
  }
}

.term-filters {
  display: grid;
  grid-template-columns: repeat(5, minmax(140px, 1fr)) auto auto;
  gap: 10px;

  .filter-item {
    width: 100%;
    margin: 0;
  }
}

.term-table {
  margin-top: 8px;
}

.term-en {
  color: #22384d;
  font-weight: 600;
}

.term-muted {
  color: #a0aec0;
}

@media (max-width: 900px) {
  .term-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .term-summary {
    display: block;
  }

  .term-count {
    margin-top: 14px;
  }

  .term-filters {
    grid-template-columns: 1fr;
  }
}
</style>
