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
            self.data_path = current_dir.parent / "raw_data" / "top_300_metrics"
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
        """从项目路径推断主要编程语言"""
        language_mapping = {
            # 已有的映射
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
            'godot': 'C++',
            
            # 新增映射 - 前端框架和UI库
            'ant-design': 'TypeScript',
            'material-ui': 'TypeScript',
            'tailwindcss': 'JavaScript',
            'bootstrap': 'JavaScript',
            'next.js': 'JavaScript',
            'nuxt.js': 'JavaScript',
            'svelte': 'JavaScript',
            'lit': 'TypeScript',
            'webcomponents': 'JavaScript',
            'angular-components': 'TypeScript',
            
            # 新增映射 - Java项目
            'nacos': 'Java',
            'dolphinscheduler': 'Java',
            'shardingsphere': 'Java',
            'rocketmq': 'Java',
            'seata': 'Java',
            'sentinel': 'Java',
            'dubbo': 'Java',
            'hadoop': 'Java',
            'hbase': 'Java',
            'hive': 'Java',
            'zookeeper': 'Java',
            'kafka': 'Java',
            'azure-sdk-for-java': 'Java',
            'clickhouse': 'C++',
            
            # 新增映射 - Python项目
            'airbyte': 'Python',
            'jupyter': 'Python',
            'pandas': 'Python',
            'numpy': 'Python',
            'scipy': 'Python',
            'scikit-learn': 'Python',
            'matplotlib': 'Python',
            'requests': 'Python',
            'flask': 'Python',
            'fastapi': 'Python',
            'celery': 'Python',
            'redis-py': 'Python',
            'azure-sdk-for-python': 'Python',
            'bitcoin': 'C++',
            'chia-blockchain': 'Python',
            
            # 新增映射 - Go项目
            'etcd': 'Go',
            'prometheus': 'Go',
            'grafana': 'Go',
            'consul': 'Go',
            'nats': 'Go',
            'vitess': 'Go',
            'influxdb': 'Go',
            'argo-cd': 'Go',
            'kubevirt': 'Go',
            'lens': 'TypeScript',
            
            # 新增映射 - TypeScript/JavaScript项目
            'jetpack': 'JavaScript',
            'wp-calypso': 'JavaScript',
            'amplify-cli': 'TypeScript',
            'appsmith': 'TypeScript',
            'stable-diffusion-webui': 'Python',
            'angular-cli': 'TypeScript',
            'rxjs': 'TypeScript',
            'azure-sdk-for-js': 'TypeScript',
            'backstage': 'TypeScript',
            'brave-browser': 'JavaScript',
            'brave-core': 'C++',
            
            # 新增映射 - C++项目
            'opencv': 'C++',
            'ffmpeg': 'C++',
            'qt': 'C++',
            'llvm': 'C++',
            'clang': 'C++',
            'cmake': 'C++',
            'azerothcore': 'C++',
            'wotlk': 'C++',
            
            # 新增映射 - C#项目
            'azure-cli': 'Python',
            'azure-powershell': 'PowerShell',
            'dotnet': 'C#',
            'aspnet': 'C#',
            'xamarin': 'C#',
            'azure-sdk-for-net': 'C#',
            
            # 新增映射 - 移动开发
            'Anki-Android': 'Java',
            'ankidroid': 'Java',
            'ardupilot': 'C++',
            
            # 新增映射 - 其他语言
            'AdguardFilters': 'JavaScript',
            'testnets': 'Rust',
            'rest-api-specs': 'OpenAPI',
            'bevy': 'Rust',
            'bitnami-charts': 'YAML',
            'laravel': 'PHP',
            'mathlib': 'Lean',
            'bioconda-recipes': 'Python',
            'cataclysm-dda': 'C++',
            
            # 新增映射 - 前50个Unknown语言项目
            'components': 'TypeScript',  # angular/components
            'Anki-Android': 'Java',  # ankidroid/Anki-Android
            'azerothcore-wotlk': 'C++',  # azerothcore/azerothcore-wotlk
            'azure-rest-api-specs': 'OpenAPI',  # Azure/azure-rest-api-specs
            'charts': 'YAML',  # bitnami/charts
            'cloudflare-docs': 'JavaScript',  # cloudflare/cloudflare-docs
            'cockroach': 'Go',  # cockroachdb/cockroach
            'conan-center-index': 'Python',  # conan-io/conan-center-index
            'staged-recipes': 'Python',  # conda-forge/staged-recipes
            'lede': 'C',  # coolsnowwolf/lede
            'cypress': 'JavaScript',  # cypress-io/cypress
            'darktable': 'C',  # darktable-org/darktable
            'datadog-agent': 'Go',  # DataDog/datadog-agent
            'DefinitelyTyped': 'TypeScript',  # DefinitelyTyped/DefinitelyTyped
            'content': 'Python',  # demisto/content
            'va.gov-team': 'JavaScript',  # department-of-veterans-affairs/va.gov-team
            'desktop': 'TypeScript',  # desktop/desktop
            'directus': 'TypeScript',  # directus/directus
            'docs': 'JavaScript',  # docker/docs, dotnet/docs, github/docs
            'AspNetCore.Docs': 'C#',  # dotnet/AspNetCore.Docs
            'GitHubGraduation-2022': 'JavaScript',  # education/GitHubGraduation-2022
            'elasticsearch': 'Java',  # elastic/elasticsearch
            'kibana': 'TypeScript',  # elastic/kibana
            'elf-council-frontend': 'TypeScript',  # element-fi/elf-council-frontend
            'element-plus': 'TypeScript',  # element-plus/element-plus
            'elementor': 'PHP',  # elementor/elementor
            'envoy': 'C++',  # envoyproxy/envoy
            'esp-idf': 'C',  # espressif/esp-idf
            'ethereum-org-website': 'JavaScript',  # ethereum/ethereum-org-website
            'App': 'JavaScript',  # Expensify/App
            'react-native': 'JavaScript',  # facebook/react-native
            'filecoin-plus-large-datasets': 'Go',  # filecoin-project/filecoin-plus-large-datasets
            'Files': 'C#',  # files-community/Files
            'firebase-android-sdk': 'Java',  # firebase/firebase-android-sdk
            'flutterfire': 'Dart',  # firebase/flutterfire
            'first-contributions': 'JavaScript',  # firstcontributions/first-contributions
            'flathub': 'Python',  # flathub/flathub
            'engine': 'C++',  # flutter/engine
            'flutter': 'Dart',  # flutter/flutter
            'plugins': 'Dart',  # flutter/plugins
            'a32nx': 'JavaScript',  # flybywiresim/a32nx
            'hyperblog': 'JavaScript',  # freddier/hyperblog
            'go': 'Go',  # golang/go
            'it-cert-automation-practice': 'Python',  # google/it-cert-automation-practice
            'signclav2-probe-repo': 'Go',  # google-test/signclav2-probe-repo
            'developer.chrome.com': 'JavaScript',  # GoogleChrome/developer.chrome.com
            'gradle': 'Java',  # gradle/gradle
            'adguardfilters': 'JavaScript',          # AdguardTeam/AdguardFilters
            'anki-android': 'Java',                  # ankidroid/Anki-Android
            'definitelytyped': 'TypeScript',         # DefinitelyTyped/DefinitelyTyped
            'aspnetcore.docs': 'C#',                 # dotnet/AspNetCore.Docs
            'githubgraduation-2022': 'JavaScript',   # education/GitHubGraduation-2022
            'app': 'JavaScript',                     # Expensify/App
            'files': 'C#',                           # files-community/Files
            'loki': 'Go',                            # grafana/loki
            'teleport': 'Go',                        # gravitational/teleport
            'grpc': 'C++',                           # grpc/grpc
            'terraform-provider-aws': 'Go',          # hashicorp/terraform-provider-aws
            'terraform-provider-azurerm': 'Go',      # hashicorp/terraform-provider-azurerm
            'vault': 'Go',                           # hashicorp/vault
            'denylist': 'Python',                    # helium/denylist
            'helix': 'Rust',                         # helix-editor/helix
            'core': 'Python',                        # home-assistant/core
            'frontend': 'TypeScript',                # home-assistant/frontend
            'home-assistant.io': 'JavaScript',       # home-assistant/home-assistant.io
            'homebrew-cask': 'Ruby',                 # Homebrew/homebrew-cask
            'homebrew-core': 'Ruby',                 # Homebrew/homebrew-core
            'transformers': 'Python',                # huggingface/transformers
            'keep-pipeline-tests-resources': 'Python', # idsb3t1/KEEP-pipeline-tests-resources
            'telegraf': 'Go',                        # influxdata/telegraf
            'librealsense': 'C++',                   # IntelRealSense/librealsense
            'istio': 'Go',                           # istio/istio
            'testissues': 'Python',                  # JacksonKearl/testissues
            'swot': 'Java',                          # JetBrains/swot
            'jitsi-meet': 'JavaScript',              # jitsi/jitsi-meet
            'patchwork': 'JavaScript',               # jlord/patchwork
            'joomla-cms': 'PHP',                     # joomla/joomla-cms
            'julia': 'Julia',                        # JuliaLang/julia
            'general': 'Julia',                      # JuliaRegistries/General
            'kaiserreich-4': 'Lua',                  # Kaiserreich/Kaiserreich-4
            'keycloak': 'Java',                      # keycloak/keycloak
            'zigbee2mqtt': 'JavaScript',             # Koenkk/zigbee2mqtt
            'minikube': 'Go',                        # kubernetes/minikube
            'test-infra': 'Go',                      # kubernetes/test-infra
            'website': 'JavaScript',                 # kubernetes/website
            'framework': 'PHP',                      # laravel/framework
            'leetcode-feedback': 'JavaScript',       # LeetCode-Feedback/LeetCode-Feedback
            'lightning': 'Python',                   # Lightning-AI/lightning
            'llvm-project': 'C++',                   # llvm/llvm-project
            'logseq': 'Clojure',                     # logseq/logseq
            'macports-ports': 'Tcl',                 # macports/macports-ports
            'magento2': 'PHP',                       # magento/magento2
            'marlin': 'C++',                         # MarlinFirmware/Marlin
            'mastodon': 'Ruby',                      # mastodon/mastodon
            'synapse': 'Python',                     # matrix-org/synapse
            'mattermost-webapp': 'TypeScript',       # mattermost/mattermost-webapp
            'translated-content': 'HTML',

            'metabase': 'Clojure',                    # metabase/metabase
            'eth-phishing-detect': 'JavaScript',      # MetaMask/eth-phishing-detect
            'metamask-extension': 'JavaScript',       # MetaMask/metamask-extension
            'metersphere': 'Java',                    # metersphere/metersphere
            'azuredatastudio': 'TypeScript',          # microsoft/azuredatastudio
            'fluentui': 'TypeScript',                 # microsoft/fluentui
            'onnxruntime': 'C++',                     # microsoft/onnxruntime
            'playwright': 'TypeScript',               # microsoft/playwright
            'powertoys': 'C#',                        # microsoft/PowerToys
            'terminal': 'C++',                        # microsoft/terminal
            'typescript': 'TypeScript',               # microsoft/TypeScript
            'vcpkg': 'C++',                           # microsoft/vcpkg
            'vscode': 'TypeScript',                   # microsoft/vscode
            'vscode-jupyter': 'TypeScript',           # microsoft/vscode-jupyter
            'winget-pkgs': 'YAML',                    # microsoft/winget-pkgs
            'wsl': 'C++',                             # microsoft/WSL
            'azure-docs': 'Markdown',                 # MicrosoftDocs/azure-docs
            'microsoft-365-docs': 'Markdown',         # MicrosoftDocs/microsoft-365-docs
            'msteams-docs': 'Markdown',               # MicrosoftDocs/msteams-docs
            'microsoft-graph-docs': 'Markdown',       # microsoftgraph/microsoft-graph-docs
            'mlflow': 'Python',                       # mlflow/mlflow
            'fenix': 'Kotlin',                        # mozilla-mobile/fenix
            'three.js': 'JavaScript',                 # mrdoob/three.js
            'mui-x': 'TypeScript',                    # mui/mui-x
            'neovim': 'C',                            # neovim/neovim
            'docs-website': 'JavaScript',             # newrelic/docs-website
            'server': 'PHP',                          # nextcloud/server
            'nixpkgs': 'Nix',                         # NixOS/nixpkgs
            'node': 'JavaScript',                     # nodejs/node (核心是JS，底层C++)
            'sdk-nrf': 'C',                           # nrfconnect/sdk-nrf
            'nx': 'TypeScript',                       # nrwl/nx
            'o3de': 'C++',                            # o3de/o3de
            'obs-studio': 'C++',                      # obsproject/obs-studio
            'odoo': 'Python',                         # odoo/odoo
            'mmdetection': 'Python',                  # open-mmlab/mmdetection
            'opentelemetry-collector-contrib': 'Go',  # open-telemetry/opentelemetry-collector-contrib
            'openapi-generator': 'Java',              # OpenAPITools/openapi-generator
            'openhab-addons': 'Java',                 # openhab/openhab-addons
            'jdk': 'Java',                            # openjdk/jdk
            'joss-reviews': 'Python',                 # openjournals/joss-reviews
            'openshift-docs': 'Markdown',             # openshift/openshift-docs
            'release': 'Go',                          # openshift/release
            'openssl': 'C',                           # openssl/openssl
            'openvino': 'C++',                        # openvinotoolkit/openvino
            'openwrt': 'C',                           # openwrt/openwrt
            'oppia': 'Python',                        # oppia/oppia
            'paddle': 'Python',                       # PaddlePaddle/Paddle
            'paddleocr': 'Python',                    # PaddlePaddle/PaddleOCR
            'php-src': 'C',                           # php/php-src
            'tidb': 'Go',                             # pingcap/tidb

            'android-issues': 'Java',                  # PixelExperience/android-issues
            'postman-app-support': 'JavaScript',       # postmanlabs/postman-app-support
            'powershell': 'C#',                        # PowerShell/PowerShell
            'osu': 'C#',                               # ppy/osu
            'prestashop': 'PHP',                       # PrestaShop/PrestaShop
            'prisma': 'TypeScript',                    # prisma/prisma
            'connectedhomeip': 'C++',                  # project-chip/connectedhomeip (Matter协议)
            'prusaslicer': 'C++',                      # prusa3d/PrusaSlicer
            'cpython': 'C',                            # python/cpython (Python源码)
            'qbittorrent': 'C++',                      # qbittorrent/qBittorrent
            'qgis': 'C++',                             # qgis/QGIS
            'qmk_firmware': 'C',                       # qmk/qmk_firmware (键盘固件)
            'quarkus': 'Java',                         # quarkusio/quarkus (Java微服务框架)
            'rails': 'Ruby',                           # rails/rails (Ruby Web框架)
            'rancher': 'Go',                           # rancher/rancher (K8s管理)
            'metasploit-framework': 'Ruby',            # rapid7/metasploit-framework
            'ray': 'Python',                           # ray-project/ray (分布式框架)
            'extensions': 'TypeScript',                # raycast/extensions
            'redis': 'C',                              # redis/redis
            'barotrauma': 'C#',                        # Regalis11/Barotrauma
            'remix': 'TypeScript',                     # remix-run/remix (React框架)
            'renovate': 'TypeScript',                  # renovatebot/renovate
            'rocket.chat': 'TypeScript',               # RocketChat/Rocket.Chat
            'rpcs3': 'C++',                            # RPCS3/rpcs3 (PS3模拟器)
            'rstudio': 'R',                            # rstudio/rstudio (R语言IDE)
            'ruffle': 'Rust',                          # ruffle-rs/ruffle (Flash模拟器)
            'rust': 'Rust',                            # rust-lang/rust
            'engineering-education': 'Markdown',       # section-engineering-education/engineering-education
            'serenity': 'C++',                         # SerenityOS/serenity
            'fnf-psychengine': 'GML',                  # ShadowMario/FNF-PsychEngine (GameMaker语言)
            'skyrat-tg': 'Python',                     # Skyrat-SS13/Skyrat-tg (SS13模组)
            'solana': 'Rust',                          # solana-labs/solana
            'token-list': 'TypeScript',                # solana-labs/token-list
            'sourcegraph': 'TypeScript',               # sourcegraph/sourcegraph (前端核心)
            'spack': 'Python',                         # spack/spack (包管理)
            'spyder': 'Python',                        # spyder-ide/spyder (Python IDE)
            'storybook': 'TypeScript',                 # storybookjs/storybook
            'strapi': 'TypeScript',                    # strapi/strapi (Node.js CMS)
            'kit': 'JavaScript',                       # sveltejs/kit (Svelte框架)
            'symfony': 'PHP',                          # symfony/symfony (PHP框架)
            'systemd': 'C',                            # systemd/systemd (Linux系统服务)
            'tachiyomi': 'Kotlin',                     # tachiyomiorg/tachiyomi (安卓APP)
            'tachiyomi-extensions': 'Kotlin',          # tachiyomiorg/tachiyomi-extensions
            'tailscale': 'Go',                         # tailscale/tailscale
            'tdengine': 'C',                           # taosdata/TDengine (时序数据库)
            'typroaction': 'TypeScript',               # taozhiyu/TyProAction
            'newpipe': 'Java',                         # TeamNewPipe/NewPipe (安卓APP)
            'termux-packages': 'Shell',                # termux/termux-packages
            'tgstation': 'Python',                     # tgstation/tgstation
            'tokens': 'TypeScript',                    # TP-Lab/tokens
        }
        
        return language_mapping