import type { Card, SessionAnswer } from "../types/deck";
import { getDisplayMeaning, getDisplayReading } from "../utils/deck";
import { getCardAccuracy, isCardMastered } from "../utils/progress";
import type { CardProgress } from "../utils/srs";
import JudgeRow from "./JudgeRow";
import ProgressCard from "./ProgressCard";

type StudyStageProps = {
    currentCard: Card | null;
    revealed: boolean;
    onToggleReveal: () => void;
    sessionAnswer: SessionAnswer;
    onToggleAnswer: (type: "reading" | "meaning") => void;
    showScores: boolean;
    onToggleScores: () => void;
    onNext: () => void;
    studyMode: "study" | "done";
    currentState: CardProgress;
};

export default function StudyStage({
    currentCard,
    revealed,
    onToggleReveal,
    sessionAnswer,
    onToggleAnswer,
    showScores,
    onToggleScores,
    onNext,
    studyMode,
    currentState,
}: StudyStageProps) {
    return (
        <section className="rounded-3xl bg-white shadow-sm p-4 md:p-6">
            {!currentCard ? (
                <div
                    className="rounded-3xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
                    No cards loaded.
                </div>
            ) : (
                <>
                    <button
                        onClick={onToggleReveal}
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
                                onSelect={() => onToggleAnswer("reading")}
                            />
                            <JudgeRow
                                title="意味"
                                value={sessionAnswer.meaning}
                                onSelect={() => onToggleAnswer("meaning")}
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-3">
                        <button
                            onClick={onToggleScores}
                            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            {showScores ? "スコア非表示" : "スコア表示"}
                        </button>
                        <button
                            onClick={onNext}
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
    );
}
