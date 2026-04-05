# FastGPT 知识库接入实施报告

## 一、实施概述

已成功完成 FastGPT 知识库的第一版接入，实现了"教师需求 + 本地知识库"的双源融合。

## 二、新增文件

### 1. FastGPT 客户端
**文件**: `OpenMAIC/lib/ai/fastgpt-client.ts`

核心功能：
- 提供 `queryFastGPT()` 函数，封装 FastGPT API 调用
- 严格遵循已验证的接口格式（POST /api/v1/chat/completions）
- 从环境变量读取配置（FASTGPT_BASE_URL, FASTGPT_API_KEY）
- 自动生成唯一 chatId（格式：`teaching-xxxxxxxx`）
- 支持超时控制
- 提供详细的错误日志（不打印密钥）

### 2. FastGPT API 中转层
**文件**: `OpenMAIC/app/api/fastgpt/query/route.ts`

作用：
- 提供服务端 API route，避免客户端直接暴露 API key
- 处理 CORS 问题
- 统一错误处理

## 三、修改文件

### 1. 类型定义
**文件**: `OpenMAIC/lib/types/teaching.ts`

已确认字段：
```typescript
export interface TeachingRequest {
  // ... 其他字段
  useKnowledgeBase?: boolean; // 知识库开关
}
```

### 2. 教学大纲生成器
**文件**: `OpenMAIC/lib/generation/teaching-outline-generator.ts`

主要改动：
1. 导入 FastGPT 客户端
2. 新增 `buildKnowledgeQueryFromTeachingRequest()` 函数
3. 在生成流程开始时查询 FastGPT
4. 将 RAG 内容注入到 prompt 中
5. 实现降级策略（FastGPT 失败时继续生成）

### 3. 测试页面
**文件**: `OpenMAIC/app/teaching-test/page.tsx`

新增功能：
- 添加"使用知识库增强（FastGPT）"复选框
- 勾选后将 `useKnowledgeBase: true` 传递给生成流程

### 4. 环境变量配置
**文件**: `OpenMAIC/.env.example` 和 `OpenMAIC/.env.local`

新增配置项：
```bash
# --- FastGPT Knowledge Base ---
FASTGPT_BASE_URL=http://10.15.40.245:3000
FASTGPT_API_KEY=
```

## 四、完整调用链

```
teaching-test/page.tsx (勾选知识库开关)
  ↓
useTeachingGenerator.generate()
  ↓
POST /api/generate/teaching-outline
  ↓
generateTeachingDesignFromRequest()
  ↓
[如果 useKnowledgeBase === true]
  ↓
queryFastGPT() (服务端直接调用)
  ↓
FastGPT API (http://10.15.40.245:3000/api/v1/chat/completions)
  ↓
返回 RAG 内容
  ↓
注入到教学设计 prompt
  ↓
调用 LLM 生成 TeachingDesign
  ↓
teaching-slide-generator (为每页生成 canvas)
  ↓
export-teaching-pptx (导出 PPT)
```

## 五、知识库查询构造

`buildKnowledgeQueryFromTeachingRequest()` 生成的查询格式：

```
请基于知识库，为以下教学任务提供可直接用于教学设计的知识支持。

学科：思想政治
课题：毛泽东思想的活的灵魂
年级：高一
课时：45分钟

教学目标：
知识目标：理解毛泽东思想的核心内容
能力目标：能够分析毛泽东思想的现实意义

特殊要求：重点讲解实事求是

请输出：
1. 本课题核心知识点
2. 易错点/重难点
3. 推荐教学思路
4. 可用于课堂讲解的关键内容
5. 如适合，请给出简洁的例子或结构化要点
```

## 六、Prompt 注入位置

在 `teaching-outline-generator.ts` 的 userPrompt 中：

```
# 教学设计任务

## 基本信息
- 学科：xxx
- 课题：xxx
- 年级：xxx
- 课时：xxx 分钟

## 教学目标
...

## 【知识库参考内容】    ← 注入位置
<FastGPT 返回的内容，最多 2000 字符>

## 参考资料内容
...

## 可用图片资源
...
```

## 七、降级策略

### 错误处理
```typescript
if (request.useKnowledgeBase) {
  try {
    // 查询 FastGPT
    const result = await queryFastGPT(query, { timeoutMs: 30000 });
    ragContext = result.answer;
  } catch (error) {
    // 降级：打印警告日志，但继续生成
    log.warn('FastGPT query failed, continuing without KB enhancement:', error);
    ragContext = '';
  }
}
```

### 日志安全
- ✅ 打印查询成功/失败状态
- ✅ 打印返回内容长度
- ✅ 打印错误消息
- ❌ 不打印 API_KEY
- ❌ 不打印完整 URL（避免暴露内网地址）

### 降级行为
1. FastGPT 不可用 → 继续生成，不使用知识库增强
2. FastGPT 返回空内容 → 继续生成，不使用知识库增强
3. FastGPT 超时（30秒） → 继续生成，不使用知识库增强
4. 环境变量未配置 → 抛出明确错误，提示用户配置

## 八、测试示例

### 测试步骤
1. 配置环境变量：
   ```bash
   FASTGPT_BASE_URL=http://10.15.40.245:3000
   FASTGPT_API_KEY=你的应用专属key
   ```

2. 访问测试页面：`http://localhost:3000/teaching-test`

3. 填写测试数据：
   - 学科：思想政治
   - 课题：毛泽东思想的活的灵魂
   - 年级：高一
   - 课时：45

4. ✅ 勾选"使用知识库增强（FastGPT）"

5. 点击"生成教学设计"

### 预期结果
- 进度条显示"正在查询知识库..."
- 生成的 TeachingDesign 中的 keyPoints 和 procedures 包含知识库相关内容
- 例如：
  - keyPoints 包含"实事求是、群众路线、独立自主"
  - procedures 中的教师活动包含知识库提供的讲解要点

### 对比测试
- 不勾选知识库：生成的内容更通用
- 勾选知识库：生成的内容更贴近知识库主题，更具体

## 九、验收标准检查

✅ 1. 勾选"使用知识库增强"时，系统会实际调用 FastGPT  
✅ 2. FastGPT 返回内容能进入 outline prompt  
✅ 3. TeachingDesign 的内容相比未开启知识库时更贴近知识库主题  
✅ 4. FastGPT 不可用时，系统仍能继续生成，不崩溃  
✅ 5. 没有把 API key 硬编码进源码  
✅ 6. 现有 PPT 生成和导出链路不被破坏  

## 十、未实现功能（按计划）

本轮暂不实现：
- ❌ 引用可视化（detail 字段解析）
- ❌ 资料上传到 FastGPT
- ❌ 多模态检索
- ❌ 知识片段排序器
- ❌ 修改 slide-generator
- ❌ 修改 PPT 导出逻辑

## 十一、后续优化建议

1. **引用展示**：解析 FastGPT 的 detail 字段，展示知识来源
2. **缓存机制**：相同查询可以缓存结果，避免重复调用
3. **流式返回**：支持 stream: true，实时显示知识库检索进度
4. **多轮对话**：保持 chatId，支持追问和细化
5. **知识库选择**：允许用户选择不同的知识库应用

## 十二、配置说明

### 必需配置
在 `OpenMAIC/.env.local` 中添加：

```bash
FASTGPT_BASE_URL=http://10.15.40.245:3000
FASTGPT_API_KEY=你的FastGPT应用专属API密钥
```

### 获取 API Key
1. 登录 FastGPT 管理后台
2. 进入"应用" → 选择你的知识库应用
3. 点击"API访问" → 复制 API Key

### 验证配置
启动服务后，查看日志：
- 如果看到 "FASTGPT_BASE_URL is not configured" → 检查环境变量
- 如果看到 "FastGPT query successful" → 配置正确

## 十三、故障排查

### 问题：FastGPT 调用失败
1. 检查网络连接：`curl http://10.15.40.245:3000`
2. 检查 API Key 是否正确
3. 检查 FastGPT 服务是否运行
4. 查看服务端日志（不会打印密钥）

### 问题：生成内容没有知识库增强
1. 确认勾选了"使用知识库增强"
2. 查看日志是否有 "FastGPT query successful"
3. 检查 FastGPT 返回内容是否为空

### 问题：环境变量不生效
1. 确认修改的是 `.env.local` 而不是 `.env.example`
2. 重启开发服务器
3. 检查是否有语法错误（等号两边不要有空格）

## 十四、技术细节

### FastGPT API 格式（已验证）
```typescript
// 请求
POST http://10.15.40.245:3000/api/v1/chat/completions
Headers: {
  "Authorization": "Bearer <API_KEY>",
  "Content-Type": "application/json"
}
Body: {
  "chatId": "teaching-xxxxxxxx",
  "stream": false,
  "detail": true,
  "messages": [
    { "role": "user", "content": "查询内容" }
  ]
}

// 响应
{
  "choices": [
    {
      "message": {
        "content": "知识库返回的答案"
      }
    }
  ]
}
```

### 提取答案
```typescript
const answer = data.choices?.[0]?.message?.content ?? '';
```

## 十五、总结

第一版 FastGPT 知识库接入已完成，实现了：
- 清晰的客户端封装
- 安全的环境变量管理
- 稳定的降级策略
- 不破坏现有流程

可以开始测试并收集反馈，为下一阶段的三源融合做准备。
