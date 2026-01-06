// 新增：设置当前日期
document.addEventListener('DOMContentLoaded', function() {
    // 设置当前日期
    const now = new Date();
    const dateStr = now.getFullYear() + '-' + 
                    String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(now.getDate()).padStart(2, '0');
    document.getElementById('current-date').textContent = dateStr;

    // 页面跳转时更新标题
    const updatePageTitle = () => {
        const hash = window.location.hash || '#overview';
        const pageName = hash === '#overview' ? '平台概览' : '影响力排名';
        document.getElementById('current-page').textContent = pageName;
        
        // 更新导航高亮
        document.querySelectorAll('.navbar-menu a').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === hash) link.classList.add('active');
        });
        
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === hash) item.classList.add('active');
        });
    };

    // 初始化页面标题
    updatePageTitle();
    // 监听hash变化
    window.addEventListener('hashchange', updatePageTitle);

    // 原有加载逻辑
    loadCSVData();
    
    // 绑定筛选器事件
    document.getElementById('refresh-btn').addEventListener('click', function() {
        renderRankingChart();
        renderRankingTable();
    });
});

// 以下保留原有所有代码（loadCSVData、renderDashboardMetrics等）

// 全局变量存储数据
let dashboardData = [];    // 平台概览数据
let rankingData = [];      // 影响力排名数据
let allLanguages = [];     // 所有编程语言列表

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 1. 加载CSV数据
    loadCSVData();
    
    // 2. 绑定筛选器事件
    document.getElementById('refresh-btn').addEventListener('click', function() {
        renderRankingChart();
        renderRankingTable();
    });
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
    // 查找对应指标并渲染
    const metricsMap = {
        'total_projects': 'card-total-projects',
        'total_stars': 'card-total-stars',
        'avg_influence_score': 'card-avg-influence',
        'main_language_count': 'card-language-count'
    };

    dashboardData.forEach(item => {
        const metricName = item.metric_name;
        const metricValue = item.metric_value;
        
        if (metricsMap[metricName]) {
            document.querySelector(`#${metricsMap[metricName]} .metric-value`).textContent = metricValue;
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
 * 渲染影响力排名Top10图表
 */
function renderRankingChart() {
    // 获取筛选条件
    const selectedLanguage = document.getElementById('language-filter').value;
    
    // 筛选数据
    let filteredData = rankingData;
    if (selectedLanguage !== 'all') {
        filteredData = rankingData.filter(item => item.language === selectedLanguage);
    }
    
    // 按影响力分数降序排序，取Top10
    const top10Data = [...filteredData]
        .sort((a, b) => b.influence_score - a.influence_score)
        .slice(0, 10);

    // 准备图表数据
    const xAxisData = top10Data.map(item => item.repo_name);
    const yAxisData = top10Data.map(item => item.influence_score);

    // 初始化ECharts实例
    const chart = echarts.init(document.getElementById('ranking-chart'));

    // 配置图表选项
    const option = {
        title: {
            text: `影响力Top10项目（${selectedLanguage === 'all' ? '所有语言' : selectedLanguage}）`,
            left: 'center',
            textStyle: { fontSize: 16 }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: function(params) {
                const data = params[0].data;
                const item = top10Data.find(item => item.influence_score === data);
                return `
                    <div style="text-align: left;">
                        <strong>${item.repo_name}</strong><br/>
                        影响力分数：${item.influence_score.toFixed(2)}<br/>
                        Star评分：${item.stars_score.toFixed(2)}<br/>
                        活跃度评分：${item.activity_score.toFixed(2)}
                    </div>
                `;
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: xAxisData,
            axisLabel: {
                rotate: 45,
                fontSize: 12
            }
        },
        yAxis: {
            type: 'value',
            name: '影响力分数',
            min: 0,
            max: 10
        },
        series: [
            {
                name: '影响力分数',
                type: 'bar',
                data: yAxisData,
                itemStyle: {
                    color: function(params) {
                        // 不同排名用不同颜色
                        const colorList = [
                            '#ffd700', '#c0c0c0', '#cd7f32', // 金银铜
                            '#007bff', '#28a745', '#ffc107', 
                            '#dc3545', '#17a2b8', '#6610f2', '#fd7e14'
                        ];
                        return colorList[params.dataIndex] || '#007bff';
                    }
                },
                label: {
                    show: true,
                    position: 'top',
                    formatter: '{c:.2f}'
                }
            }
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

    // 获取表格tbody
    const tableBody = document.querySelector('#ranking-table tbody');
    tableBody.innerHTML = '';

    // 填充表格数据
    sortedData.forEach((item, index) => {
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
}