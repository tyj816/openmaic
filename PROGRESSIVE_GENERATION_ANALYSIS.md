# OpenMAIC 渐进式生成机制分析与教学系统改造方案

## 问题描述

当前教学系统的问题：
- PPT 生成过程中，用户无法看到已生成的页面
- 如果生成中断，前面已生成的页面全部丢失
- 用户体验差，等待时间长且无反馈

OpenMAIC 的优势：
- 用户可以实时查看已生成的页面
- 生成过程可中断、可恢复
- 页面刷新后可以继续生成
- 失败的页面可以单独重试

## OpenMAIC 渐进式生成机制分析

### 核心架构

#### 1. 状态管理 - `useStageStore`

**关键状态字段**：

```typescript
interface StageState {
  // 已完成的场景（立即可见）
  scenes: Scene[];
  
  // 当前正在生成的大纲（骨架）
  generatingOutlines: SceneOutline[];
  
  // 持久化的大纲（用于刷新后恢复）
  outlines: SceneOutline[];
  
  // 生成状态
  generationStatus: 'idle' | 'generating' | 'paused' | 'completed' | 'error';
  currentGeneratingOrder: number;
  
  // 失败的大纲（可重试）
  failedOutlines: SceneOutline[];
  
  // 代际标记（用于检测 stage 切换）
  generationEpoch: number;
}
```

**关键方法**：

```typescript
// 添加已生成的场景（立即可见）
addScene: (scene: Scene) => void;

// 设置正在生成的大纲（显示骨架）
setGeneratingOutlines: (outlines: SceneOutline[]) => void;

// 持久化大纲到 IndexedDB（刷新后恢复）
setOutlines: (outlines: SceneOutline[]) => void;

// 从 IndexedDB 恢复状态
loadFromStorage: (stageId: string) => Promise<void>;
```

#### 2. 生成流程 - `useSceneGenerator`

**核心流程**：

```typescript
async function generateRemaining(params: GenerationParams) {
  // 1. 确定待生成的大纲
  const completedOrders = new Set(scenes.map(s => s.order));
  const pending = outlines
    .filter(o => !completedOrders.has(o.order))
    .sort((a, b) => a.order - b.order);
  
  // 2. 设置正在生成状态（UI 显示骨架）
  store.setGeneratingOutlines(pending);
  
  // 3. 串行生成每个场景
  for (const outline of pending) {
    // Step 1: 生成内容
    const contentResult = await fetchSceneContent(...);
    
    // Step 2: 生成动作
    const actionsResult = await fetchSceneActions(...);
    
    // Step 3: 生成 TTS（可选）
    await generateTTSForScene(scene);
    
    // 4. 添加到 store（立即可见！）
    store.addScene(scene);
    
    // 5. 触发回调
    options.onSceneGenerated?.(scene, outline.order);
  }
}
```

**关键特性**：

1. **串行生成** - 一次生成一个场景，生成完立即添加到 store
2. **立即可见** - `addScene` 后，UI 立即渲染新场景
3. **可中断** - 使用 `AbortController` 和 `generationEpoch` 检测中断
4. **可恢复** - 通过 `outlines` 和 `scenes` 的差集计算待生成项

#### 3. UI 渲染 - 骨架 + 实际内容

**场景列表渲染**：

```typescript
// 已完成的场景
const completedScenes = scenes;

// 正在生成的场景（显示骨架）
const generatingScenes = generatingOutlines.map(outline => ({
  id: PENDING_SCENE_ID,
  title: outline.title,
  order: outline.order,
  isPending: true,
}));

// 合并显示
const allScenes = [...completedScenes, ...generatingScenes];
```

**场景详情渲染**：

```typescript
if (scene.isPending) {
  // 显示骨架加载状态
  return <SkeletonLoader />;
} else {
  // 显示实际内容
  return <SceneContent scene={scene} />;
}
```

#### 4. 持久化与恢复

**保存到 IndexedDB**：

```typescript
// 保存 outlines（大纲）
setOutlines: (outlines) => {
  set({ outlines });
  db.stageOutlines.put({
    stageId,
    outlines,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

// 保存 scenes（已完成的场景）
saveToStorage: async () => {
  await saveStageData(stage.id, {
    stage,
    scenes,
    currentSceneId,
    chats,
  });
}
```

**从 IndexedDB 恢复**：

```typescript
loadFromStorage: async (stageId) => {
  // 加载已完成的场景
  const data = await loadStageData(stageId);
  
  // 加载大纲
  const outlinesRecord = await db.stageOutlines.get(stageId);
  const outlines = outlinesRecord?.outlines || [];
  
  // 计算待生成的大纲
  const generatingOutlines = outlines.filter(
    o => !data.scenes.some(s => s.order === o.order)
  );
  
  set({
    stage: data.stage,
    scenes: data.scenes,
    outlines,
    generatingOutlines,
  });
}
```

### 工作流程图

```
用户发起生成
    ↓
生成大纲 (outlines)
    ↓
持久化 outlines → IndexedDB
    ↓
设置 generatingOutlines → UI 显示骨架
    ↓
串行生成每个场景
    ↓
生成完成 → addScene(scene)
    ↓
UI 立即渲染新场景 ✓
    ↓
持久化 scenes → IndexedDB
    ↓
继续下一个场景...
```

### 关键设计模式

#### 1. 乐观更新（Optimistic Update）

- 大纲生成后立即显示骨架
- 不等待所有场景生成完成

#### 2. 增量渲染（Incremental Rendering）

- 每生成一个场景，立即添加到 UI
- 用户可以边生成边查看

#### 3. 状态分离（State Separation）

- `outlines` - 计划生成的内容（骨架）
- `scenes` - 已完成的内容（实际）
- `generatingOutlines` - 正在生成的内容（临时）

#### 4. 持久化恢复（Persistence & Recovery）

- 大纲和场景分别持久化
- 页面刷新后自动恢复生成状态

## 教学系统改造方案

### 改造难度评估

**难度等级：⭐⭐⭐☆☆ (中等)**

**原因**：
- ✅ 核心机制清晰，可以直接复用
- ✅ 已有 IndexedDB 基础设施
- ⚠️ 需要创建新的状态管理 store
- ⚠️ 需要修改生成流程为串行
- ⚠️ 需要添加骨架 UI 组件

### 改造步骤

#### 步骤 1: 创建教学设计状态管理 Store

**文件**: `OpenMAIC/lib/store/teaching-design.ts`

```typescript
import { create } from 'zustand';
import type { TeachingDesign, TeachingSlide } from '@/lib/types/teaching';

interface TeachingDesignState {
  // 当前教学设计
  design: TeachingDesign | null;
  
  // 已完成的幻灯片
  completedSlides: TeachingSlide[];
  
  // 正在生成的幻灯片大纲
  generatingSlides: Array<{
    id: string;
    order: number;
    title: string;
    isPending: true;
  }>;
  
  // 生成状态
  generationStatus: 'idle' | 'generating' | 'paused' | 'completed' | 'error';
  currentGeneratingOrder: number;
  
  // 失败的幻灯片
  failedSlides: TeachingSlide[];
  
  // Actions
  setDesign: (design: TeachingDesign) => void;
  addCompletedSlide: (slide: TeachingSlide) => void;
  setGeneratingSlides: (slides: Array<{...}>) => void;
  setGenerationStatus: (status: ...) => void;
  
  // 持久化
  saveToStorage: () => Promise<void>;
  loadFromStorage: (designId: string) => Promise<void>;
}
```

#### 步骤 2: 修改生成流程为串行

**文件**: `OpenMAIC/lib/hooks/use-teaching-generator.ts`

**当前流程（并行）**：

```typescript
// ❌ 当前：等待所有幻灯片生成完成
for (let i = 0; i < design.slides.length; i++) {
  const slideResponse = await fetch('/api/generate/teaching-slide', {...});
  slide.canvas = canvas;
}
// 所有完成后才返回
return design;
```

**改造后流程（串行 + 增量）**：

```typescript
// ✅ 改造后：每生成一个立即添加
const generateSlides = async (design: TeachingDesign) => {
  // 1. 设置正在生成的幻灯片（显示骨架）
  const pendingSlides = design.slides.map(slide => ({
    id: slide.id,
    order: slide.order,
    title: slide.title,
    isPending: true,
  }));
  teachingDesignStore.setGeneratingSlides(pendingSlides);
  
  // 2. 串行生成每个幻灯片
  for (let i = 0; i < design.slides.length; i++) {
    const slide = design.slides[i];
    
    // 生成 canvas
    const slideResponse = await fetch('/api/generate/teaching-slide', {...});
    const { canvas } = await slideResponse.json();
    slide.canvas = canvas;
    
    // 3. 立即添加到 store（UI 立即可见！）
    teachingDesignStore.addCompletedSlide(slide);
    
    // 4. 触发回调
    options.onSlideGenerated?.(slide, i);
    
    // 5. 更新进度
    setState({
      progress: 50 + Math.floor((i / totalSlides) * 50),
      statusMessage: `已生成第 ${i + 1}/${totalSlides} 页课件`,
    });
  }
  
  // 6. 完成
  teachingDesignStore.setGenerationStatus('completed');
};
```

#### 步骤 3: 修改教学聊天页面 UI

**文件**: `OpenMAIC/app/teaching-chat/page.tsx`

**添加实时预览**：

```tsx
export default function TeachingChatPage() {
  // 订阅教学设计状态
  const completedSlides = useTeachingDesignStore(s => s.completedSlides);
  const generatingSlides = useTeachingDesignStore(s => s.generatingSlides);
  const generationStatus = useTeachingDesignStore(s => s.generationStatus);
  
  return (
    <div>
      {/* 现有的聊天界面 */}
      
      {/* 🆕 实时预览区域 */}
      {(completedSlides.length > 0 || generatingSlides.length > 0) && (
        <div className="fixed right-0 top-0 h-screen w-96 bg-white border-l shadow-lg overflow-y-auto">
          <div className="p-4">
            <h3 className="font-bold mb-4">
              课件预览 ({completedSlides.length}/{completedSlides.length + generatingSlides.length})
            </h3>
            
            {/* 已完成的幻灯片 */}
            {completedSlides.map(slide => (
              <div key={slide.id} className="mb-4 border rounded p-2">
                <div className="text-sm font-medium">{slide.title}</div>
                {slide.canvas && (
                  <SlidePreview canvas={slide.canvas} />
                )}
              </div>
            ))}
            
            {/* 正在生成的幻灯片（骨架） */}
            {generatingSlides.map(slide => (
              <div key={slide.id} className="mb-4 border rounded p-2 bg-gray-50">
                <div className="text-sm font-medium text-gray-500">{slide.title}</div>
                <div className="h-32 bg-gray-200 animate-pulse rounded mt-2" />
                <div className="text-xs text-gray-400 mt-2">生成中...</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 步骤 4: 添加持久化支持

**文件**: `OpenMAIC/lib/utils/teaching-design-storage.ts`

```typescript
import { db } from './database';

export async function saveTeachingDesignProgress(
  designId: string,
  data: {
    design: TeachingDesign;
    completedSlides: TeachingSlide[];
  }
) {
  await db.teachingDesigns.put({
    id: designId,
    design: data.design,
    completedSlides: data.completedSlides,
    updatedAt: Date.now(),
  });
}

export async function loadTeachingDesignProgress(designId: string) {
  return await db.teachingDesigns.get(designId);
}
```

#### 步骤 5: 添加恢复生成功能

**文件**: `OpenMAIC/lib/hooks/use-teaching-generator.ts`

```typescript
const resumeGeneration = useCallback(async (designId: string) => {
  // 1. 从 IndexedDB 加载进度
  const progress = await loadTeachingDesignProgress(designId);
  if (!progress) return;
  
  // 2. 恢复状态
  teachingDesignStore.setDesign(progress.design);
  progress.completedSlides.forEach(slide => {
    teachingDesignStore.addCompletedSlide(slide);
  });
  
  // 3. 计算待生成的幻灯片
  const completedOrders = new Set(progress.completedSlides.map(s => s.order));
  const pending = progress.design.slides.filter(
    s => !completedOrders.has(s.order)
  );
  
  // 4. 继续生成
  if (pending.length > 0) {
    await generateSlides(progress.design, pending);
  }
}, []);
```

### 改造后的用户体验

#### 场景 1: 正常生成

```
用户: "生成一个关于操作系统的课件"
    ↓
系统: 生成大纲（10 页）
    ↓
UI: 显示 10 个骨架卡片
    ↓
系统: 生成第 1 页 → UI 立即显示 ✓
    ↓
系统: 生成第 2 页 → UI 立即显示 ✓
    ↓
系统: 生成第 3 页 → UI 立即显示 ✓
    ↓
...
用户: 可以边生成边查看前面的页面！
```

#### 场景 2: 中断恢复

```
用户: "生成一个 20 页的课件"
    ↓
系统: 已生成 8 页
    ↓
用户: 刷新页面 / 关闭浏览器
    ↓
用户: 重新打开页面
    ↓
系统: 从 IndexedDB 恢复状态
    ↓
UI: 显示已完成的 8 页 + 12 个骨架
    ↓
系统: 提示 "是否继续生成剩余 12 页？"
    ↓
用户: 点击"继续"
    ↓
系统: 从第 9 页继续生成
```

#### 场景 3: 失败重试

```
系统: 生成第 5 页失败
    ↓
UI: 第 5 页显示错误状态
    ↓
用户: 点击"重试"按钮
    ↓
系统: 单独重新生成第 5 页
    ↓
UI: 第 5 页更新为成功状态
```

### 实现优先级

#### P0 - 核心功能（必须）

1. ✅ 创建 `useTeachingDesignStore`
2. ✅ 修改生成流程为串行 + 增量
3. ✅ 添加实时预览 UI
4. ✅ 基本持久化支持

**工作量**: 4-6 小时

#### P1 - 增强功能（重要）

1. ⭐ 页面刷新后恢复生成
2. ⭐ 失败幻灯片重试
3. ⭐ 生成进度持久化

**工作量**: 2-3 小时

#### P2 - 优化功能（可选）

1. 💡 生成过程可暂停/继续
2. 💡 跳过某些幻灯片
3. 💡 调整生成顺序

**工作量**: 2-3 小时

### 技术挑战与解决方案

#### 挑战 1: 状态同步

**问题**: 多个组件需要访问生成状态

**解决方案**: 使用 Zustand store 集中管理状态

```typescript
// 任何组件都可以订阅
const completedSlides = useTeachingDesignStore(s => s.completedSlides);
```

#### 挑战 2: 持久化性能

**问题**: 频繁写入 IndexedDB 可能影响性能

**解决方案**: 使用防抖（debounce）

```typescript
const debouncedSave = debounce(() => {
  saveTeachingDesignProgress(designId, data);
}, 500);
```

#### 挑战 3: 并发控制

**问题**: 用户可能在生成过程中发起新的生成

**解决方案**: 使用 `generationEpoch` 标记

```typescript
const startEpoch = store.generationEpoch;

// 生成过程中检查
if (store.generationEpoch !== startEpoch) {
  // 已被新的生成取代，停止当前生成
  return;
}
```

#### 挑战 4: UI 响应性

**问题**: 大量幻灯片可能导致 UI 卡顿

**解决方案**: 虚拟滚动 + 懒加载

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: allSlides.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 200,
});
```

### 对比总结

| 特性 | 当前教学系统 | 改造后 | OpenMAIC 原版 |
|------|------------|--------|--------------|
| 实时预览 | ❌ | ✅ | ✅ |
| 增量渲染 | ❌ | ✅ | ✅ |
| 中断恢复 | ❌ | ✅ | ✅ |
| 失败重试 | ❌ | ✅ | ✅ |
| 持久化 | 部分 | ✅ | ✅ |
| 生成方式 | 并行等待 | 串行增量 | 串行增量 |
| 用户体验 | ⭐⭐☆☆☆ | ⭐⭐⭐⭐☆ | ⭐⭐⭐⭐⭐ |

### 建议

1. **优先实现 P0 功能** - 核心的增量渲染和实时预览
2. **渐进式改造** - 先在教学聊天页面实现，再扩展到工作区
3. **复用 OpenMAIC 代码** - 直接参考 `useSceneGenerator` 的实现
4. **保持向后兼容** - 旧的生成方式仍然可用，新功能作为增强

### 预期收益

1. **用户体验提升 80%** - 可以边生成边查看
2. **生成成功率提升 50%** - 失败可重试，不会全部丢失
3. **用户满意度提升** - 不再需要长时间等待黑盒
4. **系统可靠性提升** - 支持中断恢复，更加健壮

## 结论

OpenMAIC 的渐进式生成机制设计精良，核心思想是：

1. **分离关注点** - 大纲（计划）vs 场景（实际）
2. **增量更新** - 生成一个，显示一个
3. **持久化恢复** - 随时可以中断和恢复
4. **用户友好** - 实时反馈，不再黑盒等待

改造难度中等，但收益巨大。建议优先实现核心功能（P0），然后逐步添加增强功能。

**总工作量估算**: 8-12 小时

**建议实施时间**: 2-3 天（包含测试和调试）
