/**
 * 编程语言列表页 - 独立JS逻辑
 * 功能：CSV数据加载、筛选、分页、编程语言卡片渲染
 */

// 1. 全局状态管理（集中管理数据和分页状态）
const languageStore = {
    allLanguages: [],       // 所有编程语言原始数据
    filteredLanguages: [],  // 筛选后的数据
    currentPage: 1,         // 当前页码
    pageSize: 10,           // 每页显示数量
    currentSortField: 'name', // 当前排序字段
    currentSortOrder: 'asc', // 当前排序顺序
    init() {
        // 初始化：加载数据 + 绑定事件
        this.loadLanguageData();
        this.bindEvents();
    },

    /**
     * 2. 加载language_trends_detailed.csv数据
     */
    loadLanguageData() {
        const csvPath = '../data/language_trends_detailed.csv'; // 确保CSV路径正确
        Papa.parse(csvPath, {
            download: true,
            header: true,
            complete: (results) => {
                // 处理数据：按语言分组，取最新数据
                const languageMap = new Map();

                results.data.forEach(item => {
                    const language = item.language;
                    if (!languageMap.has(language)) {
                        languageMap.set(language, {
                            language: language,
                            latest_date: item.date,
                            project_count: Number(item.project_count) || 0,
                            avg_stars: Number(item.avg_stars) || 0,
                            avg_openrank: Number(item.avg_openrank) || 0,
                            activity_score: Number(item.activity_score) || 0,
                            trend_direction: item.trend_direction,
                            popularity_index: Number(item.popularity_index) || 0
                        });
                    } else {
                        // 更新为更新的数据（按日期比较）
                        const existing = languageMap.get(language);
                        if (item.date > existing.latest_date) {
                            languageMap.set(language, {
                                language: language,
                                latest_date: item.date,
                                project_count: Number(item.project_count) || 0,
                                avg_stars: Number(item.avg_stars) || 0,
                                avg_openrank: Number(item.avg_openrank) || 0,
                                activity_score: Number(item.activity_score) || 0,
                                trend_direction: item.trend_direction,
                                popularity_index: Number(item.popularity_index) || 0
                            });
                        }
                    }
                });

                this.allLanguages = Array.from(languageMap.values());
                this.filteredLanguages = [...this.allLanguages]; // 初始为全部数据
                this.sortLanguages(this.currentSortField, this.currentSortOrder); // 应用默认排序
                this.renderLanguageGrid();   // 渲染编程语言卡片
                this.updatePagination();    // 更新分页信息
            },
            error: () => {
                document.getElementById('language-grid').innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px 0; color: var(--danger);">
                        编程语言数据加载失败，请检查CSV文件路径！
                    </div>
                `;
            }
        });
    },

    /**
     * 2.5 排序编程语言数据
     */
    sortLanguages(sortField, sortOrder = 'asc') {
        this.currentSortField = sortField;
        this.currentSortOrder = sortOrder;
        
        this.filteredLanguages.sort((a, b) => {
            let aValue, bValue;
            
            switch (sortField) {
                case 'name':
                    aValue = (a.language || '').toLowerCase();
                    bValue = (b.language || '').toLowerCase();
                    if (sortOrder === 'asc') {
                        return aValue.localeCompare(bValue);
                    } else {
                        return bValue.localeCompare(aValue);
                    }
                case 'project_count':
                    aValue = Number(a.project_count) || 0;
                    bValue = Number(b.project_count) || 0;
                    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
                case 'avg_stars':
                    aValue = Number(a.avg_stars) || 0;
                    bValue = Number(b.avg_stars) || 0;
                    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
                case 'activity_score':
                    aValue = Number(a.activity_score) || 0;
                    bValue = Number(b.activity_score) || 0;
                    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
                case 'popularity_index':
                    aValue = Number(a.popularity_index) || 0;
                    bValue = Number(b.popularity_index) || 0;
                    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
                case 'avg_openrank':
                    aValue = Number(a.avg_openrank) || 0;
                    bValue = Number(b.avg_openrank) || 0;
                    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
                default:
                    return 0;
            }
        });
        
        // 排序后重置到第一页并重新渲染
        this.currentPage = 1;
        this.renderLanguageGrid();
        this.updatePagination();
    },

    /**
     * 3. 渲染编程语言豆腐块（核心布局：复用metric-card样式）
     */
    renderLanguageGrid() {
        const gridContainer = document.getElementById('language-grid');
        gridContainer.innerHTML = '';

        // 计算当前页数据范围
        const startIdx = (this.currentPage - 1) * this.pageSize;
        const currentData = this.filteredLanguages.slice(startIdx, startIdx + this.pageSize);

        // 无数据时显示提示
        if (currentData.length === 0) {
            gridContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px 0; color: var(--gray-400);">
                    暂无匹配的编程语言数据
                </div>
            `;
            return;
        }

        // 渲染每个编程语言卡片
        currentData.forEach(language => {
            const langName = language.language || '未知语言';
            const projectCount = language.project_count || 0;
            const avgStars = (Number(language.avg_stars) || 0).toFixed(1);
            const popularityIndex = (Number(language.popularity_index) || 0).toFixed(1);
            const trendDirection = language.trend_direction || 'stable';

            // 趋势图标
            const trendIcon = trendDirection === 'up' ? 'bi-arrow-up-circle-fill text-success' :
                             trendDirection === 'down' ? 'bi-arrow-down-circle-fill text-danger' :
                             'bi-dash-circle-fill text-warning';

            // 创建豆腐块卡片（复用style.css的metric-card样式）
            const card = document.createElement('div');
            card.className = 'metric-card';
            card.style.cursor = 'pointer';
            card.innerHTML = `
                <div class="card-icon bg-primary">
                    <i class="bi bi-code-slash"></i>
                </div>
                <div class="card-content">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <h3 style="font-size: 1rem; color: var(--gray-600);">${langName}</h3>
                        <span style="background: var(--light); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; color: var(--gray-500);">
                            <i class="bi ${trendIcon}"></i>
                        </span>
                    </div>
                    <div style="display: flex; gap: 16px; margin-bottom: 8px;">
                        <div>
                            <div class="card-title">项目数量</div>
                            <div class="card-value" style="font-size: 1.2rem;">${projectCount}</div>
                        </div>
                        <div>
                            <div class="card-title">平均星标</div>
                            <div class="card-value" style="font-size: 1.2rem;">${avgStars}</div>
                        </div>
                    </div>
                    <div>
                        <div class="card-title">流行度指数</div>
                        <div class="card-value" style="font-size: 1.2rem;">${popularityIndex}</div>
                    </div>
                </div>
            `;

            // 点击跳转详情页（URL编码语言名，避免特殊字符问题）
            card.addEventListener('click', () => {
                const encodedLang = encodeURIComponent(langName);
                window.location.href = `detail.html?language=${encodedLang}`;
            });

            gridContainer.appendChild(card);
        });
    },

    /**
     * 4. 更新分页信息（页码、按钮禁用状态）
     */
    updatePagination() {
        const totalPages = Math.ceil(this.filteredLanguages.length / this.pageSize);
        document.getElementById('page-info').textContent = `第 ${this.currentPage} 页 / 共 ${totalPages} 页`;

        // 禁用/启用分页按钮
        document.getElementById('prev-page').disabled = this.currentPage === 1;
        document.getElementById('next-page').disabled = this.currentPage === totalPages;
    },

    /**
     * 5. 筛选逻辑（按语言名称搜索）
     */
    filterLanguages() {
        const searchVal = document.getElementById('language-search').value.toLowerCase().trim();

        // 按语言名称筛选
        this.filteredLanguages = this.allLanguages.filter(language => {
            const langName = (language.language || '').toLowerCase();
            return langName.includes(searchVal);
        });

        // 筛选后应用当前排序
        this.sortLanguages(this.currentSortField, this.currentSortOrder);
        
        // 筛选后重置到第一页
        this.currentPage = 1;
        this.renderLanguageGrid();
        this.updatePagination();
    },

    /**
     * 6. 绑定所有交互事件（集中管理，便于维护）
     */
    bindEvents() {
        // 搜索按钮点击
        document.getElementById('search-btn').addEventListener('click', () => this.filterLanguages());
        // 搜索框回车键
        document.getElementById('language-search').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.filterLanguages();
        });
        // 搜索框输入时实时筛选
        document.getElementById('language-search').addEventListener('input', () => this.filterLanguages());
        // 排序字段下拉菜单变化
        document.getElementById('sort-field-select').addEventListener('change', (e) => {
            this.sortLanguages(e.target.value, this.currentSortOrder);
        });
        // 排序顺序按钮点击
        document.getElementById('sort-order-btn').addEventListener('click', () => {
            const newOrder = this.currentSortOrder === 'asc' ? 'desc' : 'asc';
            this.sortLanguages(this.currentSortField, newOrder);
            // 更新按钮图标和文本
            this.updateSortOrderButton();
        });
        // 上一页
        document.getElementById('prev-page').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderLanguageGrid();
                this.updatePagination();
            }
        });
        // 下一页
        document.getElementById('next-page').addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredLanguages.length / this.pageSize);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderLanguageGrid();
                this.updatePagination();
            }
        });
    },

    /**
     * 6.5 更新排序顺序按钮显示
     */
    updateSortOrderButton() {
        const btn = document.getElementById('sort-order-btn');
        if (this.currentSortOrder === 'asc') {
            btn.innerHTML = '<i class="bi bi-sort-up"></i> 升序';
            btn.title = '切换为降序';
        } else {
            btn.innerHTML = '<i class="bi bi-sort-down"></i> 降序';
            btn.title = '切换为升序';
        }
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    languageStore.init();
    // 设置排序下拉菜单的默认值
    document.getElementById('sort-field-select').value = languageStore.currentSortField;
    // 更新排序按钮显示
    languageStore.updateSortOrderButton();
});