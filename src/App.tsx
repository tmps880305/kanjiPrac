import {useEffect, useMemo, useState} from "react";
import JudgeRow from "./components/JudgeRow";
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
    loadCurrentIndex,
    loadProgress,
    saveCurrentIndex,
    saveProgress,
    STORAGE_PROGRESS_KEY,
} from "./utils/progress";
import {buildWeightedQueue} from "./utils/queue";

export default function App() {
    const [deck, setDeck] = useState<DeckFile>(starterDeck);
    const [progress, setProgress] = useState<ProgressMap>({});
    const [queue, setQueue] = useState<Card[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [revealed, setRevealed] = useState(false);
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

            // 如果是 public deck，順便存到 localStorage（加速下次）
            if (publicDeck) {
                saveDeck(publicDeck);
            }

            const nextQueue = buildWeightedQueue(finalDeck.cards, storedProgress);

            setDeck(finalDeck);
            setProgress(storedProgress);
            setQueue(nextQueue);
            setCurrentIndex(nextQueue.length ? storedIndex % nextQueue.length : 0);
        }

        init();
    }, []);

    useEffect(() => {
        saveProgress(progress);
    }, [progress]);

    useEffect(() => {
        saveCurrentIndex(currentIndex);
    }, [currentIndex]);

    const currentCard = queue[currentIndex] ?? null;

    const currentState = useMemo(() => {
        if (!currentCard) return getDefaultReviewState();
        return progress[currentCard.id] ?? getDefaultReviewState();
    }, [currentCard, progress]);

    function rebuildQueue(nextDeck: DeckFile, nextProgress: ProgressMap) {
        const nextQueue = buildWeightedQueue(nextDeck.cards, nextProgress);
        setQueue(nextQueue);
        setCurrentIndex(0);
    }

    function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = () => {
            try {
                const parsed = parseDeck(JSON.parse(String(reader.result)));
                if (!parsed) {
                    setStatus("Invalid JSON format: expected { cards: [...] }");
                    return;
                }

                setDeck(parsed);
                saveDeck(parsed);
                rebuildQueue(parsed, progress);
                setRevealed(false);
                setSessionAnswer({});
                setStatus(`Imported ${parsed.cards.length} cards`);
            } catch {
                setStatus("Failed to parse JSON file");
            }
        };

        reader.readAsText(file, "utf-8");
    }

    function updateAnswer(type: "reading" | "meaning", isCorrect: boolean) {
        setSessionAnswer((prev) => ({...prev, [type]: isCorrect}));
    }

    function handleNext() {
        if (!currentCard) return;

        const baseState = progress[currentCard.id] ?? getDefaultReviewState();
        const nextState = applyAnswer(baseState, sessionAnswer);
        const nextProgress = {...progress, [currentCard.id]: nextState};

        setProgress(nextProgress);

        const isQueueEnding = (currentIndex + 1) % Math.max(queue.length, 1) === 0;

        if (isQueueEnding) {
            rebuildQueue(deck, nextProgress);
        } else {
            setCurrentIndex((prev) => (queue.length ? (prev + 1) % queue.length : 0));
        }

        setRevealed(false);
        setSessionAnswer({});
    }

    function resetProgress() {
        setProgress({});
        localStorage.removeItem(STORAGE_PROGRESS_KEY);
        rebuildQueue(deck, {});
        setRevealed(false);
        setSessionAnswer({});
        setStatus("Progress reset");
    }

    return (
        <div className="min-h-[100dvh] bg-slate-200 text-slate-900">
            <div className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col bg-slate-100 shadow-[0_0_0_1px_rgba(148,163,184,0.14)]">
                <div
                    className="sticky top-0 z-30 flex items-end border-b border-slate-200 bg-slate-950 px-5 pb-3 pt-3 text-white"
                    style={{paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)"}}
                >
                    <div className="flex w-full items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-300">
                            KanjiPrac
                        </span>
                        <span className="text-xs text-slate-400">iPhone Safe Area</span>
                    </div>
                </div>

                <div
                    className="flex-1 space-y-6 px-4 pb-6 pt-4 md:px-5"
                    style={{paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)"}}
                >
                <header className="rounded-3xl bg-white shadow-sm p-5 md:p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-semibold">
                                Kanji Reading MVP
                            </h1>
                            <p className="mt-2 text-sm text-slate-600">
                                Flip card + Reading O/X + Meaning O/X
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <label
                                className="inline-flex cursor-pointer items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
                                Import JSON
                                <input
                                    type="file"
                                    accept="application/json"
                                    className="hidden"
                                    onChange={handleImportFile}
                                />
                            </label>

                            <button
                                onClick={resetProgress}
                                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                            >
                                Reset Progress
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                        <Stat label="Cards" value={String(deck.cards.length)}/>
                        <Stat label="Queue" value={String(queue.length)}/>
                        <Stat label="Current" value={currentCard ? `${currentIndex + 1}` : "0"}/>
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
                                                Reading
                                            </div>
                                            <div className="mt-1 text-2xl md:text-3xl font-medium">
                                                {getDisplayReading(currentCard)}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                                Meaning
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

                            <div className="mt-6 grid gap-4 md:grid-cols-2">
                                <JudgeRow
                                    title="Reading"
                                    value={sessionAnswer.reading}
                                    onSelect={(value) => updateAnswer("reading", value)}
                                />
                                <JudgeRow
                                    title="Meaning"
                                    value={sessionAnswer.meaning}
                                    onSelect={(value) => updateAnswer("meaning", value)}
                                />
                            </div>

                            <div className="mt-6 grid gap-3 md:grid-cols-2">
                                <ProgressCard
                                    title="Reading Score"
                                    score={currentState.readingScore}
                                    correct={currentState.readingCorrect}
                                    wrong={currentState.readingWrong}
                                />
                                <ProgressCard
                                    title="Meaning Score"
                                    score={currentState.meaningScore}
                                    correct={currentState.meaningCorrect}
                                    wrong={currentState.meaningWrong}
                                />
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={handleNext}
                                    className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:opacity-90"
                                >
                                    Next Card
                                </button>
                            </div>
                        </>
                    )}
                </section>
                </div>
            </div>
        </div>
    );
}
