/**
 * 技术关键词列表页 - 独立JS逻辑
 * 功能：CSV数据加载、筛选、分页、排序、技术关键词卡片渲染
 */

// 1. 全局状态管理（集中管理数据和分页状态）
const keywordStore = {
    allKeywords: [],        // 所有技术关键词原始数据
    filteredKeywords: [],   // 筛选后的数据
    currentPage: 1,         // 当前页码
    pageSize: 10,           // 每页显示数量
    currentSortField: 'keyword_category', // 当前排序字段
    currentSortOrder: 'desc', // 当前排序顺序
    init() {
        // 初始化：加载数据 + 绑定事件
        this.loadKeywordData();
        this.bindEvents();
    },

    /**
     * 2. 加载keyword_trends.csv数据
     */
    loadKeywordData() {
        const csvPath = '../data/keyword_trends.csv'; // 确保CSV路径正确
        Papa.parse(csvPath, {
            download: true,
            header: true,
            complete: (results) => {
                // 处理数据：按关键词分组，取最新数据
                const keywordMap = new Map();

                results.data.forEach(item => {
                    const keyword = item.keyword_category;
                    if (!keywordMap.has(keyword)) {
                        keywordMap.set(keyword, {
                            keyword_category: keyword,
                            latest_date: item.date,
                            search_volume: Number(item.search_volume) || 0,
                            mention_count: Number(item.mention_count) || 0,
                            avg_stars_per_mention: Number(item.avg_stars_per_mention) || 0,
                            influence_score: Number(item.influence_score) || 0,
                            trend_direction: item.trend_direction,
                            competitiveness: Number(item.competitiveness) || 0,
                            adoption_rate: Number(item.adoption_rate) || 0
                        });
                    } else {
                        // 更新为更新的数据（按日期比较）
                        const existing = keywordMap.get(keyword);
                        if (item.date > existing.latest_date) {
                            keywordMap.set(keyword, {
                                keyword_category: keyword,
                                latest_date: item.date,
                                search_volume: Number(item.search_volume) || 0,
                                mention_count: Number(item.mention_count) || 0,
                                avg_stars_per_mention: Number(item.avg_stars_per_mention) || 0,
                                influence_score: Number(item.influence_score) || 0,
                                trend_direction: item.trend_direction,
                                competitiveness: Number(item.competitiveness) || 0,
                                adoption_rate: Number(item.adoption_rate) || 0
                            });
                        }
                    }
                });

                this.allKeywords = Array.from(keywordMap.values());
                this.filteredKeywords = [...this.allKeywords]; // 初始为全部数据
                this.sortKeywords(this.currentSortField, this.currentSortOrder); // 应用默认排序
                this.renderKeywordGrid();   // 渲染技术关键词卡片
                this.updatePagination();    // 更新分页信息
            },
            error: () => {
                document.getElementById('keyword-grid').innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px 0; color: var(--danger);">
                        技术关键词数据加载失败，请检查CSV文件路径！
                    </div>
                `;
            }
        });
    },

    /**
     * 2.5 排序技术关键词数据
     */
    sortKeywords(sortField, sortOrder = 'asc') {
        this.currentSortField = sortField;
        this.currentSortOrder = sortOrder;

        this.filteredKeywords.sort((a, b) => {
            let aValue, bValue;

            switch (sortField) {
                case 'keyword_category':
                    aValue = (a.keyword_category || '').toLowerCase();
                    bValue = (b.keyword_category || '').toLowerCase();
                    if (sortOrder === 'asc') {
                        return aValue.localeCompare(bValue);
                    } else {
                        return bValue.localeCompare(aValue);
                    }
                case 'search_volume':
                    aValue = Number(a.search_volume) || 0;
                    bValue = Number(b.search_volume) || 0;
                    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
                case 'mention_count':
                    aValue = Number(a.mention_count) || 0;
                    bValue = Number(b.mention_count) || 0;
                    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
                case 'avg_stars_per_mention':
                    aValue = Number(a.avg_stars_per_mention) || 0;
                    bValue = Number(b.avg_stars_per_mention) || 0;
                    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
                case 'influence_score':
                    aValue = Number(a.influence_score) || 0;
                    bValue = Number(b.influence_score) || 0;
                    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
                case 'competitiveness':
                    aValue = Number(a.competitiveness) || 0;
                    bValue = Number(b.competitiveness) || 0;
                    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
                case 'adoption_rate':
                    aValue = Number(a.adoption_rate) || 0;
                    bValue = Number(b.adoption_rate) || 0;
                    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
                default:
                    return 0;
            }
        });

        // 排序后重置到第一页并重新渲染
        this.currentPage = 1;
        this.renderKeywordGrid();
        this.updatePagination();
    },

    /**
     * 3. 渲染技术关键词豆腐块（核心布局：复用metric-card样式）
     */
    renderKeywordGrid() {
        const gridContainer = document.getElementById('keyword-grid');
        gridContainer.innerHTML = '';

        // 计算当前页数据范围
        const startIdx = (this.currentPage - 1) * this.pageSize;
        const currentData = this.filteredKeywords.slice(startIdx, startIdx + this.pageSize);

        // 无数据时显示提示
        if (currentData.length === 0) {
            gridContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px 0; color: var(--gray-400);">
                    暂无匹配的技术关键词数据
                </div>
            `;
            return;
        }

        // 渲染每个技术关键词卡片
        currentData.forEach(keyword => {
            const keywordName = keyword.keyword_category || '未知关键词';
            const searchVolume = keyword.search_volume || 0;
            const mentionCount = keyword.mention_count || 0;
            const influenceScore = (Number(keyword.influence_score) || 0).toFixed(1);
            const trendDirection = keyword.trend_direction || 'stable';

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
                    <i class="bi bi-tags"></i>
                </div>
                <div class="card-content">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <h3 style="font-size: 1rem; color: var(--gray-600);">${keywordName}</h3>
                        <span style="background: var(--light); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; color: var(--gray-500);">
                            <i class="bi ${trendIcon}"></i>
                        </span>
                    </div>
                    <div style="display: flex; gap: 16px; margin-bottom: 8px;">
                        <div>
                            <div class="card-title">搜索量</div>
                            <div class="card-value" style="font-size: 1.2rem;">${searchVolume}</div>
                        </div>
                        <div>
                            <div class="card-title">提及次数</div>
                            <div class="card-value" style="font-size: 1.2rem;">${mentionCount}</div>
                        </div>
                    </div>
                    <div>
                        <div class="card-title">影响力得分</div>
                        <div class="card-value" style="font-size: 1.2rem;">${influenceScore}</div>
                    </div>
                </div>
            `;

            // 点击跳转详情页（URL编码关键词，避免特殊字符问题）
            card.addEventListener('click', () => {
                const encodedKeyword = encodeURIComponent(keywordName);
                window.location.href = `detail.html?keyword=${encodedKeyword}`;
            });

            gridContainer.appendChild(card);
        });
    },

    /**
     * 4. 更新分页信息（页码、按钮禁用状态）
     */
    updatePagination() {
        const totalPages = Math.ceil(this.filteredKeywords.length / this.pageSize);
        document.getElementById('page-info').textContent = `第 ${this.currentPage} 页 / 共 ${totalPages} 页`;

        // 禁用/启用分页按钮
        document.getElementById('prev-page').disabled = this.currentPage === 1;
        document.getElementById('next-page').disabled = this.currentPage === totalPages;
    },

    /**
     * 5. 筛选逻辑（按关键词名称搜索）
     */
    filterKeywords() {
        const searchVal = document.getElementById('keyword-search').value.toLowerCase().trim();

        // 按关键词名称筛选
        this.filteredKeywords = this.allKeywords.filter(keyword => {
            const keywordName = (keyword.keyword_category || '').toLowerCase();
            return keywordName.includes(searchVal);
        });

        // 筛选后应用当前排序
        this.sortKeywords(this.currentSortField, this.currentSortOrder);

        // 筛选后重置到第一页
        this.currentPage = 1;
        this.renderKeywordGrid();
        this.updatePagination();
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
    },

    /**
     * 7. 绑定所有交互事件（集中管理，便于维护）
     */
    bindEvents() {
        // 搜索按钮点击
        document.getElementById('search-btn').addEventListener('click', () => this.filterKeywords());
        // 搜索框回车键
        document.getElementById('keyword-search').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.filterKeywords();
        });
        // 搜索框输入时实时筛选
        document.getElementById('keyword-search').addEventListener('input', () => this.filterKeywords());
        // 排序字段下拉菜单变化
        document.getElementById('sort-field-select').addEventListener('change', (e) => {
            this.sortKeywords(e.target.value, this.currentSortOrder);
        });
        // 排序顺序按钮点击
        document.getElementById('sort-order-btn').addEventListener('click', () => {
            const newOrder = this.currentSortOrder === 'asc' ? 'desc' : 'asc';
            this.sortKeywords(this.currentSortField, newOrder);
            // 更新按钮图标和文本
            this.updateSortOrderButton();
        });
        // 上一页
        document.getElementById('prev-page').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderKeywordGrid();
                this.updatePagination();
            }
        });
        // 下一页
        document.getElementById('next-page').addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredKeywords.length / this.pageSize);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderKeywordGrid();
                this.updatePagination();
            }
        });
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    keywordStore.init();
    // 设置排序下拉菜单的默认值
    document.getElementById('sort-field-select').value = keywordStore.currentSortField;
    // 更新排序按钮显示
    keywordStore.updateSortOrderButton();
});