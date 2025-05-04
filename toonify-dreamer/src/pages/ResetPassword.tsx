import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { Loader2, Lock, KeyRound } from 'lucide-react';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      setError(null); // Clear error if token is found
    } else {
      setError('Password reset token not found in URL. Please request a new reset link.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!token) {
      setError('Password reset token is missing.');
      return;
    }
    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: apiError } = await authClient.resetPassword({
        newPassword,
        token,
      });

      if (apiError) {
        throw apiError;
      }

      // Success
      setSuccess(true);
      toast.success('Password has been reset successfully!');
      // Optionally redirect after a short delay
      setTimeout(() => {
        navigate('/'); // Redirect to home or login page
      }, 3000);

    } catch (err: any) {
      console.error('Password reset error:', err);
      const errorMessage = err.message || 'Failed to reset password. The link may have expired or been used already.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[url('https://i.ibb.co/DDcDBgws/Chat-GPT-Image-Apr-3-2025-07-56-00-PM.png')] bg-cover bg-center p-4">
      <div className="w-full max-w-md bg-[#3a2e23]/90 backdrop-blur-sm border border-[#5D4037] p-8 rounded-lg text-[#e9e2d6] shadow-xl">
        <div className="text-center mb-6">
           <img 
            src="https://i.imgur.com/B7ptMnm.png" // Use the same wizard URL
            alt="ToonlyAI Wizard Logo" 
            className="h-20 w-20 object-contain mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-white mb-2">Reset Your Password</h1>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm p-3 rounded-md mb-4 text-center">
            {error}
            {error.includes('token not found') && (
              <p className="mt-2">Return to <Link to="/" className="underline hover:text-white">Homepage</Link>.</p>
            )}
          </div>
        )}

        {success ? (
          <div className="bg-green-900/40 border border-green-700 text-green-300 text-sm p-4 rounded-md mb-4 text-center">
            <p>Your password has been reset successfully!</p>
            <p className="mt-2">Redirecting you shortly...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {token && ( // Only show form if token exists initially
              <>
                <div>
                  <Label htmlFor="new-password" className="text-[#f4efe4]/80 mb-1 block text-sm">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#e9e2d6]/60" />
                    <Input
                      type="password"
                      id="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className="pl-10 bg-[#e9e2d6]/10 border-[#5D4037] text-[#e9e2d6] placeholder:text-[#e9e2d6]/60 focus:border-[#a87b5d] focus-visible:ring-offset-0 focus-visible:ring-0"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirm-password" className="text-[#f4efe4]/80 mb-1 block text-sm">Confirm New Password</Label>
                   <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#e9e2d6]/60" />
                    <Input
                      type="password"
                      id="confirm-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className="pl-10 bg-[#e9e2d6]/10 border-[#5D4037] text-[#e9e2d6] placeholder:text-[#e9e2d6]/60 focus:border-[#a87b5d] focus-visible:ring-offset-0 focus-visible:ring-0"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-[#8b5e3c] hover:bg-[#6d4c30] text-[#FFF8E1] playful-shadow disabled:opacity-60 flex items-center justify-center text-base py-3"
                >
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <KeyRound className="mr-2 h-5 w-5" />} 
                  Reset Password
                </Button>
              </>
            )}
          </form>
        )}
        
        {!token && !error && (
             <div className="text-center text-[#f4efe4]/70 text-sm">
                Loading token...
             </div>
        )}

      </div>
    </div>
  );
};

export default ResetPassword; 