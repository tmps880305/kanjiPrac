import type { Card, ProgressMap } from "../types/deck";
import {
    getDefaultReviewState,
    getReadingAccuracy,
    getWeightedAccuracy,
    isCardMastered,
} from "./progress";

export const REVIEW_INTERVAL_NEW_CARDS = 2;
export const STORAGE_STUDY_ORDER_KEY = "kanji-app.studyOrder";

type NextCardResult = {
    card: Card | null;
    mode: "new" | "review" | "done";
    nextNewIndex: number;
    nextNewCardsSinceReview: number;
};

function shuffleCards(cards: Card[]): Card[] {
    const nextCards = [...cards];

    for (let i = nextCards.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [nextCards[i], nextCards[j]] = [nextCards[j], nextCards[i]];
    }

    return nextCards;
}

export function createStudyOrder(cards: Card[]): string[] {
    return shuffleCards(cards).map((card) => card.id);
}

export function loadStudyOrder(cards: Card[]): string[] {
    const fallbackOrder = createStudyOrder(cards);

    try {
        const raw = localStorage.getItem(STORAGE_STUDY_ORDER_KEY);
        if (!raw) return fallbackOrder;

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return fallbackOrder;

        const ids = new Set(cards.map((card) => card.id));
        const knownIds = parsed.filter((id): id is string => typeof id === "string" && ids.has(id));
        const missingIds = cards.map((card) => card.id).filter((id) => !knownIds.includes(id));

        return [...knownIds, ...shuffleCards(cards.filter((card) => missingIds.includes(card.id))).map((card) => card.id)];
    } catch {
        return fallbackOrder;
    }
}

export function saveStudyOrder(order: string[]) {
    localStorage.setItem(STORAGE_STUDY_ORDER_KEY, JSON.stringify(order));
}

export function clearStudyOrder() {
    localStorage.removeItem(STORAGE_STUDY_ORDER_KEY);
}

export function applyStudyOrder(cards: Card[], studyOrder: string[]): Card[] {
    const cardById = new Map(cards.map((card) => [card.id, card]));

    return studyOrder
        .map((id) => cardById.get(id) ?? null)
        .filter((card): card is Card => card !== null);
}

function getReviewPriority(card: Card, progress: ProgressMap) {
    const state = progress[card.id] ?? getDefaultReviewState();
    const readingAccuracy = getReadingAccuracy(state);
    const weightedAccuracy = getWeightedAccuracy(state);
    const wrongCount = state.readingWrong * 2 + state.meaningWrong;
    const seenAt = state.lastSeenAt ?? 0;

    return {
        card,
        readingAccuracy,
        weightedAccuracy,
        wrongCount,
        seenAt,
    };
}

export function getReviewCandidates(cards: Card[], progress: ProgressMap): Card[] {
    return cards
        .filter((card) => {
            const state = progress[card.id];
            if (!state) return false;
            return !isCardMastered(state);
        })
        .map((card) => getReviewPriority(card, progress))
        .sort((a, b) => {
            if (a.readingAccuracy !== b.readingAccuracy) {
                return a.readingAccuracy - b.readingAccuracy;
            }

            if (a.weightedAccuracy !== b.weightedAccuracy) {
                return a.weightedAccuracy - b.weightedAccuracy;
            }

            if (a.wrongCount !== b.wrongCount) {
                return b.wrongCount - a.wrongCount;
            }

            return a.seenAt - b.seenAt;
        })
        .map((entry) => entry.card);
}

export function getStudyCounts(cards: Card[], progress: ProgressMap, nextNewIndex: number) {
    return {
        totalCards: cards.length,
        introducedCards: Object.keys(progress).length,
        newCardsLeft: Math.max(cards.length - nextNewIndex, 0),
        reviewCardsLeft: getReviewCandidates(cards, progress).length,
        masteredCards: cards.filter((card) => isCardMastered(progress[card.id])).length,
    };
}

export function getNextCard(
    cards: Card[],
    progress: ProgressMap,
    nextNewIndex: number,
    newCardsSinceReview: number
): NextCardResult {
    const reviewCandidates = getReviewCandidates(cards, progress);
    const hasReviewCards = reviewCandidates.length > 0;
    const hasNewCards = nextNewIndex < cards.length;

    const shouldShowReview =
        hasReviewCards &&
        (!hasNewCards || newCardsSinceReview >= REVIEW_INTERVAL_NEW_CARDS);

    if (shouldShowReview) {
        return {
            card: reviewCandidates[0] ?? null,
            mode: reviewCandidates.length ? "review" : "done",
            nextNewIndex,
            nextNewCardsSinceReview: 0,
        };
    }

    if (hasNewCards) {
        return {
            card: cards[nextNewIndex] ?? null,
            mode: "new",
            nextNewIndex: nextNewIndex + 1,
            nextNewCardsSinceReview: newCardsSinceReview + 1,
        };
    }

    return {
        card: null,
        mode: "done",
        nextNewIndex,
        nextNewCardsSinceReview: 0,
    };
}
