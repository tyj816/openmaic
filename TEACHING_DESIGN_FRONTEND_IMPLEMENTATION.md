# 教学设计主产品层前端改造 - 第一步完成报告

## 📋 实施概览

已成功完成"教学设计主产品层前端改造"的第一步，将两阶段页面原型正式融合到 OpenMAIC 项目中。

## ✅ 完成内容

### 1. 新增路由

创建了三个独立页面路由：

- `/teaching-design` - 入口页（自动重定向到意图页）
- `/teaching-design/intent` - 教师意图理解页（阶段1）
- `/teaching-design/workspace` - 教学设计工作台页（阶段2）

### 2. 目录结构

```
OpenMAIC/
├── app/
│   └── teaching-design/
│       ├── page.tsx                    # 入口重定向页
│       ├── intent/
│       │   └── page.tsx                # 意图理解主页面
│       └── workspace/
│           └── page.tsx                # 工作台主页面
│
├── components/
│   └── teaching-design/
│       ├── TeachingDesignTopbar.tsx    # 共享顶部栏
│       ├── SectionTitle.tsx            # 通用区块标题
│       ├── StatusBadge.tsx             # 状态徽章
│       ├── intent/
│       │   ├── IntentConversationPanel.tsx    # 对话面板
│       │   ├── MessageBubble.tsx              # 消息气泡
│       │   ├── UploadDrawerCard.tsx           # 上传抽屉卡片
│       │   └── IntentStatusPanel.tsx          # 状态面板
│       └── workspace/
│           ├── WorkspaceSidebar.tsx           # 左侧导航
│           ├── WorkspacePreviewPanel.tsx      # 中心预览面板
│           ├── WorkspaceRegeneratePanel.tsx   # 再生成面板
│           └── WorkspaceEvidencePanel.tsx     # 右侧证据面板
│
└── lib/
    ├── types/
    │   └── teaching-design-ui.ts       # UI 类型定义
    └── mocks/
        ├── teaching-design-intent.ts   # 意图页 Mock 数据
        └── teaching-design-workspace.ts # 工作台 Mock 数据
```

### 3. 页面结构落地

#### 页面1：意图理解页 (`/teaching-design/intent`)

**已实现的结构：**
- ✅ 顶部产品栏（标题、标签、项目信息、历史版本、发布按钮）
- ✅ 主内容左区
  - 阶段标识和页面标题
  - 当前课题信息卡
  - AI 引导问题 chips
  - 对话历史区（聊天气泡）
  - 底部输入区（文本框、发送、语音、回形针）
  - 资料上传卡片（点击回形针展开）
- ✅ 右侧信息区
  - 意图理解状态卡
  - AI 引导要点卡
  - 理解完成度进度条
- ✅ 生成教学设计按钮（跳转到工作台）

#### 页面2：教学设计工作台页 (`/teaching-design/workspace`)

**已实现的结构：**
- ✅ 顶部产品栏（与页面1一致，支持返回）
- ✅ 左侧结构导航区
  - Slide 结构导航卡片
  - 教案结构卡片
- ✅ 中间主区（页面视觉中心）
  - 阶段标识和标题
  - 版本号和更新时间
  - 教学目标/重点/难点卡片
  - 大尺寸预览卡片（幻灯片/教案切换）
  - 当前 slide 内容 mock 展示
- ✅ 预览下方修改闭环区
  - 修改输入框
  - 再生成当前页按钮
  - 生成优化建议按钮
  - 提示文案
- ✅ 右侧辅助区
  - 引用与 RAG 证据卡片
  - 工作流状态卡片
  - 整体进度条

### 4. 组件拆分

所有组件已按功能模块化拆分：

**共享组件：**
- `TeachingDesignTopbar` - 顶部导航栏
- `SectionTitle` - 区块标题组件
- `StatusBadge` - 状态徽章组件

**意图页组件：**
- `IntentConversationPanel` - 对话主面板
- `MessageBubble` - AI/教师消息气泡
- `UploadDrawerCard` - 资料上传抽屉
- `IntentStatusPanel` - 右侧状态面板

**工作台组件：**
- `WorkspaceSidebar` - 左侧结构导航
- `WorkspacePreviewPanel` - 中心预览区（含幻灯片/教案预览）
- `WorkspaceRegeneratePanel` - 修改再生成面板
- `WorkspaceEvidencePanel` - 右侧证据和工作流面板

### 5. Mock 数据驱动

所有页面均使用 Mock 数据驱动，数据文件位于：

- `lib/mocks/teaching-design-intent.ts` - 意图页数据
  - 项目摘要
  - 引导提示
  - 对话消息列表
  - 上传文件列表

- `lib/mocks/teaching-design-workspace.ts` - 工作台数据
  - 设计摘要
  - Slide 列表
  - 教案章节
  - RAG 证据项
  - 工作流步骤

### 6. 页面间跳转

- ✅ 意图页 → 工作台页：点击"生成教学设计"按钮
- ✅ 工作台页 → 意图页：点击"返回意图页"按钮
- ✅ 使用 Next.js `useRouter` 实现客户端路由跳转

### 7. 基础交互可用

- ✅ 对话输入框（UI 占位）
- ✅ 回形针按钮展开/收起上传卡片
- ✅ Slide 导航点击切换当前页
- ✅ 幻灯片/教案预览模式切换
- ✅ 所有按钮均有 hover 效果
- ✅ 使用 framer-motion 实现流畅动画

## 🎨 复用的现有能力

- ✅ Next.js 路由体系
- ✅ Tailwind CSS 样式系统
- ✅ shadcn/ui 组件库
  - Badge, Button, Card, Input, Textarea
  - Progress, ScrollArea, Tabs
- ✅ lucide-react 图标库
- ✅ framer-motion 动画库
- ✅ 现有全局样式变量

## 🚫 未触碰的现有代码

- ✅ 未删除任何旧代码
- ✅ 未修改 Stage 主工作区逻辑
- ✅ 未破坏现有路由：`/`, `/classroom/[id]`, `/teaching-test`
- ✅ 未复用 Stage、PlaybackEngine、Roundtable 等重型组件
- ✅ 未引入新的重型依赖

## 📍 Mock 数据位置

所有数据均为 Mock，位于以下位置：

1. **意图页 Mock 数据** (`lib/mocks/teaching-design-intent.ts`)
   - 项目信息
   - 对话历史
   - 上传文件

2. **工作台 Mock 数据** (`lib/mocks/teaching-design-workspace.ts`)
   - 教学设计摘要
   - Slide 结构
   - 教案结构
   - RAG 证据
   - 工作流状态

## 🔌 真实业务接口位

以下位置已预留真实业务接口接入点：

### 意图页接口位：
1. **对话消息发送** - `IntentConversationPanel.tsx`
   - 位置：发送按钮 onClick
   - 接口：`POST /api/teaching-chat` 或类似
   - 参数：用户输入内容

2. **资料上传** - `UploadDrawerCard.tsx`
   - 位置：PDF/图片上传区域
   - 接口：`POST /api/upload` 或类似
   - 参数：文件 FormData

3. **生成教学设计** - `IntentConversationPanel.tsx`
   - 位置：生成按钮 onClick
   - 接口：`POST /api/generate-teaching-design`
   - 参数：意图理解结果

### 工作台页接口位：
1. **Slide 切换加载** - `WorkspaceSidebar.tsx`
   - 位置：onSlideSelect 回调
   - 接口：`GET /api/teaching-design/slide/:id`
   - 参数：slideId

2. **再生成当前页** - `WorkspaceRegeneratePanel.tsx`
   - 位置：再生成按钮 onClick
   - 接口：`POST /api/regenerate-teaching/slide`
   - 参数：slideId, 修改描述

3. **生成优化建议** - `WorkspaceRegeneratePanel.tsx`
   - 位置：优化建议按钮 onClick
   - 接口：`POST /api/teaching-design/suggestions`
   - 参数：slideId

## ✅ 页面访问验证

页面已可通过以下路由访问：

- **入口页**：http://localhost:3000/teaching-design
- **意图理解页**：http://localhost:3000/teaching-design/intent
- **工作台页**：http://localhost:3000/teaching-design/workspace

## 🎯 下一步最适合接入真实逻辑的 3 个点

### 1. 意图理解对话接口（优先级：高）
**位置**：`components/teaching-design/intent/IntentConversationPanel.tsx`

**接入方式**：
```typescript
const handleSendMessage = async (message: string) => {
  const response = await fetch('/api/teaching-chat', {
    method: 'POST',
    body: JSON.stringify({ message, sessionId }),
  });
  const data = await response.json();
  // 更新消息列表
};
```

**原因**：这是用户的第一个交互点，是整个流程的入口

### 2. 生成教学设计接口（优先级：高）
**位置**：`app/teaching-design/intent/page.tsx` 的 `handleGenerate`

**接入方式**：
```typescript
const handleGenerate = async () => {
  const response = await fetch('/api/generate-teaching-design', {
    method: 'POST',
    body: JSON.stringify({ intentData }),
  });
  const { designId } = await response.json();
  router.push(`/teaching-design/workspace?id=${designId}`);
};
```

**原因**：连接两个阶段的关键接口

### 3. Slide 数据加载接口（优先级：中）
**位置**：`app/teaching-design/workspace/page.tsx`

**接入方式**：
```typescript
useEffect(() => {
  const loadSlideData = async () => {
    const response = await fetch(`/api/teaching-design/slide/${activeSlideId}`);
    const slideData = await response.json();
    // 更新 slide 内容
  };
  loadSlideData();
}, [activeSlideId]);
```

**原因**：实现真实的 Slide 内容展示

## 🐛 已知问题

- ✅ 无类型错误
- ✅ 无样式冲突
- ✅ 无组件冲突
- ✅ 所有组件均可正常渲染

## 📝 注意事项

1. **不要接真实生成 API**：当前阶段仅做 UI 层，不接 `/api/generate/teaching-outline` 等
2. **不要做持久化**：不接 IndexedDB、不做版本快照
3. **不要碰 Stage 主链路**：保持与现有 Stage 工作区完全隔离
4. **Mock 数据驱动**：所有交互均基于 Mock 数据，便于演示

## 🎉 总结

第一步已完成，两个页面已真实融合到 OpenMAIC 项目中，可以通过路由访问和演示。页面结构完整，组件拆分清晰，Mock 数据驱动，为下一步接入真实业务逻辑做好了准备。
