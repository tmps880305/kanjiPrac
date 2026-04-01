import type { Card, DeckFile } from "../types/deck";

export const STORAGE_DECK_KEY = "kanji-app.deck";

export const starterDeck: DeckFile = {
    meta: { name: "starter" },
    cards: [
        {
            id: "v0001",
            entry_type: "vocab",
            word: "必要",
            reading: "ひつよう",
            meaning: "necessary",
            jlpt_level_source: "N4-N2",
        },
        {
            id: "v0002",
            entry_type: "vocab",
            word: "確認",
            reading: "かくにん",
            meaning: "confirm; confirmation",
            jlpt_level_source: "N3-N1",
        },
        {
            id: "v0003",
            entry_type: "vocab",
            word: "状況",
            reading: "じょうきょう",
            meaning: "situation; condition",
            jlpt_level_source: "N2-N1",
        },
        {
            id: "k0001",
            entry_type: "kanji",
            word: "必",
            reading_on: "ヒツ",
            reading_kun: "かならず",
            meaning: "certain; inevitable; must",
        },
    ],
};

export function parseDeck(raw: unknown): DeckFile | null {
    if (!raw || typeof raw !== "object") return null;

    const maybeDeck = raw as Partial<DeckFile>;
    if (!Array.isArray(maybeDeck.cards)) return null;

    const cards = maybeDeck.cards.filter(
        (card): card is Card =>
            !!card &&
            typeof card === "object" &&
            typeof (card as Card).id === "string" &&
            typeof (card as Card).word === "string"
    );

    if (!cards.length) return null;

    return {
        meta: maybeDeck.meta ?? {},
        cards,
    };
}

export function loadDeckFromStorage(): DeckFile {
    try {
        const raw = localStorage.getItem(STORAGE_DECK_KEY);
        if (!raw) return starterDeck;

        const parsed = parseDeck(JSON.parse(raw));
        return parsed ?? starterDeck;
    } catch {
        return starterDeck;
    }
}

export function saveDeck(deck: DeckFile) {
    localStorage.setItem(STORAGE_DECK_KEY, JSON.stringify(deck));
}

export function getDisplayReading(card: Card): string {
    if (card.reading?.trim()) return card.reading.trim();

    const parts = [card.reading_on, card.reading_kun].filter(Boolean);
    return parts.join(" / ") || "—";
}

export function getDisplayMeaning(card: Card): string {
    return card.meaning?.trim() || "—";
}
