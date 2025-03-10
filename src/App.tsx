import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import StudentLogin from './auth/studentLogin';
import WelcomePage from './components/welcomePage';
import CodeSection from './components/codeSection';

function App() {
  return (
    <Router>
      <div>
        <Routes>
        <Route path="/" element={<StudentLogin />} />
          <Route path="/studentLogin" element={<StudentLogin />} />  
          <Route path="/welcomePage" element={<WelcomePage />} />
          <Route path="/codesection" element={<CodeSection />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
