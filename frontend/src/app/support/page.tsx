'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api, { errMsg } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { Heart, ShieldCheck, Sparkles, ArrowLeft, CreditCard, Smartphone } from 'lucide-react';

export default function SupportPage() {
  const { user, dbUser } = useAuth();
  const router = useRouter();
  const [amount, setAmount] = useState<number>(500);
  const [method, setMethod] = useState<'sslcommerz' | 'direct'>('direct');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to make a contribution');
      router.push('/login');
      return;
    }
    setLoading(true);
    try {
      if (method === 'sslcommerz') {
        const res: any = await api.post('/payment/ssl-init', {
          amount,
          purpose: 'community_support',
          donorName: dbUser?.name || user.displayName || 'Neighbour',
          donorEmail: user.email,
        });
        const data = res?.data ?? res;
        if (data?.GatewayPageURL) {
          window.location.href = data.GatewayPageURL;
          return;
        }
      }
      await api.post('/contributions', {
        amount,
        issueTitle: 'CivicNest Community Sustainability Fund',
        note,
        paymentMethod: method,
        name: dbUser?.name || user.displayName || 'Neighbour',
      });
      toast.success('Thank you for supporting CivicNest!');
      router.push('/payment-success?amount=' + amount);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f5] pt-28 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#0f5c4d] hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-[#0f5c4d] text-xs font-extrabold uppercase mb-3">
              <Heart className="w-3.5 h-3.5 fill-current" /> Community Backed
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">
              Support CivicNest Operations
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              100% of your contribution goes toward emergency civic cleanups, stray animal rescue kits, and keeping CivicNest ad-free for every neighbourhood.
            </p>

            <form onSubmit={handleSupport} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Select Amount (BDT)</label>
                <div className="grid grid-cols-4 gap-3 mb-3">
                  {[250, 500, 1000, 5000].map((val) => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => setAmount(val)}
                      className={`py-3 rounded-xl font-extrabold text-sm border transition ${
                        amount === val
                          ? 'bg-[#0f5c4d] text-white border-[#0f5c4d] shadow'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      ৳{val}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={50}
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold focus:outline-none focus:border-[#0f5c4d]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Payment Gateway</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMethod('direct')}
                    className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition ${
                      method === 'direct' ? 'border-[#0f5c4d] bg-emerald-50/40' : 'border-gray-200'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-[#0f5c4d]" />
                    <div>
                      <div className="text-xs font-bold text-gray-900">Instant Pledge</div>
                      <div className="text-[11px] text-gray-500">Direct Civic Wallet</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('sslcommerz')}
                    className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition ${
                      method === 'sslcommerz' ? 'border-[#0f5c4d] bg-emerald-50/40' : 'border-gray-200'
                    }`}
                  >
                    <Smartphone className="w-5 h-5 text-[#0f5c4d]" />
                    <div>
                      <div className="text-xs font-bold text-gray-900">SSLCommerz</div>
                      <div className="text-[11px] text-gray-500">bKash / Nagad / Card</div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">
                  Message of Encouragement (Optional)
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Keep our streets clean and green!"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0f5c4d]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-[#0f5c4d] text-white font-extrabold text-sm hover:bg-[#0b463a] transition shadow-lg"
              >
                {loading ? 'Processing...' : `Contribute ৳${amount.toLocaleString()}`}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#062e26] text-white rounded-3xl p-6">
              <Sparkles className="w-8 h-8 text-amber-400 mb-3" />
              <h3 className="font-extrabold text-lg mb-2">Where Your Money Goes</h3>
              <ul className="space-y-2.5 text-xs text-emerald-100/90">
                <li>• 60% — Gloves, trash bags, and tools for volunteer cleanup drives</li>
                <li>• 25% — Emergency stray animal rescue & vaccination drives</li>
                <li>• 15% — Civic verification & map infrastructure</li>
              </ul>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-100">
              <ShieldCheck className="w-7 h-7 text-emerald-600 mb-2" />
              <h4 className="font-bold text-gray-900 text-sm mb-1">100% Transparent Ledger</h4>
              <p className="text-xs text-gray-500 mb-3">
                All contributions are logged in your personal receipt history and earn +15 Civic Impact points.
              </p>
              <Link href="/contributions" className="text-xs font-bold text-[#0f5c4d] hover:underline">
                View My Contribution History →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
