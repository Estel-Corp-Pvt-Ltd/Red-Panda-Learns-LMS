import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/header';

export default function ForgotPassword() {
    const { resetPassword } = useAuth(); 
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      await resetPassword(email); // assume from context
      setMessage('✅ A password reset link has been sent to your email.');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('❌ No account found with this email.');
      } else {
        setError('❌ Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      <div className="flex justify-center items-center py-12 px-4">
        <Card className="w-full max-w-md shadow-lg">
         
             <CardHeader className="text-center space-y-4">
  {/* Centered logo */}
  <div className="flex justify-center">
    <img src="/logo.png" alt="Vizuara AI Labs" className="w-14 h-14" />
  </div>

  {/* Brand name under logo */}
  <div>
    <h2 className="text-2xl font-bold">Vizuara AI Labs</h2>
   <CardTitle className="text-xl font-semibold">Reset Your Password</CardTitle>
            <CardDescription>
              Enter your email and we'll send you a reset link.
            </CardDescription>
  </div>
</CardHeader>

          <CardContent className="space-y-4">
            {message && (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending link...' : 'Send Reset Link'}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex justify-between text-sm">
            <Link to="/auth/login" className="text-muted-foreground hover:underline">
              Back to Login
            </Link>
            <Link to="/auth/signup" className="text-primary font-medium hover:underline">
              Create account
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
