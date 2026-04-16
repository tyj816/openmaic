# 教学设计系统 - 图片生成功能验证指南

## 快速验证步骤

### 前置条件检查

1. **检查环境变量配置**
   
   打开 `OpenMAIC/.env.local`，确认图片生成 API 配置：
   
   ```bash
   # 图片生成提供商（至少配置一个）
   IMAGE_QWEN_IMAGE_API_KEY=sk-2015206ee9b749e8915a5fdcbef66fce
   IMAGE_QWEN_IMAGE_BASE_URL=
   
   # 或者其他提供商
   IMAGE_SEEDREAM_API_KEY=
   IMAGE_SEEDREAM_BASE_URL=
   ```

2. **检查 LLM 模型余额**
   
   确保你的主 LLM 模型有余额（用于生成大纲和内容）：
   
   ```bash
   # 当前配置的默认模型
   DEFAULT_MODEL=glm:glm-5
   
   # 如果 GLM-5 余额不足，切换到其他模型
   # DEFAULT_MODEL=qwen:qwen3.5-flash
   ```

3. **启动开发服务器**
   
   ```bash
   cd OpenMAIC
   npm run dev
   ```

---

## 验证方法 1：通过教学聊天页面（推荐）

### 步骤 1：访问教学聊天页面

打开浏览器访问：`http://localhost:3000/teaching-chat`

### 步骤 2：输入测试需求

在聊天框中输入一个需要图片的教学主题，例如：

```
请帮我设计一个关于"操作系统进程调度算法"的教学课件，
包含FCFS、SJF、时间片轮转等算法的对比。
```

### 步骤 3：检查大纲生成

等待系统生成大纲，打开浏览器开发者工具（F12），在 Console 中输入：

```javascript
// 查看生成的设计对象
const design = JSON.parse(localStorage.getItem('teaching-design-draft'));
console.log('Design:', design);

// 检查是否有 mediaGenerations
design.slides.forEach((slide, i) => {
  if (slide.mediaGenerations && slide.mediaGenerations.length > 0) {
    console.log(`Slide ${i + 1} (${slide.title}):`, slide.mediaGenerations);
  }
});
```

**预期结果**：
- 至少有一个幻灯片包含 `mediaGenerations` 数组
- 每个 `mediaGeneration` 包含：
  - `type: "image"`
  - `prompt: "英文描述..."`
  - `elementId: "gen_img_xxxxx"`（唯一 ID）
  - `aspectRatio: "16:9"`

### 步骤 4：检查图片生成进度

在页面顶部应该看到 **"🎨 图片生成进度"** 区域，显示：

```
🎨 图片生成进度 (1/3)
⏳ gen_img_xK8f2  ⏳ gen_img_yL9m3  ✓ gen_img_zN4p1
```

状态说明：
- `⋯` - pending（等待中）
- `⏳` - generating（生成中，会闪烁）
- `✓` - done（完成）
- `✗` - failed（失败）

### 步骤 5：检查媒体生成状态

在浏览器 Console 中输入：

```javascript
// 查看所有媒体生成任务
const tasks = useMediaGenerationStore.getState().tasks;
console.log('Media Tasks:', tasks);

// 查看特定任务详情
Object.values(tasks).forEach(task => {
  console.log(`${task.elementId}:`, {
    status: task.status,
    prompt: task.prompt,
    objectUrl: task.objectUrl,
    error: task.errorMessage
  });
});
```

**预期结果**：
- 所有任务最终状态为 `done` 或 `failed`
- `done` 状态的任务有 `objectUrl`（blob URL）
- 可以在 Console 中点击 `objectUrl` 查看生成的图片

### 步骤 6：检查 IndexedDB 存储

1. 打开开发者工具 → Application → Storage → IndexedDB
2. 展开 `openmaic-db` → `mediaFiles`
3. 查看存储的图片 blob

**预期结果**：
- 每个生成成功的图片都有对应的记录
- `key` 格式：`teaching_{designId}::{elementId}`
- `blob` 包含图片数据

### 步骤 7：预览生成的幻灯片

点击 **"进入工作区"** 按钮，查看生成的幻灯片：

**预期结果**：
- 使用 `gen_img_*` 占位符的图片元素显示为生成的图片
- 图片尺寸和位置正确
- 图片内容与 prompt 描述相符

### 步骤 8：导出 PPT 验证

在工作区页面点击 **"导出 PPT"** 按钮：

**预期结果**：
- 导出成功，无错误提示
- 打开导出的 PPT 文件
- 生成的图片正确嵌入到幻灯片中
- 图片清晰度满足要求

---

## 验证方法 2：通过 API 直接测试

### 测试大纲生成 API

创建测试文件 `test-teaching-outline.js`：

```javascript
const response = await fetch('http://localhost:3000/api/teaching-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: '请设计一个关于"数据结构-二叉树"的教学课件',
    materials: [],
    enableImageGeneration: true,  // 启用图片生成
    language: 'zh-CN'
  })
});

const data = await response.json();
console.log('Design:', data.design);

// 检查 mediaGenerations
data.design.slides.forEach(slide => {
  if (slide.mediaGenerations) {
    console.log(`${slide.title}:`, slide.mediaGenerations);
  }
});
```

运行测试：

```bash
node test-teaching-outline.js
```

### 测试图片生成 API

创建测试文件 `test-image-generation.js`：

```javascript
const response = await fetch('http://localhost:3000/api/media/generate-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A colorful diagram showing binary tree traversal methods including preorder, inorder, and postorder',
    aspectRatio: '16:9',
    providerId: 'qwen-image',
    modelId: 'qwen-image-plus'
  })
});

const data = await response.json();
console.log('Generated Image URL:', data.url);
```

---

## 常见问题排查

### 问题 1：没有生成 mediaGenerations

**可能原因**：
- `enableImageGeneration` 未设置为 `true`
- LLM 判断不需要生成图片
- Prompt 中没有包含图片生成策略

**解决方法**：

1. 检查 `use-teaching-generator.ts` 中的调用：
   ```typescript
   const design = await generator.generate(
     {
       ...response.teachingRequest,
       enableImageGeneration: true,  // 确保为 true
     },
     // ...
   );
   ```

2. 检查 `teaching-outline-generator.ts` 中的 prompt：
   ```typescript
   const imageEnabled = request.enableImageGeneration ?? false;
   console.log('Image generation enabled:', imageEnabled);
   ```

3. 使用更明确的教学需求，例如：
   ```
   请设计一个关于"计算机网络协议栈"的课件，
   需要包含OSI七层模型的示意图和TCP三次握手的流程图。
   ```

### 问题 2：图片生成一直处于 pending 状态

**可能原因**：
- 媒体编排器未启动
- API Key 无效
- 网络连接问题

**解决方法**：

1. 检查 Console 是否有错误日志
2. 验证 API Key：
   ```bash
   # 测试 Qwen Image API
   curl -X POST https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis \
     -H "Authorization: Bearer sk-2015206ee9b749e8915a5fdcbef66fce" \
     -H "Content-Type: application/json" \
     -d '{"model":"wanx-v1","input":{"prompt":"a cat"}}'
   ```

3. 检查媒体编排器是否被调用：
   ```javascript
   // 在 use-teaching-generator.ts 中添加日志
   console.log('Starting media generation for', outlines.length, 'slides');
   ```

### 问题 3：图片生成失败（status: failed）

**可能原因**：
- API 余额不足
- Prompt 不符合要求（如包含敏感词）
- API 限流

**解决方法**：

1. 查看错误信息：
   ```javascript
   const tasks = useMediaGenerationStore.getState().tasks;
   Object.values(tasks).forEach(task => {
     if (task.status === 'failed') {
       console.error(`${task.elementId} failed:`, task.errorMessage);
     }
   });
   ```

2. 检查 API 余额：
   - Qwen: https://dashscope.console.aliyun.com/
   - Seedream: https://console.volcengine.com/

3. 优化 prompt（避免敏感词）

### 问题 4：导出 PPT 时图片未显示

**可能原因**：
- 图片生成未完成就导出
- IndexedDB 数据丢失
- 占位符解析失败

**解决方法**：

1. 确保所有图片生成完成后再导出：
   ```javascript
   const tasks = useMediaGenerationStore.getState().tasks;
   const allDone = Object.values(tasks).every(t => 
     t.status === 'done' || t.status === 'failed'
   );
   console.log('All media generation done:', allDone);
   ```

2. 检查 IndexedDB 中的数据：
   ```javascript
   const db = await openDB('openmaic-db');
   const mediaFiles = await db.getAll('mediaFiles');
   console.log('Stored media files:', mediaFiles);
   ```

3. 检查导出逻辑中的占位符解析：
   ```typescript
   // 在 use-export-pptx.ts 中添加日志
   if (isMediaPlaceholder(el.src)) {
     console.log('Resolving placeholder:', el.src);
     const task = useMediaGenerationStore.getState().tasks[el.src];
     console.log('Task status:', task?.status);
   }
   ```

---

## 性能指标

### 正常情况下的预期时间

- **大纲生成**: 10-30 秒
- **单张图片生成**: 5-30 秒（取决于提供商）
- **幻灯片内容生成**: 每页 5-15 秒
- **总体流程**: 1-3 分钟（10 页课件 + 3 张生成图片）

### 并行优化

图片生成和内容生成是并行的：

```
时间轴：
0s ────────────────────────────────────────────────> 60s
    ├─ 大纲生成 (20s)
    │  └─ 启动图片生成 ──────────────────────> (40s)
    │     ├─ 图片1 (15s)
    │     ├─ 图片2 (20s)
    │     └─ 图片3 (25s)
    └─ 内容生成 ────────────────────────────> (40s)
       ├─ 页面1 (5s)
       ├─ 页面2 (5s)
       └─ ...
```

---

## 验证清单

使用以下清单确保功能完整可用：

- [ ] 环境变量配置正确（API Key、Base URL）
- [ ] LLM 模型有余额
- [ ] 开发服务器正常运行
- [ ] 大纲生成包含 `mediaGenerations`
- [ ] 图片生成进度条显示正常
- [ ] 所有图片生成任务最终为 `done` 状态
- [ ] IndexedDB 中存储了图片 blob
- [ ] 工作区预览显示生成的图片
- [ ] 导出的 PPT 包含生成的图片
- [ ] 图片内容与 prompt 描述相符
- [ ] 图片质量满足教学需求

---

## 下一步

验证通过后，你可以：

1. **优化 Prompt**: 调整大纲生成 prompt，提高图片生成的准确性
2. **添加风格控制**: 支持用户选择图片风格（扁平化、写实、卡通等）
3. **批量管理**: 添加批量查看、删除、重新生成图片的功能
4. **性能优化**: 实现图片缓存，避免重复生成相同内容
5. **用户反馈**: 添加图片评分和重新生成功能

---

## 参考文档

- [图片生成功能实现报告](./TEACHING_IMAGE_GENERATION_IMPLEMENTATION.md)
- [图片生成工作流程](./IMAGE_GENERATION_WORKFLOW.md)
- [图片生成集成指南](./TEACHING_IMAGE_GENERATION_INTEGRATION.md)

