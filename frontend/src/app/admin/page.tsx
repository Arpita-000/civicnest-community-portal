'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api, { errMsg } from '@/lib/api';
import { placeText } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import {
  Shield,
  Users,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Trash2,
  Calendar,
  Award,
  HeartHandshake,
  Megaphone,
  Building2,
  MessageSquare,
  Plus,
  RefreshCw,
} from 'lucide-react';

type AdminTab =
  | 'overview'
  | 'queue'
  | 'issues'
  | 'users'
  | 'membership'
  | 'volunteers'
  | 'events'
  | 'ngos'
  | 'notices'
  | 'donations';

export default function AdminDashboardPage() {
  const { user, role } = useAuth();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<any>({});
  const [queue, setQueue] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [ngos, setNgos] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [donations, setDonations] = useState<any>({ donations: [], totalAmount: 0 });

  // New Notice Form
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeCategory, setNoticeCategory] = useState('Official Notice');
  const [noticeContent, setNoticeContent] = useState('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [
        statsRes,
        qRes,
        issRes,
        usrRes,
        memRes,
        volRes,
        evRes,
        ngoRes,
        annRes,
        donRes,
      ]: any = await Promise.all([
        api.get('/admin/stats').catch(() => ({})),
        api.get('/admin/queue', { params: { status: 'pending_review', limit: 50 } }).catch(() => []),
        api.get('/admin/queue', { params: { type: 'issues', limit: 50 } }).catch(() => []),
        api.get('/admin/users').catch(() => []),
        api.get('/admin/membership').catch(() => []),
        api.get('/admin/volunteers').catch(() => []),
        api.get('/admin/cleanup-events').catch(() => []),
        api.get('/admin/ngos').catch(() => []),
        api.get('/announcements').catch(() => []),
        api.get('/admin/donations').catch(() => []),
      ]);
      const unwrap = (r: any) => r?.data ?? r;
      const list = (r: any, key: string) => {
        const d = unwrap(r);
        return Array.isArray(d) ? d : Array.isArray(d?.[key]) ? d[key] : [];
      };
      setStats(unwrap(statsRes) || {});
      setQueue(list(qRes, 'issues'));
      setIssues(list(issRes, 'issues'));
      setUsers(Array.isArray(unwrap(usrRes)) ? unwrap(usrRes) : []);
      setMemberships(Array.isArray(unwrap(memRes)) ? unwrap(memRes) : []);
      setVolunteers(Array.isArray(unwrap(volRes)) ? unwrap(volRes) : []);
      setEvents(Array.isArray(unwrap(evRes)) ? unwrap(evRes) : []);
      setNgos(list(ngoRes, 'ngos'));
      setNotices(Array.isArray(unwrap(annRes)) ? unwrap(annRes) : []);
      const dons = list(donRes, 'donations');
      setDonations({ donations: dons, totalAmount: dons.reduce((s: number, d: any) => s + Number(d.amount || 0), 0) });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  // The queue mixes issues and cleanup events (`_type: 'cleanup_event'`), which have their own endpoints.
  const queuePath = (item: any, action: 'approve' | 'reject') =>
    item._type === 'cleanup_event' ? `/admin/cleanup-events/${item._id}/${action}` : `/admin/issues/${item._id}/${action}`;

  const handleQueueApprove = async (item: any) => {
    try {
      await api.patch(queuePath(item, 'approve'), {});
      toast.success(item._type === 'cleanup_event' ? 'Event approved & published' : 'Issue approved & published');
      loadAll();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const handleQueueReject = async (item: any) => {
    try {
      await api.patch(queuePath(item, 'reject'), { reason: 'Moderation policy' });
      toast.success(item._type === 'cleanup_event' ? 'Event rejected' : 'Issue rejected');
      loadAll();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const handleIssueStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/admin/issues/${id}/status`, { status });
      toast.success(`Issue marked as ${status}`);
      loadAll();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const handleDeleteIssue = async (id: string) => {
    try {
      await api.delete(`/issues/${id}`);
      toast.success('Issue deleted');
      loadAll();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const handleUserRole = async (id: string, newRole: string) => {
    try {
      await api.patch(`/admin/users/${id}/role`, { role: newRole });
      toast.success(`Role updated to ${newRole}`);
      loadAll();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const handleMembershipAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      await api.patch(`/admin/membership/${id}/status`, { status: action === 'approve' ? 'approved' : 'rejected' });
      toast.success(`Membership ${action}d`);
      loadAll();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const handleVolunteerAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      await api.patch(`/admin/volunteers/${id}/status`, { status: action === 'approve' ? 'approved' : 'rejected' });
      toast.success(`Volunteer application ${action}d`);
      loadAll();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const handleNgoApprove = async (id: string) => {
    try {
      await api.patch(`/ngos/${id}/approve`, {});
      toast.success('NGO partner verified!');
      loadAll();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/announcements', {
        title: noticeTitle,
        category: noticeCategory,
        content: noticeContent,
        pinned: true,
      });
      toast.success('Official Notice published!');
      setNoticeTitle('');
      setNoticeContent('');
      loadAll();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const TABS: { id: AdminTab; label: string; badge?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'queue', label: 'Moderation Queue', badge: queue.length },
    { id: 'issues', label: 'All Issues', badge: issues.length },
    { id: 'users', label: 'Users & Roles', badge: users.length },
    { id: 'membership', label: 'Memberships', badge: memberships.filter((m) => m.status === 'pending').length },
    { id: 'volunteers', label: 'Volunteers', badge: volunteers.filter((v) => v.status === 'pending').length },
    { id: 'events', label: 'Cleanup Drives', badge: events.length },
    { id: 'ngos', label: 'NGOs', badge: ngos.length },
    { id: 'notices', label: 'Notices', badge: notices.length },
    { id: 'donations', label: 'Donations' },
  ];

  return (
    <div className="min-h-screen bg-[#f4f7f5] pt-28 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-[#062e26] to-[#0f5c4d] rounded-3xl p-8 text-white shadow-xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-extrabold uppercase mb-2">
              <Shield className="w-3.5 h-3.5" /> CivicNest Command Center
            </div>
            <h1 className="text-3xl font-extrabold">Admin & Moderation Portal</h1>
            <p className="text-xs text-emerald-100/80 mt-1">
              Signed in as {user?.email || 'Admin'} ({role || 'admin'})
            </p>
          </div>
          <button
            onClick={loadAll}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
                tab === t.id
                  ? 'bg-[#0f5c4d] text-white shadow'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}
            >
              {t.label}
              {typeof t.badge === 'number' && t.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    tab === t.id ? 'bg-white/20 text-white' : 'bg-emerald-50 text-[#0f5c4d]'
                  }`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === 'overview' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { label: 'Total Citizens', value: stats.totalUsers ?? users.length, color: 'text-[#0f5c4d]' },
              { label: 'Reported Issues', value: stats.totalIssues ?? issues.length, color: 'text-amber-600' },
              { label: 'Resolved Issues', value: stats.solvedIssues ?? 0, color: 'text-emerald-600' },
              { label: 'Pending Queue', value: queue.length, color: 'text-rose-600' },
              { label: 'Verified Members', value: users.filter((u) => u.role === 'member' || u.role === 'admin').length, color: 'text-teal-700' },
              { label: 'Active Volunteers', value: stats.totalVolunteers ?? volunteers.length, color: 'text-blue-600' },
              { label: 'Cleanup Drives', value: stats.totalEvents ?? events.length, color: 'text-purple-600' },
              {
                label: 'Funds Raised',
                value: `৳${Number(donations.totalAmount || 0).toLocaleString()}`,
                color: 'text-emerald-700',
              },
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="text-xs font-bold uppercase text-gray-400 mb-1">{card.label}</div>
                <div className={`text-3xl font-extrabold ${card.color}`}>{card.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Moderation Queue */}
        {tab === 'queue' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-extrabold text-gray-900 mb-4">Pending Moderation Queue ({queue.length})</h2>
            {queue.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">No issues pending moderation.</p>
            ) : (
              <div className="space-y-4">
                {queue.map((item) => (
                  <div
                    key={item._id}
                    className="p-4 rounded-2xl border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div>
                      <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
                        {item.category || 'Issue'}
                      </span>
                      <h3 className="font-bold text-gray-900 mt-1">{item.title}</h3>
                      <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleQueueApprove(item)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleQueueReject(item)}
                        className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Issues Management */}
        {tab === 'issues' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-extrabold uppercase text-gray-500">
                  <th className="py-3.5 px-5">Title</th>
                  <th className="py-3.5 px-5">Location</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {issues.map((iss) => (
                  <tr key={iss._id} className="hover:bg-gray-50/50">
                    <td className="py-3.5 px-5 font-bold text-gray-900">
                      <Link href={`/issues/${iss._id}`} className="hover:underline">
                        {iss.title}
                      </Link>
                    </td>
                    <td className="py-3.5 px-5 text-xs text-gray-500">{placeText(iss.location)}</td>
                    <td className="py-3.5 px-5">
                      <select
                        value={iss.status || 'open'}
                        onChange={(e) => handleIssueStatus(iss._id, e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold bg-white"
                      >
                        <option value="open">Open</option>
                        <option value="action_taken">Action Taken</option>
                        <option value="pending_verification">Pending Verification</option>
                        <option value="solved">Solved</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => handleDeleteIssue(iss._id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Users Management */}
        {tab === 'users' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-extrabold uppercase text-gray-500">
                  <th className="py-3.5 px-5">Name</th>
                  <th className="py-3.5 px-5">Email</th>
                  <th className="py-3.5 px-5">Points</th>
                  <th className="py-3.5 px-5">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {users.map((u) => (
                  <tr key={u._id}>
                    <td className="py-3.5 px-5 font-bold text-gray-900">{u.name || 'Citizen'}</td>
                    <td className="py-3.5 px-5 text-xs text-gray-500">{u.email}</td>
                    <td className="py-3.5 px-5 font-bold text-emerald-700">{u.points || 0}</td>
                    <td className="py-3.5 px-5">
                      <select
                        value={u.role || 'user'}
                        onChange={(e) => handleUserRole(u._id, e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold bg-white"
                      >
                        <option value="user">User</option>
                        <option value="member">Member</option>
                        <option value="volunteer">Volunteer</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Memberships */}
        {tab === 'membership' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3">
            {memberships.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No membership requests found.</p>
            ) : (
              memberships.map((m) => (
                <div
                  key={m._id}
                  className="p-4 rounded-2xl border border-gray-100 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-bold text-gray-900">{m.name || m.userEmail}</div>
                    <div className="text-xs text-gray-500">
                      {m.occupation || 'Resident'} • {m.reason || 'Civic Membership Request'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                      {m.status}
                    </span>
                    {m.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleMembershipAction(m._id, 'approve')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleMembershipAction(m._id, 'reject')}
                          className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Volunteers */}
        {tab === 'volunteers' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3">
            {volunteers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No volunteer applications found.</p>
            ) : (
              volunteers.map((v) => (
                <div
                  key={v._id}
                  className="p-4 rounded-2xl border border-gray-100 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-bold text-gray-900">{v.name || v.userEmail}</div>
                    <div className="text-xs text-gray-500">
                      Area: {v.preferredArea || 'Dhaka'} • Skills: {(v.skills || []).join(', ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                      {v.status}
                    </span>
                    {v.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleVolunteerAction(v._id, 'approve')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleVolunteerAction(v._id, 'reject')}
                          className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Cleanup Events */}
        {tab === 'events' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3">
            {events.map((ev) => (
              <div
                key={ev._id}
                className="p-4 rounded-2xl border border-gray-100 flex items-center justify-between gap-4"
              >
                <div>
                  <Link href={`/cleanup-events/${ev._id}`} className="font-bold text-gray-900 hover:underline">
                    {ev.title}
                  </Link>
                  <div className="text-xs text-gray-500">
                    {placeText(ev.location)} • {ev.date ? new Date(ev.date).toLocaleDateString() : ''}
                  </div>
                </div>
                <span className="text-xs font-bold uppercase px-3 py-1 rounded-full bg-emerald-50 text-[#0f5c4d]">
                  {ev.status || 'upcoming'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* NGOs */}
        {tab === 'ngos' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3">
            {ngos.map((n) => (
              <div
                key={n._id}
                className="p-4 rounded-2xl border border-gray-100 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="font-bold text-gray-900">{n.name}</div>
                  <div className="text-xs text-gray-500">{(n.focusAreas || []).join(', ') || n.focusArea || n.category}</div>
                </div>
                <div className="flex items-center gap-2">
                  {n.verified || n.status === 'verified' ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                      Verified Partner
                    </span>
                  ) : (
                    <button
                      onClick={() => handleNgoApprove(n._id)}
                      className="px-4 py-1.5 rounded-xl bg-[#0f5c4d] text-white text-xs font-bold"
                    >
                      Approve NGO
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notices */}
        {tab === 'notices' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form
              onSubmit={handleCreateNotice}
              className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4 h-fit"
            >
              <h3 className="font-extrabold text-gray-900">Publish Official Notice</h3>
              <input
                type="text"
                required
                placeholder="Notice Title"
                value={noticeTitle}
                onChange={(e) => setNoticeTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
              />
              <select
                value={noticeCategory}
                onChange={(e) => setNoticeCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
              >
                <option value="Official Notice">Official Notice</option>
                <option value="Emergency Alert">Emergency Alert</option>
                <option value="Cleanup Drive">Cleanup Drive</option>
                <option value="Policy Update">Policy Update</option>
              </select>
              <textarea
                rows={4}
                required
                placeholder="Announcement details..."
                value={noticeContent}
                onChange={(e) => setNoticeContent(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
              />
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#0f5c4d] text-white font-bold text-xs hover:bg-[#0b463a]"
              >
                Publish Notice
              </button>
            </form>

            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3">
              {notices.map((n) => (
                <div key={n._id} className="p-4 rounded-2xl border border-gray-100">
                  <div className="text-[11px] font-bold text-emerald-700 uppercase">{n.category}</div>
                  <div className="font-bold text-gray-900">{n.title}</div>
                  <p className="text-xs text-gray-500 mt-1">{n.content || n.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Donations */}
        {tab === 'donations' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-gray-900">Community Ledger</h3>
              <div className="text-lg font-extrabold text-emerald-700">
                Total: ৳{Number(donations.totalAmount || 0).toLocaleString()}
              </div>
            </div>
            <div className="space-y-2">
              {(donations.donations || []).map((d: any) => (
                <div
                  key={d._id}
                  className="p-3.5 rounded-xl border border-gray-100 flex items-center justify-between text-sm"
                >
                  <div>
                    <span className="font-bold text-gray-900">{d.name || d.userEmail || 'Citizen'}</span>
                    <span className="text-gray-400 mx-2">•</span>
                    <span className="text-xs text-gray-500">{d.issueTitle || 'Community Fund'}</span>
                  </div>
                  <div className="font-extrabold text-emerald-700">৳{Number(d.amount || 0).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
