import {useEffect, useMemo, useState} from "react";
import SessionHeader from "./components/SessionHeader";
import StudyStage from "./components/StudyStage";
import type {Card, DeckFile, SessionAnswer} from "./types/deck";
import {
    loadDeckFromStorage,
    parseDeck,
    saveDeck,
    starterDeck,
} from "./utils/deck";
import {
    getDefaultReviewState,
    getReviewResultFromAnswer,
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
                    <SessionHeader
                        totalCards={deck.cards.length}
                        newCardsLeft={studyCounts.newCardsLeft}
                        reviewCardsLeft={studyCounts.reviewCardsLeft}
                        status={status}
                        onReset={resetProgress}
                    />

                    <StudyStage
                        currentCard={currentCard}
                        revealed={revealed}
                        onToggleReveal={() => setRevealed((prev) => !prev)}
                        sessionAnswer={sessionAnswer}
                        onToggleAnswer={updateAnswer}
                        showScores={showScores}
                        onToggleScores={() => setShowScores((prev) => !prev)}
                        onNext={handleNext}
                        studyMode={studyMode}
                        currentState={currentState}
                    />
                </div>
            </div>
        </div>
    );
}
