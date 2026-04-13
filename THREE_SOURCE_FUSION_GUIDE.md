# 三源融合系统完整指南

## 概述

三源融合系统将教师需求、参考资料和知识库内容智能融合到教学设计中，确保生成的课件内容丰富、专业且可追溯。

## 三个来源

### 1. 教师意图（Teacher Intent）
- **来源**：`TeachingRequest` 对象
- **包含**：课题、学科、年级、教学目标、重难点、特殊要求
- **标记**：`source: "teacher"`
- **用途**：教学框架、目标设定、教学策略

### 2. 参考资料（Reference Materials）
- **来源**：用户上传的 PDF 文件
- **包含**：文本内容、图片资源
- **标记**：`source: "material"`
- **用途**：具体案例、图表、专业术语、教学素材

### 3. 知识库（Knowledge Base）
- **来源**：FastGPT RAG 检索
- **包含**：专业知识、教学建议、概念解释
- **标记**：`source: "knowledge"`
- **用途**：专业知识补充、教学方法建议、概念辨析
- **特殊要求**：必须填写 `ragChunkId` 字段

## 数据流转

```
用户输入（TeachingRequest）
    ↓
解析参考资料（parseTeachingMaterials）
    ├─ 提取文本内容
    └─ 提取图片资源
    ↓
查询知识库（queryFastGPT）
    ├─ 构建查询语句
    ├─ 获取 RAG 响应
    └─ 提取知识片段（quoteList）
    ↓
构建三源上下文（buildTeachingContextBundle）
    ├─ 格式化教师需求
    ├─ 格式化参考资料
    ├─ 格式化知识库内容
    └─ 合并为完整上下文
    ↓
生成教学设计（generateTeachingDesignFromRequest）
    ├─ 构建 System Prompt
    ├─ 构建 User Prompt（包含三源上下文）
    ├─ 调用 LLM 生成
    └─ 解析 JSON 响应
    ↓
验证设计（validateTeachingDesign）
    ├─ 检查关键问题
    ├─ 检查警告
    └─ 决定是否重试
    ↓
返回最终设计
```

## 关键日志追踪点

### 🔍 [1/4] FastGPT 原始响应
**位置**：`fastgpt-client.ts`
**内容**：FastGPT 返回的完整 `responseData`，包括 `quoteList`

```typescript
log.info('🔍 [1/4] FastGPT raw response:', {
  answerLength: result.answer.length,
  quoteCount: result.quoteList?.length || 0,
  responseData: result.responseData,
});
```

### 🔍 [2/4] 提取的 RAG 片段
**位置**：`teaching-outline-generator.ts`
**内容**：从 `quoteList` 提取的结构化 `ragChunks`

```typescript
log.info('🔍 [2/4] Extracted RAG chunks:', {
  chunkCount: ragChunks.length,
  totalChars: ragChunks.reduce((sum, c) => sum + c.content.length, 0),
  chunks: ragChunks.map(c => ({
    id: c.id,
    sourceName: c.sourceName,
    contentLength: c.content.length,
  })),
});
```

### 🔍 [3/4] 传入 ContextBuilder 的内容
**位置**：`teaching-context-builder.ts`
**内容**：三源上下文构建的详细信息

```typescript
log.info('🔍 [3/4] Building context bundle:', {
  teacherChars: teacherContext.length,
  materialChars: materialContext.length,
  ragChars: ragContext.length,
  mergedChars: mergedContext.length,
});
```

### 🔍 [4/4] 最终 Prompt
**位置**：`teaching-outline-generator.ts`
**内容**：发送给 LLM 的完整 prompt

```typescript
log.info('🔍 [4/4] Complete prompt sent to model:', {
  systemPromptLength: systemPrompt.length,
  userPromptLength: finalUserPrompt.length,
  totalPromptLength: systemPrompt.length + finalUserPrompt.length,
});
```

## 验证规则

### 关键问题（触发重试）

1. **缺少 source 字段**
   ```
   有 X 个知识点缺少 source 字段标记
   ```

2. **知识库来源不可验证**
   ```
   有 X 个标记为 knowledge 的知识点缺少可验证的来源
   （必须包含"知识库片段X"或有效的 ragChunkId）
   ```

### 警告（仅记录）

1. **来源使用率较低**
   ```
   参考资料使用率较低（X%），建议适当增加参考资料的使用
   知识库使用率较低（X%），建议适当增加知识库内容的使用
   ```

2. **来源单一**
   ```
   仅使用了 1 种来源，建议至少使用 2 种来源以丰富教学内容
   ```

3. **RAG 内容匹配度低**
   ```
   有 X 个标记为 knowledge 的知识点内容与知识库片段匹配度较低
   （可能是泛化描述或改写）
   ```

## 重试机制

### 配置
- **最大重试次数**：`MAX_RETRIES = 1`
- **总尝试次数**：2 次（1 次初始 + 1 次重试）
- **触发条件**：存在关键问题（`issues.length > 0`）

### 重试流程
```
第 1 次尝试
    ↓
验证
    ↓
有关键问题？
    ├─ 否 → 成功，返回结果
    └─ 是 → 第 2 次尝试（添加重试提示）
         ↓
    验证
         ↓
    有关键问题？
         ├─ 否 → 成功，返回结果
         └─ 是 → 失败，返回最后结果
```

### 重试提示词
```
⚠️ 第 X 次生成存在以下关键问题，请修正：

1. 每个 keyPoint 必须包含 source 字段
2. 标记为 knowledge 的内容必须直接来自知识库片段
3. 必须在内容中明确标注"（来自知识库片段X）"
4. ragChunkId 必须是上文提供的知识库片段的真实ID
5. 尽量使用参考资料和知识库的内容，但不强制要求固定比例

当前关键问题：
   1. [具体问题描述]
   2. [具体问题描述]
```

## KeyPoint 数据结构

### 标准格式
```typescript
interface KeyPointWithSource {
  content: string;           // 知识点内容
  source: 'teacher' | 'material' | 'knowledge';  // 来源标记
  ragChunkId?: string;       // 知识库片段ID（source为knowledge时必填）
}
```

### 示例

#### 教师来源
```json
{
  "content": "通过本课学习，学生能够理解XX概念",
  "source": "teacher"
}
```

#### 参考资料来源
```json
{
  "content": "根据参考资料，XX公司成立于2020年3月15日",
  "source": "material"
}
```

#### 知识库来源
```json
{
  "content": "小鹿阿米：性格好奇、善良（来自知识库片段1）",
  "source": "knowledge",
  "ragChunkId": "69d9f5772e25dfad1d1217ae"
}
```

## RAG 内容验证

### 验证策略

#### 策略 1：直接短语匹配
- 提取内容中的关键短语（2-6 个字符）
- 检查短语是否出现在知识库片段中
- 匹配率 >= 30% 视为对齐

#### 策略 2：关键词匹配
- 从知识库片段提取关键词（8 个）
- 检查内容中包含的关键词数量
- 匹配 >= 2 个关键词或匹配率 >= 25% 视为对齐

### 文本标准化
- Unicode NFC 标准化
- 全角字符转半角
- 统一引号格式
- 移除多余空格

## 常见问题排查

### 问题 1：知识库内容为空（0 chars）

**症状**：
```
🔍 [2/4] Extracted 1 quote chunks (0 chars)
effective RAG content: 0 chars
```

**原因**：
- FastGPT 返回的 `quoteList` 中 `q` 和 `a` 字段为空
- 实际内容在 `responseData` 的其他位置

**解决**：
- 检查 `fastgpt-client.ts` 的提取逻辑
- 从 `historyPreview` 的 `<Cites>` 标签提取内容
- 通过 ID 合并元数据和内容

### 问题 2：RAG 内容不匹配

**症状**：
```
⚠️ 有 5 个标记为 knowledge 的知识点内容与知识库片段匹配度较低
```

**原因**：
- 模型过度改写或泛化知识库内容
- 全角/半角字符混用
- 关键词提取不准确

**解决**：
- 使用文本标准化（`normalizeText`）
- 降低匹配阈值
- 使用多种匹配策略

### 问题 3：来源标记错误

**症状**：
```
有 3 个知识点缺少 source 字段标记
```

**原因**：
- 模型未按要求输出 source 字段
- JSON 格式错误

**解决**：
- 强化 System Prompt 中的格式要求
- 添加重试机制
- 在解析时提供默认值

### 问题 4：出现无关内容（如"毛概"）

**症状**：
- 生成的内容包含与主题无关的内容

**原因**：
- RAG 内容丢失（0 chars）
- 模型依赖通用教学模板
- 上下文污染

**解决**：
- 确保 RAG 内容正确提取
- 清理上下文，避免混入其他主题
- 检查重试提示词是否引入污染

## 性能优化

### 1. FastGPT 查询优化
- 设置合理的超时时间（5 分钟）
- 构建精确的查询语句
- 包含关键词和教学目标

### 2. 上下文长度控制
- 参考资料：无限制（已取消 2000 字符限制）
- 知识库内容：无限制
- 合并后上下文：根据模型限制调整

### 3. 图片处理
- Vision 模式：最多 `MAX_VISION_IMAGES` 张图片
- 其他图片：仅文本描述

## 配置选项

### TeachingRequest
```typescript
interface TeachingRequest {
  topic: string;              // 课题
  subject: string;            // 学科
  gradeLevel: string;         // 年级
  duration: number;           // 课时（分钟）
  objectives?: {              // 教学目标
    knowledge?: string[];
    skills?: string[];
    attitude?: string[];
  };
  keyPoints?: string[];       // 教学重点
  difficulties?: string[];    // 教学难点
  additionalNotes?: string;   // 特殊要求
  useKnowledgeBase?: boolean; // 是否使用知识库
  language: string;           // 语言（zh-CN/en-US）
}
```

### GenerationOptions
```typescript
interface GenerationOptions {
  visionEnabled?: boolean;    // 是否启用 Vision 模式
  imageMapping?: ImageMapping; // 图片 URL 映射
  researchContext?: string;   // 网络搜索结果
}
```

## 最佳实践

### 1. 教师需求
- 明确教学目标和重难点
- 提供具体的教学要求
- 说明特殊的教学场景

### 2. 参考资料
- 上传高质量的 PDF 文件
- 确保图片清晰可用
- 内容与课题相关

### 3. 知识库
- 定期更新知识库内容
- 确保内容准确专业
- 添加明确的来源标识

### 4. 验证和调试
- 关注日志中的 🔍 标记
- 检查来源分布统计
- 注意警告信息

## 相关文件

### 核心文件
- `lib/generation/teaching-outline-generator.ts` - 主生成流程
- `lib/generation/fusion-validator.ts` - 验证逻辑
- `lib/generation/teaching-context-builder.ts` - 上下文构建
- `lib/ai/fastgpt-client.ts` - FastGPT 集成

### 类型定义
- `lib/types/teaching.ts` - 教学相关类型
- `lib/types/generation.ts` - 生成相关类型

### 提示词模板
- `lib/generation/prompts/templates/requirements-to-outlines/` - 大纲生成
- `lib/generation/prompts/templates/slide-content/` - 内容生成

## 未来改进

1. **自适应阈值**：根据实际使用情况动态调整验证阈值
2. **用户配置**：允许用户自定义验证规则和来源比例
3. **统计分析**：收集数据，分析最佳来源分布
4. **智能推荐**：根据课题类型推荐最佳来源组合
5. **增量生成**：支持分步生成和实时反馈
