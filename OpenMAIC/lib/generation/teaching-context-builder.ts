/**
 * Teaching Context Builder
 * 
 * Builds the three-source fusion context bundle:
 * 1. Teacher intent (from TeachingRequest)
 * 2. Material context (from uploaded materials)
 * 3. RAG context (from FastGPT knowledge base)
 */

import type { TeachingRequest, TeachingContextBundle, RagChunk } from '@/lib/types/teaching';
import type { ParsedMaterialsResult } from './teaching-material-parser';
import { createLogger } from '@/lib/logger';

const log = createLogger('ContextBuilder');

// Context length limits to avoid prompt explosion
// Note: RAG context limit removed to allow full knowledge base content
const MAX_MATERIAL_CONTEXT_CHARS = 3000;
const MAX_RAG_CONTEXT_CHARS = Infinity; // No limit for RAG content

/**
 * Build teaching context bundle from three sources
 * 
 * @param request - Teacher's teaching request
 * @param parsedMaterials - Parsed reference materials
 * @param ragContext - Retrieved knowledge from FastGPT
 * @param ragChunks - Structured RAG chunks with IDs for verification
 * @returns Complete teaching context bundle
 */
export function buildTeachingContextBundle(
  request: TeachingRequest,
  parsedMaterials: ParsedMaterialsResult,
  ragContext: string,
  ragChunks?: RagChunk[]
): TeachingContextBundle {
  log.info('🔍 [3/4] Building teaching context bundle from three sources');

  // 1. Teacher Intent
  const teacherIntent = {
    subject: request.subject,
    topic: request.topic,
    gradeLevel: request.gradeLevel,
    duration: request.duration,
    objectives: {
      knowledge: request.objectives?.knowledge || [],
      skills: request.objectives?.skills || [],
      attitude: request.objectives?.attitude || [],
    },
    keyRequirements: request.additionalNotes ? [request.additionalNotes] : [],
  };

  // 2. Material Context (with length control)
  const materialContext = parsedMaterials.textContent.slice(0, MAX_MATERIAL_CONTEXT_CHARS);
  const materialTruncated = parsedMaterials.textContent.length > MAX_MATERIAL_CONTEXT_CHARS;

  // 3. RAG Context (with length control and chunk formatting)
  const safeRagContext = ragContext.slice(0, MAX_RAG_CONTEXT_CHARS);
  const ragTruncated = ragContext.length > MAX_RAG_CONTEXT_CHARS;

  // 🔍 DEBUG: Print RAG chunks before merging
  log.info('🔍 [3/4] RAG chunks received by ContextBuilder:', {
    hasRagChunks: !!ragChunks,
    chunkCount: ragChunks?.length || 0,
    ragContextLength: ragContext.length,
    safeRagContextLength: safeRagContext.length,
  });

  if (ragChunks && ragChunks.length > 0) {
    ragChunks.forEach((chunk, index) => {
      log.info(`🔍 [3/4] RAG chunk[${index}] in ContextBuilder:`, {
        id: chunk.id,
        contentLength: chunk.content.length,
        contentPreview: chunk.content.substring(0, 100) + '...',
        sourceName: chunk.sourceName,
      });
    });
  } else {
    log.warn('🔍 [3/4] ⚠️ No RAG chunks provided to ContextBuilder, will use raw ragContext');
  }

  // 4. Build merged context
  const mergedContext = buildMergedContext(
    teacherIntent,
    materialContext,
    parsedMaterials.images.length,
    safeRagContext,
    ragChunks,
    {
      materialTruncated,
      ragTruncated,
    }
  );

  log.info(`🔍 [3/4] Context bundle built: ${mergedContext.length} chars total`);

  // Calculate total RAG content length (prefer ragChunks over raw answer)
  const totalRagContent = ragChunks && ragChunks.length > 0
    ? ragChunks.map(c => c.content).join('')
    : safeRagContext;

  // 🔍 DEBUG: Print final RAG text that will be used
  log.info('🔍 [3/4] Final RAG text calculation:', {
    usedChunks: ragChunks && ragChunks.length > 0,
    totalRagContentLength: totalRagContent.length,
    totalRagContentPreview: totalRagContent.substring(0, 200) + '...',
  });

  const bundle = {
    teacherIntent,
    extractedFromMaterials: {
      textContent: materialContext,
      availableImages: parsedMaterials.images,
      keyTopics: parsedMaterials.summaries,
      suggestedStructure: undefined,
    },
    retrievedKnowledge: {
      relevantChunks: totalRagContent ? [totalRagContent] : [],
      references: [],
      confidence: undefined,
      ragChunks,
    },
    mergedContext,
  };

  // 🔍 DEBUG: Print final bundle summary
  log.info('🔍 [3/4] SUMMARY - Context bundle composition:', {
    teacherIntentChars: JSON.stringify(teacherIntent).length,
    materialContextChars: materialContext.length,
    imageCount: parsedMaterials.images.length,
    ragChunkCount: ragChunks?.length || 0,
    totalRagChars: totalRagContent.length,
    mergedContextChars: mergedContext.length,
    relevantChunksCount: bundle.retrievedKnowledge.relevantChunks.length,
    relevantChunksChars: bundle.retrievedKnowledge.relevantChunks.reduce((sum, c) => sum + c.length, 0),
  });

  return bundle;
}

/**
 * Build merged context string for LLM prompt
 */
function buildMergedContext(
  teacherIntent: TeachingContextBundle['teacherIntent'],
  materialContext: string,
  imageCount: number,
  ragContext: string,
  ragChunks: RagChunk[] | undefined,
  flags: { materialTruncated: boolean; ragTruncated: boolean }
): string {
  const sections: string[] = [];

  // Section 1: Teacher Requirements
  sections.push('# 【教师需求】');
  sections.push(`学科：${teacherIntent.subject}`);
  sections.push(`课题：${teacherIntent.topic}`);
  sections.push(`年级：${teacherIntent.gradeLevel}`);
  sections.push(`课时：${teacherIntent.duration}分钟`);

  if (teacherIntent.objectives.knowledge.length > 0) {
    sections.push('\n教学目标：');
    sections.push(`知识目标：${teacherIntent.objectives.knowledge.join('；')}`);
  }
  if (teacherIntent.objectives.skills.length > 0) {
    sections.push(`能力目标：${teacherIntent.objectives.skills.join('；')}`);
  }
  if (teacherIntent.objectives.attitude.length > 0) {
    sections.push(`情感态度：${teacherIntent.objectives.attitude.join('；')}`);
  }

  if (teacherIntent.keyRequirements.length > 0) {
    sections.push(`\n特殊要求：${teacherIntent.keyRequirements.join('；')}`);
  }

  // Section 2: Reference Materials
  if (materialContext) {
    sections.push('\n\n# 【参考资料内容】');
    sections.push(materialContext);
    if (flags.materialTruncated) {
      sections.push('\n（内容较长，已截取前3000字）');
    }
  }

  // Section 3: Image Resources
  if (imageCount > 0) {
    sections.push('\n\n# 【参考资料中的图片/图示资源】');
    sections.push(`共有 ${imageCount} 张可用图片，可在课件中引用`);
    sections.push('（图片ID将在后续生成中提供）');
  }

  // Section 4: Knowledge Base Content (with chunk IDs for verification)
  if (ragContext) {
    sections.push('\n\n# 【知识库参考内容】');
    
    // If we have structured chunks, format them with IDs
    if (ragChunks && ragChunks.length > 0) {
      sections.push('以下是从知识库检索到的相关内容片段，每个片段都有唯一ID用于来源追溯：\n');
      ragChunks.forEach((chunk, index) => {
        const chunkNumber = index + 1;
        sections.push(`【知识库片段${chunkNumber}】（ID: ${chunk.id}）`);
        if (chunk.sourceName) {
          sections.push(`来源文件：${chunk.sourceName}`);
        }
        sections.push(chunk.content);
        sections.push(''); // Empty line between chunks
      });
    } else {
      // Fallback: use raw context without chunk structure
      sections.push(ragContext);
    }
    
    if (flags.ragTruncated) {
      sections.push('（内容较长，已截取前2000字）');
    }
  }

  // Section 5: Enhanced Generation Requirements (Three-Source Fusion Constraints)
  sections.push('\n\n# 【生成要求 - 三源融合强约束】');
  sections.push('请综合以上三方面信息：');
  sections.push('1. 教师的明确需求和教学目标');
  sections.push('2. 参考资料中的具体内容和图片资源');
  sections.push('3. 知识库中的专业知识和教学建议');
  sections.push('');
  sections.push('## 核心约束（必须满足）：');
  sections.push('1. **至少 30% 内容来自【参考资料】** - 必须明确使用参考资料中的关键术语、概念、图表');
  sections.push('2. **至少 30% 内容来自【知识库】** - 必须明确使用知识库中的专业概念、教学建议');
  sections.push('3. **不允许只使用单一来源** - 每个知识点应融合多个来源');
  sections.push('');
  sections.push('## 内容来源标记要求：');
  sections.push('在生成的 keyPoints 中，每个要点必须标注来源：');
  sections.push('- 使用 "source" 字段标记：\'teacher\' | \'material\' | \'knowledge\'');
  sections.push('- **当使用知识库内容时，必须在 ragChunkId 字段中标注具体的片段ID**');
  sections.push('- 如果内容融合多个来源，选择主要来源');
  sections.push('- 示例格式：');
  sections.push('  {');
  sections.push('    "content": "进程是资源分配的基本单位（来自知识库片段1）",');
  sections.push('    "source": "knowledge",');
  sections.push('    "ragChunkId": "69d32ee3e29ef33b19ad8cb0"');
  sections.push('  }');
  sections.push('');
  sections.push('## 知识库引用强约束：');
  sections.push('- **当 source 为 "knowledge" 时，必须在内容中明确标注来源片段编号**');
  sections.push('- 例如："进程的三态模型包括就绪、运行、阻塞（来自知识库片段2）"');
  sections.push('- **必须填写 ragChunkId 字段，值为对应片段的ID**');
  sections.push('- **不允许编造知识库内容，所有标记为 knowledge 的内容必须能在上述片段中找到**');
  sections.push('');
  sections.push('## 引用要求：');
  sections.push('- 从参考资料引用时，保留原文的关键术语和表述方式');
  sections.push('- 从知识库引用时，使用专业的学术表达，并标注片段来源');
  sections.push('- 从教师需求引用时，体现教学目标的针对性');
  sections.push('');
  sections.push('生成结构化的教学设计，确保：');
  sections.push('- 教学内容准确、完整');
  sections.push('- 充分利用参考资料中的素材');
  sections.push('- 融入知识库的专业指导，并可追溯到具体片段');
  sections.push('- 符合教师的特殊要求');
  sections.push('- 三源内容分布均衡，来源可验证、可证明');

  return sections.join('\n');
}
