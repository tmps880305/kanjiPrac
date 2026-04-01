import type { ProgressMap, ReviewState, SessionAnswer } from "../types/deck";

export const STORAGE_PROGRESS_KEY = "kanji-app.progress";
export const STORAGE_INDEX_KEY = "kanji-app.currentIndex";

export function getDefaultReviewState(): ReviewState {
    return {
        readingScore: 0,
        meaningScore: 0,
        readingCorrect: 0,
        readingWrong: 0,
        meaningCorrect: 0,
        meaningWrong: 0,
        lastSeenAt: null,
    };
}

export function clamp(num: number, min: number, max: number) {
    return Math.min(max, Math.max(min, num));
}

export function loadProgress(): ProgressMap {
    try {
        const raw = localStorage.getItem(STORAGE_PROGRESS_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

export function saveProgress(progress: ProgressMap) {
    localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(progress));
}

export function loadCurrentIndex(): number {
    const raw = localStorage.getItem(STORAGE_INDEX_KEY);
    const value = Number(raw || 0);
    return Number.isFinite(value) ? value : 0;
}

export function saveCurrentIndex(index: number) {
    localStorage.setItem(STORAGE_INDEX_KEY, String(index));
}

export function applyAnswer(
    baseState: ReviewState,
    answers: SessionAnswer
): ReviewState {
    const next = { ...baseState };

    if (typeof answers.reading === "boolean") {
        if (answers.reading) {
            next.readingScore = clamp(next.readingScore + 1, 0, 8);
            next.readingCorrect += 1;
        } else {
            next.readingScore = clamp(next.readingScore - 2, 0, 8);
            next.readingWrong += 1;
        }
    }

    if (typeof answers.meaning === "boolean") {
        if (answers.meaning) {
            next.meaningScore = clamp(next.meaningScore + 1, 0, 8);
            next.meaningCorrect += 1;
        } else {
            next.meaningScore = clamp(next.meaningScore - 1, 0, 8);
            next.meaningWrong += 1;
        }
    }

    next.lastSeenAt = Date.now();
    return next;
}
