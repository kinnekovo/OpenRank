#!/usr/bin/env python3
"""调试CSV生成过程"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from github_data_loader import GitHubDataLoader
import pandas as pd

def debug_csv_generation():
    """调试CSV生成过程"""
    print("=== 调试CSV生成过程 ===")
    
    # 初始化数据加载器
    loader = GitHubDataLoader()
    
    # 加载单个项目的所有数据
    print("正在加载 apache/arrow 项目数据...")
    project_data = loader.load_project_data("apache", "arrow")
    
    if not project_data:
        print("❌ 项目数据加载失败")
        return
    
    print("✅ 项目数据加载成功")
    
    # 创建项目DataFrame
    print("\n=== 创建项目DataFrame ===")
    projects_list = []
    
    # 提取基本项目信息
    project_info = {
        'repo_name': project_data['repo_full_name'],
        'updated_at': project_data.get('meta', {}).get('updatedAt', 0)
    }
    
    # 获取编程语言
    repo_name = project_data['repo'].lower()
    language_mapping = loader.get_project_languages()
    project_info['language'] = language_mapping.get(repo_name, 'Unknown')
    
    print(f"基本信息: {project_info}")
    
    # 获取所有指标的latest值
    core_metrics = ['stars', 'activity', 'openrank', 'attention', 'bus_factor']
    for metric_name in core_metrics:
        metric_data = project_data.get(metric_name, {})
        print(f"\n=== 处理 {metric_name} 指标 ===")
        print(f"原始数据存在: {bool(metric_data)}")
        
        if metric_data:
            # 获取最新的值（排除raw数据）
            clean_data = {k: v for k, v in metric_data.items() if not k.endswith('-raw')}
            print(f"过滤raw后数据条目数: {len(clean_data)}")
            
            if clean_data:
                latest_value = list(clean_data.values())[-1]
                print(f"最新{metric_name}值: {latest_value}")
                project_info[f'latest_{metric_name}'] = latest_value
            else:
                print(f"⚠️  没有clean数据，设置latest_{metric_name}为0")
                project_info[f'latest_{metric_name}'] = 0
        else:
            print(f"⚠️  没有{metric_name}数据，设置latest_{metric_name}为0")
            project_info[f'latest_{metric_name}'] = 0
    
    print(f"\n=== 最终项目信息 ===")
    for key, value in project_info.items():
        print(f"{key}: {value}")
    
    # 添加到列表并创建DataFrame
    projects_list.append(project_info)
    projects_df = pd.DataFrame(projects_list)
    
    print(f"\n=== DataFrame检查 ===")
    print(projects_df.head())
    print(f"\nOpenRank相关列的值:")
    for col in projects_df.columns:
        if 'openrank' in col:
            print(f"{col}: {projects_df[col].iloc[0]}")

if __name__ == "__main__":
    debug_csv_generation()