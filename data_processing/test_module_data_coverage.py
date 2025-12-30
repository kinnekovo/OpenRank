#!/usr/bin/env python3
"""
测试CSV文件与功能模块数据需求匹配度
验证生成的CSV文件是否满足5个功能模块的数据需求
"""

import pandas as pd
import os
from datetime import datetime

def test_module_data_coverage():
    """测试各模块数据需求覆盖情况"""
    print("=== 功能模块数据需求匹配度测试 ===\n")
    
    data_dir = 'data/processed'
    
    # 1. 技术趋势分析模块需求测试
    print("1. 技术趋势分析模块数据需求验证:")
    test_technology_trends(data_dir)
    
    # 2. 项目影响力分析模块需求测试  
    print("\n2. 项目影响力分析模块数据需求验证:")
    test_influence_analysis(data_dir)
    
    # 3. 自然语言交互查询模块需求测试
    print("\n3. 自然语言交互查询模块数据需求验证:")
    test_nlp_interaction(data_dir)
    
    # 4. 技术趋势预测模块需求测试
    print("\n4. 技术趋势预测模块数据需求验证:")
    test_trend_prediction(data_dir)
    
    # 5. 可视化与报告生成模块需求测试
    print("\n5. 可视化与报告生成模块数据需求验证:")
    test_visualization_reports(data_dir)
    
    print("\n=== 数据覆盖度总结 ===")

def test_technology_trends(data_dir):
    """测试技术趋势分析模块"""
    print("  📊 多维度趋势展示:")
    
    # 语言趋势数据验证
    try:
        lang_df = pd.read_csv(f'{data_dir}/language_trends_detailed.csv')
        print(f"    ✅ 语言趋势数据: {len(lang_df)}条记录，覆盖{lang_df['language'].nunique()}种语言")
        print(f"       - 时间范围: {lang_df['date'].min()} 到 {lang_df['date'].max()}")
        print(f"       - 支持趋势方向分析: {set(lang_df['trend_direction'])}")
        print(f"       - 包含指标: {list(lang_df.columns)[2:7]}")
    except Exception as e:
        print(f"    ❌ 语言趋势数据加载失败: {e}")
    
    # 关键词趋势数据验证
    try:
        keyword_df = pd.read_csv(f'{data_dir}/keyword_trends.csv')
        print(f"    ✅ 关键词趋势数据: {len(keyword_df)}条记录，覆盖{keyword_df['keyword_category'].nunique()}个类别")
        print(f"       - 关键词类别: {list(keyword_df['keyword_category'].unique())}")
        print(f"       - 支持竞争度分析: {keyword_df['competitiveness'].max():.2f} (最高)")
    except Exception as e:
        print(f"    ❌ 关键词趋势数据加载失败: {e}")
    
    # 技术成熟度数据验证
    try:
        maturity_df = pd.read_csv(f'{data_dir}/technology_maturity.csv')
        maturity_counts = maturity_df['maturity_stage'].value_counts()
        print(f"    ✅ 技术成熟度数据: {len(maturity_df)}条记录")
        print(f"       - 成熟度分布: {dict(maturity_counts)}")
        print(f"       - 支持风险评估: {set(maturity_df['risk_level'])}")
    except Exception as e:
        print(f"    ❌ 技术成熟度数据加载失败: {e}")

def test_influence_analysis(data_dir):
    """测试项目影响力分析模块"""
    print("  🏆 影响力分析:")
    
    try:
        influence_df = pd.read_csv(f'{data_dir}/influence_ranking.csv')
        print(f"    ✅ 影响力排名数据: {len(influence_df)}条记录")
        print(f"       - 排名等级分布: {dict(influence_df['influence_tier'].value_counts())}")
        print(f"       - 支持多维评分: stars({influence_df['stars_score'].max():.1f}), OpenRank({influence_df['openrank_score'].max():.1f}), Activity({influence_df['activity_score'].max():.1f})")
        print(f"       - 趋势分析支持: {set(influence_df['influence_trend'])}")
        print(f"       - 社区健康度评估: {set(influence_df['community_health'])}")
    except Exception as e:
        print(f"    ❌ 影响力排名数据加载失败: {e}")

def test_nlp_interaction(data_dir):
    """测试自然语言交互查询模块"""
    print("  💬 智能问答:")
    
    try:
        faq_df = pd.read_csv(f'{data_dir}/faq_dataset.csv')
        print(f"    ✅ FAQ数据: {len(faq_df)}条记录")
        print(f"       - 覆盖类别: {list(faq_df['category'].unique())}")
        print(f"       - 平均置信度: {faq_df['confidence'].mean():.2f}")
        print(f"       - 支持图表关联: {len(faq_df['related_charts'].unique())}种")
        print("       - 典型问答示例:")
        for i, row in faq_df.head(3).iterrows():
            print(f"         Q: {row['question']}")
            print(f"         A: {row['answer'][:50]}...")
    except Exception as e:
        print(f"    ❌ FAQ数据加载失败: {e}")

def test_trend_prediction(data_dir):
    """测试技术趋势预测模块"""
    print("  🔮 趋势预测:")
    
    # 技术成熟度数据包含预测信息
    try:
        maturity_df = pd.read_csv(f'{data_dir}/technology_maturity.csv')
        print(f"    ✅ 预测数据支持:")
        print(f"       - 6个月预测: {set(maturity_df['prediction_6m'])}")
        print(f"       - 12个月预测: {set(maturity_df['prediction_12m'])}")
        print(f"       - 增长潜力评估: {maturity_df['growth_rate'].min():.2f} 到 {maturity_df['growth_rate'].max():.2f}")
        print(f"       - 风险预警支持: {len(maturity_df[maturity_df['risk_level'] == 'high'])} 个高风险技术")
    except Exception as e:
        print(f"    ❌ 预测数据加载失败: {e}")
    
    # 关键词趋势支持市场预测
    try:
        keyword_df = pd.read_csv(f'{data_dir}/keyword_trends.csv')
        print(f"    ✅ 市场趋势分析: 支持{keyword_df['keyword_category'].nunique()}个技术类别的市场预测")
    except Exception as e:
        print(f"    ❌ 市场趋势数据加载失败: {e}")

def test_visualization_reports(data_dir):
    """测试可视化与报告生成模块"""
    print("  📊 仪表盘数据:")
    
    try:
        dashboard_df = pd.read_csv(f'{data_dir}/dashboard_summary.csv')
        print(f"    ✅ 仪表盘汇总: {len(dashboard_df)}项核心指标")
        print(f"       - 核心指标包括:")
        for _, row in dashboard_df.iterrows():
            print(f"         * {row['metric_name']}: {row['metric_value']} ({row['metric_description']})")
    except Exception as e:
        print(f"    ❌ 仪表盘数据加载失败: {e}")

def analyze_data_quality():
    """分析数据质量"""
    print("\n=== 数据质量分析 ===")
    
    data_dir = 'data/processed'
    csv_files = [
        'language_trends_detailed.csv',
        'keyword_trends.csv', 
        'technology_maturity.csv',
        'influence_ranking.csv',
        'faq_dataset.csv',
        'dashboard_summary.csv'
    ]
    
    total_records = 0
    for file in csv_files:
        try:
            df = pd.read_csv(f'{data_dir}/{file}')
            total_records += len(df)
            print(f"✅ {file}: {len(df)}条记录，{len(df.columns)}个字段")
        except Exception as e:
            print(f"❌ {file}: 加载失败 - {e}")
    
    print(f"\n总计数据记录: {total_records}条")
    print(f"平均每文件: {total_records/len(csv_files):.0f}条记录")

if __name__ == "__main__":
    test_module_data_coverage()
    analyze_data_quality()