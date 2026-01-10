// 全局变量
let currentLanguage = null;
let languageData = []; // 存储该语言的所有历史数据
let allLanguagesData = []; // 存储所有语言的数据用于对比
let allProjectsData = []; // 存储所有项目数据用于Top10筛选
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
 * 加载并解析编程语言数据和项目数据
 */
function loadLanguageData(targetLanguage) {
    // 同时加载语言数据和项目数据
    Promise.all([
        new Promise((resolve, reject) => {
            Papa.parse('../data/language_trends_detailed.csv', {
                download: true,
                header: true,
                complete: (results) => resolve(results),
                error: reject
            });
        }),
        new Promise((resolve, reject) => {
            Papa.parse('../data/projects_complete.csv', {
                download: true,
                header: true,
                complete: (results) => resolve(results),
                error: reject
            });
        })
    ]).then(([languageResults, projectsResults]) => {
        // 处理语言数据
        allLanguagesData = languageResults.data;
        languageData = languageResults.data.filter(item => item.language === targetLanguage);
        
        if (languageData.length === 0) {
            alert(`未找到编程语言【${targetLanguage}】的数据源`);
            window.location.href = 'list.html';
            return;
        }

        // 处理项目数据
        allProjectsData = projectsResults.data;

        // 获取最新数据作为当前语言信息
        currentLanguage = languageData[languageData.length - 1];

        // 1. 渲染顶部编程语言名称和趋势标签
        renderLanguageHeader();
        // 2. 渲染基础信息方块
        renderBasicInfoGrid();
        // 3. 初始化所有图表
        initAllCharts();
        // 4. 渲染Top10热门项目
        renderTopProjects(targetLanguage);
        // 5. 渲染完整数据表格
        renderLanguageTable();
    }).catch((error) => {
        console.error('数据加载失败:', error);
        alert('数据源加载失败，请检查文件路径！');
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
    // 3.1 右侧雷达图
    initRadarChart();
    // 3.2 核心指标趋势分析层图表
    initOverviewCharts();
    // 3.4 对比分析层图表
    initComparisonAnalysisCharts();
    // 3.5 预测分析层图表
    initPredictionCharts();
}

/**
 * 3.1 初始化右侧雷达图
 */
function initRadarChart() {
    const radarDom = document.getElementById('radar-chart');
    chartInstances.radar = echarts.init(radarDom);
    
    // 定义各指标的基准最大值（用于标准化）
    const benchmarks = {
        'project_count': 100,      // 项目数量基准：100
        'avg_stars': 1000,         // 平均星标基准：1000
        'avg_openrank': 500,       // 平均OpenRank基准：500
        'activity_score': 1000,    // 活跃度得分基准：1000
        'popularity_index': 50     // 流行度指数基准：50
    };
    
    // 获取实际值
    const actualValues = {
        project_count: Number(currentLanguage.project_count) || 0,
        avg_stars: Number(currentLanguage.avg_stars) || 0,
        avg_openrank: Number(currentLanguage.avg_openrank) || 0,
        activity_score: Number(currentLanguage.activity_score) || 0,
        popularity_index: Number(currentLanguage.popularity_index) || 0
    };
    
    // 标准化到0-100分
    const normalizedValues = {
        project_count: Math.min(100, (actualValues.project_count / benchmarks.project_count) * 100),
        avg_stars: Math.min(100, (actualValues.avg_stars / benchmarks.avg_stars) * 100),
        avg_openrank: Math.min(100, (actualValues.avg_openrank / benchmarks.avg_openrank) * 100),
        activity_score: Math.min(100, (actualValues.activity_score / benchmarks.activity_score) * 100),
        popularity_index: Math.min(100, (actualValues.popularity_index / benchmarks.popularity_index) * 100)
    };
    
    const option = {
        tooltip: { 
            trigger: 'item',
            formatter: function(params) {
                const metricNames = ['项目数量', '平均星标', '平均OpenRank', '活跃度得分', '流行度指数'];
                const actualVals = Object.values(actualValues);
                return `${params.name}<br/>${metricNames[params.dataIndex]}: ${actualVals[params.dataIndex]}<br/>标准化得分: ${params.value}`;
            }
        },
        radar: {
            indicator: [
                { name: '项目数量', max: 100 },
                { name: '平均星标', max: 100 },
                { name: '平均OpenRank', max: 100 },
                { name: '活跃度得分', max: 100 },
                { name: '流行度指数', max: 100 }
            ],
            splitNumber: 5,
            axisName: {
                color: '#666',
                fontSize: 12
            }
        },
        series: [{
            type: 'radar',
            data: [{
                value: [
                    normalizedValues.project_count,
                    normalizedValues.avg_stars,
                    normalizedValues.avg_openrank,
                    normalizedValues.activity_score,
                    normalizedValues.popularity_index
                ],
                name: '核心指标',
                areaStyle: { 
                    color: 'rgba(22, 93, 255, 0.2)',
                    opacity: 0.8
                },
                itemStyle: { 
                    color: '#165DFF',
                    borderWidth: 2,
                    borderColor: '#fff'
                },
                lineStyle: {
                    width: 2,
                    color: '#165DFF'
                }
            }]
        }]
    };
    chartInstances.radar.setOption(option);
}

/**
 * 3.2 核心指标趋势分析层图表
 */
function initOverviewCharts() {
    // 3.2.1 星标数趋势
    const starsDom = document.getElementById('stars-trend-chart');
    chartInstances.starsTrend = echarts.init(starsDom);

    const dates = languageData.map(item => item.date);
    const starsData = languageData.map(item => Number(item.avg_stars));

    chartInstances.starsTrend.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: dates },
        yAxis: { type: 'value' },
        series: [{
            type: 'line',
            smooth: true,
            data: starsData,
            itemStyle: { color: '#00B42A' },
            areaStyle: { color: 'rgba(0, 180, 42, 0.1)' }
        }]
    });

    // 3.2.2 OpenRank趋势
    const openrankDom = document.getElementById('openrank-trend-chart');
    chartInstances.openrankTrend = echarts.init(openrankDom);

    const openrankData = languageData.map(item => Number(item.avg_openrank));

    chartInstances.openrankTrend.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: dates },
        yAxis: { type: 'value' },
        series: [{
            type: 'line',
            smooth: true,
            data: openrankData,
            itemStyle: { color: '#165DFF' },
            areaStyle: { color: 'rgba(22, 93, 255, 0.1)' }
        }]
    });

    // 3.2.3 活跃度趋势
    const activityDom = document.getElementById('activity-trend-chart');
    chartInstances.activityTrend = echarts.init(activityDom);

    const activityData = languageData.map(item => Number(item.activity_score));

    chartInstances.activityTrend.setOption({
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

    // 3.2.4 流行度指数趋势
    const popularityDom = document.getElementById('popularity-trend-chart');
    chartInstances.popularityTrend = echarts.init(popularityDom);

    const popularityData = languageData.map(item => Number(item.popularity_index));

    chartInstances.popularityTrend.setOption({
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
function initComparisonAnalysisCharts() {
    // 3.5.1 多语言对比
    const comparisonDom = document.getElementById('language-comparison-chart');
    chartInstances.languageComparison = echarts.init(comparisonDom);

    // 获取最近6个月的数据
    const recentData = allLanguagesData.filter(item => {
        const itemDate = new Date(item.date);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return itemDate >= sixMonthsAgo;
    });

    // 按语言分组并计算平均流行度指数
    const languageStats = {};
    recentData.forEach(item => {
        if (!languageStats[item.language]) {
            languageStats[item.language] = {
                total: 0,
                count: 0,
                latest: item
            };
        }
        languageStats[item.language].total += Number(item.popularity_index);
        languageStats[item.language].count++;
    });

    // 计算平均值并排序
    const comparisonData = Object.entries(languageStats)
        .map(([language, stats]) => ({
            name: language,
            value: stats.total / stats.count,
            latest: stats.latest
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // 只显示前10个

    chartInstances.languageComparison.setOption({
        tooltip: {
            trigger: 'axis',
            formatter: function(params) {
                return params.map(param => 
                    `${param.name}: ${param.value.toFixed(2)}`
                ).join('<br/>');
            }
        },
        xAxis: {
            type: 'category',
            data: comparisonData.map(item => item.name)
        },
        yAxis: { type: 'value' },
        series: [{
            type: 'bar',
            data: comparisonData.map(item => ({
                value: item.value,
                itemStyle: {
                    color: item.name === currentLanguage.language ? '#165DFF' : '#E8F4FF'
                }
            }))
        }]
    });

    // 3.5.2 内部结构变化（显示当前语言各指标的变化趋势）
    const structureDom = document.getElementById('internal-structure-chart');
    chartInstances.internalStructure = echarts.init(structureDom);

    // 计算各指标的变化率
    const latest = languageData[languageData.length - 1];
    const previous = languageData[languageData.length - 2] || latest;

    const metrics = [
        { name: '项目数量', current: Number(latest.project_count), previous: Number(previous.project_count) },
        { name: '平均星标', current: Number(latest.avg_stars), previous: Number(previous.avg_stars) },
        { name: '平均OpenRank', current: Number(latest.avg_openrank), previous: Number(previous.avg_openrank) },
        { name: '活跃度得分', current: Number(latest.activity_score), previous: Number(previous.activity_score) },
        { name: '流行度指数', current: Number(latest.popularity_index), previous: Number(previous.popularity_index) }
    ];

    const changeData = metrics.map(metric => {
        const change = metric.previous !== 0 ? ((metric.current - metric.previous) / metric.previous) * 100 : 0;
        return {
            name: metric.name,
            value: change,
            current: metric.current,
            change: change
        };
    });

    chartInstances.internalStructure.setOption({
        tooltip: {
            trigger: 'axis',
            formatter: function(params) {
                const data = params[0];
                const item = changeData[data.dataIndex];
                return `${item.name}<br/>当前值: ${item.current.toFixed(2)}<br/>变化率: ${item.change.toFixed(2)}%`;
            }
        },
        xAxis: {
            type: 'category',
            data: changeData.map(item => item.name)
        },
        yAxis: { type: 'value', name: '变化率 (%)' },
        series: [{
            type: 'bar',
            data: changeData.map(item => ({
                value: item.change,
                itemStyle: {
                    color: item.change >= 0 ? '#00B42A' : '#F53F3F'
                }
            }))
        }]
    });
}

/**
 * 3.5 预测分析层图表
 */
function initPredictionCharts() {
    // 3.5.1 趋势预测（使用简单线性回归）
    const predictionDom = document.getElementById('trend-prediction-chart');
    chartInstances.trendPrediction = echarts.init(predictionDom);

    const dates = languageData.map(item => item.date);
    const popularityData = languageData.map(item => Number(item.popularity_index));

    // 简单的线性回归预测
    const n = popularityData.length;
    const x = Array.from({length: n}, (_, i) => i);
    const y = popularityData;

    // 计算回归系数
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // 生成预测数据（未来6个月）
    const futureMonths = 6;
    const predictionData = [];
    for (let i = 0; i < futureMonths; i++) {
        const predictedValue = slope * (n + i) + intercept;
        predictionData.push(Math.max(0, predictedValue)); // 确保非负
    }

    // 合并历史和预测数据
    const allDates = [...dates];
    const futureDates = [];
    const lastDate = new Date(dates[dates.length - 1]);
    for (let i = 1; i <= futureMonths; i++) {
        const futureDate = new Date(lastDate);
        futureDate.setMonth(futureDate.getMonth() + i);
        futureDates.push(futureDate.toISOString().split('T')[0].slice(0, 7));
    }
    allDates.push(...futureDates);

    chartInstances.trendPrediction.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: ['历史数据', '预测趋势'] },
        xAxis: { type: 'category', data: allDates },
        yAxis: { type: 'value' },
        series: [{
            name: '历史数据',
            type: 'line',
            data: [...popularityData, ...Array(futureMonths).fill(null)],
            itemStyle: { color: '#165DFF' },
            lineStyle: { width: 2 }
        }, {
            name: '预测趋势',
            type: 'line',
            data: [...Array(n).fill(null), ...predictionData],
            itemStyle: { color: '#F53F3F' },
            lineStyle: { type: 'dashed', width: 2 }
        }]
    });

    // 3.4.2 预测准确性分析（展示预测误差）
    const accuracyDom = document.getElementById('prediction-accuracy-chart');
    chartInstances.predictionAccuracy = echarts.init(accuracyDom);

    // 计算预测误差（使用留一交叉验证）
    const errors = [];
    for (let i = 1; i < n; i++) {
        const trainX = x.slice(0, i);
        const trainY = y.slice(0, i);

        const trainSumX = trainX.reduce((a, b) => a + b, 0);
        const trainSumY = trainY.reduce((a, b) => a + b, 0);
        const trainSumXY = trainX.reduce((sum, xi, idx) => sum + xi * trainY[idx], 0);
        const trainSumXX = trainX.reduce((sum, xi) => sum + xi * xi, 0);

        const trainSlope = (i * trainSumXY - trainSumX * trainSumY) / (i * trainSumXX - trainSumX * trainSumX);
        const trainIntercept = (trainSumY - trainSlope * trainSumX) / i;

        const predicted = trainSlope * i + trainIntercept;
        const actual = y[i];
        const error = Math.abs(predicted - actual) / actual * 100; // 百分比误差
        errors.push(error);
    }

    // 计算准确性分布
    const accuracyRanges = ['0-10%', '10-20%', '20-30%', '30-50%', '50%+'];
    const accuracyCounts = accuracyRanges.map(() => 0);

    errors.forEach(error => {
        if (error < 10) accuracyCounts[0]++;
        else if (error < 20) accuracyCounts[1]++;
        else if (error < 30) accuracyCounts[2]++;
        else if (error < 50) accuracyCounts[3]++;
        else accuracyCounts[4]++;
    });

    chartInstances.predictionAccuracy.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: accuracyRanges },
        yAxis: { type: 'value' },
        series: [{
            type: 'bar',
            data: accuracyCounts,
            itemStyle: { color: '#00B42A' }
        }]
    });
}

/**
 * 4. 渲染Top10热门项目
 */
function renderTopProjects(targetLanguage) {
    const tableBody = document.getElementById('top-projects-body');
    tableBody.innerHTML = '';

    // 筛选指定编程语言的项目
    const languageProjects = allProjectsData.filter(project => project.language === targetLanguage);

    if (languageProjects.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px 0; color: #999;">
                    该编程语言暂无项目数据
                </td>
            </tr>
        `;
        return;
    }

    // 按最新星标数排序，取前10个
    const topProjects = languageProjects
        .sort((a, b) => Number(b.latest_stars) - Number(a.latest_stars))
        .slice(0, 10);

    topProjects.forEach((project, index) => {
        const tr = document.createElement('tr');
        const rank = index + 1;
        const repoName = project.repo_name;
        const stars = Number(project.latest_stars).toLocaleString();
        const openrank = Number(project.latest_openrank).toFixed(2);
        const activity = Number(project.latest_activity).toFixed(2);
        
        // 格式化更新时间（从时间戳转换为日期）
        const updateTime = new Date(Number(project.updated_at)).toLocaleDateString('zh-CN');

        tr.innerHTML = `
            <td style="text-align: center;" class="${rank <= 3 ? 'rank-' + rank : ''}">${rank}</td>
            <td><a href="../projects/detail.html?repo=${encodeURIComponent(repoName)}" class="project-link">${repoName}</a></td>
            <td style="text-align: center;">${stars}</td>
            <td style="text-align: center;">${openrank}</td>
            <td style="text-align: center;">${activity}</td>
            <td style="text-align: center;">${updateTime}</td>
        `;

        tableBody.appendChild(tr);
    });
}

/**
 * 5. 渲染完整数据表格
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