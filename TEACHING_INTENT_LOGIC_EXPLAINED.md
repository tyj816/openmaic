# 教学意图理解与聊天功能实现逻辑详解

## 总体架构

教学意图理解采用了 **混合策略**：**AI 对话 + 规则提取**，而不是纯硬编码或纯 AI。

```
用户输入
  ↓
前端发送到 /api/teaching-chat
  ↓
调用 teaching-intent-agent
  ↓
┌─────────────────────────────────┐
│  1. 规则提取（硬编码）            │ ← 快速、准确、可控
│     - 正则匹配关键词              │
│     - 提取学科、年级、课时等      │
└─────────────────────────────────┘
  ↓
┌─────────────────────────────────┐
│  2. AI 对话生成（LLM）            │ ← 自然、灵活、智能
│     - 根据已提取信息              │
│     - 生成下一个问题              │
│     - 保持对话连贯性              │
└─────────────────────────────────┘
  ↓
返回 AI 回复 + 当前状态
  ↓
前端显示并更新 UI
```

---

## 核心实现逻辑

### 1. 规则提取（硬编码部分）

**文件**：`OpenMAIC/lib/mappers/intent-message-to-slots.ts`

**作用**：从用户消息中快速提取结构化信息

#### 提取的字段

| 字段 | 提取方式 | 示例 |
|------|---------|------|
| **学科** (subject) | 关键词匹配 | "语文"、"数学"、"物理" |
| **年级** (gradeLevel) | 正则表达式 | "五年级"、"初三"、"高一" |
| **课题** (topic) | 正则表达式 | "《荷塘月色》"、"二次函数" |
| **课时** (duration) | 正则表达式 | "45分钟"、"2课时" |

#### 实现细节

```typescript
// 1. 学科提取 - 关键词匹配
const SUBJECT_KEYWORDS = ["语文", "数学", "英语", "物理", ...];

function extractSubject(text: string) {
  for (const keyword of SUBJECT_KEYWORDS) {
    if (text.includes(keyword)) {
      return keyword;
    }
  }
  return undefined;
}

// 2. 年级提取 - 正则表达式
const GRADE_PATTERNS = [
  /(小学[一二三四五六]年级|初中[一二三]年级|高中[一二三]年级)/,
  /([一二三四五六]年级)/,
  /(初[一二三]|高[一二三])/
];

function extractGradeLevel(text: string) {
  for (const pattern of GRADE_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return undefined;
}

// 3. 课题提取 - 多种模式
const TOPIC_PATTERNS = [
  /课题[：:]\s*[《"]?([^》"]{2,40})[》"]?/,  // "课题：荷塘月色"
  /[《"]([^》"]{2,40})[》"]/,                // "《荷塘月色》"
];

// 4. 课时提取 - 数字识别
const DURATION_PATTERNS = [
  /(\d{1,3})\s*分钟/,  // "45分钟"
  /(\d{1,2})\s*课时/   // "2课时" → 转换为 80分钟
];
```

#### 提取流程

```typescript
// 遍历所有历史消息，累积提取信息
export function extractIntentSlotsFromMessages(messages: IntentMessage[]) {
  const slots: IntentSlots = {};

  for (const message of messages) {
    const extracted = extractSlotsFromText(message.content);
    
    // 只填充尚未提取的字段（先到先得）
    if (!slots.subject && extracted.subject) 
      slots.subject = extracted.subject;
    if (!slots.topic && extracted.topic) 
      slots.topic = extracted.topic;
    // ... 其他字段
  }

  return { slots, missingSlots };
}
```

**优点**：
- ✅ 快速准确
- ✅ 不依赖 AI
- ✅ 可预测、可调试
- ✅ 支持多种表达方式

**缺点**：
- ❌ 需要维护规则
- ❌ 无法理解复杂语义
- ❌ 对新表达方式不灵活

---

### 2. AI 对话生成（LLM 部分）

**文件**：`OpenMAIC/lib/agent/teaching-intent-agent.ts`

**作用**：根据已提取信息，生成自然的下一个问题

#### System Prompt（核心指令）

```typescript
const SYSTEM_PROMPT = `你是一个友好的教学设计助手。

## 需要收集的信息
1. 课题（topic）
2. 学科（subject）
3. 年级（gradeLevel）
4. 课时（duration）

## 对话规则
1. 渐进式提问 - 每次只问 1-2 个问题
2. 语气友好专业
3. 智能识别用户输入
4. 信息完整后总结确认

## 当前任务
根据对话历史，判断：
- 如果必填信息不完整 → 继续提问
- 如果必填信息完整 → 总结并询问是否开始生成
- 如果用户确认 → 返回 READY 信号
`;
```

#### 对话流程

```typescript
export async function handleTeachingConversation(
  messages: ChatMessage[],
  model: LanguageModel,
): Promise<AgentResponse> {
  
  // 1. 规则提取当前状态
  const session = extractSessionFromHistory(messages);
  // 结果：{ topic: "荷塘月色", subject: "语文", gradeLevel: ?, duration: ? }
  
  // 2. 检查是否完整
  const isComplete = isSessionComplete(session);
  // 结果：false（还缺年级和课时）
  
  // 3. 检查用户是否确认
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  const isConfirming = ['开始', '生成', '好的'].some(kw => 
    lastUserMessage?.content.includes(kw)
  );
  
  // 4. 如果完整且确认 → 返回 ready
  if (isComplete && isConfirming) {
    return {
      reply: '好的！我现在开始为您生成教学设计。',
      ready: true,
      teachingRequest: sessionToTeachingRequest(session),
      session: { ...session, ready: true },
    };
  }
  
  // 5. 否则，调用 LLM 生成下一个问题
  const sessionSummary = `
当前已收集的信息：
- 课题：${session.topic || '未收集'}
- 学科：${session.subject || '未收集'}
- 年级：${session.gradeLevel || '未收集'}
- 课时：${session.duration || '未收集'}

${isComplete ? '✓ 信息完整' : '✗ 信息不完整'}
`;

  const fullMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages,
    { role: 'system', content: sessionSummary },
  ];
  
  // 调用 LLM
  const result = await generateText({
    model,
    messages: fullMessages,
    temperature: 0.7,
  });
  
  return {
    reply: result.text,
    ready: false,
    session,
  };
}
```

---

## 完整对话示例

### 示例 1：逐步收集信息

```
用户: "我想做一个语文课件"
  ↓ 规则提取
  { subject: "语文" }
  ↓ AI 生成
助手: "好的！请问这节课的课题是什么呢？"

用户: "荷塘月色"
  ↓ 规则提取
  { subject: "语文", topic: "《荷塘月色》" }
  ↓ AI 生成
助手: "明白了。这是给哪个年级的学生上的呢？"

用户: "五年级"
  ↓ 规则提取
  { subject: "语文", topic: "《荷塘月色》", gradeLevel: "五年级" }
  ↓ AI 生成
助手: "好的。请问这节课的时长是多少分钟呢？"

用户: "45分钟"
  ↓ 规则提取
  { subject: "语文", topic: "《荷塘月色》", gradeLevel: "五年级", duration: 45 }
  ↓ 检查完整性：✓
  ↓ AI 生成
助手: "太好了！让我确认一下：
- 课题：《荷塘月色》
- 学科：语文
- 年级：五年级
- 课时：45分钟
请问可以开始生成教学设计了吗？"

用户: "可以"
  ↓ 检查确认关键词：✓
  ↓ 返回 ready: true
助手: "好的！我现在开始为您生成教学设计。"
```

### 示例 2：一次性提供多个信息

```
用户: "五年级语文《荷塘月色》，45分钟"
  ↓ 规则提取（一次性提取所有）
  {
    subject: "语文",
    topic: "《荷塘月色》",
    gradeLevel: "五年级",
    duration: 45
  }
  ↓ 检查完整性：✓
  ↓ AI 生成
助手: "太好了！我已经了解您的需求：
- 课题：《荷塘月色》
- 学科：语文
- 年级：五年级
- 课时：45分钟
请问可以开始生成教学设计了吗？"
```

---

## 混合策略的优势

### 为什么不用纯硬编码？

**纯硬编码的问题**：
```typescript
// ❌ 机械、不自然
if (!topic) {
  return "请输入课题";
} else if (!subject) {
  return "请输入学科";
} else if (!gradeLevel) {
  return "请输入年级";
}
```

**问题**：
- 对话僵硬，像填表单
- 无法根据上下文调整
- 用户体验差

### 为什么不用纯 AI？

**纯 AI 的问题**：
```typescript
// ❌ 不可靠
const result = await llm.chat("从对话中提取课题、学科、年级、课时");
// AI 可能：
// - 提取错误
// - 格式不一致
// - 幻觉（编造信息）
// - 慢
```

**问题**：
- 提取不准确
- 响应慢
- 成本高
- 难以调试

### 混合策略的优势

```
规则提取（硬编码）     AI 对话生成（LLM）
      ↓                      ↓
  快速、准确              自然、灵活
      ↓                      ↓
提取结构化信息          生成友好回复
      ↓                      ↓
    ┌──────────────────────┐
    │   最佳用户体验        │
    │ - 准确提取信息        │
    │ - 自然对话体验        │
    │ - 快速响应            │
    │ - 可控可调试          │
    └──────────────────────┘
```

---

## 前端集成

**文件**：`OpenMAIC/app/teaching-design/intent/page.tsx`

```typescript
const handleSendMessage = async (message: string) => {
  // 1. 添加用户消息到历史
  const nextMessages = [...messages, teacherMessage];
  
  // 2. 调用 API
  const response = await fetch("/api/teaching-chat", {
    method: "POST",
    body: JSON.stringify({ messages: toChatMessages(nextMessages) }),
  });
  
  const json = await response.json();
  
  // 3. 添加 AI 回复
  const updatedMessages = [
    ...nextMessages,
    {
      role: "ai",
      content: json.reply,
      meta: json.ready ? "可开始生成" : "继续理解",
    },
  ];
  
  // 4. 更新状态
  setMessages(updatedMessages);
  setSession(json.session);
  
  // 5. 如果 ready，显示"生成教学设计"按钮
  if (json.ready) {
    // 按钮变为可点击状态
  }
};
```

---

## 状态管理

### Session 状态

```typescript
interface TeachingSession {
  topic?: string;          // 课题
  subject?: string;        // 学科
  gradeLevel?: string;     // 年级
  duration?: number;       // 课时（分钟）
  objectives?: string[];   // 教学目标（可选）
  additionalNotes?: string; // 特殊要求（可选）
  useKnowledgeBase?: boolean; // 是否使用知识库
  hasMaterials?: boolean;  // 是否有参考资料
  ready: boolean;          // 是否可以开始生成
}
```

### 状态流转

```
初始状态
{ ready: false }
  ↓
用户输入 "语文课件"
{ subject: "语文", ready: false }
  ↓
用户输入 "荷塘月色"
{ subject: "语文", topic: "《荷塘月色》", ready: false }
  ↓
用户输入 "五年级"
{ subject: "语文", topic: "《荷塘月色》", gradeLevel: "五年级", ready: false }
  ↓
用户输入 "45分钟"
{ subject: "语文", topic: "《荷塘月色》", gradeLevel: "五年级", duration: 45, ready: false }
  ↓
AI 询问是否开始
{ ..., ready: false }
  ↓
用户确认 "可以"
{ ..., ready: true } ← 触发生成按钮
```

---

## 总结

### 实现策略

| 组件 | 实现方式 | 作用 |
|------|---------|------|
| **信息提取** | 规则（正则+关键词） | 快速准确提取结构化信息 |
| **对话生成** | AI（LLM） | 生成自然友好的回复 |
| **状态管理** | 前端 React State | 跟踪收集进度 |
| **完整性检查** | 硬编码逻辑 | 判断是否可以开始生成 |

### 核心优势

1. **准确性**：规则提取保证关键信息不会丢失
2. **自然性**：AI 生成保证对话流畅友好
3. **可控性**：混合策略便于调试和优化
4. **效率**：规则提取快速，AI 只用于生成回复

### 可扩展性

如果需要添加新字段（如"教学方法"），只需：

1. 在 `intent-message-to-slots.ts` 添加提取规则
2. 在 `SYSTEM_PROMPT` 中添加字段说明
3. 在 `TeachingSession` 接口中添加字段
4. 在 `isSessionComplete` 中添加检查逻辑

**不是纯硬编码，也不是纯 AI，而是两者的最佳结合！** 🎯
