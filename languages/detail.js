// 全局变量
let currentLanguage = null;
let languageData = []; // 存储该语言的所有历史数据
let chartInstances = {}; // 存储所有图表实例，便于resize

// 页面加载初始化
document.addEventListener('DOMContentLoaded', function() {
    // 解析URL参数获取语言名
    const urlParams = new URLSearchParams(window.location.search);
    const languageName = urlParams.get('language');
    if (!languageName) {
        alert('无效的编程语言参数，将返回列表页');
        window.location.href = 'list.html';
        return;
    }
    const decodedLanguageName = decodeURIComponent(languageName);

    // 加载编程语言数据
    loadLanguageData(decodedLanguageName);

    // 绑定分析层标签切换事件
    bindTabEvents();

    // 绑定侧边栏导航事件
    bindSidebarNavigation();

    // 窗口resize适配图表
    window.addEventListener('resize', resizeAllCharts);
});

/**
 * 加载并解析编程语言数据
 */
function loadLanguageData(targetLanguage) {
    Papa.parse('../data/language_trends_detailed.csv', {
        download: true,
        header: true,
        complete: function(results) {
            // 筛选目标编程语言的所有历史数据
            languageData = results.data.filter(item => item.language === targetLanguage);
            if (languageData.length === 0) {
                alert(`未找到编程语言【${targetLanguage}】的数据源`);
                window.location.href = 'list.html';
                return;
            }

            // 获取最新数据作为当前语言信息
            currentLanguage = languageData[languageData.length - 1];

            // 1. 渲染顶部编程语言名称和趋势标签
            renderLanguageHeader();
            // 2. 渲染基础信息方块
            renderBasicInfoGrid();
            // 3. 初始化所有图表
            initAllCharts();
            // 4. 渲染完整数据表格
            renderLanguageTable();
        },
        error: function() {
            alert('数据源加载失败，请检查文件路径！');
        }
    });
}

/**
 * 1. 渲染顶部编程语言名称和趋势标签 + 面包屑语言名
 */
function renderLanguageHeader() {
    document.getElementById('language-name').textContent = currentLanguage.language;
    // 更新面包屑中的编程语言详情名称
    document.getElementById('current-language').textContent = currentLanguage.language;

    // 设置趋势标签
    const trendTag = document.getElementById('trend-tag');
    const trendDirection = currentLanguage.trend_direction;
    trendTag.textContent = trendDirection === 'up' ? '上升趋势' :
                          trendDirection === 'down' ? '下降趋势' : '稳定趋势';
    trendTag.className = `trend-tag ${trendDirection}`;
}

/**
 * 2. 渲染基础信息方块（显示关键指标）
 */
function renderBasicInfoGrid() {
    const container = document.getElementById('basic-info-container');
    // 定义基础指标
    const basicMetrics = [
        { label: '项目数量', key: 'project_count', format: 'number' },
        { label: '平均星标', key: 'avg_stars', format: 'float' },
        { label: '平均OpenRank', key: 'avg_openrank', format: 'float' },
        { label: '活跃度得分', key: 'activity_score', format: 'float' },
        { label: '流行度指数', key: 'popularity_index', format: 'float' },
        { label: '最新日期', key: 'date', format: 'date' },
        { label: '趋势方向', key: 'trend_direction', format: 'trend' }
    ];

    // 生成指标卡片
    container.innerHTML = '';
    basicMetrics.forEach(metric => {
        const value = currentLanguage[metric.key] || 0;
        // 格式化数值
        let formattedValue = '';
        switch(metric.format) {
            case 'number':
                formattedValue = Number(value).toLocaleString();
                break;
            case 'float':
                formattedValue = Number(value).toFixed(2);
                break;
            case 'date':
                formattedValue = value;
                break;
            case 'trend':
                formattedValue = value === 'up' ? '上升' :
                                value === 'down' ? '下降' : '稳定';
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
 * 3. 初始化所有图表
 */
function initAllCharts() {
    // 3.1 右侧趋势图
    initTrendChart();
    // 3.2 概览分析层图表
    initOverviewCharts();
    // 3.3 详细趋势分析层图表
    initDetailedCharts();
    // 3.4 对比分析层图表
    initComparisonCharts();
}

/**
 * 3.1 初始化右侧趋势图（项目数量变化）
 */
function initTrendChart() {
    const trendDom = document.getElementById('trend-chart');
    chartInstances.trend = echarts.init(trendDom);

    // 准备数据：最近12个月的项目数量
    const recentData = languageData.slice(-12);
    const dates = recentData.map(item => item.date);
    const projectCounts = recentData.map(item => Number(item.project_count));

    const option = {
        tooltip: { trigger: 'axis' },
        xAxis: {
            type: 'category',
            data: dates
        },
        yAxis: { type: 'value' },
        series: [{
            type: 'line',
            smooth: true,
            data: projectCounts,
            itemStyle: { color: '#165DFF' },
            areaStyle: { color: 'rgba(22, 93, 255, 0.1)' }
        }]
    };
    chartInstances.trend.setOption(option);
}

/**
 * 3.2 概览分析层图表
 */
function initOverviewCharts() {
    // 3.2.1 项目数量趋势
    const projectCountDom = document.getElementById('project-count-chart');
    chartInstances.projectCount = echarts.init(projectCountDom);

    const dates = languageData.map(item => item.date);
    const projectCounts = languageData.map(item => Number(item.project_count));

    chartInstances.projectCount.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: dates },
        yAxis: { type: 'value' },
        series: [{
            type: 'bar',
            data: projectCounts,
            itemStyle: { color: '#165DFF' }
        }]
    });

    // 3.2.2 平均星标趋势
    const avgStarsDom = document.getElementById('avg-stars-chart');
    chartInstances.avgStars = echarts.init(avgStarsDom);

    const avgStarsData = languageData.map(item => Number(item.avg_stars));

    chartInstances.avgStars.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: dates },
        yAxis: { type: 'value' },
        series: [{
            type: 'line',
            smooth: true,
            data: avgStarsData,
            itemStyle: { color: '#00B42A' },
            areaStyle: { color: 'rgba(0, 180, 42, 0.1)' }
        }]
    });
}

/**
 * 3.3 详细趋势分析层图表
 */
function initDetailedCharts() {
    // 3.3.1 活跃度得分趋势
    const activityDom = document.getElementById('activity-score-chart');
    chartInstances.activityScore = echarts.init(activityDom);

    const dates = languageData.map(item => item.date);
    const activityData = languageData.map(item => Number(item.activity_score));

    chartInstances.activityScore.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: dates },
        yAxis: { type: 'value' },
        series: [{
            type: 'line',
            smooth: true,
            data: activityData,
            itemStyle: { color: '#FF7D00' },
            areaStyle: { color: 'rgba(255, 125, 0, 0.1)' }
        }]
    });

    // 3.3.2 流行度指数趋势
    const popularityDom = document.getElementById('popularity-chart');
    chartInstances.popularity = echarts.init(popularityDom);

    const popularityData = languageData.map(item => Number(item.popularity_index));

    chartInstances.popularity.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: dates },
        yAxis: { type: 'value' },
        series: [{
            type: 'line',
            smooth: true,
            data: popularityData,
            itemStyle: { color: '#F53F3F' },
            areaStyle: { color: 'rgba(245, 63, 63, 0.1)' }
        }]
    });
}

/**
 * 3.4 对比分析层图表
 */
function initComparisonCharts() {
    // 3.4.1 多语言对比（简化版：显示当前语言与其他语言的对比）
    const comparisonDom = document.getElementById('language-comparison-chart');
    chartInstances.languageComparison = echarts.init(comparisonDom);

    // 这里可以加载其他语言的数据进行对比，暂时显示当前语言的历史对比
    const dates = languageData.map(item => item.date);
    const currentValues = languageData.map(item => Number(item.popularity_index));

    chartInstances.languageComparison.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: [currentLanguage.language] },
        xAxis: { type: 'category', data: dates },
        yAxis: { type: 'value' },
        series: [{
            name: currentLanguage.language,
            type: 'line',
            data: currentValues,
            itemStyle: { color: '#165DFF' }
        }]
    });

    // 3.4.2 趋势方向分布（饼图）
    const trendDom = document.getElementById('trend-distribution-chart');
    chartInstances.trendDistribution = echarts.init(trendDom);

    // 统计趋势方向分布
    const trendStats = languageData.reduce((acc, item) => {
        acc[item.trend_direction] = (acc[item.trend_direction] || 0) + 1;
        return acc;
    }, {});

    const trendData = Object.entries(trendStats).map(([direction, count]) => ({
        name: direction === 'up' ? '上升' : direction === 'down' ? '下降' : '稳定',
        value: count
    }));

    chartInstances.trendDistribution.setOption({
        tooltip: { trigger: 'item' },
        series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            data: trendData
        }]
    });
}

/**
 * 4. 渲染完整数据表格
 */
function renderLanguageTable() {
    const tableBody = document.getElementById('language-table-body');
    tableBody.innerHTML = '';

    // 按日期排序（最新的在前面）
    const sortedData = [...languageData].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedData.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.date}</td>
            <td>${Number(item.project_count).toLocaleString()}</td>
            <td>${Number(item.avg_stars).toFixed(2)}</td>
            <td>${Number(item.avg_openrank).toFixed(2)}</td>
            <td>${Number(item.activity_score).toFixed(2)}</td>
            <td>${item.trend_direction === 'up' ? '上升' : item.trend_direction === 'down' ? '下降' : '稳定'}</td>
            <td>${Number(item.popularity_index).toFixed(2)}</td>
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