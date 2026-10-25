# ResearchFlow

**Financial Research Intelligence Platform** — 面向证券公司行业研究员的财务数据自动化分析平台。

ResearchFlow 的目标是减少研究员在上市公司财务数据整理、指标计算、可视化与研究报告制作中的重复性工作。第一版聚焦 **A 股医药生物行业** 的财务分析场景。

> 当前状态：**Phase 3 — 全部页面接入真实数据，无演示数据**。
> 数据来源两种：导入 Wind / Choice 导出的财务数据，或**按证券代码从东方财富公开接口直接拉取**（无需 Wind 权限）→ 自动标准化入库（SQLite）→ 单季度拆分、同比环比 → 总览 / 财务分析 / 公司对比 / 财报速览 → 规则引擎自动告警 → 一键生成 Word 研究报告初稿。
> 公开数据已用恒瑞医药 2023 / 2024 年报公告逐项核对（见 `backend/scripts/verify_public_data.py`）。

---

## 产品介绍

| 模块 | 路由 | 说明 |
| --- | --- | --- |
| 总览 Overview | `/` | 子行业 / 报告期筛选，KPI、营收增速趋势、行业表现、公司财务概览、近期告警，后端连接状态 |
| 数据管理 Data Management | `/data` | 导入 Wind / Choice 导出的 Excel / CSV；**按代码从东方财富拉取三大报表**；数据集列表与删除；导出全部底表 |
| 财报速览 Earnings Snapshot | `/snapshot` | **真实数据**：单季度拆分、同比环比、点评数据段落、四张标准图（导出 PNG）、季度明细、导出底表 Excel |
| 财务分析 Financial Analytics | `/analytics` | 33 个指标（规模 / 单季度 / 成长 / 盈利 / 费用 / 资产质量）、子行业与区间筛选、趋势图、排名、数据表 |
| 公司对比 Company Comparison | `/comparison` | 公司多选（2–10 家）、指标选择、柱状 / 折线对比图、对比表格 |
| 异常监控 Alert Center | `/alerts` | 真实规则引擎：导入后自动评估最新报告期，规则可增删改、阈值可调，告警可确认 / 解除 / 重新激活 |
| 报告生成 Report Generator | `/reports` | 四类 Word 报告（公司深度 / 同业对比 / 定期跟踪 / 行业综述），含表格、matplotlib 图表、点评段落、活跃告警 |
| 设置 Settings | `/settings` | 工作区名、研究所署名、数据来源、默认口径、图表期数，持久化到 SQLite 并作用于图表与报告 |

### 产品最终需要支持（路线图）

1. Excel / CSV 财务数据导入 ✅（Phase 2）；公开数据源拉取 ✅（Phase 4）
2. 自动数据清洗和标准化 ✅（Phase 2：字段映射、单位统一、报告期识别）
3. 财务指标计算 ✅（Phase 2：单季度拆分、同比 / 环比、毛利率 / 净利率 / 费用率 / 周转天数）
4. 上市公司财务分析 Dashboard ✅（Phase 3）
5. 多家公司财务对比 ✅（Phase 3）
6. 关键财务指标异常监控 ✅（Phase 3：规则引擎）
7. 自动化行业研究报告生成 ✅（Phase 3：Word 初稿，四种报告类型）

### 财报速览解决的四个痛点

| 实习生痛点 | ResearchFlow 的做法 |
| --- | --- |
| 底表重复更新 | 导入 Wind / Choice 导出文件即自动映射字段、换算为亿元、写入 SQLite；一键导出带累计 / 单季 / 比率 / 同比四个区块的标准底表 |
| 单季度拆分易错 | 后端按相邻报告期累计值自动差分，缺上一期时留空而不是算错；同比 / 环比口径固定 |
| 点评段落机械填数 | 自动生成「营收 / 净利润 / 扣非 / 毛利率 / 费用率 / 单季度 / 现金流」四段数据描述，一键复制 |
| 标准图重复制作 | 营收及增速、净利润及增速、利润率、期间费用率四张图，单季 / 累计切换，导出带标题、图例与资料来源的 PNG |

详细的产品背景、用户痛点与开发阶段规划见 [docs/product-requirements.md](docs/product-requirements.md)；项目完整复盘（从问题到各开发阶段的手把手讲解）见 [docs/project-walkthrough.md](docs/project-walkthrough.md)。

---

## 技术栈

**前端**

- Next.js 16（App Router）
- TypeScript
- Tailwind CSS v4
- shadcn/ui（Base UI 版本）
- Lucide Icons
- Recharts

**后端**

- Python 3.11+（本地验证环境为 3.13）
- FastAPI + Uvicorn
- pydantic-settings（环境变量配置）
- openpyxl（Excel 读写）、python-multipart（文件上传）
- python-docx（Word 报告）、matplotlib（报告图表，使用系统中文字体）
- requests（东方财富公开接口）

**数据库**

- SQLite（标准库 `sqlite3`），文件位于 `backend/data/researchflow.db`，启动时自动建表。

---

## 目录结构

```
researchflow/
├── frontend/                         # Next.js 前端
│   ├── app/                          # App Router 页面
│   │   ├── layout.tsx                # 根布局（AppShell + TooltipProvider）
│   │   ├── page.tsx                  # / 总览
│   │   ├── snapshot/                 # /snapshot 财报速览（真实数据）
│   │   ├── data/ analytics/ comparison/ alerts/ reports/ settings/
│   │   └── globals.css               # 设计令牌（品牌深蓝、图表色板）
│   ├── components/
│   │   ├── layout/                   # 侧边栏、Header、AppShell、PageHeader
│   │   ├── shared/                   # 筛选器、演示数据标记、状态徽章、阶段提示
│   │   ├── charts/                   # Recharts 封装（折线 / 柱状 / 分组柱状）
│   │   ├── snapshot/                 # 财报速览：图表卡片、点评卡片、季度明细表
│   │   ├── data/                     # 数据管理：上传区、导入结果、数据集表
│   │   ├── overview/ analytics/ comparison/ alerts/ reports/ settings/
│   │   └── ui/                       # shadcn/ui 组件
│   ├── hooks/
│   │   ├── use-async.ts              # 通用异步数据 hook
│   │   ├── use-panel.ts              # 分析面板数据
│   │   ├── use-settings.ts           # 工作区设置
│   │   └── use-backend-status.ts     # 实际请求 /api/health 与 /api/version
│   ├── lib/
│   │   ├── panel.ts                  # 分析面板的客户端派生计算（筛选、均值、趋势、排名、格式化）
│   │   ├── format.ts                 # 数值 / 日期格式化
│   │   ├── navigation.ts             # 侧边栏导航配置
│   │   ├── chart-export.ts           # Recharts SVG → PNG（补标题 / 图例 / 资料来源）
│   │   └── api.ts                    # 后端 API 客户端
│   ├── types/
│   │   ├── index.ts                  # 后端健康检查类型
│   │   └── api.ts                    # 后端 API 响应类型（与 Pydantic 模型对齐）
│   └── .env.example
├── backend/                          # FastAPI 后端
│   ├── app/
│   │   ├── main.py                   # 应用入口、CORS、SQLite 生命周期
│   │   ├── api/
│   │   │   ├── router.py             # /api 路由汇总
│   │   │   └── routes/
│   │   │       ├── system.py         # GET /api/health、/api/version
│   │   │       ├── datasets.py       # 导入 / 列表 / 删除 / 示例文件 / 统计
│   │   │       ├── companies.py      # 公司列表、全部指标、财报速览
│   │   │       ├── analytics.py      # 分析面板：全部公司 × 报告期 × 指标
│   │   │       ├── alerts.py         # 告警规则 CRUD、评估、状态流转
│   │   │       ├── reports.py        # Word 报告生成 / 下载 / 删除
│   │   │       ├── settings.py       # 工作区设置
│   │   │       └── export.py         # 标准底表 Excel 导出
│   │   ├── core/
│   │   │   ├── config.py             # 环境变量配置
│   │   │   ├── db.py                 # SQLite 连接与建表
│   │   │   └── deps.py               # 依赖注入
│   │   ├── services/
│   │   │   ├── fields.py             # 标准字段与 Wind / Choice 科目别名、单位换算
│   │   │   ├── periods.py            # 报告期解析（2024-12-31 / 2024Q3 / 2024年报 …）
│   │   │   ├── parser.py             # 宽表 / 长表解析器
│   │   │   ├── metrics.py            # 单季度拆分、同比环比、比率、周转天数
│   │   │   ├── commentary.py         # 点评数据段落模板
│   │   │   ├── catalog.py            # 分析指标目录（33 个指标的定义与展平）
│   │   │   ├── industry.py           # 医药子行业分类表
│   │   │   ├── alerts.py             # 告警规则引擎
│   │   │   ├── charts.py             # matplotlib 图表（报告用）
│   │   │   ├── reports.py            # Word 报告生成（python-docx）
│   │   │   ├── settings_store.py     # 设置 key-value
│   │   │   ├── public_data.py        # 东方财富 F10 三大报表拉取 → ParsedFact
│   │   │   ├── repository.py         # SQLite 数据访问
│   │   │   └── exporter.py           # 底表 Excel 生成
│   │   └── models/schemas.py         # Pydantic 响应模型
│   ├── samples/wind_sample_pharma.xlsx  # Wind 风格示例文件（演示数据）
│   ├── scripts/make_sample.py        # 生成示例文件
│   ├── scripts/verify_public_data.py # 用年报公告与数据源同比字段核对拉取结果
│   ├── tests/                        # pytest：解析器、指标计算、导入 API、系统接口
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── .env.example
├── docs/
│   ├── product-requirements.md       # 产品需求文档
│   ├── intern-workflow.md            # 实习生工作流与痛点
│   └── project-walkthrough.md        # 完整复盘：从问题到各开发阶段的手把手讲解
├── .claude/launch.json               # 本地开发服务器启动配置
└── README.md
```

---

## 本地运行

### 1. 启动后端（FastAPI）

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

- 健康检查：<http://localhost:8000/api/health>
- 版本信息：<http://localhost:8000/api/version>
- 交互式文档：<http://localhost:8000/docs>

主要业务接口：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/datasets/import` | 上传 Wind / Choice 导出的 .xlsx / .csv 并入库 |
| POST | `/api/datasets/import-sample` | 导入内置示例文件 |
| POST | `/api/datasets/fetch` | `{codes: ["600276.SH"], start_year: 2020}` 从东方财富拉取并入库 |
| GET | `/api/datasets` · DELETE `/api/datasets/{id}` | 数据集列表 / 删除 |
| GET | `/api/companies` | 已导入的公司 |
| GET | `/api/companies/{code}/snapshot?period=` | 财报速览：指标 + 点评段落 + 全部报告期序列 |
| GET | `/api/export/worksheet?codes=` | 标准底表 Excel |
| GET | `/api/analytics/panel` | 全部公司 × 报告期 × 33 个指标，供总览 / 财务分析 / 公司对比使用 |
| GET/POST | `/api/alerts`、`/api/alerts/evaluate`、`/api/alerts/rules` | 告警列表、重新评估、规则管理；PATCH `/api/alerts/{id}` 改状态 |
| GET/POST | `/api/reports` · GET `/api/reports/{id}/download` | 生成 / 下载 Word 报告 |
| GET/PUT | `/api/settings` | 工作区设置 |

示例文件由 `python scripts/make_sample.py` 生成（仓库已包含）。

可选：复制 `backend/.env.example` 为 `backend/.env` 以修改环境名或 CORS 允许的来源。

### 2. 启动前端（Next.js）

```bash
cd frontend
npm install
cp .env.example .env.local         # 默认后端地址 http://localhost:8000
npm run dev
```

打开 <http://localhost:3000> 即可看到 ResearchFlow 工作台。总览页顶部的「后端服务」组件会实际请求 `/api/health`，显示 Connected / Disconnected。

**体验财报速览**：进入「数据管理」→ 在「从公开数据源拉取」输入证券代码点击「拉取并导入」（或导入示例文件 / 拖入 Wind 导出文件）→ 进入「财报速览」选择公司与报告期。

**核对数据口径**（需要网络）：

```bash
cd backend && source .venv/bin/activate && python scripts/verify_public_data.py 600276.SH
```

### 3. 验证命令

```bash
# 前端
cd frontend && npm run lint && npx tsc --noEmit && npm run build

# 后端
cd backend && source .venv/bin/activate && pytest
```

---

## 数据说明

- 所有页面都使用后端标准化后的数据（SQLite），没有前端演示数据。尚未导入时页面显示空状态并提供「导入示例文件」入口。
- **公开数据源**：东方财富网页端 F10 的 JSON 接口（`emweb.securities.eastmoney.com`），返回累计口径、单位为元的三大报表，映射到 14 个标准科目后与文件导入走同一流程。接口为非官方公开接口，若变动请修改 `services/public_data.py`。验证脚本证明：恒瑞医药 2023 / 2024 年报的营收、归母净利润、扣非净利润及同比与公告完全一致，自算同比与数据源自带同比在 0.01 pct 内一致。
- 内置示例文件 `backend/samples/wind_sample_pharma.xlsx` 模拟 Wind 宽表格式（6 家医药公司 × 2022Q1–2024Q4），数值由确定性公式生成，其中两家公司在 2024 年设置了业绩下滑场景用于演示告警，**不代表任何公司的真实财务状况**。
- 子行业分类来自 `backend/app/services/industry.py` 的内置对照表（约 50 个常见医药 A 股代码），未收录的代码归为「其他」。
- 告警规则默认 7 条（营收下滑、净利润大幅下滑、单季环比下滑、毛利率警戒、销售费用率偏高、负债率偏高、ROE 低于基准），每次导入后自动评估各公司最新报告期。
- 导入支持：Wind 宽表（证券代码 | 证券简称 | 指标名称 | 报告期列…）、长表（证券代码 | 报告期 | 营业收入 | …）、单公司工作表（标题含代码）；单位从「单位：万元」或科目括号识别，缺省按元换算。
- 口径：利润表 / 现金流量表为累计口径，单季度由相邻累计值差分；同比对上年同期，环比对上一季度；ROE 为摊薄口径；周转天数 = 期末余额 / 累计成本（收入）× 报告期天数。
