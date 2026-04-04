import type { SessionAnswer } from "../types/deck";
import {
    createDefaultCardProgress,
    type CardProgress,
    type ProgressMap,
    type ReviewResult,
} from "./srs";

export const STORAGE_PROGRESS_KEY = "kanji-app.progress";

export function getDefaultReviewState(): CardProgress {
    return createDefaultCardProgress();
}

function isCardProgress(value: unknown): value is CardProgress {
    if (!value || typeof value !== "object") return false;

    const candidate = value as Partial<CardProgress>;

    return (
        typeof candidate.score === "number" &&
        typeof candidate.streak === "number" &&
        typeof candidate.status === "string" &&
        typeof candidate.retryTokens === "number" &&
        typeof candidate.recentWrongCount === "number" &&
        typeof candidate.reviewCount === "number" &&
        (candidate.lastResult === null ||
            candidate.lastResult === "full" ||
            candidate.lastResult === "partial" ||
            candidate.lastResult === "wrong") &&
        (candidate.lastSeenAt === null || typeof candidate.lastSeenAt === "number")
    );
}

export function loadProgress(): ProgressMap {
    try {
        const raw = localStorage.getItem(STORAGE_PROGRESS_KEY);
        if (!raw) return {};

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return {};

        return Object.fromEntries(
            Object.entries(parsed).filter((entry): entry is [string, CardProgress] => isCardProgress(entry[1]))
        );
    } catch {
        return {};
    }
}

export function saveProgress(progress: ProgressMap) {
    localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(progress));
}

export function getReviewResultFromAnswer(answers: SessionAnswer): ReviewResult {
    const readingCorrect = answers.reading === true;
    const meaningCorrect = answers.meaning === true;

    if (readingCorrect && meaningCorrect) return "full";
    if (!readingCorrect && !meaningCorrect) return "wrong";
    return "partial";
}

export function getCardAccuracy(state: CardProgress): number {
    return state.score / 100;
}

export function isCardMastered(state?: CardProgress): boolean {
    return state?.status === "mastered";
}
