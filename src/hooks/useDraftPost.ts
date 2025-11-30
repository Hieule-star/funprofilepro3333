import { useState, useEffect } from "react";

const DRAFT_KEY = 'post_draft';
const DRAFT_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export interface DraftMedia {
  url: string;
  type: 'image' | 'video';
  name: string;
  size: number;
}

export interface DraftPost {
  content: string;
  media: DraftMedia[];
  savedAt: number;
}

export function useDraftPost() {
  const [draft, setDraft] = useState<DraftPost | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DRAFT_KEY);
      if (stored) {
        const parsed: DraftPost = JSON.parse(stored);
        
        // Check if draft is expired
        const isExpired = Date.now() - parsed.savedAt > DRAFT_EXPIRY;
        if (isExpired) {
          localStorage.removeItem(DRAFT_KEY);
          setHasDraft(false);
          return;
        }

        setDraft(parsed);
        setHasDraft(true);
      }
    } catch (error) {
      console.error("Error loading draft:", error);
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  const saveDraft = (content: string, media: DraftMedia[]) => {
    // Only save if there's content or media
    if (!content.trim() && media.length === 0) {
      return;
    }

    const draftData: DraftPost = {
      content,
      media,
      savedAt: Date.now(),
    };

    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
      setDraft(draftData);
      setHasDraft(true);
    } catch (error) {
      console.error("Error saving draft:", error);
    }
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      setDraft(null);
      setHasDraft(false);
    } catch (error) {
      console.error("Error clearing draft:", error);
    }
  };

  return {
    draft,
    hasDraft,
    saveDraft,
    clearDraft,
  };
}
