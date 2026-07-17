import { useState, useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom' 
import Navbar from './components/Navbar'         
import LoginPage from './pages/LoginPage.tsx';

function App() {
  const BYPASS_LOGIN =
    import.meta.env.DEV && import.meta.env.VITE_BYPASS_LOGIN === 'true';

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(BYPASS_LOGIN);

  const [userId, setUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  void userId;

  useEffect(() => {
    if (BYPASS_LOGIN) {
      setIsLoading(false);
      return;
    }

    const checkSession = async () => {
      try {
        const token = localStorage.getItem('accessToken');

        if (!token) {
          setIsLoading(false);
          return;
        }

        const res = await fetch('/api/v2/auth/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const userData = await res.json();
          setUserId(userData.id);
          setIsLoggedIn(true);
        } else {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error(error);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [BYPASS_LOGIN]);

  const handleLoginSuccess = (id: number) => {
     setUserId(id);
    setIsLoggedIn(true);
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
    
      {!isLoggedIn ? (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Navbar/>
      )}
    </BrowserRouter>
  );
}

export default App;