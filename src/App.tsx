import { useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return user ? <Dashboard /> : <Auth />;
}

export default App;
