export type EntryType = "vocab" | "kanji";

export type Card = {
    id: string;
    entry_type?: EntryType;
    word: string;
    reading?: string;
    meaning?: string;
    reading_on?: string;
    reading_kun?: string;
    jlpt_level_source?: string;
};

export type DeckFile = {
    meta?: Record<string, unknown>;
    cards: Card[];
};

export type SessionAnswer = {
    reading?: boolean;
    meaning?: boolean;
};
