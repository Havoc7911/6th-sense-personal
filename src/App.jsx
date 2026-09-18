import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Services from './pages/Services';
import QuoteRequest from './pages/QuoteRequest';
import IntakeForm from './pages/IntakeForm';
import SuccessPage from './pages/SuccessPage';
import ClientDashboard from './pages/ClientDashboard';
import TechDashboard from './pages/TechDashboard';
import TechLogin from './pages/TechLogin';
import ResetPassword from './pages/ResetPassword';
import Policies from './pages/Policies';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/request-info" element={<QuoteRequest />} />
        <Route path="/policies" element={<Policies />} />
        <Route path="/intake" element={<IntakeForm />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/portal/*" element={<ClientDashboard />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Protected Technician Routes */}
        <Route path="/login" element={<TechLogin />} />
        <Route element={<ProtectedRoute adminOnly={true} />}>
          <Route path="/tech/*" element={<TechDashboard />} />
        </Route>
      </Routes>
    </Layout>
  );
}

export default App;
