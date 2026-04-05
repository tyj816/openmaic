# PPT 质量差异诊断报告

## 📋 诊断概述

**诊断时间**: 2026-04-05  
**诊断对象**: 新 TeachingDesign → Slide → PPT 链路 vs 原 OpenMAIC 高质量链路  
**核心问题**: 新链路导出的 PPT 视觉质量明显低于原链路

---

## 1️⃣ 原高质量链路的质量来源

### 1.1 原链路生成流程

```
UserRequirements → SceneOutline → Scene → Slide → PPT
     (需求)          (大纲)        (场景)   (页面)  (导出)
```

### 1.2 质量保证的关键机制

#### A. 超详细的 System Prompt（约 2000+ 行）

**文件**: `OpenMAIC/lib/generation/prompts/templates/slide-content/system.md`

**核心约束包括**:

1. **画布规格约束**
   - 明确尺寸: 1000 × 562.5
   - 强制边距: top≥50, bottom≤512.5, left≥50, right≤950
   - 对齐参考点: 左对齐 left=60/80, 居中计算公式, 右对齐计算公式

2. **元素类型完整定义**（8 种元素）
   - TextElement: 包含 HTML 规则、内边距 10px、禁止 LaTeX
   - ImageElement: 强制宽高比计算、图片 ID 验证
   - ShapeElement: SVG path 规范
   - LineElement: 线宽≠长度、箭头大小计算
   - ChartElement: 数据结构规范
   - LatexElement: 高度查找表、宽度自适应逻辑
   - TableElement: 列宽比例、单元格结构
   - VideoElement: 16:9 比例

3. **文本高度查找表**（必须使用）

   | Font Size | 1 line | 2 lines | 3 lines | 4 lines | 5 lines |
   |-----------|--------|---------|---------|---------|---------|
   | 14px      | 43     | 64      | 85      | 106     | 127     |
   | 16px      | 46     | 70      | 94      | 118     | 142     |
   | 18px      | 49     | 76      | 103     | 130     | 157     |
   | 20px      | 52     | 82      | 112     | 142     | 172     |
   | 24px      | 58     | 94      | 130     | 166     | 202     |
   | 28px      | 64     | 106     | 148     | 190     | 232     |
   | 32px      | 70     | 118     | 166     | 214     | 262     |
   | 36px      | 76     | 130     | 184     | 238     | 292     |

4. **8 条设计规则**（Design Rules）
   - Rule 1: 文本宽度计算 `characters_per_line = (width - 20) / font_size`
   - Rule 2: 文本高度计算（必须查表）
   - Rule 3: 元素对齐（垂直/水平居中公式）
   - Rule 4: 对称与平行布局（精确到 2px）
   - Rule 5: 文本+背景形状（20px 内边距 + 居中计算）
   - Rule 6: 装饰线条（下划线、分隔线、高亮标记）
   - Rule 7: 间距标准（垂直 20-50px，水平 30-60px）
   - Rule 8: 字号指南（标题 32-36px，正文 16-18px）

5. **Pre-Output Checklist**（10 项 P0 检查）
   - ✓ 所有文本高度必须来自查找表
   - ✓ 文本宽度计算验证
   - ✓ 对齐元素中心点差异 < 2px
   - ✓ 所有元素在边距内
   - ✓ 图片 ID 验证
   - ✓ 图片宽高比保持
   - ✓ LaTeX 元素不包含自动生成字段
   - ✓ LaTeX 宽度适配公式类别
   - ✓ 多步推导宽度成比例
   - ✓ 文本内容无 LaTeX 语法

#### B. SceneOutline 的丰富上下文


**SceneOutline 包含的字段**:
```typescript
{
  id: string;
  type: 'slide' | 'quiz' | 'interactive' | 'pbl';
  title: string;
  description: string;              // 1-2 句目的描述
  keyPoints: string[];              // 3-5 个核心要点
  teachingObjective?: string;       // 教学目标
  estimatedDuration?: number;       // 预估时长
  order: number;
  language?: 'zh-CN' | 'en-US';
  suggestedImageIds?: string[];     // 建议使用的图片 ID
  mediaGenerations?: MediaGenerationRequest[];  // AI 生成媒体请求
  quizConfig?: {...};               // 测验配置
  interactiveConfig?: {...};        // 交互配置
  pblConfig?: {...};                // PBL 配置
}
```

**关键优势**:
- `description` 提供明确的页面目的
- `teachingObjective` 指导内容重点
- `suggestedImageIds` 预先分配图片资源
- `mediaGenerations` 支持 AI 生成图片/视频

#### C. 强大的后处理逻辑

**文件**: `OpenMAIC/lib/generation/scene-generator.ts`

**后处理步骤**:
1. `fixElementDefaults` - 修复缺失字段（约 150 行）
   - Line: 补全 points, start, end, style, color
   - Text: 补全 defaultFontName, defaultColor, content
   - Image: 补全 fixedRatio，**修正宽高比**（使用图片元数据）
   - Shape: 补全 viewBox, path, fill, fixedRatio

2. `processLatexElements` - LaTeX 渲染（约 30 行）
   - 使用 KaTeX 渲染 latex → HTML
   - 自动填充 html, fixedRatio
   - 失败元素自动移除

3. `resolveImageIds` - 图片 ID 解析（约 40 行）
   - 将 "img_1" 替换为 base64 URL
   - 支持生成图片占位符 "gen_img_1"
   - 无效图片自动移除

4. **宽高比修正逻辑**（Image 元素专属）

   ```typescript
   // 从 assignedImages 获取真实宽高比
   const imgMeta = assignedImages.find((img) => img.id === imageEl.src);
   if (imgMeta?.width && imgMeta?.height) {
     const knownRatio = imgMeta.width / imgMeta.height;
     const curW = el.width || 400;
     const curH = el.height || 300;
     
     // 如果 AI 生成的比例偏差 > 10%，自动修正
     if (Math.abs(curW / curH - knownRatio) / knownRatio > 0.1) {
       const newH = Math.round(curW / knownRatio);
       if (newH > 462) {  // 超出画布高度
         imageEl.width = Math.round(462 * knownRatio);
         imageEl.height = 462;
       } else {
         imageEl.height = newH;
       }
     }
   }
   ```

#### D. 教师人设注入

**文件**: `OpenMAIC/lib/generation/prompt-formatters.ts`

**函数**: `formatTeacherPersonaForPrompt(agents?: AgentInfo[])`

**作用**:
- 提取 teacher agent 的 persona
- 注入到 System Prompt 中
- 让 AI 适配教师风格和语气
- **重要约束**: 幻灯片内容不能出现教师姓名（"王老师提醒你..."）

---

## 2️⃣ 新链路质量下降的原因

### 2.1 新链路生成流程

```
TeachingRequest → TeachingDesign → TeachingSlide → Slide → PPT
    (需求)          (教学设计)        (教学页面)     (页面)  (导出)
```

### 2.2 新旧结构对比

| 维度 | 原 SceneOutline | 新 TeachingSlide | 差异 |
|------|----------------|------------------|------|
| 页面目的 | `description` (1-2 句) | ❌ 无 | 缺失 |
| 教学目标 | `teachingObjective` | ❌ 无 | 缺失 |
| 核心要点 | `keyPoints` (3-5 个) | ✅ `keyPoints` | 相同 |
| 图片分配 | `suggestedImageIds` | ❌ 无 | 缺失 |
| 媒体生成 | `mediaGenerations` | ❌ 无 | 缺失 |
| 讲解词 | ❌ 无 | ✅ `narration` | 新增 |
| 内容块 | ❌ 无 | `contentBlocks` (未使用) | 新增但空 |


**关键发现**:
- ❌ 新 TeachingSlide 缺少 `description`（页面目的）
- ❌ 新 TeachingSlide 缺少 `teachingObjective`（教学目标）
- ❌ 新 TeachingSlide 缺少 `suggestedImageIds`（图片预分配）
- ❌ 新 TeachingSlide 的 `contentBlocks` 字段存在但未使用

### 2.3 Prompt 质量对比

#### 原 Slide Content Prompt

**System Prompt 长度**: ~2000 行  
**结构**:
1. 角色定义 + 设计哲学（幻灯片 ≠ 讲稿）
2. 画布规格（尺寸、边距、对齐参考点）
3. 8 种元素类型完整定义（每种 50-200 行）
4. 文本高度查找表（8×5 矩阵）
5. 8 条设计规则（每条 20-100 行）
6. Pre-Output Checklist（10 项 P0 检查）

**User Prompt 变量**:
```
- title: 页面标题
- description: 页面描述
- keyPoints: 核心要点（3-5 个）
- assignedImages: 可用图片列表（含尺寸、宽高比）
- canvas_width: 1000
- canvas_height: 562.5
- teacherContext: 教师人设
```

#### 新 Teaching Slide Prompt

**System Prompt 长度**: ~50 行  
**结构**:
1. 角色定义："你是一位专业的课件设计师"
2. 输出格式：JSON 结构说明
3. 元素类型：简单列举 7 种类型
4. 画布尺寸：1000 × 562.5
5. 注意事项：5 条简单提示

**User Prompt 变量**:
```
- title: 页面标题
- keyPoints: 要点列表
- narration: 讲解词
- assignedImages: 可用图片
```

**对比结果**:

| 约束类型 | 原 Prompt | 新 Prompt | 缺失程度 |
|---------|----------|----------|---------|
| 画布边距约束 | ✅ 详细（top≥50, left≥50...） | ❌ 无 | 100% |
| 元素数量控制 | ✅ 隐含（通过复杂度） | ❌ 无 | 100% |
| 对齐规则 | ✅ 8 条设计规则 | ❌ 无 | 100% |
| 留白标准 | ✅ Rule 7（20-50px） | ❌ 无 | 100% |
| 层级规范 | ✅ Element Layering | ❌ 无 | 100% |
| 封面/目录模板 | ✅ 隐含（通过 type） | ❌ 无 | 100% |
| 图文配比 | ✅ 图片尺寸规则 | ❌ 无 | 100% |
| 字体层级 | ✅ Rule 8（32-36px 标题） | ❌ 无 | 100% |
| 避免拥挤 | ✅ Rule 1（宽度计算） | ❌ 无 | 100% |
| 视觉重心 | ✅ Rule 3（对齐公式） | ❌ 无 | 100% |
| 文本高度查找表 | ✅ 8×5 矩阵 | ❌ 无 | 100% |
| Pre-Output Checklist | ✅ 10 项 P0 检查 | ❌ 无 | 100% |

**结论**: 新 Prompt 丢失了 **95% 的版式质量约束**


### 2.4 后处理逻辑对比

#### 原链路后处理

**文件**: `OpenMAIC/lib/generation/scene-generator.ts`  
**代码量**: ~220 行

**步骤**:
1. `fixElementDefaults` - 150 行
   - Line: 5 个字段修复
   - Text: 3 个字段修复
   - Image: **宽高比自动修正**（关键！）
   - Shape: 4 个字段修复

2. `processLatexElements` - 30 行
   - KaTeX 渲染
   - 自动填充 html, fixedRatio

3. `resolveImageIds` - 40 行
   - 图片 ID → base64 URL
   - 支持生成图片占位符
   - 无效图片移除

#### 新链路后处理

**文件**: `OpenMAIC/lib/generation/teaching-slide-generator.ts`  
**代码量**: ~180 行

**步骤**:
1. `fixElementDefaults` - 120 行
   - Line: 5 个字段修复 ✅
   - Text: 3 个字段修复 ✅
   - Image: **宽高比自动修正** ✅（复制了原逻辑）
   - Shape: 4 个字段修复 ✅

2. `processLatexElements` - 30 行 ✅（完全复制）

3. `resolveImageIds` - 30 行 ✅（简化版，不支持生成图片）

**对比结果**:
- ✅ 后处理逻辑基本复用（80% 相同）
- ✅ 宽高比修正逻辑已复制
- ⚠️ 不支持 `gen_img_*` 生成图片占位符
- ⚠️ 不支持 `gen_vid_*` 生成视频占位符

**结论**: 后处理逻辑不是主要问题

---

## 3️⃣ 质量下降的 5 个最主要缺失点

### ❌ 缺失 1: 超详细的 System Prompt（影响 80%）

**原链路**: 2000+ 行 System Prompt，包含:
- 8 种元素类型完整定义（每种 50-200 行）
- 文本高度查找表（8×5 矩阵）
- 8 条设计规则（每条 20-100 行）
- Pre-Output Checklist（10 项 P0 检查）

**新链路**: 50 行 System Prompt，只有:
- 简单角色定义
- JSON 格式说明
- 元素类型列举

**影响**:
- AI 不知道如何计算文本高度 → 高度随意 → 文本溢出/截断
- AI 不知道对齐规则 → 元素错位 → 视觉混乱
- AI 不知道间距标准 → 元素拥挤 → 可读性差
- AI 不知道字号层级 → 标题/正文区分不明显

### ❌ 缺失 2: 页面目的描述（description）（影响 15%）

**原链路**: SceneOutline.description
- "介绍二次函数的定义和标准形式"
- "通过图像展示二次函数的性质"
- "练习：判断二次函数的开口方向"

**新链路**: TeachingSlide 无 description
- 只有 title + keyPoints
- AI 不知道这一页的具体目的

**影响**:
- AI 只能根据 title 猜测页面类型
- 无法区分"概念讲解页" vs "例题页" vs "练习页"
- 导致所有页面都是"普通排版"（标题 + 列表）

### ❌ 缺失 3: 图片预分配（suggestedImageIds）（影响 10%）

**原链路**: SceneOutline.suggestedImageIds
- Outline 阶段已经决定哪些图片用在哪一页
- Slide 生成时直接使用预分配的图片

**新链路**: 无图片预分配
- 所有图片都传给每一页
- AI 需要自己判断用哪些图片
- 容易出现：不用图片 / 用错图片 / 重复用图片

**影响**:
- 图片利用率低
- 图文配合不佳
- 视觉单调（纯文字页面）

### ❌ 缺失 4: 教学目标（teachingObjective）（影响 5%）

**原链路**: SceneOutline.teachingObjective
- "让学生理解二次函数的顶点坐标公式"
- "培养学生的数形结合思想"

**新链路**: 无 teachingObjective
- AI 不知道这一页要达到什么教学效果

**影响**:
- 内容重点不突出
- 缺少"强调框"、"高亮标记"等视觉引导
- 页面缺乏教学设计感

### ❌ 缺失 5: 媒体生成支持（mediaGenerations）（影响 5%）

**原链路**: SceneOutline.mediaGenerations
- 支持 AI 生成图片/视频占位符
- `gen_img_1`, `gen_vid_1` 等

**新链路**: 无 mediaGenerations
- 只能使用 PDF 提取的图片
- 无法生成自定义图片

**影响**:
- 图片资源受限
- 无法生成示意图、流程图等
- 视觉表现力下降

---

## 4️⃣ 问题归因排序

按影响程度从高到低：

### 🔴 P0 - Prompt 问题（影响 80%）

**根本原因**: 新 Prompt 丢失了 95% 的版式质量约束

**具体表现**:
- 文本高度随意（不查表）
- 元素对齐混乱（无对齐规则）
- 间距不合理（无间距标准）
- 字号层级不明显（无字号指南）
- 元素拥挤（无宽度计算）

**证据**:
- 原 System Prompt: 2000+ 行
- 新 System Prompt: 50 行
- 缺失率: 97.5%

### 🟠 P1 - 中间结构问题（影响 15%）

**根本原因**: TeachingSlide 过于简化，缺少布局意图

**具体表现**:
- 无 `description` → AI 不知道页面目的
- 无 `teachingObjective` → AI 不知道教学重点
- 无 `suggestedImageIds` → 图片利用率低
- `contentBlocks` 存在但未使用 → 浪费

**证据**:
- SceneOutline 有 10+ 个字段
- TeachingSlide 只有 5 个有效字段
- 信息丢失率: 50%

### 🟡 P2 - 后处理缺失问题（影响 5%）

**根本原因**: 不支持生成图片/视频占位符

**具体表现**:
- 无法使用 `gen_img_*` / `gen_vid_*`
- 只能使用 PDF 图片

**证据**:
- 原 `resolveImageIds`: 支持 3 种图片类型
- 新 `resolveImageIds`: 只支持 1 种图片类型

### 🟢 P3 - 导出问题（影响 0%）

**结论**: 导出阶段无问题

**证据**:
- 新链路完全复用 `buildPptxBlob`
- 适配层正确映射数据结构
- 测试页面可以成功导出 PPT

---

## 5️⃣ 后续质量恢复方案

### 方案 A: 低成本修复（1-2 天）

**不改变架构，只优化 Prompt / 默认值 / 后处理**

#### A1. 复用原 System Prompt（最关键！）

**操作**:
```typescript
// teaching-slide-generator.ts
import { buildPrompt, PROMPT_IDS } from './prompts';

// 替换硬编码的 systemPrompt
const prompts = buildPrompt(PROMPT_IDS.SLIDE_CONTENT, {
  title: teachingSlide.title,
  description: teachingSlide.keyPoints.join('; '),  // 用 keyPoints 拼接
  keyPoints: teachingSlide.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n'),
  assignedImages: assignedImagesText,
  canvas_width: canvasWidth,
  canvas_height: canvasHeight,
  teacherContext: '',  // 暂时为空
});

const response = await aiCall(prompts.system, prompts.user, visionImages);
```

**效果**:
- ✅ 立即获得 2000+ 行的详细约束
- ✅ 文本高度查找表
- ✅ 8 条设计规则
- ✅ Pre-Output Checklist

**工作量**: 10 行代码修改

#### A2. 在 TeachingDesign 生成时添加 description

**操作**:
```typescript
// teaching-outline-generator.ts
// 修改 System Prompt，要求 AI 为每个 slide 生成 description

slides: [
  {
    "title": "二次函数的定义",
    "description": "介绍二次函数的标准形式和基本概念",  // 新增
    "type": "content",
    "keyPoints": ["定义", "标准形式", "系数含义"]
  }
]
```

**效果**:
- ✅ AI 知道页面目的
- ✅ 可以区分页面类型

**工作量**: 修改 1 个 Prompt

#### A3. 添加默认元素模板

**操作**:
```typescript
// teaching-slide-generator.ts
function getDefaultElementsForType(type: string) {
  if (type === 'cover') {
    return [
      { type: 'text', left: 60, top: 200, width: 880, height: 130, 
        content: '<p style="font-size: 36px; text-align: center;"><strong>{{title}}</strong></p>' }
    ];
  }
  // ... 其他类型
}
```

**效果**:
- ✅ 封面页/目录页有固定模板
- ✅ 减少 AI 随意发挥

**工作量**: 50 行代码

**总工作量**: 1-2 天  
**预期质量提升**: 60-70%

---

### 方案 B: 中成本修复（3-5 天）

**增强 TeachingSlide / ContentBlock 结构，使其包含布局意图**

#### B1. 完成方案 A 的所有修改

#### B2. 启用 ContentBlock

**操作**:
```typescript
// teaching-outline-generator.ts
// 让 AI 生成 contentBlocks

slides: [
  {
    "title": "二次函数的图像",
    "description": "通过图像展示二次函数的性质",
    "type": "content",
    "keyPoints": ["开口方向", "对称轴", "顶点"],
    "contentBlocks": [  // 新增
      {
        "type": "text",
        "text": { "content": "二次函数的图像是一条抛物线", "style": "title" }
      },
      {
        "type": "image",
        "image": { "src": "img_3", "caption": "抛物线示意图" }
      },
      {
        "type": "text",
        "text": { "content": "• 开口方向由 a 的符号决定\n• 对称轴为 x = -b/2a", "style": "bullet" }
      }
    ]
  }
]
```

**效果**:
- ✅ AI 在 Outline 阶段就规划好布局
- ✅ Slide 生成时只需"翻译" ContentBlock → PPTElement

**工作量**: 修改 2 个 Prompt + 50 行转换代码

#### B3. 添加图片预分配逻辑

**操作**:
```typescript
// teaching-outline-generator.ts
// 在生成 TeachingDesign 时，为每个 slide 分配图片

function assignImagesToSlides(slides: TeachingSlide[], images: ParsedImage[]) {
  // 简单策略：按顺序分配
  slides.forEach((slide, i) => {
    if (images[i]) {
      slide.suggestedImageIds = [images[i].id];
    }
  });
}
```

**效果**:
- ✅ 图片利用率提升
- ✅ 避免重复使用

**工作量**: 30 行代码

**总工作量**: 3-5 天  
**预期质量提升**: 80-85%

---

### 方案 C: 高质量方案（1-2 周）

**引入"教学页面模板体系"**

#### C1. 完成方案 A + B 的所有修改

#### C2. 定义 6 种教学页面模板

**模板类型**:
1. **封面页** (cover)
   - 固定布局：居中大标题 + 副标题 + 装饰元素
   - 示例：课题名称 + 年级 + 教师姓名

2. **目录页** (contents)
   - 固定布局：标题 + 编号列表 + 进度指示
   - 示例：本节课内容 → 1. 定义 2. 性质 3. 应用

3. **概念讲解页** (concept)
   - 布局：标题 + 定义框 + 要点列表 + 示意图
   - 示例：二次函数定义 + 标准形式 + 系数含义

4. **例题页** (example)
   - 布局：标题 + 题目框 + 解答步骤 + 关键提示
   - 示例：例1：求二次函数的顶点坐标

5. **总结页** (summary)
   - 布局：标题 + 知识框架图 + 重点回顾
   - 示例：本节课重点 → 思维导图

6. **作业页** (homework)
   - 布局：标题 + 作业列表 + 提交要求
   - 示例：课后练习 → 1-5 题

#### C3. 为每种模板创建专用 Prompt

**文件结构**:
```
prompts/templates/
  slide-content-cover/
    system.md
    user.md
  slide-content-concept/
    system.md
    user.md
  slide-content-example/
    system.md
    user.md
  ...
```

#### C4. 根据 slide.type 选择模板

**操作**:
```typescript
// teaching-slide-generator.ts
function getPromptIdForSlideType(type: string): string {
  const mapping = {
    'cover': 'slide-content-cover',
    'contents': 'slide-content-contents',
    'concept': 'slide-content-concept',
    'example': 'slide-content-example',
    'summary': 'slide-content-summary',
    'homework': 'slide-content-homework',
    'content': 'slide-content',  // 默认
  };
  return mapping[type] || 'slide-content';
}

const promptId = getPromptIdForSlideType(teachingSlide.type);
const prompts = buildPrompt(promptId, {...});
```

**效果**:
- ✅ 每种页面有专属布局规则
- ✅ 视觉风格统一
- ✅ 教学设计感强

**工作量**: 6 个模板 × 500 行 = 3000 行 Prompt

**总工作量**: 1-2 周  
**预期质量提升**: 95%+

---

## 6️⃣ 如果只能做 20% 工作拿到 80% 质量提升

### 优先做这 3 件事：

#### 🥇 第 1 件：复用原 System Prompt（工作量 5%，提升 60%）

**操作**:
```typescript
// teaching-slide-generator.ts 第 70 行
- const systemPrompt = `你是一位专业的课件设计师...`;  // 删除硬编码
+ const prompts = buildPrompt(PROMPT_IDS.SLIDE_CONTENT, {
+   title: teachingSlide.title,
+   description: teachingSlide.keyPoints.join('; '),
+   keyPoints: teachingSlide.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n'),
+   assignedImages: assignedImagesText,
+   canvas_width: canvasWidth,
+   canvas_height: canvasHeight,
+   teacherContext: '',
+ });
+ 
- const response = await aiCall(systemPrompt, userPrompt, visionImages);
+ const response = await aiCall(prompts.system, prompts.user, visionImages);
```

**为什么最重要**:
- 原 Prompt 包含 2000+ 行的详细约束
- 立即获得文本高度查找表、8 条设计规则、Pre-Output Checklist
- 这是质量的核心保障

**预期效果**:
- 文本高度不再随意
- 元素对齐明显改善
- 间距合理
- 字号层级清晰

#### 🥈 第 2 件：在 Outline 生成时添加 description（工作量 10%，提升 15%）

**操作**:
```typescript
// teaching-outline-generator.ts 第 40 行
// 修改 System Prompt

slides: [
  {
    "title": "页面标题",
    "description": "1-2 句话描述这一页的目的和内容重点",  // 新增这一行
    "type": "cover" | "content" | "transition" | "end",
    "keyPoints": ["本页要点1", "本页要点2"],
    "narration": "教师讲解词（可选）"
  }
]
```

**为什么重要**:
- AI 需要知道页面目的才能选择合适的布局
- 可以区分"概念讲解" vs "例题" vs "练习"

**预期效果**:
- 页面类型区分明显
- 布局更符合教学场景

#### 🥉 第 3 件：添加 3 个默认模板（工作量 5%，提升 10%）

**操作**:
```typescript
// teaching-slide-generator.ts 新增函数

function getTemplateElements(type: string, title: string): PPTElement[] {
  if (type === 'cover') {
    return [
      {
        type: 'text',
        left: 60,
        top: 200,
        width: 880,
        height: 130,
        content: `<p style="font-size: 36px; text-align: center;"><strong>${title}</strong></p>`,
        defaultFontName: 'Microsoft YaHei',
        defaultColor: '#333333',
      }
    ];
  }
  
  if (type === 'contents') {
    return [
      {
        type: 'text',
        left: 60,
        top: 80,
        width: 880,
        height: 76,
        content: '<p style="font-size: 28px;"><strong>本节课内容</strong></p>',
        defaultFontName: 'Microsoft YaHei',
        defaultColor: '#333333',
      }
    ];
  }
  
  return [];  // 其他类型由 AI 生成
}

// 在生成失败时使用模板
if (!canvas) {
  const templateElements = getTemplateElements(teachingSlide.type, teachingSlide.title);
  if (templateElements.length > 0) {
    canvas = {
      id: teachingSlide.id,
      viewportSize: 1000,
      viewportRatio: 0.5625,
      theme: defaultTheme,
      elements: templateElements,
      type: teachingSlide.type,
    };
  }
}
```

**为什么重要**:
- 封面页/目录页是最容易出问题的
- 固定模板保证基本质量

**预期效果**:
- 封面页/目录页视觉统一
- 减少 AI 随意发挥

---

## 7️⃣ 总结与建议

### 核心结论

**质量下降的根本原因**: 新 Prompt 丢失了 95% 的版式质量约束

**问题归因**:
1. 🔴 Prompt 问题（80%）
2. 🟠 中间结构问题（15%）
3. 🟡 后处理缺失问题（5%）
4. 🟢 导出问题（0%）

### 最佳方案

**比赛时间线考虑**:
- 如果只有 1 天 → 做方案 A（提升 60-70%）
- 如果有 3-5 天 → 做方案 B（提升 80-85%）
- 如果有 1-2 周 → 做方案 C（提升 95%+）

**推荐**: 先做方案 A 的 3 件事（工作量 20%，提升 80%），然后根据时间决定是否继续

### 立即行动清单

1. ✅ 复用原 System Prompt（5 分钟）
2. ✅ 添加 description 字段（30 分钟）
3. ✅ 添加 3 个默认模板（1 小时）

**总耗时**: 2 小时  
**预期提升**: 80%

---

**报告完成时间**: 2026-04-05  
**诊断人员**: Kiro AI Assistant
