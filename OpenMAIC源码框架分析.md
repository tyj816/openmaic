# OpenMAIC 源码框架分析 - 面向二次开发

> 基于你的改造需求，本文档将帮助你快速理解 OpenMAIC 的核心架构，明确哪些模块可以复用、哪些需要调整、哪些需要删除。

---

## 一、技术栈概览

### 核心技术
- **框架**: Next.js 16 (App Router) + React 19 + TypeScript 5
- **状态管理**: Zustand
- **AI 编排**: LangGraph 1.1 (@langchain/langgraph)
- **LLM 调用**: Vercel AI SDK (@ai-sdk/*)
- **样式**: Tailwind CSS 4
- **UI 组件**: Radix UI + shadcn/ui
- **数据库**: Dexie (IndexedDB 封装)

### 关键依赖
```json
{
  "@langchain/langgraph": "^1.1.1",      // 多智能体编排
  "ai": "^6.0.42",                       // Vercel AI SDK
  "@ai-sdk/openai": "^3.0.13",           // OpenAI 支持
  "@ai-sdk/anthropic": "^3.0.23",        // Anthropic 支持
  "@ai-sdk/google": "^3.0.13",           // Google Gemini 支持
  "zustand": "^5.0.10",                  // 状态管理
  "pptxgenjs": "workspace:*",            // PPT 生成（自定义版本）
  "unpdf": "^1.4.0",                     // PDF 解析
  "dexie": "^4.2.1"                      // 本地数据库
}
```

---

## 二、目录结构详解

### 2.1 核心目录映射

```
OpenMAIC/
├── app/                    # Next.js App Router（前端路由 + API 路由）
├── lib/                    # 核心业务逻辑（重点关注）
├── components/             # React UI 组件
├── packages/               # 自定义子包
├── configs/                # 配置常量
└── public/                 # 静态资源
```

---

## 三、lib/ 核心模块分析（按改造需求分类）

### ✅ 完全保留（可直接复用）

#### 1. `lib/generation/` - 生成流水线 ⭐⭐⭐
**用途**: 两阶段课件生成（大纲 → 场景内容）

**核心文件**:
```
lib/generation/
├── generation-pipeline.ts      # 生成流水线主入口
├── outline-generator.ts        # 大纲生成器
├── scene-generator.ts          # 场景内容生成器
├── scene-builder.ts            # 场景构建器
├── action-parser.ts            # Action 解析（⚠️ 需删除）
├── pipeline-runner.ts          # 流水线执行器
├── pipeline-types.ts           # 类型定义
└── prompts/                    # Prompt 模板
    ├── outline-prompt.ts
    ├── slide-prompt.ts
    ├── quiz-prompt.ts
    └── interactive-prompt.ts
```

**关键数据流**:
```typescript
用户输入 
  → generateOutline() 
  → generateSceneContent() 
  → 返回 Scene[]
```

**改造建议**:
- ✅ 保留 `outline-generator.ts` 和 `scene-generator.ts`
- ❌ 删除 `action-parser.ts`（不需要 AI 讲解动作）
- 🔄 调整 Prompt（去掉 Action 生成相关）

---

#### 2. `lib/export/` - 导出功能 ⭐⭐⭐
**用途**: 导出 PPTX 和 HTML

**核心文件**:
```
lib/export/
├── use-export-pptx.ts          # PPTX 导出 Hook
├── svg2base64.ts               # SVG 转 Base64
├── latex-to-omml.ts            # LaTeX 转 Office Math
└── html-parser/                # HTML 解析器
```

**改造建议**:
- ✅ 完全保留，这是赛题的核心要求
- 🆕 需要新增 Word 教案导出功能

---

#### 3. `lib/pdf/` - PDF 解析 ⭐⭐
**用途**: 解析上传的 PDF 文档

**核心文件**:
```
lib/pdf/
├── pdf-providers.ts            # PDF 解析服务商
├── types.ts                    # 类型定义
└── constants.ts                # 常量配置
```

**支持的解析方式**:
- unpdf (默认)
- MinerU (增强解析，支持复杂表格和公式)

**改造建议**:
- ✅ 完全保留，可直接使用

---

#### 4. `lib/ai/` - LLM 调用封装 ⭐⭐⭐
**用途**: 统一的 LLM 调用接口

**核心文件**:
```
lib/ai/
├── llm.ts                      # LLM 调用封装
├── providers.ts                # 服务商配置
└── thinking-context.ts         # 思考上下文
```

**支持的服务商**:
- OpenAI
- Anthropic (Claude)
- Google Gemini
- DeepSeek
- Grok (xAI)
- 任何 OpenAI 兼容 API

**改造建议**:
- ✅ 完全保留，这是基础设施

---

#### 5. `lib/types/` - 类型定义 ⭐⭐⭐
**用途**: 集中式 TypeScript 类型定义

**核心文件**:
```
lib/types/
├── slides.ts                   # 幻灯片类型
├── generation.ts               # 生成相关类型
├── action.ts                   # Action 类型（⚠️ 需删除）
├── chat.ts                     # 聊天类型
├── settings.ts                 # 设置类型
└── ...
```

**改造建议**:
- ✅ 保留大部分类型
- ❌ 删除 `action.ts`
- 🆕 新增意图理解、RAG 相关类型

---

### ⚠️ 需要调整（部分复用）

#### 6. `lib/orchestration/` - 多智能体编排 ⭐⭐⭐
**用途**: 基于 LangGraph 的多智能体协作

**核心文件**:
```
lib/orchestration/
├── director-graph.ts           # 导演图（LangGraph 状态机）
├── director-prompt.ts          # 导演 Prompt
├── ai-sdk-adapter.ts           # AI SDK 适配器
├── prompt-builder.ts           # Prompt 构建器
├── tool-schemas.ts             # 工具 Schema
└── registry/                   # 工具注册表
```

**原始用途**: 管理多个 AI 智能体的课堂讨论

**改造方向**: 
- 🔄 调整为**意图理解对话流程**
- 🔄 保留多轮对话能力
- ❌ 删除课堂讨论相关逻辑
- 🆕 新增主动提问机制

**改造示例**:
```typescript
// 原始: 课堂讨论流程
// 新: 意图理解流程
const intentGraph = new StateGraph({
  channels: {
    intent: { value: null },
    missingFields: { value: [] },
    clarificationQuestions: { value: [] }
  }
})
  .addNode('analyzeIntent', analyzeIntentNode)
  .addNode('generateQuestions', generateQuestionsNode)
  .addNode('updateIntent', updateIntentNode)
  .addEdge('analyzeIntent', 'generateQuestions')
  .addEdge('generateQuestions', 'updateIntent')
```

---

#### 7. `lib/audio/` - 音频处理 ⭐⭐
**用途**: TTS 和 ASR

**核心文件**:
```
lib/audio/
├── tts-providers.ts            # TTS 服务商
├── asr-providers.ts            # ASR 服务商
├── voice-resolver.ts           # 音色解析
└── types.ts                    # 类型定义
```

**原始用途**: AI 教师讲解的 TTS

**改造方向**:
- ❌ 删除 TTS 相关（不需要 AI 讲解）
- ✅ 保留 ASR（语音输入）
- 🆕 增强 ASR 功能

---

#### 8. `lib/media/` - 媒体生成 ⭐
**用途**: 图片和视频生成

**核心文件**:
```
lib/media/
├── image-providers.ts          # 图片生成服务商
├── video-providers.ts          # 视频生成服务商
├── media-orchestrator.ts       # 媒体编排器
└── adapters/                   # 适配器
```

**改造方向**:
- ✅ 保留图片生成
- 🆕 新增视频解析功能（关键帧提取、字幕提取）

---

### ❌ 可以删除（不需要）

#### 9. `lib/playback/` - 课堂回放引擎 ❌
**用途**: 驱动课堂回放的状态机

**核心文件**:
```
lib/playback/
├── engine.ts                   # 回放引擎
├── types.ts                    # 类型定义
└── derived-state.ts            # 派生状态
```

**删除原因**: 赛题不需要课堂回放功能

---

#### 10. `lib/action/` - Action 执行引擎 ❌
**用途**: 执行 AI 教师的讲解动作

**核心文件**:
```
lib/action/
└── engine.ts                   # 动作执行引擎
```

**支持的动作类型**:
- speech (语音讲解)
- whiteboard_draw (白板绘图)
- spotlight (聚光灯)
- laser (激光笔)
- ...

**删除原因**: 赛题不需要 AI 讲解动作

---

#### 11. `lib/pbl/` - 项目制学习 ⚠️
**用途**: PBL 场景生成

**改造建议**:
- 可选保留（如果想支持 PBL 场景）
- 或删除（简化功能）

---

### 🆕 需要新增的模块

根据你的改造需求，需要新增以下模块：

#### 12. `lib/intent/` - 意图理解 🆕
```
lib/intent/
├── intent-analyzer.ts          # 意图分析
├── question-generator.ts       # 问题生成
├── intent-state.ts             # 意图状态管理
└── intent-types.ts             # 类型定义
```

#### 13. `lib/rag/` - RAG 系统 🆕
```
lib/rag/
├── vector-store.ts             # 向量数据库封装
├── embeddings.ts               # Embedding 生成
├── retriever.ts                # 检索器
├── document-loader.ts          # 文档加载
└── rag-chain.ts                # RAG 链路
```

#### 14. `lib/video/` - 视频处理 🆕
```
lib/video/
├── video-processor.ts          # 视频处理
├── frame-extractor.ts          # 关键帧提取
└── subtitle-parser.ts          # 字幕解析
```

#### 15. `lib/animation/` - 动画生成 🆕
```
lib/animation/
├── animation-generator.ts      # 动画生成
└── templates/                  # 动画模板
```

#### 16. `lib/game/` - 游戏生成 🆕
```
lib/game/
├── game-generator.ts           # 游戏生成
└── templates/                  # 游戏模板
```

---

## 四、app/api/ API 路由分析

### 核心 API 端点

```
app/api/
├── generate/                   # 生成相关
│   ├── outline/route.ts        # 生成大纲
│   ├── scene/route.ts          # 生成场景内容
│   ├── image/route.ts          # 生成图片
│   └── tts/route.ts            # 生成语音（⚠️ 可删除）
├── generate-classroom/         # 异步课堂生成
│   ├── route.ts                # 提交生成任务
│   └── [jobId]/route.ts        # 查询任务状态
├── chat/route.ts               # 多智能体讨论（🔄 调整为意图理解）
├── parse-pdf/route.ts          # 解析 PDF（✅ 保留）
├── web-search/route.ts         # 网络搜索（✅ 保留）
├── transcribe/route.ts         # 语音转文字（✅ 保留）
├── quiz-grade/route.ts         # 测验判分（✅ 保留）
└── pbl/                        # PBL 相关（⚠️ 可选）
```

### 改造建议

**保留的 API**:
- ✅ `/api/generate/outline` - 生成大纲
- ✅ `/api/generate/scene` - 生成场景
- ✅ `/api/generate/image` - 生成图片
- ✅ `/api/parse-pdf` - 解析 PDF
- ✅ `/api/web-search` - 网络搜索
- ✅ `/api/transcribe` - 语音转文字

**需要调整的 API**:
- 🔄 `/api/chat` → 改为意图理解对话
- 🔄 `/api/generate-classroom` → 调整生成流程

**需要删除的 API**:
- ❌ `/api/generate/tts` - 不需要 TTS

**需要新增的 API**:
- 🆕 `/api/intent/analyze` - 分析意图
- 🆕 `/api/intent/clarify` - 生成澄清问题
- 🆕 `/api/rag/retrieve` - RAG 检索
- 🆕 `/api/knowledge-base/upload` - 上传知识库文档
- 🆕 `/api/parse-video` - 解析视频
- 🆕 `/api/export/teaching-plan` - 导出 Word 教案
- 🆕 `/api/generate/animation` - 生成动画
- 🆕 `/api/generate/game` - 生成游戏

---

## 五、components/ UI 组件分析

### 核心组件

```
components/
├── slide-renderer/             # 幻灯片渲染器（✅ 保留）
├── scene-renderers/            # 场景渲染器（✅ 保留）
├── generation/                 # 生成工具栏（✅ 保留）
├── chat/                       # 聊天区域（🔄 调整）
├── settings/                   # 设置面板（✅ 保留）
├── whiteboard/                 # 白板（❌ 删除）
├── agent/                      # 智能体组件（❌ 删除）
├── roundtable/                 # 圆桌讨论（❌ 删除）
└── ui/                         # 基础 UI（✅ 保留）
```

### 改造建议

**保留的组件**:
- ✅ `slide-renderer/` - 幻灯片编辑和渲染
- ✅ `scene-renderers/` - 测验、交互场景
- ✅ `generation/` - 生成工具栏
- ✅ `settings/` - 设置面板
- ✅ `ui/` - 基础 UI 组件

**需要调整的组件**:
- 🔄 `chat/` - 改为意图理解对话界面

**需要删除的组件**:
- ❌ `whiteboard/` - 白板绘图
- ❌ `agent/` - 智能体头像、配置
- ❌ `roundtable/` - 圆桌讨论

**需要新增的组件**:
- 🆕 `intent-dialog/` - 意图理解对话框
- 🆕 `knowledge-base/` - 知识库管理
- 🆕 `video-upload/` - 视频上传和解析
- 🆕 `teaching-plan-preview/` - 教案预览

---

## 六、核心数据结构

### 6.1 Scene（场景）- 核心数据结构

```typescript
// lib/types/slides.ts
interface Scene {
  id: string;
  type: 'slide' | 'quiz' | 'interactive' | 'pbl';
  title: string;
  content: SlideContent | QuizContent | InteractiveContent | PBLContent;
  actions?: Action[];  // ⚠️ 需要删除
}
```

### 6.2 SlideContent（幻灯片内容）

```typescript
interface SlideContent {
  elements: SlideElement[];  // 幻灯片元素
  background?: Background;   // 背景
  layout?: Layout;           // 布局
}

type SlideElement = 
  | TextElement 
  | ImageElement 
  | ShapeElement 
  | TableElement 
  | ChartElement 
  | LatexElement;
```

### 6.3 Action（动作）- 需要删除

```typescript
// ❌ 这个类型定义需要删除
interface Action {
  type: 'speech' | 'whiteboard_draw' | 'spotlight' | 'laser' | ...;
  agentId: string;
  timestamp: number;
  // ...
}
```

### 6.4 需要新增的类型

```typescript
// 🆕 意图理解
interface TeachingIntent {
  topic: string;
  targetAudience: string;
  duration: number;
  objectives: string[];
  keyPoints: string[];
  difficulties: string[];
  style: string;
  interactionDesign: string[];
  confirmed: boolean;
  missingFields: string[];
}

// 🆕 RAG 检索结果
interface RetrievedKnowledge {
  content: string;
  source: string;
  relevance: number;
  metadata: Record<string, any>;
}

// 🆕 视频解析结果
interface VideoParseResult {
  keyFrames: string[];  // Base64 图片
  subtitles: string;
  duration: number;
  metadata: Record<string, any>;
}
```

---

## 七、生成流程对比

### OpenMAIC 原始流程

```
用户输入
  ↓
生成大纲 (generateOutline)
  ↓
生成场景内容 (generateSceneContent)
  ├─ 生成 Slide 元素
  ├─ 生成 Quiz 题目
  ├─ 生成 Interactive HTML
  └─ 生成 Actions（⚠️ 需删除）
  ↓
课堂回放 (❌ 需删除)
  ↓
导出 PPTX/HTML
```

### 改造后的流程

```
多模态输入（语音/文字 + PDF/视频/图片）
  ↓
意图理解（多轮对话）🆕
  ├─ 分析意图
  ├─ 主动提问
  └─ 确认意图
  ↓
资料处理 🆕
  ├─ PDF 解析（✅ 已有）
  ├─ 视频解析（🆕 新增）
  └─ 图片解析（🆕 增强）
  ↓
RAG 检索 🆕
  └─ 从知识库检索相关内容
  ↓
生成大纲（✅ 复用）
  ↓
生成场景内容（✅ 复用）
  ├─ 生成 Slide 元素
  ├─ 生成 Quiz 题目
  ├─ 生成 Interactive HTML
  ├─ 生成动画（🆕 新增）
  └─ 生成游戏（🆕 新增）
  ↓
生成 Word 教案 🆕
  ↓
预览和迭代优化 🆕
  ↓
导出（✅ 复用 + 🆕 增强）
  ├─ PPTX
  ├─ DOCX（🆕 新增）
  ├─ 动画（🆕 新增）
  └─ 游戏 HTML
```

---

## 八、关键文件清单

### 必读文件（理解核心逻辑）

1. **生成流水线**
   - `lib/generation/generation-pipeline.ts` - 主流程
   - `lib/generation/outline-generator.ts` - 大纲生成
   - `lib/generation/scene-generator.ts` - 场景生成

2. **多智能体编排**
   - `lib/orchestration/director-graph.ts` - LangGraph 状态机
   - `lib/orchestration/director-prompt.ts` - Prompt 模板

3. **类型定义**
   - `lib/types/slides.ts` - 幻灯片类型
   - `lib/types/generation.ts` - 生成类型

4. **API 路由**
   - `app/api/generate/outline/route.ts` - 大纲生成 API
   - `app/api/generate/scene/route.ts` - 场景生成 API
   - `app/api/chat/route.ts` - 对话 API

5. **导出功能**
   - `lib/export/use-export-pptx.ts` - PPTX 导出

### 可选阅读（深入理解）

- `lib/playback/engine.ts` - 回放引擎（可删除，但了解状态机设计）
- `lib/action/engine.ts` - 动作引擎（可删除，但了解执行机制）
- `components/slide-renderer/` - 幻灯片渲染（了解渲染逻辑）

---

## 九、改造路线图

### 阶段 1: 理解现有代码（1-2 天）

1. 运行 OpenMAIC，体验完整流程
2. 阅读核心文件（见上方清单）
3. 理解生成流水线和数据结构
4. 理解 LangGraph 多智能体编排

### 阶段 2: 删除不需要的模块（1 天）

1. 删除 `lib/playback/`
2. 删除 `lib/action/`
3. 删除 `components/whiteboard/`
4. 删除 `components/agent/`
5. 删除 `components/roundtable/`
6. 删除 `app/classroom/[id]/`
7. 调整类型定义（删除 Action 相关）

### 阶段 3: 新增核心模块（2 周）

**Week 1: 基础设施**
1. 新增 `lib/rag/` - RAG 系统
2. 新增 `lib/intent/` - 意图理解
3. 新增 `lib/video/` - 视频处理
4. 调整 `lib/orchestration/` - 改为意图理解流程

**Week 2: 内容生成**
5. 新增 `lib/animation/` - 动画生成
6. 新增 `lib/game/` - 游戏生成
7. 增强 `lib/export/` - Word 教案导出
8. 调整生成流水线 - 集成新模块

### 阶段 4: 测试和优化（1 周）

1. 端到端测试
2. 性能优化
3. 准备演示案例
4. 编写文档

---

## 十、快速上手建议

### 第一步：运行起来

```bash
cd OpenMAIC
pnpm install
cp .env.example .env.local
# 编辑 .env.local，填入 API Key
pnpm dev
```

### 第二步：体验核心功能

1. 输入一个主题，生成课堂
2. 查看生成的 PPT
3. 导出 PPTX
4. 上传 PDF，看解析效果

### 第三步：阅读核心代码

按照"必读文件"清单，逐个阅读核心文件。

### 第四步：开始改造

从删除不需要的模块开始，然后逐步新增功能。

---

## 十一、常见问题

### Q1: LangGraph 是什么？
A: LangGraph 是 LangChain 的状态机编排框架，用于管理多智能体的协作流程。OpenMAIC 用它来管理课堂讨论，你可以改造为意图理解流程。

### Q2: 为什么要用 Zustand？
A: Zustand 是轻量级的状态管理库，比 Redux 简单，适合 OpenMAIC 这种复杂的状态管理需求。

### Q3: pptxgenjs 是什么？
A: OpenMAIC 自定义的 PowerPoint 生成库，基于 pptxgenjs 改造，支持更多元素类型（LaTeX、图表等）。

### Q4: 如何调试生成流程？
A: 在 `lib/generation/generation-pipeline.ts` 中添加 `console.log`，查看每个阶段的输入输出。

### Q5: 如何添加新的场景类型？
A: 
1. 在 `lib/types/slides.ts` 中定义新类型
2. 在 `lib/generation/scene-generator.ts` 中添加生成逻辑
3. 在 `components/scene-renderers/` 中添加渲染组件

---

## 十二、总结

### 核心复用点
- ✅ PPT 生成引擎（`lib/generation/`）
- ✅ PPTX 导出（`lib/export/`）
- ✅ PDF 解析（`lib/pdf/`）
- ✅ LLM 调用封装（`lib/ai/`）
- ✅ 幻灯片渲染器（`components/slide-renderer/`）

### 核心删除点
- ❌ 课堂回放（`lib/playback/`）
- ❌ Action 执行（`lib/action/`）
- ❌ 白板组件（`components/whiteboard/`）
- ❌ 智能体组件（`components/agent/`）

### 核心新增点
- 🆕 意图理解（`lib/intent/`）
- 🆕 RAG 系统（`lib/rag/`）
- 🆕 视频处理（`lib/video/`）
- 🆕 动画生成（`lib/animation/`）
- 🆕 游戏生成（`lib/game/`）
- 🆕 Word 教案导出

### 下一步
1. 运行 OpenMAIC，体验完整流程
2. 阅读核心文件，理解生成逻辑
3. 按照改造路线图，逐步实施

---

**祝你改造顺利！有任何问题随时问我。** 🚀
