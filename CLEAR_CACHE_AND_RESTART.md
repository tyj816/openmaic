# 🔄 清除缓存并重启

## 🐛 问题

即使代码已经修复，仍然看到错误：
```
the chunking context (unknown) does not support external modules (request: node:async_hooks)
```

## 🔍 原因

Next.js 的构建缓存（`.next` 目录）可能包含旧的模块依赖关系。

## ✅ 解决方案

### 方法 1：删除 .next 目录并重启（推荐）

```bash
# 1. 停止开发服务器（Ctrl+C）

# 2. 删除 .next 目录
cd OpenMAIC
rm -rf .next        # Linux/Mac
# 或
rmdir /s /q .next   # Windows CMD
# 或
Remove-Item -Path ".next" -Recurse -Force  # Windows PowerShell

# 3. 重新启动开发服务器
pnpm dev
```

### 方法 2：使用 pnpm clean（如果有配置）

```bash
cd OpenMAIC
pnpm clean
pnpm dev
```

### 方法 3：完全清理并重新安装

```bash
cd OpenMAIC

# 1. 删除所有缓存
rm -rf .next
rm -rf node_modules/.cache

# 2. 重新安装依赖（可选）
pnpm install

# 3. 重启
pnpm dev
```

## 🧪 验证步骤

1. **确认 .next 目录已删除**
   ```bash
   ls -la OpenMAIC/.next  # 应该显示 "No such file or directory"
   ```

2. **重启开发服务器**
   ```bash
   cd OpenMAIC
   pnpm dev
   ```

3. **等待编译完成**
   - 第一次启动会比较慢（需要重新编译）
   - 等待看到 "✓ Compiled" 消息

4. **刷新浏览器**
   - 按 Ctrl+Shift+R（硬刷新，清除浏览器缓存）
   - 或者打开无痕模式访问

5. **访问测试页面**
   ```
   http://localhost:3000/teaching-test
   ```

6. **检查是否还有错误**
   - 打开浏览器控制台（F12）
   - 查看是否还有 `async_hooks` 相关的错误

## 🔍 如果还是有问题

### 检查导入链

确认 `use-teaching-generator.ts` 没有导入 `llm.ts`：

```typescript
// ✅ 正确的导入
import { generateText } from 'ai';

// ❌ 不应该有这个导入
// import { callLLM } from '@/lib/ai/llm';
```

### 检查文件内容

```bash
# 查看 use-teaching-generator.ts 的导入部分
head -n 20 OpenMAIC/lib/hooks/use-teaching-generator.ts
```

应该看到：
```typescript
import { useState, useCallback } from 'react';
import { generateText } from 'ai';
import type { LanguageModel } from 'ai';
// ... 其他导入，但不应该有 llm.ts
```

### 检查其他可能的导入

```bash
# 搜索是否有其他地方导入了 llm.ts
grep -r "from '@/lib/ai/llm'" OpenMAIC/lib/hooks/
grep -r "from '@/lib/ai/llm'" OpenMAIC/app/teaching-test/
```

应该没有任何结果。

## 💡 为什么需要清除缓存？

Next.js 使用 Turbopack 进行快速构建，它会缓存：

1. **模块依赖关系**：哪个文件导入了哪个文件
2. **编译结果**：已编译的 JavaScript 代码
3. **类型信息**：TypeScript 类型检查结果

当你修改导入语句时，有时缓存不会立即更新，导致：
- 旧的导入链仍然存在
- 编译器仍然尝试加载已删除的导入
- 错误信息指向旧的代码

删除 `.next` 目录会强制 Next.js 重新构建所有内容。

## 🎯 预期结果

清除缓存并重启后：

1. ✅ 编译成功，没有 `async_hooks` 错误
2. ✅ 可以正常访问 `/teaching-test` 页面
3. ✅ 点击"生成教学设计"按钮可以正常工作
4. ✅ 控制台有详细的日志输出

## 📚 相关文档

- **[FIX_LLM_CALL.md](./FIX_LLM_CALL.md)** - LLM 调用问题修复
- **[FIX_CLIENT_SERVER_ISSUE.md](./FIX_CLIENT_SERVER_ISSUE.md)** - 客户端/服务端问题
- **[QUICK_START.md](./QUICK_START.md)** - 快速启动指南

## 🆘 如果还是不行

如果清除缓存后还是有问题，请：

1. **检查 Git 状态**
   ```bash
   git status
   git diff OpenMAIC/lib/hooks/use-teaching-generator.ts
   ```

2. **确认文件已保存**
   - 在编辑器中保存所有文件
   - 关闭并重新打开编辑器

3. **重启整个系统**
   - 关闭所有终端
   - 关闭编辑器
   - 重新打开并启动

4. **查看完整的错误堆栈**
   - 在终端中查看完整的错误信息
   - 截图并分析导入链

---

**当前状态**：已删除 `.next` 目录，请重启开发服务器
