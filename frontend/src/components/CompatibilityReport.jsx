import { Check, Info, X } from "lucide-react";
import { formatPrice } from "../utils.js";

export default function CompatibilityReport({ report, loading = false }) {
    if (!report) return <p className="hint">Add parts to see the compatibility check.</p>;

    const errors = report.issues.filter((i) => i.severity === "error");
    const tone = errors.length > 0 ? "bad" : report.complete ? "ok" : "warn";
    const title =
        errors.length > 0
            ? `${errors.length} compatibility ${errors.length === 1 ? "problem" : "problems"}`
            : report.complete
              ? "All parts are compatible"
              : "No conflicts so far";

    const { estimatedWatts, recommendedPsuW, psuWattage, totalPriceCents } = report.summary;
    const load = estimatedWatts && psuWattage ? Math.min(100, Math.round((estimatedWatts / psuWattage) * 100)) : null;

    return (
        <div className={`report ${loading ? "is-loading" : ""}`} aria-live="polite">
            <div className={`banner banner-${tone === "bad" ? "bad" : tone === "ok" ? "ok" : "warn"}`}>
                {tone === "ok" ? <Check size={18} /> : tone === "bad" ? <X size={18} /> : <Info size={18} />}
                <strong>{title}</strong>
            </div>

            {report.issues.length > 0 && (
                <ul className="issue-list">
                    {report.issues.map((issue, index) => (
                        <li key={`${issue.code}-${index}`} className={`issue issue-${issue.severity}`}>
                            {issue.severity === "error" ? <X size={16} /> : <Info size={16} />}
                            <span>{issue.message}</span>
                        </li>
                    ))}
                </ul>
            )}

            {estimatedWatts !== null && (
                <div className="power">
                    <div className="power-row">
                        <span>Estimated draw</span>
                        <strong>{estimatedWatts} W</strong>
                    </div>
                    <div className="power-row">
                        <span>Recommended power supply</span>
                        <strong>{recommendedPsuW} W or more</strong>
                    </div>
                    {load !== null && (
                        <>
                            <div className="power-bar" role="img" aria-label={`Estimated draw is ${load}% of the power supply`}>
                                <span className={load > 70 ? "is-high" : ""} style={{ width: `${load}%` }} />
                            </div>
                            <small className="hint">Your power supply: {psuWattage} W ({load}% used)</small>
                        </>
                    )}
                </div>
            )}

            <div className="power-row total-row">
                <span>Build total</span>
                <strong className="price">{formatPrice(totalPriceCents)}</strong>
            </div>
        </div>
    );
}