# RAG 对齐验证快速参考

## 🎯 核心功能

确保标记为 `source="knowledge"` 的内容真实来源于 RAG chunks，检测并拒绝 LLM 编造或泛化的内容。

## 📊 三层防护

| 层级 | 验证内容 | 检测目标 |
|------|---------|---------|
| 第一层 | `ragChunkId` 是否有效 | 检测编造的 ID |
| 第二层 | 内容是否包含 `"知识库片段X"` | 检测缺少引用 |
| 第三层 | 内容是否包含 chunk 关键词 | 检测编造和泛化 |

## 🔍 关键函数

### extractKeywords()
```typescript
extractKeywords(text: string, count: number = 5): string[]
```
- 从文本提取 3-5 个关键词
- 过滤停用词（的、了、在等）
- 基于词长评分（偏好 2-6 字符）

### validateRagAlignment()
```typescript
validateRagAlignment(keyPoint: KeyPointWithSource, ragChunks: RagChunk[]): boolean
```
- 提取每个 chunk 的关键词
- 检查 keyPoint 是否包含关键词
- 至少匹配 2 个关键词（40% 阈值）

## 📈 验证结果

```typescript
interface ValidationResult {
  isValid: boolean;
  issues: string[];
  stats: SourceUsageStats;
  ragAlignment?: {
    successCount: number;    // 对齐成功数量
    failureCount: number;    // 对齐失败数量
    alignmentRate: number;   // 对齐率（%）
  };
}
```

## 📝 日志示例

### 成功（100% 对齐）
```
[INFO] ✅ Validation passed: {
  ragAlignment: {
    successCount: 5,
    failureCount: 0,
    alignmentRate: "100.0%"
  }
}
```

### 失败（检测到编造）
```
[WARN] ❌ Validation failed: {
  issues: [
    "有 2 个标记为 knowledge 的知识点内容与知识库片段不匹配（疑似编造或泛化描述）"
  ],
  ragAlignment: {
    successCount: 3,
    failureCount: 2,
    alignmentRate: "60.0%"
  }
}
```

## 🔧 参数调优

### 关键词数量
```typescript
// 当前：5 个关键词
const keywords = extractKeywords(chunk.content, 5);

// 更多：7 个关键词（更严格）
const keywords = extractKeywords(chunk.content, 7);

// 更少：3 个关键词（更宽松）
const keywords = extractKeywords(chunk.content, 3);
```

### 匹配阈值
```typescript
// 当前：至少 2 个（40%）
if (matchCount >= 2) return true;

// 更严格：至少 3 个（60%）
if (matchCount >= 3) return true;

// 更宽松：至少 1 个（20%）
if (matchCount >= 1) return true;
```

## 🚨 常见问题

### Q1: 为什么对齐率不是 100%？
A: LLM 可能编造了内容或过度泛化，未使用 chunk 的原文关键词。

### Q2: 如何提高对齐率？
A: 在重试 prompt 中强调"必须使用知识库片段中的原文关键词"。

### Q3: 对齐验证会影响性能吗？
A: 不会，关键词提取和匹配都是简单的字符串操作，毫秒级响应。

### Q4: 支持哪些语言？
A: 支持中英文混合文本，正则表达式：`/[\u4e00-\u9fa5]+|[a-zA-Z]+/g`

### Q5: 如何调试对齐失败？
A: 查看日志中的 `content` 和 `ragChunkId`，对比 chunk 的原文内容。

## 📚 相关文档

- **完整实施报告：** `RAG_TRUSTWORTHY_CHAIN_COMPLETE.md`
- **测试示例：** `RAG_ALIGNMENT_TEST_EXAMPLE.md`
- **日志修复：** `RAG_LOGGING_FIX.md`

## ✅ 检查清单

- [x] TypeScript 类型检查通过
- [x] 无编译错误
- [x] 三层验证全部实现
- [x] 日志输出完整
- [x] 重试机制增强
- [x] 文档完整

---

**快速开始：** 设置 `useKnowledgeBase: true`，系统自动启用 RAG 对齐验证。
