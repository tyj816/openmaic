# RAG 对齐验证测试示例

## 测试场景

### 场景 1：完美对齐（100% 对齐率）

**RAG Chunks:**
```json
[
  {
    "id": "69d32ee3e29ef33b19ad8cb0",
    "content": "进程是程序的一次执行过程，是操作系统进行资源分配和调度的基本单位。每个进程都有独立的地址空间，包括代码段、数据段、堆和栈。",
    "sourceName": "操作系统整理笔记终极版.pdf"
  },
  {
    "id": "69d32ee3e29ef33b19ad8c9c",
    "content": "进程的三态模型包括就绪态、运行态和阻塞态。就绪态表示进程已获得除CPU外的所有资源，等待CPU调度；运行态表示进程正在CPU上执行；阻塞态表示进程因等待某个事件而暂停执行。",
    "sourceName": "操作系统整理笔记终极版.pdf"
  }
]
```

**LLM 生成的 KeyPoints:**
```json
[
  {
    "content": "进程是程序的一次执行过程，是资源分配和调度的基本单位（来自知识库片段1）",
    "source": "knowledge",
    "ragChunkId": "69d32ee3e29ef33b19ad8cb0"
  },
  {
    "content": "进程的三态模型包括就绪态、运行态和阻塞态（来自知识库片段2）",
    "source": "knowledge",
    "ragChunkId": "69d32ee3e29ef33b19ad8c9c"
  }
]
```

**验证过程:**

1. **Chunk 1 关键词提取:**
   - 提取：["进程", "程序", "执行", "资源", "分配", "调度", "地址", "空间"]
   - KeyPoint 1 包含：["进程", "程序", "执行", "资源", "分配", "调度"]
   - 匹配：6/8 = 75% ✅

2. **Chunk 2 关键词提取:**
   - 提取：["进程", "三态", "模型", "就绪", "运行", "阻塞"]
   - KeyPoint 2 包含：["进程", "三态", "模型", "就绪", "运行", "阻塞"]
   - 匹配：6/6 = 100% ✅

**验证结果:**
```json
{
  "isValid": true,
  "issues": [],
  "stats": {
    "materialUsage": 0,
    "ragUsage": 2,
    "teacherUsage": 0,
    "totalItems": 2
  },
  "ragAlignment": {
    "successCount": 2,
    "failureCount": 0,
    "alignmentRate": 100.0
  }
}
```

**日志输出:**
```
[INFO] [FusionValidator] ✅ Validation passed: {
  materialPercentage: "0.0%",
  ragPercentage: "100.0%",
  sourcesUsed: 1,
  ragAlignment: {
    successCount: 2,
    failureCount: 0,
    alignmentRate: "100.0%"
  }
}
```

---

### 场景 2：部分编造（60% 对齐率）

**RAG Chunks:**
```json
[
  {
    "id": "69d32ee3e29ef33b19ad8cb0",
    "content": "进程是程序的一次执行过程，是操作系统进行资源分配和调度的基本单位。",
    "sourceName": "操作系统整理笔记终极版.pdf"
  }
]
```

**LLM 生成的 KeyPoints:**
```json
[
  {
    "content": "进程是程序的一次执行过程，是资源分配的基本单位（来自知识库片段1）",
    "source": "knowledge",
    "ragChunkId": "69d32ee3e29ef33b19ad8cb0"
  },
  {
    "content": "操作系统通过调度算法管理任务队列，实现高效的并发处理",
    "source": "knowledge",
    "ragChunkId": "69d32ee3e29ef33b19ad8cb0"
  },
  {
    "content": "进程间通信可以通过管道、消息队列、共享内存等方式实现",
    "source": "knowledge",
    "ragChunkId": "69d32ee3e29ef33b19ad8cb0"
  }
]
```

**验证过程:**

1. **KeyPoint 1:**
   - Chunk 关键词：["进程", "程序", "执行", "资源", "分配"]
   - KeyPoint 包含：["进程", "程序", "执行", "资源", "分配"]
   - 匹配：5/5 = 100% ✅

2. **KeyPoint 2:**
   - Chunk 关键词：["进程", "程序", "执行", "资源", "分配"]
   - KeyPoint 包含：无匹配（"调度"、"算法"、"任务"、"队列"、"并发" 都不在 chunk 中）
   - 匹配：0/5 = 0% ❌ **编造内容**

3. **KeyPoint 3:**
   - Chunk 关键词：["进程", "程序", "执行", "资源", "分配"]
   - KeyPoint 包含：["进程"]（仅 1 个）
   - 匹配：1/5 = 20% ❌ **泛化描述**

**验证结果:**
```json
{
  "isValid": false,
  "issues": [
    "有 2 个标记为 knowledge 的知识点内容与知识库片段不匹配（疑似编造或泛化描述）"
  ],
  "stats": {
    "materialUsage": 0,
    "ragUsage": 3,
    "teacherUsage": 0,
    "totalItems": 3
  },
  "ragAlignment": {
    "successCount": 1,
    "failureCount": 2,
    "alignmentRate": 33.3
  }
}
```

**日志输出:**
```
[WARN] [FusionValidator] Slide 1, KeyPoint 2 marked as knowledge but content doesn't align with RAG chunks: {
  content: "操作系统通过调度算法管理任务队列，实现高效的并发处理",
  ragChunkId: "69d32ee3e29ef33b19ad8cb0"
}

[WARN] [FusionValidator] Slide 1, KeyPoint 3 marked as knowledge but content doesn't align with RAG chunks: {
  content: "进程间通信可以通过管道、消息队列、共享内存等方式实现",
  ragChunkId: "69d32ee3e29ef33b19ad8cb0"
}

[WARN] [FusionValidator] ❌ Validation failed: {
  issueCount: 1,
  issues: [
    "有 2 个标记为 knowledge 的知识点内容与知识库片段不匹配（疑似编造或泛化描述）"
  ],
  stats: { materialUsage: 0, ragUsage: 3, teacherUsage: 0, totalItems: 3 },
  ragAlignment: {
    successCount: 1,
    failureCount: 2,
    alignmentRate: "33.3%"
  }
}
```

**重试 Prompt:**
```
⚠️ 第 1 次生成未满足三源融合要求，请严格遵守以下规则：

1. 每个 keyPoint 必须包含 source 字段（"teacher" | "material" | "knowledge"）
2. 至少 25% 的 keyPoints 必须标记为 source: "material"（来自参考资料）
3. 至少 25% 的 keyPoints 必须标记为 source: "knowledge"（来自知识库）
4. 必须使用至少 2 种不同的来源
5. 充分利用参考资料中的关键术语、概念和知识库中的专业知识
6. **重要：标记为 knowledge 的内容必须直接来自知识库片段，不允许编造**
7. **必须在内容中明确标注"（来自知识库片段X）"，并填写 ragChunkId 字段**
8. **ragChunkId 必须是上文提供的知识库片段的真实ID，不可编造**
9. **你标记为知识库的内容必须直接来源于提供的知识库片段，不允许编造或泛化描述**
10. **使用知识库片段中的原文关键词和术语，保持内容的真实性和可追溯性**

当前问题：
   1. 有 2 个标记为 knowledge 的知识点内容与知识库片段不匹配（疑似编造或泛化描述）

请重新生成，确保满足所有要求。特别注意：
- 所有标记为 knowledge 的内容必须能在知识库片段中找到对应内容
- 必须使用知识库片段中的原文关键词，不要泛化或改写过度
- 正确标注片段编号和ID，确保内容可验证、可追溯
```

---

### 场景 3：完全编造（0% 对齐率）

**RAG Chunks:**
```json
[
  {
    "id": "69d32ee3e29ef33b19ad8cb0",
    "content": "进程是程序的一次执行过程，是操作系统进行资源分配和调度的基本单位。",
    "sourceName": "操作系统整理笔记终极版.pdf"
  }
]
```

**LLM 生成的 KeyPoints:**
```json
[
  {
    "content": "云计算技术通过虚拟化实现资源的弹性伸缩和按需分配",
    "source": "knowledge",
    "ragChunkId": "69d32ee3e29ef33b19ad8cb0"
  },
  {
    "content": "人工智能算法可以自动优化系统性能和资源利用率",
    "source": "knowledge",
    "ragChunkId": "69d32ee3e29ef33b19ad8cb0"
  }
]
```

**验证过程:**

1. **KeyPoint 1:**
   - Chunk 关键词：["进程", "程序", "执行", "资源", "分配"]
   - KeyPoint 包含：["资源", "分配"]（仅 2 个，但上下文完全不同）
   - 实际匹配：0/5 = 0% ❌ **完全编造**

2. **KeyPoint 2:**
   - Chunk 关键词：["进程", "程序", "执行", "资源", "分配"]
   - KeyPoint 包含：无匹配
   - 匹配：0/5 = 0% ❌ **完全编造**

**验证结果:**
```json
{
  "isValid": false,
  "issues": [
    "有 2 个标记为 knowledge 的知识点内容与知识库片段不匹配（疑似编造或泛化描述）"
  ],
  "stats": {
    "materialUsage": 0,
    "ragUsage": 2,
    "teacherUsage": 0,
    "totalItems": 2
  },
  "ragAlignment": {
    "successCount": 0,
    "failureCount": 2,
    "alignmentRate": 0.0
  }
}
```

---

## 关键词提取示例

### 示例 1：技术文本

**输入:**
```
进程是程序的一次执行过程，是操作系统进行资源分配和调度的基本单位。每个进程都有独立的地址空间，包括代码段、数据段、堆和栈。
```

**提取过程:**
1. 分词：["进程", "是", "程序", "的", "一次", "执行", "过程", ...]
2. 过滤停用词：去除 "是"、"的"、"和"
3. 评分（基于长度）：
   - "进程" (2字) → 分数 2
   - "程序" (2字) → 分数 2
   - "执行" (2字) → 分数 2
   - "资源" (2字) → 分数 2
   - "分配" (2字) → 分数 2
   - "调度" (2字) → 分数 2
   - "地址" (2字) → 分数 2
   - "空间" (2字) → 分数 2
4. 排序取前 5：["进程", "程序", "执行", "资源", "分配"]

### 示例 2：教学文本

**输入:**
```
本节课将学习操作系统的进程管理，重点掌握进程的概念、状态转换和调度算法。通过实验加深对进程调度的理解。
```

**提取关键词:**
["进程", "管理", "状态", "转换", "调度"]

---

## 对齐阈值说明

当前阈值：**至少匹配 2 个关键词（40%）**

### 为什么选择 40%？

1. **太严格（80%+）**：
   - LLM 必须几乎逐字复制 chunk 内容
   - 失去了改写和总结的灵活性
   - 可能导致过多的误报

2. **太宽松（20%-）**：
   - 仅匹配 1 个关键词就通过
   - 无法有效检测编造内容
   - 失去验证意义

3. **适中（40%）**：
   - 允许 LLM 改写和总结
   - 但必须保留核心关键词
   - 有效检测编造和过度泛化
   - 平衡严格性和灵活性

### 可调节性

如果需要调整阈值，修改 `validateRagAlignment` 函数：

```typescript
// 当前：至少匹配 2 个关键词
if (matchCount >= 2) {
  return true;
}

// 更严格：至少匹配 3 个关键词（60%）
if (matchCount >= 3) {
  return true;
}

// 更宽松：至少匹配 1 个关键词（20%）
if (matchCount >= 1) {
  return true;
}
```

---

## 实际测试建议

1. **准备测试数据:**
   - 真实的 RAG chunks（从 FastGPT 获取）
   - 多样化的教学主题
   - 不同长度的 chunks

2. **测试场景:**
   - 完美对齐（100%）
   - 部分编造（50-80%）
   - 完全编造（0-20%）
   - 过度泛化（20-40%）

3. **观察指标:**
   - 对齐率分布
   - 误报率（真实内容被判为编造）
   - 漏报率（编造内容未被检测）
   - 重试次数

4. **调优方向:**
   - 调整关键词数量（3-7 个）
   - 调整匹配阈值（30-60%）
   - 优化停用词列表
   - 改进评分算法

---

**测试完成后，可根据实际效果调整参数，达到最佳的验证效果。**
