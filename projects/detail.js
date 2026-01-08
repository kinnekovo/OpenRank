// 全局变量
let currentProject = null;
let chartInstances = {}; // 存储所有图表实例，便于resize

// 页面加载初始化
document.addEventListener('DOMContentLoaded', function() {
    // 解析URL参数获取项目名
    const urlParams = new URLSearchParams(window.location.search);
    const repoName = urlParams.get('repo');
    if (!repoName) {
        alert('无效的项目参数，将返回列表页');
        window.location.href = 'list.html';
        return;
    }
    const decodedRepoName = decodeURIComponent(repoName);
    
    // 加载项目数据
    loadProjectData(decodedRepoName);
    
    // 绑定分析层标签切换事件
    bindTabEvents();
    
    // 绑定侧边栏导航事件
    bindSidebarNavigation();
    
    // 窗口resize适配图表
    window.addEventListener('resize', resizeAllCharts);
});

/**
 * 加载并解析项目数据
 */
function loadProjectData(targetRepo) {
    Papa.parse('../data/projects_complete.csv', {
        download: true,
        header: true,
        complete: function(results) {
            // 筛选目标项目
            currentProject = results.data.find(item => item.repo_name === targetRepo);
            if (!currentProject) {
                alert(`未找到项目【${targetRepo}】的数据源`);
                window.location.href = 'list.html';
                return;
            }

            // 1. 渲染顶部项目名称和语言
            renderProjectHeader();
            // 2. 渲染基础信息方块
            renderBasicInfoGrid();
            // 3. 初始化所有图表
            initAllCharts();
            // 4. 渲染完整数据表格
            renderDetailTable();
        },
        error: function() {
            alert('数据源加载失败，请检查文件路径！');
        }
    });
}

/**
 * 1. 渲染顶部项目名称和语言标签 + 面包屑项目名
 */
function renderProjectHeader() {
    document.getElementById('project-name').textContent = currentProject.repo_name;
    document.getElementById('project-lang').textContent = currentProject.language || '未知语言';
    // 补充：更新面包屑中的项目详情名称
    document.getElementById('current-project').textContent = currentProject.repo_name;
}

/**
 * 2. 渲染基础信息方块（2行5列，共10个核心指标）
 */
function renderBasicInfoGrid() {
    const container = document.getElementById('basic-info-container');
    // 定义10个基础指标（匹配手绘的方块区域）
    const basicMetrics = [
        { label: '最新星标数', key: 'latest_stars', format: 'number' },
        { label: '最新活跃度', key: 'latest_activity', format: 'float' },
        { label: 'OpenRank得分', key: 'latest_openrank', format: 'float' },
        { label: '关注度得分', key: 'latest_attention', format: 'float' },
        { label: '总线因子', key: 'latest_bus_factor', format: 'float' },
        { label: '影响力得分', key: 'influence_score', format: 'float' },
        { label: '代码变动率', key: 'code_churn_ratio', format: 'percent' },
        { label: '平均Issue时长', key: 'avg_issue_age', format: 'number' },
        { label: '最新参与者', key: 'latest_participants', format: 'number' },
        { label: '星标总计', key: 'stars_total', format: 'number' }
    ];

    // 生成10个方块
    container.innerHTML = '';
    basicMetrics.forEach(metric => {
        const value = currentProject[metric.key] || 0;
        // 格式化数值
        let formattedValue = '';
        switch(metric.format) {
            case 'number':
                formattedValue = Number(value).toLocaleString();
                break;
            case 'float':
                formattedValue = Number(value).toFixed(2);
                break;
            case 'percent':
                formattedValue = (Number(value) * 100).toFixed(2) + '%';
                break;
            default:
                formattedValue = value;
        }

        const card = document.createElement('div');
        card.className = 'basic-info-card';
        card.innerHTML = `
            <div class="label">${metric.label}</div>
            <div class="value">${formattedValue}</div>
        `;
        container.appendChild(card);
    });
}

/**
 * 3. 初始化所有图表（匹配手绘的可视化区域）
 */
function initAllCharts() {
    // 3.1 右侧核心指标雷达图
    initRadarChart();
    // 3.2 核心指标全景层图表
    initCoreCharts();
    // 3.3 时间趋势分析层图表
    initTrendCharts();
    // 3.4 构成拆解分析层图表
    initCompositionCharts();
    // 3.5 行业对比分析层图表
    initCompareCharts();
}

/**
 * 3.1 初始化右侧雷达图
 */
function initRadarChart() {
    const radarDom = document.getElementById('radar-chart');
    chartInstances.radar = echarts.init(radarDom);
    
    const option = {
        tooltip: { trigger: 'item' },
        radar: {
            indicator: [
                { name: '星标数', max: Math.max(500, Number(currentProject.latest_stars) || 100) },
                { name: '活跃度', max: Math.max(1000, Number(currentProject.latest_activity) || 100) },
                { name: 'OpenRank', max: Math.max(500, Number(currentProject.latest_openrank) || 50) },
                { name: '关注度', max: Math.max(200, Number(currentProject.latest_attention) || 20) },
                { name: '总线因子', max: Math.max(100, Number(currentProject.latest_bus_factor) || 10) }
            ]
        },
        series: [{
            type: 'radar',
            data: [{
                value: [
                    Number(currentProject.latest_stars) || 0,
                    Number(currentProject.latest_activity) || 0,
                    Number(currentProject.latest_openrank) || 0,
                    Number(currentProject.latest_attention) || 0,
                    Number(currentProject.latest_bus_factor) || 0
                ],
                areaStyle: { color: 'rgba(22, 93, 255, 0.2)' },
                itemStyle: { color: '#165DFF' }
            }]
        }]
    };
    chartInstances.radar.setOption(option);
}

/**
 * 3.2 核心指标全景层图表
 */
function initCoreCharts() {
    // 3.2.1 核心指标vs行业均值（横向柱状图）
    const coreCompareDom = document.getElementById('core-compare-chart');
    chartInstances.coreCompare = echarts.init(coreCompareDom);
    // 模拟行业均值（项目值的80%）
    const industryAvg = {
        stars: (Number(currentProject.latest_stars) || 0) * 0.8,
        activity: (Number(currentProject.latest_activity) || 0) * 0.8,
        openrank: (Number(currentProject.latest_openrank) || 0) * 0.8
    };
    chartInstances.coreCompare.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'value' },
        yAxis: { type: 'category', data: ['星标数', '活跃度', 'OpenRank'] },
        series: [
            { name: '当前项目', type: 'bar', data: [
                Number(currentProject.latest_stars) || 0,
                Number(currentProject.latest_activity) || 0,
                Number(currentProject.latest_openrank) || 0
            ], itemStyle: { color: '#165DFF' }},
            { name: '行业均值', type: 'bar', data: [
                industryAvg.stars,
                industryAvg.activity,
                industryAvg.openrank
            ], itemStyle: { color: '#999' }}
        ]
    });

    // 3.2.2 指标得分分布（饼图）
    const coreDistributionDom = document.getElementById('core-distribution-chart');
    chartInstances.coreDistribution = echarts.init(coreDistributionDom);
    chartInstances.coreDistribution.setOption({
        tooltip: { trigger: 'item' },
        series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            data: [
                { name: '星标数', value: Number(currentProject.latest_stars) || 0 },
                { name: '活跃度', value: Number(currentProject.latest_activity) || 0 },
                { name: 'OpenRank', value: Number(currentProject.latest_openrank) || 0 },
                { name: '关注度', value: Number(currentProject.latest_attention) || 0 }
            ]
        }]
    });
}

/**
 * 3.3 时间趋势分析层图表
 */
function initTrendCharts() {
    // 模拟近12个月时间轴
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    
    // 3.3.1 星标数趋势（折线图）
    const starsTrendDom = document.getElementById('stars-trend-chart');
    chartInstances.starsTrend = echarts.init(starsTrendDom);
    // 模拟增长趋势
    const starsData = Array(12).fill(0).map((_, i) => {
        const base = Number(currentProject.stars_total) || 1000;
        return base * (0.7 + i * 0.03);
    });
    chartInstances.starsTrend.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: months },
        yAxis: { type: 'value' },
        series: [{
            type: 'line',
            smooth: true,
            data: starsData,
            itemStyle: { color: '#FF7D00' },
            areaStyle: { color: 'rgba(255, 125, 0, 0.1)' }
        }]
    });

    // 3.3.2 活跃度趋势（柱状图）
    const activityTrendDom = document.getElementById('activity-trend-chart');
    chartInstances.activityTrend = echarts.init(activityTrendDom);
    const activityData = Array(12).fill(0).map((_, i) => {
        const base = Number(currentProject.activity_total) || 100;
        return base * (0.75 + i * 0.025);
    });
    chartInstances.activityTrend.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: months },
        yAxis: { type: 'value' },
        series: [{
            type: 'bar',
            data: activityData,
            itemStyle: { color: '#F53F3F' }
        }]
    });

    // 3.3.3 贡献者增长趋势（堆叠面积图）
    const contributorsTrendDom = document.getElementById('contributors-trend-chart');
    chartInstances.contributorsTrend = echarts.init(contributorsTrendDom);
    chartInstances.contributorsTrend.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: months },
        yAxis: { type: 'value' },
        series: [
            { name: '核心贡献者', type: 'line', stack: 'total', smooth: true, data: [5,6,7,8,9,10,11,12,13,14,15,16] },
            { name: '普通贡献者', type: 'line', stack: 'total', smooth: true, data: [20,25,30,35,40,45,50,55,60,65,70,75] }
        ]
    });

    // 3.3.4 Issue处理趋势（双折线图）
    const issueTrendDom = document.getElementById('issue-trend-chart');
    chartInstances.issueTrend = echarts.init(issueTrendDom);
    chartInstances.issueTrend.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: months },
        yAxis: { type: 'value' },
        series: [
            { name: '新增Issue', type: 'line', data: [10,15,12,18,20,16,19,22,17,21,18,23], itemStyle: { color: '#F53F3F' } },
            { name: '已关闭Issue', type: 'line', data: [8,12,10,15,18,14,16,20,15,19,16,21], itemStyle: { color: '#00B42A' } }
        ]
    });
}

/**
 * 3.4 构成拆解分析层图表
 */
function initCompositionCharts() {
    // 3.4.1 影响力得分构成（环形饼图）
    const influencePieDom = document.getElementById('influence-pie-chart');
    chartInstances.influencePie = echarts.init(influencePieDom);
    chartInstances.influencePie.setOption({
        tooltip: { trigger: 'item' },
        series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            data: [
                { name: '星标贡献', value: Number(currentProject.latest_stars) || 0 },
                { name: '活跃度贡献', value: Number(currentProject.latest_activity) || 0 },
                { name: 'OpenRank贡献', value: Number(currentProject.latest_openrank) || 0 },
                { name: '关注度贡献', value: Number(currentProject.latest_attention) || 0 }
            ]
        }]
    });

    // 3.4.2 代码提交构成（环形图）
    const commitCompositionDom = document.getElementById('commit-composition-chart');
    chartInstances.commitComposition = echarts.init(commitCompositionDom);
    chartInstances.commitComposition.setOption({
        tooltip: { trigger: 'item' },
        series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            data: [
                { name: '核心贡献者', value: 60 },
                { name: '普通贡献者', value: 30 },
                { name: '首次贡献者', value: 10 }
            ]
        }]
    });

    // 3.4.3 Issue类型分布（漏斗图）
    const issueTypeDom = document.getElementById('issue-type-chart');
    chartInstances.issueType = echarts.init(issueTypeDom);
    chartInstances.issueType.setOption({
        tooltip: { trigger: 'item' },
        series: [{
            type: 'funnel',
            data: [
                { name: 'Bug', value: 40 },
                { name: 'Feature', value: 30 },
                { name: 'Document', value: 20 },
                { name: 'Other', value: 10 }
            ]
        }]
    });

    // 3.4.4 编程语言占比（条形图）
    const langRatioDom = document.getElementById('lang-ratio-chart');
    chartInstances.langRatio = echarts.init(langRatioDom);
    chartInstances.langRatio.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'value' },
        yAxis: { type: 'category', data: [currentProject.language || '未知', '其他语言'] },
        series: [{
            type: 'bar',
            data: [90, 10],
            itemStyle: { color: '#165DFF' }
        }]
    });
}

/**
 * 3.5 行业对比分析层图表
 */
function initCompareCharts() {
    // 3.5.1 同语言TOP10对比（雷达图）
    const top10CompareDom = document.getElementById('top10-compare-chart');
    chartInstances.top10Compare = echarts.init(top10CompareDom);
    chartInstances.top10Compare.setOption({
        tooltip: { trigger: 'item' },
        radar: {
            indicator: [
                { name: '星标数', max: 200000 },
                { name: '活跃度', max: 1000 },
                { name: 'OpenRank', max: 500 },
                { name: '关注度', max: 200 }
            ]
        },
        series: [{
            type: 'radar',
            data: [
                { name: '当前项目', value: [
                    Number(currentProject.latest_stars) || 0,
                    Number(currentProject.latest_activity) || 0,
                    Number(currentProject.latest_openrank) || 0,
                    Number(currentProject.latest_attention) || 0
                ]},
                { name: 'TOP1均值', value: [
                    (Number(currentProject.latest_stars) || 0) * 1.5,
                    (Number(currentProject.latest_activity) || 0) * 1.5,
                    (Number(currentProject.latest_openrank) || 0) * 1.5,
                    (Number(currentProject.latest_attention) || 0) * 1.5
                ]}
            ]
        }]
    });

    // 3.5.2 指标分位分布图（箱线图）
    const quantileDom = document.getElementById('quantile-chart');
    chartInstances.quantile = echarts.init(quantileDom);
    chartInstances.quantile.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: ['星标数', '活跃度', 'OpenRank'] },
        yAxis: { type: 'value' },
        series: [{
            type: 'boxplot',
            data: [
                [1000, 5000, 10000, 50000, 100000], // 星标数分位
                [10, 50, 100, 500, 1000], // 活跃度分位
                [5, 20, 50, 200, 500] // OpenRank分位
            ],
            markPoint: {
                data: [
                    { name: '当前值', value: Number(currentProject.latest_stars) || 0, xAxis: 0, yAxis: Number(currentProject.latest_stars) || 0 },
                    { name: '当前值', value: Number(currentProject.latest_activity) || 0, xAxis: 1, yAxis: Number(currentProject.latest_activity) || 0 },
                    { name: '当前值', value: Number(currentProject.latest_openrank) || 0, xAxis: 2, yAxis: Number(currentProject.latest_openrank) || 0 }
                ]
            }
        }]
    });
}

/**
 * 4. 渲染完整数据表格
 */
function renderDetailTable() {
    const tableBody = document.getElementById('detail-table-body');
    tableBody.innerHTML = '';

    // 指标说明映射
    const metricDesc = {
        'repo_name': '项目仓库名称',
        'language': '项目编程语言',
        'latest_stars': '最新星标数',
        'latest_activity': '最新活跃度得分',
        'latest_openrank': '最新OpenRank得分',
        'latest_attention': '最新关注度得分',
        'latest_bus_factor': '最新总线因子',
        'stars_total': '星标数总计',
        'activity_total': '活跃度总计',
        'openrank_total': 'OpenRank总计',
        'attention_total': '关注度总计',
        'bus_factor_total': '总线因子总计',
        'stars_trend': '星标数趋势（增长率）',
        'activity_trend': '活跃度趋势（增长率）',
        'openrank_trend': 'OpenRank趋势（增长率）',
        'attention_trend': '关注度趋势（增长率）',
        'bus_factor_trend': '总线因子趋势（增长率）',
        'avg_issue_age': '平均Issue处理时长（天）',
        'latest_participants': '最新参与贡献人数',
        'new_contributors_trend': '新贡献者增长趋势',
        'code_churn_ratio': '代码变动率',
        'influence_score': '项目影响力综合得分'
    };

    // 遍历所有字段生成表格行
    Object.entries(currentProject).forEach(([key, value]) => {
        const tr = document.createElement('tr');
        const desc = metricDesc[key] || key;
        const formattedValue = !isNaN(Number(value)) ? Number(value).toFixed(2) : value || '无数据';
        
        tr.innerHTML = `
            <td>${desc}</td>
            <td>${formattedValue}</td>
            <td>${key.includes('trend') ? '正数增长/负数下降' : key.includes('ratio') ? '代码修改/新增比例' : '-'}</td>
        `;
        tableBody.appendChild(tr);
    });
}

/**
 * 绑定分析层标签切换事件
 */
function bindTabEvents() {
    const tabs = document.querySelectorAll('.analysis-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // 移除所有active
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.analysis-content').forEach(c => c.classList.remove('active'));
            
            // 激活当前标签和内容
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
            
            // 切换后重新调整图表大小
            resizeAllCharts();
        });
    });
}

/**
 * 绑定侧边栏导航事件（平滑滚动到对应模块）
 */
function bindSidebarNavigation() {
    const sidebarLinks = document.querySelectorAll('.sidebar-item[href^="#"]');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                // 更新侧边栏active状态
                document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
                this.classList.add('active');
                
                // 平滑滚动到目标元素
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/**
 * 调整所有图表大小
 */
function resizeAllCharts() {
    Object.values(chartInstances).forEach(chart => {
        chart.resize();
    });
}