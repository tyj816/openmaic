# 软性验证实现总结

## 背景

根据用户反馈，原有的硬性 30% 来源使用率要求过于严格，不适合复杂的教学场景。教学内容的质量和完整性应该优先于固定的来源分布比例。

## 核心改动

### 1. 验证逻辑分级（fusion-validator.ts）

将验证问题分为两类：

#### 关键问题（Critical Issues）- 触发重试
- 缺少 source 字段标记
- 标记为 knowledge 但缺少可验证来源（无片段引用或 ragChunkId）

#### 警告（Warnings）- 仅记录，不触发重试
- 来源使用率较低（< 10%）
- 仅使用单一来源
- RAG 内容匹配度较低（可能是泛化描述）

### 2. ValidationResult 接口更新

```typescript
export interface ValidationResult {
  isValid: boolean;
  issues: string[];      // 关键问题
  warnings: string[];    // 警告
  stats: SourceUsageStats;
  ragAlignment?: {
    successCount: number;
    failureCount: number;
    alignmentRate: number;
  };
}
```

### 3. 验证规则调整

#### 原规则（硬性约束）
- ❌ 参考资料使用率 >= 25%
- ❌ 知识库使用率 >= 25%
- ❌ 必须使用至少 2 种来源
- ❌ RAG 内容不匹配 → 触发重试

#### 新规则（软性建议）
- ✅ 参考资料使用率 < 10% → 警告
- ✅ 知识库使用率 < 10% → 警告
- ✅ 仅使用单一来源 → 警告
- ✅ RAG 内容匹配度低 → 警告（不触发重试）

### 4. 重试提示词优化

#### 原提示词
```
⚠️ 第 X 次生成未满足三源融合要求，请严格遵守以下规则：
1. 至少 25% 的 keyPoints 必须标记为 material
2. 至少 25% 的 keyPoints 必须标记为 knowledge
3. 必须使用至少 2 种不同的来源
...
```

#### 新提示词
```
⚠️ 第 X 次生成存在以下关键问题，请修正：
1. 每个 keyPoint 必须包含 source 字段
2. 标记为 knowledge 的内容必须直接来自知识库片段
3. 尽量使用参考资料和知识库的内容，但不强制要求固定比例
4. 根据实际情况灵活使用三种来源
...
```

### 5. System Prompt 更新

#### 原约束
```
三源融合要求（强制约束）：
- 如果提供了参考资料，则相关的keyPoints 必须标记为 source: "material"
- 如果提供了知识库内容，则相关的 keyPoints 必须标记为 source: "knowledge"
- 必须明确使用参考资料中的关键术语和知识库中的专业概念
```

#### 新指导
```
三源融合指导原则（灵活建议，非硬性要求）：
- 如果提供了参考资料，建议适当使用其中的关键术语和概念
- 如果提供了知识库内容，建议适当引用其中的专业知识
- 根据教学场景和内容需要，灵活使用三种来源，不强制要求固定比例
- 教学质量和内容完整性优先于来源分布比例
```

## 验证流程

```
生成教学设计
    ↓
验证设计
    ↓
有关键问题？
    ├─ 是 → 重试（最多 2 次，共 3 次尝试）
    └─ 否 → 通过
         ↓
    有警告？
         ├─ 是 → 记录日志，继续
         └─ 否 → 完全通过
```

## 重试次数

- 最大重试次数：`MAX_RETRIES = 1`（在 teaching-outline-generator.ts 中定义）
- 总尝试次数：2 次（1 次初始 + 1 次重试）
- 只有关键问题触发重试，警告不触发

## 日志输出示例

### 通过验证（有警告）
```
✅ Validation passed (no critical issues)
⚠️ Non-critical warnings:
  - 参考资料使用率较低（8.3%），建议适当增加参考资料的使用
  - 知识库使用率较低（16.7%），建议适当增加知识库内容的使用
```

### 失败验证（有关键问题）
```
❌ Validation failed (critical issues found)
Critical issues:
  - 有 3 个知识点缺少 source 字段标记
  - 有 2 个标记为 knowledge 的知识点缺少可验证的来源
Warnings:
  - 仅使用了 1 种来源，建议至少使用 2 种来源以丰富教学内容
```

## 优势

1. **灵活性**：不再强制固定比例，适应不同教学场景
2. **质量优先**：教学内容质量优先于来源分布
3. **减少重试**：只有真正的问题才触发重试，提高生成效率
4. **信息透明**：警告仍然记录，便于监控和优化
5. **用户友好**：减少因比例不足导致的生成失败

## 保留的硬性约束

以下约束仍然是强制的（关键问题）：
1. 每个 keyPoint 必须有 source 字段
2. 标记为 knowledge 的内容必须有可验证来源（片段引用或 ragChunkId）
3. ragChunkId 必须是真实存在的知识库片段 ID

## 测试建议

1. 测试知识库内容充足的场景
2. 测试知识库内容不足的场景
3. 测试无参考资料的场景
4. 测试无知识库的场景
5. 验证警告是否正确记录
6. 验证关键问题是否触发重试

## 相关文件

- `OpenMAIC/lib/generation/fusion-validator.ts` - 验证逻辑
- `OpenMAIC/lib/generation/teaching-outline-generator.ts` - 生成流程和重试逻辑
- `OpenMAIC/lib/generation/teaching-context-builder.ts` - 上下文构建
- `OpenMAIC/lib/ai/fastgpt-client.ts` - FastGPT 集成

## 下一步

可以考虑：
1. 根据实际使用情况调整警告阈值（当前 10%）
2. 添加更多细粒度的警告类型
3. 提供用户配置选项，允许自定义验证规则
4. 收集统计数据，分析最佳来源分布比例
