import { useEffect, useState } from "react";

type HealthData = {
    api: string;
    esp32: string;
    browser_ws: boolean;
    pi_ws: boolean;
    ai_ws: boolean;
};

type LogItem = {
    time: string;
    type: string;
    source: string;
    message: string;
};

const LOG_TYPE_COLOR: Record<string, string> = {
    INFO: "text-sky-400",
    ERROR: "text-rose-400",
    WARN: "text-amber-400",
    DEBUG: "text-violet-400",
};

export default function HealthCheck() {
    const [health, setHealth] = useState<HealthData | null>(null);
    const [logs, setLogs] = useState<LogItem[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [healthRes, logsRes] = await Promise.all([
                    fetch("https://project-final-gg.onrender.com/health"),
                    fetch("https://project-final-gg.onrender.com/logs"),
                ]);
                setHealth(await healthRes.json());
                setLogs(await logsRes.json());
                setLastUpdated(new Date());
            } catch (err) {
                console.error(err);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 2000);
        return () => clearInterval(interval);
    }, []);

    const isOnline = (status: boolean | string) =>
        status === true || status === "online";

    const statusItems = [
        { label: "API", value: health?.api || "offline" },
        { label: "ESP32", value: health?.esp32 || "offline" },
        { label: "Browser WS", value: health?.browser_ws ?? false },
        { label: "Pi WS", value: health?.pi_ws ?? false },
        { label: "AI WS", value: health?.ai_ws ?? false },
    ];

    const onlineCount = statusItems.filter((s) => isOnline(s.value)).length;
    const total = statusItems.length;
    const allGreen = onlineCount === total;
    const allDown = onlineCount === 0;

    const summaryLabel = allGreen
        ? "All systems operational"
        : allDown
        ? "All systems offline"
        : `${total - onlineCount} system${total - onlineCount > 1 ? "s" : ""} down`;

    const summaryDot = allGreen
        ? "bg-emerald-400"
        : allDown
        ? "bg-rose-400"
        : "bg-amber-400";

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono">
            <div className="max-w-6xl mx-auto px-6 py-10">
                {/* Header */}
                <header className="flex items-end justify-between mb-10 pb-6 border-b border-zinc-800">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
                            Robot Health
                        </h1>
                        <p className="text-sm text-zinc-500 mt-1">
                            {lastUpdated
                                ? `Updated ${lastUpdated.toLocaleTimeString()}`
                                : "Connecting…"}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span
                            className={`w-2 h-2 rounded-full ${summaryDot} ${
                                !allDown ? "animate-pulse" : ""
                            }`}
                        />
                        <span className="text-zinc-400">{summaryLabel}</span>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Status */}
                    <section className="lg:col-span-1">
                        <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
                            Services
                        </h2>
                        <div className="border border-zinc-800 rounded-lg divide-y divide-zinc-800">
                            {statusItems.map(({ label, value }) => {
                                const online = isOnline(value);
                                return (
                                    <div
                                        key={label}
                                        className="flex items-center justify-between px-4 py-3"
                                    >
                                        <span className="text-sm text-zinc-300">
                                            {label}
                                        </span>
                                        <span className="flex items-center gap-2 text-xs">
                                            <span
                                                className={`w-1.5 h-1.5 rounded-full ${
                                                    online
                                                        ? "bg-emerald-400"
                                                        : "bg-rose-400"
                                                }`}
                                            />
                                            <span
                                                className={
                                                    online
                                                        ? "text-emerald-400"
                                                        : "text-rose-400"
                                                }
                                            >
                                                {online ? "online" : "offline"}
                                            </span>
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-xs text-zinc-600 mt-3">
                            {onlineCount} of {total} online · refreshing every 2s
                        </p>
                    </section>

                    {/* Logs */}
                    <section className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-xs uppercase tracking-wider text-zinc-500">
                                Logs
                            </h2>
                            <span className="text-xs text-zinc-600">
                                {logs.length} entries
                            </span>
                        </div>
                        <div className="border border-zinc-800 rounded-lg max-h-[560px] overflow-y-auto">
                            {logs.length === 0 ? (
                                <div className="text-center py-16 text-sm text-zinc-600">
                                    No logs yet
                                </div>
                            ) : (
                                <ul className="divide-y divide-zinc-800/60">
                                    {logs
                                        .slice()
                                        .reverse()
                                        .map((log, i) => (
                                            <li
                                                key={i}
                                                className="flex items-baseline gap-3 px-4 py-2 text-xs hover:bg-zinc-900/50 transition-colors"
                                            >
                                                <span className="text-zinc-600 tabular-nums shrink-0">
                                                    {log.time}
                                                </span>
                                                <span
                                                    className={`shrink-0 w-12 font-semibold ${
                                                        LOG_TYPE_COLOR[log.type] ??
                                                        "text-zinc-400"
                                                    }`}
                                                >
                                                    {log.type}
                                                </span>
                                                <span className="text-zinc-500 shrink-0">
                                                    {log.source}
                                                </span>
                                                <span className="text-zinc-300 break-all">
                                                    {log.message}
                                                </span>
                                            </li>
                                        ))}
                                </ul>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}