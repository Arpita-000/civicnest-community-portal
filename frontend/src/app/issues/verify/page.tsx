'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api, { errMsg } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { ShieldCheck, CheckCircle2, MapPin, ArrowLeft, ExternalLink, Clock, AlertCircle } from 'lucide-react';

export default function VerifyIssuesPage() {
  const { user } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const loadIssues = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/issues', { params: { limit: 50 } });
      const payload = res?.data ?? res;
      const all = Array.isArray(payload) ? payload : payload?.issues || [];
      // Filter for issues that have resolution proofs or are pending verification / resolved
      const verifiable = all.filter(
        (i: any) =>
          i.status === 'pending_verification' ||
          i.status === 'action_taken' ||
          (Array.isArray(i.resolutionProofs) && i.resolutionProofs.length > 0)
      );
      setIssues(verifiable.length > 0 ? verifiable : all.slice(0, 12));
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, []);

  const handleVerify = async (issueId: string) => {
    if (!user) {
      toast.error('Please sign in to verify community resolutions');
      return;
    }
    setVerifyingId(issueId);
    try {
      const res: any = await api.post(`/issues/${issueId}/verify`, {});
      const data = res?.data ?? res;
      toast.success(
        data?.status === 'solved'
          ? 'Issue officially verified as Resolved! +10 Civic Points'
          : `Verification recorded (${data?.verificationCount || 1}/3 needed)! +10 Civic Points`
      );
      loadIssues();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f5] pt-28 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#0f5c4d] hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="bg-gradient-to-br from-[#062e26] via-[#0b463a] to-[#0f5c4d] rounded-3xl p-8 md:p-10 text-white shadow-xl mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-emerald-300 text-xs font-extrabold uppercase tracking-wider mb-4">
            <ShieldCheck className="w-4 h-4" /> Peer Verification Protocol
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
            Community Fix Verification
          </h1>
          <p className="text-emerald-100/85 max-w-2xl text-sm md:text-base leading-relaxed">
            Help keep CivicNest transparent and accurate. Inspect submitted resolution proofs or on-site fixes. When 3 neighbours verify a fix, the issue is automatically marked Resolved and contributors earn Civic Points.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-white rounded-2xl p-6 h-80 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : issues.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
            <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-500 mb-6">There are no pending fixes waiting for verification right now.</p>
            <Link
              href="/issues"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0f5c4d] text-white font-bold text-sm hover:bg-[#0b463a] transition"
            >
              Browse All Issues
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {issues.map((issue) => {
              const verifiedBy: string[] = Array.isArray(issue.verifiedBy) ? issue.verifiedBy : [];
              const alreadyVerified = user?.email ? verifiedBy.includes(user.email) : false;
              const proof = Array.isArray(issue.resolutionProofs) && issue.resolutionProofs.length > 0
                ? issue.resolutionProofs[issue.resolutionProofs.length - 1]
                : null;

              return (
                <div
                  key={issue._id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col"
                >
                  <div className="relative h-48 bg-gray-100">
                    <img
                      src={proof?.image || issue.image || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80'}
                      alt={issue.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.includes("1542601906990")) {
                          target.src = "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80";
                        }
                      }}
                    />
                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold bg-black/70 text-white backdrop-blur-sm">
                      {issue.category || 'Civic Issue'}
                    </span>
                    <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-600 text-white shadow">
                      {verifiedBy.length}/3 Verified
                    </span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-bold text-gray-900 text-lg line-clamp-1 mb-1">{issue.title}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{issue.location || 'Dhaka'}</span>
                    </p>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">
                      {proof?.note ? `Proof note: "${proof.note}"` : issue.description}
                    </p>

                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-4">
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${Math.min(100, (verifiedBy.length / 3) * 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleVerify(issue._id)}
                        disabled={alreadyVerified || verifyingId === issue._id || issue.status === 'solved'}
                        className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                          alreadyVerified || issue.status === 'solved'
                            ? 'bg-emerald-50 text-emerald-700 cursor-not-allowed'
                            : 'bg-[#0f5c4d] text-white hover:bg-[#0b463a]'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {issue.status === 'solved'
                          ? 'Resolved'
                          : alreadyVerified
                          ? 'Verified by You'
                          : verifyingId === issue._id
                          ? 'Verifying...'
                          : 'Confirm Fix (+10 pts)'}
                      </button>
                      <Link
                        href={`/issues/${issue._id}`}
                        className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                        title="View Details"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
