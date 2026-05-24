import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import StaffDashboard from "./pages/staffDashboard";
import StudentDashboard from "./pages/studentDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/staff" element={<StaffDashboard />} />
        <Route path="/student" element={<StudentDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;