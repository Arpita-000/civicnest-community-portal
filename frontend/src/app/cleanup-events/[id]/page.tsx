"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import api, { errMsg } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { formatDate } from "../../../lib/format";
import { BackButton, MinimalLoader } from "../../../components/ui";

export default function CleanupEventPage() {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [donateOpen, setDonateOpen] = useState(false);
  const [donateAmount, setDonateAmount] = useState(500);
  const [donateNote, setDonateNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [otpCode, setOtpCode] = useState<string | null>(null);
  const [checkInInput, setCheckInInput] = useState("");

  const loadEvent = useCallback(() => {
    api
      .get(`/cleanup-events/${id}`, { fresh: true })
      .then((r) => {
        setEvent(r.data);
        setState("ready");
      })
      .catch(() => setState("missing"));
  }, [id]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const handleGoing = async () => {
    if (!user) return toast.error("Please sign in to RSVP for this drive");
    try {
      const res = await api.post(`/cleanup-events/${id}/going`);
      toast.success(res.data?.going ? "You're registered as going!" : "RSVP removed");
      loadEvent();
    } catch (err) {
      toast.error(errMsg(err, "Could not update RSVP"));
    }
  };

  const handleInterested = async () => {
    if (!user) return toast.error("Please sign in to mark interest");
    try {
      const res = await api.post(`/cleanup-events/${id}/interested`);
      toast.success(res.data?.interested ? "Marked as interested!" : "Interest removed");
      loadEvent();
    } catch (err) {
      toast.error(errMsg(err, "Could not update interest"));
    }
  };

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Please sign in to donate");
    setSubmitting(true);
    try {
      await api.post(`/cleanup-events/${id}/donate`, {
        amount: Number(donateAmount),
        note: donateNote,
        paymentMethod: "card",
      });
      toast.success(`Thank you for donating ৳${donateAmount}!`);
      setDonateOpen(false);
      loadEvent();
    } catch (err) {
      toast.error(errMsg(err, "Donation failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateOtp = async () => {
    try {
      const res = await api.post(`/cleanup-events/${id}/generate-checkin-code`);
      setOtpCode(res.data?.code);
      toast.success("Check-in code generated!");
    } catch (err) {
      toast.error(errMsg(err, "Failed to generate check-in code"));
    }
  };

  const handleCheckIn = async () => {
    if (checkInInput.length !== 6) return toast.error("Enter the 6-digit OTP code");
    try {
      const res = await api.post(`/cleanup-events/${id}/checkin`, { otp: checkInInput });
      toast.success(res.data?.message || "Checked in! Points awarded.");
      setCheckInInput("");
      loadEvent();
    } catch (err) {
      toast.error(errMsg(err, "Check-in failed"));
    }
  };

  if (state === "loading")
    return (
      <div className="py-32">
        <MinimalLoader />
      </div>
    );
  if (state === "missing")
    return (
      <div className="text-center py-32 px-4">
        <i className="ri-calendar-close-line text-5xl text-slate-300"></i>
        <h2 className="text-2xl font-bold mt-3 text-slate-800 dark:text-white">Cleanup event not found.</h2>
        <Link href="/cleanup-events" className="inline-block mt-6 px-6 py-2.5 text-[13px] font-bold text-[#0f766e] bg-teal-50 dark:bg-teal-950/30 rounded-full">
          Browse Cleanup Drives
        </Link>
      </div>
    );

  const cover = event.coverImages?.[0];
  const going = event.goingCount ?? event.going?.length ?? 0;
  const goal = event.fundingGoal || 0;
  const raised = event.currentFunding ?? event.fundingRaised ?? 0;
  const isGoing = event.going?.some((a: any) => a.email?.toLowerCase() === user?.email?.toLowerCase());
  const isInterested = event.interested?.includes(user?.email);
  const isOrganizer = user?.email && (event.organizer?.email?.toLowerCase() === user.email.toLowerCase() || role === "admin");

  return (
    <div className="max-w-4xl mx-auto w-full px-4 md:px-6 py-10">
      <BackButton variant="dark" className="mb-6" />
      <div className="bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] rounded-xl shadow-sm border border-slate-200 dark:border-[#1e3040] overflow-hidden">
        {cover && (
          <img
            src={cover}
            alt={event.title}
            className="w-full h-72 object-cover"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        )}
        <div className="p-5 md:p-8">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-teal-600 text-white">
            <i className="ri-calendar-event-fill"></i> Community Event
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mt-4 leading-tight tracking-tight">
            {event.title}
          </h1>
          {event.slogan && <p className="text-[#0f766e] font-bold mt-1">{event.slogan}</p>}

          <div className="flex flex-wrap gap-x-6 gap-y-3 mt-6 p-3 rounded-lg bg-slate-50 dark:bg-[#0b1215] border border-slate-100 dark:border-[#14241d] text-[13px] text-slate-600 dark:text-slate-300 font-medium">
            <span className="flex items-center gap-1.5">
              <i className="ri-calendar-event-line text-slate-400"></i>
              {formatDate(event.eventDate, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              {event.eventTime ? ` • ${event.eventTime}` : ""}
            </span>
            {event.durationHours && (
              <span className="flex items-center gap-1.5">
                <i className="ri-time-line text-slate-400"></i>
                {event.durationHours}h
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <i className="ri-map-pin-line text-slate-400"></i>
              {event.location?.address}
              {event.location?.area ? ` • ${event.location.area}` : ""}
            </span>
            <span className="flex items-center gap-1.5">
              <i className="ri-group-line text-slate-400"></i>
              {going} going
            </span>
          </div>

          <p className="mt-6 text-[14px] leading-relaxed text-slate-700 dark:text-[#cbd5e1] whitespace-pre-wrap">
            {event.description}
          </p>

          {(event.requiredSkills?.length > 0 || event.suppliesNeeded?.length > 0) && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {event.requiredSkills?.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0b1215] border border-slate-100 dark:border-[#14241d]">
                  <p className="text-xs font-bold uppercase text-slate-400 mb-2">Skills Needed</p>
                  <div className="flex flex-wrap gap-1.5">
                    {event.requiredSkills.map((s: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-600 dark:text-teal-400">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {event.suppliesNeeded?.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0b1215] border border-slate-100 dark:border-[#14241d]">
                  <p className="text-xs font-bold uppercase text-slate-400 mb-2">Supplies Needed</p>
                  <div className="flex flex-wrap gap-1.5">
                    {event.suppliesNeeded.map((s: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {event.organizer?.name && (
            <div className="mt-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-[#1e3040] flex items-center justify-center text-slate-400">
                {event.organizer.photoURL ? (
                  <img src={event.organizer.photoURL} alt={event.organizer.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <i className="ri-user-line"></i>
                )}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Organised by</p>
                <p className="text-[13px] font-bold text-slate-800 dark:text-white">{event.organizer.name}</p>
              </div>
            </div>
          )}

          {event.fundingEnabled && goal > 0 && (
            <div className="mt-6 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 p-4">
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300 mb-2">
                <span>Raised ৳{raised}</span>
                <span>Goal ৳{goal}</span>
              </div>
              <div className="w-full bg-emerald-200/50 dark:bg-emerald-900/40 rounded-full h-2.5 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min((raised / goal) * 100, 100)}%` }}></div>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={handleGoing}
              className={`px-6 py-3 rounded-full text-[13px] font-bold shadow-sm cursor-pointer transition ${
                isGoing ? "bg-emerald-700 text-white" : "bg-[#0f766e] hover:bg-[#0d645d] text-white"
              }`}
            >
              <i className={`${isGoing ? "ri-check-double-line" : "ri-hand-heart-line"} mr-1.5`}></i>
              {isGoing ? "Going (Registered)" : "I'm going"}
            </button>

            <button
              onClick={handleInterested}
              className={`px-6 py-3 rounded-full text-[13px] font-bold cursor-pointer border transition ${
                isInterested
                  ? "bg-amber-100 text-amber-800 border-amber-300"
                  : "bg-white dark:bg-[#0a120e] border-slate-200 dark:border-[#1e3040] text-slate-700 dark:text-[#cbd5e1]"
              }`}
            >
              <i className={`${isInterested ? "ri-star-fill text-amber-500" : "ri-star-line"} mr-1.5`}></i>
              {isInterested ? "Interested" : "Mark Interested"}
            </button>

            {event.fundingEnabled && (
              <button
                onClick={() => setDonateOpen(true)}
                className="px-6 py-3 rounded-full bg-white dark:bg-[#0a120e] border border-slate-200 dark:border-[#1e3040] text-slate-700 dark:text-[#cbd5e1] text-[13px] font-bold cursor-pointer hover:border-teal-500"
              >
                <i className="ri-hand-coin-line mr-1.5 text-teal-600"></i> Support this drive
              </button>
            )}
          </div>

          {isGoing && (
            <div className="mt-6 p-4 rounded-xl bg-teal-50/70 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/40 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-teal-800 dark:text-teal-300">Event Check-In (Earn Volunteer Points)</p>
                <p className="text-xs text-teal-600 dark:text-teal-400">Enter the 6-digit OTP shared by the organizer at the venue.</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={checkInInput}
                  onChange={(e) => setCheckInInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit OTP"
                  className="w-32 px-3 py-2 text-xs font-mono tracking-widest text-center rounded-lg border border-teal-300 dark:border-teal-800 bg-white dark:bg-[#0b1215]"
                />
                <button onClick={handleCheckIn} className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-lg">
                  Check In
                </button>
              </div>
            </div>
          )}

          {isOrganizer && (
            <div className="mt-6 p-4 rounded-xl bg-slate-100 dark:bg-[#111c17] border border-slate-200 dark:border-[#1e3040] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-white">Organizer Controls</p>
                <p className="text-xs text-slate-500">Generate a 6-digit check-in code for volunteers on site.</p>
              </div>
              <div className="flex items-center gap-3">
                {otpCode && <span className="font-mono font-black text-lg text-teal-600 tracking-widest">{otpCode}</span>}
                <button onClick={handleGenerateOtp} className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg">
                  Generate Check-In Code
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {donateOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDonateOpen(false)}>
          <form
            onSubmit={handleDonate}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0a120e] rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-[#1e3040] space-y-4"
          >
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Support &ldquo;{event.title}&rdquo;</h3>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Amount (৳)</label>
              <input
                type="number"
                min={50}
                value={donateAmount}
                onChange={(e) => setDonateAmount(Number(e.target.value))}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#1e3040] bg-slate-50 dark:bg-[#0b1215] font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Message (Optional)</label>
              <input
                type="text"
                value={donateNote}
                onChange={(e) => setDonateNote(e.target.value)}
                placeholder="Keep up the great work!"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#1e3040] bg-slate-50 dark:bg-[#0b1215]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setDonateOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-teal-600 text-white text-xs font-bold rounded-xl">
                {submitting ? "Processing..." : `Donate ৳${donateAmount}`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
