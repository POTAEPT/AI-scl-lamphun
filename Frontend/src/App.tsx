import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage.tsx';
import Navbar from './components/Navbar';

function MainApp() {
  const { user, isLoading } = useAuth();

  const handleLoginSuccess = () => {
    // In actual implementation, we'd fetch the user profile. For mock:
    // This is handled in LoginForm now, it will call login() from context.
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter> 
      {!user ? (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Navbar/>
      )}
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;