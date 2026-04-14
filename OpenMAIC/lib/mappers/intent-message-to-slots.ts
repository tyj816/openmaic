import type { IntentMessage } from "@/lib/types/teaching-design-ui";

export interface IntentSlots {
  topic?: string;
  gradeLevel?: string;
  duration?: number;
  subject?: string;
}

export interface IntentSlotExtractionResult {
  slots: IntentSlots;
  missingSlots: Array<keyof IntentSlots>;
}

const SUBJECT_KEYWORDS = [
  "语文",
  "数学",
  "英语",
  "物理",
  "化学",
  "生物",
  "历史",
  "地理",
  "道德与法治",
  "思想政治",
  "政治",
  "信息技术",
  "科学",
  "音乐",
  "美术",
  "体育",
  "劳动",
];

const GRADE_PATTERNS = [
  /(小学[一二三四五六]年级|初中[一二三]年级|高中[一二三]年级)/,
  /([一二三四五六]年级学生?)/,
  /([一二三四五六]年级)/,
  /(初[一二三]|高[一二三])学生?/,
  /(初[一二三]|高[一二三])/
];

const TOPIC_PATTERNS = [
  /(?:课题|主题|题目)[：:]\s*[《“"]?([^》”"，。；;\n]{2,40})[》”"]?/,
  /(?:寓言|课文|故事)[《“"]([^》”"]{2,40})[》”"]/,
  /[《“"]([^》”"]{2,40})[》”"]/
];

const DURATION_PATTERNS = [
  /(\d{1,3})\s*分钟/,
  /(\d{1,2})\s*课时/
];

function normalizeSubject(subject: string) {
  return subject === "政治" ? "思想政治" : subject;
}

function normalizeGradeLevel(gradeLevel: string) {
  return gradeLevel.replace(/学生$/, "");
}

function normalizeTopic(topic: string) {
  const trimmed = topic.trim();
  return /[《“"]/.test(trimmed) ? trimmed : `《${trimmed.replace(/[》”"]/g, "")}》`;
}

function extractSubject(text: string) {
  for (const keyword of SUBJECT_KEYWORDS) {
    if (text.includes(keyword)) {
      return normalizeSubject(keyword);
    }
  }

  return undefined;
}

function extractGradeLevel(text: string) {
  for (const pattern of GRADE_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return normalizeGradeLevel(match[1]);
    }
    if (match?.[0]) {
      return normalizeGradeLevel(match[0]);
    }
  }

  return undefined;
}

function extractDuration(text: string) {
  for (const pattern of DURATION_PATTERNS) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;

    const value = Number(match[1]);
    if (!Number.isFinite(value) || value <= 0) continue;

    if (pattern === DURATION_PATTERNS[1]) {
      return value * 40;
    }

    return value;
  }

  return undefined;
}

function extractTopic(text: string) {
  for (const pattern of TOPIC_PATTERNS) {
    const match = text.match(pattern);
    const candidate = match?.[1];
    if (candidate) {
      return normalizeTopic(candidate);
    }
  }

  const descriptiveMatch = text.match(/(?:帮我|请|想|需要)?(?:设计|做|生成)(?:一个)?([^，。；;\n]{3,40}?)(?:的课堂教学|教学设计|课件|课程|，|。|；|;|$)/);
  if (descriptiveMatch?.[1]) {
    return descriptiveMatch[1].trim();
  }

  return undefined;
}

function extractSlotsFromText(text: string): IntentSlots {
  return {
    subject: extractSubject(text),
    topic: extractTopic(text),
    gradeLevel: extractGradeLevel(text),
    duration: extractDuration(text),
  };
}

export function extractIntentSlotsFromMessages(messages: IntentMessage[]): IntentSlotExtractionResult {
  const slots: IntentSlots = {};

  for (const message of messages) {
    const extracted = extractSlotsFromText(message.content);

    if (!slots.subject && extracted.subject) slots.subject = extracted.subject;
    if (!slots.topic && extracted.topic) slots.topic = extracted.topic;
    if (!slots.gradeLevel && extracted.gradeLevel) slots.gradeLevel = extracted.gradeLevel;
    if (!slots.duration && extracted.duration) slots.duration = extracted.duration;
  }

  const missingSlots = (["topic", "subject", "gradeLevel", "duration"] as Array<keyof IntentSlots>).filter(
    (key) => !slots[key],
  );

  return {
    slots,
    missingSlots,
  };
}
