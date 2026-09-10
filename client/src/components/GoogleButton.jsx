import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { googleAuth } from '../api/authApi';
import { useAuth } from '../context/AuthContext';

export default function GoogleButton() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleSuccess = async (credentialResponse) => {
    try {
      const { data } = await googleAuth(credentialResponse.credential);
      setUser(data.user);
      toast.success('Logged in with Google');
      navigate('/profile');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google sign-in failed');
    }
  };

  return (
    <div className="flex justify-center overflow-hidden rounded-full transition-all duration-300 ease-premium hover:shadow-glow-aqua">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => toast.error('Google sign-in failed')}
        theme="filled_black"
        shape="pill"
        width="320"
      />
    </div>
  );
}