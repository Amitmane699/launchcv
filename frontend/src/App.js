import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import Builder from "./pages/Builder";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import Tracker from "./pages/Tracker";
import Pricing from "./pages/Pricing";
import EmployerDashboard from "./pages/EmployerDashboard";
import EmployerJobManage from "./pages/EmployerJobManage";
import PostJob from "./pages/PostJob";
import AdminPanel from "./pages/AdminPanel";
import PublicResume from "./pages/PublicResume";
import Templates from "./pages/Templates";
import { PaymentMock, PaymentSuccess, PaymentFailure } from "./pages/Payment";
import CoverLetter from "./pages/CoverLetter";
import JobAlerts from "./pages/JobAlerts";
import Comparator from "./pages/Comparator";
import Referrals from "./pages/Referrals";
import CareerGraph from "./pages/CareerGraph";
import SkillGapRadar from "./pages/SkillGapRadar";
import { useAuthStore } from "./store/authStore";
import "./App.css";

function Protected({ children, roles }) {
    const { user, token } = useAuthStore();
    if (!token) return <Navigate to="/login" replace />;
    if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />;
    return children;
}

function App() {
    return (
        <BrowserRouter>
            <Toaster position="top-center" richColors />
            <Routes>
                {/* Public resume has no layout */}
                <Route path="/r/:token" element={<PublicResume />} />
                <Route path="*" element={
                    <Layout>
                        <Routes>
                            <Route path="/" element={<Landing />} />
                            <Route path="/login" element={<AuthPage mode="login" />} />
                            <Route path="/signup" element={<AuthPage mode="signup" />} />
                            <Route path="/pricing" element={<Pricing />} />
                            <Route path="/templates" element={<Templates />} />
                            <Route path="/jobs" element={<Jobs />} />
                            <Route path="/jobs/:id" element={<JobDetail />} />

                            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
                            <Route path="/builder/:id" element={<Protected><Builder /></Protected>} />
                            <Route path="/tracker" element={<Protected><Tracker /></Protected>} />
                            <Route path="/cover-letter" element={<Protected><CoverLetter /></Protected>} />
                            <Route path="/job-alerts" element={<Protected><JobAlerts /></Protected>} />
                            <Route path="/compare" element={<Protected><Comparator /></Protected>} />
                            <Route path="/referrals" element={<Protected><Referrals /></Protected>} />
                            <Route path="/career-graph" element={<Protected><CareerGraph /></Protected>} />
                            <Route path="/skill-gap" element={<Protected><SkillGapRadar /></Protected>} />

                            <Route path="/employer" element={<Protected roles={["employer", "admin", "superadmin"]}><EmployerDashboard /></Protected>} />
                            <Route path="/employer/jobs/:id" element={<Protected roles={["employer", "admin", "superadmin"]}><EmployerJobManage /></Protected>} />
                            <Route path="/post-job" element={<Protected roles={["employer", "admin", "superadmin"]}><PostJob /></Protected>} />

                            <Route path="/admin" element={<Protected roles={["admin", "superadmin"]}><AdminPanel /></Protected>} />

                            <Route path="/checkout" element={<Protected><PaymentMock /></Protected>} />
                            <Route path="/payment-mock" element={<Protected><PaymentMock /></Protected>} />
                            <Route path="/payment-success" element={<Protected><PaymentSuccess /></Protected>} />
                            <Route path="/payment-failure" element={<Protected><PaymentFailure /></Protected>} />

                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </Layout>
                } />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
