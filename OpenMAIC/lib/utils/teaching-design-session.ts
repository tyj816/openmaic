import type { TeachingDesign } from '@/lib/types/teaching';

const STORAGE_KEY = 'teachingDesignDraft';
const MATERIALS_STORAGE_KEY = 'teachingDesignMaterials';

export function saveTeachingDesignDraft(design: TeachingDesign) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(design));
}

export function loadTeachingDesignDraft(): TeachingDesign | null {
  if (typeof window === 'undefined') return null;

  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as TeachingDesign;
  } catch {
    return null;
  }
}

export function saveTeachingDesignMaterials(materials: unknown) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(materials));
}

export function loadTeachingDesignMaterials<T = unknown>(): T | null {
  if (typeof window === 'undefined') return null;

  const raw = sessionStorage.getItem(MATERIALS_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearTeachingDesignDraft() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(MATERIALS_STORAGE_KEY);
}
