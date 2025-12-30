# 开源项目技术趋势与影响力分析平台

## 项目概述

这是一个基于HTML+CSS+JavaScript的开源项目技术趋势与影响力分析平台，旨在为企业OSPO团队、开源项目维护者、开发者以及开源社区研究者提供技术选型、项目影响力评估和趋势预测服务。

## 核心功能

- **技术趋势分析**：多维度展示编程语言、框架、工具的技术发展趋势
- **项目影响力分析**：基于OpenRank、stars、fork等指标评估项目影响力
- **自然语言交互**：通过MaxKB实现智能问答查询
- **趋势预测**：基于LSTM模型预测未来技术发展趋势
- **可视化仪表盘**：集成DataEase提供丰富的图表展示

## 技术架构

### 分层设计
- **数据层**：ClickHouse + GitHub数据集
- **处理层**：Python + OpenDigger + 机器学习模型
- **服务层**：MaxKB + 简易HTTP服务
- **应用层**：HTML + CSS + JavaScript + DataEase

### 技术栈
- 数据处理：Python (pandas, scikit-learn, TensorFlow)
- 数据库：ClickHouse
- 可视化：DataEase
- 前端：HTML + CSS + JavaScript
- 问答系统：MaxKB

## 快速开始

### 环境要求
- Docker (用于部署DataEase和ClickHouse)
- Python 3.8+
- 现代浏览器

### 安装步骤

1. 克隆项目
```bash
git clone <repository-url>
cd openrank-analysis-platform
```

2. 启动数据服务
```bash
docker-compose up -d
```

3. 运行数据处理脚本
```bash
python data_processing/main.py
```

4. 启动前端服务
```bash
python -m http.server 8000
```

5. 访问平台
打开浏览器访问：http://localhost:8000

## 项目结构

```
openrank-analysis-platform/
├── data_processing/          # 数据处理模块
│   ├── main.py              # 主处理脚本
│   ├── data_cleaning.py     # 数据清洗
│   ├── keyword_mining.py    # 关键词挖掘
│   ├── trend_analysis.py    # 趋势分析
│   ├── lstm_model.py        # LSTM预测模型
│   └── config.py           # 配置文件
├── frontend/                # 前端页面
│   ├── index.html          # 主页面
│   ├── styles/             # 样式文件
│   ├── scripts/            # JavaScript脚本
│   └── assets/             # 静态资源
├── data/                   # 数据文件
│   ├── raw/               # 原始数据
│   ├── processed/         # 处理后数据
│   └── models/            # 训练模型
├── dashboard/              # DataEase仪表盘
├── docker/                # Docker配置
└── docs/                  # 项目文档
```

## 使用指南

### 技术趋势分析
1. 选择时间范围和编程语言
2. 查看趋势图表和排名
3. 对比不同技术的热度变化

### 项目影响力分析
1. 按语言筛选项目
2. 查看影响力排名
3. 分析影响力归因因素

### 智能问答
1. 输入自然语言问题
2. 获取基于数据的回答
3. 查看查询历史

### 趋势预测
1. 查看预测模型生成的趋势图
2. 了解潜在爆发性技术
3. 获取衰退期技术预警

## 贡献指南

欢迎提交Issue和Pull Request来帮助改进项目。

## 许可证

本项目采用MIT许可证。

## 联系方式

如有问题，请通过Issue联系我们。