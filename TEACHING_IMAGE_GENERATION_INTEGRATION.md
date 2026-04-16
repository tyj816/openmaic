# 教学设计系统 - 图片生成功能集成方案

## 可行性分析

✅ **完全可以复用 OpenMAIC 的图片生成工具！**

你的教学设计系统和 OpenMAIC 原版的架构非常相似：
- 都使用 `TeachingSlide` 结构
- 都有大纲生成 → 幻灯片生成的两阶段流程
- 都使用相同的 prompt 模板系统（`slide-content`）
- 都有 `ImageMapping` 和 `ParsedImage` 支持

**改造难度评估：⭐⭐☆☆☆ (简单)**

## 核心差异对比

| 特性 | OpenMAIC 原版 | 你的教学系统 | 是否需要改造 |
|------|--------------|-------------|-------------|
| 大纲结构 | `SceneOutline` | `TeachingSlide` | ✅ 需要添加 `mediaGenerations` 字段 |
| 幻灯片生成 | `scene-generator.ts` | `teaching-slide-generator.ts` | ✅ 需要传递 `mediaGenerations` 信息 |
| 媒体编排 | `media-orchestrator.ts` | ❌ 缺失 | ✅ 需要集成 |
| 状态管理 | `media-generation.ts` | ❌ 缺失 | ✅ 需要集成 |
| 图片提供商 | `image-providers.ts` | ✅ 已存在 | ✅ 可直接复用 |
| 导出支持 | `use-export-pptx.ts` | ✅ 已存在 | ✅ 需要添加占位符解析 |

## 改造步骤

### 步骤 1: 扩展 TeachingSlide 类型定义

**文件**: `OpenMAIC/lib/types/teaching.ts`

```typescript
import type { MediaGenerationRequest } from '@/lib/media/types';

export interface TeachingSlide {
  id: string;
  order: number;
  title: string;
  description?: string;
  type?: 'cover' | 'content' | 'transition' | 'end';
  teachingObjective?: string;
  visualIntent?: string;
  preferredLayout?: string;
  densityHint?: 'sparse' | 'balanced' | 'dense';
  suggestedImageIds?: string[];  // PDF 图片
  
  // 🆕 新增：AI 生成图片请求
  mediaGenerations?: MediaGenerationRequest[];
  
  keyPoints: KeyPointWithSource[];
  contentBlocks?: ContentBlock[];
  canvas?: Slide;
  narration?: string;
}
```

### 步骤 2: 修改大纲生成器添加图片生成策略

**文件**: `OpenMAIC/lib/generation/teaching-outline-generator.ts`

在 `generateTeachingDesignFromRequest` 函数中添加：

```typescript
// 在 Step 6 之前添加
// Step 5.5: Build media generation policy
const imageEnabled = request.enableImageGeneration ?? false;
const videoEnabled = false; // 教学系统暂不支持视频

let mediaGenerationPolicy = '';
if (!imageEnabled) {
  mediaGenerationPolicy = `
**重要提示：图片生成已禁用**
- 不要在 slides 中添加 mediaGenerations 数组
- 只能使用 suggestedImageIds 引用已有的 PDF 图片
`;
} else {
  mediaGenerationPolicy = `
**图片生成策略**
- 当某页幻灯片需要图片但 PDF 中没有合适的图片时，可以添加 mediaGenerations 数组
- 每个图片生成请求包含：
  - type: "image"
  - prompt: 英文描述（给图片生成模型用）
  - elementId: 唯一 ID（格式：gen_img_1, gen_img_2，全局唯一）
  - aspectRatio: 宽高比（默认 "16:9"）
- 示例：
  "mediaGenerations": [
    {
      "type": "image",
      "prompt": "A colorful diagram showing the process scheduling algorithms comparison",
      "elementId": "gen_img_1",
      "aspectRatio": "16:9"
    }
  ]
`;
}
```

然后在 systemPrompt 中添加：

```typescript
const systemPrompt = `你是一位经验丰富的一线教师，同时也是PPT教学设计专家。
...

${mediaGenerationPolicy}

...

【输出格式】
必须输出 JSON，包含以下字段：
{
  ...
  "slides": [
    {
      "title": "PPT页面标题",
      ...
      "suggestedImageIds": ["img_1", "img_2"],
      "mediaGenerations": [  // 🆕 新增字段（可选）
        {
          "type": "image",
          "prompt": "English description for image generation",
          "elementId": "gen_img_1",
          "aspectRatio": "16:9"
        }
      ],
      ...
    }
  ],
  ...
}
`;
```

### 步骤 3: 在幻灯片生成时传递生成图片信息

**文件**: `OpenMAIC/lib/generation/teaching-slide-generator.ts`

修改 `generateTeachingSlideCanvas` 函数：

```typescript
export async function generateTeachingSlideCanvas(
  teachingSlide: TeachingSlide,
  assignedImages: ParsedImage[],
  aiCall: AICallFn,
  options?: {
    visionEnabled?: boolean;
    imageMapping?: ImageMapping;
    language?: string;
  },
): Promise<Slide | null> {
  // ... 现有代码 ...

  // 🆕 添加生成图片信息
  let assignedImagesText = '无可用图片';
  
  if (assignedImages.length > 0) {
    // 现有的 PDF 图片处理逻辑
    // ...
  }
  
  // 🆕 添加 AI 生成图片占位符信息
  if (teachingSlide.mediaGenerations && teachingSlide.mediaGenerations.length > 0) {
    const genImgDescs = teachingSlide.mediaGenerations
      .filter(mg => mg.type === 'image')
      .map(mg => `- **${mg.elementId}**: "${mg.prompt}" (宽高比: ${mg.aspectRatio || '16:9'})`)
      .join('\n');
    
    if (genImgDescs) {
      assignedImagesText += `\n\n**AI 生成图片占位符（将在生成后替换）**:\n${genImgDescs}`;
    }
  }

  // 使用原有的 slide-content prompt
  const prompts = buildPrompt(PROMPT_IDS.SLIDE_CONTENT, {
    title: teachingSlide.title,
    description: enrichedDescription || keyPointsContent.join('; '),
    keyPoints: enrichedKeyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n'),
    assignedImages: assignedImagesText,  // 包含了 PDF 图片和生成图片占位符
    canvas_width: canvasWidth,
    canvas_height: canvasHeight,
    teacherContext: '',
  });

  // ... 其余代码不变 ...
}
```

### 步骤 4: 集成媒体生成编排器

**文件**: `OpenMAIC/lib/hooks/use-teaching-generator.ts`

修改 `generate` 函数，在幻灯片生成后启动图片生成：

```typescript
import { generateMediaForOutlines } from '@/lib/media/media-orchestrator';
import { useMediaGenerationStore } from '@/lib/store/media-generation';

export function useTeachingGenerator() {
  // ... 现有代码 ...

  const generate = useCallback(
    async (
      request: TeachingRequest,
      options: TeachingGeneratorOptions,
    ): Promise<TeachingDesign | null> => {
      // ... Stage 1: 生成大纲 ...
      
      const { design } = await outlineResponse.json();
      
      // 🆕 Stage 1.5: 启动图片生成（并行，不阻塞）
      if (request.enableImageGeneration) {
        log.info('Starting media generation in background');
        
        // 转换 TeachingSlide[] 为 SceneOutline[] 格式
        const outlines = design.slides.map(slide => ({
          id: slide.id,
          title: slide.title,
          description: slide.description || '',
          type: 'slide' as const,
          keyPoints: slide.keyPoints.map(kp => kp.content),
          mediaGenerations: slide.mediaGenerations,
          // ... 其他必要字段
        }));
        
        // 生成唯一的 stageId
        const stageId = `teaching_${design.id}`;
        
        // 启动媒体生成（异步，不等待）
        generateMediaForOutlines(outlines, stageId).catch(err => {
          log.error('Media generation failed:', err);
        });
      }

      // Stage 2: 生成幻灯片内容（继续原有流程）
      for (let i = 0; i < design.slides.length; i++) {
        // ... 现有代码 ...
      }

      // ... 其余代码不变 ...
    },
    [],
  );

  return {
    ...state,
    generate,
    setDesign,
  };
}
```

### 步骤 5: 在 TeachingRequest 中添加图片生成开关

**文件**: `OpenMAIC/lib/types/teaching.ts`

```typescript
export interface TeachingRequest {
  topic: string;
  subject: string;
  gradeLevel: string;
  duration: number;
  language: string;
  objectives?: {
    knowledge?: string[];
    skills?: string[];
    attitude?: string[];
  };
  additionalNotes?: string;
  useKnowledgeBase?: boolean;
  
  // 🆕 新增：图片生成开关
  enableImageGeneration?: boolean;
}
```

### 步骤 6: 在意图理解页面添加图片生成选项

**文件**: `OpenMAIC/app/teaching-chat/page.tsx`

在生成教学设计时传递图片生成配置：

```typescript
// 在 handleSend 函数中
if (response.ready && response.teachingRequest) {
  // ... 现有代码 ...
  
  // 🆕 添加图片生成配置
  const enhancedRequest = {
    ...response.teachingRequest,
    enableImageGeneration: true,  // 或从用户设置中读取
  };
  
  const design = await generator.generate(enhancedRequest, {
    model,
    materials,
    imageMapping,
    // ... 其他配置
  });
  
  // ... 其余代码 ...
}
```

### 步骤 7: 修改导出功能支持占位符解析

**文件**: `OpenMAIC/lib/export/use-export-teaching-pptx.ts`

在导出 PPT 时，检查并替换图片占位符：

```typescript
import { useMediaGenerationStore, isMediaPlaceholder } from '@/lib/store/media-generation';
import { db, mediaFileKey } from '@/lib/utils/database';

// 在处理图片元素时
if (el.type === 'image') {
  let resolvedSrc = el.src;
  
  // 🆕 检查是否是媒体占位符
  if (isMediaPlaceholder(el.src)) {
    const task = useMediaGenerationStore.getState().tasks[el.src];
    
    if (task?.status === 'done' && task.objectUrl) {
      // 从 IndexedDB 获取实际图片
      const stageId = `teaching_${design.id}`;
      const mediaFile = await db.mediaFiles.get(
        mediaFileKey(stageId, el.src)
      );
      
      if (mediaFile?.blob) {
        // 转换为 base64
        const reader = new FileReader();
        resolvedSrc = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(mediaFile.blob);
        });
      }
    } else if (task?.status === 'generating') {
      // 图片还在生成中，跳过或使用占位图
      log.warn(`Image ${el.src} is still generating, skipping`);
      continue;
    } else if (task?.status === 'failed') {
      // 图片生成失败，跳过
      log.warn(`Image ${el.src} generation failed, skipping`);
      continue;
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

### 步骤 8: 添加图片生成状态显示

**文件**: `OpenMAIC/app/teaching-chat/page.tsx`

在生成进度区域添加图片生成状态：

```typescript
import { useMediaGenerationStore } from '@/lib/store/media-generation';

export default function TeachingChatPage() {
  // ... 现有代码 ...
  
  // 🆕 订阅媒体生成状态
  const mediaTasks = useMediaGenerationStore(state => state.tasks);
  const pendingMedia = Object.values(mediaTasks).filter(t => 
    t.status === 'pending' || t.status === 'generating'
  );
  const completedMedia = Object.values(mediaTasks).filter(t => 
    t.status === 'done'
  );
  const failedMedia = Object.values(mediaTasks).filter(t => 
    t.status === 'failed'
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ... 现有内容 ... */}

      {/* 🆕 图片生成进度 */}
      {pendingMedia.length > 0 && (
        <div className="bg-purple-50 border-t px-6 py-4">
          <div className="text-sm font-medium mb-2">
            🎨 正在生成图片 ({completedMedia.length}/{pendingMedia.length + completedMedia.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.values(mediaTasks).map(task => (
              <div
                key={task.elementId}
                className={`px-3 py-1 rounded text-xs ${
                  task.status === 'done' ? 'bg-green-100 text-green-800' :
                  task.status === 'generating' ? 'bg-yellow-100 text-yellow-800' :
                  task.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}
              >
                {task.status === 'done' ? '✓' :
                 task.status === 'generating' ? '⏳' :
                 task.status === 'failed' ? '✗' : '⋯'} {task.elementId}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ... 其余内容 ... */}
    </div>
  );
}
```

## 完全可复用的组件

以下组件可以直接复用，无需修改：

✅ **图片生成核心**
- `OpenMAIC/lib/media/image-providers.ts` - 图片生成提供商
- `OpenMAIC/lib/media/adapters/*` - 各提供商适配器
- `OpenMAIC/lib/media/types.ts` - 类型定义

✅ **状态管理**
- `OpenMAIC/lib/store/media-generation.ts` - 媒体生成状态
- `OpenMAIC/lib/utils/database.ts` - IndexedDB 存储

✅ **编排器**
- `OpenMAIC/lib/media/media-orchestrator.ts` - 媒体生成编排

✅ **Prompt 模板**
- `OpenMAIC/lib/generation/prompts/templates/slide-content/system.md` - 已包含图片生成说明

## 配置图片生成提供商

在设置页面或环境变量中配置：

```typescript
// .env.local
IMAGE_PROVIDER_ID=seedream  // 或 qwen-image, nano-banana, grok-image
IMAGE_MODEL_ID=doubao-seedream-5-0-260128
IMAGE_API_KEY=your_api_key_here
IMAGE_BASE_URL=https://ark.cn-beijing.volces.com
```

或在代码中：

```typescript
import { useSettingsStore } from '@/lib/store/settings';

// 启用图片生成
useSettingsStore.getState().setImageGenerationEnabled(true);

// 配置提供商
useSettingsStore.getState().setImageProvider('seedream');
useSettingsStore.getState().setImageModelId('doubao-seedream-5-0-260128');
```

## 测试流程

1. **测试大纲生成**
   - 输入教学需求
   - 检查生成的 `design.slides` 是否包含 `mediaGenerations`
   - 验证 `elementId` 格式正确（gen_img_1, gen_img_2）

2. **测试幻灯片生成**
   - 检查生成的 canvas 中是否使用了占位符 ID
   - 验证图片元素的 `src` 字段为 `gen_img_xxx`

3. **测试图片生成**
   - 检查 `useMediaGenerationStore` 中的任务状态
   - 验证图片生成 API 调用成功
   - 检查 IndexedDB 中是否存储了图片 blob

4. **测试导出**
   - 导出 PPT
   - 检查占位符是否被替换为实际图片
   - 验证图片显示正常

## 预期效果

完成改造后，你的教学设计系统将能够：

1. ✅ 在生成大纲时，LLM 自动判断哪些页面需要生成图片
2. ✅ 并行执行图片生成和内容生成，不阻塞主流程
3. ✅ 实时显示图片生成进度
4. ✅ 在预览时显示生成的图片
5. ✅ 导出 PPT 时自动替换占位符为实际图片
6. ✅ 支持多个图片生成提供商（Seedream、Qwen Image 等）
7. ✅ 完善的错误处理和重试机制

## 工作量估算

- **类型定义扩展**: 30 分钟
- **大纲生成器修改**: 1 小时
- **幻灯片生成器修改**: 1 小时
- **集成媒体编排器**: 1.5 小时
- **导出功能修改**: 1 小时
- **UI 状态显示**: 1 小时
- **测试和调试**: 2 小时

**总计**: 约 7.5 小时

## 优势

1. **完全复用现有工具** - 不需要重新实现图片生成逻辑
2. **架构一致** - 与 OpenMAIC 原版保持一致，便于维护
3. **渐进式改造** - 可以逐步添加功能，不影响现有流程
4. **向后兼容** - 不启用图片生成时，系统照常工作
5. **生产级质量** - 复用的都是经过验证的生产代码

## 注意事项

1. **API 费用**: 图片生成会产生额外的 API 调用费用
2. **生成时间**: 图片生成通常需要 5-30 秒，需要合理设置超时
3. **存储空间**: 生成的图片存储在 IndexedDB，注意浏览器存储限制
4. **错误处理**: 图片生成失败时，要有合理的降级策略
5. **内容安全**: 某些 prompt 可能触发安全检查，需要优化 prompt 生成逻辑

## 下一步

如果你决定集成图片生成功能，我可以帮你：

1. 逐步实现每个改造步骤
2. 测试和调试集成代码
3. 优化 prompt 以提高图片生成质量
4. 添加更多图片生成提供商支持
5. 实现图片生成的高级功能（如风格控制、尺寸调整等）
