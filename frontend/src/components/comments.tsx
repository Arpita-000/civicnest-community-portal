"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import api, { errMsg } from "../lib/api";
import { MinimalLoader } from "./ui";

type Comment = {
  _id: string;
  parentCommentId?: string | null;
  userId: string;
  userName: string;
  userAvatar?: string;
  body: string;
  createdAt: string;
  editedAt?: string | null;
  likes?: string[];
  isAnonymousPost?: boolean;
};

export function CommentBox({
  issueId,
  onAdded,
  parentCommentId = null,
  autoFocus = false,
  onCancel,
}: {
  issueId: string;
  onAdded: (c: Comment) => void;
  parentCommentId?: string | null;
  autoFocus?: boolean;
  onCancel?: () => void;
}) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    if (!user) return toast.error("Please log in to comment");
    setBusy(true);
    try {
      const { data } = await api.post(`/issues/${issueId}/comments`, { body: text, ...(parentCommentId && { parentCommentId }) });
      toast.success(parentCommentId ? "Reply posted successfully!" : "Comment posted successfully!", { iconTheme: { primary: "#40826D", secondary: "#fff" } });
      setText("");
      onAdded(data);
    } catch (err) {
      toast.error(errMsg(err, "Could not post your comment"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-6">
      <div className="flex gap-4 items-start">
        <div className="mt-1 flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-[#1e3040] flex items-center justify-center text-slate-500 dark:text-slate-300 shadow-inner overflow-hidden">
            {user?.photoURL ? <img src={user.photoURL} alt="You" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : <i className="ri-user-line text-[13px]"></i>}
          </div>
        </div>
        <div className="flex-grow flex flex-col gap-3">
          <textarea
            className="w-full min-h-[80px] px-4 py-3 bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-lg text-slate-800 dark:text-white focus:bg-white dark:focus:bg-[#0a120e] focus:outline-none focus:ring-2 focus:ring-[#9FE2BF]/40 focus:border-[#40826D] transition-all resize-y"
            placeholder={user ? (parentCommentId ? "Write a reply..." : "Add a comment... Be respectful and constructive.") : "Please log in to comment..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            autoFocus={autoFocus}
            disabled={!user}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">{text.length}/1000 characters</span>
            <div className="flex gap-2">
              {onCancel && (
                <button type="button" onClick={onCancel} className="btn btn-sm btn-ghost text-slate-500 dark:text-slate-300">
                  Cancel
                </button>
              )}
              {user ? (
                <button type="submit" className="btn btn-sm bg-[#40826D] hover:bg-[#326756] text-white border-none" disabled={busy || !text.trim()}>
                  {busy ? <MinimalLoader size="sm" color="#fff" /> : parentCommentId ? "Reply" : "Post Comment"}
                </button>
              ) : (
                <Link href="/login" className="btn btn-sm bg-[#40826D] hover:bg-[#326756] text-white border-none">
                  Log in to comment
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

function CommentItem({
  comment,
  childrenComments,
  issue,
  actions,
}: {
  comment: Comment;
  childrenComments: any[];
  issue: any;
  actions: { added: (c: Comment) => void; updated: (c: Comment) => void; deleted: (id: string) => void };
}) {
  const { user } = useAuth();
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAuthor = !!user && user.uid === comment.userId;
  const anonymous = comment.isAnonymousPost && comment.userId === "hidden";
  const authorName = anonymous ? "Anonymous Poster" : comment.userName;
  const liked = !!user && !!comment.likes?.includes(user.uid);

  const toggleLike = async () => {
    if (!user) return toast.error("Please log in to like comments");
    try {
      const { data } = await api.patch(`/comments/${comment._id}/${liked ? "unlike" : "like"}`);
      if (data.success) actions.updated({ ...comment, likes: data.likes });
    } catch (err) {
      toast.error(errMsg(err, "Failed to update like"));
    }
  };

  const saveEdit = async () => {
    if (!editBody.trim() || editBody === comment.body) return setEditing(false);
    setSaving(true);
    try {
      const { data } = await api.patch(`/comments/${comment._id}`, { body: editBody });
      actions.updated({ ...comment, body: editBody.trim(), editedAt: data.editedAt });
      setEditing(false);
      toast.success("Comment updated");
    } catch (err) {
      toast.error(errMsg(err, "Failed to update comment"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Delete this comment? This action cannot be undone.")) return;
    setDeleting(true);
    try {
      await api.delete(`/comments/${comment._id}`);
      actions.deleted(comment._id);
      toast.success("Comment deleted");
    } catch (err) {
      toast.error(errMsg(err, "Failed to delete comment"));
      setDeleting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 md:gap-4 w-full">
      <div className="mt-1 flex-shrink-0">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-200 dark:bg-[#1e3040] flex items-center justify-center text-slate-500 dark:text-slate-300 shadow-inner overflow-hidden">
          {comment.userAvatar && !anonymous ? <img src={comment.userAvatar} alt="Avatar" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : <i className="ri-user-line text-[13px] tracking-tight"></i>}
        </div>
      </div>

      <div className="flex-grow min-w-0">
        <div
          className={`bg-[#FDFCFA] dark:bg-[#0b1215] p-4 md:p-5 rounded-[24px] rounded-tl-md border ${
            editing ? "border-[#40826D]/50 ring-2 ring-[#40826D]/10" : "border-slate-200 dark:border-[#1e3040]"
          } shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] relative z-10 transition-all`}
        >
          <div className="flex justify-between items-center mb-2 md:mb-3">
            <span className="font-bold text-slate-800 dark:text-white text-[14px] md:text-[15px] truncate mr-2">{authorName}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              {comment.editedAt && <span className="text-[10px] text-slate-400 italic">Edited</span>}
              <span className="text-[10px] md:text-[11px] font-bold text-slate-400 bg-slate-50 dark:bg-[#0a120e] border border-slate-100 dark:border-[#14241d] px-2 md:px-3 py-1 rounded-full uppercase tracking-wider">
                {new Date(comment.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
              </span>
            </div>
          </div>

          {editing ? (
            <div className="mt-2">
              <textarea
                className="w-full min-h-[80px] px-3 py-2 bg-slate-50 dark:bg-[#0a120e] border border-slate-200 dark:border-[#1e3040] rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9FE2BF]/40 focus:border-[#40826D] resize-y text-[13px]"
                value={editBody}
                maxLength={1000}
                onChange={(e) => setEditBody(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditBody(comment.body);
                  }}
                  className="btn btn-xs md:btn-sm btn-ghost text-slate-500 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button onClick={saveEdit} disabled={saving} className="btn btn-xs md:btn-sm bg-[#40826D] hover:bg-[#326756] text-white border-none">
                  {saving ? <MinimalLoader size="sm" color="#fff" /> : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[14px] md:text-[15px] leading-relaxed relative z-20 break-words text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{comment.body}</p>
          )}

          {!editing && (
            <div className="mt-3 pt-3 border-t border-slate-50 dark:border-[#14241d] flex items-center gap-4">
              <button onClick={toggleLike} aria-pressed={liked} className={`flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${liked ? "text-rose-500" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"}`}>
                <i className={liked ? "ri-heart-3-fill text-[13px]" : "ri-heart-3-line text-[13px]"}></i>
                {comment.likes?.length || 0}
              </button>
              <button onClick={() => setReplying(!replying)} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer">
                <i className="ri-reply-line text-[13px]"></i> Reply
              </button>
              {isAuthor && (
                <div className="flex items-center gap-4 ml-auto">
                  <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-[#40826D] transition-colors cursor-pointer">
                    <i className="ri-edit-line text-[13px]"></i> Edit
                  </button>
                  <button onClick={remove} disabled={deleting} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-50">
                    <i className="ri-delete-bin-line text-[13px]"></i> {deleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {replying && (
          <div className="mt-2 md:mt-3">
            <CommentBox
              issueId={issue._id}
              parentCommentId={comment._id}
              autoFocus
              onCancel={() => setReplying(false)}
              onAdded={(c) => {
                setReplying(false);
                actions.added(c);
              }}
            />
          </div>
        )}

        {childrenComments.length > 0 && (
          <div className="mt-4 md:mt-6 space-y-4 md:space-y-6 relative before:content-[''] before:absolute before:-left-6 md:before:-left-8 before:top-0 before:bottom-6 before:w-px before:bg-slate-200 dark:before:bg-[#1e3040]">
            {childrenComments.map((child) => (
              <div key={child._id} className="relative before:content-[''] before:absolute before:-left-6 md:before:-left-8 before:top-6 before:w-4 md:before:w-6 before:h-px before:bg-slate-200 dark:before:bg-[#1e3040]">
                <CommentItem comment={child.comment} childrenComments={child.children} issue={issue} actions={actions} />
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function CommentList({
  comments,
  issue,
  actions,
}: {
  comments: Comment[];
  issue: any;
  actions: { added: (c: Comment) => void; updated: (c: Comment) => void; deleted: (id: string) => void };
}) {
  // Threads: replies hang off their parent; a reply whose parent was deleted is promoted to the top level.
  const roots = useMemo(() => {
    const map: Record<string, { comment: Comment; children: any[]; _id: string }> = {};
    comments.forEach((c) => (map[c._id] = { comment: c, children: [], _id: c._id }));
    const top: any[] = [];
    comments.forEach((c) => (c.parentCommentId && map[c.parentCommentId] ? map[c.parentCommentId].children.push(map[c._id]) : top.push(map[c._id])));
    return top;
  }, [comments]);

  if (comments.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 dark:bg-[#0b1215] rounded-lg border border-slate-200 dark:border-[#1e3040] border-dashed">
        <i className="ri-message-3-line text-4xl tracking-tight text-slate-300 mb-2 block"></i>
        <p className="text-slate-500 dark:text-slate-300 font-medium">No comments yet. Be the first to start the discussion!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {roots.map((r) => (
        <CommentItem key={r._id} comment={r.comment} childrenComments={r.children} issue={issue} actions={actions} />
      ))}
    </div>
  );
}
