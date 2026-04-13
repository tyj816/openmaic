# 教学设计前端改造 - 文件清单

## 📦 新增文件总览

本次改造共新增 **17 个文件**，分为 4 个类别：

## 1️⃣ 类型定义 (1 个文件)

```
OpenMAIC/lib/types/teaching-design-ui.ts
```
- 定义所有 UI 层类型
- 包含：ProjectSummary, IntentMessage, UploadedFile, Slide, LessonSection, DesignSummary, EvidenceItem, WorkflowStep

## 2️⃣ Mock 数据 (2 个文件)

```
OpenMAIC/lib/mocks/teaching-design-intent.ts
OpenMAIC/lib/mocks/teaching-design-workspace.ts
```
- 意图页 Mock 数据：项目摘要、引导提示、对话消息、上传文件
- 工作台 Mock 数据：设计摘要、Slide 列表、教案结构、证据项、工作流步骤

## 3️⃣ 组件 (11 个文件)

### 共享组件 (3 个)
```
OpenMAIC/components/teaching-design/TeachingDesignTopbar.tsx
OpenMAIC/components/teaching-design/SectionTitle.tsx
OpenMAIC/components/teaching-design/StatusBadge.tsx
```

### 意图页组件 (4 个)
```
OpenMAIC/components/teaching-design/intent/IntentConversationPanel.tsx
OpenMAIC/components/teaching-design/intent/MessageBubble.tsx
OpenMAIC/components/teaching-design/intent/UploadDrawerCard.tsx
OpenMAIC/components/teaching-design/intent/IntentStatusPanel.tsx
```

### 工作台组件 (4 个)
```
OpenMAIC/components/teaching-design/workspace/WorkspaceSidebar.tsx
OpenMAIC/components/teaching-design/workspace/WorkspacePreviewPanel.tsx
OpenMAIC/components/teaching-design/workspace/WorkspaceRegeneratePanel.tsx
OpenMAIC/components/teaching-design/workspace/WorkspaceEvidencePanel.tsx
```

## 4️⃣ 页面路由 (3 个文件)

```
OpenMAIC/app/teaching-design/page.tsx              # 入口重定向页
OpenMAIC/app/teaching-design/intent/page.tsx       # 意图理解页
OpenMAIC/app/teaching-design/workspace/page.tsx    # 工作台页
```

## 📊 文件统计

| 类别 | 文件数 | 说明 |
|------|--------|------|
| 类型定义 | 1 | UI 层类型 |
| Mock 数据 | 2 | 页面数据源 |
| 共享组件 | 3 | 跨页面复用 |
| 意图页组件 | 4 | 阶段1专用 |
| 工作台组件 | 4 | 阶段2专用 |
| 页面路由 | 3 | Next.js 路由 |
| **总计** | **17** | |

## 🗂️ 目录结构树

```
OpenMAIC/
├── app/
│   └── teaching-design/
│       ├── page.tsx                                    [NEW]
│       ├── intent/
│       │   └── page.tsx                                [NEW]
│       └── workspace/
│           └── page.tsx                                [NEW]
│
├── components/
│   └── teaching-design/                                [NEW DIR]
│       ├── TeachingDesignTopbar.tsx                    [NEW]
│       ├── SectionTitle.tsx                            [NEW]
│       ├── StatusBadge.tsx                             [NEW]
│       ├── intent/                                     [NEW DIR]
│       │   ├── IntentConversationPanel.tsx             [NEW]
│       │   ├── MessageBubble.tsx                       [NEW]
│       │   ├── UploadDrawerCard.tsx                    [NEW]
│       │   └── IntentStatusPanel.tsx                   [NEW]
│       └── workspace/                                  [NEW DIR]
│           ├── WorkspaceSidebar.tsx                    [NEW]
│           ├── WorkspacePreviewPanel.tsx               [NEW]
│           ├── WorkspaceRegeneratePanel.tsx            [NEW]
│           └── WorkspaceEvidencePanel.tsx              [NEW]
│
└── lib/
    ├── types/
    │   └── teaching-design-ui.ts                       [NEW]
    └── mocks/
        ├── teaching-design-intent.ts                   [NEW]
        └── teaching-design-workspace.ts                [NEW]
```

## 📄 文档文件 (3 个)

```
TEACHING_DESIGN_FRONTEND_IMPLEMENTATION.md    # 完整实施报告
TEACHING_DESIGN_QUICK_ACCESS.md               # 快速访问指南
TEACHING_DESIGN_FILES_SUMMARY.md              # 本文件清单
```

## ✅ 验证清单

- [x] 所有文件已创建
- [x] 无 TypeScript 类型错误
- [x] 组件模块化清晰
- [x] Mock 数据完整
- [x] 路由配置正确
- [x] 不影响现有代码

## 🎯 代码行数估算

| 类别 | 估算行数 |
|------|----------|
| 类型定义 | ~60 行 |
| Mock 数据 | ~200 行 |
| 组件代码 | ~1,500 行 |
| 页面代码 | ~150 行 |
| **总计** | **~1,910 行** |

## 🔍 依赖关系

```
页面 (page.tsx)
  ↓
组件 (components/teaching-design/*)
  ↓
Mock 数据 (lib/mocks/*)
  ↓
类型定义 (lib/types/teaching-design-ui.ts)
```

## 📌 关键文件说明

### 最重要的 5 个文件

1. **`app/teaching-design/intent/page.tsx`**
   - 意图理解页主入口
   - 处理页面跳转逻辑

2. **`app/teaching-design/workspace/page.tsx`**
   - 工作台页主入口
   - 管理 Slide 切换状态

3. **`components/teaching-design/intent/IntentConversationPanel.tsx`**
   - 对话面板核心组件
   - 包含输入、上传、生成按钮

4. **`components/teaching-design/workspace/WorkspacePreviewPanel.tsx`**
   - 预览面板核心组件
   - 包含幻灯片/教案预览切换

5. **`lib/types/teaching-design-ui.ts`**
   - 类型定义中心
   - 所有组件的类型来源

## 🚀 下一步文件修改建议

当接入真实 API 时，主要修改这些文件：

1. `app/teaching-design/intent/page.tsx` - 添加 API 调用
2. `app/teaching-design/workspace/page.tsx` - 添加数据加载
3. `components/teaching-design/intent/IntentConversationPanel.tsx` - 实现发送消息
4. `components/teaching-design/workspace/WorkspaceRegeneratePanel.tsx` - 实现再生成

无需修改 Mock 数据文件，可直接替换为 API 返回数据。
