# DOCX 教案生成 - 快速开始

## 5 分钟快速测试

### 1. 启动开发服务器
```bash
cd OpenMAIC
pnpm dev
```

### 2. 访问测试页面
打开浏览器访问：
```
http://localhost:3000/teaching-test
```

### 3. 选择测试场景
点击页面顶部的预设场景按钮，例如：
- "寓言故事《会说话的石头》"
- "星环教育公司"

### 4. 生成教学设计
点击"生成教学设计"按钮，等待生成完成（约 30-60 秒）。

### 5. 导出 Word 教案
生成完成后，点击"导出 Word 教案"按钮，DOCX 文件将自动下载。

### 6. 打开验证
使用 Microsoft Word 或 WPS 打开下载的 DOCX 文件，验证：
- ✅ 文档能正常打开
- ✅ 中文显示正常
- ✅ 包含完整的教案结构
- ✅ 来源标记清晰可见

## 代码集成示例

### 在 React 组件中使用

```typescript
import { useState } from 'react';
import type { TeachingDesign } from '@/lib/types/teaching';

function MyComponent() {
  const [design, setDesign] = useState<TeachingDesign | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportDocx = async () => {
    if (!design) return;

    setExporting(true);
    try {
      const response = await fetch('/api/generate-docx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teachingDesign: design,
        }),
      });

      if (!response.ok) {
        throw new Error('DOCX generation failed');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${design.title}_教案.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败');
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExportDocx}
      disabled={!design || exporting}
    >
      {exporting ? '导出中...' : '导出 Word 教案'}
    </button>
  );
}
```

### 在 Node.js 中使用

```typescript
import { generateDocxFromTeachingDesign } from '@/lib/generation/docx-generator';
import { writeFile } from 'fs/promises';

async function exportToFile(design: TeachingDesign, outputPath: string) {
  const buffer = await generateDocxFromTeachingDesign(design);
  await writeFile(outputPath, buffer);
  console.log(`DOCX saved to ${outputPath}`);
}

// 使用示例
await exportToFile(myDesign, './output/教案.docx');
```

## API 测试（使用 curl）

```bash
curl -X POST http://localhost:3000/api/generate-docx \
  -H "Content-Type: application/json" \
  -d '{
    "teachingDesign": {
      "id": "test-1",
      "title": "测试课题",
      "subject": "数学",
      "gradeLevel": "初一",
      "duration": 45,
      "objectives": {
        "knowledge": ["目标1"],
        "skills": ["目标2"],
        "attitude": []
      },
      "keyPoints": ["重点1"],
      "difficulties": ["难点1"],
      "slides": [
        {
          "id": "slide-1",
          "order": 1,
          "title": "课程导入",
          "keyPoints": [
            {
              "content": "知识点1",
              "source": "teacher"
            }
          ],
          "contentBlocks": []
        }
      ],
      "procedures": [],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "version": 1
    }
  }' \
  --output test.docx
```

## 常见问题

### Q: DOCX 文件无法打开？
A: 确保使用 Microsoft Word 2010+ 或 WPS Office。如果仍然无法打开，检查文件大小是否为 0。

### Q: 中文显示乱码？
A: 这不应该发生。如果出现，请检查：
1. 使用的 Word 版本
2. 系统语言设置
3. 文件编码

### Q: 来源标记没有显示？
A: 检查 `TeachingDesign` 中的 `keyPoints` 是否包含 `source` 字段：
```typescript
{
  content: "知识点",
  source: "knowledge",
  ragChunkId: "xxx"
}
```

### Q: 生成速度慢？
A: DOCX 生成通常很快（< 1 秒）。如果慢，可能是：
1. 网络问题（检查 API 请求）
2. 服务器负载高
3. TeachingDesign 数据量特别大

### Q: 如何自定义样式？
A: 目前使用固定样式。如需自定义，修改 `docx-generator.ts` 中的样式参数。

## 下一步

- 查看 [完整使用指南](./DOCX_GENERATOR_GUIDE.md)
- 了解 [实现细节](./DOCX_IMPLEMENTATION_SUMMARY.md)
- 学习 [三源融合系统](./THREE_SOURCE_FUSION_GUIDE.md)

## 技术支持

如遇问题，请检查：
1. 浏览器控制台日志
2. 服务器日志（查找 `[DocxGenerator]` 标记）
3. 网络请求状态

## 成功标志

如果看到以下内容，说明一切正常：
- ✅ 浏览器自动下载 DOCX 文件
- ✅ 文件名格式：`[课题名称]_教案.docx`
- ✅ 文件大小：20-200 KB（典型）
- ✅ Word 能正常打开并显示内容
- ✅ 来源标记清晰可见

祝使用愉快！🎉
