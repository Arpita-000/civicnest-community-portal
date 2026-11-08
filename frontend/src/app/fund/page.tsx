'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api, { errMsg } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { HeartHandshake, MapPin, ArrowLeft, Sparkles, CheckCircle2, X } from 'lucide-react';

export default function FundCleanupPage() {
  const { user, dbUser } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [tab, setTab] = useState<'issues' | 'events'>('issues');
  const [loading, setLoading] = useState(true);

  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [donateType, setDonateType] = useState<'issue' | 'event'>('issue');
  const [amount, setAmount] = useState<number>(500);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [issRes, evRes]: any = await Promise.all([
        api.get('/issues', { params: { limit: 30 } }),
        api.get('/cleanup-events'),
      ]);
      const issData = issRes?.data ?? issRes;
      const evData = evRes?.data ?? evRes;
      const allIssues = Array.isArray(issData) ? issData : issData?.issues || [];
      setIssues(allIssues.filter((i: any) => Number(i.amount || 0) > 0 || true));
      setEvents(Array.isArray(evData) ? evData : evData?.events || []);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to contribute');
      return;
    }
    if (!selectedItem || amount <= 0) return;
    setSubmitting(true);
    try {
      if (donateType === 'issue') {
        await api.post(`/issues/${selectedItem._id}/donate`, { amount });
      } else {
        await api.post(`/cleanup-events/${selectedItem._id}/donate`, {
          amount,
          donorName: dbUser?.name || user.displayName || 'Neighbour',
        });
      }
      toast.success(`Thank you for contributing ৳${amount}!`);
      setSelectedItem(null);
      loadData();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSubmitting(false);
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

        <div className="bg-gradient-to-r from-[#062e26] to-[#0f5c4d] rounded-3xl p-8 md:p-10 text-white shadow-xl mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-extrabold uppercase tracking-wider mb-3">
              <HeartHandshake className="w-4 h-4" /> Crowdfunded Civic Action
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Fund a Cleanup or Repair</h1>
            <p className="text-emerald-100/85 max-w-2xl text-sm md:text-base">
              Pool micro-contributions with neighbours to purchase cleanup supplies, rent equipment, or fund verified street repairs.
            </p>
          </div>
          <Link
            href="/support"
            className="px-6 py-3.5 rounded-2xl bg-amber-400 text-gray-950 font-extrabold text-sm hover:bg-amber-300 transition shrink-0"
          >
            Support CivicNest General Fund
          </Link>
        </div>

        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setTab('issues')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition ${
              tab === 'issues' ? 'bg-[#0f5c4d] text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Civic Repairs ({issues.length})
          </button>
          <button
            onClick={() => setTab('events')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition ${
              tab === 'events' ? 'bg-[#0f5c4d] text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Cleanup Drives ({events.length})
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-white rounded-2xl h-80 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(tab === 'issues' ? issues : events).map((item) => {
              const goal = Number(item.amount || item.budgetGoal || 5000);
              const raised = Number(item.raisedAmount || item.budgetRaised || 0);
              const pct = Math.min(100, Math.round((raised / Math.max(1, goal)) * 100));

              return (
                <div
                  key={item._id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col"
                >
                  <img
                    src={
                      item.image ||
                      item.bannerImage ||
                      'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80'
                    }
                    alt={item.title}
                    className="w-full h-44 object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.includes('1542601906990')) {
                        target.src = 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80';
                      }
                    }}
                  />
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-bold text-gray-900 text-lg line-clamp-1 mb-1">{item.title}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="truncate">{item.location || 'Dhaka'}</span>
                    </p>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">{item.description}</p>

                    <div className="mb-4">
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-emerald-700">৳{raised.toLocaleString()} raised</span>
                        <span className="text-gray-400">Goal: ৳{goal.toLocaleString()} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setDonateType(tab === 'issues' ? 'issue' : 'event');
                        setAmount(500);
                      }}
                      className="w-full py-2.5 rounded-xl bg-[#0f5c4d] text-white font-bold text-xs hover:bg-[#0b463a] transition"
                    >
                      Contribute Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-extrabold text-gray-900 mb-1">Fund this Initiative</h3>
            <p className="text-xs text-gray-500 mb-4 line-clamp-1">{selectedItem.title}</p>

            <form onSubmit={handleDonate} className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {[200, 500, 1000, 2500].map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setAmount(preset)}
                    className={`py-2 rounded-xl font-bold text-xs border transition ${
                      amount === preset
                        ? 'bg-[#0f5c4d] text-white border-[#0f5c4d]'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    ৳{preset}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Custom Amount (BDT)</label>
                <input
                  type="number"
                  min={50}
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-[#0f5c4d] text-white font-bold text-sm hover:bg-[#0b463a] disabled:opacity-50"
              >
                {submitting ? 'Processing...' : `Confirm Contribution (৳${amount})`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
