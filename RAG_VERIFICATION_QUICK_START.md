# RAG 来源验证 - 快速开始指南

## 🎯 功能概述

系统现已支持知识库来源的完整验证链路，确保所有标记为 `source="knowledge"` 的内容都能追溯到具体的 FastGPT 知识库片段。

## 🔄 工作流程

```
用户输入 → FastGPT查询 → 提取quoteList → 格式化片段 → LLM生成 → 验证来源 → 输出结果
   ↓            ↓              ↓              ↓           ↓          ↓
教学需求    返回答案+片段   RagChunk[]    带ID的Prompt   标注来源   检查真实性
```

## 📝 数据流示例

### 1. FastGPT 返回（responseData）

```json
{
  "responseData": [
    {
      "moduleType": "datasetSearchNode",
      "quoteList": [
        {
          "id": "69d32ee3e29ef33b19ad8cb0",
          "chunkIndex": 5,
          "sourceName": "操作系统整理笔记终极版.pdf",
          "q": "进程是程序的一次执行过程，是资源分配的基本单位..."
        }
      ]
    }
  ]
}
```

### 2. 提取为 RagChunk

```typescript
const ragChunks: RagChunk[] = [
  {
    id: "69d32ee3e29ef33b19ad8cb0",
    content: "进程是程序的一次执行过程，是资源分配的基本单位...",
    sourceName: "操作系统整理笔记终极版.pdf",
    chunkIndex: 5
  }
];
```

### 3. 格式化到 Prompt

```
# 【知识库参考内容】
以下是从知识库检索到的相关内容片段，每个片段都有唯一ID用于来源追溯：

【知识库片段1】（ID: 69d32ee3e29ef33b19ad8cb0）
来源文件：操作系统整理笔记终极版.pdf
进程是程序的一次执行过程，是资源分配的基本单位...
```

### 4. LLM 生成输出

```json
{
  "keyPoints": [
    {
      "content": "进程是程序的一次执行过程（来自知识库片段1）",
      "source": "knowledge",
      "ragChunkId": "69d32ee3e29ef33b19ad8cb0"
    }
  ]
}
```

### 5. Validator 验证

```typescript
// 检查1：内容是否包含片段引用
const hasChunkReference = /知识库片段\d+/.test(keyPoint.content);
// ✅ 匹配到 "知识库片段1"

// 检查2：ragChunkId 是否有效
const hasValidChunkId = availableChunkIds.has(keyPoint.ragChunkId);
// ✅ "69d32ee3e29ef33b19ad8cb0" 在可用片段集合中

// 结果：验证通过
```

## 🔧 关键代码位置

| 功能 | 文件 | 关键函数/接口 |
|------|------|--------------|
| RAG数据结构 | `lib/types/teaching.ts` | `RagChunk`, `KeyPointWithSource` |
| FastGPT提取 | `lib/ai/fastgpt-client.ts` | `queryFastGPT()` |
| Context构建 | `lib/generation/teaching-context-builder.ts` | `buildTeachingContextBundle()` |
| 来源验证 | `lib/generation/fusion-validator.ts` | `validateTeachingDesign()` |
| 主流程 | `lib/generation/teaching-outline-generator.ts` | `generateTeachingDesignFromRequest()` |

## 📊 验证规则

### Rule 1: 所有 keyPoints 必须有 source 字段
```typescript
if (!keyPoint.source) {
  issues.push("缺少 source 字段");
}
```

### Rule 2: knowledge 来源必须可验证（新增）
```typescript
if (keyPoint.source === 'knowledge') {
  const hasChunkReference = /知识库片段\d+/.test(keyPoint.content);
  const hasValidChunkId = keyPoint.ragChunkId && availableChunkIds.has(keyPoint.ragChunkId);
  
  if (!hasChunkReference && !hasValidChunkId) {
    issues.push("knowledge 来源缺少验证");
  }
}
```

### Rule 3-5: 原有规则
- 至少使用 2 种来源
- 参考资料使用率 >= 25%
- 知识库使用率 >= 25%

## 🧪 测试方法

### 1. 启动开发服务器

```bash
cd OpenMAIC
npm run dev
```

### 2. 访问测试页面

```
http://localhost:3000/teaching-test
```

### 3. 填写测试数据

- 学科：计算机科学
- 课题：操作系统的进程管理
- 年级：大学本科
- 课时：10分钟
- ✅ 勾选"使用知识库增强"
- 上传参考资料（PDF）

### 4. 查看日志

```
[INFO] [FastGPT] Extracted 5 quote chunks from FastGPT response
[INFO] [ContextBuilder] Context bundle built: 1810 chars total
[INFO] [FusionValidator] ✅ Validation passed: {
  materialPercentage: "26.7%",
  ragPercentage: "53.3%",
  sourcesUsed: 3
}
```

### 5. 检查生成结果

在生成的教学设计中，查看 keyPoints：

```json
{
  "content": "进程的三态模型包括就绪、运行、阻塞（来自知识库片段2）",
  "source": "knowledge",
  "ragChunkId": "69d32ee3e29ef33b19ad8c9c"
}
```

## ⚠️ 常见问题

### Q1: 验证失败 - "缺少可验证的来源"

**原因：** LLM 标记了 `source: "knowledge"` 但没有填写 `ragChunkId` 或在内容中标注片段编号

**解决：** 系统会自动重试，在重试 Prompt 中强化约束

### Q2: FastGPT 未返回 quoteList

**原因：** FastGPT 配置或工作流问题

**解决：** 系统会优雅降级，使用原有逻辑（不进行来源验证）

### Q3: ragChunkId 无效

**原因：** LLM 编造了不存在的 ID

**解决：** Validator 会检测到并标记为 invalid，触发重试

## 🎨 前端展示建议

### 来源标签

```tsx
{keyPoint.source === 'knowledge' && keyPoint.ragChunkId && (
  <Badge variant="outline" className="ml-2">
    <Database className="w-3 h-3 mr-1" />
    知识库片段
  </Badge>
)}
```

### 来源溯源弹窗

```tsx
<Dialog>
  <DialogTrigger>查看来源</DialogTrigger>
  <DialogContent>
    <DialogTitle>知识库片段详情</DialogTitle>
    <div>
      <p>ID: {keyPoint.ragChunkId}</p>
      <p>来源文件: {chunk.sourceName}</p>
      <p>内容: {chunk.content}</p>
    </div>
  </DialogContent>
</Dialog>
```

## 📈 统计分析

### 来源分布图表

```typescript
const sourceStats = {
  teacher: teacherUsage,
  material: materialUsage,
  knowledge: ragUsage,
};

// 使用 recharts 绘制饼图
<PieChart>
  <Pie data={sourceStats} dataKey="value" nameKey="name" />
</PieChart>
```

### 知识库片段使用频率

```typescript
const chunkUsageMap = new Map<string, number>();

design.slides.forEach(slide => {
  slide.keyPoints.forEach(kp => {
    if (kp.ragChunkId) {
      chunkUsageMap.set(
        kp.ragChunkId,
        (chunkUsageMap.get(kp.ragChunkId) || 0) + 1
      );
    }
  });
});
```

## 🚀 下一步优化

1. **实时预览**：在生成过程中显示正在使用的知识库片段
2. **来源高亮**：在课件中用不同颜色标记不同来源的内容
3. **溯源报告**：生成 PDF 格式的来源溯源报告
4. **片段评分**：根据使用频率和效果对知识库片段评分

---

**文档版本：** v1.0  
**更新时间：** 2026-04-11  
**状态：** ✅ 已实施并测试
