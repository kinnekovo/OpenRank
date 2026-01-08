/**
 * 项目列表页 - 独立JS逻辑
 * 功能：CSV数据加载、筛选、分页、项目卡片渲染
 */

// 1. 全局状态管理（集中管理数据和分页状态）
const projectStore = {
    allProjects: [],        // 所有项目原始数据
    filteredProjects: [],   // 筛选后的数据
    currentPage: 1,         // 当前页码
    pageSize: 10,           // 每页显示数量
    init() {
        // 初始化：加载数据 + 绑定事件
        this.loadProjectData();
        this.bindEvents();
    },

    /**
     * 2. 加载project_complete.csv数据
     */
    loadProjectData() {
        const csvPath = '../data/projects_complete.csv'; // 确保CSV路径与HTML同级
        Papa.parse(csvPath, {
            download: true,
            header: true,
            complete: (results) => {
                this.allProjects = results.data;
                this.filteredProjects = [...this.allProjects]; // 初始为全部数据
                this.fillLanguageOptions(); // 填充编程语言下拉框
                this.renderProjectGrid();   // 渲染项目卡片
                this.updatePagination();    // 更新分页信息
            },
            error: () => {
                document.getElementById('project-grid').innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px 0; color: var(--danger);">
                        项目数据加载失败，请检查CSV文件路径！
                    </div>
                `;
            }
        });
    },

    /**
     * 3. 填充编程语言下拉选项（去重 + 排序）
     */
    fillLanguageOptions() {
        const languageSelect = document.getElementById('language-filter');
        // 提取所有语言并去重
        const languages = [...new Set(this.allProjects.map(item => item.language || 'Unknown'))];
        languages.sort((a, b) => a.localeCompare(b)); // 按字母排序

        // 动态添加选项
        languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang;
            option.textContent = lang;
            languageSelect.appendChild(option);
        });
    },

    /**
     * 4. 渲染项目豆腐块（核心布局：复用metric-card样式）
     */
    renderProjectGrid() {
        const gridContainer = document.getElementById('project-grid');
        gridContainer.innerHTML = '';

        // 计算当前页数据范围
        const startIdx = (this.currentPage - 1) * this.pageSize;
        const currentData = this.filteredProjects.slice(startIdx, startIdx + this.pageSize);

        // 无数据时显示提示
        if (currentData.length === 0) {
            gridContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px 0; color: var(--gray-400);">
                    暂无匹配的项目数据
                </div>
            `;
            return;
        }

        // 渲染每个项目卡片
        currentData.forEach(project => {
            const repoName = project.repo_name || '未知项目';
            const language = project.language || 'Unknown';
            const stars = project.latest_stars || '0';
            const activity = (Number(project.latest_activity) || 0).toFixed(2);
            // 语言→领域映射（与需求一致）
            const fieldMap = {
                'Python': 'AI/ML', 'JavaScript': 'Web开发', 'TypeScript': 'Web开发',
                'Java': '后端开发', 'Go': '后端开发', 'C++': '工具类',
                'Dart': '移动开发', 'Rust': '后端开发', 'Ruby': 'Web开发'
            };
            const field = fieldMap[language] || '工具类';

            // 创建豆腐块卡片（复用style.css的metric-card样式）
            const card = document.createElement('div');
            card.className = 'metric-card';
            card.style.cursor = 'pointer';
            card.innerHTML = `
                <div class="card-icon bg-primary">
                    <i class="bi bi-github"></i>
                </div>
                <div class="card-content">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <h3 style="font-size: 1rem; color: var(--gray-600);">${repoName}</h3>
                        <span style="background: var(--light); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; color: var(--gray-500);">${field}</span>
                    </div>
                    <div style="display: flex; gap: 16px; margin-bottom: 8px;">
                        <div>
                            <div class="card-title">收藏数</div>
                            <div class="card-value" style="font-size: 1.2rem;">${stars}</div>
                        </div>
                        <div>
                            <div class="card-title">编程语言</div>
                            <div class="card-value" style="font-size: 1.2rem;">${language}</div>
                        </div>
                    </div>
                    <div>
                        <div class="card-title">活跃度得分</div>
                        <div class="card-value" style="font-size: 1.2rem;">${activity}</div>
                    </div>
                </div>
            `;

            // 点击跳转详情页（URL编码项目名，避免特殊字符问题）
            card.addEventListener('click', () => {
                const encodedRepo = encodeURIComponent(repoName);
                window.location.href = `detail.html?repo=${encodedRepo}`;
            });

            gridContainer.appendChild(card);
        });
    },

    /**
     * 5. 更新分页信息（页码、按钮禁用状态）
     */
    updatePagination() {
        const totalPages = Math.ceil(this.filteredProjects.length / this.pageSize);
        document.getElementById('page-info').textContent = `第 ${this.currentPage} 页 / 共 ${totalPages} 页`;
        
        // 禁用/启用分页按钮
        document.getElementById('prev-page').disabled = this.currentPage === 1;
        document.getElementById('next-page').disabled = this.currentPage === totalPages;
    },

    /**
     * 6. 筛选逻辑（多条件：项目名+语言+领域）
     */
    filterProjects() {
        const searchVal = document.getElementById('project-search').value.toLowerCase().trim();
        const selectedLang = document.getElementById('language-filter').value;
        const selectedField = document.getElementById('field-filter').value;

        // 多条件筛选
        this.filteredProjects = this.allProjects.filter(project => {
            const repoName = (project.repo_name || '').toLowerCase();
            const language = project.language || 'Unknown';
            const fieldMap = {
                'Python': 'AI/ML', 'JavaScript': 'Web开发', 'TypeScript': 'Web开发',
                'Java': '后端开发', 'Go': '后端开发', 'C++': '工具类',
                'Dart': '移动开发', 'Rust': '后端开发', 'Ruby': 'Web开发'
            };
            const field = fieldMap[language] || '工具类';

            // 满足所有筛选条件
            const matchSearch = repoName.includes(searchVal);
            const matchLang = selectedLang ? language === selectedLang : true;
            const matchField = selectedField ? field === selectedField : true;

            return matchSearch && matchLang && matchField;
        });

        // 筛选后重置到第一页
        this.currentPage = 1;
        this.renderProjectGrid();
        this.updatePagination();
    },

    /**
     * 7. 绑定所有交互事件（集中管理，便于维护）
     */
    bindEvents() {
        // 搜索按钮点击
        document.getElementById('search-btn').addEventListener('click', () => this.filterProjects());
        // 搜索框回车键
        document.getElementById('project-search').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.filterProjects();
        });
        // 搜索框输入时实时筛选
        document.getElementById('project-search').addEventListener('input', () => this.filterProjects());
        // 语言筛选变更
        document.getElementById('language-filter').addEventListener('change', () => this.filterProjects());
        // 领域筛选变更
        document.getElementById('field-filter').addEventListener('change', () => this.filterProjects());
        // 上一页
        document.getElementById('prev-page').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderProjectGrid();
                this.updatePagination();
            }
        });
        // 下一页
        document.getElementById('next-page').addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredProjects.length / this.pageSize);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderProjectGrid();
                this.updatePagination();
            }
        });
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    projectStore.init();
});