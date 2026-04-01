import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { FileText, Zap, BarChart3, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
        toast.success('Account created! Check your email for verification.');
      } else {
        await signIn(email, password);
        toast.success('Welcome back!');
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Authentication failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: FileText, label: 'Multi-format Support', desc: 'PDF, JPG, PNG invoices' },
    { icon: Zap, label: 'AI-Powered Extraction', desc: 'Instant structured data' },
    { icon: BarChart3, label: 'Smart Analytics', desc: 'Spend insights & trends' },
    { icon: Shield, label: 'Format Learning', desc: 'Improves over time' },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-primary-foreground/20 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-primary-foreground/10 blur-3xl" />
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-primary-foreground mb-2">InvoiceAI</h1>
          <p className="text-primary-foreground/80 text-lg">Intelligent invoice extraction & analytics</p>
        </div>
        <div className="relative z-10 space-y-6">
          {features.map((f) => (
            <div key={f.label} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
                <f.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-primary-foreground">{f.label}</h3>
                <p className="text-primary-foreground/70 text-sm">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="relative z-10 text-primary-foreground/50 text-sm">© 2026 InvoiceAI. All rights reserved.</p>
      </div>

      {/* Right panel - auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md shadow-card border-border/50">
          <CardHeader className="text-center pb-2">
            <div className="lg:hidden mb-4">
              <h1 className="text-2xl font-bold text-foreground">InvoiceAI</h1>
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSignUp ? 'Start extracting invoice data in seconds' : 'Sign in to your dashboard'}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={255}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">Password</label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  maxLength={128}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-primary hover:underline"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
