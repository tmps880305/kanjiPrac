import Stat from "./Stat";

type SessionHeaderProps = {
    totalCards: number;
    newCardsLeft: number;
    reviewCardsLeft: number;
    status: string;
    onReset: () => void;
};

export default function SessionHeader({
    totalCards,
    newCardsLeft,
    reviewCardsLeft,
    status,
    onReset,
}: SessionHeaderProps) {
    return (
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
                        onClick={onReset}
                        className="ml-auto rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                    >
                        リセット
                    </button>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Cards" value={String(totalCards)}/>
                <Stat label="New Left" value={String(newCardsLeft)}/>
                <Stat label="Review Due" value={String(reviewCardsLeft)}/>
                <Stat label="Status" value={status}/>
            </div>
        </header>
    );
}
