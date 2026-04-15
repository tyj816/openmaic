# 纯 AI 驱动的意图理解 Agent

## 改进说明

已将教学意图理解从**混合策略（规则+AI）**改为**纯 AI 驱动**，使用 LLM 的 structured output 功能。

## 核心改进

### 之前的问题 ❌

```typescript
// 规则提取 - 容易重复追问
const GRADE_PATTERNS = [/(五年级)/];
if (text.match(pattern)) {
  session.gradeLevel = "五年级";
}

// 问题：
// 1. 无法理解上下文
// 2. 用户说"是的"时，规则无法理解这是确认
// 3. 容易重复询问已经明确的信息
```

### 现在的方案 ✅

```typescript
// 使用 LLM structured output 提取信息
const result = await generateObject({
  model,
  schema: TeachingSessionSchema,  // Zod schema
  prompt: `分析整个对话历史，提取教学需求信息...`,
  temperature: 0.1,
});

// 优点：
// 1. 完全理解上下文
// 2. 理解"是的"、"对"等确认语句
// 3. 不会重复询问
// 4. 理解隐含信息（"2课时" = "90分钟"）
```

## 工作流程

```
用户输入
  ↓
调用 /api/teaching-chat
  ↓
┌─────────────────────────────────────┐
│ Step 1: LLM Structured Extraction   │
│ - 使用 generateObject()              │
│ - 提取所有字段                       │
│ - 返回结构化数据                     │
└─────────────────────────────────────┘
  ↓
session = {
  topic: "荷塘月色",
  subject: "语文",
  gradeLevel: "五年级",
  duration: 45
}
  ↓
┌─────────────────────────────────────┐
│ Step 2: Check Completeness          │
│ - 检查必填字段是否完整               │
│ - 检查用户是否确认                   │
└─────────────────────────────────────┘
  ↓
if (complete && confirming) {
  return { ready: true, teachingRequest }
}
  ↓
┌─────────────────────────────────────┐
│ Step 3: Generate Next Question      │
│ - 使用 generateText()                │
│ - 根据当前状态生成回复               │
│ - 自然、不重复                       │
└─────────────────────────────────────┘
  ↓
返回 AI 回复
```

## 核心代码

### 1. Structured Extraction

```typescript
const TeachingSessionSchema = z.object({
  topic: z.string().nullable().describe('课题或主题'),
  subject: z.string().nullable().describe('学科'),
  gradeLevel: z.string().nullable().describe('年级'),
  duration: z.number().nullable().describe('课时长度（分钟）'),
  objectives: z.array(z.string()).nullable().describe('教学目标'),
  additionalNotes: z.string().nullable().describe('特殊要求'),
  useKnowledgeBase: z.boolean().nullable().describe('是否使用知识库'),
});

async function extractSessionFromConversation(
  messages: ChatMessage[],
  model: LanguageModel,
): Promise<TeachingSession> {
  const conversationText = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  const result = await generateObject({
    model,
    schema: TeachingSessionSchema,
    prompt: `${EXTRACTION_PROMPT}\n\n对话历史：\n${conversationText}`,
    temperature: 0.1,  // 低温度保证稳定性
  });

  return {
    topic: result.object.topic || undefined,
    subject: result.object.subject || undefined,
    gradeLevel: result.object.gradeLevel || undefined,
    duration: result.object.duration || undefined,
    // ...
  };
}
```

### 2. Context-Aware Conversation

```typescript
const sessionSummary = `
## 当前已收集的信息

- 课题：${session.topic || '❌ 未收集'}
- 学科：${session.subject || '❌ 未收集'}
- 年级：${session.gradeLevel || '❌ 未收集'}
- 课时：${session.duration ? `${session.duration}分钟` : '❌ 未收集'}

${isSessionComplete(session) 
  ? '✅ 必填信息已完整，可以询问用户是否开始生成' 
  : '⚠️ 必填信息不完整，需要继续收集缺失的字段'}

## 你的任务

${isSessionComplete(session)
  ? '信息已完整，请总结并询问用户是否可以开始生成教学设计。'
  : '信息不完整，请自然地询问缺失的字段。注意：不要重复询问已经有的字段！'}
`;

const fullMessages = [
  { role: 'system', content: CONVERSATION_PROMPT },
  ...messages,
  { role: 'system', content: sessionSummary },
];

const result = await generateText({
  model,
  messages: fullMessages,
  temperature: 0.7,
});
```

## 对话示例

### 示例 1：理解确认语句

```
用户: "我想做一个语文课件"
  ↓ LLM 提取
  { subject: "语文" }
  ↓ LLM 生成
助手: "好的！请问这节课的课题是什么呢？"

用户: "荷塘月色"
  ↓ LLM 提取（累积）
  { subject: "语文", topic: "荷塘月色" }
  ↓ LLM 生成
助手: "明白了。这是给哪个年级的学生上的呢？"

用户: "五年级"
  ↓ LLM 提取（累积）
  { subject: "语文", topic: "荷塘月色", gradeLevel: "五年级" }
  ↓ LLM 生成
助手: "好的。请问这节课的时长是多少分钟呢？"

用户: "是的"  ← 用户误以为在确认
  ↓ LLM 提取（理解上下文）
  { subject: "语文", topic: "荷塘月色", gradeLevel: "五年级" }
  ↓ LLM 生成（理解用户在确认，但信息不完整）
助手: "好的。那请问这节课的时长是多少分钟呢？通常是45分钟还是其他时长？"
```

### 示例 2：理解隐含信息

```
用户: "五年级语文《荷塘月色》，2课时"
  ↓ LLM 提取（一次性提取所有）
  {
    subject: "语文",
    topic: "荷塘月色",
    gradeLevel: "五年级",
    duration: 90  ← 理解"2课时" = 90分钟
  }
  ↓ 检查完整性：✅
  ↓ LLM 生成
助手: "太好了！我已经了解您的需求：
- 课题：荷塘月色
- 学科：语文
- 年级：五年级
- 课时：90分钟（2课时）

请问可以开始生成教学设计了吗？"
```

### 示例 3：不重复询问

```
用户: "我想做一个数学课件"
  ↓ LLM 提取
  { subject: "数学" }
  ↓ LLM 生成
助手: "好的！请问课题是什么呢？"

用户: "二次函数"
  ↓ LLM 提取
  { subject: "数学", topic: "二次函数" }
  ↓ LLM 生成
助手: "明白了。这是给哪个年级的学生上的呢？"

用户: "初三，45分钟"  ← 一次提供两个信息
  ↓ LLM 提取（全部识别）
  {
    subject: "数学",
    topic: "二次函数",
    gradeLevel: "初三",
    duration: 45
  }
  ↓ 检查完整性：✅
  ↓ LLM 生成（不会再问年级或课时）
助手: "太好了！让我确认一下：
- 课题：二次函数
- 学科：数学
- 年级：初三
- 课时：45分钟

请问可以开始生成教学设计了吗？"
```

## 优势对比

| 特性 | 规则提取 | 纯 AI |
|------|---------|-------|
| **上下文理解** | ❌ 无法理解 | ✅ 完全理解 |
| **确认语句** | ❌ 无法识别 | ✅ 智能识别 |
| **隐含信息** | ❌ 需要硬编码 | ✅ 自动理解 |
| **重复询问** | ❌ 容易发生 | ✅ 不会重复 |
| **灵活性** | ❌ 需要维护规则 | ✅ 自动适应 |
| **准确性** | ✅ 高（如果规则完善） | ✅ 高（LLM理解） |
| **可调试性** | ✅ 容易 | ⚠️ 需要查看日志 |
| **成本** | ✅ 无 | ⚠️ API调用 |

## 技术细节

### 使用的 AI SDK 功能

1. **generateObject()** - 结构化输出
   - 使用 Zod schema 定义数据结构
   - LLM 返回符合 schema 的 JSON
   - 自动类型检查

2. **generateText()** - 对话生成
   - 根据上下文生成自然回复
   - 支持 system prompt
   - 温度控制

### 提示词设计

1. **提取提示词**（EXTRACTION_PROMPT）
   - 明确提取规则
   - 示例驱动
   - 低温度（0.1）保证稳定

2. **对话提示词**（CONVERSATION_PROMPT）
   - 强调上下文感知
   - 禁止重复询问
   - 自然对话风格

### 错误处理

```typescript
try {
  const session = await extractSessionFromConversation(messages, model);
  // ...
} catch (error) {
  log.error('Failed to extract session:', error);
  return { ready: false };  // 降级处理
}
```

## 迁移说明

### 已删除的文件

- ❌ `OpenMAIC/lib/mappers/intent-message-to-slots.ts`（规则提取）

### 保留的文件

- ✅ `OpenMAIC/lib/agent/teaching-intent-agent.ts`（重写为纯 AI）
- ✅ `OpenMAIC/app/api/teaching-chat/route.ts`（无需修改）
- ✅ 前端组件（无需修改）

### API 兼容性

完全兼容！前端无需任何修改，API 接口保持不变：

```typescript
// 前端调用方式不变
const response = await fetch("/api/teaching-chat", {
  method: "POST",
  body: JSON.stringify({ messages }),
});

const json = await response.json();
// json.reply - AI 回复
// json.ready - 是否可以开始生成
// json.session - 当前收集的信息
```

## 测试建议

### 测试场景

1. **逐步收集**
   - 用户一次只提供一个信息
   - 验证不会重复询问

2. **一次性提供**
   - 用户一次提供多个信息
   - 验证全部识别

3. **确认语句**
   - 用户说"是的"、"对"、"好的"
   - 验证理解为确认

4. **隐含信息**
   - 用户说"2课时"
   - 验证转换为90分钟

5. **纠正信息**
   - 用户修改之前的信息
   - 验证使用最新值

## 总结

纯 AI 驱动的意图理解 Agent 通过 LLM 的 structured output 功能，实现了：

- ✅ 完全理解上下文
- ✅ 不会重复询问
- ✅ 智能识别确认语句
- ✅ 理解隐含信息
- ✅ 自然流畅的对话

**不再需要维护复杂的正则表达式规则！** 🎉
