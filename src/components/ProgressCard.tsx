type ProgressCardProps = {
    title: string;
    score: number;
    status: string;
    accuracy: number;
    streak: number;
    retryTokens: number;
    reviewCount: number;
    mastered: boolean;
};

export default function ProgressCard({
    title,
    score,
    status,
    accuracy,
    streak,
    retryTokens,
    reviewCount,
    mastered,
}: ProgressCardProps) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-medium text-slate-700">{title}</div>
                <div
                    className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                        mastered
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                    }`}
                >
                    {mastered ? "Mastered" : "Learning"}
                </div>
            </div>
            <div className="mt-2 text-2xl font-semibold">{score}</div>
            <div className="mt-2 text-sm text-slate-500">
                Status {status}
            </div>
            <div className="mt-1 text-sm text-slate-500">
                Accuracy {Math.round(accuracy * 100)}% · Reviews {reviewCount}
            </div>
            <div className="mt-1 text-sm text-slate-500">
                Streak {streak} · Retry {retryTokens}
            </div>
        </div>
    );
}
