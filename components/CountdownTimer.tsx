import React from "react";
import { TimerState } from "@/types/order";
import { Clock, AlertTriangle, ShieldCheck } from "lucide-react";

interface CountdownTimerProps {
  timerState: TimerState;
  onRefreshStatus?: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  timerState,
  onRefreshStatus,
}) => {
  const { stage, formattedTime, title, subtitle, isOverdue, progressPercent } = timerState;

  if (stage === "DECIDED" || stage === "NOT_STARTED") {
    return null;
  }

  const isStage1 = stage === "STAGE_1";
  const isStage2 = stage === "STAGE_2";

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 sm:space-y-4">
      {/* Header status badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {isOverdue ? (
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 animate-pulse-subtle shrink-0" />
          ) : (
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 animate-pulse-subtle shrink-0" />
          )}
          <span className="text-[10px] sm:text-xs font-semibold tracking-wider uppercase text-slate-500">
            {isStage1
              ? "Verification Stage 1 of 2"
              : isStage2
              ? "Extended Verification Stage 2 of 2"
              : "Manual Verification Pending"}
          </span>
        </div>

        <span
          className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium shrink-0 ${
            isOverdue
              ? "bg-amber-100 text-amber-800"
              : isStage2
              ? "bg-purple-100 text-purple-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {isOverdue ? "Extended Wait" : "In Review"}
        </span>
      </div>

      {/* Main Countdown Display */}
      <div className="text-center py-1 sm:py-2">
        <div className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-slate-900">
          {formattedTime}
        </div>
        <h3 className="mt-1.5 sm:mt-2 text-sm sm:text-base font-bold text-slate-800">{title}</h3>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* Progress Bar */}
      {!isOverdue && (
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              isStage2 ? "bg-purple-600" : "bg-blue-600"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Overdue Special Notice */}
      {isOverdue && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
          <p className="font-semibold">⚠️ Do not pay again</p>
          <p>
            Your payment is awaiting manual merchant confirmation. If money was deducted,
            your order will be automatically approved as soon as the merchant confirms incoming bank credit.
          </p>
          {onRefreshStatus && (
            <button
              onClick={onRefreshStatus}
              className="mt-2 inline-flex items-center text-xs font-medium text-amber-900 underline hover:text-amber-700"
            >
              Check payment status now
            </button>
          )}
        </div>
      )}

      {/* Reassurance note */}
      <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>Live status automatically updates upon merchant bank verification</span>
      </div>
    </div>
  );
};
