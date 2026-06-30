import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import Papa from "papaparse";
import { Bar, Pie, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js Core Dependencies
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const API_BASE_URL = "http://localhost:5000";

export default function App() {
  // Navigation & UI States
  const [page, setPage] = useState("dashboard");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");
  const [search, setSearch] = useState("");
  
  // Data Storage
  const [sales, setSales] = useState([]);       // Source 1: Main Database
  const [tableData, setTableData] = useState([]);   // Source 2: Uploaded CSV Data
  const [systemStatus, setSystemStatus] = useState("Connecting...");
  
  // Panel Toggles
  const [fileName, setFileName] = useState("");
  const [showFileForm, setShowFileForm] = useState(false);
  const [sourceType, setSourceType] = useState("CSV");

  // Form Processing States
  const [customer, setCustomer] = useState("");
  const [product, setProduct] = useState("");
  const [amount, setAmount] = useState("");
  const [editingId, setEditingId] = useState(null);

  // Sync Preferences
  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // Initial Data Load
  useEffect(() => {
    axios.get(`${API_BASE_URL}`)
      .then((res) => setSystemStatus(res.data))
      .catch(() => setSystemStatus("Offline Sandbox"));

    fetchDatabaseRecords();
  }, []);

  const fetchDatabaseRecords = () => {
    axios.get(`${API_BASE_URL}/sales`)
      .then((res) => setSales(res.data))
      .catch((err) => console.error("Database connection fault:", err));
  };

  // Performance Calculations
  const computedMetrics = useMemo(() => {
    const liveRevenue = sales.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const csvRevenue = tableData.reduce((sum, item) => sum + Number(item.amount || item.Amount || 0), 0);
    return { liveRevenue, csvRevenue };
  }, [sales, tableData]);

  // CRUD Actions Matrix
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!customer.trim() || !product.trim() || !amount || Number(amount) <= 0) {
      window.alert("Please fill in all fields with valid information.");
      return;
    }

    const payload = { customer: customer.trim(), product: product.trim(), amount: Number(amount) };

    if (editingId) {
      axios.put(`${API_BASE_URL}/sales/${editingId}`, payload)
        .then(() => {
          setSales(sales.map((s) => (s.id === editingId ? { ...s, ...payload } : s)));
          resetFormInputs();
        })
        .catch((err) => console.error("Update error:", err));
    } else {
      axios.post(`${API_BASE_URL}/sales`, payload)
        .then((res) => {
          const verifiedRow = res.data?.id ? res.data : { ...payload, id: Date.now() };
          setSales([...sales, verifiedRow]);
          resetFormInputs();
        })
        .catch((err) => console.error("Insert error:", err));
    }
  };

  const handleDeleteRecord = (id) => {
    if (window.confirm("Are you sure you want to delete this record permanently?")) {
      axios.delete(`${API_BASE_URL}/sales/${id}`)
        .then(() => setSales(sales.filter((s) => s.id !== id)))
        .catch((err) => console.error("Delete error:", err));
    }
  };

  const resetFormInputs = () => {
    setEditingId(null);
    setCustomer("");
    setProduct("");
    setAmount("");
  };

  // CSV Processing
  const handleCsvIngestion = (e) => {
    const operationalFile = e.target.files[0];
    if (!operationalFile) return;
    setFileName(operationalFile.name);

    Papa.parse(operationalFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => setTableData(results.data),
      error: (err) => window.alert(`File upload error: ${err.message}`)
    });
  };

  // Export Engine
  const triggerExportReport = () => {
    if (!sales.length) return window.alert("Cannot export an empty data grid.");
    const rowBuffer = "Customer,Product,Amount\n" + 
      sales.map(s => `"${s.customer}","${s.product}",${s.amount}`).join("\n");
    
    const contextBlob = new Blob([rowBuffer], { type: "text/csv;charset=utf-8;" });
    const extractionHook = document.createElement("a");
    extractionHook.href = URL.createObjectURL(contextBlob);
    extractionHook.download = `BI_Pulse_Report_${Date.now()}.csv`;
    extractionHook.click();
  };

  // Modern UI Colors
  const palette = {
    bg: darkMode ? "#090d16" : "#f1f5f9",
    sidebar: "#0f172a",
    card: darkMode ? "#111a2e" : "#ffffff",
    text: darkMode ? "#f8fafc" : "#0f172a",
    muted: darkMode ? "#64748b" : "#94a3b8",
    border: darkMode ? "#1e293b" : "#e2e8f0",
    inputBg: darkMode ? "#090d16" : "#f8fafc"
  };

  // Chart Properties
  const barChartLayout = {
    labels: sales.map(s => s.customer),
    datasets: [{
      label: "Sales Distribution (₹)",
      data: sales.map(s => s.amount),
      backgroundColor: "rgba(37, 99, 235, 0.85)",
      borderRadius: 6
    }]
  };

  const lineChartLayout = {
    labels: sales.map(s => s.customer),
    datasets: [{
      label: "Revenue Performance Curve",
      data: sales.map(s => s.amount),
      borderColor: "#10b981",
      backgroundColor: "rgba(16, 185, 129, 0.04)",
      fill: true,
      tension: 0.25
    }]
  };

  const pieChartLayout = {
    labels: [...new Set(sales.map(s => s.product))],
    datasets: [{
      data: sales.map(s => s.amount),
      backgroundColor: ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]
    }]
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: palette.bg, color: palette.text, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", transition: "background-color 0.2s ease" }}>
      
      {/* SIDEBAR NAVIGATION */}
      <aside style={{ width: "260px", backgroundColor: palette.sidebar, color: "#ffffff", padding: "30px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between", borderRight: "1px solid #1e293b", flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" }}>
            <span style={{ fontSize: "24px" }}>⚡</span>
            <span style={{ fontSize: "21px", fontWeight: "800", letterSpacing: "-0.03em", color: "#38bdf8" }}>BI-Pulse Console</span>
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { id: "dashboard", name: "Overview Dashboard", icon: "💎" },
              { id: "analytics", name: "Analytics & Trends", icon: "📈" },
              { id: "customers", name: "Customer Directory", icon: "👥" },
              { id: "orders", name: "Order Tracking", icon: "📦" },
              { id: "settings", name: "System Settings", icon: "⚙️" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setPage(tab.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "14px", padding: "12px 16px", borderRadius: "8px", border: "none", fontSize: "14px", fontWeight: "500", textAlign: "left", cursor: "pointer", transition: "all 0.15s ease",
                  backgroundColor: page === tab.id ? "#2563eb" : "transparent",
                  color: page === tab.id ? "#ffffff" : "#94a3b8"
                }}
              >
                <span style={{ fontSize: "16px" }}>{tab.icon}</span> {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #1e293b", paddingTop: "20px" }}>
          <span style={{ fontSize: "11px", color: "#475569", fontFamily: "monospace" }}>v1.0.0</span>
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            style={{ background: "none", border: "none", fontSize: "16px", cursor: "pointer", padding: "8px", borderRadius: "6px", backgroundColor: "#1e293b", color: "#fff" }}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>
      </aside>

      {/* VIEWPORT CONTROLLER */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        
        {/* APP HEADER */}
        <header style={{ height: "70px", backgroundColor: palette.card, borderBottom: `1px solid ${palette.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", transition: "all 0.2s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <h1 style={{ fontSize: "16px", fontWeight: "600", margin: 0 }}>Management Console</h1>
            <span style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "12px", fontWeight: "600", fontFamily: "monospace", backgroundColor: systemStatus.includes("Offline") ? "rgba(245,158,11,0.12)" : "rgba(16,185,129,0.12)", color: systemStatus.includes("Offline") ? "#f59e0b" : "#10b981" }}>
              ● {systemStatus}
            </span>
          </div>

          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: palette.muted, fontSize: "13px" }}>🔍</span>
            <input
              type="text"
              placeholder="Search records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "280px", padding: "10px 14px 10px 38px", boxSizing: "border-box", borderRadius: "8px", border: `1px solid ${palette.border}`, backgroundColor: palette.bg, color: palette.text, fontSize: "13px", outline: "none" }}
            />
          </div>
        </header>

        {/* DATA UTILITIES (Import / Export) */}
        <div style={{ padding: "35px 40px 0 40px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "20px", backgroundColor: palette.card, border: `1px solid ${palette.border}`, padding: "20px", borderRadius: "14px" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setShowFileForm(!showFileForm)} style={{ padding: "10px 20px", backgroundColor: "#0f172a", color: "#ffffff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
                📥 Import Data
              </button>
              <button onClick={triggerExportReport} style={{ padding: "10px 20px", backgroundColor: "transparent", color: palette.text, border: `1px solid ${palette.border}`, borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
                📤 Export to CSV
              </button>
            </div>

            {showFileForm && (
              <div style={{ display: "flex", alignItems: "center", gap: "14px", backgroundColor: palette.inputBg, padding: "10px", borderRadius: "8px", border: `1px solid ${palette.border}` }}>
                <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: `1px solid ${palette.border}`, backgroundColor: palette.card, color: palette.text, fontSize: "12px", fontWeight: "500" }}>
                  <option value="CSV">Local CSV File</option>
                  <option value="DB">Database Connection</option>
                  <option value="API">External API Endpoint</option>
                </select>
                <input type="file" accept=".csv" onChange={handleCsvIngestion} style={{ fontSize: "12px", color: palette.muted }} />
                {fileName && <span style={{ fontSize: "11px", color: "#10b981", fontWeight: "600" }}>✓ Selected: {fileName}</span>}
              </div>
            )}
          </div>
        </div>

        {/* CONTAINER ROUTING PAGES */}
        <div style={{ flex: 1, padding: "35px 40px" }}>
          
          {/* VIEW: MAIN DASHBOARD */}
          {page === "dashboard" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "35px" }}>
              
              {/* CLEAN KPI MONITORING METRICS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
                {[
                  { label: "Total Revenue", value: `₹${computedMetrics.liveRevenue.toLocaleString()}`, color: "#2563eb", notice: "▲ 12.4% vs last month" },
                  { label: "Total Customers", value: sales.length, color: "#10b981", notice: "+8.2% new users" },
                  { label: "Active Transactions", value: sales.length, color: "#8b5cf6", notice: "System healthy" },
                  { label: "Imported Data Value", value: `₹${computedMetrics.csvRevenue.toLocaleString()}`, color: "#f59e0b", notice: "Staged from file" }
                ].map((kpi, idx) => (
                  <div key={idx} style={{ backgroundColor: palette.card, border: `1px solid ${palette.border}`, borderRadius: "14px", padding: "24px" }}>
                    <span style={{ fontSize: "11px", textTransform: "uppercase", color: palette.muted, fontWeight: "600", letterSpacing: "0.05em" }}>{kpi.label}</span>
                    <h2 style={{ fontSize: "28px", fontWeight: "700", margin: "10px 0", color: kpi.color }}>{kpi.value}</h2>
                    <small style={{ fontSize: "11px", fontWeight: "500", color: palette.muted }}>{kpi.notice}</small>
                  </div>
                ))}
              </div>

              {/* DATA ENTRY FORM & SYSTEM RECORDS */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "35px" }}>
                
                {/* TRANSACTION INPUT FORM */}
                <div style={{ backgroundColor: palette.card, border: `1px solid ${palette.border}`, borderRadius: "14px", padding: "28px" }}>
                  <h3 style={{ margin: "0 0 20px 0", fontSize: "15px", fontWeight: "600" }}>
                    {editingId ? "✏️ Edit Record Details" : "➕ Add New Transaction Entry"}
                  </h3>
                  <form onSubmit={handleFormSubmit} style={{ display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "flex-end" }}>
                    <div style={{ flex: 1, minWidth: "220px" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: palette.muted, marginBottom: "8px" }}>Customer Name</label>
                      <input type="text" placeholder="e.g. John Doe" value={customer} onChange={(e) => setCustomer(e.target.value)} style={{ width: "100%", padding: "10px 14px", boxSizing: "border-box", borderRadius: "8px", border: `1px solid ${palette.border}`, backgroundColor: palette.inputBg, color: palette.text, fontSize: "13px", outline: "none" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: "220px" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: palette.muted, marginBottom: "8px" }}>Product Category</label>
                      <input type="text" placeholder="e.g. Software License" value={product} onChange={(e) => setProduct(e.target.value)} style={{ width: "100%", padding: "10px 14px", boxSizing: "border-box", borderRadius: "8px", border: `1px solid ${palette.border}`, backgroundColor: palette.inputBg, color: palette.text, fontSize: "13px", outline: "none" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: "160px" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: palette.muted, marginBottom: "8px" }}>Amount (INR)</label>
                      <input type="number" placeholder="Value in ₹" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: "100%", padding: "10px 14px", boxSizing: "border-box", borderRadius: "8px", border: `1px solid ${palette.border}`, backgroundColor: palette.inputBg, color: palette.text, fontSize: "13px", outline: "none" }} />
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button type="submit" style={{ padding: "11px 24px", backgroundColor: "#2563eb", color: "#ffffff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
                        {editingId ? "Save Changes" : "Add Transaction"}
                      </button>
                      {editingId && (
                        <button type="button" onClick={resetFormInputs} style={{ padding: "11px 16px", backgroundColor: "transparent", color: palette.text, border: `1px solid ${palette.border}`, borderRadius: "8px", fontSize: "13px", cursor: "pointer" }}>Cancel</button>
                      )}
                    </div>
                  </form>
                </div>

                {/* PRIMARY DATA TABLE */}
                <div style={{ backgroundColor: palette.card, border: `1px solid ${palette.border}`, borderRadius: "14px", overflow: "hidden" }}>
                  <div style={{ padding: "20px 28px", borderBottom: `1px solid ${palette.border}`, backgroundColor: "rgba(0,0,0,0.01)" }}>
                    <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>Sales Record Ledger</h3>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${palette.border}`, backgroundColor: "rgba(0,0,0,0.01)", color: palette.muted }}>
                          <th style={{ padding: "14px 28px" }}>Customer</th>
                          <th style={{ padding: "14px 28px" }}>Product / Service</th>
                          <th style={{ padding: "14px 28px" }}>Revenue Amount</th>
                          <th style={{ padding: "14px 28px", textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales
                          .filter(s => s.customer?.toLowerCase().includes(search.toLowerCase()))
                          .map((row) => (
                            <tr key={row.id} style={{ borderBottom: `1px solid ${palette.border}` }}>
                              <td style={{ padding: "16px 28px", fontWeight: "600" }}>{row.customer}</td>
                              <td style={{ padding: "16px 28px", color: palette.muted }}>{row.product}</td>
                              <td style={{ padding: "16px 28px", fontWeight: "600", color: "#2563eb" }}>₹{Number(row.amount).toLocaleString()}</td>
                              <td style={{ padding: "16px 28px", textAlign: "right" }}>
                                <button onClick={() => { setEditingId(row.id); setCustomer(row.customer); setProduct(row.product); setAmount(row.amount); }} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "12px", fontWeight: "600", marginRight: "16px" }}>Edit</button>
                                <button onClick={() => handleDeleteRecord(row.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>Delete</button>
                              </td>
                            </tr>
                          ))}
                        {sales.length === 0 && (
                          <tr>
                            <td colSpan="4" style={{ padding: "50px", textAlign: "center", color: palette.muted, fontWeight: "500" }}>No records found. Please add a transaction using the input fields above.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* UPLOADED FILE VIEW WORKSPACE */}
              {tableData.length > 0 && (
                <div style={{ backgroundColor: palette.card, border: `1px solid ${palette.border}`, borderRadius: "14px", overflow: "hidden" }}>
                  <div style={{ padding: "16px 28px", borderBottom: `1px solid ${palette.border}`, display: "flex", gap: "12px", alignItems: "center" }}>
                    <span style={{ color: "#f59e0b" }}>📝</span>
                    <h3 style={{ margin: 0, fontSize: "13px", fontWeight: "600" }}>Uploaded CSV File Preview Data</h3>
                  </div>
                  <div style={{ maxHeight: "320px", overflowY: "auto", overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                      <thead>
                        <tr style={{ backgroundColor: palette.bg, borderBottom: `1px solid ${palette.border}`, textTransform: "uppercase" }}>
                          {Object.keys(tableData[0]).map((heading) => <th key={heading} style={{ padding: "12px 20px", textAlign: "left" }}>{heading}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData
                          .filter(r => Object.values(r).join(" ").toLowerCase().includes(search.toLowerCase()))
                          .map((row, index) => (
                            <tr key={index} style={{ borderBottom: `1px solid ${palette.border}` }}>
                              {Object.values(row).map((val, idx) => <td key={idx} style={{ padding: "12px 20px", color: palette.muted }}>{String(val)}</td>)}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: VISUAL ANALYTICS */}
          {page === "analytics" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "35px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700" }}>BI-Pulse Trends & Performance Metrics</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "35px", alignItems: "start" }}>
                <div style={{ backgroundColor: palette.card, border: `1px solid ${palette.border}`, padding: "24px", borderRadius: "14px" }}>
                  <h4 style={{ fontSize: "11px", textTransform: "uppercase", color: palette.muted, margin: "0 0 20px 0" }}>Sales Distribution by Volume</h4>
                  <Bar data={barChartLayout} options={{ responsive: true }} />
                </div>
                <div style={{ backgroundColor: palette.card, border: `1px solid ${palette.border}`, padding: "24px", borderRadius: "14px" }}>
                  <h4 style={{ fontSize: "11px", textTransform: "uppercase", color: palette.muted, margin: "0 0 20px 0" }}>Product Category Share</h4>
                  <Pie data={pieChartLayout} options={{ responsive: true }} />
                </div>
              </div>
              <div style={{ backgroundColor: palette.card, border: `1px solid ${palette.border}`, padding: "24px", borderRadius: "14px" }}>
                <h4 style={{ fontSize: "11px", textTransform: "uppercase", color: palette.muted, margin: "0 0 20px 0" }}>Revenue Performance Curve Over Time</h4>
                <Line data={lineChartLayout} options={{ responsive: true }} />
              </div>
            </div>
          )}

          {/* VIEW: CUSTOMER REGISTERS */}
          {page === "customers" && (
            <div style={{ backgroundColor: palette.card, border: `1px solid ${palette.border}`, borderRadius: "14px", overflow: "hidden" }}>
              <div style={{ padding: "24px 28px", borderBottom: `1px solid ${palette.border}` }}>
                <h2 style={{ fontSize: "16px", fontWeight: "700", margin: 0 }}>Customer Directory</h2>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${palette.border}`, backgroundColor: "rgba(0,0,0,0.01)", color: palette.muted }}>
                    <th style={{ padding: "14px 28px" }}>Name</th>
                    <th style={{ padding: "14px 28px" }}>Email Endpoint</th>
                    <th style={{ padding: "14px 28px" }}>Account Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { n: "Rahul Sharma", e: "rahul.sharma@enterprise.in", s: "Active", c: "rgba(16,185,129,0.12)", tc: "#10b981" },
                    { n: "Priyanka Patel", e: "priyanka.p@analytics.org", s: "Active", c: "rgba(16,185,129,0.12)", tc: "#10b981" },
                    { n: "Amit Verma", e: "amit.verma@datacloud.net", s: "Inactive", c: "rgba(239,68,68,0.12)", tc: "#ef4444" }
                  ].map((client, index) => (
                    <tr key={index} style={{ borderBottom: `1px solid ${palette.border}` }}>
                      <td style={{ padding: "16px 28px", fontWeight: "600" }}>{client.n}</td>
                      <td style={{ padding: "16px 28px", color: palette.muted }}>{client.e}</td>
                      <td style={{ padding: "16px 28px" }}><span style={{ fontSize: "11px", fontWeight: "600", padding: "4px 10px", borderRadius: "12px", backgroundColor: client.c, color: client.tc }}>{client.s}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW: ORDERS */}
          {page === "orders" && (
            <div style={{ backgroundColor: palette.card, border: `1px solid ${palette.border}`, borderRadius: "14px", overflow: "hidden" }}>
              <div style={{ padding: "24px 28px", borderBottom: `1px solid ${palette.border}` }}>
                <h2 style={{ fontSize: "16px", fontWeight: "700", margin: 0 }}>Order Tracking Fulfillment</h2>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${palette.border}`, backgroundColor: "rgba(0,0,0,0.01)", color: palette.muted }}>
                    <th style={{ padding: "14px 28px" }}>Order ID</th>
                    <th style={{ padding: "14px 28px" }}>Item Description</th>
                    <th style={{ padding: "14px 28px" }}>Transaction Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: "ORD-9021", item: "Enterprise Server Compute Hub v2", price: "₹55,000" },
                    { id: "ORD-8842", item: "Mobile Router Communicator Module", price: "₹25,000" },
                    { id: "ORD-1102", item: "Ambient Acoustic Damping Array", price: "₹3,000" }
                  ].map((order, index) => (
                    <tr key={index} style={{ borderBottom: `1px solid ${palette.border}` }}>
                      <td style={{ padding: "16px 28px", fontWeight: "700", color: "#2563eb" }}>{order.id}</td>
                      <td style={{ padding: "16px 28px" }}>{order.item}</td>
                      <td style={{ padding: "16px 28px", fontWeight: "600" }}>{order.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW: SETTINGS */}
          {page === "settings" && (
            <div style={{ backgroundColor: palette.card, border: `1px solid ${palette.border}`, padding: "35px", borderRadius: "14px", maxWidth: "560px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "22px" }}>Global Dashboard Configurations</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {[
                  "Enable automated email alerts for high-value sales",
                  "Use multi-threaded background processing for graphs",
                  "Execute scheduled automatic data backups every 24 hours"
                ].map((text, idx) => (
                  <label key={idx} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px", backgroundColor: palette.bg, borderRadius: "8px", border: `1px solid ${palette.border}`, cursor: "pointer", fontSize: "13px", fontWeight: "500" }}>
                    <input type="checkbox" defaultChecked={idx !== 1} style={{ width: "16px", height: "16px", cursor: "pointer" }} />
                    <span>{text}</span>
                  </label>
                ))}
              </div>
              <button style={{ marginTop: "28px", width: "100%", padding: "14px", backgroundColor: "#2563eb", color: "#ffffff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
                Save Configurations
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}