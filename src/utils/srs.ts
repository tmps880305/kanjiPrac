import type { Card } from "../types/deck";

export const STORAGE_STUDY_ORDER_KEY = "kanji-app.studyOrder";
export const RECENT_CARD_HISTORY_LIMIT = 4;
export const RECENT_CARD_COOLDOWN = 2;
export const NEW_CARD_RATIO = 2;
export const RETRY_CARD_RATIO = 1;

export type StudyStatus = "new" | "learning" | "reviewing" | "mastered";
export type ReviewResult = "full" | "partial" | "wrong";

export type CardProgress = {
    score: number;
    streak: number;
    status: StudyStatus;
    retryTokens: number;
    recentWrongCount: number;
    reviewCount: number;
    lastResult: ReviewResult | null;
    lastSeenAt: number | null;
};

export type ProgressMap = Record<string, CardProgress>;

export type CardLike = {
    id: string;
};

type NextCardResult<TCard extends CardLike> = {
    card: TCard | null;
    mode: "study" | "done";
};

type PickNextCardOptions = {
    now?: number;
    recentCardIds?: string[];
    preferNewCards?: boolean;
};

export function createDefaultCardProgress(): CardProgress {
    return {
        score: 0,
        streak: 0,
        status: "new",
        retryTokens: 0,
        recentWrongCount: 0,
        reviewCount: 0,
        lastResult: null,
        lastSeenAt: null,
    };
}

function clamp(num: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, num));
}

function shuffleCards(cards: Card[]): Card[] {
    const nextCards = [...cards];

    for (let i = nextCards.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [nextCards[i], nextCards[j]] = [nextCards[j], nextCards[i]];
    }

    return nextCards;
}

function getNextStatus(score: number, streak: number, reviewCount: number): StudyStatus {
    if (reviewCount === 0) return "new";
    if (score >= 100 && streak >= 3) return "mastered";
    if (score >= 60 && streak >= 2) return "reviewing";
    return "learning";
}

function getRecentCooldownIds(recentCardIds: string[]): Set<string> {
    const cooldownIds = recentCardIds.slice(-RECENT_CARD_COOLDOWN);
    return new Set(cooldownIds);
}

function isNewCard(cardId: string, progressMap: ProgressMap): boolean {
    const progress = progressMap[cardId] ?? createDefaultCardProgress();
    return progress.status === "new";
}

function filterNewCards<TCard extends CardLike>(cards: TCard[], progressMap: ProgressMap): TCard[] {
    return cards.filter((card) => isNewCard(card.id, progressMap));
}

function filterRetryCards<TCard extends CardLike>(cards: TCard[], progressMap: ProgressMap): TCard[] {
    return cards.filter((card) => {
        const progress = progressMap[card.id] ?? createDefaultCardProgress();
        return progress.retryTokens > 0;
    });
}

export function appendRecentCardId(recentCardIds: string[], cardId: string): string[] {
    if (recentCardIds[recentCardIds.length - 1] === cardId) {
        return recentCardIds;
    }

    const nextRecent = [...recentCardIds, cardId];
    return nextRecent.slice(-RECENT_CARD_HISTORY_LIMIT);
}

export function getCardQueueType(
    cardId: string,
    progressMap: ProgressMap
): "new" | "retry" | "normal" {
    if (isNewCard(cardId, progressMap)) return "new";

    const progress = progressMap[cardId] ?? createDefaultCardProgress();
    if (progress.retryTokens > 0) return "retry";

    return "normal";
}

export function shouldPreferNewCards(queueHistory: Array<"new" | "retry" | "normal">): boolean {
    const cycleSize = NEW_CARD_RATIO + RETRY_CARD_RATIO;
    const recentCycle = queueHistory.slice(-cycleSize);
    const recentNewCount = recentCycle.filter((entry) => entry === "new").length;

    return recentNewCount < NEW_CARD_RATIO;
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

        return [
            ...knownIds,
            ...shuffleCards(cards.filter((card) => missingIds.includes(card.id))).map((card) => card.id),
        ];
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

export function applyReviewResult(
    prev: CardProgress | undefined,
    result: ReviewResult,
    now: number = Date.now()
): CardProgress {
    const current = prev ?? createDefaultCardProgress();
    const next: CardProgress = { ...current };
    const isFirstReview = next.reviewCount === 0;

    if (result === "full") {
        next.score += isFirstReview ? 40 : 20;
        next.streak += 1;
        if (next.retryTokens > 0) next.retryTokens -= 1;
        next.recentWrongCount = Math.max(0, next.recentWrongCount - 1);
    } else if (result === "partial") {
        next.score += 5;
        next.streak = 0;
        next.retryTokens += 2;
        next.recentWrongCount += 1;
    } else {
        next.score -= 10;
        next.streak = 0;
        next.retryTokens += 3;
        next.recentWrongCount += 2;
    }

    next.score = clamp(next.score, 0, 100);
    next.reviewCount += 1;
    next.lastResult = result;
    next.lastSeenAt = now;
    next.status = getNextStatus(next.score, next.streak, next.reviewCount);

    return next;
}

export function updateProgressMap(
    progressMap: ProgressMap,
    cardId: string,
    result: ReviewResult,
    now: number = Date.now()
): ProgressMap {
    return {
        ...progressMap,
        [cardId]: applyReviewResult(progressMap[cardId], result, now),
    };
}

export function getCardWeight(
    progress: CardProgress | undefined,
    now: number = Date.now()
): number {
    const p = progress ?? createDefaultCardProgress();

    let base = 1;
    if (p.status === "new") base = 8;
    else if (p.status === "learning") base = 6;
    else if (p.status === "reviewing") base = 3;

    let bonus = 0;

    if (p.recentWrongCount >= 2) bonus += 4;
    else if (p.recentWrongCount === 1) bonus += 2;

    if (p.score < 30) bonus += 1;

    if (!p.lastSeenAt) {
        bonus += 1;
    } else {
        const minutesSinceSeen = (now - p.lastSeenAt) / 60000;
        if (minutesSinceSeen > 10) bonus += 1;
    }

    return Math.max(1, base + bonus);
}

export function pickFromRetryCards(
    cards: CardLike[],
    progressMap: ProgressMap,
): string | null {
    const retryCandidates = cards.filter((card) => {
        const p = progressMap[card.id] ?? createDefaultCardProgress();
        return p.retryTokens > 0;
    });

    if (retryCandidates.length === 0) return null;

    retryCandidates.sort((a, b) => {
        const pa = progressMap[a.id] ?? createDefaultCardProgress();
        const pb = progressMap[b.id] ?? createDefaultCardProgress();

        if (pb.retryTokens !== pa.retryTokens) {
            return pb.retryTokens - pa.retryTokens;
        }

        const aLastSeen = pa.lastSeenAt ?? 0;
        const bLastSeen = pb.lastSeenAt ?? 0;

        return aLastSeen - bLastSeen;
    });

    return retryCandidates[0].id;
}

export function pickWeightedRandomCard(
    cards: CardLike[],
    progressMap: ProgressMap,
    now: number = Date.now()
): string | null {
    if (cards.length === 0) return null;

    const weighted = cards.map((card) => ({
        id: card.id,
        weight: getCardWeight(progressMap[card.id], now),
    }));

    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight <= 0) return cards[0].id;

    let r = Math.random() * totalWeight;

    for (const item of weighted) {
        r -= item.weight;
        if (r <= 0) return item.id;
    }

    return weighted[weighted.length - 1].id;
}

export function pickNextCardId(
    cards: CardLike[],
    progressMap: ProgressMap,
    options: PickNextCardOptions = {}
): string | null {
    const now = options.now ?? Date.now();
    const recentCardIds = options.recentCardIds ?? [];
    const preferNewCards = options.preferNewCards ?? false;
    const cooldownIds = getRecentCooldownIds(recentCardIds);
    const nonCooldownCards = cards.filter((card) => !cooldownIds.has(card.id));
    const spacedNewCards = filterNewCards(nonCooldownCards, progressMap);
    const spacedRetryCards = filterRetryCards(nonCooldownCards, progressMap);

    if (preferNewCards && spacedNewCards.length > 0) {
        return pickWeightedRandomCard(spacedNewCards, progressMap, now);
    }

    const retryFromSpacedCards = pickFromRetryCards(spacedRetryCards, progressMap);
    if (retryFromSpacedCards) return retryFromSpacedCards;

    if (nonCooldownCards.length > 0) {
        if (spacedNewCards.length > 0) {
            return pickWeightedRandomCard(spacedNewCards, progressMap, now);
        }

        return pickWeightedRandomCard(nonCooldownCards, progressMap, now);
    }

    const fallbackNewCards = filterNewCards(cards, progressMap);
    if (preferNewCards && fallbackNewCards.length > 0) {
        return pickWeightedRandomCard(fallbackNewCards, progressMap, now);
    }

    const retryFallback = pickFromRetryCards(filterRetryCards(cards, progressMap), progressMap);
    if (retryFallback) return retryFallback;

    if (fallbackNewCards.length > 0) {
        return pickWeightedRandomCard(fallbackNewCards, progressMap, now);
    }

    return pickWeightedRandomCard(cards, progressMap, now);
}

export function getStudyCounts(cards: CardLike[], progress: ProgressMap) {
    return cards.reduce(
        (counts, card) => {
            const state = progress[card.id] ?? createDefaultCardProgress();

            if (state.status === "new") counts.newCardsLeft += 1;
            if (state.retryTokens > 0) counts.reviewCardsLeft += 1;
            if (state.status === "mastered") counts.masteredCards += 1;
            if (state.reviewCount > 0) counts.introducedCards += 1;

            return counts;
        },
        {
            totalCards: cards.length,
            introducedCards: 0,
            newCardsLeft: 0,
            reviewCardsLeft: 0,
            masteredCards: 0,
        }
    );
}

export function getNextCard<TCard extends CardLike>(
    cards: TCard[],
    progress: ProgressMap,
    options: PickNextCardOptions = {}
): NextCardResult<TCard> {
    if (cards.length === 0) {
        return {
            card: null,
            mode: "done",
        };
    }

    const nextCardId = pickNextCardId(cards, progress, options);
    const nextCard = cards.find((card) => card.id === nextCardId) ?? null;

    if (!nextCard) {
        return {
            card: null,
            mode: "done",
        };
    }

    return {
        card: nextCard,
        mode: "study",
    };
}
