-- 创建openrank数据库
CREATE DATABASE IF NOT EXISTS openrank;

USE openrank;

-- 创建GitHub项目基础信息表
CREATE TABLE IF NOT EXISTS github_projects (
    id UInt64,
    repo_name String,
    full_name String,
    description String,
    language String,
    stars UInt64,
    forks UInt64,
    issues UInt64,
    openrank Float64,
    created_at DateTime,
    updated_at DateTime,
    archived Bool,
    disabled Bool,
    primary key (id),
    index idx_repo_name repo_name,
    index idx_language language,
    index idx_stars stars,
    index idx_openrank openrank
) ENGINE = MergeTree()
ORDER BY id;

-- 创建GitHub活动时序数据表
CREATE TABLE IF NOT EXISTS github_activity (
    id UInt64,
    repo_id UInt64,
    repo_name String,
    date Date,
    stars UInt64,
    forks UInt64,
    issues UInt64,
    prs UInt64,
    commits UInt64,
    contributors UInt64,
    openrank Float64,
    activity_score Float64,
    language String,
    created_at DateTime DEFAULT now(),
    primary key (repo_id, date),
    index idx_repo_name repo_name,
    index idx_date date,
    index idx_language language,
    index idx_activity activity_score
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (repo_id, date);

-- 创建技术关键词表
CREATE TABLE IF NOT EXISTS tech_keywords (
    id UInt64,
    keyword String,
    category String,
    frequency UInt64,
    popularity_score Float64,
    trend_score Float64,
    language String,
    first_seen Date,
    last_seen Date,
    primary key (id),
    index idx_keyword keyword,
    index idx_category category,
    index idx_language language,
    index idx_popularity popularity_score
) ENGINE = MergeTree()
ORDER BY id;

-- 创建关键词时序表
CREATE TABLE IF NOT EXISTS keyword_trends (
    id UInt64,
    keyword_id UInt64,
    date Date,
    frequency UInt64,
    popularity Float64,
    sentiment Float64,
    created_at DateTime DEFAULT now(),
    primary key (keyword_id, date),
    index idx_keyword_id keyword_id,
    index idx_date date
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (keyword_id, date);

-- 创建影响力分析结果表
CREATE TABLE IF NOT EXISTS influence_analysis (
    id UInt64,
    repo_id UInt64,
    repo_name String,
    date Date,
    influence_score Float64,
    openrank Float64,
    stars_weight Float64,
    forks_weight Float64,
    activity_weight Float64,
    maturity_stage String,
    growth_rate Float64,
    created_at DateTime DEFAULT now(),
    primary key (repo_id, date),
    index idx_repo_name repo_name,
    index idx_date date,
    index idx_maturity_stage maturity_stage
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (repo_id, date);

-- 创建趋势预测表
CREATE TABLE IF NOT EXISTS trend_predictions (
    id UInt64,
    target_keyword String,
    target_date Date,
    predicted_popularity Float64,
    confidence Float64,
    trend_direction String,
    created_at DateTime DEFAULT now(),
    primary key (id),
    index idx_target_keyword target_keyword,
    index idx_target_date target_date
) ENGINE = MergeTree()
ORDER BY id;