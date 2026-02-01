import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  HelpCircle,
  AlertCircle,
  Turtle,
  RefreshCw,
  Eye,
  X,
  ArrowLeft,
  MessageSquare,
} from 'lucide-react';
import { useClassSession } from '@/context/ClassSessionContext';
import { getHelpRequests, updateHelpRequest, type HelpRequestItem, type HelpRequestType } from '@/services/api';

const POLL_INTERVAL_MS = 8000;
const DEFAULT_SESSION_OPTIONS = [
  'Period 2 – Math',
  'Period 3 – Science',
  'Period 4 – English',
  'Period 5 – History',
];

function sessionOptions(current: string): string[] {
  const combined = current
    ? [current, ...DEFAULT_SESSION_OPTIONS.filter((s) => s !== current)]
    : DEFAULT_SESSION_OPTIONS;
  return [...new Set(combined)];
}

const typeConfig: Record<
  HelpRequestType,
  { icon: typeof HelpCircle; label: string; color: string }
> = {
  help: {
    icon: AlertCircle,
    label: 'I need help',
    color: 'bg-rose-100 text-rose-700 border-rose-200',
  },
  confused: {
    icon: HelpCircle,
    label: "I'm confused",
    color: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  slower: {
    icon: Turtle,
    label: 'Please be slower',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
};

function relativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString();
}

export default function TeacherDashboard() {
  const { classSessionId, setClassSession } = useClassSession();
  const [requests, setRequests] = useState<HelpRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!classSessionId) return;
    setError(null);
    try {
      const list = await getHelpRequests(classSessionId);
      setRequests(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load help requests';
      setError(msg);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [classSessionId]);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  const handleSeen = async (id: string) => {
    setUpdatingId(id);
    try {
      await updateHelpRequest(id, { seen: true });
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, seenAt: new Date().toISOString() } : r
        )
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDismiss = async (id: string) => {
    setUpdatingId(id);
    try {
      await updateHelpRequest(id, { dismissed: true });
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setUpdatingId(null);
    }
  };

  const summary = {
    help: requests.filter((r) => r.type === 'help').length,
    confused: requests.filter((r) => r.type === 'confused').length,
    slower: requests.filter((r) => r.type === 'slower').length,
  };
  const total = summary.help + summary.confused + summary.slower;
  const unseenCount = requests.filter((r) => !r.seenAt).length;

  function getSuggestion(): string {
    if (total === 0) return '';
    const parts: string[] = [];
    if (summary.help) parts.push(`${summary.help} said help`);
    if (summary.confused) parts.push(`${summary.confused} confused`);
    if (summary.slower) parts.push(`${summary.slower} asked to slow down`);
    const line = parts.join(', ');
    if (summary.slower > 0 || total >= 3) {
      return `${line}. Consider talking a bit slower or pausing to check in.`;
    }
    return `${line}. You might want to check in with the class.`;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="text-sm font-medium">Back to app</span>
              </Link>
              <h1 className="text-xl font-semibold text-slate-900">
                Classroom help requests
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="session-select" className="text-sm text-slate-600">
                Session
              </label>
              <select
                id="session-select"
                value={classSessionId}
                onChange={(e) => setClassSession({ classSessionId: e.target.value })}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              >
                {sessionOptions(classSessionId).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  fetchRequests();
                }}
                disabled={!classSessionId || loading}
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                title="Refresh help requests"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {error && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error.includes('Backend not running') ? (
              <>
                <p className="font-medium">Backend not running</p>
                <p className="mt-1 text-amber-700">Start it in a terminal: <code className="rounded bg-amber-100 px-1.5 py-0.5">cd backend && npm run dev</code> (port 3001)</p>
              </>
            ) : (
              error
            )}
          </div>
        )}

        {requests.length > 0 && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-slate-900">
                  {total} {total === 1 ? 'student' : 'students'} need attention
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {summary.help} help · {summary.confused} confused · {summary.slower} slower
                  {unseenCount > 0 && (
                    <span className="font-medium text-amber-600"> · {unseenCount} new</span>
                  )}
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  {getSuggestion()}
                </p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <HelpCircle className="mx-auto h-12 w-12 text-slate-300" />
            <h2 className="mt-4 text-lg font-medium text-slate-700">
              No help requests yet
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              When students tap Quick help, they&apos;ll show up here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {requests.map((r) => {
              const config = typeConfig[r.type];
              const Icon = config.icon;
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <span
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium ${config.color}`}
                  >
                    <Icon className="h-4 w-4" />
                    {config.label}
                  </span>
                  <span className="text-sm text-slate-500">
                    {relativeTime(r.createdAt)}
                  </span>
                  <span className="text-sm font-medium text-slate-700">
                    {r.studentDisplayName}
                  </span>
                  <div className="ml-auto flex gap-2">
                    {!r.seenAt && (
                      <button
                        type="button"
                        disabled={updatingId === r.id}
                        onClick={() => handleSeen(r.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Seen
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={updatingId === r.id}
                      onClick={() => handleDismiss(r.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Dismiss
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
