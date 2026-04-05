# 🚀 快速启动指南

## 第一阶段 MVP 已完成！

新的教学设计生成链路已经实现，可以成功生成 PPT。

## 📋 完成清单

- ✅ 新增核心类型（`TeachingDesign`, `TeachingSlide` 等）
- ✅ 改造 outline generator（生成教学设计）
- ✅ 新建 slide generator（生成课件页面）
- ✅ 创建适配层（`TeachingDesign` → `Scene[]`）
- ✅ 新建生成 Hook（`useTeachingGenerator`）
- ✅ 修改 PPT 导出（导出 `buildPptxBlob`）
- ✅ 新建教学设计导出 Hook（`useExportTeachingPPTX`）
- ✅ 创建测试页面（`/teaching-test`）

## 🧪 测试步骤

### 0. 模型配置

当前使用 **GLM-5** 模型（智谱 AI）：
- 上下文窗口：200K tokens
- 输出窗口：128K tokens
- 中文能力优秀

如需切换模型，请参考 [SWITCH_TO_GLM5.md](./SWITCH_TO_GLM5.md)

### 1. 启动开发服务器

```bash
cd OpenMAIC
pnpm dev
```

### 2. 访问测试页面

打开浏览器访问：
```
http://localhost:3000/teaching-test
```

**注意**：如果端口 3000 被占用，Next.js 会自动使用其他端口（如 3001），请查看终端输出的实际端口。

### 3. 生成教学设计

1. 在表单中输入：
   - 学科：数学
   - 课题：二次函数的图像与性质
   - 年级：初三
   - 课时：45

2. 点击"生成教学设计"按钮

3. 等待生成完成（会显示进度条）

4. 查看生成结果：
   - 教学目标（三维目标）
   - 课件页面列表
   - 教学过程

### 4. 导出 PPT

1. 点击"导出 PPT"按钮

2. 下载生成的 PPTX 文件

3. 用 PowerPoint 或 WPS 打开验证

## 📁 新增文件

```
OpenMAIC/
├── lib/
│   ├── types/
│   │   └── teaching.ts                          # 核心类型定义
│   ├── generation/
│   │   ├── teaching-outline-generator.ts        # 教学设计生成
│   │   └── teaching-slide-generator.ts          # 课件页面生成
│   ├── adapters/
│   │   └── teaching-to-scene.ts                 # 适配层
│   ├── hooks/
│   │   └── use-teaching-generator.ts            # 生成 Hook
│   └── export/
│       └── use-export-teaching-pptx.ts          # 导出 Hook
├── app/
│   └── teaching-test/
│       └── page.tsx                             # 测试页面
├── MVP_IMPLEMENTATION_SUMMARY.md                # 实施总结
└── QUICK_START.md                               # 本文档
```

## 🔧 修改文件

```
OpenMAIC/lib/export/use-export-pptx.ts           # 导出 buildPptxBlob 函数
```

## 🎯 核心设计

### 数据流

```
TeachingRequest
    ↓
generateTeachingDesignFromRequest
    ↓
TeachingDesign (outline)
    ↓
generateSlideFromTeachingSlide (逐页)
    ↓
TeachingDesign (with canvas)
    ↓
teachingDesignToScenes (适配层)
    ↓
Scene[]
    ↓
buildPptxBlob (复用现有逻辑)
    ↓
PPTX 文件
```

### 关键映射

| 新结构 | 旧结构 | 说明 |
|--------|--------|------|
| `TeachingRequest` | `UserRequirements` | 教师输入 |
| `TeachingDesign` | `SceneOutline[]` | 教学设计 |
| `TeachingSlide` | `Scene` | 单页课件 |
| `TeachingSlide.canvas` | `Scene.content.canvas` | 完全复用 `Slide` |
| `TeachingSlide.narration` | `Slide.remark` | 讲稿 |

## 🚫 暂未实现

按照要求，以下功能暂时不做：

- ❌ FastGPT RAG
- ❌ Word 教案导出
- ❌ 局部再生成
- ❌ 删除旧模块
- ❌ 资料解析（PPT/Word）

## 🐛 已知问题

1. **Prompt 模板**
   - 当前使用硬编码的 prompt
   - 可能需要调整以获得更好的生成效果

2. **AI 模型**
   - 测试页面硬编码了 `openai('gpt-4o')`
   - 需要确保 `.env.local` 中配置了 `OPENAI_API_KEY`

3. **图片支持**
   - MVP 阶段暂不支持 PDF 图片解析
   - 可以先用纯文本测试

## ✅ 验证清单

- [ ] 开发服务器启动成功
- [ ] 访问 `/teaching-test` 页面正常
- [ ] 输入教学需求后点击生成
- [ ] 显示生成进度
- [ ] 生成完成后显示教学设计内容
- [ ] 点击导出 PPT 按钮
- [ ] 成功下载 PPTX 文件
- [ ] 用 PowerPoint/WPS 打开文件
- [ ] PPT 内容正确显示

## 📞 问题排查

### 生成失败

1. 检查 API key 配置：
   ```bash
   # OpenMAIC/.env.local
   OPENAI_API_KEY=sk-...
   ```

2. 查看浏览器控制台错误信息

3. 查看服务器终端日志

### 导出失败

1. 检查是否生成了 canvas
   - 在测试页面查看每页是否显示"✓ 已生成"

2. 查看浏览器控制台错误信息

### 其他问题

查看详细日志：
- 浏览器控制台（F12）
- 服务器终端输出

## 🎉 成功标准

当你看到以下结果时，说明 MVP 成功：

1. ✅ 测试页面可以正常访问
2. ✅ 点击生成后显示进度条
3. ✅ 生成完成后显示教学设计内容
4. ✅ 点击导出后下载 PPTX 文件
5. ✅ PPTX 文件可以用 PowerPoint 打开
6. ✅ PPT 包含多页，每页有标题和内容

## 📚 相关文档

- [MVP 实施总结](./MVP_IMPLEMENTATION_SUMMARY.md) - 详细的技术实现说明
- [核心重构设计方案](./核心重构设计方案.md) - 完整的设计文档

## 🚀 下一步

完成 MVP 测试后，可以进入 P1 阶段：

1. 接入 FastGPT RAG
2. 实现 Word 教案导出
3. 实现局部再生成
4. 完善 Prompt 模板
5. 添加资料解析

---

**祝测试顺利！** 🎊
