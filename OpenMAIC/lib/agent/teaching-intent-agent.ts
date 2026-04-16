/**
 * Teaching Intent Agent
 * 
 * Conversational agent that collects teaching requirements through natural dialogue.
 * Gradually gathers information and converts it to a structured TeachingRequest.
 */

import { generateText } from 'ai';
import type { LanguageModel } from 'ai';
import type { TeachingRequest } from '@/lib/types/teaching';
import { extractIntentSlotsFromMessages } from '@/lib/mappers/intent-message-to-slots';
import { createLogger } from '@/lib/logger';

const log = createLogger('TeachingIntentAgent');

/**
 * Chat message in the conversation
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Teaching session state (tracks what info we've collected)
 */
export interface TeachingSession {
  topic?: string;
  subject?: string;
  gradeLevel?: string;
  duration?: number;
  objectives?: string[];
  additionalNotes?: string;
  useKnowledgeBase?: boolean;
  hasMaterials?: boolean;
  ready: boolean;
}

/**
 * Agent response
 */
export interface AgentResponse {
  reply: string;
  ready: boolean;
  teachingRequest?: TeachingRequest;
  session: TeachingSession;
}

/**
 * System prompt for the teaching intent agent
 */
const SYSTEM_PROMPT = `你是一个友好的教学设计助手。你的任务是通过自然对话，逐步收集教师的教学需求信息。

## 需要收集的信息

### 必填信息（缺一不可）：
1. **课题**（topic）：具体的教学主题，例如"二次函数的图像与性质"
2. **学科**（subject）：例如"数学"、"物理"、"语文"
3. **年级**（gradeLevel）：例如"初三"、"高一"、"小学四年级"
4. **课时**（duration）：课程时长，单位分钟，例如 45、90

### 可选信息：
5. **教学目标**（objectives）：知识目标、能力目标等
6. **特殊要求**（additionalNotes）：例如"重点讲解某个知识点"
7. **是否使用知识库**（useKnowledgeBase）：是否需要从知识库检索相关内容
8. **是否有参考资料**（hasMaterials）：是否会上传 PDF、Word 等参考资料

## 对话规则

1. **渐进式提问**：
   - 不要一次问完所有问题
   - 每次只问 1-2 个相关问题
   - 根据用户回答自然过渡到下一个问题

2. **语气风格**：
   - 像一个有经验的教学助理
   - 友好、专业、不啰嗦
   - 使用简洁的语言

3. **智能识别**：
   - 从用户的自然语言中提取信息
   - 如果用户一次提供多个信息，全部记录
   - 对模糊信息进行确认
   - 如果某个字段已经在历史消息中明确出现，绝对不要重复追问该字段
   - 对“是的”“好的”等确认句，要保留上一轮已识别出的字段，不要丢失

4. **信息确认**：
   - 收集完必填信息后，简要总结
   - 询问是否需要补充可选信息
   - 确认无误后表示可以开始生成

## 示例对话

用户："我想做一个关于二次函数的课件"
助手："好的！请问这是哪个学科的课程呢？是数学吗？"

用户："是的，数学"
助手："明白了。这节课是给哪个年级的学生上的呢？"

用户："初三学生"
助手："好的。请问这节课的时长是多少分钟呢？通常是 45 分钟还是其他时长？"

用户："45 分钟"
助手："太好了！让我确认一下您的需求：
- 课题：二次函数的图像与性质
- 学科：数学
- 年级：初三
- 课时：45 分钟

请问您有什么特殊的教学要求吗？比如重点讲解某个知识点，或者需要增加互动环节？如果没有，我们可以直接开始生成教学设计。"

## 当前任务

根据对话历史，判断：
1. 如果必填信息不完整 → 继续提问收集信息
2. 如果必填信息完整 → 总结并询问是否开始生成
3. 如果用户确认开始 → 返回 "READY" 信号

注意：
- 保持对话自然流畅
- 不要机械地按顺序提问
- 让教师觉得你真的理解了上下文。
当 topic / subject / gradeLevel / duration 中已有字段明确时，优先自然复述已知信息，再只追问缺失字段或更深一层的教学偏好。
如果四个必填字段都已完整，优先总结并询问是否开始生成，而不是重新收集基础信息。`;

/**
 * Extract teaching session from conversation history using LLM
 */
async function extractSessionFromHistoryWithLLM(
  messages: ChatMessage[],
  model: LanguageModel
): Promise<TeachingSession> {
  const conversationText = messages
    .map(m => `${m.role === 'user' ? '教师' : '助手'}: ${m.content}`)
    .join('\n');

  const extractionPrompt = `分析以下对话，提取教学需求信息。请仔细阅读对话内容，提取所有明确提到的信息。

对话内容：
${conversationText}

请提取以下信息（如果对话中明确提到，就提取；如果没有提到，返回 null）：
- topic: 课题/主题（例如："进程调度算法"）
- subject: 学科（例如："操作系统"、"数学"、"物理"等，任何学科都可以）
- gradeLevel: 年级（例如："二年级"、"初三"、"高一"等）
- duration: 课时时长（数字，单位分钟，例如：45）

注意：
1. subject 可以是任何学科，不限于常见学科
2. 如果用户说"是的"、"对"等确认词，要结合上下文判断确认的是什么
3. 只提取明确提到的信息，不要推测

请直接返回 JSON 格式，不要使用 markdown 代码块，例如：
{"topic": "进程调度算法", "subject": "操作系统", "gradeLevel": "二年级", "duration": 45}`;

  try {
    const result = await generateText({
      model,
      messages: [
        { role: 'system', content: '你是一个信息提取助手，从对话中提取结构化信息。' },
        { role: 'user', content: extractionPrompt }
      ],
      maxRetries: 2,
    });

    // Clean up markdown code blocks if present
    let jsonText = result.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const extracted = JSON.parse(jsonText.trim());
    
    return {
      topic: extracted.topic || undefined,
      subject: extracted.subject || undefined,
      gradeLevel: extracted.gradeLevel || undefined,
      duration: extracted.duration || undefined,
      ready: false,
    };
  } catch (error) {
    log.warn('LLM extraction failed, falling back to keyword extraction:', error);
    return extractSessionFromHistoryKeyword(messages);
  }
}

/**
 * Extract teaching session from conversation history using keywords (fallback)
 */
function extractSessionFromHistoryKeyword(messages: ChatMessage[]): TeachingSession {
  const session: TeachingSession = {
    ready: false,
  };

  const intentMessages = messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message, index) => ({
      id: `intent-${index}`,
      role: message.role === 'user' ? 'teacher' as const : 'ai' as const,
      title: message.role,
      content: message.content,
      meta: '',
    }));

  const { slots } = extractIntentSlotsFromMessages(intentMessages);

  if (slots.subject) {
    session.subject = slots.subject;
  }

  if (slots.topic) {
    session.topic = slots.topic;
  }

  if (slots.gradeLevel) {
    session.gradeLevel = slots.gradeLevel;
  }

  if (slots.duration) {
    session.duration = slots.duration;
  }

  return session;
}

/**
 * Check if session has all required fields
 */
function isSessionComplete(session: TeachingSession): boolean {
  return !!(
    session.topic &&
    session.subject &&
    session.gradeLevel &&
    session.duration
  );
}

/**
 * Convert session to TeachingRequest
 */
function sessionToTeachingRequest(session: TeachingSession): TeachingRequest {
  if (!session.topic || !session.subject || !session.gradeLevel || !session.duration) {
    throw new Error('Session is incomplete, cannot convert to TeachingRequest');
  }

  const request: TeachingRequest = {
    topic: session.topic,
    subject: session.subject,
    gradeLevel: session.gradeLevel,
    duration: session.duration,
    language: 'zh-CN',
  };

  // Add optional fields
  if (session.objectives && session.objectives.length > 0) {
    request.objectives = {
      knowledge: session.objectives,
    };
  }

  if (session.additionalNotes) {
    request.additionalNotes = session.additionalNotes;
  }

  if (session.useKnowledgeBase !== undefined) {
    request.useKnowledgeBase = session.useKnowledgeBase;
  }

  return request;
}

/**
 * Main conversation handler
 * 
 * @param messages - Conversation history
 * @param model - LLM model to use
 * @returns Agent response with next question or final TeachingRequest
 */
export async function handleTeachingConversation(
  messages: ChatMessage[],
  model: LanguageModel,
): Promise<AgentResponse> {
  try {
    log.info('Starting conversation handling with', messages.length, 'messages');
    
    // Extract current session state from history using LLM
    const session = await extractSessionFromHistoryWithLLM(messages, model);
    log.info('Extracted session:', session);

    // Check if user is confirming to start generation
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const confirmKeywords = ['开始', '生成', '好的', '可以', '确认', '没问题', 'ok', 'yes'];
    const isConfirming = lastUserMessage && confirmKeywords.some(kw => 
      lastUserMessage.content.toLowerCase().includes(kw)
    );

    // If session is complete and user is confirming, we're ready
    if (isSessionComplete(session) && isConfirming) {
      log.info('Session complete and user confirming, generating request');
      const teachingRequest = sessionToTeachingRequest(session);
      return {
        reply: '好的！我现在开始为您生成教学设计。请稍候...',
        ready: true,
        teachingRequest,
        session: { ...session, ready: true },
      };
    }

    // Build conversation context for LLM
    const conversationContext = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Add system prompt
    const fullMessages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...conversationContext,
    ];

    // Add current session state to help LLM
    const sessionSummary = `
当前已收集的信息：
- 课题：${session.topic || '未收集'}
- 学科：${session.subject || '未收集'}
- 年级：${session.gradeLevel || '未收集'}
- 课时：${session.duration ? `${session.duration}分钟` : '未收集'}

${isSessionComplete(session) ? '✓ 必填信息已完整，可以询问用户是否开始生成' : '✗ 必填信息不完整，需要继续收集'}
`;

    fullMessages.push({
      role: 'system' as const,
      content: sessionSummary,
    });

    // Call LLM to generate next response
    log.info('Calling LLM with', fullMessages.length, 'messages');
    const result = await generateText({
      model,
      messages: fullMessages,
      maxRetries: 2,
    });

    const reply = result.text.trim();
    log.info('LLM reply:', reply.substring(0, 100) + '...');

    // Check if LLM indicates ready (backup check)
    const readyKeywords = ['ready', 'READY', '开始生成'];
    const isReady = readyKeywords.some(kw => reply.includes(kw)) && isSessionComplete(session);

    if (isReady) {
      log.info('LLM indicated ready and session is complete');
      const teachingRequest = sessionToTeachingRequest(session);
      return {
        reply,
        ready: true,
        teachingRequest,
        session: { ...session, ready: true },
      };
    }

    // If LLM says READY but session is incomplete, ask for missing info
    if (readyKeywords.some(kw => reply.includes(kw)) && !isSessionComplete(session)) {
      log.warn('LLM said READY but session incomplete:', session);
      const missingFields = [];
      if (!session.topic) missingFields.push('课题');
      if (!session.subject) missingFields.push('学科');
      if (!session.gradeLevel) missingFields.push('年级');
      if (!session.duration) missingFields.push('课时');
      
      return {
        reply: `抱歉，我还需要确认一下：${missingFields.join('、')}。请告诉我这些信息。`,
        ready: false,
        session,
      };
    }

    return {
      reply,
      ready: false,
      session,
    };
  } catch (error) {
    log.error('Failed to handle teaching conversation:', error);
    // Return a fallback response instead of throwing
    return {
      reply: `抱歉，处理您的消息时出错了：${error instanceof Error ? error.message : String(error)}。请重试或换一种表达方式。`,
      ready: false,
      session: { ready: false },
    };
  }
}

/**
 * Enhanced version with structured output (more reliable)
 * Uses LLM to extract structured information from conversation
 */
export async function handleTeachingConversationStructured(
  messages: ChatMessage[],
  model: LanguageModel,
): Promise<AgentResponse> {
  try {
    // Build conversation context
    const conversationContext = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // System prompt for structured extraction
    const extractionPrompt = `分析对话历史，提取教学需求信息。

对话历史：
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

请提取以下信息（如果对话中没有提到，返回 null）：
1. topic（课题）
2. subject（学科）
3. gradeLevel（年级）
4. duration（课时，数字）
5. objectives（教学目标，数组）
6. additionalNotes（特殊要求）
7. useKnowledgeBase（是否使用知识库，布尔值）

返回 JSON 格式。`;

    // Call LLM for extraction
    const extractionResult = await generateText({
      model,
      messages: [
        { role: 'system' as const, content: extractionPrompt },
      ],
      maxRetries: 2,
    });

    // Parse extracted session
    let session: TeachingSession = { ready: false };
    try {
      const extracted = JSON.parse(extractionResult.text);
      session = {
        topic: extracted.topic || undefined,
        subject: extracted.subject || undefined,
        gradeLevel: extracted.gradeLevel || undefined,
        duration: extracted.duration || undefined,
        objectives: extracted.objectives || undefined,
        additionalNotes: extracted.additionalNotes || undefined,
        useKnowledgeBase: extracted.useKnowledgeBase || undefined,
        ready: false,
      };
    } catch (e) {
      log.warn('Failed to parse extracted session, using LLM extraction:', e);
      session = await extractSessionFromHistoryWithLLM(messages, model);
    }

    // Check if ready
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const confirmKeywords = ['开始', '生成', '好的', '可以', '确认', '没问题', 'ok', 'yes'];
    const isConfirming = lastUserMessage && confirmKeywords.some(kw => 
      lastUserMessage.content.toLowerCase().includes(kw)
    );

    if (isSessionComplete(session) && isConfirming) {
      const teachingRequest = sessionToTeachingRequest(session);
      return {
        reply: '好的！我现在开始为您生成教学设计。请稍候...',
        ready: true,
        teachingRequest,
        session: { ...session, ready: true },
      };
    }

    // Generate next question
    const sessionSummary = `
当前已收集的信息：
- 课题：${session.topic || '未收集'}
- 学科：${session.subject || '未收集'}
- 年级：${session.gradeLevel || '未收集'}
- 课时：${session.duration ? `${session.duration}分钟` : '未收集'}

${isSessionComplete(session) ? '✓ 必填信息已完整，可以询问用户是否开始生成' : '✗ 必填信息不完整，需要继续收集'}
`;

    const fullMessages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...conversationContext,
      { role: 'system' as const, content: sessionSummary },
    ];

    const result = await generateText({
      model,
      messages: fullMessages,
      maxRetries: 2,
    });

    return {
      reply: result.text.trim(),
      ready: false,
      session,
    };
  } catch (error) {
    log.error('Failed to handle structured teaching conversation:', error);
    throw error;
  }
}
