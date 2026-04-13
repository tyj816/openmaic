# 对话式教学需求收集 Agent 实施指南

## 一、概述

实现了一个对话式 Agent，通过自然语言对话逐步收集教学需求，最终转换为标准的 `TeachingRequest` 并调用现有生成系统。

## 二、核心特性

### ✅ 已实现功能

1. **渐进式信息收集**
   - 不一次问完所有问题
   - 每次只问 1-2 个相关问题
   - 根据用户回答自然过渡

2. **智能信息提取**
   - 从自然语言中提取结构化信息
   - 支持关键词匹配和 LLM 提取两种方式
   - 自动识别课题、学科、年级、课时

3. **友好的对话体验**
   - 语气像教学助理
   - 简洁专业不啰嗦
   - 实时显示收集进度

4. **无缝集成现有系统**
   - 输出标准 `TeachingRequest`
   - 不修改三源融合核心
   - 复用现有生成链路

## 三、新增文件

### 1. `lib/agent/teaching-intent-agent.ts`

**核心函数**：

```typescript
export async function handleTeachingConversation(
  messages: ChatMessage[],
  model: LanguageModel,
): Promise<AgentResponse>
```

**功能**：
- 接收对话历史
- 提取当前 session 状态
- 判断信息是否完整
- 生成下一个问题或返回 TeachingRequest

**数据结构**：

```typescript
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface TeachingSession {
  topic?: string;
  subject?: string;
  gradeLevel?: string;
  duration?: number;
  objectives?: string[];
  additionalNotes?: string;
  useKnowledgeBase?: boolean;
  hasMaterials?: boolean;
  ready: boolean;
}

interface AgentResponse {
  reply: string;
  ready: boolean;
  teachingRequest?: TeachingRequest;
  session: TeachingSession;
}
```

**两种实现方式**：

1. **基础版**（`handleTeachingConversation`）
   - 使用关键词匹配提取信息
   - 使用 LLM 生成对话回复
   - 适合快速原型

2. **增强版**（`handleTeachingConversationStructured`）
   - 使用 LLM 提取结构化信息
   - 更准确但稍慢
   - 适合生产环境

### 2. `app/teaching-chat/page.tsx`

**对话式 UI 页面**：
- 聊天界面
- 实时显示收集进度
- 自动触发生成
- 导出 PPT

**特性**：
- 自动滚动到最新消息
- 显示思考状态
- 显示生成进度
- 一键导出

## 四、工作流程

```
用户输入
  ↓
handleTeachingConversation(messages, model)
  ↓
extractSessionFromHistory(messages)
  ↓ 提取：topic, subject, gradeLevel, duration
  ↓
isSessionComplete(session)?
  ↓
  NO → 生成追问 → 返回 { reply, ready: false }
  ↓
  YES → 用户确认？
    ↓
    NO → 询问是否开始
    ↓
    YES → sessionToTeachingRequest(session)
      ↓
      返回 { reply, ready: true, teachingRequest }
        ↓
        调用 generator.generate(teachingRequest, options)
          ↓
          生成 TeachingDesign
            ↓
            导出 PPT
```

## 五、对话示例

### 示例 1：完整对话流程

```
助手：你好！我是教学设计助手。我可以帮你生成教学设计和课件。请告诉我你想做什么课程？

用户：我想做一个关于二次函数的课件

助手：好的！请问这是哪个学科的课程呢？是数学吗？

用户：是的，数学

助手：明白了。这节课是给哪个年级的学生上的呢？

用户：初三学生

助手：好的。请问这节课的时长是多少分钟呢？通常是 45 分钟还是其他时长？

用户：45 分钟

助手：太好了！让我确认一下您的需求：
- 课题：二次函数的图像与性质
- 学科：数学
- 年级：初三
- 课时：45 分钟

请问您有什么特殊的教学要求吗？比如重点讲解某个知识点，或者需要增加互动环节？如果没有，我们可以直接开始生成教学设计。

用户：没有，可以开始

助手：好的！我现在开始为您生成教学设计。请稍候...

[系统开始生成]
```

### 示例 2：一次提供多个信息

```
助手：你好！我是教学设计助手。请告诉我你想做什么课程？

用户：我想做一个初三数学课，讲二次函数，45分钟

助手：太好了！您一次提供了很多信息，让我确认一下：
- 课题：二次函数
- 学科：数学
- 年级：初三
- 课时：45 分钟

信息已经完整了。请问您有什么特殊的教学要求吗？如果没有，我们可以直接开始生成教学设计。

用户：开始吧

助手：好的！我现在开始为您生成教学设计。请稍候...
```

## 六、技术实现细节

### 1. 信息提取策略

**关键词匹配**（基础版）：
```typescript
// 学科识别
const subjects = ['数学', '物理', '化学', '生物', '语文', '英语', ...];
for (const subject of subjects) {
  if (fullText.includes(subject)) {
    session.subject = subject;
    break;
  }
}

// 年级识别
const gradePatterns = [
  /([小初高][\u4e00-\u9fa5]{0,2}[一二三四五六七八九十1-9])/g,
  /(大学本科|研究生|博士)/g,
];

// 课时识别
const durationMatch = fullText.match(/(\d+)\s*分钟/);
```

**LLM 提取**（增强版）：
```typescript
const extractionPrompt = `分析对话历史，提取教学需求信息。

对话历史：
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

请提取以下信息（如果对话中没有提到，返回 null）：
1. topic（课题）
2. subject（学科）
3. gradeLevel（年级）
4. duration（课时，数字）
...

返回 JSON 格式。`;
```

### 2. 对话生成策略

**System Prompt**：
- 定义 Agent 角色和任务
- 列出需要收集的信息
- 规定对话规则和风格
- 提供示例对话

**Context 增强**：
```typescript
const sessionSummary = `
当前已收集的信息：
- 课题：${session.topic || '未收集'}
- 学科：${session.subject || '未收集'}
- 年级：${session.gradeLevel || '未收集'}
- 课时：${session.duration ? `${session.duration}分钟` : '未收集'}

${isSessionComplete(session) ? '✓ 必填信息已完整' : '✗ 必填信息不完整'}
`;
```

### 3. 状态管理

**Session 状态**：
- 从对话历史中提取
- 每次对话后更新
- 用于判断是否完整

**Ready 判断**：
```typescript
function isSessionComplete(session: TeachingSession): boolean {
  return !!(
    session.topic &&
    session.subject &&
    session.gradeLevel &&
    session.duration
  );
}

// 用户确认关键词
const confirmKeywords = ['开始', '生成', '好的', '可以', '确认', 'ok', 'yes'];
const isConfirming = confirmKeywords.some(kw => 
  lastUserMessage.content.toLowerCase().includes(kw)
);

// Ready = 信息完整 + 用户确认
if (isSessionComplete(session) && isConfirming) {
  return { ready: true, teachingRequest: ... };
}
```

## 七、集成现有系统

### 无缝对接

```typescript
// 1. Agent 收集信息
const response = await handleTeachingConversation(messages, model);

// 2. 转换为 TeachingRequest
if (response.ready && response.teachingRequest) {
  // 3. 调用现有生成系统
  const design = await generator.generate(response.teachingRequest, {
    model,
    materials: [],
    imageMapping: {},
    ...
  });
  
  // 4. 导出 PPT
  if (design) {
    exporter.exportPPTX(design);
  }
}
```

### 不修改核心

- ✅ 不修改 `TeachingRequest` 接口
- ✅ 不修改 `generateTeachingDesignFromRequest`
- ✅ 不修改三源融合逻辑
- ✅ 不修改 PPT 生成链路

## 八、优势与风险

### ✅ 优势

1. **用户体验提升**
   - 降低使用门槛
   - 自然语言交互
   - 渐进式引导

2. **灵活性**
   - 可以一次提供多个信息
   - 可以随时补充修改
   - 支持自然语言表达

3. **可扩展性**
   - 易于添加新字段
   - 易于调整对话策略
   - 易于集成其他功能

4. **安全性**
   - 不侵入现有系统
   - 输出标准接口
   - 完全向后兼容

### ⚠️ 风险与缓解

1. **LLM 输出不稳定**
   - 风险：JSON 格式错误、信息提取不准确
   - 缓解：使用关键词匹配作为备选、添加 schema 验证

2. **对话成本**
   - 风险：每次追问都调用 LLM
   - 缓解：使用较小的模型（如 GLM-4.7）、优化 prompt 长度

3. **信息提取准确性**
   - 风险：LLM 可能误判信息完整性
   - 缓解：明确的判断标准、用户确认机制

4. **用户体验**
   - 风险：有些用户可能更喜欢表单
   - 缓解：保留表单模式、提供模式切换

## 九、使用方法

### 1. 访问对话页面

```
http://localhost:3000/teaching-chat
```

### 2. 开始对话

直接输入你的需求，例如：
- "我想做一个数学课件"
- "初三数学，二次函数，45分钟"
- "帮我生成一个物理课的教学设计"

### 3. 回答问题

根据 Agent 的提问，逐步提供信息。

### 4. 确认生成

当信息收集完整后，确认开始生成。

### 5. 导出 PPT

生成完成后，点击"导出 PPT"按钮。

## 十、配置说明

### 模型配置

默认使用 GLM-4.7，可以在代码中修改：

```typescript
const modelConfig = {
  providerId: 'glm' as const,
  modelId: 'glm-4.7',
  apiKey: process.env.NEXT_PUBLIC_GLM_API_KEY,
  baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
  providerType: 'openai' as const,
  requiresApiKey: true,
};
```

### 环境变量

在 `.env.local` 中配置：

```bash
NEXT_PUBLIC_GLM_API_KEY=your_api_key_here
```

## 十一、扩展方向

### 短期

- [ ] 支持上传参考资料（在对话中）
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

## 十二、测试验证

### 快速测试

1. 启动开发服务器：
   ```bash
   cd OpenMAIC
   npm run dev
   ```

2. 访问对话页面：
   ```
   http://localhost:3000/teaching-chat
   ```

3. 输入测试对话：
   ```
   我想做一个初三数学课，讲二次函数，45分钟
   ```

4. 确认生成：
   ```
   开始生成
   ```

5. 验证结果：
   - 检查是否生成 TeachingDesign
   - 检查课件页数和内容
   - 导出 PPT 验证

### 完整测试场景

参考《三源融合闭环实施报告》中的测试方案，使用对话方式替代表单输入。

## 十三、故障排查

### 常见问题

1. **Agent 不回复**
   - 检查 API Key 是否配置
   - 检查网络连接
   - 查看浏览器控制台日志

2. **信息提取不准确**
   - 使用更明确的表达
   - 分多次提供信息
   - 使用增强版提取函数

3. **生成失败**
   - 检查 TeachingRequest 是否完整
   - 查看服务器日志
   - 验证模型配置

## 十四、总结

对话式教学需求收集 Agent 已成功实现：

✅ 渐进式信息收集  
✅ 智能信息提取  
✅ 友好对话体验  
✅ 无缝集成现有系统  
✅ 不修改核心结构  

这个 Agent 为教师提供了更自然、更友好的交互方式，同时保持了系统的稳定性和可扩展性。

---

更新时间：2024
版本：v1.0
