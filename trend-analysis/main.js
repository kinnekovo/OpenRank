// 全局变量
let keywordData = [];       // 技术领域趋势数据
let languageData = [];      // 编程语言趋势数据
// 图表实例（独立存储）
let domainTrendChart = null;
let domainForecastChart = null;
let languageTrendChart = null;
let languageForecastChart = null;

// 页面加载完成初始化
document.addEventListener('DOMContentLoaded', function() {
    // 1. 初始化日期
    initCurrentDate();
    // 2. 加载CSV数据
    loadCSVData();
    // 3. 绑定筛选按钮事件
    document.getElementById('query-btn').addEventListener('click', updateAllCharts);
    // 4. 绑定复制按钮事件
    document.getElementById('copy-btn').addEventListener('click', copyConclusion);
    // 5. 绑定侧边栏导航事件
    bindSidebarNavigation();
});

/**
 * 初始化当前日期显示
 */
function initCurrentDate() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('zh-CN', { 
        year: 'numeric', month: '2-digit', day: '2-digit' 
    });
    document.getElementById('current-date').textContent = dateStr;
    document.getElementById('update-time').textContent = dateStr;
}

/**
 * 加载CSV数据源
 */
function loadCSVData() {
    // 1. 加载技术领域数据（keyword_trends.csv）
    Papa.parse('../data/keyword_trends.csv', {
        download: true,
        header: true,
        complete: function(results) {
            keywordData = results.data.map(item => ({
                ...item,
                date: item.date,
                keyword_category: item.keyword_category,
                influence_score: parseFloat(item.influence_score) || 0,
                trend_direction: item.trend_direction,
                competitiveness: parseFloat(item.competitiveness) || 0
            }));
            // 初始化技术领域图表
            initDomainTrendChart();
            initDomainForecastChart();
            // 更新领域相关指标
            updateDomainMetrics();
        },
        error: function(error) {
            console.error('技术领域数据加载失败：', error);
            alert('keyword_trends.csv 加载失败，请检查路径！');
        }
    });

    // 2. 加载编程语言数据（language_trends_detailed.csv）
    Papa.parse('../data/language_trends_detailed.csv', {
        download: true,
        header: true,
        complete: function(results) {
            languageData = results.data.map(item => ({
                ...item,
                date: item.date,
                language: item.language,
                popularity_index: parseFloat(item.popularity_index) || 0,
                trend_direction: item.trend_direction
            }));
            // 初始化编程语言图表
            initLanguageTrendChart();
            initLanguageForecastChart();
            // 更新语言相关指标
            updateLanguageMetrics();
        },
        error: function(error) {
            console.error('编程语言数据加载失败：', error);
            alert('language_trends_detailed.csv 加载失败，请检查路径！');
        }
    });
}

/**
 * 更新所有图表（筛选后刷新）
 */
function updateAllCharts() {
    initDomainTrendChart();    // 技术领域趋势
    initDomainForecastChart(); // 技术领域预测
    initLanguageTrendChart();  // 编程语言趋势
    initLanguageForecastChart();// 编程语言预测
    updateDomainMetrics();     // 领域指标
    updateLanguageMetrics();   // 语言指标
}

// ------------------------------ 技术领域相关逻辑 ------------------------------
/**
 * 初始化技术领域历史趋势图表
 */
function initDomainTrendChart() {
    const chartDom = document.getElementById('domain-trend-chart');
    if (!chartDom) return;
    
    // 获取筛选条件
    const { timeRange, trendFilter } = getFilterConditions();
    // 筛选时间范围
    let allDates = [...new Set(keywordData.map(item => item.date))].sort();
    if (timeRange === 'half-year') allDates = allDates.filter(d => d >= '2025-08');
    if (timeRange === 'quarter') allDates = allDates.filter(d => d >= '2025-11');

    // Top5技术领域
    const topDomains = ['AI/ML', 'Web开发', '云原生', '大数据', '区块链'];
    const series = topDomains.map(domain => {
        // 筛选趋势方向+时间
        const filteredData = keywordData.filter(item => 
            item.keyword_category === domain && 
            allDates.includes(item.date) &&
            (trendFilter === 'all' || item.trend_direction === trendFilter)
        );
        // 构造数据
        const data = allDates.map(date => {
            const item = filteredData.find(i => i.date === date);
            return item ? item.influence_score : 0;
        });
        return {
            name: domain,
            type: 'line',
            data: data,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: { width: 2 },
            itemStyle: { color: getColorByDomain(domain) }
        };
    });

    // 初始化图表
    domainTrendChart = echarts.init(chartDom);
    const option = {
        tooltip: { trigger: 'axis', formatter: '{b}<br/>{a}：{c}' },
        legend: { data: topDomains, top: 0, left: 'center' },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: {
            type: 'category',
            data: allDates,
            axisLabel: { color: 'var(--gray-600)' },
            axisLine: { lineStyle: { color: 'var(--gray-200)' } }
        },
        yAxis: {
            type: 'value',
            name: '影响力得分',
            nameTextStyle: { color: 'var(--gray-600)' },
            axisLabel: { color: 'var(--gray-600)' },
            splitLine: { lineStyle: { color: 'var(--gray-100)' } }
        },
        series: series
    };
    domainTrendChart.setOption(option);
    window.addEventListener('resize', () => domainTrendChart.resize());
}

/**
 * 初始化技术领域未来预测图表
 */
function initDomainForecastChart() {
    const chartDom = document.getElementById('domain-forecast-chart');
    if (!chartDom) return;

    // 预测时间轴
    const forecastDates = ['2026-02', '2026-03', '2026-04'];
    // 历史时间轴（近6个月）
    const historyDates = ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01'];
    const allDates = [...historyDates, ...forecastDates];

    // Top3领域
    const topDomains = ['AI/ML', 'Web开发', '云原生'];
    const series = topDomains.map(domain => {
        // 历史数据
        const historyData = keywordData.filter(item => 
            item.keyword_category === domain && historyDates.includes(item.date)
        ).sort((a, b) => a.date.localeCompare(b.date));
        // 计算斜率（线性回归）
        const slope = historyData.length > 1 
            ? (historyData[historyData.length-1].influence_score - historyData[0].influence_score) / (historyData.length - 1)
            : 0;
        // 最后一个值
        const lastValue = historyData[historyData.length-1]?.influence_score || 0;
        // 预测数据
        const forecastData = forecastDates.map((_, idx) => parseFloat((lastValue + slope*(idx+1)).toFixed(1)));
        // 合并数据
        const allData = [
            ...historyData.map(item => item.influence_score),
            ...forecastData
        ];

        return {
            name: domain,
            type: 'bar',
            data: allData,
            itemStyle: {
                color: (params) => {
                    // 历史数据纯色，预测数据半透明
                    return params.dataIndex < historyData.length 
                        ? getColorByDomain(domain)
                        : `${getColorByDomain(domain).replace(')', ', 0.6)')}`;
                }
            }
        };
    });

    // 初始化图表
    domainForecastChart = echarts.init(chartDom);
    const option = {
        tooltip: { trigger: 'axis', formatter: '{b}（{a}）：{c}' },
        legend: { data: topDomains, top: 0, left: 'center' },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: {
            type: 'category',
            data: allDates,
            axisLabel: { color: 'var(--gray-600)' },
            axisLine: { lineStyle: { color: 'var(--gray-200)' } }
        },
        yAxis: {
            type: 'value',
            name: '影响力得分',
            nameTextStyle: { color: 'var(--gray-600)' },
            axisLabel: { color: 'var(--gray-600)' },
            splitLine: { lineStyle: { color: 'var(--gray-100)' } }
        },
        series: series,
        // 标注预测区域
        graphic: {
            elements: [{
                type: 'rect', left: '60%', top: '10%', right: '5%', height: 24,
                style: { fill: 'var(--warning)', opacity: 0.2 }
            }, {
                type: 'text', left: '61%', top: '15%',
                style: { text: '预测区域', fontSize: 12, color: 'var(--warning)' }
            }]
        }
    };
    domainForecastChart.setOption(option);
    window.addEventListener('resize', () => domainForecastChart.resize());
}

/**
 * 更新技术领域相关指标卡片
 */
function updateDomainMetrics() {
    // 1. 上升最快领域
    const domainGrowth = {};
    const domainData = keywordData.filter(item => item.date >= '2025-09' && item.date <= '2026-01');
    domainData.forEach(item => {
        if (!domainGrowth[item.keyword_category]) domainGrowth[item.keyword_category] = { first: null, last: null };
        if (item.date === '2025-09') domainGrowth[item.keyword_category].first = item.influence_score;
        if (item.date === '2026-01') domainGrowth[item.keyword_category].last = item.influence_score;
    });
    let fastestRising = '';
    let maxGrowth = 0;
    Object.keys(domainGrowth).forEach(d => {
        const { first, last } = domainGrowth[d];
        if (first && last && last > first) {
            const growth = ((last - first)/first*100).toFixed(0);
            if (parseInt(growth) > maxGrowth) {
                maxGrowth = parseInt(growth);
                fastestRising = d;
            }
        }
    });
    document.getElementById('fastest-rising-domain').textContent = fastestRising;
    document.getElementById('domain-rising-desc').textContent = `影响力涨幅${maxGrowth}%（2025-09至2026-01）`;

    // 2. 下降最明显领域
    let fastestFalling = '';
    let maxFall = 0;
    Object.keys(domainGrowth).forEach(d => {
        const { first, last } = domainGrowth[d];
        if (first && last && last < first) {
            const fall = ((first - last)/first*100).toFixed(0);
            if (parseInt(fall) > maxFall) {
                maxFall = parseInt(fall);
                fastestFalling = d;
            }
        }
    });
    document.getElementById('fastest-falling-domain').textContent = fastestFalling;
    document.getElementById('domain-falling-desc').textContent = `影响力跌幅${maxFall}%（2025-02至2026-01）`;
}

// ------------------------------ 编程语言相关逻辑 ------------------------------
/**
 * 初始化编程语言历史趋势图表
 */
function initLanguageTrendChart() {
    const chartDom = document.getElementById('language-trend-chart');
    if (!chartDom) return;
    
    // 获取筛选条件
    const { timeRange, trendFilter } = getFilterConditions();
    // 筛选时间范围
    let allDates = [...new Set(languageData.map(item => item.date))].sort();
    if (timeRange === 'half-year') allDates = allDates.filter(d => d >= '2025-08');
    if (timeRange === 'quarter') allDates = allDates.filter(d => d >= '2025-11');

    // Top5编程语言
    const topLanguages = ['Python', 'JavaScript', 'TypeScript', 'Java', 'Go'];
    const series = topLanguages.map(lang => {
        // 筛选趋势方向+时间
        const filteredData = languageData.filter(item => 
            item.language === lang && 
            allDates.includes(item.date) &&
            (trendFilter === 'all' || item.trend_direction === trendFilter)
        );
        // 构造数据
        const data = allDates.map(date => {
            const item = filteredData.find(i => i.date === date);
            return item ? item.popularity_index : 0;
        });
        return {
            name: lang,
            type: 'line',
            data: data,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: { width: 2 },
            itemStyle: { color: getColorByLang(lang) }
        };
    });

    // 初始化图表
    languageTrendChart = echarts.init(chartDom);
    const option = {
        tooltip: { trigger: 'axis', formatter: '{b}<br/>{a}：{c}' },
        legend: { data: topLanguages, top: 0, left: 'center' },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: {
            type: 'category',
            data: allDates,
            axisLabel: { color: 'var(--gray-600)' },
            axisLine: { lineStyle: { color: 'var(--gray-200)' } }
        },
        yAxis: {
            type: 'value',
            name: '热度指数',
            nameTextStyle: { color: 'var(--gray-600)' },
            axisLabel: { color: 'var(--gray-600)' },
            splitLine: { lineStyle: { color: 'var(--gray-100)' } }
        },
        series: series
    };
    languageTrendChart.setOption(option);
    window.addEventListener('resize', () => languageTrendChart.resize());
}

/**
 * 初始化编程语言未来预测图表
 */
function initLanguageForecastChart() {
    const chartDom = document.getElementById('language-forecast-chart');
    if (!chartDom) return;

    // 预测时间轴
    const forecastDates = ['2026-02', '2026-03', '2026-04'];
    // 历史时间轴（近6个月）
    const historyDates = ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01'];
    const allDates = [...historyDates, ...forecastDates];

    // Top3编程语言
    const topLanguages = ['Python', 'JavaScript', 'TypeScript'];
    const series = topLanguages.map(lang => {
        // 历史数据
        const historyData = languageData.filter(item => 
            item.language === lang && historyDates.includes(item.date)
        ).sort((a, b) => a.date.localeCompare(b.date));
        // 计算斜率
        const slope = historyData.length > 1 
            ? (historyData[historyData.length-1].popularity_index - historyData[0].popularity_index) / (historyData.length - 1)
            : 0;
        // 最后一个值
        const lastValue = historyData[historyData.length-1]?.popularity_index || 0;
        // 预测数据
        const forecastData = forecastDates.map((_, idx) => parseFloat((lastValue + slope*(idx+1)).toFixed(1)));
        // 合并数据
        const allData = [
            ...historyData.map(item => item.popularity_index),
            ...forecastData
        ];

        return {
            name: lang,
            type: 'bar',
            data: allData,
            itemStyle: {
                color: (params) => {
                    // 历史数据纯色，预测数据半透明
                    return params.dataIndex < historyData.length 
                        ? getColorByLang(lang)
                        : `${getColorByLang(lang).replace(')', ', 0.6)')}`;
                }
            }
        };
    });

    // 初始化图表
    languageForecastChart = echarts.init(chartDom);
    const option = {
        tooltip: { trigger: 'axis', formatter: '{b}（{a}）：{c}' },
        legend: { data: topLanguages, top: 0, left: 'center' },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: {
            type: 'category',
            data: allDates,
            axisLabel: { color: 'var(--gray-600)' },
            axisLine: { lineStyle: { color: 'var(--gray-200)' } }
        },
        yAxis: {
            type: 'value',
            name: '热度指数',
            nameTextStyle: { color: 'var(--gray-600)' },
            axisLabel: { color: 'var(--gray-600)' },
            splitLine: { lineStyle: { color: 'var(--gray-100)' } }
        },
        series: series,
        // 标注预测区域
        graphic: {
            elements: [{
                type: 'rect', left: '60%', top: '10%', right: '5%', height: 24,
                style: { fill: 'var(--warning)', opacity: 0.2 }
            }, {
                type: 'text', left: '61%', top: '15%',
                style: { text: '预测区域', fontSize: 12, color: 'var(--warning)' }
            }]
        }
    };
    languageForecastChart.setOption(option);
    window.addEventListener('resize', () => languageForecastChart.resize());
}

/**
 * 更新编程语言相关指标卡片
 */
function updateLanguageMetrics() {
    // 热度最高编程语言（2026-01）
    const lang202601 = languageData.filter(item => item.date === '2026-01');
    let hottestLang = '';
    let maxScore = 0;
    lang202601.forEach(item => {
        if (item.popularity_index > maxScore) {
            maxScore = item.popularity_index;
            hottestLang = item.language;
        }
    });
    document.getElementById('hottest-language').textContent = hottestLang;
    document.getElementById('lang-hot-desc').textContent = `热度指数${maxScore.toFixed(1)}（2026-01）`;

    // 推荐技术固定为TypeScript（可根据实际数据调整）
    document.getElementById('recommend-tech').textContent = 'TypeScript';
    document.getElementById('recommend-desc').textContent = '竞争度低（0.42）+ 连续5个月上升';
}

// ------------------------------ 工具函数 ------------------------------
/**
 * 获取筛选条件
 */
function getFilterConditions() {
    return {
        timeRange: document.getElementById('time-range').value,
        trendFilter: document.getElementById('trend-filter').value
    };
}

/**
 * 按领域分配颜色
 */
function getColorByDomain(domain) {
    // 替换成你想要的彩色值（支持十六进制/RGB/RGBA）
    const colorMap = {
        'AI/ML': '#16A34A',        // 绿色（AI/ML）
        'Web开发': '#2563EB',       // 蓝色（Web开发）
        '云原生': '#DC2626',        // 红色（云原生）
        '大数据': '#F59E0B',        // 橙色（大数据）
        '区块链': '#3B82F6',        // 天蓝色（区块链）
        '未知领域': '#6B7280'       // 灰色（兜底）
    };
    return colorMap[domain] || '#6B7280';
}

/**
 * 按语言分配颜色
 */
function getColorByLang(lang) {
    // 替换成你想要的彩色值
    const colorMap = {
        'Python': '#3776AB',        // Python蓝
        'JavaScript': '#F7DF1E',    // JS黄
        'TypeScript': '#3178C6',    // TS蓝
        'Java': '#007396',          // Java蓝
        'Go': '#00ADD8',            // Go青
        '未知语言': '#6B7280'       // 灰色（兜底）
    };
    return colorMap[lang] || '#6B7280';
}

/**
 * 复制结论
 */
function copyConclusion() {
    const conclusion = document.getElementById('forecast-conclusion').innerText;
    navigator.clipboard.writeText(conclusion).then(() => {
        alert('趋势结论已复制到剪贴板！');
    }).catch(err => {
        alert('复制失败：' + err.message);
    });
}

/**
 * 绑定侧边栏导航事件（平滑滚动到对应模块）
 */
function bindSidebarNavigation() {
    console.log('技术趋势页面：绑定侧边栏导航事件...');
    // 点击导航
    document.querySelectorAll('.sidebar-item:not(.disabled)').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('href');
            console.log('技术趋势页面：点击导航:', targetId);
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                console.log('技术趋势页面：找到目标元素:', targetElement, '位置:', targetElement.offsetTop);
                // 使用 window.scrollTo 作为替代方案
                const targetPosition = targetElement.offsetTop - 20; // 减去一些偏移
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                console.log('技术趋势页面：执行了 window.scrollTo 到位置:', targetPosition);
            } else {
                console.log('技术趋势页面：未找到目标元素:', targetId);
            }
        });
    });

    // 滚动时更新激活状态
    const observerOptions = {
        root: null,
        rootMargin: '-50% 0px -50% 0px',
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                document.querySelectorAll('.sidebar-item').forEach(si => si.classList.remove('active'));
                const activeLink = document.querySelector(`.sidebar-item[href="#${id}"]`);
                if (activeLink) {
                    activeLink.classList.add('active');
                }
            }
        });
    }, observerOptions);

    // 观察所有 section
    document.querySelectorAll('section[id]').forEach(section => {
        console.log('技术趋势页面：观察 section:', section.id);
        observer.observe(section);
    });
    console.log('技术趋势页面：侧边栏导航绑定完成');
}