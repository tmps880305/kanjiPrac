import type { Card, ProgressMap } from "../types/deck";
import { clamp, getDefaultReviewState } from "./progress";

export function buildWeightedQueue(cards: Card[], progress: ProgressMap): Card[] {
    const now = Date.now();

    const weighted = cards.flatMap((card) => {
        const state = progress[card.id] ?? getDefaultReviewState();
        const minutesSinceSeen = state.lastSeenAt
            ? (now - state.lastSeenAt) / 60000
            : 9999;

        const readingNeed = 4 - state.readingScore;
        const meaningNeed = 2 - state.meaningScore;
        const wrongBoost = state.readingWrong * 2 + state.meaningWrong;
        const staleBoost = minutesSinceSeen > 10 ? 1 : 0;

        const weight = clamp(
            1 + readingNeed * 2 + meaningNeed + wrongBoost + staleBoost,
            1,
            12
        );

        return Array.from({ length: weight }, () => card);
    });

    for (let i = weighted.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [weighted[i], weighted[j]] = [weighted[j], weighted[i]];
    }

    return weighted;
}
