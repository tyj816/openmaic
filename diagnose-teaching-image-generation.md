# 教学设计图片生成诊断指南

## 问题描述

生成了 8 页教学设计 PPT，但没有任何生成的图片插入进去。

## 诊断步骤

### 步骤 1：检查浏览器 Console 日志

打开浏览器开发者工具（F12），在 Console 中查看：

```javascript
// 1. 查看生成的设计对象
const design = JSON.parse(localStorage.getItem('teaching-design-draft'));
console.log('Design:', design);

// 2. 检查每个幻灯片是否有 mediaGenerations
design.slides.forEach((slide, i) => {
  console.log(`\n=== Slide ${i + 1}: ${slide.title} ===`);
  console.log('mediaGenerations:', slide.mediaGenerations);
  console.log('suggestedImageIds:', slide.suggestedImageIds);
  
  // 检查 canvas 中的图片元素
  if (slide.canvas && slide.canvas.elements) {
    const imageElements = slide.canvas.elements.filter(el => el.type === 'image');
    console.log('Image elements:', imageElements.map(el => ({
      id: el.id,
      src: el.src,
      isPlaceholder: el.src.startsWith('gen_')
    })));
  }
});

// 3. 查看媒体生成任务
const tasks = useMediaGenerationStore.getState().tasks;
console.log('\n=== Media Generation Tasks ===');
console.log('Total tasks:', Object.keys(tasks).length);
Object.values(tasks).forEach(task => {
  console.log(`${task.elementId}:`, {
    status: task.status,
    prompt: task.prompt,
    hasObjectUrl: !!task.objectUrl,
    error: task.errorMessage
  });
});
```

### 步骤 2：检查 Network 请求

在 Network 标签中查找：

1. **大纲生成请求**: `POST /api/generate/teaching-outline`
   - 查看 Request Body 中的 `enableImageGeneration` 是否为 `true`
   - 查看 Response 中的 `design.slides[].mediaGenerations` 是否存在

2. **图片生成请求**: `POST /api/generate/image`
   - 如果没有这个请求，说明媒体编排器没有启动
   - 如果有请求但失败，查看错误信息

3. **幻灯片生成请求**: `POST /api/generate/teaching-slide`
   - 查看 Request Body 中是否包含 `mediaGenerations`
   - 查看 Response 中的 `canvas.elements` 是否有使用 `gen_img_*` 的图片元素

### 步骤 3：检查 IndexedDB

1. 打开 Application → Storage → IndexedDB → `openmaic-db`
2. 查看 `mediaFiles` 表
3. 检查是否有存储的图片 blob

### 步骤 4：检查服务器日志

在运行 `npm run dev` 的终端中查找：

```
[TeachingOutlineGen] Image generation enabled: true
[MediaOrchestrator] Launching media generation for X slides
[ImageGeneration API] Generating image: provider=qwen-image
```

## 可能的原因和解决方案

### 原因 1：LLM 没有生成 mediaGenerations

**症状**：
- `design.slides[].mediaGenerations` 为空或不存在
- Console 中没有看到 "Image generation enabled" 日志

**原因**：
- LLM 判断不需要生成图片
- Prompt 中的图片生成策略没有生效
- `enableImageGeneration` 没有正确传递

**解决方案**：

1. 检查 `teaching-outline-generator.ts` 中的日志：
   ```typescript
   console.log('Image generation enabled:', imageEnabled);
   console.log('Media generation policy:', mediaGenerationPolicy);
   ```

2. 使用更明确的教学需求，例如：
   ```
   请设计一个关于"计算机网络 TCP/IP 协议栈"的课件，
   需要包含 OSI 七层模型的示意图、TCP 三次握手的流程图、
   以及数据包封装的过程图。
   ```

3. 检查 API 调用：
   ```javascript
   // 在 teaching-chat/page.tsx 中添加日志
   console.log('Calling teaching-outline API with:', {
     enableImageGeneration: true,
     request: response.teachingRequest
   });
   ```

### 原因 2：媒体编排器没有启动

**症状**：
- `design.slides[].mediaGenerations` 存在
- 但 `useMediaGenerationStore.getState().tasks` 为空
- Network 中没有 `/api/generate/image` 请求

**原因**：
- `generateMediaForOutlines` 没有被调用
- 转换 `TeachingSlide` 到 `SceneOutline` 格式失败
- 媒体编排器抛出异常

**解决方案**：

1. 在 `use-teaching-generator.ts` 中添加详细日志：
   ```typescript
   if (request.enableImageGeneration) {
     console.log('=== Starting Media Generation ===');
     console.log('Total slides:', design.slides.length);
     
     const outlines = design.slides
       .filter((slide: any) => {
         const hasMedia = slide.mediaGenerations && slide.mediaGenerations.length > 0;
         console.log(`Slide "${slide.title}": hasMedia=${hasMedia}`, slide.mediaGenerations);
         return hasMedia;
       })
       .map((slide: any) => ({
         id: slide.id,
         title: slide.title,
         description: slide.description || '',
         type: 'slide' as const,
         keyPoints: slide.keyPoints.map((kp: any) => typeof kp === 'string' ? kp : kp.content),
         mediaGenerations: slide.mediaGenerations,
       }));
     
     console.log('Outlines with media:', outlines.length);
     console.log('Outlines:', outlines);
     
     if (outlines.length > 0) {
       const stageId = `teaching_${design.id}`;
       console.log('Calling generateMediaForOutlines with stageId:', stageId);
       
       generateMediaForOutlines(outlines, stageId).catch(err => {
         console.error('Media generation failed:', err);
       });
     }
   }
   ```

2. 检查 `media-orchestrator.ts` 是否正常工作：
   ```javascript
   // 在浏览器 Console 中手动测试
   import { generateMediaForOutlines } from '@/lib/media/media-orchestrator';
   
   const testOutline = [{
     id: 'test_1',
     title: 'Test Slide',
     description: 'Test',
     type: 'slide',
     keyPoints: ['Test'],
     mediaGenerations: [{
       type: 'image',
       prompt: 'A simple test image',
       elementId: 'gen_img_test',
       aspectRatio: '16:9'
     }]
   }];
   
   generateMediaForOutlines(testOutline, 'test_stage');
   ```

### 原因 3：图片生成失败

**症状**：
- `useMediaGenerationStore.getState().tasks` 中有任务
- 但所有任务状态为 `failed`
- Network 中有 `/api/generate/image` 请求但返回错误

**原因**：
- API Key 无效或余额不足
- Prompt 包含敏感词被过滤
- 网络连接问题

**解决方案**：

1. 查看失败的任务错误信息：
   ```javascript
   const tasks = useMediaGenerationStore.getState().tasks;
   Object.values(tasks).forEach(task => {
     if (task.status === 'failed') {
       console.error(`Task ${task.elementId} failed:`, task.errorMessage);
     }
   });
   ```

2. 验证 API Key：
   ```bash
   # 测试 Qwen Image API
   curl -X POST https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"wanx-v1","input":{"prompt":"a simple test image"}}'
   ```

3. 检查 `.env.local` 配置：
   ```bash
   IMAGE_QWEN_IMAGE_API_KEY=sk-2015206ee9b749e8915a5fdcbef66fce
   IMAGE_QWEN_IMAGE_BASE_URL=
   ```

### 原因 4：幻灯片生成时没有使用占位符

**症状**：
- 图片生成成功（status: done）
- 但 `slide.canvas.elements` 中没有使用 `gen_img_*` 的图片元素

**原因**：
- 幻灯片生成 prompt 中没有包含生成图片的信息
- LLM 没有使用占位符 ID

**解决方案**：

1. 检查 `teaching-slide-generator.ts` 中的 `assignedImagesText`：
   ```typescript
   // 应该包含类似这样的内容：
   // **AI 生成图片占位符（将在生成后替换）**:
   // - **gen_img_1**: "A diagram..." (宽高比: 16:9)
   ```

2. 查看幻灯片生成 API 的 Request Body：
   ```javascript
   // 在 Network 中查看 /api/generate/teaching-slide 请求
   // Request Body 应该包含：
   {
     slide: {
       mediaGenerations: [...]
     }
   }
   ```

### 原因 5：导出时占位符没有被替换

**症状**：
- 图片生成成功
- Canvas 中有使用 `gen_img_*` 的元素
- 但导出的 PPT 中没有图片

**原因**：
- 导出逻辑中的占位符解析失败
- IndexedDB 中的图片数据丢失
- `stageId` 不匹配

**解决方案**：

1. 检查导出时的 `stageId`：
   ```typescript
   // 在 use-export-teaching-pptx.ts 中添加日志
   const stageId = `teaching_${design.id}`;
   console.log('Export stageId:', stageId);
   
   // 检查 IndexedDB 中的 key
   const mediaFiles = await db.mediaFiles.toArray();
   console.log('Media files in DB:', mediaFiles.map(f => f.key));
   ```

2. 检查占位符解析逻辑：
   ```typescript
   // 在导出逻辑中添加日志
   if (el.type === 'image') {
     console.log('Processing image element:', el.src);
     
     if (isMediaPlaceholder(el.src)) {
       console.log('Is placeholder:', el.src);
       const task = useMediaGenerationStore.getState().tasks[el.src];
       console.log('Task:', task);
       
       if (task?.status === 'done' && task.objectUrl) {
         console.log('Resolving to objectUrl:', task.objectUrl);
       }
     }
   }
   ```

## 快速测试脚本

创建一个测试脚本来验证整个流程：

```javascript
// test-teaching-image-flow.js
async function testTeachingImageFlow() {
  console.log('🧪 开始测试教学设计图片生成流程\n');
  
  // Step 1: 测试大纲生成
  console.log('📋 Step 1: 测试大纲生成');
  const outlineResponse = await fetch('http://localhost:3000/api/generate/teaching-outline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      request: {
        topic: '计算机网络 TCP/IP 协议',
        subject: '计算机科学',
        gradeLevel: '大学',
        duration: 45,
        language: 'zh-CN',
        enableImageGeneration: true, // 关键！
      },
      materials: [],
      modelString: 'glm:glm-4.7',
    })
  });
  
  const { design } = await outlineResponse.json();
  console.log('✅ 大纲生成完成');
  console.log('  总页数:', design.slides.length);
  
  // 检查 mediaGenerations
  const slidesWithMedia = design.slides.filter(s => 
    s.mediaGenerations && s.mediaGenerations.length > 0
  );
  console.log('  包含图片生成请求的页数:', slidesWithMedia.length);
  
  if (slidesWithMedia.length === 0) {
    console.error('❌ 没有生成任何图片请求！');
    console.log('\n💡 可能的原因:');
    console.log('  1. LLM 判断不需要生成图片');
    console.log('  2. enableImageGeneration 没有正确传递');
    console.log('  3. Prompt 中的图片生成策略没有生效');
    return;
  }
  
  // 显示图片生成请求
  slidesWithMedia.forEach((slide, i) => {
    console.log(`\n  Slide ${i + 1}: ${slide.title}`);
    slide.mediaGenerations.forEach(mg => {
      console.log(`    - ${mg.elementId}: "${mg.prompt.slice(0, 60)}..."`);
    });
  });
  
  // Step 2: 测试图片生成
  console.log('\n🎨 Step 2: 测试图片生成');
  const firstMedia = slidesWithMedia[0].mediaGenerations[0];
  
  const imageResponse = await fetch('http://localhost:3000/api/generate/image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-image-provider': 'qwen-image',
      'x-image-model': 'qwen-image-plus',
    },
    body: JSON.stringify({
      prompt: firstMedia.prompt,
      aspectRatio: firstMedia.aspectRatio || '16:9',
    })
  });
  
  if (imageResponse.ok) {
    const { result } = await imageResponse.json();
    console.log('✅ 图片生成成功');
    console.log('  URL:', result.url);
  } else {
    console.error('❌ 图片生成失败');
    const error = await imageResponse.json();
    console.error('  错误:', error);
  }
  
  console.log('\n✅ 测试完成');
}

testTeachingImageFlow();
```

## 总结

根据诊断结果，最可能的原因是：

1. **LLM 没有生成 mediaGenerations** - 最常见
2. **媒体编排器没有启动** - 代码逻辑问题
3. **图片生成失败** - API 配置问题
4. **导出时占位符没有被替换** - 导出逻辑问题

按照上述步骤逐一排查，应该能找到问题所在。

