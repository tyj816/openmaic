# 🔄 切换到 GLM-5 模型

## ✅ 已完成

教学设计生成功能已成功切换到 **GLM-5** 模型。

## 📝 修改内容

### 文件：`app/teaching-test/page.tsx`

**之前（使用 OpenAI GPT-4o）：**
```typescript
import { openai } from '@ai-sdk/openai';

const handleGenerate = async () => {
  const model = openai('gpt-4o');
  // ...
};
```

**之后（使用 GLM-5）：**
```typescript
import { getModel } from '@/lib/ai/providers';

const handleGenerate = async () => {
  const { model } = getModel({
    providerId: 'glm',
    modelId: 'glm-5',
    apiKey: 'a61159bfaa7949b98ca9863e4350217b.qZiaDB1pjuLuuADv',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    providerType: 'openai',
    requiresApiKey: true,
  });
  // ...
};
```

## 🔧 配置信息

从 `.env.local` 中读取的配置：

```bash
GLM_API_KEY=a61159bfaa7949b98ca9863e4350217b.qZiaDB1pjuLuuADv
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
GLM_MODELS=glm-5
```

## 📊 GLM-5 模型信息

根据 `lib/ai/providers.ts` 中的配置：

- **模型 ID**：`glm-5`
- **模型名称**：GLM-5
- **上下文窗口**：200,000 tokens
- **输出窗口**：128,000 tokens
- **能力**：
  - ✅ 流式输出（streaming）
  - ✅ 工具调用（tools）
  - ❌ 视觉理解（vision）

## 🧪 测试步骤

1. 确保开发服务器正在运行：
   ```bash
   cd OpenMAIC
   pnpm dev
   ```

2. 访问测试页面：
   ```
   http://localhost:3000/teaching-test
   ```

3. 输入教学需求并点击"生成教学设计"

4. 观察生成过程（使用 GLM-5 模型）

5. 查看生成结果

## 🔍 验证方法

### 方法 1：查看浏览器控制台

打开浏览器开发者工具（F12），在 Network 标签中查看请求：
- 请求 URL 应该是：`https://open.bigmodel.cn/api/paas/v4/chat/completions`
- 请求头中应该包含 GLM API Key

### 方法 2：查看生成日志

在浏览器控制台（Console）中查看日志输出，应该能看到：
```
TeachingGenerator: Stage 1: Generating teaching design outline
TeachingGenerator: Generated design with X slides
TeachingGenerator: Stage 2: Generating canvas for each slide
...
```

### 方法 3：测试生成结果

生成的教学设计应该：
- 包含完整的教学目标（三维目标）
- 包含多页课件（每页有标题和要点）
- 包含教学过程（多个教学环节）
- 可以成功导出为 PPT

## 🆚 模型对比

| 特性 | OpenAI GPT-4o | GLM-5 |
|------|---------------|-------|
| 上下文窗口 | 128K tokens | 200K tokens |
| 输出窗口 | 4K tokens | 128K tokens |
| 视觉理解 | ✅ | ❌ |
| 工具调用 | ✅ | ✅ |
| 流式输出 | ✅ | ✅ |
| 中文能力 | 良好 | 优秀 |
| 成本 | 较高 | 较低 |

## 💡 优势

使用 GLM-5 的优势：

1. **更大的上下文窗口**：200K vs 128K，可以处理更长的教学资料
2. **更大的输出窗口**：128K vs 4K，可以生成更详细的教学设计
3. **更好的中文能力**：GLM-5 是专门针对中文优化的模型
4. **更低的成本**：国产模型通常价格更优惠
5. **本地化支持**：智谱 AI 提供的技术支持

## ⚠️ 注意事项

1. **视觉功能**：GLM-5 不支持视觉理解，如果需要处理图片，可以考虑使用 GLM-4.6V 或 GLM-4.6V-Flash

2. **API 配额**：确保 GLM API Key 有足够的配额

3. **网络连接**：确保可以访问 `https://open.bigmodel.cn`

## 🔄 如何切换回其他模型

如果需要切换到其他模型，修改 `app/teaching-test/page.tsx` 中的 `handleGenerate` 函数：

### 切换到 OpenAI GPT-4o
```typescript
import { openai } from '@ai-sdk/openai';

const model = openai('gpt-4o');
```

### 切换到 GLM-4.7
```typescript
const { model } = getModel({
  providerId: 'glm',
  modelId: 'glm-4.7',
  apiKey: 'a61159bfaa7949b98ca9863e4350217b.qZiaDB1pjuLuuADv',
  baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
  providerType: 'openai',
  requiresApiKey: true,
});
```

### 切换到 Qwen
```typescript
const { model } = getModel({
  providerId: 'qwen',
  modelId: 'qwen3.5-plus',
  apiKey: 'YOUR_QWEN_API_KEY',
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  providerType: 'openai',
  requiresApiKey: true,
});
```

## 📚 相关文档

- [GLM 官方文档](https://docs.bigmodel.cn/)
- [GLM API 文档](https://open.bigmodel.cn/dev/api)
- [OpenMAIC Providers 配置](./OpenMAIC/lib/ai/providers.ts)

---

**当前状态**：✅ 已成功切换到 GLM-5 模型，可以开始测试！
