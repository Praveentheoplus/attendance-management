import { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  collection, addDoc, getDocs, writeBatch, doc, deleteDoc
} from "firebase/firestore";
import Papa from "papaparse";

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const PERIODS = ["Period 1", "Period 2", "Period 3", "Period 4",
                 "Period 5", "Period 6", "Period 7", "Period 8"];

export default function StaffDashboard() {
  const [activePage, setActivePage] = useState("dashboard");
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <div className="w-64 bg-indigo-900 text-white flex flex-col">
        <div className="p-6 border-b border-indigo-700">
          <h1 className="text-xl font-bold">Attendance System</h1>
          <p className="text-indigo-300 text-sm mt-1">Staff Panel</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "students", label: "Students" },
            { id: "attendance", label: "Mark Attendance" },
            { id: "reports", label: "Reports" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${
                activePage === item.id
                  ? "bg-indigo-600 text-white"
                  : "text-indigo-200 hover:bg-indigo-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-indigo-700">
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-3 rounded-lg text-indigo-200 hover:bg-indigo-700 transition"
          >
             Logout
          </button>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-auto">
        {activePage === "dashboard" && <DashboardHome />}
        {activePage === "students" && <Students />}
        {activePage === "attendance" && <MarkAttendance />}
        {activePage === "reports" && <Reports />}
      </div>
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────
function DashboardHome() {
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [yearStats, setYearStats] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const studentsSnap = await getDocs(collection(db, "students"));
      const students = studentsSnap.docs.map((d) => d.data());
      setTotalStudents(students.length);
      const attendanceSnap = await getDocs(collection(db, "attendance"));
      setTotalSessions(attendanceSnap.size);
      const stats = YEARS.map((year) => ({
        year,
        count: students.filter((s) => s.year === year).length,
      }));
      setYearStats(stats);
    };
    fetch();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Overview</h2>
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="w-10 h-10 bg-indigo-500 rounded-lg mb-4"></div>
          <p className="text-gray-500 text-sm">Total Students</p>
          <p className="text-3xl font-bold text-gray-800">{totalStudents}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <div className="w-10 h-10 bg-green-500 rounded-lg mb-4"></div>
          <p className="text-gray-500 text-sm">Attendance Sessions</p>
          <p className="text-3xl font-bold text-gray-800">{totalSessions}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <div className="w-10 h-10 bg-amber-500 rounded-lg mb-4"></div>
          <p className="text-gray-500 text-sm">Periods Per Day</p>
          <p className="text-3xl font-bold text-gray-800">8</p>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Students by Year</h3>
        <div className="grid grid-cols-4 gap-4">
          {yearStats.map((s) => (
            <div key={s.year} className="bg-indigo-50 rounded-lg p-4 text-center">
              <p className="text-indigo-600 font-semibold">{s.year}</p>
              <p className="text-2xl font-bold text-indigo-800 mt-1">{s.count}</p>
              <p className="text-indigo-400 text-xs">students</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── STUDENTS ────────────────────────────────────────────────
function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", rollNo: "", department: "", year: "1st Year" });
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filterYear, setFilterYear] = useState("All");
  const [filterDept, setFilterDept] = useState("All");
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvSuccess, setCsvSuccess] = useState("");
  const [csvError, setCsvError] = useState("");
  const fileRef = useRef();

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, "students"));
    setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.name || !form.rollNo || !form.department) return;
    setAdding(true);
    await addDoc(collection(db, "students"), { ...form, createdAt: new Date() });
    try {
      await fetch("http://localhost:5000/api/create-students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: [form] }),
      });
    } catch (err) {
      console.error("Account creation failed:", err);
    }
    setForm({ name: "", rollNo: "", department: "", year: "1st Year" });
    setShowForm(false);
    await fetchStudents();
    setAdding(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this student?")) return;
    await deleteDoc(doc(db, "students", id));
    await fetchStudents();
  };

  const handleCSV = (e) => {
    setCsvError("");
    setCsvSuccess("");
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const required = ["name", "rollNo", "department", "year"];
        const headers = Object.keys(results.data[0] || {});
        const missing = required.filter((r) => !headers.includes(r));
        if (missing.length > 0) {
          setCsvError(`Missing columns: ${missing.join(", ")}`);
          setCsvPreview([]);
          return;
        }
        setCsvPreview(results.data);
      },
    });
  };

  const handleCSVUpload = async () => {
    if (csvPreview.length === 0) return;
    setCsvUploading(true);
    setCsvError("");
    try {
      const batch = writeBatch(db);
      csvPreview.forEach((row) => {
        const ref = doc(collection(db, "students"));
        batch.set(ref, {
          name: row.name,
          rollNo: row.rollNo,
          department: row.department,
          year: row.year,
          createdAt: new Date(),
        });
      });
      await batch.commit();

      const response = await fetch("http://localhost:5000/api/create-students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: csvPreview }),
      });
      const data = await response.json();
      const created = data.results.filter((r) => r.status === "created").length;
      const skipped = data.results.filter((r) => r.status === "skipped").length;
      setCsvSuccess(`✅ ${csvPreview.length} students imported! ${created} accounts created, ${skipped} skipped.`);
      setCsvPreview([]);
      if (fileRef.current) fileRef.current.value = "";
      await fetchStudents();
    } catch (err) {
      setCsvError("Failed to create accounts. Make sure the server is running.");
    }
    setCsvUploading(false);
  };

  const departments = ["All", ...new Set(students.map((s) => s.department))];
  const filtered = students.filter((s) => {
    return (filterYear === "All" || s.year === filterYear) &&
           (filterDept === "All" || s.department === filterDept);
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Students</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
        >
          + Add Student
        </button>
      </div>

      {/* CSV Import */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">📁 Import via CSV</h3>
        <p className="text-sm text-gray-400 mb-1">
          CSV must have columns: <code className="bg-gray-100 px-1 rounded">name, rollNo, department, year</code>
        </p>
        <p className="text-sm text-green-600 mb-3">
          ✅ Student login accounts are created automatically. Email: rollNo@college.com / Password: rollNo
        </p>
        <button
          onClick={() => {
            const csv = "name,rollNo,department,year\nRahul Kumar,21IT001,IT,1st Year\nPriya S,21IT002,IT,1st Year";
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "sample_students.csv";
            a.click();
          }}
          className="text-indigo-600 underline text-sm mb-3 block"
        >
          ⬇️ Download sample CSV
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleCSV}
          className="block mb-3 text-sm text-gray-600"
        />
        {csvError && (
          <div className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm mb-3">{csvError}</div>
        )}
        {csvSuccess && (
          <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm mb-3">{csvSuccess}</div>
        )}
        {csvPreview.length > 0 && (
          <div>
            <p className="text-sm text-gray-500 mb-2">Preview — {csvPreview.length} students found:</p>
            <div className="overflow-auto max-h-48 border border-gray-200 rounded-lg mb-3">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-gray-600">Name</th>
                    <th className="text-left px-4 py-2 text-gray-600">Roll No</th>
                    <th className="text-left px-4 py-2 text-gray-600">Department</th>
                    <th className="text-left px-4 py-2 text-gray-600">Year</th>
                  </tr>
                </thead>
                <tbody>
                  {csvPreview.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-4 py-2">{row.name}</td>
                      <td className="px-4 py-2">{row.rollNo}</td>
                      <td className="px-4 py-2">{row.department}</td>
                      <td className="px-4 py-2">{row.year}</td>
                    </tr>
                  ))}
                  {csvPreview.length > 5 && (
                    <tr><td colSpan="4" className="px-4 py-2 text-gray-400 text-center">...and {csvPreview.length - 5} more</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <button
              onClick={handleCSVUpload}
              disabled={csvUploading}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm"
            >
              {csvUploading ? "Uploading..." : `⬆️ Import ${csvPreview.length} Students`}
            </button>
          </div>
        )}
      </div>

      {/* Manual Add Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">New Student</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              placeholder="Full Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
              placeholder="Roll Number"
              value={form.rollNo}
              onChange={(e) => setForm({ ...form, rollNo: e.target.value })}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
              placeholder="Department (e.g. IT, CSE)"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <select
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {YEARS.map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
          <button
            onClick={handleAdd}
            disabled={adding}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
          >
            {adding ? "Saving..." : "Save Student"}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none"
        >
          <option value="All">All Years</option>
          {YEARS.map((y) => <option key={y}>{y}</option>)}
        </select>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none"
        >
          {departments.map((d) => <option key={d}>{d}</option>)}
        </select>
        <span className="ml-auto text-gray-500 self-center">{filtered.length} students</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-indigo-50">
            <tr>
              <th className="text-left px-6 py-4 text-indigo-700 font-semibold">#</th>
              <th className="text-left px-6 py-4 text-indigo-700 font-semibold">Name</th>
              <th className="text-left px-6 py-4 text-indigo-700 font-semibold">Roll No</th>
              <th className="text-left px-6 py-4 text-indigo-700 font-semibold">Department</th>
              <th className="text-left px-6 py-4 text-indigo-700 font-semibold">Year</th>
              <th className="text-left px-6 py-4 text-indigo-700 font-semibold">Login</th>
              <th className="text-left px-6 py-4 text-indigo-700 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-400">No students found.</td></tr>
            ) : (
              filtered.map((s, i) => (
                <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-500">{i + 1}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">{s.name}</td>
                  <td className="px-6 py-4 text-gray-600">{s.rollNo}</td>
                  <td className="px-6 py-4 text-gray-600">{s.department}</td>
                  <td className="px-6 py-4">
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs font-semibold">
                      {s.year}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">
                    {s.rollNo.toLowerCase()}@college.com
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1 rounded-lg text-sm font-semibold"
                    >
                       Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── MARK ATTENDANCE ─────────────────────────────────────────
function MarkAttendance() {
  const [step, setStep] = useState(1);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [departments, setDepartments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchDepts = async () => {
      const snap = await getDocs(collection(db, "students"));
      const all = snap.docs.map((d) => d.data());
      const depts = [...new Set(all.map((s) => s.department))];
      setDepartments(depts);
    };
    fetchDepts();
  }, []);

  const fetchStudents = async () => {
    const snap = await getDocs(collection(db, "students"));
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const filtered = all.filter(
      (s) => s.year === selectedYear && s.department === selectedDept
    );
    setStudents(filtered);
    const initial = {};
    filtered.forEach((s) => (initial[s.id] = "present"));
    setAttendance(initial);
    setStep(2);
  };

  const toggle = (id) => {
    setAttendance((prev) => ({
      ...prev,
      [id]: prev[id] === "present" ? "absent" : "present",
    }));
  };

  const markAll = (status) => {
    const updated = {};
    students.forEach((s) => (updated[s.id] = status));
    setAttendance(updated);
  };

  const handleSave = async () => {
    if (!selectedSubject) return alert("Please enter subject name.");
    setSaving(true);
    const records = students.map((s) => ({
      studentId: s.id,
      studentName: s.name,
      rollNo: s.rollNo,
      status: attendance[s.id],
    }));
    await addDoc(collection(db, "attendance"), {
      year: selectedYear,
      department: selectedDept,
      period: selectedPeriod,
      subject: selectedSubject,
      date,
      records,
      createdAt: new Date(),
    });
    setSaved(true);
    setSaving(false);
    setTimeout(() => { setSaved(false); setStep(1); }, 2000);
  };

  const presentCount = Object.values(attendance).filter((v) => v === "present").length;
  const absentCount = Object.values(attendance).filter((v) => v === "absent").length;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Mark Attendance</h2>

      {saved && (
        <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg mb-4">
          ✅ Attendance saved! Returning to selection...
        </div>
      )}

      {step === 1 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Select Class & Period</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">Select Year</option>
                {YEARS.map((y) => <option key={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">Select Department</option>
                {departments.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">Select Period</option>
                {PERIODS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                placeholder="e.g. Data Structures"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
          <button
            onClick={fetchStudents}
            disabled={!selectedYear || !selectedDept || !selectedPeriod}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
          >
            Load Students →
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="bg-indigo-50 rounded-xl p-4 mb-4 flex flex-wrap gap-4 items-center">
            <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm">{selectedYear}</span>
            <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm">{selectedDept}</span>
            <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm">{selectedPeriod}</span>
            <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm">{selectedSubject}</span>
            <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm">{date}</span>
            <button onClick={() => setStep(1)} className="ml-auto text-indigo-600 underline text-sm">← Change</button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <p className="text-gray-500 text-sm">Total</p>
              <p className="text-2xl font-bold text-gray-800">{students.length}</p>
            </div>
            <div className="bg-green-50 rounded-xl shadow p-4 text-center">
              <p className="text-green-600 text-sm">Present</p>
              <p className="text-2xl font-bold text-green-700">{presentCount}</p>
            </div>
            <div className="bg-red-50 rounded-xl shadow p-4 text-center">
              <p className="text-red-600 text-sm">Absent</p>
              <p className="text-2xl font-bold text-red-700">{absentCount}</p>
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            <button onClick={() => markAll("present")} className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-200">
              ✅ Mark All Present
            </button>
            <button onClick={() => markAll("absent")} className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-200">
              ❌ Mark All Absent
            </button>
          </div>

          <div className="bg-white rounded-xl shadow overflow-hidden mb-6">
            <table className="w-full">
              <thead className="bg-indigo-50">
                <tr>
                  <th className="text-left px-6 py-4 text-indigo-700 font-semibold">#</th>
                  <th className="text-left px-6 py-4 text-indigo-700 font-semibold">Name</th>
                  <th className="text-left px-6 py-4 text-indigo-700 font-semibold">Roll No</th>
                  <th className="text-left px-6 py-4 text-indigo-700 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-8 text-gray-400">No students found for this class.</td></tr>
                ) : (
                  students.map((s, i) => (
                    <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-500">{i + 1}</td>
                      <td className="px-6 py-4 font-medium text-gray-800">{s.name}</td>
                      <td className="px-6 py-4 text-gray-600">{s.rollNo}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggle(s.id)}
                          className={`px-4 py-1 rounded-full text-sm font-semibold transition ${
                            attendance[s.id] === "present"
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-red-100 text-red-700 hover:bg-red-200"
                          }`}
                        >
                          {attendance[s.id] === "present" ? "✅ Present" : "❌ Absent"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || students.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Attendance"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── REPORTS ─────────────────────────────────────────────────
function Reports() {
  const [filterYear, setFilterYear] = useState("1st Year");
  const [filterDept, setFilterDept] = useState("");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [departments, setDepartments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDepts = async () => {
      const snap = await getDocs(collection(db, "students"));
      const all = snap.docs.map((d) => d.data());
      const depts = [...new Set(all.map((s) => s.department))];
      setDepartments(depts);
      if (depts.length > 0) setFilterDept(depts[0]);
    };
    fetchDepts();
  }, []);

  useEffect(() => {
    if (filterDept) fetchReport();
  }, [filterYear, filterDept, filterDate]);

  const fetchReport = async () => {
    setLoading(true);
    const studSnap = await getDocs(collection(db, "students"));
    const allStudents = studSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((s) => s.year === filterYear && s.department === filterDept);
    setStudents(allStudents);

    const attSnap = await getDocs(collection(db, "attendance"));
    const daySessions = attSnap.docs
      .map((d) => d.data())
      .filter((s) => s.date === filterDate && s.year === filterYear && s.department === filterDept);
    setSessions(daySessions);
    setLoading(false);
  };

  const getStudentStatus = (studentId, period) => {
    const session = sessions.find((s) => s.period === period);
    if (!session) return null;
    const record = session.records?.find((r) => r.studentId === studentId);
    return record ? record.status : null;
  };

  const getDayPercentage = (studentId) => {
    const total = sessions.length;
    if (total === 0) return null;
    const present = sessions.filter((s) => {
      const r = s.records?.find((r) => r.studentId === studentId);
      return r && r.status === "present";
    }).length;
    return Math.round((present / total) * 100);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Daily Attendance Report</h2>
        <button
          onClick={() => window.print()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
        >
          🖨️ Print / Save PDF
        </button>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap gap-4">
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none"
        >
          {YEARS.map((y) => <option key={y}>{y}</option>)}
        </select>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none"
        >
          {departments.map((d) => <option key={d}>{d}</option>)}
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none"
        />
      </div>

      {sessions.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <h3 className="text-md font-semibold text-gray-700 mb-3">Periods Conducted Today</h3>
          <div className="flex flex-wrap gap-3">
            {PERIODS.map((p) => {
              const session = sessions.find((s) => s.period === p);
              return session ? (
                <div key={p} className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2 text-sm">
                  <p className="font-semibold text-indigo-700">{p}</p>
                  <p className="text-indigo-500">{session.subject}</p>
                </div>
              ) : (
                <div key={p} className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm">
                  <p className="font-semibold text-gray-400">{p}</p>
                  <p className="text-gray-300">Not conducted</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-indigo-50">
            <tr>
              <th className="text-left px-4 py-3 text-indigo-700 font-semibold">#</th>
              <th className="text-left px-4 py-3 text-indigo-700 font-semibold">Name</th>
              <th className="text-left px-4 py-3 text-indigo-700 font-semibold">Roll No</th>
              {PERIODS.map((p) => (
                <th key={p} className="text-center px-3 py-3 text-indigo-700 font-semibold">
                  {p.replace("Period ", "P")}
                </th>
              ))}
              <th className="text-center px-4 py-3 text-indigo-700 font-semibold">Day %</th>
              <th className="text-center px-4 py-3 text-indigo-700 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="13" className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan="13" className="text-center py-8 text-gray-400">No students found.</td></tr>
            ) : sessions.length === 0 ? (
              <tr><td colSpan="13" className="text-center py-8 text-gray-400">No attendance marked for this date.</td></tr>
            ) : (
              students.map((s, i) => {
                const pct = getDayPercentage(s.id);
                return (
                  <tr key={s.id} className={`border-t border-gray-100 ${pct !== null && pct < 75 ? "bg-red-50" : ""}`}>
                    <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                    <td className="px-4 py-3 text-gray-600">{s.rollNo}</td>
                    {PERIODS.map((p) => {
                      const status = getStudentStatus(s.id, p);
                      return (
                        <td key={p} className="text-center px-3 py-3">
                          {status === "present" ? (
                            <span className="text-green-600 font-bold">P</span>
                          ) : status === "absent" ? (
                            <span className="text-red-600 font-bold">A</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="text-center px-4 py-3 font-bold">
                      {pct !== null ? (
                        <span className={pct >= 75 ? "text-green-600" : "text-red-600"}>{pct}%</span>
                      ) : "—"}
                    </td>
                    <td className="text-center px-4 py-3">
                      {pct !== null ? (
                        pct >= 75
                          ? <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">Safe</span>
                          : <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold">⚠️ Low</span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}