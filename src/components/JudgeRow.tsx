type JudgeRowProps = {
    title: string;
    value?: boolean;
    onSelect: (value: boolean) => void;
};

export default function JudgeRow({
                                     title,
                                     value,
                                     onSelect,
                                 }: JudgeRowProps) {
    return (
        <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-sm font-medium text-slate-700">{title}</div>

            <div className="mt-3 flex gap-3">
                <button
                    onClick={() => onSelect(true)}
                    className={`flex-1 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                        value === true
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 hover:bg-slate-200"
                    }`}
                >
                    O
                </button>

                <button
                    onClick={() => onSelect(false)}
                    className={`flex-1 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                        value === false
                            ? "bg-rose-600 text-white"
                            : "bg-slate-100 hover:bg-slate-200"
                    }`}
                >
                    X
                </button>
            </div>
        </div>
    );
}
