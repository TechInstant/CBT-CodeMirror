import { Link, useNavigate } from "react-router-dom";

const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div style={{ width: "250px", backgroundColor: "#f5f5f5", height: "100vh", padding: "20px" }}>
      <h2>Admin Panel</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        <li><Link to="/AdminDashboard">Dashboard</Link></li>
        <li><Link to="/AdminUpload">Upload</Link></li>
        <li><Link to="/QuestionsList">Questions</Link></li>
        <li><Link to="/StudentList">Students</Link></li>
        <li><Link to="/StudentScores">Student Scores</Link></li>
        <li><button onClick={handleLogout} style={{ marginTop: "20px" }}>Logout</button></li>
      </ul>
    </div>
  );
};

export default Sidebar;
