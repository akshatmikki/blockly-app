"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { LogOut, ChevronDown, ChevronUp, Upload, X, CheckCircle2, Eye, EyeOff, UserPen, Lock, UserX,Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as XLSX from "xlsx";
import AddUserForm from "@/components/admin/AddUserForm";
import AdminGuard from "@/components/auth/AdminGuard";

type User = {
  UserId: number;
  Email: string;
  Username: string;
  FirstName?: string;
  LastName?: string;
  Role: string;
  IsActive: boolean;
  CreatedOn?: string;
  LastLogin?: string;
  PlainPassword?: string;
};

type ModalType =
  | "edit"
  | "delete"
  | "reset"
  | "success"
  | "error"
  | "bulkUpload"
  | "addUser"
  | null;

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("week");
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState<{ [key: number]: boolean }>({});
  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalData, setModalData] = useState<any>(null);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", email: "", username: "" });
  const [editFormError, setEditFormError] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [confirmResetPassword, setConfirmResetPassword] = useState("");
  const [resetPasswordError, setResetPasswordError] = useState("");
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    fetch("/api/auth/admin/users", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          router.push("/login");
          return [];
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setUsers(data);
      })
      .catch((err) => {
        console.error("AdminDashboard: Fetch error:", err);
        router.push("/login");
      });
  };

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    router.push("/login");
  }

  // AIConnecto color scheme
  const colors = {
    green: "#00C853",
    lightGreen: "#8BC34A",
    blue: "#0288D1",
    lightBlue: "#03A9F4",
    orange: "#FF6F00",
    lightOrange: "#FF9800",
    yellow: "#FFC107",
    navy: "#1A237E",
  };

  // Stats calculations
  const totalUsers = users.length;
  const adminCount = users.filter(u => u.Role?.toLowerCase() === "admin").length;
  const regularUserCount = totalUsers - adminCount;

  const pieData = [
    { name: "Regular Users", value: regularUserCount, color: colors.blue },
    { name: "Admins", value: adminCount, color: colors.orange },
  ];

  // Login count data - based on actual LastLogin field
  const loginCountData = users
    .filter(u => u.LastLogin) // Only users who have logged in
    .sort((a, b) => {
      const dateA = a.LastLogin ? new Date(a.LastLogin).getTime() : 0;
      const dateB = b.LastLogin ? new Date(b.LastLogin).getTime() : 0;
      return dateB - dateA; // Most recent first
    })
    .slice(0, 5) // Top 5 most recent users
    .map(user => ({
      name: user.Username || user.Email.split('@')[0],
      logins: user.LastLogin ? 1 : 0, // This represents they have logged in
    }));

  // Users created over time based on CreatedOn date
  const getOnlineUsersData = () => {
    const now = new Date();

    if (timeRange === "week") {
      // Last 7 days
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const weekData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - (6 - i));
        const dayName = days[date.getDay()];
        const count = users.filter(u => {
          if (!u.CreatedOn) return false;
          const createdDate = new Date(u.CreatedOn);
          return createdDate.toDateString() === date.toDateString();
        }).length;
        return { name: dayName, users: count };
      });
      return weekData;
    } else if (timeRange === "month") {
      // Last 4 weeks
      return Array.from({ length: 4 }, (_, i) => {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - ((3 - i) * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const count = users.filter(u => {
          if (!u.CreatedOn) return false;
          const createdDate = new Date(u.CreatedOn);
          return createdDate >= weekStart && createdDate <= weekEnd;
        }).length;

        return { name: `Week ${i + 1}`, users: count };
      });
    } else {
      // Last 12 months
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return Array.from({ length: 12 }, (_, i) => {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        const monthName = months[monthDate.getMonth()];
        const count = users.filter(u => {
          if (!u.CreatedOn) return false;
          const createdDate = new Date(u.CreatedOn);
          return createdDate.getMonth() === monthDate.getMonth() &&
                 createdDate.getFullYear() === monthDate.getFullYear();
        }).length;
        return { name: monthName, users: count };
      });
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (userId: number) => {
    setShowPassword(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Email validation regex
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handlers with modal support
  const handleEdit = (user: User) => {
    setEditForm({
      firstName: user.FirstName || "",
      lastName: user.LastName || "",
      email: user.Email || "",
      username: user.Username || "",
    });
    setEditFormError("");
    setModalData({ userId: user.UserId, username: user.Username, originalEmail: user.Email, originalUsername: user.Username });
    setModalType("edit");
  };

  const handleEditSubmit = async () => {
    // Validation checks
    if (!editForm.email || !validateEmail(editForm.email)) {
      setEditFormError("Please enter a valid email address");
      return;
    }

    if (!editForm.username || editForm.username.trim().length < 3) {
      setEditFormError("Username must be at least 3 characters");
      return;
    }

    if (editForm.username.includes(' ')) {
      setEditFormError("Username cannot contain spaces");
      return;
    }

    if (!editForm.firstName || editForm.firstName.trim().length === 0) {
      setEditFormError("First name is required");
      return;
    }

    if (!editForm.lastName || editForm.lastName.trim().length === 0) {
      setEditFormError("Last name is required");
      return;
    }

    setEditFormError("");

    try {
      const response = await fetch(`/api/auth/admin/users/${modalData.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          FirstName: editForm.firstName.trim(),
          LastName: editForm.lastName.trim(),
          Email: editForm.email.trim(),
          Username: editForm.username.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setModalData({ message: data.message || "Failed to update user" });
        setModalType("error");
        return;
      }

      setModalData({ message: "User updated successfully!" });
      setModalType("success");
      setEditFormError("");
      fetchUsers();
    } catch (error) {
      console.error("Edit error:", error);
      setModalData({ message: "Failed to update user. Please try again." });
      setModalType("error");
    }
  };

  const handleDeleteConfirm = (user: User) => {
    setModalData({ userId: user.UserId, username: user.Username });
    setModalType("delete");
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/auth/admin/users/${modalData.userId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        setModalData({ message: data.message || "Failed to delete user" });
        setModalType("error");
        return;
      }

      setUsers(prev => prev.filter(u => u.UserId !== modalData.userId));
      setModalData({ message: "User deleted successfully!" });
      setModalType("success");
    } catch (error) {
      console.error("Delete error:", error);
      setModalData({ message: "Failed to delete user. Please try again." });
      setModalType("error");
    }
  };

  const handleResetPasswordConfirm = (user: User) => {
    setResetPassword("");
    setConfirmResetPassword("");
    setResetPasswordError("");
    setModalData({ userId: user.UserId, username: user.Username, currentPassword: user.PlainPassword });
    setModalType("reset");
  };

  const handleResetPasswordSubmit = async () => {
    // Validation checks
    if (resetPassword.length < 6) {
      setResetPasswordError("Password must be at least 6 characters");
      return;
    }

    if (resetPassword !== confirmResetPassword) {
      setResetPasswordError("Passwords do not match");
      return;
    }

    // Check if new password is same as old password
    if (modalData.currentPassword && resetPassword === modalData.currentPassword) {
      setResetPasswordError("New password cannot be the same as the current password");
      return;
    }

    try {
      const response = await fetch(`/api/auth/admin/users/${modalData.userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: resetPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        setModalData({ message: data.message || "Failed to reset password" });
        setModalType("error");
        return;
      }

      setModalData({ message: "Password reset successfully!" });
      setModalType("success");
      setResetPassword("");
      setConfirmResetPassword("");
      setResetPasswordError("");
      fetchUsers();
    } catch (error) {
      console.error("Reset password error:", error);
      setModalData({ message: "Failed to reset password. Please try again." });
      setModalType("error");
    }
  };

  // Bulk upload handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setBulkFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBulkFile(file);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) return;

    try {
      const data = await bulkFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      console.log("Excel data parsed:", jsonData);

      // Validate and upload each row
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];

        // Normalize keys to lowercase for case-insensitive matching
        const normalizedRow: any = {};
        Object.keys(row).forEach(key => {
          normalizedRow[key.toLowerCase().trim()] = row[key];
        });

        // Check for required fields (case-insensitive)
        const email = normalizedRow.email;
        const username = normalizedRow.username;
        const password = normalizedRow.password;
        const firstName = normalizedRow.firstname || normalizedRow.first_name;
        const lastName = normalizedRow.lastname || normalizedRow.last_name;

        if (!email || !username || !password || !firstName || !lastName) {
          setBulkFile(null); // Clear file selection
          setModalData({
            message: `Row ${i + 2}: Missing required fields. Expected: email, username, password, firstName, lastName`
          });
          setModalType("error");
          return;
        }

        // Validate email format
        if (!validateEmail(String(email).trim())) {
          setBulkFile(null);
          setModalData({
            message: `Row ${i + 2}: Invalid email format - ${email}`
          });
          setModalType("error");
          return;
        }

        // Validate username (no spaces, min 3 characters)
        const usernameStr = String(username).trim();
        if (usernameStr.length < 3) {
          setBulkFile(null);
          setModalData({
            message: `Row ${i + 2}: Username must be at least 3 characters - ${username}`
          });
          setModalType("error");
          return;
        }

        if (usernameStr.includes(' ')) {
          setBulkFile(null);
          setModalData({
            message: `Row ${i + 2}: Username cannot contain spaces - ${username}`
          });
          setModalType("error");
          return;
        }

        // Validate password length
        if (String(password).length < 6) {
          setBulkFile(null);
          setModalData({
            message: `Row ${i + 2}: Password must be at least 6 characters`
          });
          setModalType("error");
          return;
        }

        const response = await fetch("/api/auth/sign_up", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: String(email).trim(),
            username: String(username).trim(),
            password: String(password).trim(),
            firstName: String(firstName).trim(),
            lastName: String(lastName).trim(),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          setBulkFile(null); // Clear file selection on error
          setModalData({
            message: `Row ${i + 2}: ${errorData.message || "Upload failed"}`
          });
          setModalType("error");
          return;
        }
      }

      setModalData({ message: `Successfully uploaded ${jsonData.length} users!` });
      setModalType("success");
      setBulkFile(null);
      fetchUsers();
    } catch (error) {
      console.error("Bulk upload error:", error);
      setBulkFile(null); // Clear file selection on error
      setModalData({ message: "Failed to process file. Please check the format and ensure all columns are present." });
      setModalType("error");
    }
  };

  const closeModal = () => {
    setModalType(null);
    setModalData(null);
    setEditForm({ firstName: "", lastName: "", email: "", username: "" });
    setEditFormError("");
    setResetPassword("");
    setConfirmResetPassword("");
    setResetPasswordError("");
    // Don't clear bulkFile here, only on error or success
  };

  // Render Modal based on type
  const renderModal = () => {
    if (!modalType) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-bounce-in">
          {/* Success Modal */}
          {modalType === "success" && (
            <div className="p-8 text-center">
              <div className="mb-6 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 bg-green-100 rounded-full animate-ping"></div>
                </div>
                <CheckCircle2 size={96} className="text-green-500 mx-auto relative z-10" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Success!</h2>
              <p className="text-gray-600 mb-6">{modalData?.message}</p>
              <Button
                onClick={closeModal}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white h-12 rounded-full font-semibold cursor-pointer"
              >
                Awesome!
              </Button>
            </div>
          )}

          {/* Error Modal */}
          {modalType === "error" && (
            <div className="p-8 text-center">
              <X size={96} className="text-red-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Oops!</h2>
              <p className="text-gray-600 mb-6 whitespace-pre-line">{modalData?.message}</p>
              <Button
                onClick={closeModal}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white h-12 rounded-full font-semibold cursor-pointer"
              >
                Got it
              </Button>
            </div>
          )}

          {/* Edit Modal */}
          {modalType === "edit" && (
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Edit User</h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => {
                      setEditForm(prev => ({...prev, username: e.target.value}));
                      if (e.target.value.trim().length > 0 && e.target.value.trim().length < 3) {
                        setEditFormError("Username must be at least 3 characters");
                      } else if (e.target.value.includes(' ')) {
                        setEditFormError("Username cannot contain spaces");
                      } else if (editFormError.includes("Username")) {
                        setEditFormError("");
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Username (min 3 characters, no spaces)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => {
                      setEditForm(prev => ({...prev, email: e.target.value}));
                      if (!validateEmail(e.target.value) && e.target.value.length > 0) {
                        setEditFormError("Please enter a valid email address");
                      } else if (editFormError === "Please enter a valid email address") {
                        setEditFormError("");
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => {
                      setEditForm(prev => ({...prev, firstName: e.target.value}));
                      if (e.target.value.trim().length === 0) {
                        setEditFormError("First name is required");
                      } else if (editFormError === "First name is required") {
                        setEditFormError("");
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="First Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => {
                      setEditForm(prev => ({...prev, lastName: e.target.value}));
                      if (e.target.value.trim().length === 0) {
                        setEditFormError("Last name is required");
                      } else if (editFormError === "Last name is required") {
                        setEditFormError("");
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Last Name"
                  />
                  {editFormError && (
                    <p className="text-red-500 text-sm mt-1">{editFormError}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={closeModal}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 h-12 rounded-full font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEditSubmit}
                  disabled={!!editFormError || !editForm.firstName || !editForm.lastName || !editForm.email || !editForm.username}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white h-12 rounded-full font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {modalType === "delete" && (
            <div className="p-8 text-center">
              <Trash2 size={96} className="text-red-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Delete User?</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <strong>{modalData?.username}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={closeModal}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 h-12 rounded-full font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white h-12 rounded-full font-semibold cursor-pointer"
                >
                  Yes, Delete
                </Button>
              </div>
            </div>
          )}

          {/* Reset Password Modal */}
          {modalType === "reset" && (
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Reset Password</h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <p className="text-gray-600 mb-4">Set new password for <strong>{modalData?.username}</strong></p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <input
                    type="password"
                    value={resetPassword}
                    onChange={(e) => {
                      setResetPassword(e.target.value);
                      // Real-time validation
                      if (e.target.value.length > 0 && e.target.value.length < 6) {
                        setResetPasswordError("Password must be at least 6 characters");
                      } else if (modalData.currentPassword && e.target.value === modalData.currentPassword) {
                        setResetPasswordError("New password cannot be the same as current password");
                      } else if (confirmResetPassword && e.target.value !== confirmResetPassword) {
                        setResetPasswordError("Passwords do not match");
                      } else {
                        setResetPasswordError("");
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                    placeholder="Enter new password (min 6 characters)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmResetPassword}
                    onChange={(e) => {
                      setConfirmResetPassword(e.target.value);
                      // Real-time validation
                      if (resetPassword && e.target.value !== resetPassword) {
                        setResetPasswordError("Passwords do not match");
                      } else if (resetPassword.length < 6) {
                        setResetPasswordError("Password must be at least 6 characters");
                      } else {
                        setResetPasswordError("");
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                    placeholder="Confirm new password"
                  />
                  {resetPasswordError && (
                    <p className="text-red-500 text-sm mt-1">{resetPasswordError}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={closeModal}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 h-12 rounded-full font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleResetPasswordSubmit}
                  disabled={!!resetPasswordError || !resetPassword || !confirmResetPassword}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white h-12 rounded-full font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset Password
                </Button>
              </div>
            </div>
          )}

          {/* Bulk Upload Modal */}
          {modalType === "bulkUpload" && (
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Bulk Upload Users</h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Excel Format Required:</h3>
                <p className="text-sm text-blue-700">Columns: <code>email</code>, <code>username</code>, <code>password</code>, <code>firstName</code>, <code>lastName</code></p>
                <p className="text-xs text-blue-600 mt-1">Note: Column headers are case-insensitive</p>
              </div>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <Upload size={64} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-2">Drag and drop your Excel file here</p>
                <p className="text-sm text-gray-400 mb-4">or</p>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <span className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full font-semibold inline-block">
                    Browse Files
                  </span>
                </label>
                {bulkFile && (
                  <p className="mt-4 text-sm text-green-600 font-medium">
                    Selected: {bulkFile.name}
                  </p>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={closeModal}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 h-12 rounded-full font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkUpload}
                  disabled={!bulkFile}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white h-12 rounded-full font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Upload Users
                </Button>
              </div>
            </div>
          )}
          {modalType === "addUser" && (
  <div className="p-8">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold text-gray-800">Add New User</h2>
      <button onClick={closeModal}>
        <X size={24} />
      </button>
    </div>

    <AddUserForm
      onCancel={closeModal}
      onSuccess={() => {
        setModalData({ message: "User created successfully!" });
        setModalType("success");
        fetchUsers();
      }}
    />
  </div>
)}

        </div>
      </div>
    );
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
        {/* Modal */}
        {renderModal()}

      {/* Navbar */}
      <nav className="bg-white shadow-md border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/images/logo.jpg"
              alt="Logo"
              width={120}
              height={120}
              className="rounded-lg"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
          <div className="flex gap-3">
            <Button
  onClick={() => setModalType("addUser")}
  className="bg-green-500 hover:bg-green-600 cursor-pointer flex items-center gap-2"
>
  + Add User
</Button>
            <Button
              onClick={() => setModalType("bulkUpload")}
              className="bg-blue-500 hover:bg-blue-600 cursor-pointer flex items-center gap-2"
            >
              <Upload size={18} />
              Bulk Upload
            </Button>
            <Button
              onClick={logout}
              className="bg-orange-500 hover:bg-orange-600 cursor-pointer flex items-center gap-2"
            >
              <LogOut size={18} />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4" style={{borderColor: colors.blue}}>
            <h3 className="text-gray-600 text-sm font-medium mb-2">Total Users</h3>
            <p className="text-4xl font-bold" style={{color: colors.blue}}>{totalUsers}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4" style={{borderColor: colors.orange}}>
            <h3 className="text-gray-600 text-sm font-medium mb-2">Total Admins</h3>
            <p className="text-4xl font-bold" style={{color: colors.orange}}>{adminCount}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4" style={{borderColor: colors.green}}>
            <h3 className="text-gray-600 text-sm font-medium mb-2">Regular Users</h3>
            <p className="text-4xl font-bold" style={{color: colors.green}}>{regularUserCount}</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Pie Chart - User Types */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4" style={{borderColor: colors.green}}>
            <h2 className="text-xl font-bold text-gray-800 mb-4">User Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart - Recent Login Activity */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4" style={{borderColor: colors.blue}}>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Login Activity</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={loginCountData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip />
                <Bar dataKey="logins" fill={colors.blue} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Line Chart - User Registration Over Time */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 mb-8" style={{borderColor: colors.orange}}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">User Registrations Over Time</h2>
            <div className="flex gap-2">
              <Button
                onClick={() => setTimeRange("week")}
                className={`cursor-pointer ${
                  timeRange === "week"
                    ? "bg-orange-500 hover:bg-orange-600"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                }`}
              >
                Week
              </Button>
              <Button
                onClick={() => setTimeRange("month")}
                className={`cursor-pointer ${
                  timeRange === "month"
                    ? "bg-orange-500 hover:bg-orange-600"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                }`}
              >
                Month
              </Button>
              <Button
                onClick={() => setTimeRange("year")}
                className={`cursor-pointer ${
                  timeRange === "year"
                    ? "bg-orange-500 hover:bg-orange-600"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                }`}
              >
                Year
              </Button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={getOnlineUsersData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="users"
                stroke={colors.orange}
                strokeWidth={3}
                dot={{ fill: colors.orange, r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4" style={{borderColor: colors.navy}}>
          <h2 className="text-xl font-bold text-gray-800 mb-4">All Users</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2" style={{borderColor: colors.lightBlue}}>
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">ID</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">Email</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">Username</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">Role</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <>
                    <tr
                      key={user.UserId}
                      className="border-b border-gray-100 hover:bg-orange-50 transition-colors cursor-pointer"
                      onClick={() => setExpandedUserId(expandedUserId === user.UserId ? null : user.UserId)}
                    >
                      <td className="py-3 px-4 text-gray-800">{user.UserId}</td>
                      <td className="py-3 px-4 text-gray-800">{user.Email}</td>
                      <td className="py-3 px-4 text-gray-800 flex items-center gap-2">
                        {user.Username}
                        {expandedUserId === user.UserId ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          user.Role === "admin"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {user.Role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          user.IsActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {user.IsActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleEdit(user)}
                            className="bg-blue-500 hover:bg-blue-600 cursor-pointer p-2"
                            title="Edit User"
                          >
                            <UserPen size={16} />
                          </Button>
                          <Button
                            onClick={() => handleResetPasswordConfirm(user)}
                            className="bg-yellow-500 hover:bg-yellow-600 cursor-pointer p-2"
                            title="Reset Password"
                          >
                            <Lock size={16} />
                          </Button>
                          {user.Role?.toLowerCase() !== "admin" && (
                            <Button
                              onClick={() => handleDeleteConfirm(user)}
                              className="bg-red-500 hover:bg-red-600 cursor-pointer p-2"
                              title="Delete User"
                            >
                              <UserX size={16} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedUserId === user.UserId && (
                      <tr className="bg-gray-50">
                        <td colSpan={6} className="py-4 px-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-gray-700">
                              <span className="font-semibold">First Name:</span>
                              <span>{user.FirstName || "Not set"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-700">
                              <span className="font-semibold">Last Name:</span>
                              <span>{user.LastName || "Not set"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-700">
                              <span className="font-semibold">Password:</span>
                              <span className="font-mono">
                                {showPassword[user.UserId]
                                  ? (user.PlainPassword || "Not available")
                                  : "••••••••"}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePasswordVisibility(user.UserId);
                                }}
                                className="text-gray-500 hover:text-gray-700 cursor-pointer"
                              >
                                {showPassword[user.UserId] ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    </AdminGuard>
  );
}
