"use client";
import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  company: string | null;
  plan: string | null;
  createdAt: string;
  lastLogin?: string;
  status: "active" | "inactive";
}

// Current admin user shape from /api/me
interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
}

export default function AdminDashboard() {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  const usersSectionRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load current admin user from session
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!mounted) return;
        if (res.status === 401) {
          setUserError("Not authenticated");
          setLoadingUser(false);
          router.push("/signin");
          return;
        }
        const data = await res.json();
        const roleLower = (data.user.role || "user").toString().toLowerCase();
        const mapped: CurrentUser = {
          id: data.user.userId,
          name: data.user.name || "",
          email: data.user.email,
          role: roleLower === "admin" ? "admin" : "user",
        };
        // If not admin, redirect to home as a safeguard
        if (mapped.role !== "admin") {
          router.push("/");
          return;
        }
        setCurrentUser(mapped);
        setLoadingUser(false);
      } catch (e) {
        if (!mounted) return;
        setUserError("Failed to load user");
        setLoadingUser(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      // ignore
    }
    console.log("Logout clicked - redirecting to landing page");
    setShowLogoutConfirm(false);

    // Redirect to landing page after a brief delay for better UX
    setTimeout(() => {
      router.push("/");
    }, 500);
  };

  const handleViewUsers = async () => {
    setShowUsers(true);
    setIsLoadingUsers(true);

    try {
      const response = await fetch("/api/admin/users");

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch users");
      }

      setUsers(data.users);
    } catch (error) {
      console.error("Error fetching users:", error);
      alert("Failed to load users. Please check the console for details.");
    } finally {
      setIsLoadingUsers(false);
    }

    setTimeout(() => {
      usersSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  const handleDeleteUser = async (userId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    ) {
      return;
    }
    console.log("Delete user:", userId);
    setUsers(users.filter((user) => user.id !== userId));
  };

  const handleBanUser = async (userId: string) => {
    console.log("Toggle user status:", userId);
    setUsers(
      users.map((user) =>
        user.id === userId
          ? {
              ...user,
              status: user.status === "active" ? "inactive" : "active",
            }
          : user
      )
    );
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    console.log("Save user edits:", editingUser);
    setUsers(
      users.map((user) => (user.id === editingUser.id ? editingUser : user))
    );
    setEditingUser(null);
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
  };

  const handlePromoteToAdmin = async (userId: string) => {
    console.log("Promote user to admin:", userId);
    setUsers(
      users.map((user) =>
        user.id === userId ? { ...user, role: "admin" } : user
      )
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-300";
      case "inactive":
        return "bg-red-500/20 text-red-300";
      default:
        return "bg-gray-500/20 text-gray-300";
    }
  };

  const getRoleColor = (role: string) => {
    return role === "admin"
      ? "bg-purple-500/20 text-purple-300"
      : "bg-cyan-500/20 text-cyan-300";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className="min-h-screen text-white overflow-hidden"
      style={{
        backgroundImage: "radial-gradient(at 0% 0%, #061121 0%, #000 100%)",
      }}
    >
      {/* Navigation */}
      <nav className="relative border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-black font-bold text-lg">🔗</span>
              </div>
              <span className="text-xl font-black tracking-tight">
                SYNC
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                  TECH
                </span>
              </span>
            </Link>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 text-sm sm:text-base">
                {loadingUser ? (
                  <span className="text-cyan-300">Loading admin...</span>
                ) : currentUser ? (
                  <>
                    <span className="text-cyan-300 truncate max-w-[14rem]" title={`${currentUser.name} • ${currentUser.email}`}>
                      Admin: {currentUser.name || currentUser.email}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${currentUser.role === "admin" ? "bg-purple-500/20 text-purple-300" : "bg-cyan-500/20 text-cyan-300"}`}>
                      {currentUser.role.toUpperCase()}
                    </span>
                  </>
                ) : (
                  <span className="text-red-300">{userError || "Unable to load admin"}</span>
                )}
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="px-4 py-2 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10 transition-all"
              >
                Logout
              </button>
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-6 max-w-md mx-4 shadow-xl">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center mr-3">
                      <svg
                        className="w-5 h-5 text-red-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white">
                      Confirm Sign Out
                    </h3>
                  </div>

                  <p className="text-gray-300 mb-6">
                    Are you sure you want to sign out? You will be redirected to
                    the landing page.
                  </p>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowLogoutConfirm(false)}
                      className="flex-1 py-3 px-4 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition-all font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex-1 py-3 px-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-all font-medium"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Rest of your AdminDashboard content remains exactly the same */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black mb-4">
            Admin{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
              Dashboard
            </span>
          </h1>
          <p className="text-xl text-gray-300">
            System administration and user management
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* User Management */}
          <div className="rounded-2xl p-6 border border-purple-500/20 bg-black/20">
            <h3 className="text-xl font-bold mb-4 text-purple-300">
              👥 User Management
            </h3>
            <div className="space-y-3">
              <button
                onClick={handleViewUsers}
                disabled={isLoadingUsers}
                className="w-full py-2 px-4 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-all text-left disabled:opacity-50"
              >
                {isLoadingUsers
                  ? "Loading..."
                  : `View All Users (${users.length})`}
              </button>
              <button
                onClick={() => console.log("Create New User clicked")}
                className="w-full py-2 px-4 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-all text-left"
              >
                Create New User
              </button>
              <button
                onClick={() => console.log("Manage Permissions clicked")}
                className="w-full py-2 px-4 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-all text-left"
              >
                Manage Permissions
              </button>
            </div>
          </div>

          {/* System Analytics */}
          <div className="rounded-2xl p-6 border border-blue-500/20 bg-black/20">
            <h3 className="text-xl font-bold mb-4 text-blue-300">
              📊 System Analytics
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Active Users:</span>
                <span className="text-green-400">
                  {users.filter((u) => u.status === "active").length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Users:</span>
                <span className="text-blue-400">{users.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Admins:</span>
                <span className="text-purple-400">
                  {users.filter((u) => u.role === "admin").length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Inactive:</span>
                <span className="text-red-400">
                  {users.filter((u) => u.status === "inactive").length}
                </span>
              </div>
            </div>
          </div>

          {/* Security Logs */}
          <div className="rounded-2xl p-6 border border-red-500/20 bg-black/20">
            <h3 className="text-xl font-bold mb-4 text-red-300">
              🔐 Security Center
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => console.log("View Access Logs clicked")}
                className="w-full py-2 px-4 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-all text-left"
              >
                View Access Logs
              </button>
              <button
                onClick={() => console.log("Failed Login Attempts clicked")}
                className="w-full py-2 px-4 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-all text-left"
              >
                Failed Login Attempts (0)
              </button>
              <button
                onClick={() => console.log("Token Audit Trail clicked")}
                className="w-full py-2 px-4 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-all text-left"
              >
                Token Audit Trail
              </button>
            </div>
          </div>

          {/* Token Management */}
          <div className="rounded-2xl p-6 border border-green-500/20 bg-black/20">
            <h3 className="text-xl font-bold mb-4 text-green-300">
              🎫 Token Management
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => console.log("Revoke Tokens clicked")}
                className="w-full py-2 px-4 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-all text-left"
              >
                Revoke Tokens
              </button>
              <button
                onClick={() => console.log("Token Analytics clicked")}
                className="w-full py-2 px-4 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-all text-left"
              >
                Token Analytics
              </button>
              <Link
                href="/tokeninfo"
                className="block w-full py-2 px-4 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-all text-left"
              >
                View Token Demo →
              </Link>
            </div>
          </div>

          {/* System Configuration */}
          <div className="rounded-2xl p-6 border border-yellow-500/20 bg-black/20">
            <h3 className="text-xl font-bold mb-4 text-yellow-300">
              ⚙️ System Config
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => console.log("JWT Settings clicked")}
                className="w-full py-2 px-4 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-lg transition-all text-left"
              >
                JWT Settings
              </button>
              <button
                onClick={() => console.log("Role Definitions clicked")}
                className="w-full py-2 px-4 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-lg transition-all text-left"
              >
                Role Definitions
              </button>
              <button
                onClick={() => console.log("Security Policies clicked")}
                className="w-full py-2 px-4 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-lg transition-all text-left"
              >
                Security Policies
              </button>
            </div>
          </div>
        </div>

        {/* Users Management Section */}
        {showUsers && (
          <div ref={usersSectionRef} className="mt-16">
            <div className="rounded-2xl p-6 border border-purple-500/20 bg-black/20">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-purple-300">
                  👥 User Management - Live Data
                </h2>
                <div className="text-sm text-gray-400">
                  Total: {users.length} users
                </div>
              </div>

              {/* Loading State */}
              {isLoadingUsers && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
                  <p className="mt-2 text-gray-400">
                    Loading users from database...
                  </p>
                </div>
              )}

              {/* Edit User Modal */}
              {editingUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                  <div className="bg-gray-900 border border-purple-500/30 rounded-2xl p-6 max-w-md mx-4 shadow-xl">
                    <h3 className="text-xl font-bold text-white mb-4">
                      Edit User
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Name
                        </label>
                        <input
                          type="text"
                          value={editingUser.name || ""}
                          onChange={(e) =>
                            setEditingUser({
                              ...editingUser,
                              name: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={editingUser.email}
                          onChange={(e) =>
                            setEditingUser({
                              ...editingUser,
                              email: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Role
                        </label>
                        <select
                          value={editingUser.role}
                          onChange={(e) =>
                            setEditingUser({
                              ...editingUser,
                              role: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white"
                        >
                          <option value="USER">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Company
                        </label>
                        <input
                          type="text"
                          value={editingUser.company || ""}
                          onChange={(e) =>
                            setEditingUser({
                              ...editingUser,
                              company: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white"
                        />
                      </div>
                      <div className="flex space-x-3 pt-4">
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 py-2 px-4 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          className="flex-1 py-2 px-4 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 transition-all"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Users Table */}
              {!isLoadingUsers && users.length > 0 && (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-gray-400">
                            User
                          </th>
                          <th className="text-left py-3 px-4 text-gray-400">
                            Role
                          </th>
                          <th className="text-left py-3 px-4 text-gray-400">
                            Status
                          </th>
                          <th className="text-left py-3 px-4 text-gray-400">
                            Company
                          </th>
                          <th className="text-left py-3 px-4 text-gray-400">
                            Plan
                          </th>
                          <th className="text-left py-3 px-4 text-gray-400">
                            Joined
                          </th>
                          <th className="text-left py-3 px-4 text-gray-400">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr
                            key={user.id}
                            className="border-b border-white/5 hover:bg-white/5"
                          >
                            <td className="py-3 px-4">
                              <div>
                                <div className="font-medium">
                                  {user.name || "No Name"}
                                </div>
                                <div className="text-sm text-gray-400">
                                  {user.email}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${getRoleColor(
                                  user.role
                                )}`}
                              >
                                {user.role}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${getStatusColor(
                                  user.status
                                )}`}
                              >
                                {user.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-300">
                              {user.company || "N/A"}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-300">
                              {user.plan || "N/A"}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-300">
                              {formatDate(user.createdAt)}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEditUser(user)}
                                  className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded text-blue-300 text-xs transition-all"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleBanUser(user.id)}
                                  className={`px-3 py-1 rounded text-xs transition-all ${
                                    user.status === "inactive"
                                      ? "bg-green-500/20 hover:bg-green-500/30 text-green-300"
                                      : "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300"
                                  }`}
                                >
                                  {user.status === "inactive"
                                    ? "Activate"
                                    : "Deactivate"}
                                </button>
                                {user.role !== "admin" && (
                                  <button
                                    onClick={() =>
                                      handlePromoteToAdmin(user.id)
                                    }
                                    className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 rounded text-purple-300 text-xs transition-all"
                                  >
                                    Promote
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-red-300 text-xs transition-all"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {users.filter((u) => u.status === "active").length}
                      </div>
                      <div className="text-sm text-gray-400">Active</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-400">
                        {users.filter((u) => u.status === "inactive").length}
                      </div>
                      <div className="text-sm text-gray-400">Inactive</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">
                        {users.filter((u) => u.role === "ADMIN").length}
                      </div>
                      <div className="text-sm text-gray-400">Admins</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">
                        {users.filter((u) => u.role === "USER").length}
                      </div>
                      <div className="text-sm text-gray-400">Users</div>
                    </div>
                  </div>
                </>
              )}

              {/* Empty State */}
              {!isLoadingUsers && users.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-lg">No users found</div>
                  <p className="text-gray-500 mt-2">
                    There are no registered users in the database.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
