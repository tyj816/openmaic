# 🔧 修复客户端/服务端模块问题

## 问题描述

访问 `/teaching-test` 页面时报错：
```
Module not found: Can't resolve 'fs'
./lib/generation/prompts/loader.ts
```

## 原因分析

- `prompts/loader.ts` 使用了 Node.js 的 `fs` 模块（服务端专用）
- `teaching-slide-generator.ts` 调用了 `buildPrompt` 函数
- `useTeachingGenerator` hook 是客户端组件（`'use client'`）
- Next.js 不允许客户端组件引用服务端模块

## 解决方案

将 prompt 构建逻辑从文件加载改为硬编码，避免依赖 `fs` 模块。

### 修改的文件

1. **`lib/generation/teaching-outline-generator.ts`**
   - 移除 `import { buildPrompt, PROMPT_IDS } from './prompts'`
   - 直接在代码中使用硬编码的 prompt

2. **`lib/generation/teaching-slide-generator.ts`**
   - 移除 `import { buildPrompt, PROMPT_IDS } from './prompts'`
   - 直接在代码中使用硬编码的 prompt

### 修改详情

#### teaching-slide-generator.ts

**之前：**
```typescript
const prompts = buildPrompt(PROMPT_IDS.SLIDE_CONTENT, {
  title: teachingSlide.title,
  // ...
});

const response = await aiCall(prompts.system, prompts.user, visionImages);
```

**之后：**
```typescript
const systemPrompt = `你是一位专业的课件设计师。
你的任务是根据页面标题和要点，生成精美的 PPT 页面内容。
// ... 完整的 prompt 内容
`;

const userPrompt = `# 页面设计任务
// ... 完整的用户 prompt
`;

const response = await aiCall(systemPrompt, userPrompt, visionImages);
```

## 测试步骤

1. 确保开发服务器正在运行：
   ```bash
   cd OpenMAIC
   pnpm dev
   ```

2. 访问测试页面：
   ```
   http://localhost:3000/teaching-test
   ```

3. 应该可以正常访问，不再报 `fs` 模块错误

## 优缺点

### 优点
✅ 解决了客户端/服务端模块冲突
✅ 代码更简单，不依赖文件系统
✅ 可以在客户端直接使用

### 缺点
⚠️ Prompt 硬编码在代码中，不如文件管理灵活
⚠️ 修改 prompt 需要修改代码

## 未来改进

如果需要更灵活的 prompt 管理，可以考虑：

1. **方案 A：服务端 API**
   - 创建 `/api/teaching/generate` API 路由
   - 在服务端调用生成逻辑
   - 客户端通过 API 调用

2. **方案 B：构建时生成**
   - 在构建时将 prompt 文件编译为 JSON
   - 客户端直接导入 JSON

3. **方案 C：混合方案**
   - 简单的 prompt 硬编码
   - 复杂的 prompt 通过 API 获取

## 当前状态

✅ 问题已修复
✅ 可以正常访问 `/teaching-test` 页面
✅ 生成和导出功能应该可以正常工作

## 下一步

1. 访问 `http://localhost:3000/teaching-test`
2. 测试生成功能
3. 测试导出功能
4. 如果有其他问题，继续调试
