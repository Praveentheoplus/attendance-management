import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

const PERIODS = ["Period 1", "Period 2", "Period 3", "Period 4",
                 "Period 5", "Period 6", "Period 7", "Period 8"];

export default function StudentDashboard() {
  const [activePage, setActivePage] = useState("dashboard");
  const [userInfo, setUserInfo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setUserInfo(snap.data());
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-green-900 text-white flex flex-col">
        <div className="p-6 border-b border-green-700">
          <h1 className="text-xl font-bold">Attendance System</h1>
          <p className="text-green-300 text-sm mt-1">Student Panel</p>
        </div>

        {userInfo && (
          <div className="p-4 border-b border-green-700">
            <p className="text-green-200 text-xs">Logged in as</p>
            <p className="text-white font-semibold">{userInfo.name}</p>
            <p className="text-green-300 text-xs">{userInfo.rollNo} • {userInfo.department}</p>
            <p className="text-green-300 text-xs">{userInfo.year}</p>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "attendance", label: "My Attendance" },
            { id: "daily", label: "Daily View" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${
                activePage === item.id
                  ? "bg-green-600 text-white"
                  : "text-green-200 hover:bg-green-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-green-700">
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-3 rounded-lg text-green-200 hover:bg-green-700 transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-auto">
        {activePage === "dashboard" && <StudentHome userInfo={userInfo} />}
        {activePage === "attendance" && <MyAttendance userInfo={userInfo} />}
        {activePage === "daily" && <DailyView userInfo={userInfo} />}
      </div>
    </div>
  );
}

// ─── STUDENT HOME ─────────────────────────────────────────────
function StudentHome({ userInfo }) {
  const [stats, setStats] = useState({ total: 0, present: 0, percentage: 0 });
  const [studentId, setStudentId] = useState(null);

  useEffect(() => {
    if (!userInfo) return;
    fetchStats();
  }, [userInfo]);

  const fetchStats = async () => {
    const studSnap = await getDocs(collection(db, "students"));
    const student = studSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .find((s) => s.rollNo === userInfo?.rollNo);
    if (!student) return;
    setStudentId(student.id);

    const attSnap = await getDocs(collection(db, "attendance"));
    const sessions = attSnap.docs.map((d) => d.data());
    const relevant = sessions.filter(
      (s) => s.year === userInfo.year && s.department === userInfo.department
    );
    const total = relevant.length;
    const present = relevant.filter((s) => {
      const r = s.records?.find((r) => r.studentId === student.id);
      return r && r.status === "present";
    }).length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    setStats({ total, present, percentage });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        Welcome, {userInfo?.name || "Student"} 👋
      </h2>
      <p className="text-gray-500 mb-6">{userInfo?.department} • {userInfo?.year}</p>

      {/* Overall Stats */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="w-10 h-10 bg-green-500 rounded-lg mb-4"></div>
          <p className="text-gray-500 text-sm">Total Classes</p>
          <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <div className="w-10 h-10 bg-indigo-500 rounded-lg mb-4"></div>
          <p className="text-gray-500 text-sm">Classes Attended</p>
          <p className="text-3xl font-bold text-gray-800">{stats.present}</p>
        </div>
        <div className={`rounded-xl shadow p-6 ${stats.percentage >= 75 ? "bg-green-50" : "bg-red-50"}`}>
          <div className={`w-10 h-10 rounded-lg mb-4 ${stats.percentage >= 75 ? "bg-green-500" : "bg-red-500"}`}></div>
          <p className="text-gray-500 text-sm">Overall Attendance</p>
          <p className={`text-3xl font-bold ${stats.percentage >= 75 ? "text-green-700" : "text-red-700"}`}>
            {stats.percentage}%
          </p>
        </div>
      </div>

      {/* Status Card */}
      <div className={`rounded-xl p-6 ${stats.percentage >= 75 ? "bg-green-100" : "bg-red-100"}`}>
        {stats.percentage >= 75 ? (
          <div>
            <p className="text-green-800 text-lg font-bold">✅ You are Safe</p>
            <p className="text-green-600 mt-1">Your attendance is above 75%. Keep it up!</p>
          </div>
        ) : (
          <div>
            <p className="text-red-800 text-lg font-bold">⚠️ Attendance Below 75%</p>
            <p className="text-red-600 mt-1">
              You need to attend more classes. Current: {stats.percentage}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MY ATTENDANCE ────────────────────────────────────────────
function MyAttendance({ userInfo }) {
  const [subjectStats, setSubjectStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userInfo) return;
    fetchAttendance();
  }, [userInfo]);

  const fetchAttendance = async () => {
    setLoading(true);
    const studSnap = await getDocs(collection(db, "students"));
    const student = studSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .find((s) => s.rollNo === userInfo?.rollNo);
    if (!student) { setLoading(false); return; }

    const attSnap = await getDocs(collection(db, "attendance"));
    const sessions = attSnap.docs
      .map((d) => d.data())
      .filter((s) => s.year === userInfo.year && s.department === userInfo.department);

    const subjectMap = {};
    sessions.forEach((s) => {
      if (!subjectMap[s.subject]) subjectMap[s.subject] = { total: 0, present: 0 };
      subjectMap[s.subject].total++;
      const record = s.records?.find((r) => r.studentId === student.id);
      if (record && record.status === "present") subjectMap[s.subject].present++;
    });

    const stats = Object.entries(subjectMap).map(([subject, data]) => ({
      subject,
      total: data.total,
      present: data.present,
      absent: data.total - data.present,
      percentage: Math.round((data.present / data.total) * 100),
    }));

    setSubjectStats(stats);
    setLoading(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">My Attendance by Subject</h2>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-green-50">
            <tr>
              <th className="text-left px-6 py-4 text-green-700 font-semibold">#</th>
              <th className="text-left px-6 py-4 text-green-700 font-semibold">Subject</th>
              <th className="text-center px-6 py-4 text-green-700 font-semibold">Total</th>
              <th className="text-center px-6 py-4 text-green-700 font-semibold">Present</th>
              <th className="text-center px-6 py-4 text-green-700 font-semibold">Absent</th>
              <th className="text-center px-6 py-4 text-green-700 font-semibold">%</th>
              <th className="text-center px-6 py-4 text-green-700 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : subjectStats.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-400">No attendance records found.</td></tr>
            ) : (
              subjectStats.map((s, i) => (
                <tr key={s.subject} className={`border-t border-gray-100 ${s.percentage < 75 ? "bg-red-50" : ""}`}>
                  <td className="px-6 py-4 text-gray-500">{i + 1}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">{s.subject}</td>
                  <td className="px-6 py-4 text-center text-gray-600">{s.total}</td>
                  <td className="px-6 py-4 text-center text-green-600 font-semibold">{s.present}</td>
                  <td className="px-6 py-4 text-center text-red-600 font-semibold">{s.absent}</td>
                  <td className="px-6 py-4 text-center font-bold">
                    <span className={s.percentage >= 75 ? "text-green-600" : "text-red-600"}>
                      {s.percentage}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {s.percentage >= 75
                      ? <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">Safe</span>
                      : <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold">⚠️ Low</span>
                    }
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

// ─── DAILY VIEW ───────────────────────────────────────────────
function DailyView({ userInfo }) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [sessions, setSessions] = useState([]);
  const [studentId, setStudentId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userInfo) return;
    fetchStudentId();
  }, [userInfo]);

  useEffect(() => {
    if (studentId) fetchDayAttendance();
  }, [date, studentId]);

  const fetchStudentId = async () => {
    const snap = await getDocs(collection(db, "students"));
    const student = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .find((s) => s.rollNo === userInfo?.rollNo);
    if (student) setStudentId(student.id);
  };

  const fetchDayAttendance = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, "attendance"));
    const daySessions = snap.docs
      .map((d) => d.data())
      .filter(
        (s) =>
          s.date === date &&
          s.year === userInfo.year &&
          s.department === userInfo.department
      );
    setSessions(daySessions);
    setLoading(false);
  };

  const getStatus = (period) => {
    const session = sessions.find((s) => s.period === period);
    if (!session) return null;
    const record = session.records?.find((r) => r.studentId === studentId);
    return record ? record.status : null;
  };

  const presentCount = PERIODS.filter((p) => getStatus(p) === "present").length;
  const totalConducted = sessions.length;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Daily Attendance View</h2>

      <div className="bg-white rounded-xl shadow p-4 mb-6 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Select Date:</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        {totalConducted > 0 && (
          <span className="ml-auto text-sm text-gray-500">
            {presentCount} / {totalConducted} periods attended
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {PERIODS.map((p) => {
          const status = getStatus(p);
          const session = sessions.find((s) => s.period === p);
          return (
            <div
              key={p}
              className={`rounded-xl shadow p-4 text-center ${
                status === "present"
                  ? "bg-green-50 border border-green-200"
                  : status === "absent"
                  ? "bg-red-50 border border-red-200"
                  : "bg-gray-50 border border-gray-200"
              }`}
            >
              <p className={`font-bold text-sm ${
                status === "present" ? "text-green-700"
                : status === "absent" ? "text-red-700"
                : "text-gray-400"
              }`}>
                {p}
              </p>
              {session && (
                <p className="text-xs text-gray-500 mt-1">{session.subject}</p>
              )}
              <p className={`text-lg font-bold mt-2 ${
                status === "present" ? "text-green-600"
                : status === "absent" ? "text-red-600"
                : "text-gray-300"
              }`}>
                {status === "present" ? "P" : status === "absent" ? "A" : "—"}
              </p>
            </div>
          );
        })}
      </div>

      {loading && <p className="text-center text-gray-400">Loading...</p>}
      {!loading && totalConducted === 0 && (
        <p className="text-center text-gray-400 py-8">No classes conducted on this date.</p>
      )}
    </div>
  );
}