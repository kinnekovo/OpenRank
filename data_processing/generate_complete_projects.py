#!/usr/bin/env python3
"""
生成完整的projects.csv文件，包含所有29个维度的原始数据指标
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from github_data_loader import GitHubDataLoader
import pandas as pd
import json
from datetime import datetime

def main():
    print("=== 开始生成完整的projects.csv文件 ===")
    
    # 初始化数据加载器
    loader = GitHubDataLoader()
    
    # 加载所有项目数据
    print("正在加载所有项目数据...")
    all_projects = loader.load_all_projects()
    
    if not all_projects:
        print("❌ 没有找到任何项目数据")
        return
    
    print(f"✅ 成功加载了 {len(all_projects)} 个项目的数据")
    
    # 创建完整的项目DataFrame
    print("正在处理项目数据...")
    projects_df = loader.create_projects_dataframe(all_projects)
    
    if projects_df.empty:
        print("❌ 项目数据处理失败")
        return
    
    print(f"✅ 成功处理了 {len(projects_df)} 个项目的数据")
    
    # 保存到CSV文件
    output_path = "data/projects_complete.csv"
    os.makedirs("data", exist_ok=True)
    
    projects_df.to_csv(output_path, index=False)
    print(f"✅ 已保存完整项目数据到: {output_path}")
    
    # 显示数据概览
    print("\n=== 数据概览 ===")
    print(f"项目总数: {len(projects_df)}")
    print(f"数据列数: {len(projects_df.columns)}")
    print(f"数据列: {list(projects_df.columns)}")
    
    # 显示前几行数据
    print("\n=== 前5个项目数据预览 ===")
    pd.set_option('display.max_columns', None)
    pd.set_option('display.width', None)
    print(projects_df.head())
    
    # 统计信息
    print("\n=== 统计信息 ===")
    print(f"编程语言分布:")
    language_counts = projects_df['language'].value_counts()
    print(language_counts.head(10))
    
    print(f"\nOpenRank分布:")
    print(f"最高: {projects_df['latest_openrank'].max():.2f}")
    print(f"平均: {projects_df['latest_openrank'].mean():.2f}")
    print(f"最低: {projects_df['latest_openrank'].min():.2f}")
    
    print(f"\n综合影响力分数分布:")
    print(f"最高: {projects_df['influence_score'].max():.2f}")
    print(f"平均: {projects_df['influence_score'].mean():.2f}")
    print(f"最低: {projects_df['influence_score'].min():.2f}")
    
    # 显示数据完整性检查
    print("\n=== 数据完整性检查 ===")
    missing_data = projects_df.isnull().sum()
    if missing_data.sum() > 0:
        print("缺失数据统计:")
        print(missing_data[missing_data > 0])
    else:
        print("✅ 数据完整性良好，无缺失值")
    
    print("\n=== 生成完成 ===")

if __name__ == "__main__":
    main()