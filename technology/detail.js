// 全局变量
let currentKeyword = null;
let keywordData = []; // 存储该关键词的所有历史数据
let allProjectsData = []; // 存储所有项目数据用于Top10筛选
let chartInstances = {}; // 存储所有图表实例，便于resize

// 页面加载初始化
document.addEventListener('DOMContentLoaded', function() {
    // 解析URL参数获取关键词名
    const urlParams = new URLSearchParams(window.location.search);
    const keywordName = urlParams.get('keyword');
    if (!keywordName) {
        alert('无效的技术关键词参数，将返回列表页');
        window.location.href = 'list.html';
        return;
    }
    const decodedKeywordName = decodeURIComponent(keywordName);

    // 加载技术关键词数据
    loadKeywordData(decodedKeywordName);

    // 绑定分析层标签切换事件
    bindTabEvents();

    // 绑定侧边栏导航事件
    bindSidebarNavigation();

    // 窗口resize适配图表
    window.addEventListener('resize', resizeAllCharts);
});

/**
 * 加载并解析技术关键词数据和项目数据
 */
function loadKeywordData(targetKeyword) {
    // 同时加载关键词数据和项目数据
    Promise.all([
        new Promise((resolve, reject) => {
            Papa.parse('../data/keyword_trends.csv', {
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
    ]).then(([keywordResults, projectsResults]) => {
        // 处理关键词数据
        keywordData = keywordResults.data.filter(item => item.keyword_category === targetKeyword);

        if (keywordData.length === 0) {
            alert(`未找到技术关键词【${targetKeyword}】的数据源`);
            window.location.href = 'list.html';
            return;
        }

        // 处理项目数据
        allProjectsData = projectsResults.data;

        // 获取最新数据作为当前关键词信息
        currentKeyword = keywordData[keywordData.length - 1];

        // 1. 渲染顶部技术关键词名称和趋势标签
        renderKeywordHeader();
        // 2. 渲染基础信息方块
        renderBasicInfoGrid();
        // 3. 初始化所有图表
        initAllCharts();
        // 4. 渲染Top10热门项目
        renderTopProjects(targetKeyword);
        // 5. 渲染完整数据表格
        renderKeywordTable();
    }).catch((error) => {
        console.error('数据加载失败:', error);
        alert('数据源加载失败，请检查文件路径！');
    });
}

/**
 * 1. 渲染顶部技术关键词名称和趋势标签 + 面包屑关键词名
 */
function renderKeywordHeader() {
    document.getElementById('keyword-name').textContent = currentKeyword.keyword_category;
    // 更新面包屑中的技术关键词详情名称
    document.getElementById('current-keyword').textContent = currentKeyword.keyword_category;

    // 设置趋势标签
    const trendTag = document.getElementById('trend-tag');
    const trendDirection = currentKeyword.trend_direction;
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
        { label: '搜索量', key: 'search_volume', format: 'number' },
        { label: '提及次数', key: 'mention_count', format: 'number' },
        { label: '平均星标', key: 'avg_stars_per_mention', format: 'float' },
        { label: '影响力得分', key: 'influence_score', format: 'float' },
        { label: '竞争力', key: 'competitiveness', format: 'percent' },
        { label: '采用率', key: 'adoption_rate', format: 'float' },
        { label: '最新日期', key: 'date', format: 'date' },
        { label: '趋势方向', key: 'trend_direction', format: 'trend' }
    ];

    // 生成指标卡片
    container.innerHTML = '';
    basicMetrics.forEach(metric => {
        const value = currentKeyword[metric.key] || 0;
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
                formattedValue = (Number(value) * 100).toFixed(1) + '%';
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
    initTrendsCharts();
    // 3.4 对比分析层图表
    initComparisonCharts();
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
        'search_volume': 50,      // 搜索量基准：50
        'mention_count': 10,      // 提及次数基准：10
        'avg_stars_per_mention': 2000, // 平均星标基准：2000
        'influence_score': 1000,  // 影响力得分基准：1000
        'competitiveness': 1,     // 竞争力基准：1
        'adoption_rate': 2        // 采用率基准：2
    };

    // 获取实际值
    const actualValues = {
        search_volume: Number(currentKeyword.search_volume) || 0,
        mention_count: Number(currentKeyword.mention_count) || 0,
        avg_stars_per_mention: Number(currentKeyword.avg_stars_per_mention) || 0,
        influence_score: Number(currentKeyword.influence_score) || 0,
        competitiveness: Number(currentKeyword.competitiveness) || 0,
        adoption_rate: Number(currentKeyword.adoption_rate) || 0
    };

    // 标准化到0-100分
    const normalizedValues = {
        search_volume: Math.min(100, (actualValues.search_volume / benchmarks.search_volume) * 100),
        mention_count: Math.min(100, (actualValues.mention_count / benchmarks.mention_count) * 100),
        avg_stars_per_mention: Math.min(100, (actualValues.avg_stars_per_mention / benchmarks.avg_stars_per_mention) * 100),
        influence_score: Math.min(100, (actualValues.influence_score / benchmarks.influence_score) * 100),
        competitiveness: Math.min(100, actualValues.competitiveness * 100),
        adoption_rate: Math.min(100, (actualValues.adoption_rate / benchmarks.adoption_rate) * 100)
    };

    const option = {
        tooltip: {
            trigger: 'item',
            formatter: function(params) {
                const metricNames = ['搜索量', '提及次数', '平均星标', '影响力得分', '竞争力', '采用率'];
                const actualVals = Object.values(actualValues);
                return `${params.name}<br/>${metricNames[params.dataIndex]}: ${actualVals[params.dataIndex]}<br/>标准化得分: ${params.value}`;
            }
        },
        radar: {
            indicator: [
                { name: '搜索量', max: 100 },
                { name: '提及次数', max: 100 },
                { name: '平均星标', max: 100 },
                { name: '影响力得分', max: 100 },
                { name: '竞争力', max: 100 },
                { name: '采用率', max: 100 }
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
                    normalizedValues.search_volume,
                    normalizedValues.mention_count,
                    normalizedValues.avg_stars_per_mention,
                    normalizedValues.influence_score,
                    normalizedValues.competitiveness,
                    normalizedValues.adoption_rate
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
function initTrendsCharts() {
    // 3.2.1 搜索量趋势
    const searchDom = document.getElementById('search-volume-trend-chart');
    chartInstances.searchTrend = echarts.init(searchDom);

    const dates = keywordData.map(item => item.date);
    const searchData = keywordData.map(item => Number(item.search_volume));

    chartInstances.searchTrend.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: dates },
        yAxis: { type: 'value' },
        series: [{
            type: 'line',
            smooth: true,
            data: searchData,
            itemStyle: { color: '#165DFF' },
            areaStyle: { color: 'rgba(22, 93, 255, 0.1)' }
        }]
    });

    // 3.2.2 影响力趋势
    const influenceDom = document.getElementById('influence-trend-chart');
    chartInstances.influenceTrend = echarts.init(influenceDom);

    const influenceData = keywordData.map(item => Number(item.influence_score));

    chartInstances.influenceTrend.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: dates },
        yAxis: { type: 'value' },
        series: [{
            type: 'line',
            smooth: true,
            data: influenceData,
            itemStyle: { color: '#00B42A' },
            areaStyle: { color: 'rgba(0, 180, 42, 0.1)' }
        }]
    });

    // 3.2.3 竞争力趋势
    const competitivenessDom = document.getElementById('competitiveness-trend-chart');
    chartInstances.competitivenessTrend = echarts.init(competitivenessDom);

    const competitivenessData = keywordData.map(item => Number(item.competitiveness));

    chartInstances.competitivenessTrend.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: dates },
        yAxis: { type: 'value' },
        series: [{
            type: 'line',
            smooth: true,
            data: competitivenessData,
            itemStyle: { color: '#FF7D00' },
            areaStyle: { color: 'rgba(255, 125, 0, 0.1)' }
        }]
    });

    // 3.2.4 采用率趋势
    const adoptionDom = document.getElementById('adoption-trend-chart');
    chartInstances.adoptionTrend = echarts.init(adoptionDom);

    const adoptionData = keywordData.map(item => Number(item.adoption_rate));

    chartInstances.adoptionTrend.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: dates },
        yAxis: { type: 'value' },
        series: [{
            type: 'line',
            smooth: true,
            data: adoptionData,
            itemStyle: { color: '#F53F3F' },
            areaStyle: { color: 'rgba(245, 63, 63, 0.1)' }
        }]
    });
}

/**
 * 3.4 对比分析层图表
 */
function initComparisonCharts() {
    // 3.4.1 关键词对比
    const comparisonDom = document.getElementById('keyword-comparison-chart');
    chartInstances.keywordComparison = echarts.init(comparisonDom);

    // 这里可以加载其他关键词的数据进行对比，暂时显示当前关键词的历史对比
    const dates = keywordData.map(item => item.date);
    const currentValues = keywordData.map(item => Number(item.influence_score));

    chartInstances.keywordComparison.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: [currentKeyword.keyword_category] },
        xAxis: { type: 'category', data: dates },
        yAxis: { type: 'value' },
        series: [{
            name: currentKeyword.keyword_category,
            type: 'line',
            data: currentValues,
            itemStyle: { color: '#165DFF' }
        }]
    });

    // 3.4.2 发展趋势对比（饼图）
    const trendDom = document.getElementById('trend-comparison-chart');
    chartInstances.trendComparison = echarts.init(trendDom);

    // 统计趋势方向分布
    const trendStats = keywordData.reduce((acc, item) => {
        acc[item.trend_direction] = (acc[item.trend_direction] || 0) + 1;
        return acc;
    }, {});

    const trendData = Object.entries(trendStats).map(([direction, count]) => ({
        name: direction === 'up' ? '上升' : direction === 'down' ? '下降' : '稳定',
        value: count
    }));

    chartInstances.trendComparison.setOption({
        tooltip: { trigger: 'item' },
        series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            data: trendData
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

    const dates = keywordData.map(item => item.date);
    const influenceData = keywordData.map(item => Number(item.influence_score));

    // 简单的线性回归预测
    const n = influenceData.length;
    const x = Array.from({length: n}, (_, i) => i);
    const y = influenceData;

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
    const lastDate = dates[dates.length - 1];
    for (let i = 1; i <= futureMonths; i++) {
        const futureDate = new Date(lastDate + '-01');
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
            data: [...influenceData, ...Array(futureMonths).fill(null)],
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

    // 3.5.2 预测准确性分析（展示预测误差）
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
function renderTopProjects(targetKeyword) {
    const tableBody = document.getElementById('top-projects-body');
    tableBody.innerHTML = '';

    // 定义技术关键词到项目名称关键词的映射
    const keywordMappings = {
        'AI/ML': ['ai', 'ml', 'machine-learning', 'artificial-intelligence', 'deep-learning', 'neural', 'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'machinelearning'],
        'DevOps': ['devops', 'ci-cd', 'jenkins', 'github-actions', 'gitlab-ci', 'ansible', 'terraform', 'monitoring', 'docker', 'kubernetes', 'cicd'],
        'Web开发': ['web', 'backend', 'frontend', 'fullstack', 'javascript', 'node', 'express', 'api', 'rest', 'graphql', 'microservice'],
        '云原生': ['cloud', 'cloud-native', 'aws', 'azure', 'gcp', 'kubernetes', 'docker', 'serverless', 'microservice', 'istio', 'helm'],
        '前端框架': ['frontend', 'react', 'vue', 'angular', 'svelte', 'next', 'nuxt', 'javascript', 'typescript', 'webpack', 'vite'],
        '区块链': ['blockchain', 'bitcoin', 'ethereum', 'crypto', 'web3', 'defi', 'nft', 'smart-contract', 'solidity', 'hyperledger'],
        '大数据': ['bigdata', 'hadoop', 'spark', 'kafka', 'data-pipeline', 'etl', 'analytics', 'flink', 'storm', 'presto'],
        '数据库': ['database', 'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch', 'cassandra', 'dynamodb'],
        '移动开发': ['mobile', 'android', 'ios', 'react-native', 'flutter', 'cordova', 'ionic', 'xamarin', 'swift', 'kotlin'],
        '编程语言': ['language', 'compiler', 'interpreter', 'rust', 'go', 'python', 'javascript', 'typescript', 'java', 'cpp']
    };

    // 获取当前关键词的相关搜索关键词
    const searchKeywords = keywordMappings[targetKeyword] || [targetKeyword.toLowerCase().replace('/', '').replace(' ', '-')];

    // 筛选包含相关关键词的项目
    const relatedProjects = allProjectsData.filter(project => {
        const repoName = project.repo_name.toLowerCase();
        const language = (project.language || '').toLowerCase();

        // 检查项目名称是否包含关键词
        const nameMatch = searchKeywords.some(keyword =>
            repoName.includes(keyword.toLowerCase()) ||
            repoName.includes(keyword.replace('-', '')) ||
            repoName.includes(keyword.replace('-', '_')) ||
            repoName.includes(keyword.replace('-', ''))
        );

        // 检查编程语言是否相关（对于某些技术领域）
        const languageMatch = searchKeywords.some(keyword =>
            language.includes(keyword.toLowerCase())
        );

        return nameMatch || languageMatch;
    });

    if (relatedProjects.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px 0; color: #999;">
                    该技术关键词暂无相关项目数据
                </td>
            </tr>
        `;
        return;
    }

    // 按影响力得分排序，取前10个
    const topProjects = relatedProjects
        .sort((a, b) => Number(b.influence_score) - Number(a.influence_score))
        .slice(0, 10);

    topProjects.forEach((project, index) => {
        const tr = document.createElement('tr');
        const rank = index + 1;

        tr.innerHTML = `
            <td style="text-align: center;" class="${rank <= 3 ? 'rank-' + rank : ''}">${rank}</td>
            <td><a href="../projects/detail.html?repo=${encodeURIComponent(project.repo_name)}" class="project-link">${project.repo_name}</a></td>
            <td style="text-align: center;">${Number(project.latest_stars).toLocaleString()}</td>
            <td style="text-align: center;">${Number(project.latest_openrank).toFixed(2)}</td>
            <td style="text-align: center;">${Number(project.latest_activity).toFixed(2)}</td>
            <td style="text-align: center;">${new Date(Number(project.updated_at)).toISOString().split('T')[0]}</td>
        `;

        tableBody.appendChild(tr);
    });
}

/**
 * 5. 渲染完整数据表格
 */
function renderKeywordTable() {
    const tableBody = document.getElementById('keyword-table-body');
    tableBody.innerHTML = '';

    // 按日期排序（最新的在前面）
    const sortedData = [...keywordData].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedData.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.date}</td>
            <td>${Number(item.search_volume).toLocaleString()}</td>
            <td>${Number(item.mention_count).toLocaleString()}</td>
            <td>${Number(item.avg_stars_per_mention).toFixed(2)}</td>
            <td>${Number(item.influence_score).toFixed(2)}</td>
            <td>${item.trend_direction === 'up' ? '上升' : item.trend_direction === 'down' ? '下降' : '稳定'}</td>
            <td>${(Number(item.competitiveness) * 100).toFixed(1)}%</td>
            <td>${Number(item.adoption_rate).toFixed(2)}</td>
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