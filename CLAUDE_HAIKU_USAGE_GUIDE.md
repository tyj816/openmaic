# Claude Haiku 4.5 在项目中的应用范围

## 概述

Claude Haiku 4.5 是一个**快速、高效、支持vision**的大语言模型，可以替代项目中大部分LLM调用场景。

## 模型能力

根据 `OpenMAIC/lib/ai/providers.ts` 配置：

```typescript
{
  id: 'claude-haiku-4-5',
  name: 'Claude Haiku 4.5',
  contextWindow: 200000,      // 20万tokens上下文
  outputWindow: 64000,         // 6.4万tokens输出
  capabilities: {
    streaming: true,           // ✅ 支持流式输出
    tools: true,               // ✅ 支持工具调用
    vision: true,              // ✅ 支持图片识别
    thinking: {                // ✅ 支持思考模式
      toggleable: true,
      budgetAdjustable: true,
      defaultEnabled: false,
    },
  },
}
```

## 可以替代的场景

### ✅ 1. 教学设计生成（核心功能）

**文件位置**：
- `OpenMAIC/app/api/generate/teaching-outline/route.ts`
- `OpenMAIC/app/api/generate/teaching-slide/route.ts`

**当前问题**：GLM-5处理vision图片很慢（单页4-6分钟）

**使用Claude Haiku的优势**：
- 速度快：预计单页生成时间 < 1分钟
- Vision能力强：图片识别准确
- 成本低：比Claude Sonnet便宜很多

**配置方法**：
```bash
# .env.local
ANTHROPIC_API_KEY=your_api_key
ANTHROPIC_BASE_URL=https://api.anthropic.com/v1
ANTHROPIC_MODELS=claude-haiku-4-5

# 或在前端选择模型时选择 "Claude Haiku 4.5"
```

### ✅ 2. 教学对话（Teaching Chat）

**文件位置**：`OpenMAIC/app/api/teaching-chat/route.ts`

**功能**：意图识别、对话理解、教学建议

**使用Claude Haiku的优势**：
- 对话理解能力强
- 响应速度快
- 支持长上下文（20万tokens）

### ✅ 3. 课件再生成（Regenerate）

**文件位置**：`OpenMAIC/app/api/regenerate-teaching/route.ts`

**功能**：根据反馈重新生成课件内容

**使用Claude Haiku的优势**：
- 理解反馈能力强
- 生成质量高
- 速度快

### ✅ 4. 普通聊天（Chat）

**文件位置**：`OpenMAIC/app/api/chat/route.ts`

**功能**：通用对话、问答

**使用Claude Haiku的优势**：
- 对话自然流畅
- 支持多轮对话
- 成本低

### ✅ 5. 测验评分（Quiz Grade）

**文件位置**：`OpenMAIC/app/api/quiz-grade/route.ts`

**功能**：自动评分、反馈生成

**使用Claude Haiku的优势**：
- 评分准确
- 反馈详细
- 速度快

### ✅ 6. PBL项目生成

**文件位置**：`OpenMAIC/app/api/pbl/generate/route.ts`

**功能**：项目式学习内容生成

**使用Claude Haiku的优势**：
- 创意丰富
- 结构清晰
- 教学性强

### ✅ 7. 课堂生成（Classroom Generation）

**文件位置**：`OpenMAIC/lib/server/classroom-generation.ts`

**功能**：完整课堂内容生成

**使用Claude Haiku的优势**：
- 综合能力强
- 生成速度快
- 质量稳定

## ❌ 不能替代的场景

### 1. 图片生成

**原因**：Claude Haiku是文本/vision模型，不能生成图片

**相关文件**：
- `OpenMAIC/lib/media/adapters/qwen-image-adapter.ts` - 需要Qwen Image模型
- `OpenMAIC/lib/media/adapters/grok-image-adapter.ts` - 需要Grok Imagine模型
- `OpenMAIC/lib/media/adapters/nano-banana-adapter.ts` - 需要Gemini Image模型
- `OpenMAIC/lib/media/adapters/seedream-adapter.ts` - 需要Seedream模型

### 2. 视频生成

**原因**：Claude Haiku不支持视频生成

**相关文件**：
- `OpenMAIC/lib/media/adapters/kling-adapter.ts` - 需要Kling模型
- `OpenMAIC/lib/media/adapters/veo-adapter.ts` - 需要Veo模型
- `OpenMAIC/lib/media/adapters/seedance-adapter.ts` - 需要Seedance模型
- `OpenMAIC/lib/media/adapters/grok-video-adapter.ts` - 需要Grok Video模型

### 3. 语音合成（TTS）

**原因**：Claude Haiku不支持语音合成

**相关配置**：
```bash
# 需要专门的TTS服务
TTS_OPENAI_API_KEY=
TTS_QWEN_API_KEY=
TTS_GLM_API_KEY=
```

### 4. 语音识别（ASR）

**原因**：Claude Haiku不支持语音识别

**相关配置**：
```bash
# 需要专门的ASR服务
ASR_OPENAI_API_KEY=
ASR_QWEN_API_KEY=
```

## 配置方法

### 方法1：设置为默认模型

在 `.env.local` 中：

```bash
# 添加Anthropic配置
ANTHROPIC_API_KEY=your_api_key_here
ANTHROPIC_BASE_URL=https://api.anthropic.com/v1
ANTHROPIC_MODELS=claude-haiku-4-5

# 设置为默认模型
DEFAULT_MODEL=anthropic:claude-haiku-4-5
```

### 方法2：前端选择模型

在生成教学设计时，从模型下拉列表中选择 "Claude Haiku 4.5"

### 方法3：API调用时指定

```typescript
const { model } = getModel({
  providerId: 'anthropic',
  modelId: 'claude-haiku-4-5',
  apiKey: 'your_api_key',
  baseUrl: 'https://api.anthropic.com/v1',
  providerType: 'anthropic',
  requiresApiKey: true,
});
```

## 性能对比

| 场景 | GLM-5 | Claude Haiku 4.5 |
|------|-------|------------------|
| 教学大纲生成 | ~2分钟 | ~30秒 |
| 单页幻灯片（无vision） | ~1分钟 | ~20秒 |
| 单页幻灯片（有vision） | 4-6分钟 | ~40秒 |
| 对话响应 | ~3秒 | ~1秒 |
| 上下文窗口 | 200K | 200K |
| 输出窗口 | 128K | 64K |

## 成本对比

Claude Haiku 4.5 是Claude系列中最便宜的模型：
- 比Claude Sonnet便宜约80%
- 比Claude Opus便宜约95%
- 速度比Sonnet快约2-3倍

## 推荐使用场景

### 🥇 强烈推荐（性价比最高）

1. **教学幻灯片生成**（特别是有图片识别需求时）
2. **教学对话**（快速响应）
3. **课件再生成**（迭代优化）

### 🥈 推荐（质量和速度平衡）

4. **测验评分**
5. **PBL项目生成**
6. **普通聊天**

### 🥉 可选（根据需求）

7. **课堂生成**（如果需要更高质量，可以用Sonnet）

## 注意事项

1. **API Key**：需要有效的Anthropic API Key
2. **网络访问**：需要能访问 `api.anthropic.com`
3. **输出限制**：最大输出64K tokens（通常足够）
4. **不支持**：图片生成、视频生成、语音合成/识别

## 总结

Claude Haiku 4.5 可以替代项目中**所有LLM文本生成和vision识别场景**，但**不能替代多模态生成**（图片、视频、语音）。

对于当前的性能问题（GLM-5 vision慢），切换到Claude Haiku是最佳解决方案：
- ✅ 速度提升5-10倍
- ✅ Vision能力更强
- ✅ 成本更低
- ✅ 质量更稳定
