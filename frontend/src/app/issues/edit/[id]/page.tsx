'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api, { uploadImage, errMsg } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Upload, MapPin, AlertTriangle } from 'lucide-react';

const CATEGORIES = [
  'Garbage',
  'Road & Potholes',
  'Waterlogging',
  'Streetlights',
  'Broken Footpath',
  'Illegal Construction',
  'Public Property',
  'Drainage',
  'Other',
];

export default function EditIssuePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const issueId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Garbage');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [image, setImage] = useState('');
  const [priority, setPriority] = useState('medium');

  useEffect(() => {
    if (!issueId) return;
    (async () => {
      setLoading(true);
      try {
        const res: any = await api.get(`/issues/${issueId}`);
        const data = res?.data ?? res;
        setTitle(data.title || '');
        setCategory(data.category || 'Garbage');
        setLocation(data.location || '');
        setDescription(data.description || '');
        setAmount(Number(data.amount || 0));
        setImage(data.image || (Array.isArray(data.images) && data.images[0]) || '');
        setPriority(data.priority || 'medium');
      } catch (err) {
        toast.error(errMsg(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [issueId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setImage(url);
      toast.success('Image uploaded!');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to edit this issue');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/issues/${issueId}`, {
        title,
        category,
        location,
        description,
        amount: Number(amount),
        image,
        priority,
      });
      toast.success('Issue updated successfully!');
      router.push(`/issues/${issueId}`);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] pt-28 pb-20 px-4 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0f5c4d] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f5] pt-28 pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href={`/issues/${issueId}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#0f5c4d] hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Issue
        </Link>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Edit Reported Issue</h1>
          <p className="text-sm text-gray-500 mb-6">
            Update details, location, or estimated budget for this community report.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Issue Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#0f5c4d] text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#0f5c4d] text-sm bg-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#0f5c4d] text-sm bg-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Location</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#0f5c4d] text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">
                  Estimated Fix Budget (BDT)
                </label>
                <input
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#0f5c4d] text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Description</label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#0f5c4d] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Photo Evidence</label>
              <div className="flex items-center gap-4">
                {image && (
                  <img src={image} alt="Preview" className="w-24 h-24 rounded-xl object-cover border" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                )}
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50">
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Uploading...' : 'Change Image'}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Link
                href={`/issues/${issueId}`}
                className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving || uploading}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0f5c4d] text-white text-sm font-bold hover:bg-[#0b463a] disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
