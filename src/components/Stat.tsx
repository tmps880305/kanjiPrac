type StatProps = {
    label: string;
    value: string;
};

export default function Stat({ label, value }: StatProps) {
    return (
        <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs uppercase tracking-[0.15em] text-slate-500">
                {label}
            </div>
            <div className="mt-1 break-all text-sm font-medium text-slate-900">
                {value}
            </div>
        </div>
    );
}
