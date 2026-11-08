'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Receipt } from 'lucide-react';

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-[#f4f7f5] pt-28 pb-20 px-4 flex items-center justify-center">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center shadow-lg border border-gray-100">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Contribution Confirmed!</h1>
        <p className="text-sm text-gray-600 mb-6">
          Thank you for investing in a cleaner, safer neighbourhood. Your receipt has been added to your profile and your Civic Points have been updated.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/contributions"
            className="w-full py-3 rounded-xl bg-[#0f5c4d] text-white font-bold text-sm hover:bg-[#0b463a] transition flex items-center justify-center gap-2"
          >
            <Receipt className="w-4 h-4" /> View My Receipts
          </Link>
          <Link
            href="/"
            className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition flex items-center justify-center gap-2"
          >
            Return to Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

