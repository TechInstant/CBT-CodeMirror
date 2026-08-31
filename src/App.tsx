import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./auth/Login";
import WelcomePage from "./components/welcomePage";
import AdminUpload from "./components/AdminUpload";
import AdminDashboard from "./components/Dashboard/AdminDashboard";
import AlreadySubmitted from "./components/Already_Submitted";
import StudentScores from "./components/StudentScores";
import QuestionsList from "./components/QuestionsList";
import StudentList from "./components/StudentList";
import Editor from "./components/Editor";

import axios from "axios";
import ProtectedRoute from "./components/ProtectedRoute";

import { StudentsProvider } from "./Context/StudentContext";
import { QuestionsProvider } from "./Context/QuestionContext";
import { SubmissionsProvider } from "./Context/SubmissionsContext";
import AdminLayout from "./Layouts/AdminLayouts";

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
                  {/* Admin layout wraps all admin pages */}
                  <Route element={<AdminLayout />}>
                    <Route path="/AdminDashboard" element={<AdminDashboard />} />
                    <Route path="/AdminUpload" element={<AdminUpload />} />
                    <Route path="/QuestionsList" element={<QuestionsList />} />
                    <Route path="/StudentList" element={<StudentList />} />
                    <Route path="/StudentScores" element={<StudentScores />} />
                  </Route>

                  {/* Other student-accessible routes */}
                  <Route path="/welcomePage" element={<WelcomePage />} />
                  <Route path="/editor" element={<Editor />} />
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

  // Firebase ID tokens last an hour. Signing in on every request meant ~6 sign-ins
  // per student, which at a full sitting is enough to get the account throttled by
  // Identity Toolkit. Cache the token and reuse it until it is nearly expired.
  const TOKEN_KEY = "idToken";
  const TOKEN_EXPIRY_KEY = "idTokenExpiresAt";
  const REFRESH_MARGIN_MS = 5 * 60 * 1000;

  let inFlight: Promise<string> | null = null;

  const cachedToken = (): string | null => {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiresAt = Number(localStorage.getItem(TOKEN_EXPIRY_KEY) ?? 0);
    if (!token || !expiresAt) return null;
    return Date.now() < expiresAt - REFRESH_MARGIN_MS ? token : null;
  };

  export const GetToken = async (): Promise<string> => {
    const cached = cachedToken();
    if (cached) return cached;

    // Several contexts mount at once; without this they would each sign in.
    if (inFlight) return inFlight;

    inFlight = (async () => {
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

        const idToken: string = response?.data?.idToken;
        if (!idToken) throw new Error("No idToken in sign-in response");

        const expiresInSeconds = Number(response?.data?.expiresIn ?? 3600);
        localStorage.setItem(TOKEN_KEY, idToken);
        localStorage.setItem(
          TOKEN_EXPIRY_KEY,
          String(Date.now() + expiresInSeconds * 1000)
        );

        return idToken;
      } finally {
        inFlight = null;
      }
    })();

    return inFlight;
  };

  
