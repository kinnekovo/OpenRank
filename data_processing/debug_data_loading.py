#!/usr/bin/env python3
"""
调试数据加载过程，检查apache/arrow项目的原始数据
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from github_data_loader import GitHubDataLoader
import json

def debug_project_data():
    print("=== 调试数据加载过程 ===")
    
    # 初始化数据加载器
    loader = GitHubDataLoader()
    
    # 加载单个项目的所有数据
    print("正在加载 apache/arrow 项目数据...")
    project_data = loader.load_project_data("apache", "arrow")
    
    if not project_data:
        print("❌ 项目数据加载失败")
        return
    
    print(f"✅ 成功加载项目数据")
    print(f"项目路径: {loader.data_path / 'apache' / 'arrow'}")
    print(f"项目结构: {list(project_data.keys())}")
    
    # 检查OpenRank数据
    print("\n=== OpenRank数据检查 ===")
    openrank_data = project_data.get('openrank', {})
    print(f"OpenRank数据存在: {bool(openrank_data)}")
    if openrank_data:
        print(f"OpenRank数据条目数: {len(openrank_data)}")
        print(f"前5个条目: {list(openrank_data.items())[:5]}")
        print(f"后5个条目: {list(openrank_data.items())[-5:]}")
        
        # 获取最新值
        clean_data = {k: v for k, v in openrank_data.items() if not k.endswith('-raw')}
        if clean_data:
            sorted_items = sorted(clean_data.items())
            latest_date, latest_value = sorted_items[-1]
            print(f"最新OpenRank值: {latest_date} = {latest_value}")
        else:
            print("⚠️ 没有有效的OpenRank数据")
    
    # 检查所有可用的数据文件
    print("\n=== 可用的数据文件检查 ===")
    project_path = loader.data_path / "apache" / "arrow"
    if project_path.exists():
        print(f"项目路径存在: {project_path}")
        for metric_name, filename in loader.metrics_files.items():
            file_path = project_path / filename
            exists = file_path.exists()
            print(f"{metric_name}: {filename} - {'✅' if exists else '❌'}")
    else:
        print(f"❌ 项目路径不存在: {project_path}")
    
    # 检查生成的数据结构
    print("\n=== 生成的项目数据结构 ===")
    projects_data = [project_data]
    projects_df = loader.create_projects_dataframe(projects_data)
    
    if not projects_df.empty:
        print("✅ DataFrame生成成功")
        print(f"DataFrame列: {list(projects_df.columns)}")
        print(f"OpenRank列值: {projects_df['latest_openrank'].values}")
        
        # 显示完整的项目信息
        print("\n=== 完整项目信息 ===")
        for col in projects_df.columns:
            value = projects_df[col].iloc[0]
            print(f"{col}: {value}")
    else:
        print("❌ DataFrame生成失败")

if __name__ == "__main__":
    debug_project_data()