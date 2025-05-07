import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './auth/Login';
import WelcomePage from './components/welcomePage';
import AdminUpload from './components/AdminUpload';
import AdminDashboard from './components/AdminDashboard';
import axios from 'axios';
// import { AuthProvider } from './Context/AuthContext';
import ProtectedRoute from "./components/ProtectedRoute";
import { StudentsProvider } from './Context/StudentContext';
import { QuestionsProvider } from './Context/QuestionContext';
import Editor from './components/Editor';
import { SubmissionsProvider } from './Context/SubmissionsContext';
import AlreadySubmitted from './components/Already_Submitted';

function App() {
  return (
    
    <Router>
      <div>
      <StudentsProvider>
        <QuestionsProvider>
        <SubmissionsProvider>
        <Routes>
        <Route path="/" element={<Login />} />   
          <Route element={<ProtectedRoute />}>
          <Route path="/AdminDashboard" element={<AdminDashboard />} />
          <Route path="/" element={<Login />} />  
          <Route path="/welcomePage" element={<WelcomePage />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/adminUpload" element={<AdminUpload />} />
          <Route path="/already_submitted" element={<AlreadySubmitted />} />
          </Route>
        </Routes>
        </SubmissionsProvider>
        </QuestionsProvider>
        </StudentsProvider>
      </div>
    </Router>
  );
}

export default App;


  
  export const baseUrl = import.meta.env.VITE_REACT_APP_BASEURL;
  export const grader = import.meta.env.VITE_REACT_GRADE_GRADER;
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

  
