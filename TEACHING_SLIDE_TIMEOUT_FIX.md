# 教学幻灯片生成超时问题修复

## 问题描述

在生成教学幻灯片时，第二张幻灯片"作者简介——朱自清"在 18.8 分钟后报错：

```
AI_RetryError: Failed after 4 attempts. Last error: Cannot connect to API: Headers Timeout Error
```

第一张幻灯片"荷塘月色"成功生成，耗时 2.3 分钟。

## 根本原因

Next.js API 路由默认超时时间较短（通常 10-60 秒），而教学幻灯片生成涉及复杂的 AI 调用，可能需要数分钟时间。以下 API 路由缺少 `maxDuration` 配置：

1. `/api/generate/teaching-slide` - 单个幻灯片生成
2. `/api/regenerate-teaching` - 教学设计再生成
3. `/api/generate/teaching-outline` - 教学大纲生成
4. `/api/teaching-chat` - 教学对话代理

## 修复方案

### 1. 增加 API 路由超时配置

为所有教学相关的 API 路由添加 `maxDuration` 导出：

#### teaching-slide/route.ts
```typescript
// Allow up to 5 minutes for complex slide generation
export const maxDuration = 300;
```

#### regenerate-teaching/route.ts
```typescript
// Allow up to 5 minutes for regeneration with canvas
export const maxDuration = 300;
```

#### teaching-outline/route.ts
```typescript
// Allow up to 5 minutes for outline generation with RAG
export const maxDuration = 300;
```

#### teaching-chat/route.ts
```typescript
// Allow up to 2 minutes for chat with agent
export const maxDuration = 120;
```

### 2. 优化 AI 调用配置

在 `teaching-slide/route.ts` 中增强 `generateText` 配置：

```typescript
const result = await generateText({
  model,
  system,
  messages,
  maxRetries: 4,        // 从 3 增加到 4
  maxTokens: 8192,      // 明确设置最大 token 数
});
```

## 技术细节

### Next.js maxDuration

Next.js 的 `maxDuration` 配置用于设置 API 路由的最大执行时间（秒）：

- 默认值：10 秒（Hobby 计划）或 60 秒（Pro 计划）
- 最大值：300 秒（5 分钟）
- 适用场景：长时间运行的 AI 生成、视频处理、大文件上传等

### 为什么第一张成功，第二张失败？

1. **累积延迟**：第一张幻灯片用了 2.3 分钟，第二张开始时已经接近超时边界
2. **内容复杂度**：第二张"作者简介"可能包含更多结构化信息，需要更长处理时间
3. **API 限流**：连续调用可能触发 API 提供商的速率限制

## 参考配置

其他已正确配置的 API 路由：

- `/api/generate/video` - 300 秒（视频生成）
- `/api/generate/scene-outlines-stream` - 300 秒（场景大纲流式生成）
- `/api/generate/scene-content` - 300 秒（场景内容生成）
- `/api/generate/agent-profiles` - 120 秒（代理配置生成）
- `/api/chat` - 60 秒（聊天流式响应）

## 验证方法

1. 重启开发服务器
2. 尝试生成包含多张幻灯片的教学设计
3. 观察日志，确认每张幻灯片都能成功生成
4. 检查是否还有 "Headers Timeout Error"

## 预期效果

- 单张幻灯片生成最多可用 5 分钟
- 教学大纲生成（包含多张幻灯片）最多可用 5 分钟
- 再生成操作最多可用 5 分钟
- 教学对话最多可用 2 分钟

这应该足够处理复杂的教学内容生成场景。
