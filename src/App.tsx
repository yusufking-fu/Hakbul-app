import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import LandingPage from '@/pages/LandingPage';
import SignupPage from '@/pages/SignupPage';
import LoginPage from '@/pages/LoginPage';
import StoreConnectionPage from '@/pages/StoreConnectionPage';
import DashboardPage from '@/pages/DashboardPage';
import DisputeDraftPage from '@/pages/DisputeDraftPage';
import SubscriptionPage from '@/pages/SubscriptionPage';
import UyariMerkeziPage from '@/pages/UyariMerkeziPage';
import MesafeliSatisSozlesmesiPage from '@/pages/MesafeliSatisSozlesmesiPage';
import IptalIadePage from '@/pages/IptalIadePage';
import GizlilikKvkkPage from '@/pages/GizlilikKvkkPage';
import IletisimPage from '@/pages/IletisimPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/kayit" element={<SignupPage />} />
          <Route path="/giris" element={<LoginPage />} />
          <Route
            path="/magaza-baglantisi"
            element={
              <ProtectedRoute>
                <StoreConnectionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/abonelik"
            element={
              <ProtectedRoute>
                <SubscriptionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/itiraz-taslagi"
            element={
              <ProtectedRoute>
                <DisputeDraftPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/uyari-merkezi"
            element={
              <ProtectedRoute>
                <UyariMerkeziPage />
              </ProtectedRoute>
            }
          />
          <Route path="/mesafeli-satis-sozlesmesi" element={<MesafeliSatisSozlesmesiPage />} />
          <Route path="/iptal-iade" element={<IptalIadePage />} />
          <Route path="/gizlilik-kvkk" element={<GizlilikKvkkPage />} />
          <Route path="/iletisim" element={<IletisimPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
