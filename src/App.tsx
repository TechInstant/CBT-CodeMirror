import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import StudentLogin from './auth/studentLogin';
import WelcomePage from './components/welcomePage';
import CodeSection from './components/codeSection';
import AdminUpload from './components/AdminUpload';
import AdminDashboard from './components/AdminDashboard';
import axios from 'axios';

function App() {
  return (
    <Router>
      <div>
        <Routes>
        <Route path="/" element={<StudentLogin />} />
          <Route path="/studentLogin" element={<StudentLogin />} />  
          <Route path="/welcomePage" element={<WelcomePage />} />
          <Route path="/codesection" element={<CodeSection />} />
          <Route path="/adminUpload" element={<AdminUpload />} />
          <Route path="/adminDashboard" element={<AdminDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

  export const GetToken = async () => {
        try {
          const response = await axios.post(
            "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" +
              import.meta.env.VITE_REACT_APP_API_KEY,
            {
              email: import.meta.env.VITE_REACT_APP_EMAIL,
              password: import.meta.env.VITE_REACT_APP_PASSWORD,
              returnSecureToken: true,
            }
          );
      
          const idToken = response?.data?.idToken;
          localStorage.setItem("idToken", idToken);
      
          return idToken;
        } catch (error: any) {
          console.log(error.message);
        }
      };

  
