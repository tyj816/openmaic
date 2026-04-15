# 教学幻灯片生成性能优化报告

## 问题诊断

从日志分析发现的问题：
1. 生成时间递增：第1页 2.1分钟 → 第2页 3.9分钟 → 第3页 4分钟超时
2. **GLM-5模型处理vision图片非常慢**（单页可能需要4-6分钟）
3. RAG内容无限制导致prompt过长
4. 每次传递所有材料图片导致重复数据传输

## 根本原因

GLM-5的vision能力处理速度较慢，特别是处理多张图片时。每增加一张vision图片，处理时间可能增加1-2分钟。

## 已实施的优化

### 1. 限制Vision图片数量（第2轮优化）
- **修改文件**: `OpenMAIC/lib/constants/generation.ts`
- **变更**: `MAX_VISION_IMAGES_PER_SLIDE` 从 20 → 3 → **2**
- **效果**: 每页最多处理2张vision图片

### 2. 限制RAG内容长度
- **修改文件**: `OpenMAIC/lib/generation/teaching-context-builder.ts`
- **变更**: `MAX_RAG_CONTEXT_CHARS` 从 `Infinity` 改为 `8000`
- **效果**: 防止知识库内容过长导致prompt膨胀

### 3. 优化图片传输策略
- **修改文件**: `OpenMAIC/lib/hooks/use-teaching-generator.ts`
- **变更**: 
  - 只传递与当前幻灯片相关的图片（基于 `suggestedImageIds`）
  - 无建议时限制为最多10张图片
  - 预计算所有图片，避免重复flatMap操作
- **效果**: 大幅减少网络传输数据量

### 4. 自适应Vision模式（第2轮优化）
- **修改文件**: `OpenMAIC/lib/hooks/use-teaching-generator.ts`
- **变更**: 监控生成时间，平均超过**2分钟**自动禁用vision模式（原来3分钟）
- **效果**: 更快速地切换到纯文本模式

### 5. 延长超时时间（第2轮优化）
- **修改文件**: 
  - `OpenMAIC/app/api/generate/teaching-slide/route.ts`
  - `OpenMAIC/lib/hooks/use-teaching-generator.ts`
- **变更**:
  - API层面：`maxDuration` = 300秒（5分钟）
  - LLM调用：从4分钟延长到**6分钟**（适应GLM-5的慢速度）
  - 前端请求：从5分钟延长到**7分钟**
  - 重试次数：从2次减少到**1次**（更快失败）
- **效果**: 给GLM-5足够的处理时间，同时更快失败

### 6. 增强日志和监控
- **修改文件**: 
  - `OpenMAIC/app/api/generate/teaching-slide/route.ts`
  - `OpenMAIC/lib/generation/teaching-slide-generator.ts`
  - `OpenMAIC/lib/hooks/use-teaching-generator.ts`
- **变更**: 添加详细的性能日志
  - AI调用耗时
  - Vision数据大小（MB）
  - 每页生成时间
  - 图片数量和vision状态
- **效果**: 便于诊断性能瓶颈

### 7. 改进错误处理
- **修改文件**: `OpenMAIC/lib/hooks/use-teaching-generator.ts`
- **变更**: 失败时抛出异常而非静默继续
- **效果**: 用户能及时知道问题并采取措施

## 超时设置位置

当前的超时设置分布在三个层级：

1. **Next.js API路由层** (`OpenMAIC/app/api/generate/teaching-slide/route.ts`)
   ```typescript
   export const maxDuration = 300; // 5分钟
   ```

2. **LLM调用层** (`OpenMAIC/app/api/generate/teaching-slide/route.ts`)
   ```typescript
   abortSignal: AbortSignal.timeout(6 * 60 * 1000) // 6分钟
   ```

3. **前端请求层** (`OpenMAIC/lib/hooks/use-teaching-generator.ts`)
   ```typescript
   setTimeout(() => controller.abort(), 7 * 60 * 1000) // 7分钟
   ```

**为什么需要三层超时？**
- Next.js层：防止API路由占用过多服务器资源
- LLM层：防止单次AI调用卡死
- 前端层：防止整个请求无响应

## 性能优化建议

### 短期方案（已实施）
✅ 限制vision图片数量到2张
✅ 限制RAG内容到8000字符
✅ 自适应禁用vision模式（平均>2分钟）
✅ 延长超时到6分钟（LLM）/ 7分钟（请求）
✅ 减少重试次数到1次

### 中期方案（强烈推荐）
🔥 **关闭图片识别功能**（在前端UI中取消勾选"启用图片识别"）
   - 这是最有效的优化方案
   - 生成速度可提升5-10倍
   - 仍然可以使用图片，只是不会用vision分析内容

🔥 **切换到更快的模型**
   - GPT-4o-mini：速度快，vision能力强
   - Claude 3.5 Haiku：速度快，质量高
   - Gemini 2.0 Flash：速度极快，免费

🔥 **减少参考资料**
   - 只上传最核心的1-2个文件
   - 避免上传大量图片

### 长期方案（可选）
- 并行生成多个幻灯片
- 实现增量生成和流式输出
- 优化prompt模板长度

## 测试建议

### 快速测试（推荐）
1. **关闭图片识别**：在生成时取消勾选"启用图片识别"
   - 预期：每页 < 1分钟

2. **使用少量图片**：只上传1-2张关键图片
   - 预期：每页 < 2分钟

### 完整测试

1. **测试场景1**: 少量图片（<5张）
   - 预期：每页生成时间 < 2分钟

2. **测试场景2**: 大量图片（>10张）
   - 预期：自动限制图片数量，自适应禁用vision

3. **测试场景3**: 大量RAG内容
   - 预期：自动截断到8000字符

4. **测试场景4**: 超时场景
   - 预期：4分钟后超时并给出明确错误提示

## 监控指标

查看日志中的关键指标：
- `Vision data size: X.XX MB` - vision数据大小
- `AI call completed in Xs` - AI调用耗时
- `Slide X completed in Xs` - 单页生成耗时
- `Disabling vision mode due to slow generation` - 自适应禁用vision

## 如何调整超时时间

如果仍然超时，可以进一步延长：

```typescript
// OpenMAIC/app/api/generate/teaching-slide/route.ts
abortSignal: AbortSignal.timeout(10 * 60 * 1000) // 改为10分钟

// OpenMAIC/lib/hooks/use-teaching-generator.ts
setTimeout(() => controller.abort(), 12 * 60 * 1000) // 改为12分钟
```

但**不推荐**这样做，因为：
- 用户体验差（等待时间过长）
- 可能掩盖真正的性能问题
- 建议直接关闭vision模式或切换模型

## 回滚方案

如果优化导致问题，可以回滚以下设置：

```typescript
// OpenMAIC/lib/constants/generation.ts
export const MAX_VISION_IMAGES_PER_SLIDE = 5; // 改回5或更高

// OpenMAIC/lib/generation/teaching-context-builder.ts
const MAX_RAG_CONTEXT_CHARS = 15000; // 增加RAG限制
```

## 总结

**核心问题**：GLM-5的vision处理速度慢，每张图片增加1-2分钟处理时间。

**最佳解决方案**：
1. 🥇 关闭图片识别功能（最有效）
2. 🥈 切换到更快的模型（GPT-4o-mini / Claude Haiku / Gemini Flash）
3. 🥉 减少参考资料和图片数量

**已实施的优化**：
- Vision图片限制：20 → 2张/页
- RAG内容限制：无限 → 8000字符
- 超时时间：4分钟 → 6分钟（LLM）
- 自适应禁用：平均>2分钟自动关闭vision
- 智能图片传输：只传递相关图片

这些优化在保持功能的前提下，尽可能提升了性能。但如果追求速度，强烈建议关闭vision或切换模型。
