type JudgeRowProps = {
    title: string;
    value?: boolean;
    onSelect: () => void;
};

export default function JudgeRow({
    title,
    value,
    onSelect,
}: JudgeRowProps) {
    return (
        <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-sm font-medium text-slate-700">{title}</div>

            <div className="mt-3">
                <button
                    onClick={onSelect}
                    className={`w-full rounded-2xl px-4 py-3 text-sm font-medium transition ${
                        value === true
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 hover:bg-slate-200"
                    }`}
                >
                    O
                </button>
            </div>
        </div>
    );
}
