# 对话式教学需求收集 Agent - 实施总结

## 可行性评估结论

### ✅ 完全可行且安全

经过详细分析，这个改造方案是**完全可行且安全的**：

1. **不侵入现有系统**
   - 只在生成前增加对话层
   - 输出标准 `TeachingRequest`
   - 不修改三源融合核心
   - 不修改 PPT 生成链路

2. **技术栈完备**
   - 项目已有 Vercel AI SDK
   - 已有完善的 LLM 调用基础设施
   - 可以复用现有 provider 系统

3. **用户体验提升**
   - 降低使用门槛
   - 自然语言交互
   - 保留表单作为备选

## 已实现功能

### 1. 核心 Agent 模块

**文件**：`lib/agent/teaching-intent-agent.ts`

**功能**：
- ✅ 渐进式信息收集（每次 1-2 个问题）
- ✅ 智能信息提取（关键词 + LLM）
- ✅ 对话状态管理（TeachingSession）
- ✅ 完整性判断（必填字段检查）
- ✅ 转换为 TeachingRequest

**核心函数**：
```typescript
handleTeachingConversation(
  messages: ChatMessage[],
  model: LanguageModel
): Promise<AgentResponse>
```

**两种实现**：
- 基础版：关键词匹配 + LLM 对话
- 增强版：LLM 结构化提取 + LLM 对话

### 2. 对话式 UI 页面

**文件**：`app/teaching-chat/page.tsx`

**功能**：
- ✅ 聊天界面
- ✅ 实时显示收集进度
- ✅ 自动触发生成
- ✅ 显示生成进度
- ✅ 一键导出 PPT

**特性**：
- 自动滚动到最新消息
- 显示思考状态（typing indicator）
- 显示生成进度条
- 显示生成结果预览

### 3. 完整文档

**文件**：`TEACHING_INTENT_AGENT_GUIDE.md`

**内容**：
- 功能概述
- 技术实现细节
- 对话示例
- 使用方法
- 配置说明
- 扩展方向
- 故障排查

## 工作流程

```
用户输入自然语言
  ↓
Agent 提取信息
  ↓
判断信息是否完整
  ↓
  不完整 → 生成追问 → 继续对话
  ↓
  完整 → 用户确认 → 转换为 TeachingRequest
    ↓
    调用现有生成系统
      ↓
      生成 TeachingDesign
        ↓
        生成 Slides (Canvas)
          ↓
          导出 PPT
```

## 对话示例

### 快速对话（一次提供多个信息）

```
用户：我想做一个初三数学课，讲二次函数，45分钟

助手：太好了！您一次提供了很多信息，让我确认一下：
- 课题：二次函数
- 学科：数学
- 年级：初三
- 课时：45 分钟

信息已经完整了。请问您有什么特殊的教学要求吗？如果没有，我们可以直接开始生成教学设计。

用户：开始吧

助手：好的！我现在开始为您生成教学设计。请稍候...

[系统开始生成]
```

### 渐进式对话（逐步收集）

```
助手：你好！我是教学设计助手。请告诉我你想做什么课程？

用户：我想做一个关于二次函数的课件

助手：好的！请问这是哪个学科的课程呢？

用户：数学

助手：明白了。这节课是给哪个年级的学生上的呢？

用户：初三

助手：好的。请问这节课的时长是多少分钟呢？

用户：45分钟

助手：太好了！信息已经完整。请问您有什么特殊要求吗？如果没有，我们可以开始生成。

用户：没有，开始吧

[系统开始生成]
```

## 技术亮点

### 1. 双重信息提取策略

**关键词匹配**（快速、可靠）：
- 学科识别：预定义学科列表
- 年级识别：正则表达式匹配
- 课时识别：数字 + "分钟"

**LLM 提取**（准确、灵活）：
- 使用 LLM 分析对话历史
- 提取结构化 JSON
- 处理复杂表达

### 2. 智能对话生成

**System Prompt 设计**：
- 定义 Agent 角色（教学助理）
- 列出收集目标（必填 + 可选）
- 规定对话规则（渐进式、友好）
- 提供示例对话

**Context 增强**：
- 实时显示收集进度
- 提示下一步行动
- 避免重复提问

### 3. 状态管理

**TeachingSession**：
```typescript
{
  topic?: string;
  subject?: string;
  gradeLevel?: string;
  duration?: number;
  objectives?: string[];
  additionalNotes?: string;
  useKnowledgeBase?: boolean;
  ready: boolean;
}
```

**完整性判断**：
- 必填字段：topic, subject, gradeLevel, duration
- 用户确认：关键词匹配
- Ready = 信息完整 + 用户确认

### 4. 无缝集成

**输出标准接口**：
```typescript
function sessionToTeachingRequest(session: TeachingSession): TeachingRequest {
  return {
    topic: session.topic!,
    subject: session.subject!,
    gradeLevel: session.gradeLevel!,
    duration: session.duration!,
    language: 'zh-CN',
    objectives: session.objectives ? { knowledge: session.objectives } : undefined,
    additionalNotes: session.additionalNotes,
    useKnowledgeBase: session.useKnowledgeBase,
  };
}
```

**调用现有系统**：
```typescript
if (response.ready && response.teachingRequest) {
  const design = await generator.generate(response.teachingRequest, options);
}
```

## 风险与缓解

### 1. LLM 输出不稳定

**风险**：JSON 格式错误、信息提取不准确

**缓解**：
- 使用关键词匹配作为备选
- 添加 try-catch 错误处理
- 提供明确的 schema 示例

### 2. 对话成本

**风险**：每次追问都调用 LLM

**缓解**：
- 使用较小的模型（GLM-4.7）
- 优化 prompt 长度
- 缓存对话历史

### 3. 信息提取准确性

**风险**：LLM 可能误判信息完整性

**缓解**：
- 明确的判断标准
- 用户确认机制
- 显示收集进度

### 4. 用户体验

**风险**：有些用户可能更喜欢表单

**缓解**：
- 保留表单模式（`/teaching-test`）
- 提供模式切换
- 支持快速输入（一次提供多个信息）

## 使用方法

### 1. 启动服务

```bash
cd OpenMAIC
npm run dev
```

### 2. 访问页面

```
http://localhost:3000/teaching-chat
```

### 3. 开始对话

输入你的需求，例如：
- "我想做一个数学课件"
- "初三数学，二次函数，45分钟"
- "帮我生成一个物理课的教学设计"

### 4. 导出 PPT

生成完成后，点击"导出 PPT"按钮。

## 扩展方向

### 短期（下一阶段）

- [ ] 支持在对话中上传参考资料
- [ ] 支持修改已收集的信息
- [ ] 添加对话历史保存
- [ ] 支持多轮修改

### 中期

- [ ] 支持语音输入
- [ ] 支持图片上传（拍照教材）
- [ ] 智能推荐教学目标
- [ ] 自动匹配知识库

### 长期

- [ ] 多模态对话（图文混合）
- [ ] 个性化对话策略
- [ ] 教师画像和偏好学习
- [ ] 协作式教学设计

## 验收标准

### ✅ 已完成

1. **核心功能**
   - ✅ 对话式信息收集
   - ✅ 渐进式提问（1-2 个问题）
   - ✅ 智能信息提取
   - ✅ 转换为 TeachingRequest

2. **用户体验**
   - ✅ 友好的对话界面
   - ✅ 实时显示收集进度
   - ✅ 自动触发生成
   - ✅ 显示生成进度

3. **系统集成**
   - ✅ 输出标准接口
   - ✅ 不修改现有系统
   - ✅ 复用生成链路
   - ✅ 支持 PPT 导出

4. **文档完善**
   - ✅ 实施指南
   - ✅ 对话示例
   - ✅ 技术细节
   - ✅ 使用方法

## 总结

对话式教学需求收集 Agent 已成功实现，核心目标达成：

✅ 渐进式信息收集（不一次问完）  
✅ 智能信息提取（关键词 + LLM）  
✅ 友好对话体验（像教学助理）  
✅ 无缝集成现有系统（不修改核心）  
✅ 完整的文档和示例  

这个 Agent 为教师提供了更自然、更友好的交互方式，显著降低了使用门槛，同时保持了系统的稳定性和可扩展性。

## 与现有系统的关系

```
┌─────────────────────────────────────────┐
│         对话式 Agent（新增）              │
│  - 收集信息                              │
│  - 渐进式提问                            │
│  - 转换为 TeachingRequest                │
└─────────────┬───────────────────────────┘
              │
              ↓ TeachingRequest
┌─────────────────────────────────────────┐
│      三源融合系统（不修改）               │
│  - 教师需求                              │
│  - 参考资料（PDF/DOCX/图片）             │
│  - 知识库（FastGPT RAG）                 │
└─────────────┬───────────────────────────┘
              │
              ↓ TeachingDesign
┌─────────────────────────────────────────┐
│      生成系统（不修改）                   │
│  - Outline Generator                     │
│  - Slide Generator                       │
│  - Canvas Renderer                       │
└─────────────┬───────────────────────────┘
              │
              ↓ PPT / DOCX
┌─────────────────────────────────────────┐
│      导出系统（不修改）                   │
│  - PPT Export                            │
│  - DOCX Export                           │
└─────────────────────────────────────────┘
```

---

更新时间：2024
版本：v1.0
状态：已完成 ✅
