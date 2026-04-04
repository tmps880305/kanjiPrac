import {useEffect, useMemo, useState} from "react";
import JudgeRow from "./components/JudgeRow";
import ProgressCard from "./components/ProgressCard";
import Stat from "./components/Stat";
import type {Card, DeckFile, SessionAnswer} from "./types/deck";
import {
    getDisplayMeaning,
    getDisplayReading,
    loadDeckFromStorage,
    parseDeck,
    saveDeck,
    starterDeck,
} from "./utils/deck";
import {
    getCardAccuracy,
    getDefaultReviewState,
    getReviewResultFromAnswer,
    isCardMastered,
    loadProgress,
    saveProgress,
    STORAGE_PROGRESS_KEY,
} from "./utils/progress";
import {
    appendRecentCardId,
    applyStudyOrder,
    clearStudyOrder,
    createStudyOrder,
    getCardQueueType,
    getNextCard,
    getStudyCounts,
    loadStudyOrder,
    saveStudyOrder,
    shouldPreferNewCards,
    type ProgressMap,
    updateProgressMap,
} from "./utils/srs";

export default function App() {
    const [deck, setDeck] = useState<DeckFile>(starterDeck);
    const [progress, setProgress] = useState<ProgressMap>({});
    const [studyOrder, setStudyOrder] = useState<string[]>([]);
    const [recentCardIds, setRecentCardIds] = useState<string[]>([]);
    const [queueHistory, setQueueHistory] = useState<Array<"new" | "retry" | "normal">>([]);
    const [currentCard, setCurrentCard] = useState<Card | null>(null);
    const [studyMode, setStudyMode] = useState<"study" | "done">("done");
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

        async function init() {
            const localDeck = loadDeckFromStorage();
            const storedProgress = loadProgress();

            // 🔥 優先從 public 載入
            const publicDeck = await fetchDeckFromPublic();

            const finalDeck = publicDeck ?? localDeck;
            const nextStudyOrder = loadStudyOrder(finalDeck.cards);
            const orderedCards = applyStudyOrder(finalDeck.cards, nextStudyOrder);

            // 如果是 public deck，順便存到 localStorage（加速下次）
            if (publicDeck) {
                saveDeck(publicDeck);
            }

            const nextStep = getNextCard(orderedCards, storedProgress, {
                preferNewCards: shouldPreferNewCards([]),
            });

            setDeck(finalDeck);
            setProgress(storedProgress);
            setStudyOrder(nextStudyOrder);
            setRecentCardIds(nextStep.card ? [nextStep.card.id] : []);
            setQueueHistory(
                nextStep.card ? [getCardQueueType(nextStep.card.id, storedProgress)] : []
            );
            setCurrentCard(nextStep.card);
            setStudyMode(nextStep.mode);
            setStatus(nextStep.mode === "done" ? "Session complete" : "Ready");
        }

        init();
    }, []);

    useEffect(() => {
        saveProgress(progress);
    }, [progress]);

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
        () => getStudyCounts(orderedCards, progress),
        [orderedCards, progress]
    );

    function scheduleNextCard(
        nextDeck: DeckFile,
        nextProgress: ProgressMap,
        nextStudyOrder = studyOrder,
        nextRecentCardIds = recentCardIds,
        nextQueueHistory = queueHistory
    ) {
        const nextOrderedCards = applyStudyOrder(nextDeck.cards, nextStudyOrder);
        const preferNewCards = shouldPreferNewCards(nextQueueHistory);
        const nextStep = getNextCard(nextOrderedCards, nextProgress, {
            recentCardIds: nextRecentCardIds,
            preferNewCards,
        });

        setCurrentCard(nextStep.card);
        setStudyMode(nextStep.mode);
        setRecentCardIds(nextStep.card ? appendRecentCardId(nextRecentCardIds, nextStep.card.id) : []);
        setQueueHistory(
            nextStep.card
                ? [...nextQueueHistory, getCardQueueType(nextStep.card.id, nextProgress)].slice(-3)
                : nextQueueHistory
        );

        if (nextStep.mode === "done") {
            setStatus("No cards available");
        } else {
            setStatus("Studying");
        }
    }

    function updateAnswer(type: "reading" | "meaning") {
        setSessionAnswer((prev) => ({
            ...prev,
            [type]: prev[type] === true ? undefined : true,
        }));
    }

    function handleNext() {
        if (!currentCard) return;

        const reviewResult = getReviewResultFromAnswer(sessionAnswer);
        const nextProgress = updateProgressMap(progress, currentCard.id, reviewResult);
        const nextRecentCardIds = appendRecentCardId(recentCardIds, currentCard.id);

        setProgress(nextProgress);
        setRevealed(false);
        setSessionAnswer({});
        scheduleNextCard(deck, nextProgress, studyOrder, nextRecentCardIds, queueHistory);
    }

    function resetProgress() {
        setProgress({});
        localStorage.removeItem(STORAGE_PROGRESS_KEY);
        clearStudyOrder();
        const nextStudyOrder = createStudyOrder(deck.cards);
        setStudyOrder(nextStudyOrder);
        setRecentCardIds([]);
        setQueueHistory([]);
        setRevealed(false);
        setSessionAnswer({});
        setStatus("Progress reset");
        scheduleNextCard(deck, {}, nextStudyOrder);
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
                                        <JudgeRow
                                            title="読み方"
                                            value={sessionAnswer.reading}
                                            onSelect={() => updateAnswer("reading")}
                                        />
                                        <JudgeRow
                                            title="意味"
                                            value={sessionAnswer.meaning}
                                            onSelect={() => updateAnswer("meaning")}
                                        />
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
                                        {studyMode === "done" ? "完了" : "次へ"}
                                    </button>
                                </div>

                                {showScores && (
                                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                                        <ProgressCard
                                            title="Card Progress"
                                            score={currentState.score}
                                            status={currentState.status}
                                            accuracy={getCardAccuracy(currentState)}
                                            streak={currentState.streak}
                                            retryTokens={currentState.retryTokens}
                                            reviewCount={currentState.reviewCount}
                                            mastered={isCardMastered(currentState)}
                                        />
                                        <ProgressCard
                                            title="Queue Signals"
                                            score={currentState.recentWrongCount}
                                            status={currentState.lastResult ?? "unseen"}
                                            accuracy={getCardAccuracy(currentState)}
                                            streak={currentState.streak}
                                            retryTokens={currentState.retryTokens}
                                            reviewCount={currentState.reviewCount}
                                            mastered={currentState.retryTokens === 0}
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
