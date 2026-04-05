/**
 * Prompt and context building utilities for the generation pipeline.
 */

import type { PdfImage } from '@/lib/types/generation';
import type { AgentInfo, SceneGenerationContext } from './pipeline-types';

/** Build a course context string for injection into action prompts */
export function buildCourseContext(ctx?: SceneGenerationContext): string {
  if (!ctx) return '';

  const lines: string[] = [];

  // Course outline with position marker
  lines.push('Course Outline:');
  ctx.allTitles.forEach((t, i) => {
    const marker = i === ctx.pageIndex - 1 ? ' ← current' : '';
    lines.push(`  ${i + 1}. ${t}${marker}`);
  });

  // Position information
  lines.push('');
  lines.push(
    'IMPORTANT: All pages belong to the SAME class session. Do NOT greet again after the first page. When referencing content from earlier pages, say "we just covered" or "as mentioned on page N" — NEVER say "last class" or "previous session" because there is no previous session.',
  );
  lines.push('');
  if (ctx.pageIndex === 1) {
    lines.push('Position: This is the FIRST page. Open with a greeting and course introduction.');
  } else if (ctx.pageIndex === ctx.totalPages) {
    lines.push('Position: This is the LAST page. Conclude the course with a summary and closing.');
    lines.push(
      'Transition: Continue naturally from the previous page. Do NOT greet or re-introduce.',
    );
  } else {
    lines.push(`Position: Page ${ctx.pageIndex} of ${ctx.totalPages} (middle of the course).`);
    lines.push(
      'Transition: Continue naturally from the previous page. Do NOT greet or re-introduce.',
    );
  }

  // Previous page speech for transition reference
  if (ctx.previousSpeeches.length > 0) {
    lines.push('');
    lines.push('Previous page speech (for transition reference):');
    const lastSpeech = ctx.previousSpeeches[ctx.previousSpeeches.length - 1];
    lines.push(`  "...${lastSpeech.slice(-150)}"`);
  }

  return lines.join('\n');
}

/** Format agent list for injection into action prompts */
export function formatAgentsForPrompt(agents?: AgentInfo[]): string {
  if (!agents || agents.length === 0) return '';

  const lines = ['Classroom Agents:'];
  for (const a of agents) {
    const personaPart = a.persona ? ` — ${a.persona}` : '';
    lines.push(`- id: "${a.id}", name: "${a.name}", role: ${a.role}${personaPart}`);
  }
  return lines.join('\n');
}

/** Extract the teacher agent's persona for injection into outline/content prompts */
export function formatTeacherPersonaForPrompt(agents?: AgentInfo[]): string {
  if (!agents || agents.length === 0) return '';

  const teacher = agents.find((a) => a.role === 'teacher');
  if (!teacher?.persona) return '';

  return `Teacher Persona:\nName: ${teacher.name}\n${teacher.persona}\n\nAdapt the content style and tone to match this teacher's personality. IMPORTANT: The teacher's name and identity must NOT appear on the slides — no "Teacher ${teacher.name}'s tips", no "Teacher's message", etc. Slides should read as neutral, professional visual aids.`;
}

/**
 * Format a single PdfImage description for prompt inclusion.
 * Includes dimension/aspect-ratio info when available.
 * 处理：
如果图片有宽高信息，计算宽高比
拼接图片的元信息（ID、页码、尺寸、描述）
返回： 一个格式化的字符串，用于插入到 LLM 的 prompt 中，
让 LLM 知道有哪些图片可用
LLM 在生成的 JSON 中引用这些图片 ID（如 "imageId": "img_1"）
前端渲染时，根据 imageId 从 IndexedDB 加载对应的图片显示
 */
export function formatImageDescription(img: PdfImage, language: string): string {
  let dimInfo = '';
  if (img.width && img.height) {
    const ratio = (img.width / img.height).toFixed(2);
    dimInfo = ` | 尺寸: ${img.width}×${img.height} (宽高比${ratio})`;
  }
  const desc = img.description ? ` | ${img.description}` : '';
  return language === 'zh-CN'
    ? `- **${img.id}**: 来自PDF第${img.pageNumber}页${dimInfo}${desc}`
    : `- **${img.id}**: from PDF page ${img.pageNumber}${dimInfo}${desc}`;
}

/**
 * Format a short image placeholder for vision mode.
 * Only ID + page + dimensions + aspect ratio (no description), since the model can see the actual image.
 * 处理：
 * 如果图片有宽高信息，计算宽高比
 * 拼接图片的简短占位符（ID、页码、尺寸），不包含描述
 * 返回： 一个简短的格式化字符串，用于 vision 模式的 prompt
 * 配合 buildVisionUserContent() 使用，实际图片会作为附件发送给 LLM
 * LLM 能直接"看到"图片内容，因此不需要文字描述
 * LLM 在生成的 JSON 中引用这些图片 ID（如 "imageId": "img_1"）
 */
export function formatImagePlaceholder(img: PdfImage, language: string): string {
  let dimInfo = '';
  if (img.width && img.height) {
    const ratio = (img.width / img.height).toFixed(2);
    dimInfo = ` | 尺寸: ${img.width}×${img.height} (宽高比${ratio})`;
  }
  return language === 'zh-CN'
    ? `- **${img.id}**: PDF第${img.pageNumber}页的图片${dimInfo} [参见附图]`
    : `- **${img.id}**: image from PDF page ${img.pageNumber}${dimInfo} [see attached]`;
}

/**
 * Build a multimodal user content array for the AI SDK.
 * Interleaves text and images so the model can associate img_id with actual image.
 * Each image label includes dimensions when available so the model knows the size
 * before seeing the image (important for layout decisions).
 * 
 * 构建多模态模型的输入内容数组（文字 + 图片）
 * 输入：
 * - userPrompt: 文字提示词
 * - images: 图片数组（包含 id、src、宽高等信息）
 * 
 * 处理：
 * 1. 将文字 prompt 作为第一个元素
 * 2. 添加图片分隔标题 "--- Attached Images ---"
 * 3. 遍历每张图片，交错添加：
 *    - 文字标签（图片 ID + 尺寸信息）
 *    - 图片数据（base64 或 URL）
 * 4. 解析 data URI 格式，提取 mimeType 和纯 base64
 * 
 * 返回：
 * 符合 AI SDK 格式的多模态内容数组，包含交错排列的文字和图片
 * 让 vision 模型能够：
 * - 看到文字 prompt
 * - 知道每张图片的 ID 和尺寸
 * - 直接"看到"图片的实际内容
 * - 在生成结果中引用图片 ID（如 "imageId": "img_1"）
 */
export function buildVisionUserContent(
  userPrompt: string,
  images: Array<{ id: string; src: string; width?: number; height?: number }>,
): Array<{ type: 'text'; text: string } | { type: 'image'; image: string; mimeType?: string }> {
  const parts: Array<
    { type: 'text'; text: string } | { type: 'image'; image: string; mimeType?: string }
  > = [{ type: 'text', text: userPrompt }];
  if (images.length > 0) {
    parts.push({ type: 'text', text: '\n\n--- Attached Images ---' });
    for (const img of images) {
      let dimInfo = '';
      if (img.width && img.height) {
        const ratio = (img.width / img.height).toFixed(2);
        dimInfo = ` (${img.width}×${img.height}, 宽高比${ratio})`;
      }
      parts.push({ type: 'text', text: `\n**${img.id}**${dimInfo}:` });
      // Strip data URI prefix — AI SDK only accepts http(s) URLs or raw base64
      const dataUriMatch = img.src.match(/^data:([^;]+);base64,(.+)$/);
      if (dataUriMatch) {
        parts.push({
          type: 'image',
          image: dataUriMatch[2],
          mimeType: dataUriMatch[1],
        });
      } else {
        parts.push({ type: 'image', image: img.src });
      }
    }
  }
  return parts;
}
