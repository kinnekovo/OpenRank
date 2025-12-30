import os
import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class GitHubDataLoader:
    """GitHub数据加载器，处理top_300_metrics文件夹中的真实GitHub数据"""
    
    def __init__(self, data_path=None):
        if data_path is None:
            # 获取当前脚本所在目录，然后构造数据路径
            current_dir = Path(__file__).parent
            self.data_path = current_dir.parent / "data" / "top_300_metrics"
        else:
            self.data_path = Path(data_path)
        self.metrics_files = {
            'meta': 'meta.json',
            'stars': 'stars.json',
            'activity': 'activity.json',
            'activity_details': 'activity_details.json',
            'openrank': 'openrank.json',
            'attention': 'attention.json',
            'bus_factor': 'bus_factor.json',
            'bus_factor_detail': 'bus_factor_detail.json',
            'issue_age': 'issue_age.json',
            'issue_comments': 'issue_comments.json',
            'issue_resolution_duration': 'issue_resolution_duration.json',
            'issue_response_time': 'issue_response_time.json',
            'issues_new': 'issues_new.json',
            'issues_closed': 'issues_closed.json',
            'issues_and_change_request_active': 'issues_and_change_request_active.json',
            'change_requests': 'change_requests.json',
            'change_requests_accepted': 'change_requests_accepted.json',
            'change_requests_reviews': 'change_requests_reviews.json',
            'change_request_age': 'change_request_age.json',
            'change_request_response_time': 'change_request_response_time.json',
            'change_request_resolution_duration': 'change_request_resolution_duration.json',
            'code_change_lines_add': 'code_change_lines_add.json',
            'code_change_lines_remove': 'code_change_lines_remove.json',
            'code_change_lines_sum': 'code_change_lines_sum.json',
            'participants': 'participants.json',
            'contributor_email_suffixes': 'contributor_email_suffixes.json',
            'inactive_contributors': 'inactive_contributors.json',
            'new_contributors': 'new_contributors.json',
            'new_contributors_detail': 'new_contributors_detail.json',
            'active_dates_and_times': 'active_dates_and_times.json',
            'technical_fork': 'technical_fork.json'
        }
        
    def load_project_data(self, org, repo):
        """加载单个项目的所有数据"""
        project_path = self.data_path / org / repo
        
        if not project_path.exists():
            logger.warning(f"项目路径不存在: {project_path}")
            return None
            
        project_data = {
            'org': org,
            'repo': repo,
            'repo_full_name': f"{org}/{repo}"
        }
        
        # 加载各种指标数据
        for metric_name, filename in self.metrics_files.items():
            file_path = project_path / filename
            if file_path.exists():
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    project_data[metric_name] = data
                    logger.debug(f"成功加载 {org}/{repo} 的 {metric_name} 数据")
                except Exception as e:
                    logger.error(f"加载 {org}/{repo} 的 {metric_name} 数据失败: {e}")
                    project_data[metric_name] = {}
            else:
                logger.debug(f"文件不存在: {file_path}")
                project_data[metric_name] = {}
                
        return project_data
    
    def load_all_projects(self):
        """加载所有项目数据"""
        all_projects = []
        
        if not self.data_path.exists():
            logger.error(f"数据路径不存在: {self.data_path}")
            return pd.DataFrame()
            
        # 遍历所有组织
        for org_dir in self.data_path.iterdir():
            if org_dir.is_dir():
                org_name = org_dir.name
                logger.info(f"处理组织: {org_name}")
                
                # 遍历该组织下的所有项目
                for repo_dir in org_dir.iterdir():
                    if repo_dir.is_dir():
                        repo_name = repo_dir.name
                        project_data = self.load_project_data(org_name, repo_name)
                        
                        if project_data:
                            all_projects.append(project_data)
                            
        logger.info(f"总共加载了 {len(all_projects)} 个项目的数据")
        return all_projects
    
    def calculate_trend(self, data_dict):
        """计算指标趋势（最近6个月vs前6个月）"""
        if not data_dict:
            return 0.0
        
        # 过滤掉raw数据
        clean_data = {k: v for k, v in data_dict.items() if not k.endswith('-raw')}
        
        # 按时间排序
        sorted_dates = sorted(clean_data.keys())
        if len(sorted_dates) < 12:  # 需要至少12个月数据
            return 0.0
            
        recent_6_months = sorted_dates[-6:]
        previous_6_months = sorted_dates[-12:-6]
        
        recent_avg = np.mean([clean_data[d] for d in recent_6_months])
        previous_avg = np.mean([clean_data[d] for d in previous_6_months])
        
        if previous_avg == 0:
            return 1.0 if recent_avg > 0 else 0.0
        
        return (recent_avg - previous_avg) / previous_avg
    
    def calculate_composite_score(self, project_data):
        """计算项目综合影响力分数"""
        # 权重设置
        weights = {
            'openrank': 0.3,      # OpenRank权重最高
            'activity': 0.2,      # 活动度
            'attention': 0.15,    # 关注度
            'bus_factor': 0.15,   # 关键贡献者
            'stars_trend': 0.1,   # Star增长趋势
            'code_health': 0.1    # 代码质量指标
        }
        
        scores = {}
        
        # OpenRank分数（0-10标准化）
        openrank_data = project_data.get('openrank', {})
        if openrank_data:
            latest_openrank = list(openrank_data.values())[-1]
            scores['openrank'] = min(latest_openrank / 10.0, 1.0)  # 标准化到0-1
        else:
            scores['openrank'] = 0.0
            
        # 活动度分数
        activity_data = project_data.get('activity', {})
        if activity_data:
            latest_activity = list(activity_data.values())[-1]
            scores['activity'] = min(latest_activity / 1000.0, 1.0)  # 标准化
        else:
            scores['activity'] = 0.0
            
        # 关注度分数
        attention_data = project_data.get('attention', {})
        if attention_data:
            latest_attention = list(attention_data.values())[-1]
            scores['attention'] = min(latest_attention / 1000.0, 1.0)  # 标准化
        else:
            scores['attention'] = 0.0
            
        # 关键贡献者分数
        bus_factor_data = project_data.get('bus_factor', {})
        if bus_factor_data:
            latest_bus_factor = list(bus_factor_data.values())[-1]
            scores['bus_factor'] = min(latest_bus_factor / 50.0, 1.0)  # 标准化
        else:
            scores['bus_factor'] = 0.0
            
        # Star增长趋势
        stars_data = project_data.get('stars', {})
        scores['stars_trend'] = self.calculate_trend(stars_data)
        scores['stars_trend'] = max(0, min(scores['stars_trend'], 2.0)) / 2.0  # 限制在0-1
        
        # 代码健康度（问题解决效率和代码变更活跃度）
        issue_resolution = project_data.get('issue_resolution_duration', {})
        code_changes = project_data.get('code_change_lines_sum', {})
        
        code_health = 0.5  # 默认中等健康度
        if issue_resolution and 'avg' in issue_resolution:
            # 解决时间越短健康度越高
            avg_resolution = np.mean(list(issue_resolution['avg'].values()))
            code_health = max(0, min(1.0, (30 - avg_resolution) / 30.0))
            
        if code_changes:
            # 代码变更活跃度
            latest_changes = list(code_changes.values())[-1]
            activity_score = min(latest_changes / 10000.0, 1.0)
            code_health = (code_health + activity_score) / 2
            
        scores['code_health'] = code_health
        
        # 计算加权综合分数
        composite_score = sum(weights[metric] * scores[metric] for metric in weights.keys())
        
        return composite_score * 10.0  # 放大到0-10分
    
    def create_projects_dataframe(self, projects_data):
        """将项目数据转换为完整的DataFrame"""
        projects_list = []
        
        for project in projects_data:
            # 提取基本项目信息
            project_info = {
                'repo_name': project['repo_full_name'],
                'updated_at': project.get('meta', {}).get('updatedAt', 0)
            }
            
            # 获取编程语言（基于项目名称推断）
            repo_name = project['repo'].lower()
            language_mapping = self.get_project_languages()
            project_info['language'] = language_mapping.get(repo_name, 'Unknown')
            
            # 获取所有指标的latest值
            core_metrics = ['stars', 'activity', 'openrank', 'attention', 'bus_factor']
            for metric_name in core_metrics:
                metric_data = project.get(metric_name, {})
                if metric_data:
                    # 获取最新的值（排除raw数据）
                    clean_data = {k: v for k, v in metric_data.items() if not k.endswith('-raw')}
                    if clean_data:
                        latest_value = list(clean_data.values())[-1]
                        project_info[f'latest_{metric_name}'] = latest_value
                    else:
                        project_info[f'latest_{metric_name}'] = 0
                else:
                    project_info[f'latest_{metric_name}'] = 0
            
            # 计算各种统计数据
            for metric_name in core_metrics:
                metric_data = project.get(metric_name, {})
                if metric_data:
                    clean_data = {k: v for k, v in metric_data.items() if not k.endswith('-raw')}
                    if clean_data:
                        values = list(clean_data.values())
                        project_info[f'{metric_name}_avg'] = np.mean(values)
                        project_info[f'{metric_name}_trend'] = self.calculate_trend(metric_data)
                        project_info[f'{metric_name}_total'] = sum(values)
                    else:
                        project_info[f'{metric_name}_avg'] = 0
                        project_info[f'{metric_name}_trend'] = 0
                        project_info[f'{metric_name}_total'] = 0
                else:
                    project_info[f'{metric_name}_avg'] = 0
                    project_info[f'{metric_name}_trend'] = 0
                    project_info[f'{metric_name}_total'] = 0
            
            # 特殊指标处理
            # Issue相关指标
            issue_age_data = project.get('issue_age', {})
            if issue_age_data and 'avg' in issue_age_data:
                avg_issue_age = np.mean(list(issue_age_data['avg'].values()))
                project_info['avg_issue_age'] = avg_issue_age
            else:
                project_info['avg_issue_age'] = 0
                
            # 贡献者指标
            participants_data = project.get('participants', {})
            if participants_data:
                project_info['latest_participants'] = list(participants_data.values())[-1]
            else:
                project_info['latest_participants'] = 0
                
            # 新贡献者趋势
            new_contributors_data = project.get('new_contributors', {})
            project_info['new_contributors_trend'] = self.calculate_trend(new_contributors_data)
            
            # 代码变更指标
            code_add_data = project.get('code_change_lines_add', {})
            code_remove_data = project.get('code_change_lines_remove', {})
            
            if code_add_data and code_remove_data:
                clean_add = {k: v for k, v in code_add_data.items() if not k.endswith('-raw')}
                clean_remove = {k: v for k, v in code_remove_data.items() if not k.endswith('-raw')}
                
                if clean_add and clean_remove:
                    latest_add = list(clean_add.values())[-1]
                    latest_remove = list(clean_remove.values())[-1]
                    project_info['code_churn_ratio'] = latest_remove / max(latest_add, 1)
                else:
                    project_info['code_churn_ratio'] = 0
            else:
                project_info['code_churn_ratio'] = 0
            
            # 计算综合影响力分数
            project_info['influence_score'] = self.calculate_composite_score(project)
            
            projects_list.append(project_info)
            
        return pd.DataFrame(projects_list)
    
    def create_time_series_dataframe(self, projects_data):
        """创建时间序列数据DataFrame"""
        time_series_list = []
        
        for project in projects_data:
            repo_full_name = project['repo_full_name']
            
            # 为每个指标创建时间序列
            for metric_name in ['stars', 'activity', 'openrank', 'attention', 'bus_factor']:
                metric_data = project.get(metric_name, {})
                if metric_data:
                    for date_str, value in metric_data.items():
                        # 跳过raw数据
                        if date_str.endswith('-raw'):
                            continue
                            
                        # 转换日期格式
                        try:
                            if len(date_str) == 7:  # YYYY-MM格式
                                date_obj = datetime.strptime(date_str, '%Y-%m')
                            elif len(date_str) == 10:  # YYYY-MM-DD格式
                                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                            else:
                                continue
                                
                            time_series_list.append({
                                'repo_full_name': repo_full_name,
                                'date': date_obj,
                                'metric': metric_name,
                                'value': float(value) if value is not None else 0.0
                            })
                        except ValueError as e:
                            logger.warning(f"日期格式转换失败: {date_str} in {repo_full_name}, {e}")
                            continue
        
        df = pd.DataFrame(time_series_list)
        
        if not df.empty:
            # 按日期和仓库分组，对每个仓库的每个指标取最新值
            df = df.sort_values(['repo_full_name', 'metric', 'date'])
            df = df.groupby(['repo_full_name', 'metric', 'date'])['value'].sum().reset_index()
            
        logger.info(f"创建了 {len(df)} 条时间序列记录")
        return df
    
    def get_project_languages(self):
        """从项目路径推断主要编程语言（简化版本）"""
        # 这里可以根据项目名称推断语言，实际情况中应该从meta数据获取
        language_mapping = {
            'react': 'JavaScript',
            'angular': 'TypeScript', 
            'vue': 'JavaScript',
            'tensorflow': 'Python',
            'pytorch': 'Python',
            'django': 'Python',
            'spring-boot': 'Java',
            'ansible': 'Python',
            'kubernetes': 'Go',
            'docker': 'Go',
            'spark': 'Scala',
            'flink': 'Java',
            'airflow': 'Python',
            'superset': 'Python',
            'tvm': 'C++',
            'beam': 'Java',
            'hudi': 'Java',
            'iceberg': 'Java',
            'pulsar': 'Java',
            'doris': 'Java',
            'arrow': 'C++',
            'apisix': 'Lua',
            'swift': 'Swift',
            'aspnetcore': 'C#',
            'efcore': 'C#',
            'maui': 'C#',
            'roslyn': 'C#',
            'runtime': 'C#',
            'aws-cdk': 'TypeScript',
            'ccxt': 'JavaScript',
            'ceph': 'C++',
            'cilium': 'Go',
            'cmssw': 'C++',
            'podman': 'Go',
            'dbeaver': 'Java',
            'deno': 'TypeScript',
            'electron': 'C++',
            'expo': 'TypeScript',
            'gatsby': 'JavaScript',
            'gentoo': 'Shell',
            'sentry': 'Python',
            'codeql': 'JavaScript',
            'gitpod': 'TypeScript',
            'gitea': 'Go',
            'godot': 'C++'
        }
        
        return language_mapping