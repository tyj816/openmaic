# Teaching 系统与 OpenMAIC 工作流对比分析

## 📋 概述

本文档详细分析 Teaching 系统（`teaching-outline-generator.ts` + `teaching-slide-generator.ts`）与原 OpenMAIC 工作流（`outline-generator.ts` + `generation-pipeline.ts`）的关系，以及是否可以进一步复用。

---

## 1️⃣ 工作流对比

### 原 OpenMAIC 工作流

```
pipeline-runner.ts (编排层)
    ↓
┌─────────────────────────────────────────────────┐
│ Stage 1: Requirements → SceneOutlines          │
│ (outline-generator.ts)                         │
│                                                 │
│ Input:  UserRequirements                       │
│ Output: SceneOutline[]                         │
│                                                 │
│ 特点：                                          │
│ - 简化的需求输入（requirement + language）      │
│ - 支持 PDF 文本和图片                           │
│ - 支持 Vision 模式                              │
│ - 支持媒体生成（image/video）                   │
│ - 支持用户画像（userNickname, userBio）        │
│ - 支持研究上下文（researchContext）             │
│ - 支持教师人设（teacherContext）                │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│ Stage 2: SceneOutlines → Scenes                │
│ (scene-generator.ts)                           │
│                                                 │
│ Input:  SceneOutline[]                         │
│ Output: Scene[]                                │
│                                                 │
│ 特点：                                          │
│ - 支持 4 种场景类型（slide/quiz/interactive/pbl）│
│ - 每种类型有专门的生成逻辑                       │
│ - 使用高质量 2000+ 行 prompt                    │
│ - 完善的后处理（fixElementDefaults 等）         │
│ - 支持 Actions 生成（教师/学生互动）             │
└─────────────────────────────────────────────────┘
    ↓
完整的 Scene[] (包含 Slide + Actions)
```

### Teaching 系统工作流

```
use-teaching-generator.ts (编排层)
    ↓
┌─────────────────────────────────────────────────┐
│ Stage 1: TeachingRequest → TeachingDesign      │
│ (teaching-outline-generator.ts)                │
│                                                 │
│ Input:  TeachingRequest                        │
│ Output: TeachingDesign                         │
│                                                 │
│ 特点：                                          │
│ - 教育专用的需求结构（subject, topic, grade）   │
│ - 三源融合（teacher + material + RAG）          │
│ - 支持 FastGPT 知识库查询                       │
│ - 生成完整教学设计（objectives, procedures）    │
│ - 支持来源标记（KeyPointWithSource）            │
│ - 支持 PDF 材料解析                             │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│ Stage 2: TeachingSlide → Slide                 │
│ (teaching-slide-generator.ts)                  │
│                                                 │
│ Input:  TeachingSlide                          │
│ Output: Slide                                  │
│                                                 │
│ 特点：                                          │
│ - 复用原系统的高质量 prompt（SLIDE_CONTENT）    │
│ - 复用原系统的后处理逻辑                         │
│ - 只支持 slide 类型（不支持 quiz/interactive）  │
│ - 不支持 Actions 生成                           │
└─────────────────────────────────────────────────┘
    ↓
TeachingDesign (包含 Slide[])
```

---

## 2️⃣ 借鉴情况分析

### ✅ 已借鉴的部分

#### 1. Prompt 系统（100% 复用）

**teaching-slide-generator.ts 第 88-98 行**:
```typescript
// Use the original high-quality slide content prompt system
const prompts = buildPrompt(PROMPT_IDS.SLIDE_CONTENT, {
  title: teachingSlide.title,
  description: teachingSlide.description || keyPointsContent.join('; '),
  keyPoints: keyPointsContent.map((p, i) => `${i + 1}. ${p}`).join('\n'),
  assignedImages: assignedImagesText,
  canvas_width: canvasWidth,
  canvas_height: canvasHeight,
  teacherContext: '',
});
```

**来源**: `scene-generator.ts` 的 `generateSlideContent` 函数

**复用程度**: 100%
- ✅ 使用相同的 `buildPrompt` 函数
- ✅ 使用相同的 `PROMPT_IDS.SLIDE_CONTENT`
- ✅ 传递相同的参数结构

#### 2. 后处理逻辑（80% 复用）

**teaching-slide-generator.ts 第 230-330 行**:
```typescript
// Fix elements with missing required fields
const fixedElements = fixElementDefaults(generatedData.elements, assignedImages);

// Process LaTeX elements
const latexProcessedElements = processLatexElements(fixedElements);

// Resolve image IDs to actual URLs
const resolvedElements = resolveImageIds(latexProcessedElements, imageMapping);
```

**来源**: `scene-generator.ts` 的后处理函数

**复用程度**: 80%
- ✅ `fixElementDefaults` - 完全复制（Line/Text/Image/Shape 修复）
- ✅ `processLatexElements` - 完全复制（KaTeX 渲染）
- ⚠️ `resolveImageIds` - 简化版（不支持 gen_img_*/gen_vid_*）

#### 3. 图片处理（100% 复用）

**teaching-slide-generator.ts 第 50-80 行**:
```typescript
if (visionEnabled && imageMapping) {
  const withSrc = assignedImages.filter((img) => imageMapping[img.id]);
  const visionSlice = withSrc.slice(0, MAX_VISION_IMAGES);
  // ... Vision 模式处理
}
```

**来源**: `outline-generator.ts` 的图片处理逻辑

**复用程度**: 100%
- ✅ Vision 模式支持
- ✅ 图片描述格式化
- ✅ MAX_VISION_IMAGES 限制

#### 4. 工具函数（100% 复用）

**teaching-slide-generator.ts 导入**:
```typescript
import { formatImageDescription, formatImagePlaceholder } from './prompt-formatters';
import { parseJsonResponse } from './json-repair';
```

**来源**: `prompt-formatters.ts` 和 `json-repair.ts`

**复用程度**: 100%

---

### ❌ 未借鉴的部分

#### 1. 编排层（pipeline-runner.ts）

**原系统**:
```typescript
// pipeline-runner.ts
export async function runGenerationPipeline(
  session: GenerationSession,
  store: StageStore,
  aiCall: AICallFn,
  callbacks?: GenerationCallbacks,
): Promise<GenerationResult<GenerationSession>> {
  // Stage 1: Generate Scene Outlines
  const outlinesResult = await generateSceneOutlinesFromRequirements(...);
  
  // Stage 2: Generate Full Scenes
  const scenesResult = await generateFullScenes(...);
  
  // Complete
  session.completedAt = new Date();
  return { success: true, data: session };
}
```

**Teaching 系统**:
```typescript
// use-teaching-generator.ts
export function useTeachingGenerator() {
  const generate = async (request, options) => {
    // Stage 1: 通过 API 调用
    const outlineResponse = await fetch('/api/generate/teaching-outline', {...});
    
    // Stage 2: 循环调用 API
    for (let i = 0; i < design.slides.length; i++) {
      const slideResponse = await fetch('/api/generate/teaching-slide', {...});
    }
  };
}
```

**差异**:
- ❌ Teaching 系统没有统一的编排层
- ❌ 通过 HTTP API 调用，而非直接函数调用
- ❌ 没有 `GenerationSession` 概念
- ❌ 没有 `StageStore` 中间状态存储

#### 2. 多场景类型支持

**原系统**:
```typescript
// scene-generator.ts
export async function generateFullScenes(
  outlines: SceneOutline[],
  store: StageStore,
  aiCall: AICallFn,
  callbacks?: GenerationCallbacks,
): Promise<GenerationResult<Scene[]>> {
  for (const outline of outlines) {
    switch (outline.type) {
      case 'slide':
        scene = await generateSlideScene(...);
        break;
      case 'quiz':
        scene = await generateQuizScene(...);
        break;
      case 'interactive':
        scene = await generateInteractiveScene(...);
        break;
      case 'pbl':
        scene = await generatePBLScene(...);
        break;
    }
  }
}
```

**Teaching 系统**:
```typescript
// teaching-slide-generator.ts
// 只支持 slide 类型，没有 quiz/interactive/pbl
export async function generateSlideFromTeachingSlide(
  teachingSlide: TeachingSlide,
  aiCall: AICallFn,
  ...
): Promise<Slide | null> {
  // 只生成 Slide，不支持其他类型
}
```

**差异**:
- ❌ Teaching 系统只支持 slide 类型
- ❌ 不支持 quiz（测验）
- ❌ 不支持 interactive（交互式）
- ❌ 不支持 pbl（项目式学习）

#### 3. Actions 生成

**原系统**:
```typescript
// scene-generator.ts
async function generateSceneActions(
  outline: SceneOutline,
  slide: Slide,
  aiCall: AICallFn,
): Promise<Action[]> {
  // 生成教师和学生的互动 Actions
  const prompts = buildPrompt(PROMPT_IDS.SLIDE_ACTIONS, {...});
  const response = await aiCall(prompts.system, prompts.user);
  return parseJsonResponse<Action[]>(response);
}
```

**Teaching 系统**:
```typescript
// teaching-slide-generator.ts
// 没有 Actions 生成逻辑
// 只生成 Slide，不生成 Actions
```

**差异**:
- ❌ Teaching 系统不生成 Actions
- ❌ 没有教师/学生互动设计
- ❌ 缺少课堂活动编排

#### 4. 中间状态存储（StageStore）

**原系统**:
```typescript
// pipeline-runner.ts
const scenesResult = await generateFullScenes(
  session.sceneOutlines,
  store,  // ← StageStore 用于存储中间状态
  aiCall,
  callbacks
);
```

**Teaching 系统**:
```typescript
// use-teaching-generator.ts
// 没有 StageStore
// 所有状态都在 React state 中
const [state, setState] = useState<TeachingGeneratorState>({...});
```

**差异**:
- ❌ Teaching 系统没有中间状态持久化
- ❌ 刷新页面会丢失进度
- ❌ 无法断点续传

---

## 3️⃣ 可以复用的部分

### 🟢 高优先级（建议立即复用）

#### 1. 统一编排层（pipeline-runner 模式）

**当前问题**:
```typescript
// use-teaching-generator.ts - 混乱的编排
const generate = async (request, options) => {
  // Stage 1: HTTP 调用
  const outlineResponse = await fetch('/api/generate/teaching-outline', {...});
  const { design } = await outlineResponse.json();
  
  // Stage 2: 循环 HTTP 调用
  for (let i = 0; i < design.slides.length; i++) {
    const slideResponse = await fetch('/api/generate/teaching-slide', {...});
    const { canvas } = await slideResponse.json();
    slide.canvas = canvas;
  }
};
```

**建议改进**:
```typescript
// teaching-pipeline-runner.ts (新文件)
export async function runTeachingGenerationPipeline(
  request: TeachingRequest,
  materials: ReferenceMaterial[],
  aiCall: AICallFn,
  callbacks?: GenerationCallbacks,
): Promise<GenerationResult<TeachingDesign>> {
  // Stage 1: Generate Teaching Design
  const designResult = await generateTeachingDesignFromRequest(
    request,
    materials,
    aiCall,
    callbacks
  );
  
  if (!designResult.success || !designResult.data) {
    return designResult;
  }
  
  const design = designResult.data;
  
  // Stage 2: Generate Slides
  for (let i = 0; i < design.slides.length; i++) {
    const slide = design.slides[i];
    const canvas = await generateSlideFromTeachingSlide(
      slide,
      aiCall,
      materials?.flatMap(m => m.parsedImages || []),
      imageMapping,
      visionEnabled,
      request.language
    );
    
    if (canvas) {
      slide.canvas = canvas;
    }
    
    callbacks?.onProgress?.({
      currentStage: 2,
      overallProgress: 50 + Math.floor((i / design.slides.length) * 50),
      stageProgress: Math.floor(((i + 1) / design.slides.length) * 100),
      statusMessage: `正在生成第 ${i + 1}/${design.slides.length} 页课件...`,
      scenesGenerated: i + 1,
      totalScenes: design.slides.length,
    });
  }
  
  return { success: true, data: design };
}
```

**优势**:
- ✅ 统一的编排逻辑
- ✅ 直接函数调用，无 HTTP 开销
- ✅ 更好的错误处理
- ✅ 更清晰的进度回调

#### 2. 中间状态存储（StageStore）

**当前问题**:
- 刷新页面丢失进度
- 无法断点续传
- 无法查看中间结果

**建议改进**:
```typescript
// teaching-stage-store.ts (新文件)
export interface TeachingStageStore {
  // Stage 1 结果
  saveTeachingDesign(design: TeachingDesign): Promise<void>;
  getTeachingDesign(id: string): Promise<TeachingDesign | null>;
  
  // Stage 2 结果
  saveSlideCanvas(slideId: string, canvas: Slide): Promise<void>;
  getSlideCanvas(slideId: string): Promise<Slide | null>;
  
  // 进度
  saveProgress(sessionId: string, progress: GenerationProgress): Promise<void>;
  getProgress(sessionId: string): Promise<GenerationProgress | null>;
}

// 使用 IndexedDB 实现
export class IndexedDBTeachingStore implements TeachingStageStore {
  // ... 实现
}
```

**优势**:
- ✅ 刷新页面不丢失进度
- ✅ 支持断点续传
- ✅ 可以查看中间结果
- ✅ 可以回退到某个阶段

#### 3. 媒体生成支持（gen_img_*/gen_vid_*）

**当前问题**:
```typescript
// teaching-slide-generator.ts
function resolveImageIds(elements, imageMapping) {
  // 只支持 img_1, img_2 等 PDF 图片
  // 不支持 gen_img_1, gen_vid_1 等生成图片
}
```

**建议改进**:
```typescript
// teaching-slide-generator.ts
function resolveImageIds(
  elements: GeneratedSlideData['elements'],
  imageMapping?: ImageMapping,
  generatedMediaMapping?: Record<string, string>,  // 新增
): GeneratedSlideData['elements'] {
  return elements.map((el) => {
    if (el.type === 'image') {
      const src = el.src as string;
      
      // 支持 PDF 图片
      if (isImageIdReference(src) && imageMapping?.[src]) {
        return { ...el, src: imageMapping[src] };
      }
      
      // 支持生成图片
      if (isGeneratedImageId(src) && generatedMediaMapping?.[src]) {
        return { ...el, src: generatedMediaMapping[src] };
      }
      
      // 无效图片，移除
      log.warn(`No mapping for image: ${src}`);
      return null;
    }
    return el;
  }).filter(el => el !== null);
}

function isGeneratedImageId(value: string): boolean {
  return /^gen_(img|vid)_\d+$/i.test(value);
}
```

**优势**:
- ✅ 支持 AI 生成图片
- ✅ 支持 AI 生成视频
- ✅ 更丰富的视觉表现

---

### 🟡 中优先级（可选复用）

#### 4. 多场景类型支持

**当前限制**:
- 只支持 slide 类型
- 不支持 quiz（测验）
- 不支持 interactive（交互式）
- 不支持 pbl（项目式学习）

**建议改进**:
```typescript
// teaching-outline-generator.ts
export interface TeachingSlide {
  // ... 现有字段
  type?: 'cover' | 'content' | 'quiz' | 'interactive' | 'end';  // 扩展类型
  
  // Quiz 配置
  quizConfig?: {
    questions: QuizQuestion[];
    timeLimit?: number;
  };
  
  // Interactive 配置
  interactiveConfig?: {
    conceptName: string;
    interactionType: 'drag-drop' | 'click-reveal' | 'simulation';
  };
}

// teaching-slide-generator.ts
export async function generateSlideFromTeachingSlide(
  teachingSlide: TeachingSlide,
  aiCall: AICallFn,
  ...
): Promise<Slide | null> {
  // 根据类型选择不同的生成逻辑
  switch (teachingSlide.type) {
    case 'quiz':
      return generateQuizSlide(teachingSlide, aiCall, ...);
    case 'interactive':
      return generateInteractiveSlide(teachingSlide, aiCall, ...);
    default:
      return generateNormalSlide(teachingSlide, aiCall, ...);
  }
}
```

**优势**:
- ✅ 更丰富的教学形式
- ✅ 支持测验和互动
- ✅ 提升教学效果

#### 5. Actions 生成

**当前限制**:
- 没有教师/学生互动设计
- 缺少课堂活动编排

**建议改进**:
```typescript
// teaching-slide-generator.ts
export async function generateSlideWithActions(
  teachingSlide: TeachingSlide,
  aiCall: AICallFn,
  ...
): Promise<{ slide: Slide; actions: Action[] }> {
  // 生成 Slide
  const slide = await generateSlideFromTeachingSlide(...);
  
  // 生成 Actions
  const actions = await generateTeachingActions(teachingSlide, slide, aiCall);
  
  return { slide, actions };
}

async function generateTeachingActions(
  teachingSlide: TeachingSlide,
  slide: Slide,
  aiCall: AICallFn,
): Promise<Action[]> {
  const prompts = buildPrompt(PROMPT_IDS.SLIDE_ACTIONS, {
    title: teachingSlide.title,
    keyPoints: teachingSlide.keyPoints.map(kp => kp.content).join('\n'),
    description: teachingSlide.description,
    elements: formatElementsForPrompt(slide.elements),
  });
  
  const response = await aiCall(prompts.system, prompts.user);
  return parseJsonResponse<Action[]>(response);
}
```

**优势**:
- ✅ 完整的课堂互动设计
- ✅ 教师/学生活动编排
- ✅ 更好的教学体验

---

### 🔵 低优先级（暂不复用）

#### 6. 用户画像（userNickname, userBio）

**原系统**:
```typescript
// outline-generator.ts
const userProfileText = requirements.userNickname || requirements.userBio
  ? `## Student Profile\n\nStudent: ${requirements.userNickname}...`
  : '';
```

**Teaching 系统**:
- 当前不需要（面向教师，不是学生）
- 如果未来支持"个性化教学"，可以复用

#### 7. 研究上下文（researchContext）

**原系统**:
```typescript
// outline-generator.ts
researchContext: options?.researchContext || '无'
```

**Teaching 系统**:
- 已有类似功能（FastGPT 知识库）
- 不需要额外的 researchContext

---

## 4️⃣ 复用优先级总结

### 立即复用（高优先级）

| 功能 | 当前状态 | 复用难度 | 预期收益 | 工作量 |
|------|---------|---------|---------|--------|
| 统一编排层 | ❌ 缺失 | 🟢 低 | ⭐⭐⭐⭐⭐ | 2-3 天 |
| 中间状态存储 | ❌ 缺失 | 🟡 中 | ⭐⭐⭐⭐ | 3-5 天 |
| 媒体生成支持 | ⚠️ 部分 | 🟢 低 | ⭐⭐⭐ | 1-2 天 |

### 可选复用（中优先级）

| 功能 | 当前状态 | 复用难度 | 预期收益 | 工作量 |
|------|---------|---------|---------|--------|
| 多场景类型 | ❌ 缺失 | 🔴 高 | ⭐⭐⭐⭐ | 1-2 周 |
| Actions 生成 | ❌ 缺失 | 🟡 中 | ⭐⭐⭐ | 3-5 天 |

### 暂不复用（低优先级）

| 功能 | 当前状态 | 复用难度 | 预期收益 | 工作量 |
|------|---------|---------|---------|--------|
| 用户画像 | ❌ 缺失 | 🟢 低 | ⭐⭐ | 1 天 |
| 研究上下文 | ✅ 已有 | - | - | - |

---

## 5️⃣ 实施建议

### 阶段 1: 立即改进（1周内）

**目标**: 复用编排层和中间状态存储

**步骤**:
1. 创建 `teaching-pipeline-runner.ts`
2. 创建 `teaching-stage-store.ts`
3. 修改 `use-teaching-generator.ts` 使用新的编排层
4. 添加断点续传功能

**预期效果**:
- ✅ 代码结构更清晰
- ✅ 刷新页面不丢失进度
- ✅ 支持断点续传

### 阶段 2: 功能增强（2-3周内）

**目标**: 添加媒体生成和多场景类型支持

**步骤**:
1. 扩展 `resolveImageIds` 支持 gen_img_*/gen_vid_*
2. 添加 quiz/interactive 场景类型
3. 实现对应的生成逻辑

**预期效果**:
- ✅ 支持 AI 生成图片/视频
- ✅ 支持测验和互动场景
- ✅ 教学形式更丰富

### 阶段 3: 完善体验（1个月内）

**目标**: 添加 Actions 生成和用户画像

**步骤**:
1. 实现 `generateTeachingActions`
2. 添加用户画像支持（可选）
3. 完善错误处理和降级策略

**预期效果**:
- ✅ 完整的课堂互动设计
- ✅ 个性化教学支持
- ✅ 更好的用户体验

---

## 6️⃣ 总结

### 当前借鉴情况

| 模块 | 借鉴程度 | 说明 |
|------|---------|------|
| Prompt 系统 | ✅ 100% | 完全复用 SLIDE_CONTENT prompt |
| 后处理逻辑 | ✅ 80% | 复用 fixElementDefaults 等 |
| 图片处理 | ✅ 100% | 完全复用 Vision 模式 |
| 工具函数 | ✅ 100% | 完全复用 formatters 和 json-repair |
| 编排层 | ❌ 0% | 未复用 pipeline-runner |
| 状态存储 | ❌ 0% | 未复用 StageStore |
| 多场景类型 | ❌ 0% | 只支持 slide |
| Actions 生成 | ❌ 0% | 未实现 |

### 核心结论

1. **已经做得好的**:
   - ✅ Prompt 系统完全复用，质量有保障
   - ✅ 后处理逻辑基本复用，功能完整
   - ✅ 三源融合是创新点，不需要复用

2. **需要改进的**:
   - ⚠️ 缺少统一编排层，代码结构混乱
   - ⚠️ 缺少中间状态存储，用户体验差
   - ⚠️ 功能单一，只支持 slide 类型

3. **建议优先级**:
   - 🔴 高优先级：编排层 + 状态存储（1周）
   - 🟡 中优先级：媒体生成 + 多场景类型（2-3周）
   - 🟢 低优先级：Actions + 用户画像（1个月）

---

**文档日期**: 2026-04-11  
**分析人员**: Kiro AI Assistant  
**状态**: ✅ 完成
