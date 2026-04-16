# 修复图片显示问题

## 问题分析

根据日志：
```
GET /teaching-design/gen_img_1 404
GET /teaching-design/gen_img_2 404
```

说明：
1. ✅ 幻灯片中使用了占位符 `gen_img_1` 和 `gen_img_2`
2. ❌ 图片生成任务没有启动或图片还没生成完成

## 可能的原因

### 原因 1：大纲生成时没有包含 mediaGenerations

检查方法：在浏览器 Console 中运行
```javascript
const design = JSON.parse(localStorage.getItem('teaching-design-draft'));
design.slides.forEach((slide, i) => {
  console.log(`Slide ${i + 1}:`, {
    title: slide.title,
    hasMediaGenerations: !!(slide.mediaGenerations && slide.mediaGenerations.length > 0),
    mediaGenerations: slide.mediaGenerations
  });
});
```

如果 `hasMediaGenerations` 都是 `false`，说明大纲生成时没有生成图片请求。

**解决方法**：
- 检查服务器日志中是否有 "Image generation enabled: true"
- 如果没有，说明 `enableImageGeneration` 没有正确传递

### 原因 2：媒体编排器没有启动

检查方法：查看服务器日志中是否有
```
[TeachingGenerator] Image generation enabled, starting media generation in background
[TeachingGenerator] Launching media generation for X slides with media requests
```

如果没有这些日志，说明媒体编排器没有启动。

**解决方法**：
1. 检查 `use-teaching-generator.ts` 中的逻辑
2. 确认 `generateMediaForOutlines` 被调用

### 原因 3：图片生成失败或还在进行中

检查方法：
1. 查看页面顶部是否有 "🎨 图片生成进度" 区域
2. 在浏览器 Console 中检查任务状态（如果可用）

## 快速修复方案

### 方案 1：手动触发图片生成（推荐）

在浏览器 Console 中运行：

```javascript
// 1. 获取设计对象
const design = JSON.parse(localStorage.getItem('teaching-design-draft'));

// 2. 手动创建图片生成请求
const imageRequests = [
  {
    type: 'image',
    prompt: 'A colorful diagram comparing FCFS and SJF scheduling algorithms with Gantt charts',
    elementId: 'gen_img_1',
    aspectRatio: '16:9'
  },
  {
    type: 'image',
    prompt: 'A circular diagram illustrating Round Robin scheduling with time quantum',
    elementId: 'gen_img_2',
    aspectRatio: '16:9'
  }
];

// 3. 逐个生成图片
async function generateImages() {
  for (const req of imageRequests) {
    console.log(`生成 ${req.elementId}...`);
    
    const response = await fetch('/api/generate/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-image-provider': 'qwen-image',
        'x-image-model': 'qwen-image-plus',
      },
      body: JSON.stringify({
        prompt: req.prompt,
        aspectRatio: req.aspectRatio,
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${req.elementId} 生成成功:`, data.result.url);
      
      // 下载图片并存储到 IndexedDB
      const imageBlob = await fetch(data.result.url).then(r => r.blob());
      const objectUrl = URL.createObjectURL(imageBlob);
      
      // 更新 store（如果可用）
      if (typeof useMediaGenerationStore !== 'undefined') {
        useMediaGenerationStore.getState().markDone(req.elementId, objectUrl);
      }
      
      console.log(`✅ ${req.elementId} 已存储，objectUrl:`, objectUrl);
    } else {
      console.error(`❌ ${req.elementId} 生成失败`);
    }
  }
  
  console.log('✅ 所有图片生成完成，请刷新页面查看效果');
}

// 运行生成
generateImages();
```

### 方案 2：重新生成（如果方案1不行）

1. 清除当前设计：
   ```javascript
   localStorage.removeItem('teaching-design-draft');
   ```

2. 刷新页面

3. 重新输入需求并生成

### 方案 3：检查并修复代码

如果上述方案都不行，需要检查代码：

1. **检查大纲生成是否包含 mediaGenerations**
   
   在 `teaching-outline-generator.ts` 中添加日志：
   ```typescript
   console.log('Image generation enabled:', imageEnabled);
   console.log('Generated design:', JSON.stringify(design, null, 2));
   ```

2. **检查媒体编排器是否被调用**
   
   在 `use-teaching-generator.ts` 中添加日志：
   ```typescript
   console.log('Checking media generation...');
   console.log('request.enableImageGeneration:', request.enableImageGeneration);
   console.log('design.slides:', design.slides.map(s => ({
     title: s.title,
     hasMedia: !!(s.mediaGenerations && s.mediaGenerations.length > 0)
   })));
   ```

3. **检查图片生成 API 是否正常**
   
   运行测试脚本：
   ```bash
   node test-image-generation.js
   ```

## 临时解决方案：使用 PDF 图片

如果图片生成功能暂时无法使用，可以：

1. 准备一些相关的图片文件
2. 在生成时上传这些图片作为参考资料
3. 系统会使用上传的图片而不是生成新图片

## 验证修复

修复后，应该看到：

1. ✅ 页面顶部显示 "🎨 图片生成进度"
2. ✅ 图片状态从 ⏳ 变为 ✓
3. ✅ 工作区预览显示图片
4. ✅ 导出的 PPT 包含图片
5. ✅ 没有 404 错误

## 下一步

如果问题仍然存在，请提供：
1. 浏览器 Console 的完整日志
2. 服务器终端的完整日志
3. `localStorage.getItem('teaching-design-draft')` 的内容

