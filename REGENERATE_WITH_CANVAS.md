# 局部修改功能增强：同步更新 PPT Canvas

## 问题

之前的局部修改功能只修改了 `slide` 的内容（title、keyPoints、narration），但没有重新生成 `canvas`（PPT 页面的视觉布局），导致：
- DOCX 教案更新了 ✅
- PPT 页面内容没有更新 ❌

## 解决方案

在 `regenerate-teaching` API 中增加 canvas 重新生成逻辑：

### 流程

```
用户输入："第三页再多加一条故事寓意"
    ↓
1. 解析指令（正则匹配）
   → 识别目标：第3页（index = 2）
    ↓
2. 调用 regenerateTeachingDesign()
   → 修改 slide 内容（title、keyPoints、narration）
   → 保留来源追踪（source、ragChunkId）
    ↓
3. 找到被修改的 slide
   → 通过对比 design.slides[i] !== updatedDesign.slides[i]
    ↓
4. 调用 /api/generate/teaching-slide
   → 重新生成 canvas（PPT 页面布局）
   → 保持原有风格和样式
    ↓
5. 返回完整的 updatedDesign
   → slide 内容已更新
   → canvas 已重新生成
```

## 代码实现

### API 路由（app/api/regenerate-teaching/route.ts）

```typescript
// Step 1: 修改 slide 内容
const updatedDesign = await regenerateTeachingDesign({
  design,
  instruction,
  aiCall,
});

// Step 2: 找到被修改的 slide
const modifiedSlideIndex = updatedDesign.slides.findIndex(
  (slide, index) => slide !== design.slides[index]
);

// Step 3: 重新生成 canvas
if (modifiedSlideIndex !== -1) {
  const modifiedSlide = updatedDesign.slides[modifiedSlideIndex];
  
  const slideResponse = await fetch('/api/generate/teaching-slide', {
    method: 'POST',
    body: JSON.stringify({
      slide: modifiedSlide,
      assignedImages,
      imageMapping,
      language,
      modelString,
      apiKey,
      baseUrl,
    }),
  });

  if (slideResponse.ok) {
    const { canvas } = await slideResponse.json();
    modifiedSlide.canvas = canvas;
  }
}
```

### 前端调用（app/teaching-test/page.tsx）

```typescript
// 构建 imageMapping 和 assignedImages
const imageMapping: Record<string, string> = {};
const assignedImages: any[] = [];

materials.forEach(material => {
  material.parsedImages?.forEach(img => {
    imageMapping[img.id] = img.src;
    assignedImages.push(img);
  });
});

// 调用 API
const response = await fetch('/api/regenerate-teaching', {
  method: 'POST',
  body: JSON.stringify({
    design: generator.design,
    instruction: feedbackInput,
    modelString: 'glm:glm-4.7',
    language: request.language,
    imageMapping,      // ← 传递图片映射
    assignedImages,    // ← 传递可用图片
  }),
});
```

## 关键特性

### 1. 自动识别修改的 slide
```typescript
const modifiedSlideIndex = updatedDesign.slides.findIndex(
  (slide, index) => slide !== design.slides[index]
);
```
- 通过对象引用对比找到被修改的 slide
- 只重新生成被修改的页面，其他页面保持不变

### 2. 保持 PPT 风格一致
- 使用相同的 `teaching-slide` API
- 传递相同的 `language`、`imageMapping`
- LLM 会根据新的内容生成匹配的布局

### 3. 完整的更新
- ✅ slide.title 更新
- ✅ slide.keyPoints 更新（保留 source）
- ✅ slide.narration 更新
- ✅ slide.canvas 重新生成（PPT 布局）

## 测试验证

### 测试用例
```
原始第3页：
- title: "故事寓意"
- keyPoints: 2条
- canvas: 原有布局

用户指令："第三页再多加一条故事寓意"

预期结果：
- title: "故事寓意"（保持）
- keyPoints: 3条（增加1条）
- canvas: 新布局（包含3条内容）
```

### 日志输出
```
[RegenerateTeachingAPI] Regenerating teaching design
[TeachingRegenerator] Parsed instruction: target slide 3 (index 2)
[TeachingRegenerator] Regenerating slide 3/4
[TeachingRegenerator] Slide regenerated successfully: newKeyPointCount=3
[RegenerateTeachingAPI] Slide content regenerated, now regenerating canvas...
[RegenerateTeachingAPI] Regenerating canvas for slide 3: 故事寓意
[RegenerateTeachingAPI] Canvas regenerated successfully
[RegenerateTeachingAPI] Teaching design regenerated successfully: canvasRegenerated=true
```

## 性能考虑

### 响应时间
- Slide 内容生成：约 30-40 秒
- Canvas 生成：约 10-20 秒
- 总计：约 40-60 秒

### 优化建议
1. **并行生成**（未来）：同时生成内容和 canvas
2. **增量更新**：只传输修改的 slide
3. **缓存机制**：缓存未修改的 canvas

## 用户体验

### 修改前
```
用户："第三页再多加一条寓意"
系统：✅ DOCX 更新了
      ❌ PPT 还是旧内容
```

### 修改后
```
用户："第三页再多加一条寓意"
系统：✅ DOCX 更新了
      ✅ PPT 同步更新了
提示："修改成功！PPT 页面已同步更新"
```

## 相关文件
- `OpenMAIC/app/api/regenerate-teaching/route.ts` - API 路由（增强版）
- `OpenMAIC/app/teaching-test/page.tsx` - 前端调用
- `OpenMAIC/lib/generation/teaching-regenerator.ts` - 核心逻辑（未修改）
- `OpenMAIC/app/api/generate/teaching-slide/route.ts` - Canvas 生成 API

## 注意事项

1. **风格一致性**：新生成的 canvas 会尽量保持原有风格，但可能有细微差异
2. **图片引用**：如果修改涉及图片，需要确保 `imageMapping` 正确传递
3. **错误处理**：如果 canvas 生成失败，slide 内容仍然会更新（优雅降级）

## 未来扩展

- [ ] 支持批量修改多个页面
- [ ] 支持指定 canvas 风格（"保持原样"、"重新设计"）
- [ ] 支持预览修改前后的对比
- [ ] 支持撤销/重做功能
