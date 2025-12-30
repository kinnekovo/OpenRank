import pandas as pd
import numpy as np
import re
from collections import Counter, defaultdict
from datetime import datetime, timedelta
import logging
from pathlib import Path
import sys
import os

# 添加当前目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import *

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class KeywordMiner:
    """技术关键词挖掘器"""
    
    def __init__(self):
        """初始化关键词挖掘器"""
        self.stopwords = set(STOPWORDS)
        self.tech_keywords = set(TECH_KEYWORDS)
        self.keyword_scores = {}
        self.trend_data = {}
        
    def extract_keywords_from_text(self, text):
        """从文本中提取技术关键词"""
        if not text:
            return []
        
        # 转换为小写并移除特殊字符
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)
        
        # 分词
        words = text.split()
        
        # 过滤停用词和短词
        keywords = []
        for word in words:
            if (len(word) >= 3 and 
                word not in self.stopwords and 
                not word.isdigit() and
                not re.match(r'^[a-f0-9]+$', word)):  # 排除哈希值
                keywords.append(word)
        
        return keywords
    
    def calculate_tf_idf(self, documents):
        """计算TF-IDF关键词权重"""
        logger.info("开始计算TF-IDF关键词权重...")
        
        # 统计所有文档中的词频
        all_word_counts = Counter()
        doc_word_counts = []
        
        for doc in documents:
            words = self.extract_keywords_from_text(doc)
            word_count = Counter(words)
            doc_word_counts.append(word_count)
            all_word_counts.update(words)
        
        # 计算TF-IDF
        keyword_scores = {}
        total_docs = len(documents)
        
        for word, total_freq in all_word_counts.items():
            # 计算逆文档频率
            doc_freq = sum(1 for count in doc_word_counts if word in count)
            idf = np.log(total_docs / doc_freq) if doc_freq > 0 else 0
            
            # 计算平均词频
            tf = np.mean([count.get(word, 0) for count in doc_word_counts])
            
            # 计算TF-IDF分数
            tfidf_score = tf * idf
            
            # 只保留技术相关的关键词
            if (tfidf_score > 0.1 and 
                (word in self.tech_keywords or 
                 any(tech_word in word or word in tech_word 
                     for tech_word in self.tech_keywords))):
                keyword_scores[word] = {
                    'tfidf_score': tfidf_score,
                    'frequency': total_freq,
                    'doc_frequency': doc_freq,
                    'is_tech_keyword': word in self.tech_keywords
                }
        
        # 按TF-IDF分数排序
        sorted_keywords = dict(sorted(keyword_scores.items(), 
                                    key=lambda x: x[1]['tfidf_score'], 
                                    reverse=True))
        
        self.keyword_scores = sorted_keywords
        logger.info(f"提取了 {len(sorted_keywords)} 个技术关键词")
        
        return sorted_keywords
    
    def analyze_trends_by_language(self, projects_df, time_series_df):
        """按编程语言分析技术趋势"""
        logger.info("开始按编程语言分析技术趋势...")
        
        language_trends = {}
        
        for language in projects_df['language'].unique():
            lang_projects = projects_df[projects_df['language'] == language]
            lang_time_series = time_series_df[time_series_df['language'] == language]
            
            if len(lang_projects) == 0:
                continue
            
            # 确保日期列为datetime类型
            lang_time_series = lang_time_series.copy()
            lang_time_series['date'] = pd.to_datetime(lang_time_series['date'])
            lang_time_series.set_index('date', inplace=True)
            
            # 计算该语言的整体趋势
            monthly_data = lang_time_series.groupby(pd.Grouper(freq='ME')).agg({
                'stars': 'sum',
                'forks': 'sum',
                'activity_score': 'mean',
                'openrank': 'mean',
                'contributors': 'sum'
            }).reset_index()
            
            monthly_data = monthly_data.sort_values('date')
            
            # 计算增长率
            if len(monthly_data) > 1:
                monthly_data['stars_growth'] = monthly_data['stars'].pct_change().fillna(0)
                monthly_data['activity_growth'] = monthly_data['activity_score'].pct_change().fillna(0)
            
            # 评估成熟度
            avg_activity = monthly_data['activity_score'].mean()
            recent_growth = monthly_data['activity_growth'].tail(6).mean() if 'activity_growth' in monthly_data.columns else 0
            
            if recent_growth > 0.2:
                maturity_stage = 'emerging'
            elif recent_growth > 0.05:
                maturity_stage = 'growing'
            elif recent_growth > -0.05:
                maturity_stage = 'mature'
            else:
                maturity_stage = 'declining'
            
            language_trends[language] = {
                'projects_count': len(lang_projects),
                'total_stars': lang_projects['stars'].sum(),
                'avg_activity': avg_activity,
                'maturity_stage': maturity_stage,
                'growth_rate': recent_growth,
                'monthly_data': monthly_data.to_dict('records'),
                'top_projects': lang_projects.nlargest(5, 'stars')[['repo_name', 'stars', 'openrank']].to_dict('records')
            }
        
        self.trend_data = language_trends
        logger.info(f"分析了 {len(language_trends)} 种编程语言的趋势")
        
        return language_trends
    
    def generate_emerging_keywords(self):
        """识别新兴技术关键词"""
        logger.info("识别新兴技术关键词...")
        
        emerging_keywords = []
        
        for keyword, scores in self.keyword_scores.items():
            # 基于频率和文档频率判断是否为新兴技术
            if (scores['frequency'] > 10 and 
                scores['doc_frequency'] > 2 and
                scores['tfidf_score'] > 0.5):
                emerging_keywords.append({
                    'keyword': keyword,
                    'tfidf_score': scores['tfidf_score'],
                    'frequency': scores['frequency'],
                    'confidence': min(1.0, scores['doc_frequency'] / 10)
                })
        
        # 按TF-IDF分数排序
        emerging_keywords.sort(key=lambda x: x['tfidf_score'], reverse=True)
        
        logger.info(f"识别了 {len(emerging_keywords)} 个新兴技术关键词")
        
        return emerging_keywords[:20]  # 返回前20个
    
    def analyze_tech_ecosystem(self, language_trends):
        """分析技术生态系统"""
        logger.info("分析技术生态系统...")
        
        ecosystem_analysis = {
            'dominant_languages': [],
            'rising_stars': [],
            'declining_technologies': [],
            'balanced_ecosystem': {},
            'technology_clusters': []
        }
        
        # 识别主导语言（项目数量多且活跃度高）
        for lang, data in language_trends.items():
            if (data['projects_count'] >= 3 and 
                data['avg_activity'] > 0.6 and
                data['maturity_stage'] == 'mature'):
                ecosystem_analysis['dominant_languages'].append({
                    'language': lang,
                    'projects': data['projects_count'],
                    'activity': data['avg_activity']
                })
        
        # 识别上升之星
        for lang, data in language_trends.items():
            if data['growth_rate'] > 0.15:
                ecosystem_analysis['rising_stars'].append({
                    'language': lang,
                    'growth_rate': data['growth_rate'],
                    'current_activity': data['avg_activity']
                })
        
        # 识别衰退技术
        for lang, data in language_trends.items():
            if data['growth_rate'] < -0.1:
                ecosystem_analysis['declining_technologies'].append({
                    'language': lang,
                    'decline_rate': data['growth_rate'],
                    'current_activity': data['avg_activity']
                })
        
        # 计算生态系统平衡度
        total_projects = sum(data['projects_count'] for data in language_trends.values())
        ecosystem_analysis['balance_score'] = 1.0 - max([
            data['projects_count'] / total_projects 
            for data in language_trends.values()
        ])
        
        logger.info("技术生态系统分析完成")
        
        return ecosystem_analysis
    
    def generate_insights_report(self):
        """生成技术洞察报告"""
        logger.info("生成技术洞察报告...")
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'summary': {},
            'detailed_analysis': {},
            'recommendations': []
        }
        
        # 生成总结
        report['summary'] = {
            'total_keywords_analyzed': len(self.keyword_scores),
            'top_5_keywords': list(self.keyword_scores.keys())[:5],
            'emerging_tech_count': len(self.generate_emerging_keywords()),
            'languages_tracked': len(self.trend_data)
        }
        
        # 生成详细分析
        if self.trend_data:
            ecosystem = self.analyze_tech_ecosystem(self.trend_data)
            report['detailed_analysis'] = {
                'ecosystem_health': {
                    'dominant_languages': ecosystem['dominant_languages'],
                    'rising_stars': ecosystem['rising_stars'],
                    'declining_tech': ecosystem['declining_technologies'],
                    'balance_score': ecosystem['balance_score']
                },
                'language_details': self.trend_data
            }
        
        # 生成建议
        recommendations = []
        
        if self.trend_data:
            # 基于趋势给出建议
            for lang, data in self.trend_data.items():
                if data['maturity_stage'] == 'emerging' and data['growth_rate'] > 0.2:
                    recommendations.append({
                        'type': 'technology_adoption',
                        'technology': lang,
                        'priority': 'high',
                        'reason': f'新兴技术，增长率{data["growth_rate"]:.1%}，建议关注',
                        'action': '建议开始学习或小规模试点应用'
                    })
                elif data['maturity_stage'] == 'declining':
                    recommendations.append({
                        'type': 'technology_migration',
                        'technology': lang,
                        'priority': 'medium',
                        'reason': f'技术衰退，增长率{data["growth_rate"]:.1%}',
                        'action': '建议规划技术迁移，寻找替代方案'
                    })
        
        report['recommendations'] = recommendations
        
        logger.info("技术洞察报告生成完成")
        
        return report
    
    def save_results(self):
        """保存挖掘结果"""
        try:
            logger.info("保存关键词挖掘结果...")
            
            # 保存关键词数据
            keyword_df = pd.DataFrame([
                {
                    'keyword': k,
                    'tfidf_score': v['tfidf_score'],
                    'frequency': v['frequency'],
                    'doc_frequency': v['doc_frequency'],
                    'is_tech_keyword': v['is_tech_keyword']
                }
                for k, v in self.keyword_scores.items()
            ])
            keyword_df.to_csv('./data/processed/keywords.csv', index=False, encoding='utf-8')
            
            # 保存趋势数据
            if self.trend_data:
                trend_rows = []
                for lang, data in self.trend_data.items():
                    trend_rows.append({
                        'language': lang,
                        'projects_count': data['projects_count'],
                        'total_stars': data['total_stars'],
                        'avg_activity': data['avg_activity'],
                        'maturity_stage': data['maturity_stage'],
                        'growth_rate': data['growth_rate']
                    })
                
                trend_df = pd.DataFrame(trend_rows)
                trend_df.to_csv('./data/processed/language_trends.csv', index=False, encoding='utf-8')
            
            # 保存洞察报告
            report = self.generate_insights_report()
            import json
            
            # 处理numpy和pandas类型以支持JSON序列化
            def convert_types(obj):
                if isinstance(obj, (np.integer, pd.Int64Dtype)):
                    return int(obj)
                elif isinstance(obj, (np.floating, pd.Float64Dtype)):
                    return float(obj)
                elif isinstance(obj, np.ndarray):
                    return obj.tolist()
                elif isinstance(obj, (pd.Timestamp, datetime)):
                    return obj.isoformat()
                elif isinstance(obj, dict):
                    return {key: convert_types(value) for key, value in obj.items()}
                elif isinstance(obj, list):
                    return [convert_types(item) for item in obj]
                return obj
            
            report = convert_types(report)
            
            with open('./data/processed/insights_report.json', 'w', encoding='utf-8') as f:
                json.dump(report, f, ensure_ascii=False, indent=2)
            
            logger.info("关键词挖掘结果保存完成")
            return True
            
        except Exception as e:
            logger.error(f"保存结果失败: {str(e)}")
            return False
    
    def run_keyword_mining(self, projects_df, time_series_df):
        """运行完整的关键词挖掘流程"""
        logger.info("开始关键词挖掘流程...")
        
        try:
            # 1. 准备文本数据
            documents = []
            
            # 从项目名称和描述中提取文本
            for _, project in projects_df.iterrows():
                text = f"{project['repo_name']} {project.get('description', '')}"
                documents.append(text)
            
            # 从时序数据中提取文本
            for _, row in time_series_df.iterrows():
                text = f"{row['repo_name']} {row['language']}"
                documents.append(text)
            
            # 2. 计算TF-IDF
            self.calculate_tf_idf(documents)
            
            # 3. 分析技术趋势
            self.analyze_trends_by_language(projects_df, time_series_df)
            
            # 4. 生成新兴关键词
            emerging = self.generate_emerging_keywords()
            logger.info(f"发现 {len(emerging)} 个新兴技术关键词")
            
            # 5. 保存结果
            self.save_results()
            
            # 6. 生成报告
            report = self.generate_insights_report()
            
            logger.info("关键词挖掘流程完成！")
            
            # 输出统计信息
            print("\n=== 关键词挖掘完成统计 ===")
            print(f"分析文档数: {len(documents)}")
            print(f"提取关键词数: {len(self.keyword_scores)}")
            print(f"编程语言数: {len(self.trend_data)}")
            print(f"新兴技术数: {len(emerging)}")
            print(f"建议数量: {len(report['recommendations'])}")
            
            return True
            
        except Exception as e:
            logger.error(f"关键词挖掘流程失败: {str(e)}")
            return False

def main():
    """主函数"""
    try:
        # 读取处理后的数据
        projects_df = pd.read_csv('./data/processed/projects.csv')
        time_series_df = pd.read_csv('./data/processed/time_series.csv')
        
        # 初始化关键词挖掘器
        miner = KeywordMiner()
        
        # 运行挖掘流程
        success = miner.run_keyword_mining(projects_df, time_series_df)
        
        if success:
            print("\n✅ 关键词挖掘完成！可以开始下一步：训练LSTM趋势预测模型")
        else:
            print("\n❌ 关键词挖掘失败，请检查日志")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"程序运行失败: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()