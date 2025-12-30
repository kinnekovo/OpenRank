import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
from pathlib import Path

# 添加当前目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import *
from github_data_loader import GitHubDataLoader

# 确保logs目录存在（必须在日志配置之前）
Path('./logs').mkdir(parents=True, exist_ok=True)

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('./logs/processing.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class DataProcessor:
    """数据处理核心类"""
    
    def __init__(self):
        """初始化数据处理器"""
        self.setup_directories()
        self.github_loader = GitHubDataLoader()
        logger.info("数据处理器初始化完成")
    
    def setup_directories(self):
        """创建必要的目录结构"""
        directories = [
            './data/raw',
            './data/processed',
            './data/models',
            './logs',
            './frontend/scripts',
            './frontend/styles'
        ]
        
        for directory in directories:
            Path(directory).mkdir(parents=True, exist_ok=True)
        
        logger.info("目录结构创建完成")
    
    def load_github_data(self):
        """加载GitHub开源数据集"""
        try:
            logger.info("开始加载GitHub真实数据...")
            
            # 使用GitHub数据加载器加载真实数据
            projects_data = self.github_loader.load_all_projects()
            
            if not projects_data or len(projects_data) == 0:
                logger.error("未能加载到任何项目数据")
                return False
            
            # 创建项目DataFrame
            self.projects_df = self.github_loader.create_projects_dataframe(projects_data)
            
            # 创建时间序列DataFrame
            self.time_series_df = self.github_loader.create_time_series_dataframe(projects_data)
            
            # 添加语言信息（根据项目名称推断）
            language_mapping = self.github_loader.get_project_languages()
            
            def get_language(repo_name):
                repo = repo_name.split('/')[-1].lower()
                return language_mapping.get(repo, 'Unknown')
            
            self.projects_df['language'] = self.projects_df['repo_full_name'].apply(get_language)
            
            # 为时间序列数据添加语言信息
            if not self.time_series_df.empty:
                self.time_series_df['language'] = self.time_series_df['repo_full_name'].apply(get_language)
            
            logger.info(f"成功加载了 {len(self.projects_df)} 个项目数据")
            logger.info(f"成功加载了 {len(self.time_series_df)} 条时间序列数据")
            
            return True
            
        except Exception as e:
            logger.error(f"数据加载失败: {str(e)}")
            return False
    

    
    def save_processed_data(self):
        """保存处理后的数据"""
        try:
            # 保存项目基础数据
            if hasattr(self, 'projects_df') and not self.projects_df.empty:
                self.projects_df.to_csv('./data/processed/projects.csv', index=False, encoding='utf-8')
                logger.info("项目数据已保存")
            
            # 保存时序数据
            if hasattr(self, 'time_series_df') and not self.time_series_df.empty:
                self.time_series_df.to_csv('./data/processed/time_series.csv', index=False, encoding='utf-8')
                logger.info("时间序列数据已保存")
            
            logger.info("数据保存完成")
            return True
            
        except Exception as e:
            logger.error(f"数据保存失败: {str(e)}")
            return False
    
    def calculate_influence_metrics(self):
        """计算影响力指标"""
        logger.info("计算影响力指标...")
        
        # 计算综合影响力得分
        # 使用最新的指标值
        self.projects_df['influence_score'] = (
            self.projects_df['latest_openrank'] * WEIGHT_OPENRANK +
            (self.projects_df['total_stars'] / self.projects_df['total_stars'].max()) * 10 * WEIGHT_STARS +
            (self.projects_df['latest_activity'] / self.projects_df['latest_activity'].max()) * 10 * WEIGHT_FORKS
        ).round(2)
        
        # 按语言分组计算平均影响力
        if 'language' in self.projects_df.columns:
            language_stats = self.projects_df.groupby('language').agg({
                'total_stars': 'mean',
                'latest_activity': 'mean',
                'latest_openrank': 'mean',
                'latest_attention': 'mean',
                'influence_score': 'mean',
                'repo_full_name': 'count'
            }).round(2)
            language_stats.columns = ['avg_stars', 'avg_activity', 'avg_openrank', 'avg_attention', 'avg_influence_score', 'project_count']
            
            self.language_stats = language_stats.reset_index()
        else:
            # 如果没有语言信息，创建空的语言统计数据
            self.language_stats = pd.DataFrame(columns=['language', 'avg_stars', 'avg_activity', 'avg_openrank', 'avg_attention', 'avg_influence_score', 'project_count'])
        
        # 计算技术成熟度
        self.calculate_maturity_score()
        
        logger.info("影响力指标计算完成")
        return True
    
    def calculate_maturity_score(self):
        """计算技术成熟度"""
        logger.info("计算技术成熟度...")
        
        # 为每种语言计算成熟度
        maturity_data = []
        
        for _, lang_data in self.language_stats.iterrows():
            language = lang_data['language']
            
            # 基于项目数量、平均stars、增长率等判断成熟度
            project_count = lang_data['project_count']
            avg_stars = lang_data['avg_stars']
            avg_influence = lang_data['avg_influence_score']
            
            # 计算综合得分
            maturity_score = (
                min(1.0, project_count / 10) * 0.3 +
                min(1.0, avg_stars / 100000) * 0.4 +
                min(1.0, avg_influence / 10) * 0.3
            )
            
            # 判断成熟度阶段
            if maturity_score >= MATURITY_THRESHOLDS['mature']:
                stage = 'mature'
            elif maturity_score >= MATURITY_THRESHOLDS['growing']:
                stage = 'growing'
            elif maturity_score >= MATURITY_THRESHOLDS['emerging']:
                stage = 'emerging'
            else:
                stage = 'emerging'
            
            maturity_data.append({
                'language': language,
                'maturity_score': round(maturity_score, 3),
                'stage': stage,
                'project_count': project_count,
                'avg_stars': int(avg_stars)
            })
        
        self.maturity_df = pd.DataFrame(maturity_data)
        
        # 合并到语言统计数据中
        self.language_stats = self.language_stats.merge(
            self.maturity_df[['language', 'maturity_score', 'stage']], 
            on='language'
        )
        
        logger.info("技术成熟度计算完成")
    
    def generate_trend_data(self):
        """生成趋势数据"""
        logger.info("生成趋势数据...")
        
        # 如果有时间序列数据，按语言和月份聚合数据
        if hasattr(self, 'time_series_df') and not self.time_series_df.empty and 'language' in self.time_series_df.columns:
            monthly_trends = self.time_series_df.groupby(['language', pd.Grouper(key='date', freq='ME')]).agg({
                'value': 'sum'
            }).reset_index()
            
            # 重命名列
            monthly_trends.columns = ['language', 'date', 'total_value']
            
            # 计算增长率
            for language in monthly_trends['language'].unique():
                lang_data = monthly_trends[monthly_trends['language'] == language].copy()
                lang_data = lang_data.sort_values('date')
                
                # 计算月增长率
                lang_data['growth_rate'] = lang_data['total_value'].pct_change().fillna(0)
                
                monthly_trends.update(lang_data)
            
            self.trends_df = monthly_trends
            
            # 生成语言热度排名
            latest_trends = self.trends_df[self.trends_df['date'] == self.trends_df['date'].max()]
            self.language_ranking = latest_trends.sort_values('total_value', ascending=False)[
                ['language', 'total_value']
            ].reset_index(drop=True)
            
            # 添加增长率列
            if 'growth_rate' in latest_trends.columns:
                self.language_ranking['growth_rate'] = latest_trends['growth_rate']
            else:
                self.language_ranking['growth_rate'] = 0.0
            
        else:
            # 如果没有时间序列数据，使用语言统计数据创建基础趋势
            if hasattr(self, 'language_stats') and not self.language_stats.empty:
                self.language_ranking = self.language_stats[['language', 'avg_influence_score']].copy()
                self.language_ranking.columns = ['language', 'total_value']
                self.language_ranking['growth_rate'] = 0.0
            else:
                self.trends_df = pd.DataFrame()
                self.language_ranking = pd.DataFrame(columns=['language', 'total_value', 'growth_rate'])
        
        logger.info("趋势数据生成完成")
    
    def run_full_pipeline(self):
        """运行完整的数据处理流水线"""
        logger.info("开始运行完整数据处理流水线...")
        
        try:
            # 1. 加载数据
            if not self.load_github_data():
                return False
            
            # 2. 保存原始处理后的数据
            self.save_processed_data()
            
            # 3. 计算影响力指标
            self.calculate_influence_metrics()
            
            # 4. 生成趋势数据
            self.generate_trend_data()
            
            # 5. 保存所有结果
            self.projects_df.to_csv('./data/processed/projects.csv', index=False, encoding='utf-8')
            self.language_stats.to_csv('./data/processed/language_stats.csv', index=False, encoding='utf-8')
            self.trends_df.to_csv('./data/processed/trends.csv', index=False, encoding='utf-8')
            self.language_ranking.to_csv('./data/processed/language_ranking.csv', index=False, encoding='utf-8')
            self.maturity_df.to_csv('./data/processed/maturity.csv', index=False, encoding='utf-8')
            
            logger.info("数据处理流水线完成！")
            
            # 输出统计信息
            print("\n=== 数据处理完成统计 ===")
            print(f"项目总数: {len(self.projects_df)}")
            print(f"编程语言数: {len(self.language_stats)}")
            print(f"时序数据点: {len(self.time_series_df)}")
            print(f"趋势数据点: {len(self.trends_df)}")
            print(f"数据保存位置: ./data/processed/")
            
            return True
            
        except Exception as e:
            logger.error(f"数据处理流水线失败: {str(e)}")
            return False

def main():
    """主函数"""
    processor = DataProcessor()
    success = processor.run_full_pipeline()
    
    if success:
        print("\n✅ 数据处理完成！可以开始下一步：开发关键词挖掘模块")
    else:
        print("\n❌ 数据处理失败，请检查日志")
        sys.exit(1)

if __name__ == "__main__":
    main()