# DOCX 教案生成器使用指南

## 概述

DOCX 教案生成器将 `TeachingDesign` 数据结构直接转换为格式化的 Word 文档（.docx），无需额外的 LLM 调用。生成的教案保留了三源融合的来源标记，确保内容可追溯。

## 功能特点

### 1. 直接映射
- 不使用 LLM 生成新内容
- 直接将 `TeachingDesign` 结构映射为 Word 文档
- 保证 PPT 与 DOCX 内容完全一致

### 2. 来源标记保留
- `teacher` → （教师设计）
- `material` → （来自参考资料）
- `knowledge` → （来自知识库片段 xxx）

### 3. 中文支持
- 完整的中文字符支持
- 标准的教案格式
- 清晰的层级结构

### 4. 专业格式
- 使用 Heading 层级
- 表格展示基本信息
- 项目符号列表
- 合理的段落间距

## 文档结构

### 标题
- 课题名称（居中，Title 样式）

### 基本信息表格
| 课题 | [课题名称] | 学科 | [学科] |
|------|-----------|------|--------|
| 年级 | [年级]     | 课时 | [X 分钟] |

### 一、教学目标
1. 知识与技能
   - 目标 1
   - 目标 2
2. 过程与方法
   - 目标 1
   - 目标 2
3. 情感态度与价值观
   - 目标 1
   - 目标 2

### 二、教学重难点
教学重点：
- 重点 1
- 重点 2

教学难点：
- 难点 1
- 难点 2

### 三、教学过程
#### 环节 1：[Slide 标题]
教学目的：[Slide 描述]

教学内容：
- 知识点 1（来源标记）
- 知识点 2（来源标记）

教师讲解：
[Narration 内容]

#### 环节 2：[Slide 标题]
...

### 四、教学环节详细设计（可选）
如果 `procedures` 存在，则生成此部分：

#### 1. [环节名称]（X 分钟）
教师活动：
[教师活动描述]

学生活动：
[学生活动描述]

设计意图：
[设计意图]

### 五、课后作业（可选）
- 作业 1
- 作业 2

### 六、板书设计（可选）
[板书设计内容]

### 七、教学反思（可选）
[教学反思内容]

## API 使用

### 端点
```
POST /api/generate-docx
```

### 请求体
```typescript
{
  teachingDesign: TeachingDesign
}
```

### 响应
- Content-Type: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Content-Disposition: `attachment; filename="[课题名称]_教案.docx"`
- 返回 DOCX 文件的二进制数据

### 示例（JavaScript/TypeScript）
```typescript
const response = await fetch('/api/generate-docx', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    teachingDesign: design,
  }),
});

if (response.ok) {
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${design.title}_教案.docx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
```

## 代码结构

### 核心文件
- `lib/generation/docx-generator.ts` - DOCX 生成逻辑
- `app/api/generate-docx/route.ts` - API 路由

### 主要函数

#### `generateDocxFromTeachingDesign(design: TeachingDesign): Promise<Buffer>`
生成 DOCX 文件的主函数。

**参数**：
- `design`: TeachingDesign 对象

**返回**：
- `Promise<Buffer>`: DOCX 文件的二进制数据

**流程**：
1. 创建文档标题
2. 生成基本信息表格
3. 生成教学目标部分
4. 生成教学重难点部分
5. 生成教学过程部分（从 slides）
6. 生成教学环节详细设计（从 procedures，可选）
7. 生成课后作业（可选）
8. 生成板书设计（可选）
9. 生成教学反思（可选）
10. 打包为 DOCX Buffer

### 辅助函数

#### `formatSourceLabel(source, ragChunkId): string`
格式化来源标记。

#### `createHeading(text, level): Paragraph`
创建标题段落。

#### `createParagraph(text, options): Paragraph`
创建普通段落。

#### `createBulletItem(text, level): Paragraph`
创建项目符号列表项。

#### `createBasicInfoTable(design): Table`
创建基本信息表格。

## 来源标记示例

### 教师设计
```
- 通过本课学习，学生能够理解XX概念（教师设计）
```

### 参考资料
```
- 根据参考资料，XX公司成立于2020年3月15日（来自参考资料）
```

### 知识库
```
- 小鹿阿米：性格好奇、善良（来自知识库片段 69d9f577）
```

## 测试

### 测试页面
访问 `/teaching-test` 页面进行测试。

### 测试步骤
1. 选择预设场景或手动输入教学需求
2. 可选：上传参考资料（PDF/图片）
3. 点击"生成教学设计"
4. 等待生成完成
5. 点击"导出 Word 教案"
6. 下载并打开 DOCX 文件验证

### 验证要点
- [ ] 文档能正常打开
- [ ] 中文显示正常
- [ ] 标题层级清晰
- [ ] 表格格式正确
- [ ] 来源标记完整
- [ ] 内容与 PPT 一致
- [ ] 项目符号正常显示
- [ ] 段落间距合理

## 依赖库

### docx
- **版本**: ^9.6.1
- **用途**: 生成 Word 文档
- **文档**: https://docx.js.org/

### 主要 API
- `Document`: 文档对象
- `Packer`: 打包为 Buffer
- `Paragraph`: 段落
- `TextRun`: 文本运行
- `Table`: 表格
- `HeadingLevel`: 标题级别
- `AlignmentType`: 对齐方式

## 性能考虑

### 生成速度
- 纯数据映射，无 LLM 调用
- 通常在 100-500ms 内完成
- 不受网络延迟影响

### 文件大小
- 典型教案：20-50 KB
- 包含大量内容：50-200 KB
- 远小于 PPT 文件

### 内存使用
- 在内存中构建文档
- 生成 Buffer 后立即返回
- 无需临时文件

## 错误处理

### 常见错误

#### 1. 缺少必需字段
```json
{
  "error": "Invalid teachingDesign: missing title or slides",
  "status": 400
}
```

**解决**：确保 `TeachingDesign` 包含 `title` 和至少一个 `slide`。

#### 2. DOCX 生成失败
```json
{
  "error": "Failed to generate DOCX",
  "details": "[具体错误信息]",
  "status": 500
}
```

**解决**：检查日志，查看具体错误原因。

### 日志
使用 `DocxGenerator` logger 记录关键信息：
```typescript
log.info('Generating DOCX from teaching design:', { ... });
log.info('DOCX generated successfully:', { ... });
log.error('Failed to generate DOCX:', error);
```

## 扩展功能

### 未来可能的增强

1. **样式自定义**
   - 支持自定义字体、颜色
   - 支持自定义页眉页脚
   - 支持自定义页边距

2. **图片嵌入**
   - 将 PPT 中的图片嵌入 Word
   - 支持图片说明和编号

3. **表格增强**
   - 支持更复杂的表格布局
   - 支持表格样式自定义

4. **模板系统**
   - 支持多种教案模板
   - 支持学校/机构自定义模板

5. **批量导出**
   - 支持批量生成多个教案
   - 支持打包下载

## 与 PPT 生成的对比

| 特性 | PPT 生成 | DOCX 生成 |
|------|---------|-----------|
| 生成方式 | LLM + 布局计算 | 直接映射 |
| 生成时间 | 较长（分钟级） | 很快（秒级） |
| 内容一致性 | 可能有差异 | 完全一致 |
| 来源标记 | 隐式 | 显式 |
| 可编辑性 | 较低 | 高 |
| 文件大小 | 较大 | 较小 |
| 适用场景 | 课堂展示 | 教案存档、打印 |

## 最佳实践

### 1. 内容完整性
确保 `TeachingDesign` 包含完整的信息：
- 教学目标
- 教学重难点
- Slide 内容和描述
- Narration（讲解词）

### 2. 来源标记
在生成 `TeachingDesign` 时正确标记来源：
```typescript
{
  content: "知识点内容",
  source: "knowledge",
  ragChunkId: "69d9f5772e25dfad1d1217ae"
}
```

### 3. 描述性内容
为每个 Slide 提供清晰的 `description`：
```typescript
{
  title: "故事情节梳理",
  description: "通过梳理故事发展顺序，帮助学生理解故事结构",
  keyPoints: [...]
}
```

### 4. 错误处理
在客户端妥善处理错误：
```typescript
try {
  const response = await fetch('/api/generate-docx', { ... });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details);
  }
  // 处理成功响应
} catch (error) {
  console.error('DOCX export failed:', error);
  alert(`导出失败：${error.message}`);
}
```

## 相关文件

- `OpenMAIC/lib/generation/docx-generator.ts` - 生成器实现
- `OpenMAIC/app/api/generate-docx/route.ts` - API 路由
- `OpenMAIC/app/teaching-test/page.tsx` - 测试页面
- `OpenMAIC/lib/types/teaching.ts` - 类型定义

## 参考资料

- [docx 库文档](https://docx.js.org/)
- [Office Open XML 规范](https://www.ecma-international.org/publications-and-standards/standards/ecma-376/)
- [三源融合系统指南](./THREE_SOURCE_FUSION_GUIDE.md)
