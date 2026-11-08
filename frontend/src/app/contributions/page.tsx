'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api, { errMsg } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { Receipt, ArrowLeft, HeartHandshake, Calendar, Download } from 'lucide-react';

export default function MyContributionsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res: any = await api.get('/contributions/my');
        const data = res?.data ?? res;
        setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        toast.error(errMsg(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const total = items.reduce((acc, c) => acc + Number(c.amount || 0), 0);

  return (
    <div className="min-h-screen bg-[#f4f7f5] pt-28 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#0f5c4d] hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Profile
        </Link>

        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">My Civic Contributions</h1>
            <p className="text-sm text-gray-500">
              Official receipts of your donations to community repairs, cleanups, and NGOs.
            </p>
          </div>
          <div className="bg-emerald-50 px-6 py-4 rounded-2xl border border-emerald-100 text-right">
            <div className="text-xs font-bold uppercase text-emerald-700">Total Contributed</div>
            <div className="text-2xl font-extrabold text-[#0f5c4d]">৳{total.toLocaleString()}</div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center">Loading contributions...</div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
            <HeartHandshake className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">No contributions recorded yet</h3>
            <p className="text-sm text-gray-500 mb-6">
              Support a local cleanup drive or community repair to see your receipts here.
            </p>
            <Link
              href="/fund"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0f5c4d] text-white text-sm font-bold"
            >
              Browse Causes to Fund
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-extrabold uppercase text-gray-500">
                  <th className="py-4 px-6">Cause / Initiative</th>
                  <th className="py-4 px-6">Transaction ID</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {items.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50/60">
                    <td className="py-4 px-6 font-bold text-gray-900">
                      {c.issueTitle || 'CivicNest Community Cause'}
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-gray-500">
                      {c.transactionId || `TXN-${String(c._id).slice(-6).toUpperCase()}`}
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-500">
                      {c.date || c.createdAt
                        ? new Date(c.date || c.createdAt).toLocaleDateString()
                        : 'Recent'}
                    </td>
                    <td className="py-4 px-6 text-right font-extrabold text-emerald-700">
                      ৳{Number(c.amount || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
