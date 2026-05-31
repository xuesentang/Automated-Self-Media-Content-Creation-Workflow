# CLAUDE.md — AI深度创作引擎项目上下文

## 项目概述

**AI深度创作引擎** — 一个面向学习者的深度文章写作工具。核心理念：AI教你怎么写得更好，写作这件事人自己来。

产品不是AI代写工具，而是**学习反馈闭环**：用户通过知识库获取素材 → 将碎片化洞察转化为结构化文章 → 完成从输入到输出的完整链路。

### 核心工作流

```
结构化输入(≥60字) → 架构师生成骨架 → 用户审核骨架 → 用户写初稿 → 导师审阅 → 用户回应修改 → 终审定稿 → 格式适配 → 存入仓库
```

5个人工卡点，AI只负责"审"和"改格式"，人负责"写"和"定方向"。

### 独立模块

- **知识库查阅**：独立面板，写作全程可随时打开搜索/提问
- **风格Skill**：独立工具，从历史文章提炼写作风格Prompt，不入工作流

---

## 技术栈（已锁定，不讨论选型）

| 层 | 技术 |
|----|------|
| 前端 | React 19 + Vite + TypeScript + XState v5 + Ant Design 5 + Tailwind CSS + TipTap + Axios |
| 后端 | FastAPI + SQLAlchemy + SQLite + OpenAI Python SDK（接 DeepSeek V4 Pro） |
| 通信 | SSE（流式AI接口）+ REST（普通接口） |

---

## 目录结构

```
frontend/
├── src/
│   ├── state/           # XState 状态机（appMachine.ts, appMachine.types.ts, storage.ts）
│   ├── hooks/           # usePersistedMachine.ts
│   ├── services/        # api.ts（Axios实例）, sse.ts（fetchSSE封装）
│   ├── pages/           # WorkflowPage, WarehousePage, StyleSkillPage
│   ├── components/
│   │   ├── workflow/    # 10个步骤组件（InputStep → CompletedStep）
│   │   ├── knowledge/   # KnowledgeDrawer, KnowledgeSearch, KnowledgeChat
│   │   ├── warehouse/   # ArticleList, ArticleDetail
│   │   └── common/      # LoadingOverlay, ErrorBanner, ProgressIndicator
│   └── styles/

backend/
├── main.py              # FastAPI入口 + CORS
├── config.py            # 配置常量（LLM_API_KEY等）
├── database.py          # 数据库连接
├── models.py            # Article ORM模型
├── schemas.py           # Pydantic请求模型
├── routers/             # skeleton, mentor, knowledge, articles, style_skill, publish
├── services/
│   ├── llm.py           # stream_llm / call_llm
│   ├── knowledge_service.py  # 关键词检索 + RAG问答
│   ├── prompt_templates.py   # 全部Agent提示词
│   └── publish_service.py    # 蚁小二API封装（占位，等API文档）
└── data/app.db          # SQLite（gitignore）
```

知识库原始文件位于项目根 `knowledge-base/`，按子目录分类：
- `01-vibe-coding基础/`、`02-编程工具/`、`03-经验技巧/`、`04-产品变现/`

---

## 核心架构：XState 状态机

状态机是整个应用的骨架，所有前端逻辑围绕它运转。

### 状态转移图

```
[input] ──SUBMIT──▶ [architecting] ──done──▶ [skeletonReview]
                       │  error                │
                       ▼                       │ CONFIRM/EDIT
                    [input]                    ▼
                                          [writing] ◀──────────┐
                                              │                 │
                                       SUBMIT_DRAFT    BACK_TO_WRITING
                                              │                 │
                                              ▼                 │
                                       [coaching] ──done──▶ [coachResponse]
                                          │  error              │
                                          ▼                     │ CONFIRM_COACH
                                       [writing]                ▼
                                                             [finalReview]
                                                                  │ CONFIRM_FINAL
                                                                  ▼
                                                             [completed] ──RESET──▶ [input]

KnowledgeBase (parallel):
  [closed] ◀──▶ [open]                (搜索由组件自行管理)
```




### 关键类型

```typescript
Skeleton = { title: string; sections: SkeletonSection[] }  // 注意：不是数组，是对象
MentorFeedback = { items: MentorFeedbackItem[], summary: string, nextStep: string }
```

### Services 注册

Services 在 `usePersistedMachine.ts` 的 `machineServices` 中集中注册，透传给 `useMachine`。**不注册则 invoke 运行时抛异常。**

- `generateSkeleton` → `fetchSSE('/api/skeleton/generate', ...)`
- `getMentorFeedback` → `fetchSSE('/api/mentor/review', ...)`
- 知识库搜索由 `KnowledgeDrawer` 组件内部直接调用 `api.post('/knowledge/search')`，不经过状态机 invoke

---

## API 接口规范

### 统一响应格式

非SSE：`{ "code": 0, "message": "ok", "data": {} }`

### SSE 三接口统一格式

后端发送 `data: {json}\n\n` 流，三种 chunk 类型：

| type | 字段 | 说明 |
|------|------|------|
| `chunk` | `{content: "..."}` | 文本片段，前端拼接 |
| `done` | `{}` | 流结束 |
| `error` | `{message: "..."}` | 异常 |

前端 `fetchSSE` 拼接所有 chunk.content 后 `JSON.parse` 为目标类型。

### 接口清单

| 接口 | 方式 | 类型 |
|------|------|------|
| `/api/skeleton/generate` | POST | SSE → `{title, sections}` |
| `/api/mentor/review` | POST | SSE → `{items, summary, nextStep}` |
| `/api/knowledge/search` | POST | REST → `{results: [...]}` |
| `/api/knowledge/ask` | POST | REST → `{answer, sources}` |
| `/api/articles` | POST | REST → `{id}` |
| `/api/articles` | GET | REST → `{items, total}` |
| `/api/articles/{id}` | GET | REST → Article |
| `/api/articles/{id}` | DELETE | REST → `{code, message}` |
| `/api/style-skill/generate` | POST | REST → `{stylePrompt}` |
| `/api/publish/accounts` | GET | REST → `[{id, platform, accountName}]` |
| `/api/publish/submit` | POST | REST → `{taskId, status}` |
| `/api/publish/status/{task_id}` | GET | REST → `{taskId, status, results}` |

---

## 关键设计决策与约束

### 1. Skeleton 类型是对象不是数组

`Skeleton = { title: string; sections: SkeletonSection[] }`。遍历用 `skeleton.sections.map(...)`，标题用 `skeleton.title`。这是经过多轮审查确认的——API 返回 `{title, sections}` 对象，前端类型必须对齐。

### 2. 知识库检索用关键词匹配，不用向量

知识库约60篇/200KB，这个规模下向量数据库成本远超收益。检索质量靠：段落切分(500字) + 多路加权(标题×10 + 正文TF + 同义词) + matchType可解释。200+篇时再升级为embedding。

### 3. SSE 不用原生 EventSource

POST 场景下统一用 Fetch API + ReadableStream，`fetchSSE` 封装处理残行buffer。

### 4. 终审无反回溯

`finalReview` 状态只能 `CONFIRM_FINAL` → `completed`，不能回退到 writing 或 skeletonReview。

### 5. previousFeedback 预留给后续迭代

多轮审视去重需要传前一轮反馈给导师Agent，MVP阶段注释掉，去掉注释即可启用，无需改状态机结构。

### 6. Tailwind 禁用 preflight

`corePlugins: { preflight: false }`，避免与 Ant Design 样式冲突。

---

## 开发启动

> **虚拟环境**：后端使用 `backend/heartwrite-venv/` 虚拟环境隔离依赖。所有 Python 命令需通过该 venv 执行（如 `heartwrite-venv/Scripts/pip`、`heartwrite-venv/Scripts/uvicorn`）。该目录已在 `.gitignore` 中。

```bash
# 前端
cd frontend
npm create vite@latest . -- --template react-ts
npm install xstate@5 @xstate/react@5 antd@5 @ant-design/v5-patch-for-react-19 react@19 react-dom@19 react-router-dom@6 @tiptap/react @tiptap/starter-kit axios
npm install -D tailwindcss @tailwindcss/typography postcss autoprefixer @types/react @types/react-dom typescript
npx tailwindcss init -p

# 后端（首次创建 venv）
cd backend
python -m venv heartwrite-venv
heartwrite-venv/Scripts/pip install fastapi==0.115.0 uvicorn==0.30.6 sqlalchemy==2.0.35 openai==1.51.0 python-multipart==0.0.12 python-dotenv==1.0.1

# 后端（后续安装新依赖时加 --proxy 走代理）
heartwrite-venv/Scripts/pip install --proxy http://127.0.0.1:7890 <package>
```

启动：`cd backend && heartwrite-venv/Scripts/uvicorn main:app --reload --port 8000` + `cd frontend && npm run dev` → `localhost:5173`

**网络问题**：pip 直连 PyPI 超时时，使用 `--proxy http://127.0.0.1:7890` 走本地代理。

---

## 代码风格约定

### TypeScript / React

- 状态机事件命名：`SUBMIT`、`CONFIRM_SKELETON`、`EDIT_SKELETON`、`BACK_TO_INPUT`（区分不同卡点的CONFIRM）
- RETRY 事件在 `input`/`writing`/`finalReview` 处理（invoke失败后回退到这些状态，用户在那里点重试）
- RESET 事件：`completed` 状态可触发回到 `input` 开始新文章（`CompletedStep` 的"开始新文章"按钮）
- 组件按步骤命名：`InputStep`、`ArchitectingStep`、`SkeletonReviewStep`...
- Action 函数提取为独立 `const`（`clearAll`、`clearDraftAndFeedback`、`logProgress`），不在状态机内联
- 并行状态用 `type: 'parallel'`，知识库子状态不阻断主流程

### Python / FastAPI

- LLM 调用统一走 `services/llm.py` 的 `stream_llm`（异步流式）或 `call_llm`（异步非流式），使用 `AsyncOpenAI` 客户端
- 请求模型集中在 `schemas.py`（Pydantic），路由参数必须使用对应 Schema
- SSE 路由结构三接口一致：`event_stream()` 生成器 → `StreamingResponse`
- Agent 提示词集中在 `services/prompt_templates.py`
- 知识库服务单例，启动时加载，内存索引；`ask()` 方法是异步的（`async def`）

---

## 产品价值观（开发时牢记）

- **卡点设计**：思考和表达是人独有的能力，AI不代劳
- **导师质疑**：人需要对抗性反馈才能进步，不需要廉价鼓励
- **成长可见**：表达能力可以训练，进步应该被自己看到

导师Agent的完整系统提示词见 `mentor-agent-prompt.md`，风格是DanKoe——直接、锋利、不绕弯子，每条反馈必须具体到字词层面。

---

## 技术文档索引

| 文件 | 内容 |
|------|------|
| `tect-design.md` | 融合方案完整技术文档（状态机、API、组件、后端、知识库） |
| `PRD.md` | 产品设计文档 |
| `mentor-agent-prompt.md` | 导师Agent系统提示词 |
| `knowledge-base/` | 知识库原始Markdown文件 |
