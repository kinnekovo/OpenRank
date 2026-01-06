// 全局变量存储数据
let dashboardData = [];    // 平台概览数据
let rankingData = [];      // 影响力排名数据
let allLanguages = [];     // 所有编程语言列表
let isExpanded = false;    // 控制表格展开/收起状态

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 1. 加载CSV数据
    loadCSVData();
    
    // 2. 绑定筛选器事件
    document.getElementById('refresh-btn').addEventListener('click', function() {
        renderRankingChart();
        renderRankingTable();
    });
    
    // 3. 绑定展开/收起按钮事件
    document.getElementById('toggle-btn').addEventListener('click', toggleTableView);
});

/**
 * 加载CSV数据
 */
function loadCSVData() {
    // 加载dashboard_summary.csv
    Papa.parse('data/dashboard_summary.csv', {
        download: true,
        header: true,
        complete: function(results) {
            dashboardData = results.data;
            renderDashboardMetrics(); // 渲染平台概览指标
        },
        error: function(error) {
            console.error('加载dashboard_summary.csv失败：', error);
            alert('数据加载失败，请检查文件路径！');
        }
    });

    // 加载influence_ranking.csv
    Papa.parse('data/influence_ranking.csv', {
        download: true,
        header: true,
        complete: function(results) {
            rankingData = results.data;
            // 处理数据类型（字符串转数字）
            rankingData = rankingData.map(item => {
                return {
                    ...item,
                    ranking: parseInt(item.ranking) || 0,
                    influence_score: parseFloat(item.influence_score) || 0,
                    stars_score: parseFloat(item.stars_score) || 0,
                    activity_score: parseFloat(item.activity_score) || 0,
                    ranking_change: parseInt(item.ranking_change) || 0
                };
            });
            
            // 获取所有语言列表
            allLanguages = [...new Set(rankingData.map(item => item.language).filter(lang => lang && lang !== 'Unknown'))];
            // 填充语言筛选器
            populateLanguageFilter();
            
            // 渲染排名图表和表格
            renderRankingChart();
            renderRankingTable();
            
            // 渲染语言分布图表
            renderLanguageChart();
        },
        error: function(error) {
            console.error('加载influence_ranking.csv失败：', error);
            alert('排名数据加载失败，请检查文件路径！');
        }
    });
}

/**
 * 渲染平台概览指标卡片
 */
function renderDashboardMetrics() {
    // 修正ID映射，直接对应HTML中metric-value元素的id
    const metricsMap = {
        'total_projects': 'total-projects',
        'total_stars': 'total-stars',
        'avg_influence_score': 'avg-influence',
        'main_language_count': 'language-count'
    };

    dashboardData.forEach(item => {
        const metricName = item.metric_name;
        const metricValue = item.metric_value;
        
        if (metricsMap[metricName]) {
            // 直接通过ID获取数值元素，无需额外查找子元素
            const element = document.getElementById(metricsMap[metricName]);
            if (element) { // 增加存在性检查，避免null错误
                element.textContent = metricValue;
            }
        }
    });
}

/**
 * 填充语言筛选器
 */
function populateLanguageFilter() {
    const filterSelect = document.getElementById('language-filter');
    
    // 清空现有选项（保留"所有语言"）
    filterSelect.innerHTML = '<option value="all">所有语言</option>';
    
    // 添加语言选项
    allLanguages.sort().forEach(language => {
        const option = document.createElement('option');
        option.value = language;
        option.textContent = language;
        filterSelect.appendChild(option);
    });
}

/**
 * 渲染语言分布环形图
 */
function renderLanguageChart() {
    // 统计各语言项目数量
    const languageCount = {};
    rankingData.forEach(item => {
        const lang = item.language || 'Unknown';
        languageCount[lang] = (languageCount[lang] || 0) + 1;
    });

    // 准备图表数据
    const chartData = Object.entries(languageCount).map(([lang, count]) => ({
        name: lang,
        value: count
    }));

    // 初始化ECharts实例
    const chart = echarts.init(document.getElementById('language-chart'));

    // 配置图表选项
    const option = {
        title: {
            text: '项目编程语言分布',
            left: 'center',
            textStyle: { fontSize: 16 }
        },
        tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
            orient: 'vertical',
            left: 'left',
            top: 'center'
        },
        series: [
            {
                name: '项目数量',
                type: 'pie',
                radius: ['40%', '70%'],
                avoidLabelOverlap: false,
                label: {
                    show: false,
                    position: 'center'
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 16,
                        fontWeight: 'bold'
                    }
                },
                labelLine: {
                    show: false
                },
                data: chartData
            }
        ],
        color: [
            '#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8',
            '#6610f2', '#fd7e14', '#e83e8c', '#20c997', '#343a40'
        ]
    };

    // 渲染图表
    chart.setOption(option);
    
    // 响应窗口大小变化
    window.addEventListener('resize', function() {
        chart.resize();
    });
}

/**
 * 渲染影响力排名Top10图表（修复纵轴标尺+标签字符问题）
 */
function renderRankingChart() {
    const chartDom = document.getElementById('ranking-chart');
    if (!chartDom) {
        console.warn('⚠️ 未找到ranking-chart DOM元素');
        return;
    }

    const filterSelect = document.getElementById('language-filter');
    const selectedLanguage = filterSelect ? filterSelect.value : 'all';
    
    // 筛选数据 + 强制转换为数字类型（核心修复：确保分数是数字）
    let filteredData = rankingData;
    if (selectedLanguage !== 'all') {
        filteredData = rankingData.filter(item => item.language === selectedLanguage);
    }
    
    // 排序并取Top10，同时确保influence_score是数字
    const top10Data = [...filteredData]
        .sort((a, b) => {
            // 强制转换为数字，避免字符串排序错误
            const scoreA = Number(a.influence_score) || 0;
            const scoreB = Number(b.influence_score) || 0;
            return scoreB - scoreA;
        })
        .slice(0, 10);

    // 准备数据（确保所有分数是数字）
    const xAxisData = top10Data.map(item => item.repo_name || '未知项目');
    const yAxisData = top10Data.map(item => {
        // 强制转换为数字，空值/非数字默认为0
        return Number(item.influence_score) || 0;
    });

    // 动态计算纵轴最大值
    const maxScore = yAxisData.length > 0 ? Math.max(...yAxisData) : 100;
    const yAxisMax = maxScore * 1.1;

    // 初始化ECharts实例
    const chart = echarts.getInstanceByDom(chartDom) || echarts.init(chartDom);

    const option = {
        title: {
            text: `影响力Top10项目（${selectedLanguage === 'all' ? '所有语言' : selectedLanguage}）`,
            left: 'center',
            textStyle: { fontSize: 16 }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: function(params) {
                const dataIndex = params[0].dataIndex;
                const item = top10Data[dataIndex];
                const influenceScore = Number(item.influence_score) || 0;
                const starsScore = Number(item.stars_score) || 0;
                const activityScore = Number(item.activity_score) || 0;
                return `
                    <div style="text-align: left;">
                        <strong>${item.repo_name || '未知项目'}</strong><br/>
                        影响力分数：${influenceScore.toFixed(2)}<br/>
                        Star评分：${starsScore.toFixed(2)}<br/>
                        活跃度评分：${activityScore.toFixed(2)}
                    </div>
                `;
            }
        },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: {
            type: 'category',
            data: xAxisData,
            axisLabel: { rotate: 45, fontSize: 12 }
        },
        yAxis: {
            type: 'value',
            name: '影响力分数',
            min: 0,
            max: yAxisMax,
            // 修复：使用普通字符串，避免转义问题
            axisLabel: {
                formatter: function(value) {
                    // 只显示整数
                    return Number.isInteger(value) ? value : '';
                }
            },
        },
        series: [
            {
                name: '影响力分数',
                type: 'bar',
                data: yAxisData,
                itemStyle: {
                    color: function(params) {
                        const colorList = [
                            '#ffd700', '#c0c0c0', '#cd7f32', 
                            '#007bff', '#28a745', '#ffc107', 
                            '#dc3545', '#17a2b8', '#6610f2', '#fd7e14'
                        ];
                        return colorList[params.dataIndex] || '#007bff';
                    }
                },
                label: {
                    show: true,
                    position: 'top',
                    // 修复：使用普通字符串，避免转义问题
                    formatter: '{c}',
                    fontSize: 11
                }
            }
        ]
    };

    // 强制更新图表配置
    chart.setOption(option, true);
    window.addEventListener('resize', () => chart.resize());
}

/**
 * 切换表格展开/收起状态
 */
function toggleTableView() {
    isExpanded = !isExpanded;
    const toggleBtn = document.getElementById('toggle-btn');
    const icon = toggleBtn.querySelector('i');
    
    if (isExpanded) {
        toggleBtn.innerHTML = '<i class="bi bi-chevron-up"></i> 收起';
    } else {
        toggleBtn.innerHTML = '<i class="bi bi-chevron-down"></i> 展开全部';
    }
    
    renderRankingTable();
}

/**
 * 渲染完整排名表格
 */
function renderRankingTable() {
    // 获取筛选条件
    const selectedLanguage = document.getElementById('language-filter').value;
    
    // 筛选数据
    let filteredData = rankingData;
    if (selectedLanguage !== 'all') {
        filteredData = rankingData.filter(item => item.language === selectedLanguage);
    }
    
    // 按影响力分数降序排序
    const sortedData = [...filteredData].sort((a, b) => b.influence_score - a.influence_score);

    // 控制显示数量
    const displayData = isExpanded ? sortedData : sortedData.slice(0, 15);

    // 获取表格tbody
    const tableBody = document.querySelector('#ranking-table tbody');
    tableBody.innerHTML = '';

    // 填充表格数据
    displayData.forEach((item, index) => {
        const tr = document.createElement('tr');
        
        // 排名变化样式类
        let rankChangeClass = 'rank-stable';
        let rankChangeText = '→';
        if (item.ranking_change > 0) {
            rankChangeClass = 'rank-up';
            rankChangeText = `↑${item.ranking_change}`;
        } else if (item.ranking_change < 0) {
            rankChangeClass = 'rank-down';
            rankChangeText = `↓${Math.abs(item.ranking_change)}`;
        }

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.repo_name}</td>
            <td>${item.language || 'Unknown'}</td>
            <td>${item.influence_score.toFixed(2)}</td>
            <td>${item.stars_score.toFixed(2)}</td>
            <td>${item.activity_score.toFixed(2)}</td>
            <td class="${rankChangeClass}">${rankChangeText}</td>
        `;
        
        tableBody.appendChild(tr);
    });
    
    // 如果有更多记录，添加"查看更多"行
    if (!isExpanded && sortedData.length > 15) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td colspan="7" style="text-align: center; padding: 10px;">
                <span>共 ${sortedData.length} 条记录，当前显示前15条</span>
            </td>
        `;
        tableBody.appendChild(tr);
    }
}