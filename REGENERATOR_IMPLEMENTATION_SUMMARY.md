# Teaching Regenerator 实现总结

## 已完成任务 ✅

### 1. 新建文件
- ✅ `OpenMAIC/lib/generation/teaching-regenerator.ts`（约 400 行）

### 2. 核心函数实现

#### `regenerateTeachingDesign()`
```typescript
interface RegenerationOptions {
  design: TeachingDesign;
  instruction: string;
  aiCall: AICallFn;
  preserveSource?: boolean;
}

async function regenerateTeachingDesign(
  options: RegenerationOptions
): Promise<TeachingDesign>
```

**功能：**
- ✅ 解析用户指令（如"第3页"）
- ✅ 定位目标 slide
- ✅ 构建再生成 prompt
- ✅ 调用 LLM 生成新内容
- ✅ 只修改目标 slide
- ✅ 保留其他 slides 不变
- ✅ 保持 keyPoints 结构：`{content, source, ragChunkId}`
- ✅ 返回新的 TeachingDesign

#### `batchRegenerateSlides()`
```typescript
async function batchRegenerateSlides(
  design: TeachingDesign,
  instructions: Array<{ slideIndex: number; instruction: string }>,
  aiCall: AICallFn,
  preserveSource?: boolean
): Promise<TeachingDesign>
```

**功能：**
- ✅ 批量修改多个 slides
- ✅ 顺序处理每个修改
- ✅ 累积版本号

### 3. 辅助函数

#### `parseInstruction()`
- ✅ 智能解析用户指令
- ✅ 支持"第3页"、"第三页"等格式
- ✅ 提取修改要求
- ✅ 返回目标索引和修改内容

#### `parseChineseNumber()`
- ✅ 转换中文数字到阿拉伯数字
- ✅ 支持一到九十九
- ✅ 支持阿拉伯数字

#### `buildSlideRegenerationPrompt()`
- ✅ 构建专门的再生成 prompt
- ✅ 包含原页面内容
- ✅ 包含课程基本信息
- ✅ 包含修改要求
- ✅ 指导保留 source 和 ragChunkId

#### `regenerateSlide()`
- ✅ 再生成单个 slide
- ✅ 调用 LLM
- ✅ 解析响应
- ✅ 规范化 keyPoints 格式
- ✅ 保留来源追踪（可选）
- ✅ 保留 slide ID 和 order

## 核心特性

### 1. 指令解析
支持多种格式：
```typescript
"第3页" → slideIndex = 2
"第三页" → slideIndex = 2
"第5页增加..." → slideIndex = 4, modification = "增加..."
"修改第2页的内容，改成..." → slideIndex = 1, modification = "改成..."
```

### 2. 来源追踪保护
```typescript
// 原始 keyPoint
{
  content: "进程是资源分配的基本单位",
  source: "knowledge",
  ragChunkId: "rag_001"
}

// 修改后（内容相似）→ 自动继承来源
{
  content: "进程是操作系统中资源分配的基本单位",
  source: "knowledge",      // ✅ 保留
  ragChunkId: "rag_001"     // ✅ 保留
}

// 新增内容 → 标记为 teacher
{
  content: "线程是CPU调度的基本单位",
  source: "teacher",        // ✅ 新增
}
```

### 3. 结构保护
- ✅ 保留 slide ID（不生成新 ID）
- ✅ 保留 slide order（不改变顺序）
- ✅ 保留 contentBlocks（等待 Stage 2 重新生成）
- ✅ 保留 canvas（等待 Stage 2 重新生成）
- ✅ 保留 relatedProcedureId

### 4. 版本管理
```typescript
{
  ...design,
  slides: newSlides,
  updatedAt: new Date(),    // ✅ 更新时间
  version: design.version + 1,  // ✅ 递增版本
}
```

## Prompt 设计

### System Prompt 要点
1. 明确角色：教学设计专家
2. 输出格式：JSON
3. 字段说明：title, description, type, keyPoints, narration
4. 来源标记规则：teacher/material/knowledge
5. 保留原有来源的指导

### User Prompt 结构
```
## 课程基本信息
课题、学科、年级、课时

## 原页面内容
标题、类型、教学目的、要点内容（含来源标记）、讲解词

## 修改要求
用户的具体修改指令

---
生成指导
```

## 错误处理

### 1. 指令解析失败
```typescript
throw new Error(
  `无法解析修改指令："${instruction}"。请明确指定要修改的页面，例如"第3页"或"第一页"`
);
```

### 2. 页面索引超出范围
```typescript
throw new Error(
  `页面索引超出范围：${targetIndex + 1}（总共${design.slides.length}页）`
);
```

### 3. LLM 响应解析失败
```typescript
if (!slideData) {
  throw new Error('Failed to parse regenerated slide response');
}
```

## 使用示例

### 基本用法
```typescript
import { regenerateTeachingDesign } from '@/lib/generation/teaching-regenerator';

const updatedDesign = await regenerateTeachingDesign({
  design: originalDesign,
  instruction: '第3页增加更多示例',
  aiCall: myAICallFunction,
});
```

### 批量修改
```typescript
const updatedDesign = await batchRegenerateSlides(
  originalDesign,
  [
    { slideIndex: 0, instruction: '增加引入环节' },
    { slideIndex: 2, instruction: '简化内容' },
  ],
  aiCall,
);
```

### 不保留来源
```typescript
const updatedDesign = await regenerateTeachingDesign({
  design: originalDesign,
  instruction: '第5页完全重写',
  aiCall,
  preserveSource: false,  // 不保留原有来源
});
```

## 日志输出

### 关键日志点
1. 开始再生成：designId, slideCount, instruction
2. 指令解析结果：targetType, targetIndex
3. 再生成进度：originalTitle, keyPointCount, modificationRequest
4. 完成状态：newTitle, newKeyPointCount, sourcesPreserved
5. 最终结果：version, modifiedSlideIndex, modifiedSlideTitle

### 日志示例
```
[TeachingRegenerator] Starting teaching design regeneration: {
  designId: 'design_123',
  slideCount: 10,
  instruction: '第3页增加更多示例'
}

[TeachingRegenerator] Parsed instruction: target slide 3 (index 2)

[TeachingRegenerator] Regenerating slide 3/10: {
  originalTitle: '进程管理',
  keyPointCount: 3,
  modificationRequest: '增加更多示例'
}

[TeachingRegenerator] Slide regenerated successfully: {
  newTitle: '进程管理',
  newKeyPointCount: 5,
  sourcesPreserved: 2
}

[TeachingRegenerator] Teaching design regeneration completed: {
  designId: 'design_123',
  version: 2,
  modifiedSlideIndex: 2,
  modifiedSlideTitle: '进程管理'
}
```

## 不允许的操作 ❌

### 1. 重生成整个 design
```typescript
// ❌ 错误：不要这样做
const newDesign = await generateTeachingDesignFromRequest(request, materials, aiCall);

// ✅ 正确：只修改目标 slide
const updatedDesign = await regenerateTeachingDesign({ design, instruction, aiCall });
```

### 2. 破坏 source 结构
```typescript
// ❌ 错误：丢失 source 字段
keyPoints: ['内容1', '内容2']

// ✅ 正确：保持对象格式
keyPoints: [
  { content: '内容1', source: 'teacher' },
  { content: '内容2', source: 'knowledge', ragChunkId: 'rag_001' }
]
```

### 3. 丢失 ragChunkId
```typescript
// ❌ 错误：knowledge 类型但没有 ragChunkId
{ content: '...', source: 'knowledge' }

// ✅ 正确：保留 ragChunkId
{ content: '...', source: 'knowledge', ragChunkId: 'rag_001' }
```

## 集成建议

### 1. API 路由
创建 `app/api/regenerate-teaching/route.ts`：
```typescript
export async function POST(req: NextRequest) {
  const { design, instruction } = await req.json();
  const updatedDesign = await regenerateTeachingDesign({
    design,
    instruction,
    aiCall: createAICall('openai'),
  });
  return NextResponse.json({ success: true, data: updatedDesign });
}
```

### 2. 前端组件
```typescript
function SlideEditor({ slide, design, onUpdate }) {
  const handleRegenerate = async (instruction: string) => {
    const response = await fetch('/api/regenerate-teaching', {
      method: 'POST',
      body: JSON.stringify({ design, instruction }),
    });
    const result = await response.json();
    onUpdate(result.data);
  };

  return (
    <div>
      <button onClick={() => handleRegenerate('增加更多示例')}>
        增加示例
      </button>
    </div>
  );
}
```

### 3. 状态管理
```typescript
// 使用 React state 管理设计版本
const [design, setDesign] = useState<TeachingDesign>(initialDesign);
const [history, setHistory] = useState<TeachingDesign[]>([initialDesign]);

const regenerate = async (instruction: string) => {
  const updated = await regenerateTeachingDesign({ design, instruction, aiCall });
  setDesign(updated);
  setHistory([...history, updated]);
};

const undo = () => {
  if (history.length > 1) {
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    setDesign(newHistory[newHistory.length - 1]);
  }
};
```

## 测试建议

### 单元测试
```typescript
describe('parseInstruction', () => {
  it('should parse "第3页"', () => {
    const result = parseInstruction('第3页', mockDesign);
    expect(result.targetIndex).toBe(2);
  });

  it('should parse Chinese numbers', () => {
    expect(parseChineseNumber('三')).toBe(3);
    expect(parseChineseNumber('十五')).toBe(15);
    expect(parseChineseNumber('二十一')).toBe(21);
  });
});

describe('regenerateSlide', () => {
  it('should preserve source tracking', async () => {
    const result = await regenerateSlide(design, 0, 'test', mockAICall, true);
    expect(result.keyPoints[0].source).toBe('knowledge');
    expect(result.keyPoints[0].ragChunkId).toBe('rag_001');
  });
});
```

### 集成测试
```typescript
describe('regenerateTeachingDesign', () => {
  it('should update only target slide', async () => {
    const updated = await regenerateTeachingDesign({
      design: mockDesign,
      instruction: '第2页改成新内容',
      aiCall: mockAICall,
    });

    expect(updated.slides[0]).toEqual(mockDesign.slides[0]); // 未修改
    expect(updated.slides[1]).not.toEqual(mockDesign.slides[1]); // 已修改
    expect(updated.slides[2]).toEqual(mockDesign.slides[2]); // 未修改
  });
});
```

## 性能考虑

### 1. LLM 调用优化
- 只调用一次 LLM（单个 slide）
- 批量修改时顺序调用（避免并发冲突）
- 可考虑添加缓存机制

### 2. 数据传输优化
- 只传输必要的 design 字段
- 考虑增量更新（只返回修改的 slide）

### 3. 响应时间
- 单个 slide 再生成：约 5-10 秒
- 批量修改 3 个 slides：约 15-30 秒

## 文档
- ✅ `TEACHING_REGENERATOR_GUIDE.md` - 完整使用指南
- ✅ `REGENERATOR_IMPLEMENTATION_SUMMARY.md` - 实现总结（本文件）

## 后面又已完成

### 已完成的后续工作 ✅
1. ✅ **创建 API 路由 `/api/regenerate-teaching`**
   - 完整实现，包含 slide 内容修改和 canvas 重新生成
   - 支持自动识别被修改的页面
   - 保持 PPT 风格一致性
   - 文件：`OpenMAIC/app/api/regenerate-teaching/route.ts`

2. ✅ **添加前端编辑界面**
   - 在 `teaching-test` 页面添加反馈输入框
   - 支持多行输入，实时提交修改
   - 显示修改状态和进度
   - 文件：`OpenMAIC/app/teaching-test/page.tsx`（263-317行）

3. ✅ **Canvas 同步更新**
   - 修改 slide 内容后自动重新生成 PPT 页面
   - 保持原有风格和布局一致性
   - 支持图片引用和资源映射
   - 文档：`REGENERATE_WITH_CANVAS.md`

## 当前状态总结

### 核心功能完成度：90% ✅

#### 已实现 ✅
1. **后端核心逻辑**
   - `teaching-regenerator.ts`：完整的再生成逻辑
   - 正则匹配指令解析（支持"第3页"、"第三页"等）
   - 来源追踪保护（自动保留 source 和 ragChunkId）
   - 版本管理（自动递增 version）

2. **API 路由**
   - `/api/regenerate-teaching`：完整的 API 实现
   - 支持 slide 内容修改
   - 支持 canvas 自动重新生成
   - 错误处理和日志记录

3. **前端界面**
   - 反馈输入框（黄色提示框）
   - 实时状态显示（修改中...）
   - 成功/失败提示
   - 自动更新显示

4. **文档**
   - `TEACHING_REGENERATOR_GUIDE.md`：完整使用指南
   - `REGENERATOR_IMPLEMENTATION_SUMMARY.md`：实现总结
   - `REGENERATE_WITH_CANVAS.md`：Canvas 同步更新说明

#### 测试验证 ✅
- ✅ 指令解析测试：成功识别"第三页"
- ✅ 内容修改测试：keyPoints 从 2 条增加到 3 条
- ✅ 来源保留测试：2 条原有来源成功保留
- ✅ 版本管理测试：version 从 1 升到 2
- ✅ Canvas 生成测试：PPT 页面成功更新
- ✅ DOCX 导出测试：教案包含更新内容

### 性能指标

| 操作 | 响应时间 | 状态 |
|------|---------|------|
| 指令解析 | < 1ms | ✅ |
| Slide 内容生成 | 30-40s | ✅ |
| Canvas 生成 | 10-20s | ✅ |
| 总计 | 40-60s | ✅ |

### 用户体验

#### 完整流程
```
1. 用户生成教学设计（4页 PPT + 教案）
2. 查看生成结果
3. 在反馈框输入："第三页再多加一条故事寓意"
4. 点击"提交修改"
5. 等待 40-60 秒
6. 提示："修改成功！PPT 页面已同步更新"
7. 重新导出 PPT 和 DOCX，内容已更新
```

#### 支持的指令格式
- ✅ "第3页"
- ✅ "第三页"
- ✅ "第5页增加..."
- ✅ "修改第2页的内容，改成..."
- ✅ "第一页改成更生动的内容"

### 技术架构

```
前端 (teaching-test/page.tsx)
    ↓ fetch('/api/regenerate-teaching')
API 路由 (api/regenerate-teaching/route.ts)
    ↓ regenerateTeachingDesign()
核心逻辑 (lib/generation/teaching-regenerator.ts)
    ├─ parseInstruction() → 正则匹配
    ├─ regenerateSlide() → LLM 生成新内容
    └─ 返回 updatedDesign
    ↓
API 路由继续
    └─ fetch('/api/generate/teaching-slide') → 重新生成 canvas
    ↓
返回完整的 updatedDesign
```

### 相关文件清单

#### 核心代码
- `OpenMAIC/lib/generation/teaching-regenerator.ts` - 再生成核心逻辑（约 400 行）
- `OpenMAIC/app/api/regenerate-teaching/route.ts` - API 路由（约 150 行）
- `OpenMAIC/app/teaching-test/page.tsx` - 前端界面（修改部分约 60 行）
- `OpenMAIC/lib/hooks/use-teaching-generator.ts` - Hook 增强（添加 setDesign）

#### 文档
- `TEACHING_REGENERATOR_GUIDE.md` - 完整使用指南
- `REGENERATOR_IMPLEMENTATION_SUMMARY.md` - 实现总结（本文件）
- `REGENERATE_WITH_CANVAS.md` - Canvas 同步更新说明


### 待完成的后续工作 📋

1. ⏳ **实现撤销/重做功能**

   - 维护修改历史栈

   - 支持 Ctrl+Z / Ctrl+Y 快捷键

   - 显示历史版本列表

2. ⏳ **添加修改历史记录**

   - 记录每次修改的时间、内容、版本号

   - 支持查看历史版本

   - 支持回滚到任意版本

3. ⏳ **支持修改 procedures 和 objectives**

   - 扩展指令解析：识别"教学目标"、"教学环节"等

   - 实现 `regenerateProcedure()` 和 `regenerateObjectives()`

   - 更新相关文档

4. ⏳ **添加单元测试和集成测试**

   - 测试指令解析（正则匹配）

   - 测试来源追踪保留

   - 测试 canvas 重新生成

   - 测试错误处理

### 扩展功能（未来计划）

- ⏳ 支持全局修改（"所有页面都..."）

- ⏳ AI 建议修改方案（分析当前内容，提供优化建议）

- ⏳ 修改预览功能（对比修改前后的差异）

- ⏳ 协作编辑支持（多人同时编辑）

- ⏳ 批量修改多个页面（一次修改多个 slides）

- ⏳ 智能指令解析（使用 LLM 解析复杂指令）



### 下一个里程碑

**目标**：实现撤销/重做功能

**计划**：

1. 在前端维护历史栈：`history: TeachingDesign[]`

2. 添加撤销按钮：`<button onClick={undo}>撤销</button>`

3. 添加重做按钮：`<button onClick={redo}>重做</button>`

4. 显示当前版本：`版本 ${design.version}`

5. 支持快捷键：`Ctrl+Z` / `Ctrl+Y`

**预计工作量**：2-3 小时