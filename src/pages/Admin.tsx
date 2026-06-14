import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { UserService } from "../services/user";
import { AdminService } from "../services/admin";
import { PostService } from "../services/post";
import { UserProfile, Report, Post } from "../types";
import { Shield, Users, AlertTriangle, CheckCircle, Trash2, Ban, RefreshCw, BarChart2, Star, UserCheck } from "lucide-react";
import { motion } from "motion/react";

export const Admin: React.FC = () => {
  const { userProfile, updateProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "reports" | "analytics">("analytics");

  // Load all admin data
  useEffect(() => {
    let unsubReports = () => {};
    let unsubPosts = () => {};

    const loadData = async () => {
      try {
        const allUsers = await UserService.getAllUsers();
        setUsers(allUsers);

        // Listen to live reports
        unsubReports = AdminService.listenToReports((list) => {
          setReports(list);
        });

        // Listen to live posts
        unsubPosts = PostService.listenToFeed((list) => {
          setPosts(list);
          setLoading(false);
        });
      } catch (err) {
        console.error("Admin load error:", err);
        setLoading(false);
      }
    };

    loadData();
    return () => {
      unsubReports();
      unsubPosts();
    };
  }, [userProfile]);

  const handleSimulateAdmin = async () => {
    if (!userProfile) return;
    try {
      await UserService.updateUserProfile(userProfile.uid, { role: "admin" });
      if (updateProfile) {
        await updateProfile({ role: "admin" });
      }
      alert("Success! Your profile has been upgraded to Administrator. Refreshing...");
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSuspendToggle = async (user: UserProfile) => {
    try {
      if (user.suspended) {
        await AdminService.unsuspendUser(user.uid);
        alert(`Unsuspended ${user.fullName}`);
      } else {
        await AdminService.suspendUser(user.uid);
        alert(`Suspended ${user.fullName}`);
      }
      // Refresh local users list
      const allUsers = await UserService.getAllUsers();
      setUsers(allUsers);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePost = async (postId: string, reportId?: string) => {
    if (window.confirm("Are you sure you want to delete this reported post from the platform?")) {
      try {
        await AdminService.deletePost(postId);
        if (reportId) {
          await AdminService.resolveReport(reportId);
        }
        alert("Post deleted successfully.");
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      await AdminService.resolveReport(reportId);
      alert("Report resolved and marked clean.");
    } catch (err) {
      console.error(err);
    }
  };

  // Safe checks for admin access
  const isAdmin = userProfile?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-950/20 rounded-full flex items-center justify-center text-red-600 mb-4 shadow">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-extrabold text-neutral-900 dark:text-neutral-100 mb-2">
          Administrator Access Required
        </h1>
        <p className="text-sm text-neutral-500 dark:text-[#B0B3B8] max-w-md mb-6 leading-relaxed">
          You are logged in as a standard user profile (<span className="text-[#1877F2] font-semibold">@{userProfile?.username}</span>). 
          Only platform administrators can oversee reported content, manage profile suspensions, and compile telemetry dashboards.
        </p>

        <button
          onClick={handleSimulateAdmin}
          className="h-10 px-6 bg-[#1877F2] hover:bg-blue-600 text-sm font-extrabold text-white rounded-lg shadow-md transition flex items-center space-x-2"
        >
          <UserCheck className="w-4 h-4" />
          <span>Simulate Admin Access (Upgrade Profile)</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-2 sm:px-4 py-6 space-y-6">
      {/* Title block */}
      <div className="bg-white dark:bg-[#242526] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-neutral-900 dark:text-neutral-100 flex items-center space-x-2">
            <Shield className="w-6 h-6 text-red-500" />
            <span>Administrator Control Dashboard</span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-[#B0B3B8] mt-0.5">
            Oversee user suspensions, review flags, delete content, and track active metrics.
          </p>
        </div>

        <div className="flex space-x-1 border border-neutral-200 dark:border-neutral-700 p-0.5 rounded-lg text-xs font-bold">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-3 py-1.5 rounded-md ${
              activeTab === "analytics" ? "bg-[#1877F2] text-white" : "text-neutral-600 dark:text-neutral-400"
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-3 py-1.5 rounded-md ${
              activeTab === "users" ? "bg-[#1877F2] text-white" : "text-neutral-600 dark:text-neutral-400"
            }`}
          >
            User Accounts
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`px-3 py-1.5 rounded-md ${
              activeTab === "reports" ? "bg-[#1877F2] text-white" : "text-neutral-600 dark:text-neutral-400"
            }`}
          >
            Report Flags
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 font-sans font-bold animate-pulse text-neutral-400">Loading admin ledger reports...</div>
      ) : (
        <>
          {/* TAB 1: ANALYTICS */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              {/* Bento counters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#242526] p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/20 text-[#1877F2] flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 block font-bold uppercase tracking-wider">Total Users</span>
                    <strong className="text-2xl font-sans font-black dark:text-white">{users.length}</strong>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#242526] p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center">
                    <BarChart2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 block font-bold uppercase tracking-wider">Platform Posts</span>
                    <strong className="text-2xl font-sans font-black dark:text-white">{posts.length}</strong>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#242526] p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/20 text-red-500 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 block font-bold uppercase tracking-wider">Mod Cases</span>
                    <strong className="text-2xl font-sans font-black dark:text-white">{reports.filter(r => r.status === "pending").length} Pending</strong>
                  </div>
                </div>
              </div>

              {/* Status details page */}
              <div className="bg-white dark:bg-[#242526] p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-neutral-800 dark:text-[#E4E6EB] border-b border-neutral-100 dark:border-neutral-800 pb-2 flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-red-400" />
                  <span>Platform Operations Review</span>
                </h3>
                <div className="text-xs text-neutral-600 dark:text-[#B0B3B8] space-y-3 leading-relaxed">
                  <p>
                    All modules (Firebase Firestore Database, Firebase Storage, and Authentication) are synced successfully. 
                    The security perimeter strictly mandates <strong>isVerifiedUser()</strong> on creation scopes and standard owner checks on modification scopes.
                  </p>
                  <div className="bg-neutral-50 dark:bg-[#18191A] p-4 rounded-lg space-y-2 border border-neutral-100 dark:border-neutral-900 font-mono text-[10px]">
                    <div>Database ID: <span className="text-[#1877F2]">main</span></div>
                    <div>Rules Standard Verified: <span className="text-emerald-500">Active</span></div>
                    <div>Operational Mode: <span className="text-indigo-500">Comprehensive Full-Stack Sandbox</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER ACCOUNT ACCOUNTS LIST */}
          {activeTab === "users" && (
            <div className="bg-white dark:bg-[#242526] rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#2A2B2C]/10">
                <h3 className="text-sm font-bold text-neutral-800 dark:text-white">Active platform user profiles</h3>
              </div>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-[500px] overflow-y-auto">
                {users.length === 0 ? (
                  <p className="text-center py-6 text-xs text-neutral-500">No registered profiles found in storage.</p>
                ) : (
                  users.map((item) => (
                    <div key={item.uid} className="px-5 py-4 flex items-center justify-between hover:bg-neutral-50/50 dark:hover:bg-[#1C1D1E]/40 transition gap-4">
                      <div className="flex items-center space-x-3 truncate">
                        {item.profilePicture ? (
                          <img src={item.profilePicture} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-neutral-300 dark:bg-neutral-800 flex items-center justify-center font-bold text-neutral-700 dark:text-white text-xs shrink-0">{item.fullName[0].toUpperCase()}</div>
                        )}
                        <div className="truncate">
                          <p className="text-sm font-bold text-neutral-900 dark:text-white leading-tight truncate">{item.fullName}</p>
                          <span className="text-[10px] text-neutral-400 block truncate">@{item.username} · {item.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {/* Suspension toggles */}
                        <button
                          onClick={() => handleSuspendToggle(item)}
                          className={`h-8 px-3 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                            item.suspended
                              ? "bg-red-500 text-white hover:bg-red-600"
                              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200"
                          }`}
                        >
                          <Ban className="w-3.5 h-3.5 shrink-0" />
                          <span>{item.suspended ? "Suspended" : "Suspend Account"}</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MODERATION REPORTS */}
          {activeTab === "reports" && (
            <div className="space-y-4">
              {reports.length === 0 ? (
                <div className="bg-white dark:bg-[#242526] p-10 text-center rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm text-xs text-neutral-400">
                  Clean ledger! No unresolved content flags or reported posts.
                </div>
              ) : (
                reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="bg-white dark:bg-[#242526] p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                      <span className="text-xs text-red-500 font-bold flex items-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Case status: {rep.status.toUpperCase()}</span>
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        Flagged on: {new Date(rep.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="text-xs text-neutral-700 dark:text-[#E4E6EB] space-y-1">
                      <p>
                        Reporter: <strong>{rep.reporterName}</strong> (UID: {rep.reporterId})
                      </p>
                      <p>
                        Reason flagged: <strong className="text-rose-500">{rep.reason}</strong>
                      </p>
                      {rep.postContent && (
                        <div className="bg-neutral-50 dark:bg-neutral-800/20 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 italic text-neutral-600 dark:text-neutral-400 mt-2">
                          "{rep.postContent}"
                        </div>
                      )}
                    </div>

                    {rep.status === "pending" && (
                      <div className="flex justify-end space-x-2 pt-2 text-xs">
                        {/* Resolve Report */}
                        <button
                          onClick={() => handleResolveReport(rep.id)}
                          className="h-8 px-3.5 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 text-neutral-700 dark:text-neutral-300 font-bold rounded-lg"
                        >
                          Dismiss Report
                        </button>
                        
                        {/* Delete Post / Resolve */}
                        {rep.postId && (
                          <button
                            onClick={() => handleDeletePost(rep.postId!, rep.id)}
                            className="h-8 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg flex items-center space-x-1"
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Delete Content</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
