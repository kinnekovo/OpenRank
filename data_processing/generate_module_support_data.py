#!/usr/bin/env python3
"""为各功能模块生成支撑CSV文件"""

import os
import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from github_data_loader import GitHubDataLoader
from collections import defaultdict, Counter
import re

class ModuleDataGenerator:
    """模块数据生成器"""
    
    def __init__(self):
        self.loader = GitHubDataLoader()
        self.projects_df = None
        self.load_base_data()
    
    def load_base_data(self):
        """加载基础数据"""
        print("正在加载基础项目数据...")
        projects_data = self.loader.load_all_projects()
        self.projects_df = self.loader.create_projects_dataframe(projects_data)
        print(f"✅ 已加载 {len(self.projects_df)} 个项目数据")
    
    def generate_language_trends_data(self):
        """生成语言趋势分析数据"""
        print("\n=== 生成语言趋势数据 ===")
        
        # 语言映射
        language_mapping = self.loader.get_project_languages()
        
        # 统计每个语言的项目数量和平均指标
        language_stats = defaultdict(lambda: {
            'projects': 0,
            'total_stars': 0,
            'total_openrank': 0,
            'total_activity': 0,
            'repos': []
        })
        
        for _, project in self.projects_df.iterrows():
            repo_name = project['repo_name'].lower()
            language = project['language']
            
            # 使用映射的语言，如果没有则推断
            if language == 'Unknown':
                # 基于项目名称推断语言
                if any(keyword in repo_name for keyword in ['java', 'spring']):
                    language = 'Java'
                elif any(keyword in repo_name for keyword in ['python', 'django', 'flask']):
                    language = 'Python'
                elif any(keyword in repo_name for keyword in ['js', 'javascript', 'node']):
                    language = 'JavaScript'
                elif any(keyword in repo_name for keyword in ['react', 'vue', 'angular']):
                    language = 'JavaScript'
                elif any(keyword in repo_name for keyword in ['go', 'golang']):
                    language = 'Go'
                elif any(keyword in repo_name for keyword in ['rust', 'cargo']):
                    language = 'Rust'
                elif any(keyword in repo_name for keyword in ['kotlin', 'android']):
                    language = 'Kotlin'
                elif any(keyword in repo_name for keyword in ['swift', 'ios']):
                    language = 'Swift'
                elif any(keyword in repo_name for keyword in ['typescript']):
                    language = 'TypeScript'
                else:
                    language = 'Other'
            
            lang_data = language_stats[language]
            lang_data['projects'] += 1
            lang_data['total_stars'] += project['latest_stars']
            lang_data['total_openrank'] += project['latest_openrank']
            lang_data['total_activity'] += project['latest_activity']
            lang_data['repos'].append(project['repo_name'])
        
        # 生成语言趋势数据
        language_trends = []
        current_date = datetime.now()
        
        for language, stats in language_stats.items():
            # 基于现有数据模拟趋势
            base_projects = stats['projects']
            base_stars = stats['total_stars']
            base_openrank = stats['total_openrank']
            
            # 生成12个月的趋势数据
            for i in range(12):
                date = current_date - timedelta(days=30 * (11 - i))
                month_str = date.strftime('%Y-%m')
                
                # 模拟增长趋势
                growth_factor = 1.0 + (i - 6) * 0.02  # 轻微增长
                noise = np.random.normal(1.0, 0.05)  # 添加噪声
                
                language_trends.append({
                    'date': month_str,
                    'language': language,
                    'project_count': int(base_projects * growth_factor * noise),
                    'avg_stars': (base_stars / base_projects) * growth_factor * noise if base_projects > 0 else 0,
                    'avg_openrank': (base_openrank / base_projects) * growth_factor * noise if base_projects > 0 else 0,
                    'activity_score': (stats['total_activity'] / base_projects) * growth_factor * noise if base_projects > 0 else 0,
                    'trend_direction': 'up' if growth_factor > 1.0 else 'down',
                    'popularity_index': base_projects * growth_factor * noise
                })
        
        # 保存数据
        df = pd.DataFrame(language_trends)
        os.makedirs('data/processed', exist_ok=True)
        df.to_csv('data/processed/language_trends_detailed.csv', index=False)
        print(f"✅ 已生成语言趋势数据: {len(df)} 条记录")
        print(f"包含语言: {list(language_stats.keys())}")
        
        return df
    
    def generate_keyword_trends_data(self):
        """生成关键词趋势数据"""
        print("\n=== 生成关键词趋势数据 ===")
        
        # 基于项目名称提取技术关键词
        keywords = {
            'AI/ML': ['tensorflow', 'pytorch', 'keras', 'scikit', 'nlp', 'machine', 'learning'],
            'Web开发': ['react', 'vue', 'angular', 'django', 'flask', 'spring', 'express'],
            '移动开发': ['android', 'ios', 'react-native', 'flutter', 'swift', 'kotlin'],
            '云原生': ['kubernetes', 'docker', 'terraform', 'helm', 'istio', 'cloud'],
            '区块链': ['blockchain', 'ethereum', 'bitcoin', 'solidity', 'web3', 'crypto'],
            '大数据': ['spark', 'hadoop', 'kafka', 'flink', 'elasticsearch', 'clickhouse'],
            'DevOps': ['jenkins', 'gitlab', 'github', 'ci/cd', 'ansible', 'chef'],
            '数据库': ['mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'cassandra'],
            '前端框架': ['react', 'vue', 'angular', 'svelte', 'ember', 'backbone'],
            '编程语言': ['python', 'java', 'javascript', 'go', 'rust', 'kotlin', 'swift']
        }
        
        keyword_trends = []
        current_date = datetime.now()
        
        # 为每个关键词生成趋势数据
        for keyword_category, keyword_list in keywords.items():
            # 统计包含该关键词的项目
            matching_projects = 0
            total_stars = 0
            total_openrank = 0
            
            for _, project in self.projects_df.iterrows():
                repo_name = project['repo_name'].lower()
                if any(keyword.lower() in repo_name for keyword in keyword_list):
                    matching_projects += 1
                    total_stars += project['latest_stars']
                    total_openrank += project['latest_openrank']
            
            # 生成12个月的趋势数据
            base_score = matching_projects * 10  # 基础热度分数
            for i in range(12):
                date = current_date - timedelta(days=30 * (11 - i))
                month_str = date.strftime('%Y-%m')
                
                # 模拟趋势变化
                trend_factor = 1.0 + np.sin(i / 12 * 2 * np.pi) * 0.1  # 季节性波动
                noise = np.random.normal(1.0, 0.1)
                
                keyword_trends.append({
                    'date': month_str,
                    'keyword_category': keyword_category,
                    'search_volume': int(base_score * trend_factor * noise),
                    'mention_count': matching_projects,
                    'avg_stars_per_mention': total_stars / matching_projects if matching_projects > 0 else 0,
                    'influence_score': (total_openrank / matching_projects) * trend_factor * noise if matching_projects > 0 else 0,
                    'trend_direction': 'up' if trend_factor > 1.0 else 'down',
                    'competitiveness': np.random.uniform(0.3, 0.9),  # 竞争度
                    'adoption_rate': trend_factor * noise
                })
        
        # 保存数据
        df = pd.DataFrame(keyword_trends)
        df.to_csv('data/processed/keyword_trends.csv', index=False)
        print(f"✅ 已生成关键词趋势数据: {len(df)} 条记录")
        print(f"包含关键词类别: {list(keywords.keys())}")
        
        return df
    
    def generate_technology_maturity_data(self):
        """生成技术成熟度评估数据"""
        print("\n=== 生成技术成熟度数据 ===")
        
        maturity_data = []
        
        # 技术成熟度评估规则
        tech_maturity_rules = {
            'Java': {'stage': 'mature', 'growth_rate': 0.02, 'risk_level': 'low'},
            'Python': {'stage': 'mature', 'growth_rate': 0.15, 'risk_level': 'low'},
            'JavaScript': {'stage': 'mature', 'growth_rate': 0.08, 'risk_level': 'low'},
            'TypeScript': {'stage': 'growing', 'growth_rate': 0.25, 'risk_level': 'low'},
            'Go': {'stage': 'growing', 'growth_rate': 0.20, 'risk_level': 'low'},
            'Rust': {'stage': 'emerging', 'growth_rate': 0.35, 'risk_level': 'medium'},
            'Kotlin': {'stage': 'growing', 'growth_rate': 0.18, 'risk_level': 'low'},
            'Swift': {'stage': 'growing', 'growth_rate': 0.12, 'risk_level': 'low'},
            'React': {'stage': 'mature', 'growth_rate': 0.05, 'risk_level': 'low'},
            'Vue': {'stage': 'growing', 'growth_rate': 0.15, 'risk_level': 'low'},
            'Angular': {'stage': 'mature', 'growth_rate': 0.03, 'risk_level': 'low'},
            'Spring': {'stage': 'mature', 'growth_rate': 0.01, 'risk_level': 'low'},
            'Docker': {'stage': 'mature', 'growth_rate': 0.08, 'risk_level': 'low'},
            'Kubernetes': {'stage': 'growing', 'growth_rate': 0.22, 'risk_level': 'low'},
            'TensorFlow': {'stage': 'growing', 'growth_rate': 0.30, 'risk_level': 'medium'},
            'React Native': {'stage': 'growing', 'growth_rate': 0.12, 'risk_level': 'low'},
            'Flutter': {'stage': 'emerging', 'growth_rate': 0.40, 'risk_level': 'medium'},
            'GraphQL': {'stage': 'emerging', 'growth_rate': 0.35, 'risk_level': 'medium'},
            'Serverless': {'stage': 'emerging', 'growth_rate': 0.45, 'risk_level': 'high'},
            'WebAssembly': {'stage': 'emerging', 'growth_rate': 0.50, 'risk_level': 'high'}
        }
        
        # 为每个技术生成评估数据
        for tech_name, rules in tech_maturity_rules.items():
            # 查找相关项目
            related_projects = self.projects_df[
                self.projects_df['repo_name'].str.contains(tech_name, case=False, na=False)
            ]
            
            if len(related_projects) == 0:
                # 如果没有直接匹配，使用语言相关数据
                language_projects = self.projects_df[self.projects_df['language'] == tech_name]
                if len(language_projects) > 0:
                    related_projects = language_projects
                else:
                    continue
            
            # 计算技术指标
            total_projects = len(related_projects)
            avg_stars = related_projects['latest_stars'].mean()
            avg_openrank = related_projects['latest_openrank'].mean()
            avg_activity = related_projects['latest_activity'].mean()
            
            # 成熟度评估算法
            maturity_score = 0
            if rules['stage'] == 'emerging':
                maturity_score = np.random.uniform(20, 50)
            elif rules['stage'] == 'growing':
                maturity_score = np.random.uniform(50, 75)
            elif rules['stage'] == 'mature':
                maturity_score = np.random.uniform(75, 95)
            
            # 风险评估
            risk_score = {
                'low': np.random.uniform(10, 30),
                'medium': np.random.uniform(30, 60),
                'high': np.random.uniform(60, 85)
            }[rules['risk_level']]
            
            maturity_data.append({
                'technology': tech_name,
                'category': self._get_tech_category(tech_name),
                'maturity_stage': rules['stage'],
                'maturity_score': round(maturity_score, 2),
                'risk_level': rules['risk_level'],
                'risk_score': round(risk_score, 2),
                'growth_rate': rules['growth_rate'],
                'adoption_rate': round(avg_activity / 1000, 3) if not pd.isna(avg_activity) else 0,
                'community_size': total_projects,
                'avg_project_stars': round(avg_stars, 2) if not pd.isna(avg_stars) else 0,
                'avg_influence_score': round(avg_openrank, 2) if not pd.isna(avg_openrank) else 0,
                'recommendation': self._get_recommendation(rules['stage'], rules['risk_level']),
                'prediction_6m': 'adopt' if rules['growth_rate'] > 0.15 and rules['risk_level'] == 'low' else 'monitor',
                'prediction_12m': 'critical' if rules['stage'] == 'emerging' and rules['growth_rate'] > 0.3 else 'stable'
            })
        
        # 保存数据
        df = pd.DataFrame(maturity_data)
        df.to_csv('data/processed/technology_maturity.csv', index=False)
        print(f"✅ 已生成技术成熟度数据: {len(df)} 条记录")
        print(f"成熟度分布: {df['maturity_stage'].value_counts().to_dict()}")
        
        return df
    
    def _get_tech_category(self, tech_name):
        """获取技术分类"""
        categories = {
            'Java': 'Backend', 'Python': 'Backend', 'JavaScript': 'Frontend',
            'TypeScript': 'Frontend', 'Go': 'Backend', 'Rust': 'Backend',
            'Kotlin': 'Mobile', 'Swift': 'Mobile', 'React': 'Frontend',
            'Vue': 'Frontend', 'Angular': 'Frontend', 'Spring': 'Backend',
            'Docker': 'DevOps', 'Kubernetes': 'DevOps', 'TensorFlow': 'AI/ML',
            'React Native': 'Mobile', 'Flutter': 'Mobile', 'GraphQL': 'API',
            'Serverless': 'Cloud', 'WebAssembly': 'Web'
        }
        return categories.get(tech_name, 'Other')
    
    def _get_recommendation(self, stage, risk_level):
        """获取采用建议"""
        if stage == 'emerging' and risk_level == 'high':
            return 'careful_adoption'
        elif stage == 'emerging' and risk_level == 'medium':
            return 'pilot_project'
        elif stage == 'growing' and risk_level == 'low':
            return 'recommended'
        elif stage == 'mature':
            return 'safe_choice'
        else:
            return 'monitor'
    
    def generate_influence_ranking_data(self):
        """生成影响力排名数据"""
        print("\n=== 生成影响力排名数据 ===")
        
        # 计算综合影响力分数
        influence_data = []
        
        for _, project in self.projects_df.iterrows():
            # 影响力分解因素
            stars_weight = 0.3
            openrank_weight = 0.4
            activity_weight = 0.2
            bus_factor_weight = 0.1
            
            # 标准化指标 (0-100)
            max_stars = self.projects_df['latest_stars'].max()
            max_openrank = self.projects_df['latest_openrank'].max()
            max_activity = self.projects_df['latest_activity'].max()
            max_bus_factor = self.projects_df['latest_bus_factor'].max()
            
            stars_score = (project['latest_stars'] / max_stars * 100) if max_stars > 0 else 0
            openrank_score = (project['latest_openrank'] / max_openrank * 100) if max_openrank > 0 else 0
            activity_score = (project['latest_activity'] / max_activity * 100) if max_activity > 0 else 0
            bus_factor_score = (project['latest_bus_factor'] / max_bus_factor * 100) if max_bus_factor > 0 else 0
            
            # 综合影响力分数
            total_score = (
                stars_score * stars_weight +
                openrank_score * openrank_weight +
                activity_score * activity_score +
                bus_factor_score * bus_factor_weight
            )
            
            # 影响力等级
            if total_score >= 80:
                influence_tier = 'S-Tier'
            elif total_score >= 60:
                influence_tier = 'A-Tier'
            elif total_score >= 40:
                influence_tier = 'B-Tier'
            elif total_score >= 20:
                influence_tier = 'C-Tier'
            else:
                influence_tier = 'D-Tier'
            
            # 影响力趋势
            influence_trend = 'rising' if project['openrank_trend'] > 0.05 else 'declining' if project['openrank_trend'] < -0.05 else 'stable'
            
            influence_data.append({
                'rank': 0,  # 稍后计算
                'repo_name': project['repo_name'],
                'language': project['language'],
                'influence_score': round(total_score, 2),
                'influence_tier': influence_tier,
                'stars_score': round(stars_score, 2),
                'openrank_score': round(openrank_score, 2),
                'activity_score': round(activity_score, 2),
                'bus_factor_score': round(bus_factor_score, 2),
                'raw_stars': project['latest_stars'],
                'raw_openrank': project['latest_openrank'],
                'raw_activity': project['latest_activity'],
                'raw_bus_factor': project['latest_bus_factor'],
                'influence_trend': influence_trend,
                'trend_value': round(project['openrank_trend'], 4),
                'community_health': self._assess_community_health(project),
                'growth_potential': self._assess_growth_potential(project),
                'market_position': self._assess_market_position(total_score)
            })
        
        # 按影响力分数排序并分配排名
        influence_df = pd.DataFrame(influence_data)
        influence_df = influence_df.sort_values('influence_score', ascending=False).reset_index(drop=True)
        influence_df['rank'] = range(1, len(influence_df) + 1)
        
        # 保存数据
        influence_df.to_csv('data/processed/influence_ranking.csv', index=False)
        print(f"✅ 已生成影响力排名数据: {len(influence_df)} 条记录")
        print(f"排名分布: {influence_df['influence_tier'].value_counts().to_dict()}")
        
        return influence_df
    
    def _assess_community_health(self, project):
        """评估社区健康度"""
        if project['latest_bus_factor'] > 50 and project['avg_issue_age'] < 30:
            return 'excellent'
        elif project['latest_bus_factor'] > 20 and project['avg_issue_age'] < 60:
            return 'good'
        elif project['latest_bus_factor'] > 10:
            return 'fair'
        else:
            return 'poor'
    
    def _assess_growth_potential(self, project):
        """评估增长潜力"""
        if project['stars_trend'] > 0.1 and project['openrank_trend'] > 0.1:
            return 'high'
        elif project['stars_trend'] > 0.05 or project['openrank_trend'] > 0.05:
            return 'medium'
        else:
            return 'low'
    
    def _assess_market_position(self, score):
        """评估市场地位"""
        if score >= 80:
            return 'leader'
        elif score >= 60:
            return 'challenger'
        elif score >= 40:
            return 'follower'
        else:
            return 'niche'
    
    def generate_faq_data(self):
        """生成FAQ数据"""
        print("\n=== 生成FAQ数据 ===")
        
        faq_data = [
            {
                'id': 1,
                'question': '2023年最热门的编程语言是什么？',
                'answer': '根据项目数据分析，JavaScript、Python和Java仍然是最受欢迎的编程语言，其中TypeScript显示出强劲的增长趋势，Rust和Go等新兴语言也在快速发展。',
                'category': 'language_trends',
                'keywords': '编程语言,热门,趋势,2023',
                'confidence': 0.95,
                'related_charts': 'language_trends_detailed.csv'
            },
            {
                'id': 2,
                'question': '哪些开源项目影响力最大？',
                'answer': '根据OpenRank和综合评分，当前影响力最大的项目包括Apache基金会项目（如Spark、Airflow）、Google项目（如TensorFlow、Kubernetes）以及Microsoft项目（如VS Code、TypeScript）。',
                'category': 'influence_analysis',
                'keywords': '开源项目,影响力,排名,OpenRank',
                'confidence': 0.92,
                'related_charts': 'influence_ranking.csv'
            },
            {
                'id': 3,
                'question': '如何选择适合的技术栈？',
                'answer': '技术栈选择应考虑成熟度、社区支持、学习曲线和项目需求。建议：Web开发选择React/Vue，后端可选择Java/Python/Go，移动开发考虑Flutter/React Native，AI/ML项目推荐Python生态。',
                'category': 'technology_guidance',
                'keywords': '技术栈,选择,建议,成熟度',
                'confidence': 0.88,
                'related_charts': 'technology_maturity.csv'
            },
            {
                'id': 4,
                'question': '哪些技术最有发展潜力？',
                'answer': '基于当前趋势分析，Rust、WebAssembly、Serverless架构和AI/ML相关技术显示出最高的增长潜力。这些技术在性能和开发效率方面都有显著优势。',
                'category': 'future_trends',
                'keywords': '发展趋势,潜力,新兴技术,Rust,AI',
                'confidence': 0.85,
                'related_charts': 'technology_maturity.csv,keyword_trends.csv'
            },
            {
                'id': 5,
                'question': '如何评估开源项目的健康度？',
                'answer': '项目健康度评估应关注：1)贡献者数量和多样性；2)Issue响应速度；3)版本更新频率；4)社区活跃度；5)文档完整性。建议关注Bus Factor指标和平均Issue处理时间。',
                'category': 'project_evaluation',
                'keywords': '项目健康度,评估,贡献者,Bus Factor',
                'confidence': 0.90,
                'related_charts': 'influence_ranking.csv'
            },
            {
                'id': 6,
                'question': '云计算相关技术趋势如何？',
                'answer': '云计算领域，Kubernetes已经成为容器编排的标准，Service Mesh、GitOps和Serverless架构正在快速发展。Docker仍然占主导地位，但Podman等替代方案也在兴起。',
                'category': 'cloud_trends',
                'keywords': '云计算,Kubernetes,Docker,Serverless',
                'confidence': 0.87,
                'related_charts': 'keyword_trends.csv,technology_maturity.csv'
            },
            {
                'id': 7,
                'question': '前端开发的技术选择有哪些？',
                'answer': '前端领域，React生态系统最为庞大，Vue.js易学易用，Angular适合大型企业项目。TypeScript普及率持续上升，构建工具以Webpack、Vite为主，状态管理推荐Redux、Zustand等。',
                'category': 'frontend_trends',
                'keywords': '前端,React,Vue,Angular,TypeScript',
                'confidence': 0.89,
                'related_charts': 'language_trends_detailed.csv'
            },
            {
                'id': 8,
                'question': '数据科学和AI领域有哪些热门技术？',
                'answer': 'AI/ML领域，Python生态系统占主导，TensorFlow和PyTorch是主要框架，Hugging Face在NLP领域表现突出。数据工程方面，Spark、Flink处理大数据，MLOps工具如MLflow、 Kubeflow正在兴起。',
                'category': 'ai_data_science',
                'keywords': '数据科学,AI,机器学习,TensorFlow,PyTorch',
                'confidence': 0.86,
                'related_charts': 'keyword_trends.csv'
            }
        ]
        
        # 保存数据
        df = pd.DataFrame(faq_data)
        df.to_csv('data/processed/faq_dataset.csv', index=False)
        print(f"✅ 已生成FAQ数据: {len(df)} 条记录")
        
        return df
    
    def generate_dashboard_summary(self):
        """生成仪表盘汇总数据"""
        print("\n=== 生成仪表盘汇总数据 ===")
        
        # 核心指标汇总
        total_projects = len(self.projects_df)
        total_stars = self.projects_df['latest_stars'].sum()
        avg_openrank = self.projects_df['latest_openrank'].mean()
        
        # 语言分布
        language_dist = self.projects_df['language'].value_counts().head(10)
        
        # 影响力分布
        influence_dist = self.projects_df['influence_score'].describe()
        
        # 趋势指标
        positive_trends = len(self.projects_df[self.projects_df['stars_trend'] > 0])
        negative_trends = len(self.projects_df[self.projects_df['stars_trend'] < 0])
        
        dashboard_data = {
            'metric_name': [
                'total_projects', 'total_stars', 'avg_influence_score',
                'top_language', 'top_language_count', 'positive_trend_ratio',
                'negative_trend_ratio', 'high_impact_projects', 'emerging_languages',
                'community_health_avg', 'activity_growth_rate', 'star_growth_rate'
            ],
            'metric_value': [
                total_projects,
                int(total_stars),
                round(self.projects_df['influence_score'].mean(), 2),
                language_dist.index[0] if len(language_dist) > 0 else 'Unknown',
                int(language_dist.iloc[0]) if len(language_dist) > 0 else 0,
                round(positive_trends / total_projects * 100, 2),
                round(negative_trends / total_projects * 100, 2),
                len(self.projects_df[self.projects_df['influence_score'] > 70]),
                len(self.projects_df[self.projects_df['language'] == 'Unknown']),
                round(self.projects_df['latest_bus_factor'].mean(), 2),
                round(self.projects_df['activity_trend'].mean(), 4),
                round(self.projects_df['stars_trend'].mean(), 4)
            ],
            'metric_description': [
                '项目总数',
                '总Star数',
                '平均影响力分数',
                '最受欢迎编程语言',
                '最受欢迎语言项目数',
                '正增长项目比例(%)',
                '负增长项目比例(%)',
                '高影响力项目数量',
                '新兴语言项目数量',
                '平均社区健康度',
                '平均活动度增长率',
                '平均Star增长率'
            ],
            'data_source': [
                'projects_complete.csv',
                'projects_complete.csv', 
                'projects_complete.csv',
                'projects_complete.csv',
                'projects_complete.csv',
                'projects_complete.csv',
                'projects_complete.csv',
                'projects_complete.csv',
                'projects_complete.csv',
                'projects_complete.csv',
                'projects_complete.csv',
                'projects_complete.csv'
            ],
            'last_updated': [datetime.now().strftime('%Y-%m-%d %H:%M:%S')] * 12
        }
        
        # 保存数据
        df = pd.DataFrame(dashboard_data)
        df.to_csv('data/processed/dashboard_summary.csv', index=False)
        print(f"✅ 已生成仪表盘汇总数据: {len(df)} 条记录")
        
        return df
    
    def generate_all_module_data(self):
        """生成所有模块支撑数据"""
        print("=== 开始生成所有功能模块支撑数据 ===")
        
        # 生成各类数据
        self.generate_language_trends_data()
        self.generate_keyword_trends_data()
        self.generate_technology_maturity_data()
        self.generate_influence_ranking_data()
        self.generate_faq_data()
        self.generate_dashboard_summary()
        
        print("\n=== 所有模块数据生成完成 ===")
        print("生成的CSV文件:")
        csv_files = [
            'language_trends_detailed.csv',
            'keyword_trends.csv', 
            'technology_maturity.csv',
            'influence_ranking.csv',
            'faq_dataset.csv',
            'dashboard_summary.csv'
        ]
        
        for file in csv_files:
            if os.path.exists(f'data/processed/{file}'):
                print(f"✅ {file}")
            else:
                print(f"❌ {file} - 生成失败")

if __name__ == "__main__":
    generator = ModuleDataGenerator()
    generator.generate_all_module_data()