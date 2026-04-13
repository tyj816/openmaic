# Teaching Regenerator 使用指南

## 功能概述

`teaching-regenerator.ts` 实现了 TeachingDesign 的"局部修改再生成"能力，支持用户对特定页面进行修改，而不需要重新生成整个教学设计。

## 核心特性

### 1. 智能指令解析
自动识别用户的修改意图：
- ✅ "第3页" → 定位到第3页
- ✅ "第一页改成..." → 定位到第1页并提取修改要求
- ✅ "修改第5页的内容，增加..." → 定位到第5页并提取修改要求

### 2. 保留原有结构
- ✅ 只修改目标 slide
- ✅ 保留其他 slides 不变
- ✅ 保持 keyPoints 结构：`{content, source, ragChunkId}`
- ✅ 保留 slide ID 和顺序

### 3. 来源追踪保护
- ✅ 默认保留原有的 `source` 和 `ragChunkId`
- ✅ 新增内容标记为 `source: "teacher"`
- ✅ 支持内容相似度匹配，自动继承来源信息

### 4. 版本管理
- ✅ 自动递增 `version` 字段
- ✅ 更新 `updatedAt` 时间戳
- ✅ 保留 `designId` 不变

## API 文档

### 主函数：`regenerateTeachingDesign`

```typescript
interface RegenerationOptions {
  design: TeachingDesign;        // 原始教学设计
  instruction: string;            // 用户修改指令
  aiCall: AICallFn;              // AI 调用函数
  preserveSource?: boolean;       // 是否保留来源追踪（默认 true）
}

async function regenerateTeachingDesign(
  options: RegenerationOptions
): Promise<TeachingDesign>
```

### 批量修改：`batchRegenerateSlides`

```typescript
async function batchRegenerateSlides(
  design: TeachingDesign,
  instructions: Array<{ slideIndex: number; instruction: string }>,
  aiCall: AICallFn,
  preserveSource?: boolean
): Promise<TeachingDesign>
```

## 使用示例

### 示例 1：修改单个页面

```typescript
import { regenerateTeachingDesign } from '@/lib/generation/teaching-regenerator';
import { createAICall } from '@/lib/ai/providers';

// 原始教学设计
const originalDesign: TeachingDesign = {
  id: 'design_123',
  title: '操作系统核心概念',
  slides: [
    {
      id: 'slide_1',
      order: 1,
      title: '进程管理',
      keyPoints: [
        {
          content: '进程是资源分配的基本单位（来自知识库片段1）',
          source: 'knowledge',
          ragChunkId: 'rag_001'
        }
      ],
      // ...
    },
    // ... 更多 slides
  ],
  // ...
};

// 修改第1页
const updatedDesign = await regenerateTeachingDesign({
  design: originalDesign,
  instruction: '第一页增加线程的概念，并对比进程和线程的区别',
  aiCall: createAICall('openai', { model: 'gpt-4' }),
});

console.log('修改后的版本:', updatedDesign.version); // version + 1
console.log('修改的页面:', updatedDesign.slides[0].title);
```

### 示例 2：批量修改多个页面

```typescript
const updatedDesign = await batchRegenerateSlides(
  originalDesign,
  [
    { slideIndex: 0, instruction: '增加更多示例' },
    { slideIndex: 2, instruction: '简化内容，更适合初学者' },
    { slideIndex: 4, instruction: '添加实践练习' },
  ],
  aiCall,
);

console.log('批量修改完成，新版本:', updatedDesign.version);
```

### 示例 3：不保留来源追踪

```typescript
// 完全重新生成，不保留原有来源信息
const updatedDesign = await regenerateTeachingDesign({
  design: originalDesign,
  instruction: '第3页完全重写，改用更简单的语言',
  aiCall,
  preserveSource: false, // 不保留来源
});
```

## 指令解析规则

### 支持的页面引用格式

| 格式 | 示例 | 解析结果 |
|------|------|----------|
| 阿拉伯数字 | "第3页" | slideIndex = 2 |
| 中文数字 | "第三页" | slideIndex = 2 |
| 带修改要求 | "第5页增加..." | slideIndex = 4, modification = "增加..." |
| 完整描述 | "修改第2页的内容，改成..." | slideIndex = 1, modification = "改成..." |

### 中文数字支持范围
- ✅ 一到十：一、二、三、四、五、六、七、八、九、十
- ✅ 十一到十九：十一、十二、...、十九
- ✅ 整十：二十、三十、...、九十
- ✅ 其他：二十一、三十五、...、九十九

## 工作流程

```
用户输入指令
    ↓
解析指令（parseInstruction）
    ↓
验证目标页面索引
    ↓
构建再生成 prompt
    ↓
调用 LLM 生成新内容
    ↓
规范化 keyPoints 格式
    ↓
保留来源追踪（可选）
    ↓
替换目标 slide
    ↓
返回新的 TeachingDesign
```

## Prompt 设计

### System Prompt
```
你是一位经验丰富的教学设计专家。
你的任务是根据用户的修改要求，重新生成指定的教学课件页面。

输出格式必须是 JSON，包含以下字段：
{
  "title": "页面标题",
  "description": "教学目的",
  "type": "content",
  "keyPoints": [
    {
      "content": "要点内容",
      "source": "teacher" | "material" | "knowledge",
      "ragChunkId": "知识库片段ID（可选）"
    }
  ],
  "narration": "讲解词"
}
```

### User Prompt
```
## 课程基本信息
课题：操作系统核心概念
学科：计算机科学
年级：大学本科
课时：45分钟

## 原页面内容
标题：进程管理
要点内容：
1. 进程是资源分配的基本单位 [来源: knowledge] [RAG ID: rag_001]
2. 进程的三态模型 [来源: teacher]

## 修改要求
增加线程的概念，并对比进程和线程的区别

---
请根据以上信息生成新的页面内容JSON。
```

## 来源追踪保护机制

### 工作原理
1. **内容相似度匹配**：比较新旧 keyPoint 的内容前20个字符
2. **自动继承来源**：如果匹配成功，继承原有的 `source` 和 `ragChunkId`
3. **新增内容标记**：未匹配的新内容标记为 `source: "teacher"`

### 示例

```typescript
// 原始 keyPoint
{
  content: "进程是资源分配的基本单位（来自知识库片段1）",
  source: "knowledge",
  ragChunkId: "rag_001"
}

// 修改后（内容相似）
{
  content: "进程是操作系统中资源分配的基本单位",
  source: "knowledge",      // ✅ 自动继承
  ragChunkId: "rag_001"     // ✅ 自动继承
}

// 新增内容
{
  content: "线程是CPU调度的基本单位",
  source: "teacher",        // ✅ 新增标记
  ragChunkId: undefined
}
```

## 错误处理

### 常见错误及解决方案

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| "无法解析修改指令" | 指令格式不正确 | 使用"第X页"格式明确指定页面 |
| "页面索引超出范围" | 指定的页面不存在 | 检查 slides 数组长度 |
| "Failed to parse response" | LLM 返回格式错误 | 检查 AI 模型配置和 prompt |

### 错误示例

```typescript
try {
  const updated = await regenerateTeachingDesign({
    design,
    instruction: '改一下', // ❌ 指令不明确
    aiCall,
  });
} catch (error) {
  console.error('再生成失败:', error.message);
  // 输出: 无法解析修改指令："改一下"。请明确指定要修改的页面...
}
```

## 集成到 API

### API 路由示例

```typescript
// app/api/regenerate-teaching/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { regenerateTeachingDesign } from '@/lib/generation/teaching-regenerator';
import { createAICall } from '@/lib/ai/providers';

export async function POST(req: NextRequest) {
  try {
    const { design, instruction } = await req.json();

    const aiCall = createAICall('openai', {
      model: process.env.OPENAI_MODEL || 'gpt-4',
      apiKey: process.env.OPENAI_API_KEY,
    });

    const updatedDesign = await regenerateTeachingDesign({
      design,
      instruction,
      aiCall,
    });

    return NextResponse.json({
      success: true,
      data: updatedDesign,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

### 前端调用示例

```typescript
// 前端组件
async function handleRegenerateSlide(slideIndex: number, instruction: string) {
  const response = await fetch('/api/regenerate-teaching', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      design: currentDesign,
      instruction: `第${slideIndex + 1}页${instruction}`,
    }),
  });

  const result = await response.json();
  
  if (result.success) {
    setCurrentDesign(result.data);
    toast.success('页面修改成功！');
  } else {
    toast.error(`修改失败：${result.error}`);
  }
}
```

## 性能优化建议

### 1. 缓存原始设计
```typescript
// 避免每次都传递完整的 design 对象
const designCache = new Map<string, TeachingDesign>();

async function regenerateWithCache(designId: string, instruction: string) {
  const design = designCache.get(designId);
  if (!design) throw new Error('Design not found');
  
  const updated = await regenerateTeachingDesign({ design, instruction, aiCall });
  designCache.set(designId, updated);
  
  return updated;
}
```

### 2. 并行批量修改
```typescript
// 使用 Promise.all 并行处理独立的修改
const updates = await Promise.all([
  regenerateSlide(design, 0, 'instruction1', aiCall),
  regenerateSlide(design, 2, 'instruction2', aiCall),
  regenerateSlide(design, 4, 'instruction3', aiCall),
]);
```

### 3. 增量更新
```typescript
// 只返回修改的 slide，减少数据传输
interface RegenerationResult {
  slideIndex: number;
  updatedSlide: TeachingSlide;
  version: number;
}
```

## 测试用例

### 单元测试示例

```typescript
import { describe, it, expect } from 'vitest';
import { regenerateTeachingDesign } from './teaching-regenerator';

describe('Teaching Regenerator', () => {
  it('should parse "第3页" correctly', async () => {
    const mockAICall = async () => JSON.stringify({
      title: 'New Title',
      keyPoints: [{ content: 'New content', source: 'teacher' }],
    });

    const result = await regenerateTeachingDesign({
      design: mockDesign,
      instruction: '第3页改成新内容',
      aiCall: mockAICall,
    });

    expect(result.slides[2].title).toBe('New Title');
    expect(result.version).toBe(mockDesign.version + 1);
  });

  it('should preserve source tracking', async () => {
    // ... test implementation
  });

  it('should handle invalid page number', async () => {
    await expect(
      regenerateTeachingDesign({
        design: mockDesign,
        instruction: '第100页',
        aiCall: mockAICall,
      })
    ).rejects.toThrow('页面索引超出范围');
  });
});
```

## 未来扩展

### 计划功能
- [ ] 支持修改 procedures（教学环节）
- [ ] 支持修改 objectives（教学目标）
- [ ] 支持全局修改（如"所有页面都增加..."）
- [ ] 支持撤销/重做功能
- [ ] 支持修改历史记录
- [ ] 支持 AI 建议修改方案

### 扩展示例

```typescript
// 未来：支持修改教学环节
await regenerateProcedure({
  design,
  instruction: '第2个环节改成小组讨论',
  aiCall,
});

// 未来：支持全局修改
await regenerateGlobal({
  design,
  instruction: '所有页面都增加互动环节',
  aiCall,
});
```

## 相关文件
- `OpenMAIC/lib/generation/teaching-regenerator.ts` - 核心实现
- `OpenMAIC/lib/types/teaching.ts` - 类型定义
- `OpenMAIC/lib/generation/teaching-outline-generator.ts` - 初始生成器
- `OpenMAIC/lib/generation/json-repair.ts` - JSON 解析工具
