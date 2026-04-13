# DOCX 教案生成优化总结

## 优化内容

### 1. 统一来源标注格式 ✅
- `knowledge` → `（来自知识库片段X）`（去掉空格）
- `material` → `（来自参考资料）`
- `teacher` → `（教师设计）`
- 添加 `deduplicateSourceLabels()` 函数，避免同一来源重复标注
- **修复重复标注问题**：添加 `hasSourceLabel()` 检测，如果内容已包含来源标注则不再添加

### 2. 优化文档层级 ✅
- **标题**：`HeadingLevel.TITLE`（居中，大间距）
- **一级章节**：`HeadingLevel.HEADING_2`（一、二、三...）
- **环节标题**：`HeadingLevel.HEADING_3`（环节1、环节2...）
- **固定标签**：使用【】包裹，加粗显示
  - 【教学目的】
  - 【教学内容】
  - 【教师讲解】
  - 【教师活动】
  - 【学生活动】
  - 【设计意图】

### 3. 优化编号样式 ✅
- **教学目标**：使用 `createNumberedItem()` 生成有序编号（1. 2. 3.）
- **教学内容/作业**：使用统一的 `createBulletItem()` 列表样式
- **配置编号系统**：添加 `numbering.config` 避免混乱编号

### 4. 优化版式 ✅
- **段落间距**：统一设置 before/after 间距
- **行间距**：1.5倍行距（line: 360）
- **中文字体**：统一使用"宋体"
- **标题加粗**：通过 HeadingLevel 自动加粗
- **缩进优化**：从 0.5 英寸调整为 0.3 英寸，更符合中文排版

### 5. 层级结构对比

#### 优化前
```
标题 (TITLE)
├─ 一、教学目标 (HEADING_1)
│  ├─ 1. 知识与技能 (加粗段落)
│  └─ 2. 过程与方法 (加粗段落)
├─ 二、教学重难点 (HEADING_1)
│  ├─ 教学重点： (加粗段落)
│  └─ 教学难点： (加粗段落)
└─ 三、教学过程 (HEADING_1)
   └─ 环节 1：... (HEADING_2)
```

#### 优化后
```
标题 (TITLE - 居中)
├─ 一、教学目标 (HEADING_2)
│  ├─ 知识与技能 (HEADING_3)
│  │  └─ 1. ... (有序编号)
│  └─ 过程与方法 (HEADING_3)
│     └─ 1. ... (有序编号)
├─ 二、教学重难点 (HEADING_2)
│  ├─ 教学重点 (HEADING_3)
│  └─ 教学难点 (HEADING_3)
└─ 三、教学过程 (HEADING_2)
   └─ 环节1：... (HEADING_3)
      ├─ 【教学目的】... (加粗标签)
      ├─ 【教学内容】(加粗标签)
      └─ 【教师讲解】(加粗标签)
```

## 核心改进

### 重复标注问题修复
**问题**：内容显示两次来源标注
```
梳理工具：...（来自知识库片段2）（来自知识库片段rag_002）
```

**原因**：
1. LLM 生成时已在 `content` 中添加标注（如"来自知识库片段2"）
2. `docx-generator` 又根据 `source` 和 `ragChunkId` 再次添加标注

**解决方案**：
```typescript
function hasSourceLabel(content: string): boolean {
  return /[（(]来自知识库片段\d+[）)]|[（(]来自参考资料[）)]|[（(]教师设计[）)]/.test(content);
}

function formatSourceLabel(content: string, source, ragChunkId): string {
  // 如果内容已包含来源标注，不再添加
  if (hasSourceLabel(content)) return '';
  
  // 对于 knowledge 类型，LLM 已添加编号标注，不再重复
  if (source === 'knowledge') return '';
  
  // 只为 teacher 和 material 添加标注（如果内容中没有）
  return source === 'teacher' ? '（教师设计）' : '（来自参考资料）';
}
```

### 来源去重逻辑
```typescript
function deduplicateSourceLabels(items) {
  const seen = new Set<string>();
  return items.map(item => {
    const key = `${item.source}-${item.ragChunkId || ''}`;
    if (seen.has(key) && item.source) {
      return { ...item, source: undefined }; // 移除重复来源
    }
    if (item.source) seen.add(key);
    return item;
  });
}
```

### 统一间距配置
```typescript
// 标题间距
TITLE: { before: 0, after: 360 }
HEADING_2: { before: 360, after: 180 }
HEADING_3: { before: 180, after: 100 }

// 段落间距
default: { before: 100, after: 100, line: 360 }
```

### 编号系统
```typescript
numbering: {
  config: [{
    reference: 'default-numbering',
    levels: [
      { level: 0, format: DECIMAL, text: '%1.' },
      { level: 1, format: DECIMAL, text: '%1.%2.' }
    ]
  }]
}
```

## 保持不变 ✅
- ❌ 未修改 `TeachingDesign` 数据结构
- ❌ 未新增 LLM 生成链路
- ❌ 未改动核心内容生成逻辑
- ✅ 仅优化 `docx-generator.ts` 输出格式

## 测试建议

1. 生成一份完整教案，检查：
   - 来源标注是否统一且无重复
   - 层级结构是否清晰（2级章节 + 3级小节）
   - 编号是否正确（目标用数字，内容用列表）
   - 版式是否美观（间距、字体、加粗）

2. 对比优化前后的 DOCX 文件：
   - 打开 Word 查看大纲视图
   - 检查样式是否一致
   - 确认可读性提升

## 文件修改
- `OpenMAIC/lib/generation/docx-generator.ts`（约 400 行）
