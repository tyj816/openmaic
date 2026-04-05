OpenMAIC 项目结构审计报告
一、项目结构总览
核心目录树（三级展开）
OpenMAIC/
├── app/                          # Next.js App Router（页面与 API 路由）
│   ├── api/                      # 服务端 API 路由（~18 个端点）
│   │   ├── generate/             # 生成流水线 API
│   │   │   ├── scene-outlines-stream/  # 大纲生成（SSE 流式）
│   │   │   ├── scene-content/          # 场景内容生成
│   │   │   ├── scene-actions/          # 场景动作生成
│   │   │   ├── image/                  # 图片生成
│   │   │   ├── video/                  # 视频生成
│   │   │   ├── tts/                    # 语音合成
│   │   │   └── agent-profiles/         # 智能体配置生成
│   │   ├── generate-classroom/   # 异步课堂生成（提交 + 轮询）
│   │   ├── chat/                 # 多智能体讨论（SSE 流式）
│   │   ├── pbl/                  # 项目制学习端点
│   │   ├── quiz-grade/           # 测验评分
│   │   ├── parse-pdf/            # PDF 解析
│   │   ├── web-search/           # 网络搜索
│   │   ├── transcription/        # 语音识别
│   │   └── classroom/            # 课堂数据存取
│   ├── classroom/[id]/           # 课堂回放页面（动态路由）
│   ├── generation-preview/       # 生成预览页面
│   ├── page.tsx                  # 首页（生成输入）
│   └── layout.tsx                # 根布局
│
├── lib/                          # 核心业务逻辑
│   ├── generation/               # 两阶段生成流水线 ⭐ 核心
│   │   ├── outline-generator.ts        # 阶段 1：需求 → 场景大纲
│   │   ├── scene-generator.ts          # 阶段 2：大纲 → 完整场景
│   │   ├── scene-builder.ts            # 场景构建工具
│   │   ├── pipeline-runner.ts          # 流水线编排
│   │   ├── action-parser.ts            # 动作解析
│   │   ├── interactive-post-processor.ts # 交互式 HTML 后处理
│   │   ├── prompt-formatters.ts        # Prompt 格式化
│   │   └── prompts/                    # Prompt 模板库
│   │       ├── templates/              # 各阶段 Prompt 模板
│   │       └── snippets/               # 可复用 Prompt 片段
│   │
│   ├── orchestration/            # LangGraph 多智能体编排 ⭐ 核心
│   │   ├── director-graph.ts           # 导演图（状态机）
│   │   ├── director-prompt.ts          # 导演决策 Prompt
│   │   ├── prompt-builder.ts           # 智能体 Prompt 构建
│   │   ├── tool-schemas.ts             # 工具模式定义
│   │   ├── stateless-generate.ts       # 无状态生成（流式解析）
│   │   └── registry/                   # 智能体注册表
│   │       ├── store.ts                # 智能体存储
│   │       └── types.ts                # 智能体类型定义
│   │
│   ├── playback/                 # 回放引擎（状态机）⭐ 核心
│   │   ├── engine.ts                   # 播放引擎（idle/playing/paused/live）
│   │   ├── derived-state.ts            # 派生状态计算
│   │   └── types.ts                    # 回放类型定义
│   │
│   ├── action/                   # 动作执行引擎
│   │   └── engine.ts                   # 28+ 种动作类型执行
│   │
│   ├── export/                   # 导出模块 ⭐ 重点
│   │   ├── use-export-pptx.ts          # PPT 导出（完整实现）
│   │   ├── latex-to-omml.ts            # LaTeX → Office Math
│   │   ├── svg-path-parser.ts          # SVG 路径解析
│   │   ├── svg2base64.ts               # SVG → Base64
│   │   └── html-parser/                # HTML 解析器
│   │
│   ├── pbl/                      # 项目制学习（PBL）
│   │   ├── generate-pbl.ts             # PBL 内容生成
│   │   ├── pbl-system-prompt.ts        # PBL 系统 Prompt
│   │   ├── types.ts                    # PBL 类型定义
│   │   └── mcp/                        # MCP 工具集成
│   │
│   ├── server/                   # 服务端工具
│   │   ├── classroom-generation.ts     # 课堂生成主流程
│   │   ├── classroom-job-runner.ts     # 异步任务执行器
│   │   ├── classroom-job-store.ts      # 任务状态存储
│   │   ├── classroom-storage.ts        # 课堂数据持久化
│   │   ├── classroom-media-generation.ts # 媒体生成编排
│   │   ├── provider-config.ts          # 服务商配置解析
│   │   └── resolve-model.ts            # 模型解析
│   │
│   ├── ai/                       # LLM 抽象层
│   │   ├── llm.ts                      # 统一 LLM 调用接口
│   │   ├── providers.ts                # 服务商配置
│   │   └── thinking-context.ts         # 思维链上下文
│   │
│   ├── api/                      # Stage API 门面
│   │   ├── stage-api.ts                # 统一 API 入口
│   │   ├── stage-api-scene.ts          # 场景操作
│   │   ├── stage-api-canvas.ts         # 画布操作
│   │   ├── stage-api-element.ts        # 元素操作
│   │   ├── stage-api-whiteboard.ts     # 白板操作
│   │   └── stage-api-navigation.ts     # 导航操作
│   │
│   ├── store/                    # Zustand 状态管理
│   │   ├── stage.ts                    # 舞台状态
│   │   ├── canvas.ts                   # 画布状态
│   │   ├── settings.ts                 # 设置状态
│   │   ├── media-generation.ts         # 媒体生成状态
│   │   └── user-profile.ts             # 用户配置
│   │
│   ├── types/                    # 类型定义 ⭐ 重要
│   │   ├── generation.ts               # 生成相关类型
│   │   ├── slides.ts                   # 幻灯片元素类型
│   │   ├── stage.ts                    # 舞台/场景类型
│   │   ├── action.ts                   # 动作类型（28+ 种）
│   │   ├── chat.ts                     # 聊天/讨论类型
│   │   └── settings.ts                 # 设置类型
│   │
│   ├── audio/                    # 音频处理
│   │   ├── tts-providers.ts            # TTS 服务商
│   │   ├── asr-providers.ts            # ASR 服务商
│   │   └── voice-resolver.ts           # 音色解析
│   │
│   ├── media/                    # 媒体生成
│   │   ├── image-providers.ts          # 图片生成服务商
│   │   ├── video-providers.ts          # 视频生成服务商
│   │   ├── media-orchestrator.ts       # 媒体生成编排
│   │   └── adapters/                   # 各服务商适配器
│   │
│   ├── pdf/                      # PDF 解析
│   │   ├── pdf-providers.ts            # PDF 解析服务商
│   │   └── types.ts                    # PDF 类型定义
│   │
│   ├── web-search/               # 网络搜索
│   │   ├── tavily.ts                   # Tavily 搜索集成
│   │   └── types.ts                    # 搜索类型定义
│   │
│   ├── hooks/                    # React Hooks（55+）
│   ├── i18n/                     # 国际化（zh-CN, en-US）
│   ├── utils/                    # 工具函数
│   └── prosemirror/              # 富文本编辑器
│
├── components/                   # React UI 组件
│   ├── slide-renderer/           # 幻灯片渲染器 ⭐ 核心
│   │   ├── Editor/                     # 编辑器主体
│   │   │   ├── Canvas/                 # 交互式画布
│   │   │   ├── ScreenCanvas.tsx        # 屏幕画布
│   │   │   ├── ScreenElement.tsx       # 元素渲染
│   │   │   ├── SpotlightOverlay.tsx    # 聚光灯特效
│   │   │   ├── LaserOverlay.tsx        # 激光笔特效
│   │   │   └── HighlightOverlay.tsx    # 高亮特效
│   │   └── components/
│   │       ├── element/                # 元素渲染器（文本/图片/形状/表格/图表/LaTeX）
│   │       └── ThumbnailSlide/         # 缩略图
│   │
│   ├── scene-renderers/          # 场景渲染器
│   │   ├── quiz-renderer.tsx           # 测验渲染
│   │   ├── interactive-renderer.tsx    # 交互式 HTML 渲染
│   │   └── pbl-renderer.tsx            # PBL 渲染
│   │       └── pbl/                    # PBL 子组件
│   │
│   ├── generation/               # 生成工具栏
│   │   ├── generation-toolbar.tsx      # 生成工具栏
│   │   ├── generating-progress.tsx     # 生成进度
│   │   ├── outlines-editor.tsx         # 大纲编辑器
│   │   └── media-popover.tsx           # 媒体设置
│   │
│   ├── chat/                     # 聊天/讨论组件
│   │   ├── chat-area.tsx               # 聊天区域
│   │   ├── chat-session.tsx            # 聊天会话
│   │   ├── session-list.tsx            # 会话列表
│   │   ├── process-sse-stream.ts       # SSE 流处理
│   │   └── use-chat-sessions.ts        # 聊天会话 Hook
│   │
│   ├── agent/                    # 智能体组件
│   │   ├── agent-avatar.tsx            # 智能体头像
│   │   ├── agent-bar.tsx               # 智能体栏
│   │   └── agent-config-panel.tsx      # 智能体配置面板
│   │
│   ├── whiteboard/               # 白板组件
│   │   ├── whiteboard-canvas.tsx       # 白板画布
│   │   └── whiteboard-history.tsx      # 白板历史
│   │
│   ├── settings/                 # 设置面板
│   │   ├── index.tsx                   # 设置主面板
│   │   ├── model-selector.tsx          # 模型选择器
│   │   ├── provider-config-panel.tsx   # 服务商配置
│   │   ├── tts-settings.tsx            # TTS 设置
│   │   ├── asr-settings.tsx            # ASR 设置
│   │   ├── image-settings.tsx          # 图片生成设置
│   │   ├── video-settings.tsx          # 视频生成设置
│   │   └── web-search-settings.tsx     # 网络搜索设置
│   │
│   ├── stage/                    # 舞台组件
│   │   ├── scene-renderer.tsx          # 场景渲染器
│   │   └── scene-sidebar.tsx           # 场景侧边栏
│   │
│   ├── roundtable/               # 圆桌讨论组件
│   └── ui/                       # 基础 UI 组件（shadcn/ui + Radix）
│
├── packages/                     # Workspace 子包
│   ├── pptxgenjs/                # 定制化 PowerPoint 生成库
│   └── mathml2omml/              # MathML → Office Math 转换
│
├── skills/                       # OpenClaw / ClawHub Skills
│   └── openmaic/                 # OpenMAIC 引导式 SOP Skill
│       ├── SKILL.md              # Skill 路由层
│       └── references/           # 按需加载的 SOP 分段
│
├── configs/                      # 共享常量配置
│   ├── shapes.ts                 # 形状定义
│   ├── font.ts                   # 字体配置
│   ├── theme.ts                  # 主题配置
│   ├── hotkey.ts                 # 快捷键配置
│   └── animation.ts              # 动画配置
│
└── public/                       # 静态资源
    ├── avatars/                  # 智能体头像
    └── logos/                    # Logo 资源

二、核心目录职责表
| 目录 | 职责 | 类别 | 重要性 |
|------|------|--------|--------|
| app/api/generate/ | 生成流水线 API 端点（大纲、内容、动作、媒体、TTS） | API 层 | ⭐⭐⭐ |
| app/api/generate-classroom/ | 异步课堂生成（提交任务 + 轮询状态） | API 层 | ⭐⭐⭐ |
| app/api/chat/ | 多智能体讨论 SSE 流式端点 | API 层 | ⭐⭐ |
| app/api/pbl/ | 项目制学习相关端点 | API 层 | ⭐ |
| app/classroom/[id]/ | 课堂回放页面（动态路由） | 页面层 | ⭐⭐⭐ |
| app/page.tsx | 首页（生成输入入口） | 页面层 | ⭐⭐⭐ |
| lib/generation/ | 两阶段生成流水线（需求→大纲→场景） | 核心业务 | ⭐⭐⭐ |
| lib/orchestration/ | LangGraph 多智能体编排（导演图） | 核心业务 | ⭐⭐ |
| lib/playback/ | 回放引擎（状态机：idle/playing/paused/live） | 核心业务 | ⭐⭐ |
| lib/action/ | 动作执行引擎（28+ 种动作类型） | 核心业务 | ⭐⭐ |
| lib/export/ | PPT 导出（完整实现） | 导出能力 | ⭐⭐⭐ |
| lib/pbl/ | 项目制学习（PBL）生成 | 场景类型 | ⭐ |
| lib/server/ | 服务端工具（课堂生成、任务管理、存储） | 服务层 | ⭐⭐⭐ |
| lib/ai/ | LLM 抽象层（统一调用接口） | 服务层 | ⭐⭐⭐ |
| lib/api/ | Stage API 门面（场景/画布/元素操作） | API 门面 | ⭐⭐⭐ |
| lib/store/ | Zustand 状态管理 | 状态管理 | ⭐⭐⭐ |
| lib/types/ | 集中式类型定义 | 类型系统 | ⭐⭐⭐ |
| lib/audio/ | TTS & ASR 服务商集成 | 多模态 | ⭐⭐ |
| lib/media/ | 图片/视频生成服务商集成 | 多模态 | ⭐⭐ |
| lib/pdf/ | PDF 解析服务商集成 | 资料处理 | ⭐⭐ |
| lib/web-search/ | 网络搜索（Tavily） | 知识增强 | ⭐ |
| components/slide-renderer/ | 幻灯片渲染器（Canvas 编辑器） | UI 组件 | ⭐⭐⭐ |
| components/scene-renderers/ | 场景渲染器（Quiz/Interactive/PBL） | UI 组件 | ⭐⭐ |
| components/generation/ | 生成工具栏和进度组件 | UI 组件 | ⭐⭐⭐ |
| components/chat/ | 聊天/讨论组件 | UI 组件 | ⭐⭐ |
| components/whiteboard/ | 白板组件 | UI 组件 | ⭐ |
| packages/pptxgenjs/ | 定制化 PowerPoint 生成库 | 子包 | ⭐⭐⭐ |
| packages/mathml2omml/ | MathML → Office Math 转换 | 子包 | ⭐⭐ |

三、主业务入口清单
1. 应用启动入口
文件: OpenMAIC/app/layout.tsx
作用: Next.js 根布局，初始化主题、国际化、Toaster
判断依据: Next.js App Router 的根布局文件
2. 路由入口
文件: OpenMAIC/app/page.tsx（首页）
作用: 用户输入需求、上传 PDF、配置生成参数的主入口
判断依据: Next.js 根路由，包含生成表单和历史课堂列表
3. 首页/主页面入口
文件: OpenMAIC/app/page.tsx
作用:
展示 Logo 和 Slogan
提供需求输入框（支持语音输入）
提供 PDF 上传、语言选择、网络搜索开关
展示历史课堂列表（可折叠）
判断依据: 包含 GenerationToolbar、AgentBar、SpeechButton 等核心组件
4. 发起一次生成任务的页面入口
文件: OpenMAIC/app/page.tsx → handleGenerate() 函数
作用:
验证用户输入和模型配置
构建 UserRequirements 对象
存储 PDF 到 IndexedDB
跳转到 /generation-preview 页面
判断依据: 点击"进入课堂"按钮触发，是生成流程的起点
5. 展示生成结果的页面入口
文件: OpenMAIC/app/classroom/[id]/page.tsx
作用:
加载课堂数据（从 IndexedDB 或服务端存储）
渲染 <Stage> 组件（包含场景渲染、回放控制、聊天区域）
自动恢复未完成的生成任务
判断依据: 动态路由 /classroom/[id]，是课堂回放的主页面
6. 任务状态更新的入口
文件: OpenMAIC/app/generation-preview/page.tsx
作用:
实时展示生成进度（大纲生成 → 场景生成 → 媒体生成）
支持编辑大纲、重新生成
完成后自动跳转到课堂页面
判断依据: 包含 GeneratingProgress 组件，监听生成事件
7. 上传资料的入口
文件: OpenMAIC/components/generation/generation-toolbar.tsx
作用:
提供 PDF 文件上传按钮
调用 /api/parse-pdf 解析 PDF
提取文本和图片
判断依据: 包含文件上传逻辑和 PDF 解析调用
8. PPT 导出入口
文件: OpenMAIC/lib/export/use-export-pptx.ts → exportPptx() 函数
作用:
遍历所有幻灯片场景
将元素转换为 pptxgenjs 格式
生成 .pptx 文件并下载
判断依据: 完整的 PPT 导出实现，包含元素渲染、样式转换、媒体嵌入
9. 资源包导出入口
文件: OpenMAIC/lib/export/use-export-pptx.ts → exportResourcePack() 函数
作用:
导出 PPTX + 交互式 HTML 页面（打包为 ZIP）
适用于包含 Interactive 场景的课堂
判断依据: 使用 JSZip 打包多个文件
10. docx/文档导出入口
状态: ❌ 未发现
说明: 项目中没有 Word/docx 导出功能，只有 PPT 导出
四、生成任务调用主链路
完整调用链（用户触发 → 结果展示）
┌─────────────────────────────────────────────────────────────────┐
│ 1. 用户输入阶段                                                  │
├─────────────────────────────────────────────────────────────────┤
│ 页面: app/page.tsx                                              │
│ 组件: <HomePage>                                                │
│ 操作: 用户填写需求、上传 PDF、点击"进入课堂"                    │
│ 触发: handleGenerate()                                          │
│   ├─ 验证输入和模型配置                                         │
│   ├─ 构建 UserRequirements 对象                                 │
│   ├─ 存储 PDF 到 IndexedDB (storePdfBlob)                       │
│   └─ 跳转到 /generation-preview                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. 生成预览阶段                                                  │
├─────────────────────────────────────────────────────────────────┤
│ 页面: app/generation-preview/page.tsx                           │
│ 组件: <GenerationPreviewPage>                                   │
│ Hook: useSceneGenerator()                                       │
│   ├─ 阶段 1: 生成大纲                                           │
│   │   API: POST /api/generate/scene-outlines-stream (SSE)       │
│   │   实现: lib/generation/outline-generator.ts                 │
│   │   输入: UserRequirements + PDF 文本/图片                    │
│   │   输出: SceneOutline[] (场景大纲列表)                       │
│   │                                                              │
│   ├─ 阶段 2: 生成场景内容（并行）                               │
│   │   API: POST /api/generate/scene-content                     │
│   │   实现: lib/generation/scene-generator.ts                   │
│   │   输入: SceneOutline + 分配的图片                           │
│   │   输出: GeneratedSlideContent / QuizContent / etc.          │
│   │                                                              │
│   ├─ 阶段 3: 生成场景动作（并行）                               │
│   │   API: POST /api/generate/scene-actions                     │
│   │   实现: lib/generation/scene-generator.ts                   │
│   │   输入: SceneOutline + Content                              │
│   │   输出: Action[] (语音、白板、特效等)                       │
│   │                                                              │
│   ├─ 阶段 4: 生成媒体（并行）                                   │
│   │   API: POST /api/generate/image, /api/generate/video        │
│   │   实现: lib/media/media-orchestrator.ts                     │
│   │   输入: MediaGeneration[] (从 outline 提取)                 │
│   │   输出: 图片/视频 URL，替换占位符                           │
│   │                                                              │
│   └─ 阶段 5: 生成 TTS（可选）                                   │
│       API: POST /api/generate/tts                               │
│       实现: lib/audio/tts-providers.ts                          │
│       输入: SpeechAction.text                                   │
│       输出: 音频 URL                                            │
│                                                                  │
│ 存储: 保存到 IndexedDB (lib/utils/stage-storage.ts)            │
│ 跳转: 完成后跳转到 /classroom/[id]                              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. 课堂回放阶段                                                  │
├─────────────────────────────────────────────────────────────────┤
│ 页面: app/classroom/[id]/page.tsx                               │
│ 组件: <Stage> (components/stage.tsx)                            │
│   ├─ 加载课堂数据 (loadFromStorage)                             │
│   ├─ 渲染场景 (SceneRenderer)                                   │
│   │   ├─ Slide: SlideEditor (Canvas 渲染)                       │
│   │   ├─ Quiz: QuizRenderer                                     │
│   │   ├─ Interactive: InteractiveRenderer (iframe)              │
│   │   └─ PBL: PBLRenderer                                       │
│   │                                                              │
│   ├─ 回放控制 (PlaybackEngine)                                  │
│   │   状态机: idle → playing → paused → live                    │
│   │   动作执行: ActionEngine (28+ 种动作类型)                   │
│   │   TTS 播放: AudioPlayer                                     │
│   │                                                              │
│   └─ 多智能体讨论 (ChatArea)                                    │
│       API: POST /api/chat (SSE 流式)                            │
│       实现: lib/orchestration/director-graph.ts                 │
│       状态机: director → agent_generate → director (循环)       │
└─────────────────────────────────────────────────────────────────┘
关键不确定点
1.PDF 解析后的图片分配逻辑:
在 outline-generator.ts 中，AI 会为每个 outline 建议 suggestedImageIds
在 scene-generator.ts 中，根据 suggestedImageIds 过滤 assignedImages
但具体的分配策略（如何决定哪些图片分配给哪个场景）依赖 AI 的输出

2.媒体生成的异步协调:
媒体生成是异步的，可能在场景生成完成后仍在进行
前端通过 useMediaGenerationStore 监听任务状态
占位符 ID（如 `gen_img_1

五、模块分类：保留候选 / 删除候选
A. 高价值可复用模块 ✅
| 模块 | 所在目录/文件 | 当前作用 | 建议 | 理由 |
|------|--------------|----|
| 前端壳子 | app/layout.tsx, app/page.tsx | Next.js 应用框架 | 保留 | 成熟的 React 19 + Next.js 16 架构 |
| 生成流水线核心 | lib/generation/ | 两阶段生成（需求→大纲→场景） | 保留并重构 | 核心生成逻辑可复用，需调整为教案生成 |
| LLM 抽象层 | lib/ai/llm.ts, lib/ai/providers.ts | 统一 LLM 调用接口 | 完全保留 | 支持多服务商，架构优秀 |
| PDF 解析 | lib/pdf/, app/api/parse-pdf/ | PDF 文本/图片提取 | 完全保留 | 已有完整实现，支持 MinerU |
| 上传能力 | components/generation/generation-toolbar.tsx | 文件上传和解析触发 | 保留 | 基础能力，可扩展支持更多格式 |
| PPT 导出 | lib/export/use-export-pptx.ts, packages/pptxgenjs/ | 完整的 PPTX 导出 | 完全保留 | 核心交付物，实现完善 |
| 幻灯片渲染器 | components/slide-renderer/ | Canvas 编辑器和元素渲染 | 保留 | 可用于课件预览和编辑 |
| 类型系统 | lib/types/ | 集中式类型定义 | 保留并扩展 | 良好的类型架构，需新增教案类型 |
| 状态管理 | lib/store/ | Zustand 状态管理 | 保留 | 轻量高效，可复用 |
| Stage API | lib/api/ | 场景/画布/元素操作门面 | 保留 | 统一的 API 抽象层 |
| 服务端工具 | lib/server/ | 课堂生成、任务管理、存储 | 保留并重构 | 异步任务管理可复用 |
| 图片生成 | lib/media/image-providers.ts | 多服务商图片生成 | 保留 | 可用于课件配图 |
| TTS 集成 | lib/audio/tts-providers.ts | 多服务商 TTS | 保留 | 可用于课件语音讲解 |
| 网络搜索 | lib/web-search/tavily.ts | Tavily 搜索集成 | 保留 | 知识增强能力|
| 国际化 | lib/i18n/ | 中英文支持 | 保留 | 多语言支持 |
| UI 组件库 | components/ui/ | shadcn/ui + Radix | 保留 | 成熟的组件库 |
| 目录 | 职责 | 类别 | 重要性 |
|------|------|--------|--------|
| app/api/generate/ | 生成流水线 API 端点（大纲、内容、动作、媒体、TTS） | API 层 | ⭐⭐⭐ |
| app/api/generate-classroom/ | 异步课堂生成（提交任务 + 轮询状态） | API 层 | ⭐⭐⭐ |
| app/api/chat/ | 多智能体讨论 SSE 流式端点 | API 层 | ⭐⭐ |
| app/api/pbl/ | 项目制学习相关端点 | API 层 | ⭐ |
| app/classroom/[id]/ | 课堂回放页面（动态路由） | 页面层 | ⭐⭐⭐ |
| app/page.tsx | 首页（生成输入入口） | 页面层 | ⭐⭐⭐ |
| lib/generation/ | 两阶段生成流水线（需求→大纲→场景） | 核心业务 | ⭐⭐⭐ |
| lib/orchestration/ | LangGraph 多智能体编排（导演图） | 核心业务 | ⭐⭐ |
| lib/playback/ | 回放引擎（状态机：idle/playing/paused/live） | 核心业务 | ⭐⭐ |
| lib/action/ | 动作执行引擎（28+ 种动作类型） | 核心业务 | ⭐⭐ |
| lib/export/ | PPT 导出（完整实现） | 导出能力 | ⭐⭐⭐ |
| lib/pbl/ | 项目制学习（PBL）生成 | 场景类型 | ⭐ |
| lib/server/ | 服务端工具（课堂生成、任务管理、存储） | 服务层 | ⭐⭐⭐ |
| lib/ai/ | LLM 抽象层（统一调用接口） | 服务层 | ⭐⭐⭐ |
| lib/api/ | Stage API 门面（场景/画布/元素操作） | API 门面 | ⭐⭐⭐ |
| lib/store/ | Zustand 状态管理 | 状态管理 | ⭐⭐⭐ |
| lib/types/ | 集中式类型定义 | 类型系统 | ⭐⭐⭐ |
| lib/audio/ | TTS & ASR 服务商集成 | 多模态 | ⭐⭐ |
| lib/media/ | 图片/视频生成服务商集成 | 多模态 | ⭐⭐ |
| lib/pdf/ | PDF 解析服务商集成 | 资料处理 | ⭐⭐ |
| lib/web-search/ | 网络搜索（Tavily） | 知识增强 | ⭐ |
| components/slide-renderer/ | 幻灯片渲染器（Canvas 编辑器） | UI 组件 | ⭐⭐⭐ |
| components/scene-renderers/ | 场景渲染器（Quiz/Interactive/PBL） | UI 组件 | ⭐⭐ |
| components/generation/ | 生成工具栏和进度组件 | UI 组件 | ⭐⭐⭐ |
| components/chat/ | 聊天/讨论组件 | UI 组件 | ⭐⭐ |
| components/whiteboard/ | 白板组件 | UI 组件 | ⭐ |
| packages/pptxgenjs/ | 定制化 PowerPoint 生成库 | 子包 | ⭐⭐⭐ |
| packages/mathml2omml/ | MathML → Office Math 转换 | 子包 | ⭐⭐ |

B. 可保留但需要大改的模块 🔧

| 模块             | 所在目录/文件                               | 当前作用           | 建议       | 理由                          |
| :--------------- | :------------------------------------------ | :----------------- | :--------- | :---------------------------- |
| 生成 Prompt 模板 | lib/generation/prompts/                     | 各阶段 Prompt 模板 | 重构       | 需调整为教案生成导向的 Prompt |
| 大纲生成器       | lib/generation/outline-generator.ts         | 需求 → 场景大纲    | 重构       | 改为：需求 → 教学设计大纲     |
| 场景生成器       | lib/generation/scene-generator.ts           | 大纲 → 场景内容    | 重构       | 改为：大纲 → PPT + 教案内容   |
| 任务编排         | lib/server/classroom-generation.ts          | 课堂生成主流程     | 重构       | 改为：教案生成主流程          |
| 数据结构         | lib/types/generation.ts, lib/types/stage.ts | 场景/课堂类型定义  | 扩展       | 新增教案相关类型              |
| 首页 UI          | app/page.tsx                                | 生成输入界面       | 调整       | 改为教师备课导向的 UI         |
| 生成预览         | app/generation-preview/                     | 实时生成进度展示   | 调整       | 改为教案预览界面              |
| 设置面板         | components/settings/                        | 模型/服务商配置    | 保留并扩展 | 新增教案生成相关配置          |

 C. 明显偏原项目课堂演绎、后续应删除或冻结的模块 ❌

| 模块             | 所在目录/文件                                                | 当前作用           | 建议      | 理由                       |
| :--------------- | :----------------------------------------------------------- | :----------------- | :-------- | :------------------------- |
| 多智能体编排     | lib/orchestration/                                           | LangGraph 导演图   | 删除/冻结 | 课堂讨论不是核心需求       |
| 回放引擎         | lib/playback/                                                | 课堂回放状态机     | 删除      | 不需要课堂演绎功能         |
| 动作执行引擎     | lib/action/                                                  | 28+ 种动作类型执行 | 删除      | 聚光灯、激光笔等特效不需要 |
| 白板组件         | components/whiteboard/                                       | SVG 白板绘图       | 删除      | 课堂互动功能不需要         |
| 圆桌讨论         | components/roundtable/                                       | 多智能体圆桌讨论   | 删除      | 课堂演绎功能不需要         |
| 聊天组件         | components/chat/                                             | 多智能体聊天       | 删除/简化 | 可简化为教师修改意见输入   |
| 智能体组件       | components/agent/                                            | 智能体头像、配置   | 删除      | 不需要多角色演绎           |
| 课堂回放页面     | app/classroom/[id]/                                          | 课堂回放主页面     | 重构      | 改为课件预览页面           |
| PBL 模块         | lib/pbl/, components/scene-renderers/pbl-renderer.tsx        | 项目制学习         | 删除      | 不是核心需求               |
| Interactive 场景 | lib/generation/interactive-post-processor.ts, components/scene-renderers/interactive-renderer.tsx | 交互式 HTML 模拟   | 删除/可选 | 可作为扩展功能保留         |
| Quiz 场景        | components/scene-renderers/quiz-renderer.tsx, app/api/quiz-grade/ | 测验和评分         | 删除/可选 | 可作为扩展功能保留         |
| 视频生成         | lib/media/video-providers.ts                                 | 视频生成服务商     | 暂不关注  | 优先级低                   |
| ASR 集成         | lib/audio/asr-providers.ts                                   | 语音识别           | 暂不关注  | 优先级低                   |
| OpenClaw Skill   | skills/openmaic/                                             | OpenClaw 集成      | 删除      | 不需要聊天应用集成         |

、生成能力专项审计
6.1 PPT/课件生成相关 ⭐⭐⭐
生成入口
主入口: lib/generation/scene-generator.ts → generateSlideContent()
调用链:
、生成能力专项审计
6.1 PPT/课件生成相关 ⭐⭐⭐
生成入口
主入口: lib/generation/scene-generator.ts → generateSlideContent()
调用链:
UserRequirements 
  → generateSceneOutlinesFromRequirements() 
  → generateSlideContent() 
  → PPTElement[] + SlideBackground
中间数据结构
// 大纲阶段
interface SceneOutline {
  type: 'slide' | 'quiz' | 'interactive' | 'pbl';
  title: string;
  description: string;
  keyPoints: string[];
  suggestedImageIds?: string[];  // 建议使用的 PDF 图片
  mediaGenerations?: MediaGeneration[];  // AI 生成的图片/视频
}

// 内容生成阶段
interface GeneratedSlideContent {
  elements: PPTElement[];  // 文本/图片/形状/表格/图表/LaTeX
  background?: SlideBackground;
  remark?: string;  // 备注
}

// 元素类型（lib/types/slides.ts）
type PPTElement = 
  | PPTTextElement      // 富文本（HTML）
  | PPTImageElement     // 图片（支持裁剪、滤镜、翻转）
  | PPTShapeElement     // 形状（SVG path）
  | PPTLineElement      // 线条（支持箭头、虚线）
  | PPTChartElement     // 图表（8 种类型）
  | PPTTableElement     // 表格
  | PPTLatexElement     // LaTeX 公式（KaTeX 渲染）
  | PPTVideoElement     // 视频
  | PPTAudioElement;    // 音频
模板/布局系统
状态: ❌ 不存在显式模板系统
说明:
布局完全由 AI 生成（通过 Prompt 指导）
Prompt 中包含画布尺寸约束（1000×562.5）
AI 直接输出元素的绝对位置（left, top, width, height）
没有预定义的模板库
导出 .pptx 的实现
文件: lib/export/use-export-pptx.ts

核心函数: buildPptxBlob()

实现细节:
// 1. 创建 pptxgen 实例
const pptx = new pptxgen();
pptx.layout = 'LAYOUT_16x9';  // 根据 viewportRatio 选择

// 2. 遍历每个 Slide
for (const slide of slides) {
  const pptxSlide = pptx.addSlide();
  
  // 3. 添加背景
  if (slide.background) {
    pptxSlide.background = { ... };
  }
  
  // 4. 添加元素
  for (const el of slide.elements) {
    switch (el.type) {
      case 'text':
        pptxSlide.addText(formatHTML(el.content), options);
        break;
      case 'image':
        pptxSlide.addImage({ data: base64, ... });
        break;
      case 'shape':
        pptxSlide.addShape('custGeom', { points, ... });
        break;
      case 'chart':
        pptxSlide.addChart(type, chartData, options);
        break;
      case 'table':
        pptxSlide.addTable(tableData, options);
        break;
      case 'latex':
        // 转换为 Office Math XML (OMML)
        const omml = latexToOmml(el.latex);
        pptxSlide.addText([{ text: '', options: { math: omml } }]);
        break;
    }
  }
  
  // 5. 添加演讲者备注
  const notes = buildSpeakerNotes(scene);
  if (notes) pptxSlide.addNotes(notes);
}

// 6. 生成 Blob
return await pptx.write({ outputType: 'blob' });
// 1. 创建 pptxgen 实例
const pptx = new pptxgen();
pptx.layout = 'LAYOUT_16x9';  // 根据 viewportRatio 选择

// 2. 遍历每个 Slide
for (const slide of slides) {
  const pptxSlide = pptx.addSlide();
  
  // 3. 添加背景
  if (slide.background) {
    pptxSlide.background = { ... };
  }
  
  // 4. 添加元素
  for (const el of slide.elements) {
    switch (el.type) {
      case 'text':
        pptxSlide.addText(formatHTML(el.content), options);
        break;
      case 'image':
        pptxSlide.addImage({ data: base64, ... });
        break;
      case 'shape':
        pptxSlide.addShape('custGeom', { points, ... });
        break;
      case 'chart':
        pptxSlide.addChart(type, chartData, options);
        break;
      case 'table':
        pptxSlide.addTable(tableData, options);
        break;
      case 'latex':
        // 转换为 Office Math XML (OMML)
        const omml = latexToOmml(el.latex);
        pptxSlide.addText([{ text: '', options: { math: omml } }]);
        break;
    }
  }
  
  // 5. 添加演讲者备注
  const notes = buildSpeakerNotes(scene);
  if (notes) pptxSlide.addNotes(notes);
}

// 6. 生成 Blob
return await pptx.write({ outputType: 'blob' });
特色功能:

✅ 富文本支持（HTML → pptxgenjs TextProps）
✅ 图片裁剪、滤镜、翻转
✅ SVG 形状 → PowerPoint 自定义形状
✅ LaTeX 公式 → Office Math (OMML)
✅ 图表（8 种类型）
✅ 表格（支持合并单元格、主题色）
✅ 演讲者备注（从 SpeechAction 提取）
✅ 媒体占位符解析（gen_img_1 → 实际 URL）
结果预览方式
组件: components/slide-renderer/Editor/ScreenCanvas.tsx
实现: Canvas 2D 渲染
功能:
实时预览所有元素
支持缩放、拖拽
支持元素选中、编辑
支持特效叠加（聚光灯、激光笔）
6.2 文档/docx 相关 ❌
是否存在 Word/docx 导出能力
状态: ❌ 不存在
证据:
搜索 docx|word|document 仅在需求文档中出现
lib/export/ 目录下只有 use-export-pptx.ts
没有 docx 相关依赖（package.json）
是否有脚本、讲稿、narration、lesson plan 类似结构
状态: ⚠️ 部分存在
现有结构
// 1. 演讲者备注（Speaker Notes）
// 位置: lib/export/use-export-pptx.ts → buildSpeakerNotes()
// 来源: 从 Scene.actions 中提取 SpeechAction.text
// 用途: 导出到 PPTX 的备注栏

function buildSpeakerNotes(scene: Scene): string {
  const parts: string[] = [];
  for (const action of scene.actions) {
    if (action.type === 'speech') {
      parts.push((action as SpeechAction).text);
    }
  }
  return parts.join('\n');
}

// 2. 场景描述（Scene Description）
// 位置: lib/types/stage.ts → Scene.description
// 用途: 场景的简短描述（1-2 句话）

interface Scene {
  id: string;
  title: string;
  description?: string;  // 场景描述
  type: SceneType;
  content: SceneContent;
  actions: Action[];
  order: number;
}

// 3. 大纲关键点（Outline Key Points）
// 位置: lib/types/generation.ts → SceneOutline.keyPoints
// 用途: 每个场景的教学要点列表

interface SceneOutline {
  keyPoints: string[];  // 教学要点
}
哪些可以迁移复用为"教案生成"
可复用结构:

✅ 演讲者备注 → 教学讲稿
✅ 场景描述 → 教学目标
✅ 关键点列表 → 知识点清单
✅ Quiz 问题 → 课堂练习
✅ PBL 项目配置 → 实践活动设计
需要新增的结构:
// 教案数据结构（建议）
interface TeachingPlan {
  // 基础信息
  title: string;
  subject: string;
  grade: string;
  duration: number;  // 课时
  
  // 教学目标
  objectives: {
    knowledge: string[];   // 知识目标
    skills: string[];      // 能力目标
    attitude: string[];    // 情感态度目标
  };
  
  // 教学重难点
  keyPoints: string[];
  difficulties: string[];
  
  // 教学过程
  procedures: TeachingProcedure[];
  
  // 板书设计
  boardDesign?: string;
  
  // 课后作业
  homework?: string[];
  
  // 教学反思
  reflection?: string;
}

interface TeachingProcedure {
  stage: string;  // 导入/新授/巩固/总结
  duration: number;
  teacherActivity: string;
  studentActivity: string;
  designIntent: string;
}
七、下一步建议：优先阅读的 10 个文件
按优先级排序
| 优先级 | 文件路径 | 阅读目的 | 预计时间 |
|--------|---------|---------|---------|
| 🔥 P0 | lib/generation/outline-generator.ts | 理解大纲生成逻辑，这是改造的起点 | 30 min |
| 🔥 P0 | lib/generation/scene-generator.ts | 理解场景生成逻辑，需改造为教案生成 | 45 min |
| 🔥 P0 | lib/server/classroom-generation.ts | 理解完整生成流程，需改造为教案生成流程 | 30 min | | 🔥 P0 | lib/export/use-export-pptx.ts | 理解 PPT 导出实现，需参考实现 docx 导出 | 40 min |
| ⭐ P1 | lib/types/generation.ts | 理解数据结构，需扩展教案类型 | 20 min |
| ⭐ P1 | lib/types/stage.ts | 理解场景/舞台类型，需调整为教案结构 | 15 min | | ⭐ P1 | lib/generation/prompts/templates/ | 查看现有 Prompt 模板，需改写为教案导向 | 30 min |
| ⭐ P1 | app/page.tsx | 理解首页 UI 和用户输入流程 | 20 min |
| 📖 P2 | lib/ai/llm.ts | 理解 LLM 调用封装，可直接复用 | 15 min |
| 📖 P2 | lib/pdf/pdf-providers.ts | 理解 PDF 解析实现，可直接复用 | 15 min |

总计阅读时间: 约 4 小时

八、总结与建议
8.1 项目现状评估
优势:

✅ 成熟的 Next.js + React 19 架构
✅ 完善的 PPT 生成和导出能力
✅ 灵活的 LLM 抽象层（支持多服务商）
✅ 完整的 PDF 解析能力
✅ 良好的类型系统和代码组织
劣势:

❌ 没有 Word/docx 导出功能
❌ 大量课堂演绎相关代码（占比约 40%）
❌ 缺少教案生成相关的数据结构和 Prompt
❌ 没有 RAG 知识库集成
❌ 没有多模态资料处理（视频、图片 OCR）