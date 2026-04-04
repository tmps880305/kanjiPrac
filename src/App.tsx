import {useEffect, useMemo, useState} from "react";
import ProgressCard from "./components/ProgressCard";
import Stat from "./components/Stat";
import type {Card, DeckFile, ProgressMap, SessionAnswer} from "./types/deck";
import {
    getDisplayMeaning,
    getDisplayReading,
    loadDeckFromStorage,
    parseDeck,
    saveDeck,
    starterDeck,
} from "./utils/deck";
import {
    applyAnswer,
    getDefaultReviewState,
    getMeaningAccuracy,
    getReadingAccuracy,
    getWeightedAccuracy,
    isCardMastered,
    loadCurrentIndex,
    loadProgress,
    saveCurrentIndex,
    saveProgress,
    STORAGE_PROGRESS_KEY,
} from "./utils/progress";
import {
    applyStudyOrder,
    clearStudyOrder,
    createStudyOrder,
    getNextCard,
    getStudyCounts,
    loadStudyOrder,
    REVIEW_INTERVAL_NEW_CARDS,
    saveStudyOrder,
} from "./utils/queue";

export default function App() {
    const [deck, setDeck] = useState<DeckFile>(starterDeck);
    const [progress, setProgress] = useState<ProgressMap>({});
    const [studyOrder, setStudyOrder] = useState<string[]>([]);
    const [currentCard, setCurrentCard] = useState<Card | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [newCardsSinceReview, setNewCardsSinceReview] = useState(0);
    const [studyMode, setStudyMode] = useState<"new" | "review" | "done">("done");
    const [revealed, setRevealed] = useState(false);
    const [showScores, setShowScores] = useState(false);
    const [sessionAnswer, setSessionAnswer] = useState<SessionAnswer>({});
    const [status, setStatus] = useState("Ready");

    async function fetchDeckFromPublic(): Promise<DeckFile | null> {
        try {
            const res = await fetch("./deck.json");
            if (!res.ok) return null;

            const json = await res.json();
            return parseDeck(json);
        } catch {
            return null;
        }
    }

    useEffect(() => {
        // localStorage.removeItem("kanji-app.deck");
        // localStorage.removeItem("kanji-app.progress");
        // localStorage.removeItem("kanji-app.currentIndex");

        async function init() {
            const localDeck = loadDeckFromStorage();
            const storedProgress = loadProgress();
            const storedIndex = loadCurrentIndex();

            // 🔥 優先從 public 載入
            const publicDeck = await fetchDeckFromPublic();

            const finalDeck = publicDeck ?? localDeck;
            const nextStudyOrder = loadStudyOrder(finalDeck.cards);
            const orderedCards = applyStudyOrder(finalDeck.cards, nextStudyOrder);

            // 如果是 public deck，順便存到 localStorage（加速下次）
            if (publicDeck) {
                saveDeck(publicDeck);
            }

            const nextStep = getNextCard(orderedCards, storedProgress, storedIndex, 0);

            setDeck(finalDeck);
            setProgress(storedProgress);
            setStudyOrder(nextStudyOrder);
            setCurrentCard(nextStep.card);
            setCurrentIndex(nextStep.nextNewIndex);
            setNewCardsSinceReview(nextStep.nextNewCardsSinceReview);
            setStudyMode(nextStep.mode);
            setStatus(nextStep.mode === "done" ? "Session complete" : "Ready");
        }

        init();
    }, []);

    useEffect(() => {
        saveProgress(progress);
    }, [progress]);

    useEffect(() => {
        saveCurrentIndex(currentIndex);
    }, [currentIndex]);

    useEffect(() => {
        if (studyOrder.length) {
            saveStudyOrder(studyOrder);
        }
    }, [studyOrder]);

    const orderedCards = useMemo(
        () => applyStudyOrder(deck.cards, studyOrder),
        [deck.cards, studyOrder]
    );

    const currentState = useMemo(() => {
        if (!currentCard) return getDefaultReviewState();
        return progress[currentCard.id] ?? getDefaultReviewState();
    }, [currentCard, progress]);

    const studyCounts = useMemo(
        () => getStudyCounts(orderedCards, progress, currentIndex),
        [orderedCards, progress, currentIndex]
    );

    function scheduleNextCard(
        nextDeck: DeckFile,
        nextProgress: ProgressMap,
        nextNewIndex = currentIndex,
        nextSinceReview = newCardsSinceReview,
        nextStudyOrder = studyOrder
    ) {
        const nextOrderedCards = applyStudyOrder(nextDeck.cards, nextStudyOrder);
        const nextStep = getNextCard(
            nextOrderedCards,
            nextProgress,
            nextNewIndex,
            nextSinceReview
        );

        setCurrentCard(nextStep.card);
        setCurrentIndex(nextStep.nextNewIndex);
        setNewCardsSinceReview(nextStep.nextNewCardsSinceReview);
        setStudyMode(nextStep.mode);

        if (nextStep.mode === "done") {
            setStatus("All cards currently mastered");
        } else if (nextStep.mode === "review") {
            setStatus("Reviewing missed cards");
        } else {
            setStatus(`Learning new cards · Review every ${REVIEW_INTERVAL_NEW_CARDS} new words`);
        }
    }

    function updateAnswer(type: "reading" | "meaning", isCorrect: boolean) {
        setSessionAnswer((prev) => ({
            ...prev,
            [type]: prev[type] === isCorrect ? undefined : isCorrect,
        }));
    }

    function handleNext() {
        if (!currentCard) return;

        const baseState = progress[currentCard.id] ?? getDefaultReviewState();
        const nextState = applyAnswer(baseState, {
            reading: sessionAnswer.reading === true,
            meaning: sessionAnswer.meaning === true,
        });
        const nextProgress = {...progress, [currentCard.id]: nextState};

        setProgress(nextProgress);
        setRevealed(false);
        setSessionAnswer({});
        scheduleNextCard(deck, nextProgress);
    }

    function resetProgress() {
        setProgress({});
        localStorage.removeItem(STORAGE_PROGRESS_KEY);
        clearStudyOrder();
        const nextStudyOrder = createStudyOrder(deck.cards);
        setStudyOrder(nextStudyOrder);
        setRevealed(false);
        setSessionAnswer({});
        setStatus("Progress reset");
        scheduleNextCard(deck, {}, 0, 0, nextStudyOrder);
    }

    return (
        <div className="min-h-[100dvh] bg-slate-200 text-slate-900">
            <div
                className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col bg-slate-100 shadow-[0_0_0_1px_rgba(148,163,184,0.14)]">
                <div
                    className="sticky top-0 z-30 flex items-end border-b border-slate-200 bg-slate-950 px-5 pb-3 pt-3 text-white"
                    style={{paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)"}}
                >
                    <div className="flex w-full items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-300">
                            KanjiPrac
                        </span>
                    </div>
                </div>

                <div
                    className="flex-1 space-y-6 px-4 pb-6 pt-4 md:px-5"
                    style={{paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)"}}
                >
                    <header className="rounded-3xl bg-white shadow-sm p-5 md:p-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex flex-wrap gap-2">
                                <label
                                    className="inline-flex cursor-pointer items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
                                    設定
                                    <input
                                        type="file"
                                        accept="application/json"
                                        className="hidden"
                                    />
                                </label>

                                <button
                                    onClick={resetProgress}
                                    className="ml-auto rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                                >
                                    リセット
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                            <Stat label="Cards" value={String(deck.cards.length)}/>
                            <Stat label="New Left" value={String(studyCounts.newCardsLeft)}/>
                            <Stat label="Review Due" value={String(studyCounts.reviewCardsLeft)}/>
                            <Stat label="Status" value={status}/>
                        </div>
                    </header>

                    <section className="rounded-3xl bg-white shadow-sm p-4 md:p-6">
                        {!currentCard ? (
                            <div
                                className="rounded-3xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
                                No cards loaded.
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={() => setRevealed((prev) => !prev)}
                                    className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-6 py-10 md:py-16 text-center hover:bg-slate-100"
                                >
                                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                        {revealed ? "Back" : "Front"}
                                    </div>

                                    <div className="mt-6 text-5xl md:text-7xl font-semibold tracking-wide">
                                        {currentCard.word}
                                    </div>

                                    {revealed && (
                                        <div className="mt-8 space-y-3">
                                            <div>
                                                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                                    読み方
                                                </div>
                                                <div className="mt-1 text-2xl md:text-3xl font-medium">
                                                    {getDisplayReading(currentCard)}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                                    意味
                                                </div>
                                                <div className="mt-1 text-lg md:text-xl">
                                                    {getDisplayMeaning(currentCard)}
                                                </div>
                                            </div>

                                            {!!currentCard.jlpt_level_source && (
                                                <div className="text-sm text-slate-500">
                                                    Source: {currentCard.jlpt_level_source}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </button>

                                <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="rounded-2xl bg-white p-4">
                                            <div className="text-sm font-medium text-slate-700">読み方</div>
                                            <button
                                                onClick={() => updateAnswer("reading", true)}
                                                className={`mt-3 w-full rounded-2xl px-4 py-3 text-sm font-medium transition ${
                                                    sessionAnswer.reading === true
                                                        ? "bg-emerald-600 text-white"
                                                        : "bg-slate-100 hover:bg-slate-200"
                                                }`}
                                            >
                                                O
                                            </button>
                                        </div>

                                        <div className="rounded-2xl bg-white p-4">
                                            <div className="text-sm font-medium text-slate-700">意味</div>
                                            <button
                                                onClick={() => updateAnswer("meaning", true)}
                                                className={`mt-3 w-full rounded-2xl px-4 py-3 text-sm font-medium transition ${
                                                    sessionAnswer.meaning === true
                                                        ? "bg-emerald-600 text-white"
                                                        : "bg-slate-100 hover:bg-slate-200"
                                                }`}
                                            >
                                                O
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex items-center justify-between gap-3">
                                    <button
                                        onClick={() => setShowScores((prev) => !prev)}
                                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                        {showScores ? "スコア非表示" : "スコア表示"}
                                    </button>
                                    <button
                                        onClick={handleNext}
                                        className="w-32 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:opacity-90"
                                    >
                                        {studyMode === "review" ? "確認" : "次へ"}
                                    </button>
                                </div>

                                {showScores && (
                                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                                        <ProgressCard
                                            title="読み方スコア"
                                            score={currentState.readingScore}
                                            correct={currentState.readingCorrect}
                                            wrong={currentState.readingWrong}
                                            accuracy={getReadingAccuracy(currentState)}
                                            mastered={isCardMastered(currentState)}
                                        />
                                        <ProgressCard
                                            title="意味スコア"
                                            score={currentState.meaningScore}
                                            correct={currentState.meaningCorrect}
                                            wrong={currentState.meaningWrong}
                                            accuracy={getMeaningAccuracy(currentState)}
                                            mastered={getWeightedAccuracy(currentState) >= 0.85}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
