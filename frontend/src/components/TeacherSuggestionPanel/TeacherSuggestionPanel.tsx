import { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';

export interface SuggestionSummary {
  help: number;
  confused: number;
  slower: number;
}

interface TeacherSuggestionPanelProps {
  summary: SuggestionSummary;
  /** Total number of visible (non-dismissed) help requests */
  requestCount: number;
  /** Number of requests not yet seen by the teacher */
  unseenCount: number;
  classSessionId?: string;
}

function getSuggestion(summary: SuggestionSummary): string {
  const { help, confused, slower } = summary;
  const total = help + confused + slower;
  if (total === 0) return 'No active help signals right now.';
  return `You have ${help} help, ${confused} confused, ${slower} slower — try slowing down.`;
}

export function TeacherSuggestionPanel({
  summary,
  requestCount,
  unseenCount,
}: TeacherSuggestionPanelProps) {
  const [dismissed, setDismissed] = useState(false);

  const showPanel = requestCount >= 1 && !dismissed;

  const suggestion = getSuggestion(summary);

  const handleDismiss = () => {
    setDismissed(true);
  };

  if (!showPanel) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900">
            Classroom signals
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {summary.help} help · {summary.confused} confused · {summary.slower} slower
            {unseenCount > 0 && ` · ${unseenCount} unseen`}
          </p>
          <p className="mt-1 text-sm text-slate-600">{suggestion}</p>
          <button
            type="button"
            onClick={handleDismiss}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Got it
          </button>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
