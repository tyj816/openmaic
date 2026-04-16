/**
 * Teaching Design Types - New core data model for educational content generation
 * 
 * This replaces the Scene-based system with a teaching-focused structure
 * while maintaining compatibility with existing Slide rendering infrastructure.
 */

import type { Slide, PPTElement, SlideBackground } from './slides';
import type { MediaGenerationRequest } from '@/lib/media/types';

// ==================== Input Types ====================

/**
 * Teaching request from teacher
 * Replaces UserRequirements with education-specific fields
 */
export interface TeachingRequest {
  // Basic information
  subject: string; // e.g., "数学", "物理"
  topic: string; // e.g., "二次函数的图像与性质"
  gradeLevel: string; // e.g., "初三", "高一"
  duration: number; // Class duration in minutes

  // Teaching objectives (optional, AI can supplement)
  objectives?: {
    knowledge?: string[]; // Knowledge goals
    skills?: string[]; // Ability goals
    attitude?: string[]; // Emotional attitude goals
  };

  // Style preferences
  stylePreferences?: {
    tone?: 'formal' | 'engaging' | 'interactive';
    visualStyle?: 'minimalist' | 'colorful' | 'professional';
    interactivityLevel?: 'low' | 'medium' | 'high';
  };

  // Knowledge base and materials
  useKnowledgeBase?: boolean; // Whether to use FastGPT RAG
  uploadedMaterials?: string[]; // Uploaded material file IDs
  additionalNotes?: string; // Additional instructions

  // Language
  language: 'zh-CN' | 'en-US';

  // 🆕 Image generation toggle
  enableImageGeneration?: boolean;
}

/**
 * Reference material (PDF, images, PPT, Word, etc.)
 */
export interface ReferenceMaterial {
  id: string;
  type: 'pdf' | 'image' | 'pptx' | 'docx' | 'txt' | 'other';
  name: string;

  // Parsed results
  parsedText?: string;
  parsedImages?: ParsedImage[];

  // Metadata
  metadata: {
    uploadedAt: Date;
    size: number;
    pageCount?: number;
    summary?: string;
  };

  storageRef?: string;
}

export interface ParsedImage {
  id: string;
  src: string; // base64 or URL
  pageNumber?: number;
  description?: string;
  width?: number;
  height?: number;
}

// ==================== Core Teaching Design ====================

/**
 * Teaching Design - The core data structure
 * Replaces Scene system with education-focused structure
 */
export interface TeachingDesign {
  id: string;

  // Basic information
  title: string;
  subject: string;
  gradeLevel: string;
  duration: number; // minutes

  // Teaching objectives (three-dimensional goals)
  objectives: {
    knowledge: string[];
    skills: string[];
    attitude: string[];
  };

  // Key points and difficulties
  keyPoints: string[];
  difficulties: string[];

  // Slide content (core)
  slides: TeachingSlide[];

  // Teaching procedures (lesson plan)
  procedures: TeachingProcedure[];

  // Other lesson plan elements
  homework?: string[];
  boardDesign?: string;
  remarks?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

/**
 * Single slide design
 * Maps to one PPT page
 */
export interface TeachingSlide {
  id: string;
  order: number;

  // Page basic info
  title: string;
  description?: string; // Teaching purpose for this slide (1-2 sentences)
  type?: 'cover' | 'contents' | 'transition' | 'content' | 'end';
  teachingObjective?: string; // Teaching objective for this slide
  visualIntent?: string; // Visual strategy hint, e.g. 图文讲解/对比归纳/步骤拆解
  preferredLayout?: string; // Preferred layout family for PPT generation
  densityHint?: 'sparse' | 'balanced' | 'dense'; // Content density hint for layout
  suggestedImageIds?: string[]; // Preferred images for this slide

  // 🆕 AI generated media requests (image generation)
  mediaGenerations?: MediaGenerationRequest[];

  // Teaching content with source tracking
  keyPoints: KeyPointWithSource[];
  contentBlocks: ContentBlock[];

  // Speaker notes (narration)
  narration?: string;

  // Underlying rendering data (reuses OpenMAIC's Slide structure)
  canvas?: Slide;

  // Related teaching procedure
  relatedProcedureId?: string;
}

/**
 * Key point with source tracking for enhanced three-source fusion
 */
export interface KeyPointWithSource {
  content: string;
  source?: 'teacher' | 'material' | 'knowledge';
  sourceDetail?: string; // Optional: specific reference or page number
  ragChunkId?: string; // RAG chunk ID for knowledge source verification
}

/**
 * Content block - describes content elements on the page
 * High-level semantic description, converted to PPTElement during generation
 */
export interface ContentBlock {
  id: string;
  type: 'text' | 'image' | 'chart' | 'table' | 'video' | 'formula';

  // Text block
  text?: {
    content: string;
    style?: 'title' | 'subtitle' | 'body' | 'bullet' | 'quote';
  };

  // Image block
  image?: {
    src: string; // Material ID or generation request
    caption?: string;
    alt?: string;
  };

  // Chart block
  chart?: {
    type: 'bar' | 'line' | 'pie' | 'scatter';
    data: {
      labels: string[];
      series: number[][];
      legends: string[];
    };
  };

  // Table block
  table?: {
    headers: string[];
    rows: string[][];
  };

  // Formula block
  formula?: {
    latex: string;
  };

  // Video block
  video?: {
    src: string;
    poster?: string;
  };
}

/**
 * Teaching procedure (lesson plan core)
 */
export interface TeachingProcedure {
  id: string;
  order: number;

  // Procedure information
  stageName: string; // e.g., "导入新课", "讲授新知"
  duration: number; // minutes

  // Teaching activities
  teacherActivity: string;
  studentActivity: string;

  // Related slides
  relatedSlides: string[]; // slide IDs

  // Design intent
  designIntent?: string;
}

// ==================== Generation Output ====================

/**
 * Generated artifact (final output)
 */
export interface Artifact {
  id: string;
  teachingDesignId: string;

  // Generated files
  pptxUrl?: string;
  docxUrl?: string;

  // Editable design (for regeneration)
  editableDesign: TeachingDesign;

  // Metadata
  generatedAt: Date;
  format: {
    pptx?: {
      slideCount: number;
      theme: string;
    };
    docx?: {
      pageCount: number;
      template: string;
    };
  };
}

/**
 * Regeneration request (user modifications)
 */
export interface RegenerationRequest {
  id: string;
  artifactId: string;

  // Modification type
  type: 'global' | 'section' | 'slide';

  // Modification target
  target?: {
    slideId?: string;
    procedureId?: string;
    section?: 'objectives' | 'procedures' | 'homework' | 'board';
  };

  // Modification instruction
  instruction: string;

  // Context preservation
  preserveContext: boolean;

  createdAt: Date;
}

// ==================== Three-Source Fusion (FastGPT Integration) ====================

/**
 * Source usage statistics for enhanced three-source fusion
 */
export interface SourceUsageStats {
  materialUsage: number; // Number of content items from materials
  ragUsage: number; // Number of content items from knowledge base
  teacherUsage: number; // Number of content items from teacher input
  totalItems: number; // Total content items generated
}

/**
 * Extracted materials context
 */
export interface ExtractedMaterials {
  textContent: string;
  availableImages: ParsedImage[];
  keyTopics: string[];
  suggestedStructure?: string;
}

/**
 * RAG chunk with source tracking for verification
 */
export interface RagChunk {
  id: string;
  content: string;
  sourceName?: string;
  chunkIndex?: number;
}

/**
 * Retrieved knowledge from FastGPT
 */
export interface RetrievedKnowledge {
  relevantChunks: string[];
  references: string[];
  confidence?: number;
  ragChunks?: RagChunk[]; // Structured chunks with IDs for verification
}

/**
 * Teaching context bundle (three-source fusion result)
 * This is the final input fed to LLM for teaching design generation
 */
export interface TeachingContextBundle {
  // 1. Teacher intent (organized)
  teacherIntent: {
    subject: string;
    topic: string;
    gradeLevel: string;
    duration: number;
    objectives: {
      knowledge: string[];
      skills: string[];
      attitude: string[];
    };
    keyRequirements: string[];
  };

  // 2. Material extraction results
  extractedFromMaterials: ExtractedMaterials;

  // 3. RAG retrieval results (FastGPT)
  retrievedKnowledge: RetrievedKnowledge;

  // 4. Merged final context
  mergedContext: string; // Formatted complete context text, directly fed to LLM
}
