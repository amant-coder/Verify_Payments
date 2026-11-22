"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PaymentOrder } from "@/types/order";
import { formatINR } from "@/lib/upi";
import { getTimerState } from "@/lib/timer";
import {
  Search,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Key,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [adminSecret, setAdminSecret] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("admin_secret") || "admin123";
    }
    return "admin123";
  });
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterTab, setFilterTab] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED" | "OVERDUE">("ALL");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders", {
        headers: { "x-admin-secret": adminSecret },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.orders) setOrders(data.orders);
      } else if (res.status === 401) {
        setActionMessage("Unauthorized. Please check your Admin Secret.");
        setOrders([]);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 4000);
    return () => clearInterval(interval);
  }, [adminSecret]);

  const handleDecision = async (orderId: string, decision: "APPROVED" | "REJECTED") => {
    setActionLoadingId(orderId);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({
          decision,
          adminSecret,
          adminUser: "AdminPortal",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionMessage(`Error: ${data.error || "Decision failed"}`);
      } else {
        setActionMessage(`Order ${orderId} successfully marked as ${decision}.`);
        fetchOrders();
      }
    } catch (err) {
      setActionMessage("Network error recording decision.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const processedOrders = useMemo(() => {
    return orders.map((order) => {
      const timerState = getTimerState(order, Date.now(), 0);
      return {
        ...order,
        isOverdue: timerState.isOverdue,
        timerStage: timerState.stage,
        formattedCountdown: timerState.formattedTime,
      };
    });
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return processedOrders.filter((order) => {
      const matchesSearch =
        order.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.utr && order.utr.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (order.customerName && order.customerName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterTab === "PENDING") return order.status === "VERIFICATION_PENDING" && !order.isOverdue;
      if (filterTab === "OVERDUE") return order.status === "VERIFICATION_PENDING" && order.isOverdue;
      if (filterTab === "APPROVED") return order.status === "APPROVED";
      if (filterTab === "REJECTED") return order.status === "REJECTED";

      return true;
    });
  }, [processedOrders, searchQuery, filterTab]);

  const metrics = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let overdue = 0;

    processedOrders.forEach((o) => {
      if (o.status === "APPROVED") approved++;
      else if (o.status === "REJECTED") rejected++;
      else if (o.status === "VERIFICATION_PENDING") {
        if (o.isOverdue) overdue++;
        else pending++;
      }
    });

    return { total: orders.length, pending, approved, rejected, overdue };
  }, [processedOrders, orders.length]);

  return (
    <div className="w-full max-w-5xl space-y-6 py-6 px-4">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-blue-600">
            Merchant Operations
          </span>
          <h1 className="text-2xl font-bold text-slate-900">
            UPI Payment Approvals & Audit
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manually verify incoming bank credit before approving customer checkouts.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <Key className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="password"
              value={adminSecret}
              onChange={(e) => {
                setAdminSecret(e.target.value);
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("admin_secret", e.target.value);
                }
              }}
              placeholder="Admin Secret"
              className="w-24 focus:outline-none text-xs font-mono"
              title="Admin Secret Key"
            />
          </div>

          <button
            onClick={fetchOrders}
            className="p-2 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-xs font-medium flex items-center space-x-1 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <a
            href="/"
            className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
          >
            Storefront
          </a>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs font-medium flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-blue-500 hover:text-blue-700">
            ✕
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Orders</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.total}</p>
        </div>

        <div className="bg-white border border-blue-200 rounded-2xl p-4 shadow-sm bg-blue-50/20">
          <span className="text-[10px] uppercase font-bold text-blue-600">Active Review</span>
          <p className="text-2xl font-extrabold text-blue-700 mt-1">{metrics.pending}</p>
        </div>

        <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-sm bg-amber-50/20">
          <span className="text-[10px] uppercase font-bold text-amber-600">Overdue (&gt;7m)</span>
          <p className="text-2xl font-extrabold text-amber-700 mt-1">{metrics.overdue}</p>
        </div>

        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm bg-emerald-50/20">
          <span className="text-[10px] uppercase font-bold text-emerald-600">Approved</span>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">{metrics.approved}</p>
        </div>

        <div className="bg-white border border-red-200 rounded-2xl p-4 shadow-sm bg-red-50/20">
          <span className="text-[10px] uppercase font-bold text-red-600">Rejected</span>
          <p className="text-2xl font-extrabold text-red-700 mt-1">{metrics.rejected}</p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        {/* Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
          {(["ALL", "PENDING", "OVERDUE", "APPROVED", "REJECTED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                filterTab === tab
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Order ID, UTR, Name..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Orders List / Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No orders match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status & Stage</th>
                  <th className="py-3 px-4">Customer & UTR</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const isPending = order.status === "VERIFICATION_PENDING";
                  const isApproved = order.status === "APPROVED";
                  const isRejected = order.status === "REJECTED";

                  return (
                    <tr key={order.orderId} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                        <a
                          href={`/checkout/${order.orderId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-blue-600 inline-flex items-center space-x-1"
                        >
                          <span>{order.orderId}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        {formatINR(order.amountPaise)}
                      </td>

                      <td className="py-3.5 px-4">
                        {isApproved && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            Approved
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800">
                            Rejected
                          </span>
                        )}
                        {order.status === "AWAITING_PAYMENT" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                            Awaiting Payment
                          </span>
                        )}
                        {order.status === "PAYMENT_LAUNCHED" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700">
                            App Launched
                          </span>
                        )}
                        {isPending && (
                          <div className="space-y-0.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                order.isOverdue
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {order.isOverdue ? "Overdue (>7m)" : `Review (${order.formattedCountdown})`}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">
                          {order.customerName || "Anonymous"}
                        </div>
                        {order.utr ? (
                          <div className="text-[11px] font-mono text-emerald-700 font-semibold">
                            UTR: {order.utr}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400">No UTR submitted</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {new Date(order.createdAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {isPending || order.status === "PAYMENT_LAUNCHED" ? (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleDecision(order.orderId, "APPROVED")}
                              disabled={actionLoadingId === order.orderId}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] transition shadow-sm disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleDecision(order.orderId, "REJECTED")}
                              disabled={actionLoadingId === order.orderId}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-[11px] transition shadow-sm disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">
                            Decided by {order.decisionSource || "admin"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin Disclaimer and Guide */}
      <div className="bg-slate-100 rounded-2xl p-4 text-xs text-slate-600 space-y-2 border border-slate-200">
        <div className="flex items-center space-x-2 text-slate-800 font-bold">
          <ShieldAlert className="w-4 h-4 text-blue-600" />
          <span>Telegram Webhook vs Dashboard Integration</span>
        </div>
        <p className="leading-relaxed">
          The merchant receives real-time verification requests directly in Telegram with 
          <code className="bg-white px-1.5 py-0.5 rounded text-slate-800 font-semibold mx-1">APPROVE</code> 
          and 
          <code className="bg-white px-1.5 py-0.5 rounded text-slate-800 font-semibold mx-1">REJECT</code> 
          inline buttons. Tapping either button in Telegram immediately updates the customer&apos;s checkout page.
          You can also approve/reject directly from this dashboard above.
        </p>
      </div>
    </div>
  );
}
