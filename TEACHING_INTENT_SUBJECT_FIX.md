# 教学意图理解 - 学科识别修复

## 问题描述

用户在意图理解页面与 AI 对话时，即使 AI 已经识别出学科（如"操作系统"），但前端仍然不停追问学科信息，造成糟糕的用户体验。

从日志可以看到：
```
[INFO] [TeachingIntentAgent] LLM reply: 好的，信息已经齐全了。让我确认一下您的需求：
- **学科**：操作系统
- **课题**：进程调度算法
...

[WARN] [TeachingIntentAgent] LLM said READY but session incomplete: 
{"ready":false,"topic":"...","gradeLevel":"二年级","duration":45}
```

注意 session 中缺少 `subject` 字段。

## 根本原因

1. **关键词匹配局限**：原有的 `extractSessionFromHistory` 使用关键词匹配方法，`SUBJECT_KEYWORDS` 列表中只包含常见的中小学学科，没有"操作系统"等大学计算机专业课程。

2. **LLM 提取问题**：虽然对话中的 LLM 识别出了学科，但提取 session 的逻辑没有使用 LLM，而是依赖关键词匹配。

## 解决方案

### 1. 使用 LLM 提取 Session 信息

创建了新函数 `extractSessionFromHistoryWithLLM`，使用 LLM 从对话历史中提取结构化信息：

```typescript
async function extractSessionFromHistoryWithLLM(
  messages: ChatMessage[],
  model: LanguageModel
): Promise<TeachingSession> {
  const conversationText = messages
    .map(m => `${m.role === 'user' ? '教师' : '助手'}: ${m.content}`)
    .join('\n');

  const extractionPrompt = `分析以下对话，提取教学需求信息...
  
  请提取以下信息：
  - topic: 课题/主题
  - subject: 学科（任何学科都可以）
  - gradeLevel: 年级
  - duration: 课时时长
  
  请直接返回 JSON 格式，不要使用 markdown 代码块`;

  const result = await generateText({
    model,
    messages: [
      { role: 'system', content: '你是一个信息提取助手...' },
      { role: 'user', content: extractionPrompt }
    ],
    maxRetries: 2,
  });

  // 清理 markdown 代码块
  let jsonText = result.text.trim();
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  }

  const extracted = JSON.parse(jsonText.trim());
  return { ...extracted, ready: false };
}
```

### 2. 增强关键词列表（作为回退方案）

在 `intent-message-to-slots.ts` 中扩展了 `SUBJECT_KEYWORDS`，添加计算机相关学科：

```typescript
const SUBJECT_KEYWORDS = [
  // 原有学科...
  "语文", "数学", "英语", "物理", "化学", ...
  
  // 新增：计算机相关学科
  "操作系统",
  "数据结构",
  "算法",
  "计算机网络",
  "数据库",
  "软件工程",
  "编译原理",
  "计算机组成原理",
  "人工智能",
  "机器学习",
  "深度学习",
  "计算机图形学",
  "计算机科学",
  "程序设计",
  "编程",
];
```

### 3. 修复 API 调用问题

- 移除了不支持的参数 `temperature` 和 `maxTokens`
- 使用正确的 message 格式（system + user）
- 添加了 markdown 代码块清理逻辑

## 修改的文件

1. `OpenMAIC/lib/agent/teaching-intent-agent.ts`
   - 新增 `extractSessionFromHistoryWithLLM` 函数
   - 重命名原函数为 `extractSessionFromHistoryKeyword`
   - 修复 `generateText` 调用参数
   - 添加 JSON 清理逻辑

2. `OpenMAIC/lib/mappers/intent-message-to-slots.ts`
   - 扩展 `SUBJECT_KEYWORDS` 列表

## 效果

现在系统能够：
- 识别任何学科，不限于预定义列表
- 从对话上下文中智能提取学科信息
- 即使 LLM 提取失败，也能通过扩展的关键词列表识别常见计算机学科
- 避免重复询问已识别的字段

## 测试建议

测试以下场景：
1. 常见学科（数学、物理等）
2. 计算机专业课程（操作系统、数据结构等）
3. 非常见学科（如"量子力学"、"微积分"等）
4. 用户简短回答（如"是的"、"操作系统"）

## 注意事项

- LLM 提取是主要方法，关键词匹配是回退方案
- 如果 LLM 提取失败，会自动降级到关键词匹配
- 建议定期更新 `SUBJECT_KEYWORDS` 列表以覆盖更多学科
