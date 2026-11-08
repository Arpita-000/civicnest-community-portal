import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-black text-slate-900 dark:text-white font-display">
        404 - Zone Not Found
      </h1>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm mb-6">
        The municipal report, page, or service you are trying to reach has moved or does not exist.
      </p>
      <Link href="/" className="btn-premium flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" />
        Return to Portal Home
      </Link>
    </div>
  );
}

