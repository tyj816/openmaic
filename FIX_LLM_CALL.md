# 🔧 修复 LLM 调用问题

## 🐛 问题描述

点击"生成教学设计"按钮后，进度条一直卡在"正在生成教学设计..."，没有调用模型的日志输出。

## 🔍 根本原因

### 问题 1：客户端/服务端模块冲突

尝试在客户端组件中使用 `callLLM` 函数，但 `callLLM` 导入了 `thinking-context.ts`，而 `thinking-context.ts` 使用了 Node.js 的 `async_hooks` 模块，无法在浏览器中运行。

**错误信息：**
```
the chunking context (unknown) does not support external modules (request: node:async_hooks)
```

**导入链：**
```
teaching-test/page.tsx (客户端组件)
  → use-teaching-generator.ts
    → callLLM (from lib/ai/llm.ts)
      → thinking-context.ts
        → node:async_hooks ❌ (服务端专用)
```

### 问题 2：缺少日志和错误处理

原始代码直接使用 `generateText` 但缺少：
- 详细的日志输出
- 错误处理
- 重试机制

## ✅ 解决方案

在客户端组件中直接使用 `generateText`，但添加完善的日志和错误处理。

### 修复后的代码

```typescript
import { generateText } from 'ai';

const aiCall: AICallFn = async (system, user, visionImages) => {
  const messages: any[] = [{ role: 'user', content: user }];

  if (visionImages && visionImages.length > 0) {
    messages[0].content = [
      { type: 'text', text: user },
      ...visionImages.map((img) => ({
        type: 'image',
        image: img.src,
      })),
    ];
  }

  log.info('Calling LLM...');
  log.debug('System prompt length:', system?.length || 0);
  log.debug('User prompt length:', user?.length || 0);

  try {
    const result = await generateText({
      model: options.model,
      system,
      messages,
      maxRetries: 3, // 添加重试机制
    });

    log.info('LLM call successful, response length:', result.text.length);
    return result.text;
  } catch (error) {
    log.error('LLM call failed:', error);
    throw error;
  }
};
```

## 📝 修改的文件

### `lib/hooks/use-teaching-generator.ts`

**修改内容：**

1. 导入 `generateText`：
   ```typescript
   import { generateText } from 'ai';
   ```

2. 移除 `callLLM` 导入（避免客户端/服务端冲突）

3. 添加详细的日志：
   - 调用开始
   - Prompt 长度
   - 响应长度
   - 错误信息

4. 添加重试机制：
   ```typescript
   maxRetries: 3
   ```

## 🎯 为什么不能使用 callLLM？

### callLLM 的依赖链

```
callLLM (lib/ai/llm.ts)
  ↓
thinkingContext (lib/ai/thinking-context.ts)
  ↓
node:async_hooks (Node.js 专用模块)
  ↓
❌ 无法在浏览器中运行
```

### 解决方案对比

| 方案 | 优点 | 缺点 | 是否可行 |
|------|------|------|----------|
| 使用 callLLM | 统一的 API、完整功能 | 依赖服务端模块 | ❌ 不可行 |
| 直接使用 generateText | 可在客户端运行 | 需要手动添加日志 | ✅ 可行 |
| 创建 API 路由 | 完全服务端执行 | 需要重构代码 | ✅ 可行（未来） |

### 当前方案：直接使用 generateText

优点：
- ✅ 可以在客户端组件中使用
- ✅ 添加了详细的日志输出
- ✅ 添加了错误处理
- ✅ 添加了重试机制
- ✅ 最小化修改，快速解决问题

缺点：
- ⚠️ 不能使用 thinking-context 的高级功能
- ⚠️ 日志不如 callLLM 完整

## 🧪 测试步骤

1. 刷新浏览器页面（清除缓存）

2. 打开浏览器控制台（F12）

3. 访问测试页面：
   ```
   http://localhost:3000/teaching-test
   ```

4. 点击"生成教学设计"按钮

5. 观察控制台输出，应该能看到：
   ```
   TeachingGenerator: Calling LLM...
   TeachingGenerator: System prompt length: 1234
   TeachingGenerator: User prompt length: 567
   TeachingGenerator: LLM call successful, response length: 2345
   TeachingGenerator: Stage 1: Generating teaching design outline
   ...
   ```

6. 观察进度条应该正常更新

7. 生成完成后应该显示教学设计内容

## 🔍 调试技巧

### 查看网络请求

在浏览器开发者工具的 Network 标签中：
- 筛选 XHR/Fetch 请求
- 查找发送到 `https://open.bigmodel.cn/api/paas/v4/chat/completions` 的请求
- 检查请求头、请求体、响应

### 查看控制台日志

在 Console 标签中：
- 筛选 `TeachingGenerator` 日志
- 查看 `Calling LLM...` 日志
- 查看 `LLM call successful` 日志
- 查看错误信息（红色）

### 常见问题

1. **API Key 错误**
   ```
   Error: Unauthorized
   ```
   解决：检查 API Key 是否正确

2. **网络错误**
   ```
   Error: Failed to fetch
   ```
   解决：检查网络连接，确保可以访问 `https://open.bigmodel.cn`

3. **模型不存在**
   ```
   Error: Model not found
   ```
   解决：检查模型 ID 是否正确（应该是 `glm-5`）

4. **超时**
   ```
   Error: Request timeout
   ```
   解决：GLM-5 响应可能较慢，等待更长时间

## 💡 未来改进

### 方案 1：创建服务端 API 路由

将生成逻辑移到服务端：

```typescript
// app/api/teaching/generate/route.ts
export async function POST(req: Request) {
  const { request } = await req.json();
  
  // 在服务端使用 callLLM
  const result = await callLLM(...);
  
  return Response.json(result);
}
```

优点：
- ✅ 可以使用完整的 callLLM 功能
- ✅ API Key 不暴露在客户端
- ✅ 更好的安全性

缺点：
- ⚠️ 需要重构代码
- ⚠️ 增加复杂度

### 方案 2：使用 Server Actions

使用 Next.js 的 Server Actions：

```typescript
'use server'

export async function generateTeachingDesign(request: TeachingRequest) {
  // 在服务端执行
  const result = await callLLM(...);
  return result;
}
```

优点：
- ✅ 简单易用
- ✅ 类型安全
- ✅ 可以使用服务端模块

## 📚 相关文档

- **[FIX_CLIENT_SERVER_ISSUE.md](./FIX_CLIENT_SERVER_ISSUE.md)** - 之前的客户端/服务端问题
- **[SWITCH_TO_GLM5.md](./SWITCH_TO_GLM5.md)** - GLM-5 模型配置
- **[QUICK_START.md](./QUICK_START.md)** - 快速启动指南

## 🎉 预期结果

修复后，应该能看到：

1. ✅ 页面正常加载，没有编译错误
2. ✅ 控制台有详细的日志输出
3. ✅ 进度条正常更新
4. ✅ 网络请求发送到 GLM API
5. ✅ 成功生成教学设计
6. ✅ 显示生成的内容

---

**当前状态**：✅ 已修复，使用 `generateText` + 详细日志
