# DOCX 重复标注修复验证

## 问题描述
导出的教案内容出现重复来源标注：
```
● 梳理工具：利用'情节梯'按顺序复述故事发展（起因-经过-结果）
  （来自知识库片段2）（来自知识库片段rag_002）
```

## 根本原因

### 数据流分析
1. **LLM 生成阶段**（`teaching-outline-generator.ts`）
   - Prompt 要求：`当 source 为 "knowledge" 时，必须在内容中标注"（来自知识库片段X）"`
   - LLM 输出：
     ```json
     {
       "content": "梳理工具：...（来自知识库片段2）",
       "source": "knowledge",
       "ragChunkId": "rag_002"
     }
     ```

2. **DOCX 生成阶段**（`docx-generator.ts`）
   - 旧逻辑：根据 `source` 和 `ragChunkId` 再次添加标注
   - 结果：`content + formatSourceLabel(source, ragChunkId)`
   - 输出：`"...（来自知识库片段2）（来自知识库片段rag_002）"`

## 修复方案

### 方案选择
❌ **方案A**：修改 LLM prompt，不让它添加标注
- 缺点：需要重新调整 prompt，可能影响生成质量

✅ **方案B**：在 DOCX 生成时检测并避免重复
- 优点：不影响现有生成逻辑，只优化输出格式

### 实现细节

```typescript
// 1. 检测内容是否已包含来源标注
function hasSourceLabel(content: string): boolean {
  return /[（(]来自知识库片段\d+[）)]|[（(]来自参考资料[）)]|[（(]教师设计[）)]/.test(content);
}

// 2. 智能添加标注（避免重复）
function formatSourceLabel(
  content: string,  // 新增参数：用于检测
  source?: 'teacher' | 'material' | 'knowledge',
  ragChunkId?: string
): string {
  // 如果内容已有标注，不再添加
  if (hasSourceLabel(content)) {
    return '';
  }
  
  if (!source) return '';
  
  switch (source) {
    case 'teacher':
      return '（教师设计）';
    case 'material':
      return '（来自参考资料）';
    case 'knowledge':
      // LLM 已添加编号标注，不再重复
      return '';
    default:
      return '';
  }
}

// 3. 调用时传入 content
const sourceLabel = formatSourceLabel(kp.content, kp.source, kp.ragChunkId);
const fullText = `${kp.content}${sourceLabel}`;
```

## 验证步骤

### 1. 测试用例准备
创建包含三种来源的测试数据：
```typescript
const testKeyPoints = [
  {
    content: "进程是资源分配的基本单位（来自知识库片段1）",
    source: "knowledge",
    ragChunkId: "rag_001"
  },
  {
    content: "线程是CPU调度的基本单位",
    source: "teacher"
  },
  {
    content: "操作系统的核心功能包括进程管理",
    source: "material"
  }
];
```

### 2. 预期输出
```
● 进程是资源分配的基本单位（来自知识库片段1）
● 线程是CPU调度的基本单位（教师设计）
● 操作系统的核心功能包括进程管理（来自参考资料）
```

### 3. 检查点
- [ ] knowledge 类型：只显示一次标注（LLM 生成的编号标注）
- [ ] teacher 类型：如果内容没有标注，添加"（教师设计）"
- [ ] material 类型：如果内容没有标注，添加"（来自参考资料）"
- [ ] 无重复标注
- [ ] 标注格式统一（中文括号，无多余空格）

## 测试命令

```bash
# 1. 重新构建项目
npm run build

# 2. 启动开发服务器
npm run dev

# 3. 访问测试页面
# http://localhost:3000/teaching-test

# 4. 生成教案并导出 DOCX
# 检查导出文件中的来源标注
```

## 回归测试

确保修复不影响其他功能：
- [ ] 教学目标编号正常
- [ ] 教学内容列表样式正常
- [ ] 文档层级结构正确
- [ ] 段落间距和字体正常
- [ ] 基本信息表格正常

## 相关文件
- `OpenMAIC/lib/generation/docx-generator.ts` - 修复重复标注
- `OpenMAIC/lib/generation/teaching-outline-generator.ts` - LLM prompt（未修改）
- `OpenMAIC/lib/generation/teaching-context-builder.ts` - 示例格式（未修改）
