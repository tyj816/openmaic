# RAG 日志修复方案

## 问题分析

根据 ChatGPT 的详细分析，"毛概"内容混入的根本原因不是知识库返回了错误内容，而是：

1. **RAG 正文丢失**：FastGPT 命中了正确的文档，但后续提取 chunk 时得到了 0 chars
2. **下游生成上下文被污染**：在 RAG 内容为空的情况下，模型依赖通用教学模板和重试补偿指令自由发挥
3. **三源融合失效**：由于 RAG 内容实际为空，模型只能用泛化教学话术补充，导致出现跨主题污染

## 关键链路追踪

需要追踪以下 4 个关键数据流转点：

### 1. FastGPT 返回的原始 quoteList
- 位置：`fastgpt-client.ts` 中 `data.responseData[*].quoteList`
- 需要打印：每个 quote 的 `q` 和 `a` 字段的长度和内容预览
- 目的：确认 FastGPT 是否真的返回了有效内容

### 2. 提取后的 ragChunks
- 位置：`teaching-outline-generator.ts` 中从 `result.quoteList` 提取 `ragChunks`
- 需要打印：每个 chunk 的 `content` 长度和预览
- 目的：确认提取逻辑是否正确获取了 `q` 或 `a` 字段

### 3. 传入 ContextBuilder 的 ragText
- 位置：`teaching-context-builder.ts` 的 `buildTeachingContextBundle` 函数
- 需要打印：`ragContext` 和 `ragChunks` 的详细信息
- 目的：确认三源融合时 RAG 内容是否完整

### 4. 最终喂给 PPT 生成模型的完整 prompt
- 位置：`teaching-outline-generator.ts` 中调用 `aiCall` 之前
- 需要打印：完整的 `systemPrompt` 和 `userPrompt`
- 目的：确认模型实际收到的上下文中是否包含 RAG 内容

## 实施方案

### 修改 1：fastgpt-client.ts - 打印原始 quoteList

```typescript
// 在提取 quoteList 时添加详细日志
if (datasetSearchNode?.quoteList) {
  log.info('🔍 [1/4] FastGPT raw quoteList structure:', JSON.stringify(datasetSearchNode.quoteList, null, 2));
}

quoteList = datasetSearchNode.quoteList.map((quote: any, index: number) => {
  const extracted = { /* ... */ };
  
  const qLen = quote.q?.length || 0;
  const aLen = quote.a?.length || 0;
  log.info(`🔍 [1/4] Extracted quote[${index}]:`, {
    id: extracted.id,
    sourceName: extracted.sourceName,
    qLength: qLen,
    aLength: aLen,
    qPreview: quote.q ? quote.q.substring(0, 100) + '...' : '(empty)',
    aPreview: quote.a ? quote.a.substring(0, 100) + '...' : '(empty)',
  });
  
  return extracted;
});

// 如果总字符数为 0，发出严重警告
if (totalQuoteChars === 0) {
  log.error('🔍 [1/4] ⚠️ CRITICAL: All quotes have 0 content!');
}
```

### 修改 2：teaching-outline-generator.ts - 打印 ragChunks 提取

```typescript
if (result.quoteList && result.quoteList.length > 0) {
  log.info(`🔍 [2/4] Processing ${result.quoteList.length} quotes from FastGPT result`);
  
  ragChunks = result.quoteList.map((quote, index) => {
    const content = quote.q || quote.a || '';
    const chunk = { /* ... */ };
    
    log.info(`🔍 [2/4] RAG chunk[${index}]:`, {
      id: chunk.id,
      sourceName: chunk.sourceName,
      contentLength: content.length,
      contentPreview: content.substring(0, 150) + '...',
      hasQ: !!quote.q,
      hasA: !!quote.a,
    });
    
    return chunk;
  });
  
  if (totalChunkChars === 0) {
    log.error('🔍 [2/4] ⚠️ CRITICAL: All RAG chunks have 0 content!');
  }
}
```

### 修改 3：teaching-context-builder.ts - 打印三源融合输入

```typescript
export function buildTeachingContextBundle(...) {
  log.info('🔍 [3/4] Building teaching context bundle from three sources');
  
  // 打印 RAG chunks 接收情况
  log.info('🔍 [3/4] RAG chunks received by ContextBuilder:', {
    hasRagChunks: !!ragChunks,
    chunkCount: ragChunks?.length || 0,
    ragContextLength: ragContext.length,
  });
  
  if (ragChunks && ragChunks.length > 0) {
    ragChunks.forEach((chunk, index) => {
      log.info(`🔍 [3/4] RAG chunk[${index}]:`, {
        id: chunk.id,
        contentLength: chunk.content.length,
        contentPreview: chunk.content.substring(0, 100) + '...',
      });
    });
  }
  
  // 打印最终 RAG 文本
  log.info('🔍 [3/4] Final RAG text calculation:', {
    usedChunks: ragChunks && ragChunks.length > 0,
    totalRagContentLength: totalRagContent.length,
    totalRagContentPreview: totalRagContent.substring(0, 200) + '...',
  });
  
  // 打印最终 bundle 摘要
  log.info('🔍 [3/4] SUMMARY - Context bundle composition:', {
    teacherIntentChars: JSON.stringify(teacherIntent).length,
    materialContextChars: materialContext.length,
    ragChunkCount: ragChunks?.length || 0,
    totalRagChars: totalRagContent.length,
    mergedContextChars: mergedContext.length,
  });
}
```

### 修改 4：teaching-outline-generator.ts - 打印最终 prompt

```typescript
const response = await aiCall(systemPrompt, finalUserPrompt, visionImages);

// 打印完整 prompt
log.info('🔍 [4/4] Complete prompt sent to PPT generation model:');
log.info('🔍 [4/4] ===== SYSTEM PROMPT =====');
log.info(systemPrompt);
log.info('🔍 [4/4] ===== USER PROMPT (first 2000 chars) =====');
log.info(finalUserPrompt.substring(0, 2000));
log.info('🔍 [4/4] ===== USER PROMPT (last 1000 chars) =====');
log.info(finalUserPrompt.substring(Math.max(0, finalUserPrompt.length - 1000)));
log.info('🔍 [4/4] ===== PROMPT STATS =====', {
  systemPromptLength: systemPrompt.length,
  userPromptLength: finalUserPrompt.length,
  totalPromptLength: systemPrompt.length + finalUserPrompt.length,
});
```

## 预期效果

通过这 4 个关键日志点，可以清楚地看到：

1. FastGPT 是否返回了有效的 `q` 和 `a` 内容
2. 提取逻辑是否正确获取了这些内容
3. ContextBuilder 是否收到了完整的 RAG 数据
4. 最终的 prompt 中是否真正包含了 RAG 内容

如果发现某一步出现 0 chars，就能立即定位问题所在。

## 下一步行动

1. 运行测试用例，收集完整的 4 步日志
2. 分析日志，找出 RAG 内容丢失的具体位置
3. 修复提取逻辑或数据传递问题
4. 验证修复后 RAG 内容能正确流转到最终 prompt
