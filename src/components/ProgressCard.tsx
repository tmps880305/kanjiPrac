type ProgressCardProps = {
    title: string;
    score: number;
    correct: number;
    wrong: number;
};

export default function ProgressCard({
                                         title,
                                         score,
                                         correct,
                                         wrong,
                                     }: ProgressCardProps) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-sm font-medium text-slate-700">{title}</div>
            <div className="mt-2 text-2xl font-semibold">{score}</div>
            <div className="mt-2 text-sm text-slate-500">
                Correct {correct} · Wrong {wrong}
            </div>
        </div>
    );
}
