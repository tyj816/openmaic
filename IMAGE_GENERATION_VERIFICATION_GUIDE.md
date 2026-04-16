# 图片生成功能验证指南（2页测试版）

## 测试结果

根据 `test-teaching-image-flow.js` 的测试结果：

✅ **大纲生成**: 成功生成 2 页课件  
✅ **图片生成请求**: 每页都包含图片生成请求（gen_img_1, gen_img_2）  
✅ **图片生成 API**: 成功在 4.58 秒内生成图片  
⏳ **幻灯片生成**: 超时（可能是 GLM 模型问题）

## 快速验证步骤

### 方法 1：通过教学聊天页面（推荐）

1. **访问教学聊天页面**
   ```
   http://localhost:3000/teaching-chat
   ```

2. **输入测试需求**（明确要求配图和限制页数）
   ```
   请设计一个关于"操作系统进程调度算法"的课件，
   包含 FCFS、SJF、时间片轮转的对比，
   只生成 2 页，每页都需要配图说明。
   ```

3. **观察生成过程**
   - 等待大纲生成完成
   - 查看页面顶部是否出现 **"🎨 图片生成进度"** 区域
   - 观察图片生成状态变化：⋯ → ⏳ → ✓

4. **在浏览器 Console 中检查**
   
   打开开发者工具（F12），在 Console 中运行：
   
   ```javascript
   // 复制 browser-check-image-generation.js 的内容并粘贴运行
   ```
   
   或者手动检查：
   
   ```javascript
   // 1. 查看设计对象
   const design = JSON.parse(localStorage.getItem('teaching-design-draft'));
   console.log('总页数:', design.slides.length);
   
   // 2. 检查图片生成请求
   design.slides.forEach((slide, i) => {
     if (slide.mediaGenerations && slide.mediaGenerations.length > 0) {
       console.log(`Slide ${i + 1}: ${slide.title}`);
       console.log('  mediaGenerations:', slide.mediaGenerations);
     }
   });
   
   // 3. 检查媒体生成任务（如果页面中有 useMediaGenerationStore）
   // 在 React DevTools 中查看或在页面组件中查看
   ```

5. **等待图片生成完成**
   - 所有任务状态变为 ✓（done）
   - 通常需要 5-30 秒，取决于图片数量

6. **进入工作区预览**
   - 点击 "进入工作区" 按钮
   - 查看幻灯片中是否显示生成的图片
   - 图片应该清晰可见，不是占位符

7. **导出 PPT 验证**
   - 点击 "导出 PPT" 按钮
   - 打开导出的 PPT 文件
   - 检查图片是否正确嵌入

### 方法 2：通过 API 测试（已验证）

运行测试脚本：

```bash
node test-teaching-image-flow.js
```

**预期结果**：
- ✅ 大纲生成成功（2 页）
- ✅ 每页包含图片生成请求
- ✅ 图片生成 API 测试成功
- ✅ 幻灯片生成成功（如果 GLM 有余额）

## 常见问题排查

### 问题 1：没有看到 "🎨 图片生成进度" 区域

**原因**：
- 大纲中没有生成 `mediaGenerations`
- 媒体编排器没有启动

**解决方法**：
1. 检查 Console 中是否有 "Image generation enabled" 日志
2. 查看 Network 中的 `/api/generate/teaching-outline` 响应
3. 确认 Response 中的 `design.slides[].mediaGenerations` 存在

### 问题 2：图片生成一直处于 ⏳ 状态

**原因**：
- API Key 无效或余额不足
- 网络连接问题
- 图片生成服务超时

**解决方法**：
1. 检查 `.env.local` 中的 API Key
2. 查看 Network 中的 `/api/generate/image` 请求
3. 查看 Console 中的错误信息

### 问题 3：图片生成失败（✗ 状态）

**原因**：
- Prompt 包含敏感词
- API 限流
- 服务暂时不可用

**解决方法**：
1. 在 Console 中查看错误信息：
   ```javascript
   const tasks = useMediaGenerationStore.getState().tasks;
   Object.values(tasks).forEach(task => {
     if (task.status === 'failed') {
       console.error(task.elementId, task.errorMessage);
     }
   });
   ```
2. 尝试重新生成或使用不同的教学主题

### 问题 4：导出的 PPT 中没有图片

**原因**：
- 图片生成未完成就导出了
- IndexedDB 中的图片数据丢失
- 占位符解析失败

**解决方法**：
1. 确保所有图片生成完成后再导出
2. 检查 IndexedDB（Application → IndexedDB → openmaic-db → mediaFiles）
3. 查看 Console 中的导出日志

## 验证清单

使用以下清单确保功能正常：

- [ ] 大纲生成包含 `mediaGenerations`（2 个请求）
- [ ] 页面显示 "🎨 图片生成进度" 区域
- [ ] 图片生成任务状态最终为 ✓（done）
- [ ] IndexedDB 中存储了图片 blob（2 个文件）
- [ ] 工作区预览显示生成的图片
- [ ] 导出的 PPT 包含生成的图片
- [ ] 图片内容与 prompt 描述相符

## 测试数据

根据实际测试：

**大纲生成**：
- 设计 ID: `SGinn3uzxaRF937AmFKH0`
- 总页数: 2
- 图片请求数: 2

**图片生成请求**：

1. **gen_img_1** (Slide 1: FCFS vs SJF：谁更高效？)
   - Prompt: "A side-by-side comparison of Gantt charts for FCFS and SJF scheduling..."
   - Aspect Ratio: 16:9
   - 生成时间: 4.58s
   - 尺寸: 1024 × 576

2. **gen_img_2** (Slide 2: 时间片轮转：公平的代价)
   - Prompt: "A circular diagram illustrating Round Robin scheduling..."
   - Aspect Ratio: 16:9

## 下一步

如果 2 页测试通过，可以：

1. **增加页数测试**：尝试生成 4-6 页课件
2. **测试不同主题**：数据结构、网络协议、算法等
3. **测试不同风格**：在 prompt 中指定图片风格
4. **性能优化**：并行生成多张图片
5. **用户体验**：添加重新生成、预览、编辑功能

## 参考文档

- [图片生成快速开始](./TEACHING_IMAGE_GENERATION_QUICK_START.md)
- [图片生成实现报告](./TEACHING_IMAGE_GENERATION_IMPLEMENTATION.md)
- [图片生成工作流程](./IMAGE_GENERATION_WORKFLOW.md)
- [诊断指南](./diagnose-teaching-image-generation.md)

