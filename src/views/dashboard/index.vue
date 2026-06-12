<template>
  <div v-loading="loading" class="dashboard-page" element-loading-text="正在加载看板数据...">
    <section class="metrics-grid">
      <article class="metric-card primary">
        <span class="metric-label">全站翻译率</span>
        <strong class="metric-value">{{ overview.translate_rate || 0 }}%</strong>
        <span class="metric-meta">{{ overview.translate || 0 }} / {{ overview.total || 0 }}</span>
      </article>
      <article class="metric-card accent">
        <span class="metric-label">全站校对率</span>
        <strong class="metric-value">{{ overview.proofread_rate || 0 }}%</strong>
        <span class="metric-meta">{{ overview.proofread || 0 }} / {{ overview.total || 0 }}</span>
      </article>
      <article class="metric-card neutral">
        <span class="metric-label">文件总数</span>
        <strong class="metric-value">{{ overview.file_count || 0 }}</strong>
        <span class="metric-meta">已纳入进度统计的拆分文件</span>
      </article>
      <article class="metric-card neutral">
        <span class="metric-label">词条总数</span>
        <strong class="metric-value">{{ overview.word_count || 0 }}</strong>
        <span class="metric-meta">数据库中的全部词条</span>
      </article>
      <article class="metric-card neutral">
        <span class="metric-label">锁定文件数</span>
        <strong class="metric-value">{{ overview.locked_files || 0 }}</strong>
        <span class="metric-meta">当前不可直接查看的文件</span>
      </article>
    </section>

    <section class="charts-grid">
      <article class="panel-card">
        <div class="panel-header">
          <div>
            <p class="panel-kicker">状态结构</p>
            <h3 class="panel-title">翻译状态分布</h3>
          </div>
        </div>
        <div ref="statusChart" class="chart-surface" />
      </article>
      <article class="panel-card">
        <div class="panel-header">
          <div>
            <p class="panel-kicker">最近 7 天</p>
            <h3 class="panel-title">校对与采纳趋势</h3>
          </div>
        </div>
        <div ref="trendChart" class="chart-surface" />
      </article>
    </section>

    <section class="tables-grid">
      <article class="panel-card">
        <div class="panel-header">
          <div>
            <p class="panel-kicker">贡献榜</p>
            <h3 class="panel-title">用户校对总榜</h3>
          </div>
        </div>
        <el-table :data="userRankTotal" size="mini" stripe>
          <el-table-column prop="rank" label="#" width="50" />
          <el-table-column prop="username" label="用户" min-width="120" />
          <el-table-column prop="proofread_count" label="提交" width="90" />
          <el-table-column prop="accepted_count" label="采纳" width="90" />
          <el-table-column prop="acceptance_rate" label="采纳率" width="100">
            <template slot-scope="{ row }">
              {{ row.acceptance_rate }}%
            </template>
          </el-table-column>
        </el-table>
      </article>
      <article class="panel-card">
        <div class="panel-header">
          <div>
            <p class="panel-kicker">近 7 天</p>
            <h3 class="panel-title">用户校对 7 日榜</h3>
          </div>
        </div>
        <el-table :data="userRank7d" size="mini" stripe>
          <el-table-column prop="rank" label="#" width="50" />
          <el-table-column prop="username" label="用户" min-width="120" />
          <el-table-column prop="proofread_count" label="提交" width="90" />
          <el-table-column prop="accepted_count" label="采纳" width="90" />
          <el-table-column prop="acceptance_rate" label="采纳率" width="100">
            <template slot-scope="{ row }">
              {{ row.acceptance_rate }}%
            </template>
          </el-table-column>
        </el-table>
      </article>
    </section>
  </div>
</template>

<script>
import echarts from 'echarts'
import { fetchDashboardSummary } from '@/api/dashboard'

export default {
  name: 'DashboardHome',
  data() {
    return {
      loading: false,
      overview: {},
      statusDistribution: [],
      proofreadTrend7d: {
        labels: [],
        proofread: [],
        accepted: []
      },
      userRankTotal: [],
      userRank7d: [],
      statusChart: null,
      trendChart: null
    }
  },
  computed: {
    isDarkMode() {
      return this.$store.state.settings.darkMode
    }
  },
  watch: {
    isDarkMode() {
      this.$nextTick(() => {
        this.renderStatusChart()
        this.renderTrendChart()
      })
    }
  },
  mounted() {
    this.loadDashboard()
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize)
    if (this.statusChart) {
      this.statusChart.dispose()
      this.statusChart = null
    }
    if (this.trendChart) {
      this.trendChart.dispose()
      this.trendChart = null
    }
  },
  methods: {
    loadDashboard() {
      this.loading = true
      fetchDashboardSummary().then((response) => {
        const data = response.data || {}
        this.overview = data.overview || {}
        this.statusDistribution = data.status_distribution || []
        this.proofreadTrend7d = data.proofread_trend_7d || { labels: [], proofread: [], accepted: [] }
        this.userRankTotal = data.user_rank_total || []
        this.userRank7d = data.user_rank_7d || []
        this.$nextTick(() => {
          this.renderStatusChart()
          this.renderTrendChart()
        })
      }).finally(() => {
        this.loading = false
      })
    },
    renderStatusChart() {
      if (!this.$refs.statusChart) return
      if (!this.statusChart) {
        this.statusChart = echarts.init(this.$refs.statusChart)
      }
      const textColor = this.isDarkMode ? '#dce7f8' : '#52627a'
      const borderColor = this.isDarkMode ? '#18202c' : '#fff'
      this.statusChart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c} ({d}%)'
        },
        legend: {
          bottom: 0,
          itemWidth: 12,
          itemHeight: 12,
          textStyle: {
            color: textColor
          }
        },
        series: [{
          type: 'pie',
          radius: ['48%', '72%'],
          center: ['50%', '42%'],
          avoidLabelOverlap: false,
          label: {
            formatter: '{b}\n{d}%',
            color: textColor
          },
          labelLine: {
            length: 14,
            length2: 10
          },
          itemStyle: {
            borderColor,
            borderWidth: 4
          },
          color: this.isDarkMode ? ['#2f3d55', '#4f86ff', '#7fb1ff'] : ['#d8dee9', '#7ea6ff', '#2f6fed'],
          data: this.statusDistribution
        }]
      })
    },
    renderTrendChart() {
      if (!this.$refs.trendChart) return
      if (!this.trendChart) {
        this.trendChart = echarts.init(this.$refs.trendChart)
      }
      const axisColor = this.isDarkMode ? '#7284a1' : '#d3dce8'
      const splitColor = this.isDarkMode ? 'rgba(100, 118, 146, 0.22)' : '#edf2f7'
      const textColor = this.isDarkMode ? '#dce7f8' : '#52627a'
      this.trendChart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis'
        },
        legend: {
          top: 0,
          right: 0,
          data: ['校对提交', '采纳数'],
          textStyle: {
            color: textColor
          }
        },
        grid: {
          left: 24,
          right: 16,
          top: 48,
          bottom: 28,
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: this.proofreadTrend7d.labels,
          axisLabel: {
            color: textColor
          },
          axisLine: {
            lineStyle: {
              color: axisColor
            }
          }
        },
        yAxis: {
          type: 'value',
          minInterval: 1,
          axisLabel: {
            color: textColor
          },
          axisLine: {
            show: false
          },
          splitLine: {
            lineStyle: {
              color: splitColor
            }
          }
        },
        color: this.isDarkMode ? ['#7ea6ff', '#45c892'] : ['#2f6fed', '#18a36b'],
        series: [
          {
            name: '校对提交',
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 8,
            data: this.proofreadTrend7d.proofread
          },
          {
            name: '采纳数',
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 8,
            data: this.proofreadTrend7d.accepted
          }
        ]
      })
    },
    handleResize() {
      if (this.statusChart) this.statusChart.resize()
      if (this.trendChart) this.trendChart.resize()
    }
  }
}
</script>

<style lang="scss" scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  color: #1f2a37;
}

.hero-panel,
.panel-card,
.metric-card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(216, 224, 236, 0.95);
  box-shadow: 0 20px 50px rgba(30, 41, 59, 0.08);
}

.hero-panel {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 26px;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(243, 248, 255, 0.95) 100%);
}

.hero-kicker,
.panel-kicker {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7c8aa5;
}

.hero-title {
  margin: 0;
  font-size: 30px;
  line-height: 1.1;
  color: #1f2a37;
}

.hero-description {
  max-width: 620px;
  margin: 12px 0 0;
  color: #69778c;
  font-size: 14px;
  line-height: 1.7;
}

.hero-stats {
  display: flex;
  gap: 12px;
  align-self: flex-start;
}

.hero-stat {
  min-width: 120px;
  padding: 16px 18px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid #e1e8f3;
}

.hero-stat-label,
.metric-label,
.metric-meta {
  display: block;
}

.hero-stat-label,
.metric-label {
  color: #7b8798;
  font-size: 12px;
}

.hero-stat-value {
  display: block;
  margin-top: 8px;
  color: #1e293b;
  font-size: 26px;
  font-weight: 700;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}

.metric-card {
  border-radius: 20px;
  padding: 18px;
}

.metric-card.primary {
  background: linear-gradient(135deg, #2f6fed 0%, #4c84f4 100%);
  color: #fff;
}

.metric-card.primary .metric-label,
.metric-card.primary .metric-meta,
.metric-card.accent .metric-label,
.metric-card.accent .metric-meta {
  color: rgba(255, 255, 255, 0.82);
}

.metric-card.accent {
  background: linear-gradient(135deg, #18a36b 0%, #35b986 100%);
  color: #fff;
}

.metric-card.neutral {
  background: #fff;
}

.metric-value {
  display: block;
  margin: 14px 0 10px;
  color: inherit;
  font-size: 30px;
  line-height: 1;
}

.metric-meta {
  font-size: 12px;
  color: #7b8798;
}

.charts-grid,
.tables-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.panel-card {
  border-radius: 24px;
  padding: 20px 20px 16px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.panel-title {
  margin: 0;
  color: #1f2a37;
  font-size: 20px;
  font-weight: 700;
}

.chart-surface {
  width: 100%;
  height: 320px;
}

::v-deep .el-table {
  border-radius: 14px;
  overflow: hidden;
}

body.dark-mode .dashboard-page {
  color: #e3ecf8;

  .hero-panel,
  .panel-card,
  .metric-card.neutral {
    background: rgba(19, 26, 37, 0.94);
    border-color: rgba(69, 83, 108, 0.82);
    box-shadow: 0 18px 46px rgba(0, 0, 0, 0.28);
  }

  .hero-panel {
    background: linear-gradient(135deg, rgba(19, 26, 37, 0.98) 0%, rgba(25, 35, 51, 0.96) 100%);
  }

  .hero-kicker,
  .panel-kicker,
  .hero-stat-label,
  .metric-label,
  .metric-meta {
    color: #8fa3c1;
  }

  .hero-title,
  .hero-stat-value,
  .panel-title,
  .metric-card.neutral .metric-value {
    color: #eef4ff;
  }

  .hero-description {
    color: #aebed8;
  }

  .hero-stat {
    background: rgba(14, 21, 31, 0.92);
    border-color: rgba(83, 101, 129, 0.8);
  }

  ::v-deep .el-table {
    background: transparent;
    color: #dce7f8;
  }

  ::v-deep .el-table th {
    background: rgba(25, 35, 51, 0.96) !important;
    border-color: rgba(69, 83, 108, 0.82) !important;
    color: #dce7f8 !important;
  }

  ::v-deep .el-table td {
    background: rgba(19, 26, 37, 0.92) !important;
    border-color: rgba(59, 72, 93, 0.82) !important;
    color: #dce7f8 !important;
  }

  ::v-deep .el-table__row:hover > td {
    background: rgba(28, 39, 57, 0.98) !important;
  }
}

@media (max-width: 1200px) {
  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .hero-panel,
  .charts-grid,
  .tables-grid {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .hero-stats {
    width: 100%;
    justify-content: space-between;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
