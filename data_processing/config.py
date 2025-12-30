# ClickHouse连接配置
CLICKHOUSE_HOST = "localhost"
CLICKHOUSE_PORT = 9000
CLICKHOUSE_USER = "default"
CLICKHOUSE_PASSWORD = ""
CLICKHOUSE_DATABASE = "openrank"

# GitHub数据源配置
GITHUB_DATA_URL = "https://github.com/X-lab2017/open-digger/tree/master/github_Dataset"

# 数据路径配置
DATA_RAW_PATH = "./data/raw"
DATA_PROCESSED_PATH = "./data/processed"
DATA_MODELS_PATH = "./data/models"

# 时间序列配置
START_DATE = "2015-01-01"
END_DATE = "2024-12-31"
TIME_GRANULARITY = "monthly"  # daily, weekly, monthly, yearly

# 关键词过滤配置
STOPWORDS = [
    "fix", "update", "add", "change", "remove", "delete",
    "merge", "commit", "push", "pull", "clone", "fork",
    "issue", "pr", "bug", "feature", "test", "docs",
    "refactor", "style", "perf", "security", "ci",
    "api", "file", "path", "code", "function", "class",
    "method", "variable", "parameter", "return", "new", "old"
]

# 技术关键词白名单（包含常见技术栈）
TECH_KEYWORDS = [
    # 编程语言
    "python", "javascript", "typescript", "java", "go", "rust",
    "cpp", "c++", "c#", "ruby", "php", "swift", "kotlin",
    "scala", "r", "matlab", "julia", "dart", "elixir",
    # 前端框架
    "react", "vue", "angular", "svelte", "nextjs", "nuxt",
    "gatsby", "vite", "webpack", "rollup", "babel", "tailwind",
    # 后端框架
    "django", "flask", "fastapi", "spring", "express", "nestjs",
    "koa", "fastify", "rails", "laravel", "aspnet", "gin",
    # 数据库
    "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
    "sqlite", "mariadb", "oracle", "dynamodb", "cassandra",
    # 机器学习/AI
    "tensorflow", "pytorch", "keras", "scikit-learn", "pandas",
    "numpy", "opencv", "nlp", "gpt", "llm", "transformer",
    "bert", "attention", "diffusion", "gan", "rl", "rlhf",
    # 云原生
    "kubernetes", "docker", "terraform", "ansible", "jenkins",
    "gitlab", "github", "aws", "azure", "gcp", "serverless",
    "microservice", "service-mesh", "istio", "envoy",
    # 其他技术
    "graphql", "rest", "grpc", "websocket", "oauth", "jwt",
    "blockchain", "web3", "crypto", "defi", "nft"
]

# LSTM模型配置
LSTM_UNITS = 64
LSTM_LAYERS = 2
EPOCHS = 100
BATCH_SIZE = 32
PREDICTION_DAYS = 30
SEQUENCE_LENGTH = 60

# 影响力计算权重
WEIGHT_OPENRANK = 0.5
WEIGHT_STARS = 0.3
WEIGHT_FORKS = 0.2

# 成熟度阈值
MATURITY_THRESHOLDS = {
    "emerging": 0.2,      # 萌芽期
    "growing": 0.5,       # 成长期
    "mature": 0.8,        # 成熟期
    "declining": -0.3     # 衰退期（增长率）
}