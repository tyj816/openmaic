# OpenMAIC 图片生成工作流程

## 概述

OpenMAIC 原版支持在生成 PPT 时自动调用图片生成模型来创建相关图片。这个功能是完整集成的，从大纲生成到最终导出都有支持。

## 完整工作流程

### 1. 大纲生成阶段 (Outline Generation)

**文件**: `OpenMAIC/lib/generation/outline-generator.ts`

在生成场景大纲时，LLM 会判断是否需要生成图片：

```typescript
// 根据设置构建媒体生成策略
const imageEnabled = options?.imageGenerationEnabled ?? false;
const videoEnabled = options?.videoGenerationEnabled ?? false;

let mediaGenerationPolicy = '';
if (!imageEnabled && !videoEnabled) {
  mediaGenerationPolicy = '不要包含任何 mediaGenerations';
} else if (!imageEnabled) {
  mediaGenerationPolicy = '不要包含图片生成请求，只允许视频';
} else if (!videoEnabled) {
  mediaGenerationPolicy = '不要包含视频生成请求，只允许图片';
}
```

**Prompt 模板**: `OpenMAIC/lib/generation/prompts/templates/requirements-to-outlines/system.md`

LLM 被指示：
- 当幻灯片需要图片但 PDF 中没有合适的图片时，添加 `mediaGenerations` 数组
- 每个条目包含：
  - `type`: "image" 或 "video"
  - `prompt`: 英文描述（给图片生成模型用）
  - `elementId`: 唯一占位符 ID（如 "gen_img_1", "gen_img_2"）
  - `aspectRatio`: 宽高比（默认 "16:9"）
  - `style`: 可选的艺术风格

**示例输出**:
```json
{
  "id": "scene_1",
  "title": "进程调度算法概述",
  "type": "slide",
  "suggestedImageIds": ["img_1"],
  "mediaGenerations": [
    {
      "type": "image",
      "prompt": "A diagram showing different process scheduling algorithms including FCFS, SJF, and Round Robin, with colorful flowchart style",
      "elementId": "gen_img_1",
      "aspectRatio": "16:9"
    }
  ],
  "keyPoints": [
    "进程调度的基本概念",
    "常见调度算法分类"
  ]
}
```

### 2. ID 唯一化 (Uniquify IDs)

**文件**: `OpenMAIC/lib/generation/scene-builder.ts`

为了避免跨场景的 ID 冲突，系统会将顺序 ID（gen_img_1, gen_img_2）替换为全局唯一 ID：

```typescript
function uniquifyMediaElementIds(outlines: SceneOutline[]): SceneOutline[] {
  const idMap = new Map<string, string>();
  
  // 收集所有顺序 ID 并分配唯一替换
  for (const outline of outlines) {
    if (!outline.mediaGenerations) continue;
    for (const mg of outline.mediaGenerations) {
      if (!idMap.has(mg.elementId)) {
        const prefix = mg.type === 'video' ? 'gen_vid_' : 'gen_img_';
        idMap.set(mg.elementId, `${prefix}${nanoid()}`);
      }
    }
  }
  
  // 替换所有引用
  return outlines.map(outline => ({
    ...outline,
    mediaGenerations: outline.mediaGenerations?.map(mg => ({
      ...mg,
      elementId: idMap.get(mg.elementId) || mg.elementId
    }))
  }));
}
```

### 3. 幻灯片内容生成 (Slide Content Generation)

**文件**: `OpenMAIC/lib/generation/scene-generator.ts`

生成幻灯片内容时，系统会告诉 LLM 哪些生成的图片可用：

```typescript
// 添加生成媒体占位符信息
if (outline.mediaGenerations && outline.mediaGenerations.length > 0) {
  const genImgDescs = outline.mediaGenerations
    .filter(mg => mg.type === 'image')
    .map(mg => `- ${mg.elementId}: "${mg.prompt}" (aspect ratio: ${mg.aspectRatio || '16:9'})`)
    .join('\n');
  
  assignedImagesText += `\n\n**Generated Images (AI-generated placeholders)**:\n${genImgDescs}`;
}
```

**Prompt 模板**: `OpenMAIC/lib/generation/prompts/templates/slide-content/system.md`

LLM 被告知可以使用这些占位符 ID：

```markdown
#### AI-Generated Images (gen_img_*)

If the scene outline includes `mediaGenerations`, you may also use generated image placeholders:
- `src` can be a generated image ID like `"gen_img_1"`, `"gen_img_2"` etc.
- These will be replaced with actual generated images after slide creation
- Default aspect ratio for generated images: 16:9 (width:height = 16:9)
```

**生成的元素示例**:
```json
{
  "id": "image_001",
  "type": "image",
  "left": 100,
  "top": 150,
  "width": 500,
  "height": 281,
  "src": "gen_img_xK8f2mQ",  // 使用生成的唯一 ID
  "fixedRatio": true
}
```

### 4. 媒体生成编排 (Media Orchestration)

**文件**: `OpenMAIC/lib/media/media-orchestrator.ts`

在幻灯片内容生成的同时，系统会并行启动图片生成：

```typescript
export async function generateMediaForOutlines(
  outlines: SceneOutline[],
  stageId: string,
  abortSignal?: AbortSignal
): Promise<void> {
  const settings = useSettingsStore.getState();
  
  // 收集所有媒体请求
  const allRequests: MediaGenerationRequest[] = [];
  for (const outline of outlines) {
    if (!outline.mediaGenerations) continue;
    for (const mg of outline.mediaGenerations) {
      // 根据设置过滤
      if (mg.type === 'image' && !settings.imageGenerationEnabled) continue;
      if (mg.type === 'video' && !settings.videoGenerationEnabled) continue;
      allRequests.push(mg);
    }
  }
  
  // 入队所有任务
  useMediaGenerationStore.getState().enqueueTasks(stageId, allRequests);
  
  // 串行处理请求（图片/视频 API 有并发限制）
  for (const req of allRequests) {
    if (abortSignal?.aborted) break;
    await generateSingleMedia(req, stageId, abortSignal);
  }
}
```

### 5. 图片生成 API 调用

**文件**: `OpenMAIC/lib/media/image-providers.ts`

支持多个图片生成提供商：

```typescript
export const IMAGE_PROVIDERS: Record<ImageProviderId, ImageProviderConfig> = {
  seedream: {
    id: 'seedream',
    name: 'Seedream',
    requiresApiKey: true,
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com',
    models: [
      { id: 'doubao-seedream-5-0-260128', name: 'Seedream 5.0 Lite' },
      { id: 'doubao-seedream-4-5-251128', name: 'Seedream 4.5' },
      // ...
    ],
    supportedAspectRatios: ['16:9', '4:3', '1:1', '9:16'],
  },
  'qwen-image': {
    id: 'qwen-image',
    name: 'Qwen Image',
    // ...
  },
  'nano-banana': {
    id: 'nano-banana',
    name: 'Nano Banana (Gemini)',
    // ...
  },
  'grok-image': {
    id: 'grok-image',
    name: 'Grok Image (xAI)',
    // ...
  },
};
```

**API 调用流程**:
```typescript
async function generateSingleMedia(
  req: MediaGenerationRequest,
  stageId: string,
  abortSignal?: AbortSignal
): Promise<void> {
  const store = useMediaGenerationStore.getState();
  store.markGenerating(req.elementId);
  
  try {
    // 调用图片生成 API
    const { url } = await callImageApi(req, abortSignal);
    
    // 下载图片 blob
    const response = await fetch(url);
    const blob = await response.blob();
    
    // 存储到 IndexedDB
    await db.mediaFiles.put({
      key: mediaFileKey(stageId, req.elementId),
      stageId,
      elementId: req.elementId,
      blob,
      mimeType: blob.type,
    });
    
    // 创建 object URL 用于预览
    const objectUrl = URL.createObjectURL(blob);
    store.markDone(req.elementId, objectUrl);
  } catch (err) {
    store.markFailed(req.elementId, err.message);
  }
}
```

### 6. 状态管理 (State Management)

**文件**: `OpenMAIC/lib/store/media-generation.ts`

使用 Zustand 管理媒体生成任务状态：

```typescript
interface MediaTask {
  elementId: string;
  type: 'image' | 'video';
  prompt: string;
  status: 'pending' | 'generating' | 'done' | 'failed';
  objectUrl?: string;  // 预览 URL
  errorMessage?: string;
  params: {
    aspectRatio?: string;
    style?: string;
  };
}

interface MediaGenerationState {
  tasks: Record<string, MediaTask>;
  enqueueTasks: (stageId: string, requests: MediaGenerationRequest[]) => void;
  markGenerating: (elementId: string) => void;
  markDone: (elementId: string, objectUrl: string) => void;
  markFailed: (elementId: string, message: string) => void;
  getTask: (elementId: string) => MediaTask | undefined;
}
```

### 7. 导出 PPT (Export)

**文件**: `OpenMAIC/lib/export/use-export-pptx.ts`

导出时，系统会将占位符 ID 替换为实际生成的图片：

```typescript
// 处理图片元素
if (el.type === 'image') {
  let resolvedSrc = el.src;
  
  // 检查是否是媒体占位符
  if (isMediaPlaceholder(el.src)) {
    const task = useMediaGenerationStore.getState().tasks[el.src];
    
    if (task?.status === 'done' && task.objectUrl) {
      // 从 IndexedDB 获取 blob
      const mediaFile = await db.mediaFiles.get(
        mediaFileKey(stageId, el.src)
      );
      
      if (mediaFile?.blob) {
        // 转换为 base64
        resolvedSrc = await blobToBase64(mediaFile.blob);
      }
    }
  }
  
  // 添加到 PPT
  slide.addImage({
    data: resolvedSrc,
    x: el.left / canvasWidth,
    y: el.top / canvasHeight,
    w: el.width / canvasWidth,
    h: el.height / canvasHeight,
  });
}
```

## 关键数据结构

### MediaGenerationRequest
```typescript
interface MediaGenerationRequest {
  type: 'image' | 'video';
  prompt: string;  // 英文描述
  elementId: string;  // 如 "gen_img_xK8f2mQ"
  aspectRatio?: '16:9' | '4:3' | '1:1' | '9:16';
  style?: string;
}
```

### SceneOutline (with mediaGenerations)
```typescript
interface SceneOutline {
  id: string;
  title: string;
  type: 'slide' | 'quiz' | 'interactive';
  description: string;
  keyPoints: string[];
  suggestedImageIds?: string[];  // PDF 图片
  mediaGenerations?: MediaGenerationRequest[];  // AI 生成图片
  // ...
}
```

## 配置和设置

### 全局设置
```typescript
// OpenMAIC/lib/store/settings.ts
interface SettingsState {
  // 图片生成设置
  imageProviderId: ImageProviderId;  // 'seedream' | 'qwen-image' | ...
  imageModelId: string;
  imageGenerationEnabled: boolean;  // 是否启用图片生成
  
  // 视频生成设置
  videoProviderId: VideoProviderId;
  videoModelId: string;
  videoGenerationEnabled: boolean;
  
  // ...
}
```

### API 配置
```typescript
// OpenMAIC/lib/server/provider-config.ts
interface ImageGenerationConfig {
  providerId: ImageProviderId;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}
```

## 教学系统集成建议

要在你的教学设计系统中集成图片生成功能，需要：

1. **在 outline 生成时添加 mediaGenerations**
   - 修改 `teaching-outline-generator.ts`
   - 在 prompt 中添加 `mediaGenerationPolicy`
   - 让 LLM 输出包含 `mediaGenerations` 的大纲

2. **在幻灯片生成时传递生成图片信息**
   - 修改 `teaching-slide-generator.ts`
   - 将 `mediaGenerations` 信息添加到 prompt 中
   - 让 LLM 使用 `gen_img_*` 占位符

3. **启动媒体生成编排**
   - 在 `use-teaching-generator.ts` 中调用 `generateMediaForOutlines`
   - 并行执行图片生成和内容生成

4. **配置图片生成提供商**
   - 在设置中添加图片生成相关配置
   - 选择提供商（Seedream、Qwen Image 等）
   - 配置 API Key

5. **导出时解析占位符**
   - 在导出 PPT 时，从 IndexedDB 获取生成的图片
   - 替换占位符 ID 为实际图片数据

## 优势

1. **并行生成**: 图片生成和内容生成并行进行，不阻塞主流程
2. **状态管理**: 完整的任务状态跟踪（pending → generating → done/failed）
3. **持久化**: 生成的图片存储在 IndexedDB，刷新页面不丢失
4. **多提供商**: 支持多个图片生成服务，可灵活切换
5. **错误处理**: 完善的错误处理和重试机制
6. **占位符机制**: 使用唯一 ID 作为占位符，生成完成后自动替换

## 相关文件清单

### 核心逻辑
- `OpenMAIC/lib/generation/outline-generator.ts` - 大纲生成，添加 mediaGenerations
- `OpenMAIC/lib/generation/scene-generator.ts` - 幻灯片生成，使用占位符
- `OpenMAIC/lib/generation/scene-builder.ts` - ID 唯一化
- `OpenMAIC/lib/media/media-orchestrator.ts` - 媒体生成编排
- `OpenMAIC/lib/media/image-providers.ts` - 图片生成提供商

### 状态管理
- `OpenMAIC/lib/store/media-generation.ts` - 媒体生成任务状态
- `OpenMAIC/lib/store/settings.ts` - 全局设置

### 类型定义
- `OpenMAIC/lib/media/types.ts` - 媒体生成类型
- `OpenMAIC/lib/types/generation.ts` - 生成相关类型

### Prompt 模板
- `OpenMAIC/lib/generation/prompts/templates/requirements-to-outlines/` - 大纲生成 prompt
- `OpenMAIC/lib/generation/prompts/templates/slide-content/` - 幻灯片内容 prompt

### 导出
- `OpenMAIC/lib/export/use-export-pptx.ts` - PPT 导出，解析占位符

### 数据库
- `OpenMAIC/lib/utils/database.ts` - IndexedDB 存储
- `OpenMAIC/lib/utils/stage-storage.ts` - Stage 存储管理
