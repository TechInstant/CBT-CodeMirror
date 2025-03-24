import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import StudentLogin from './auth/studentLogin';
import WelcomePage from './components/welcomePage';
import CodeSection from './components/Editor';
import AdminUpload from './components/AdminUpload';
import AdminDashboard from './components/AdminDashboard';
import axios from 'axios';
import { AuthProvider } from './Context/AuthContext';

function App() {
  return (
    
    <Router>
      <div>
      <AuthProvider>
        <Routes>
        <Route path="/" element={<StudentLogin />} />
          <Route path="/studentLogin" element={<StudentLogin />} />  
          <Route path="/welcomePage" element={<WelcomePage />} />
          <Route path="/codesection" element={<CodeSection />} />
          <Route path="/adminUpload" element={<AdminUpload />} />
          <Route path="/AdminDashboard" element={<AdminDashboard />} />
        </Routes>
        </AuthProvider>
      </div>
    </Router>
  );
}

export default App;

  export const baseUrl = import.meta.env.VITE_REACT_APP_BASEURL;
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

  
