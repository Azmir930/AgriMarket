import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Leaf, User, Tractor } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'buyer' as UserRole,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure both passwords are the same',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const nameParts = formData.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/register.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          confirm_password: formData.confirmPassword,
          role: formData.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details?.join(', ') || 'Registration failed');
      }

      // Auto-login after registration
      if (data.data?.token) {
        localStorage.setItem('auth_token', data.data.token);
        const userData = {
          id: data.data.user.id,
          name: `${data.data.user.first_name} ${data.data.user.last_name}`,
          email: data.data.user.email,
          role: data.data.user.role_name || 'buyer',
        };
        localStorage.setItem('user', JSON.stringify(userData));

        toast({
          title: 'Account created!',
          description: 'Welcome to AgriMarket.',
        });

        // Redirect to dashboard
        if (data.data.user.role_name === 'farmer') {
          navigate('/farmer/dashboard');
        } else {
          navigate('/');
        }
      } else {
        // Old login flow if token not provided
        toast({
          title: 'Account created!',
          description: 'Welcome to AgriMarket. Please login with your credentials.',
        });
        navigate('/login');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl gradient-primary shadow-lg">
            <Leaf className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">AgriMarket</h1>
          <p className="text-muted-foreground">Join the farming community</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Create Account</CardTitle>
            <CardDescription>Sign up to start buying or selling</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role Selection */}
              <div className="space-y-3">
                <Label>I want to</Label>
                <RadioGroup
                  value={formData.role}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value as UserRole }))}
                  className="grid grid-cols-2 gap-4"
                >
                  <Label
                    htmlFor="role-buyer"
                    className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${formData.role === 'buyer' ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'
                      }`}
                  >
                    <RadioGroupItem value="buyer" id="role-buyer" className="sr-only" />
                    <User className={`h-6 w-6 ${formData.role === 'buyer' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="font-medium">Buy Products</span>
                    <span className="text-xs text-muted-foreground text-center">Browse & purchase produce</span>
                  </Label>
                  <Label
                    htmlFor="role-farmer"
                    className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${formData.role === 'farmer' ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'
                      }`}
                  >
                    <RadioGroupItem value="farmer" id="role-farmer" className="sr-only" />
                    <Tractor className={`h-6 w-6 ${formData.role === 'farmer' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="font-medium">Sell Products</span>
                    <span className="text-xs text-muted-foreground text-center">List your farm produce</span>
                  </Label>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+91 XXXXX XXXXX"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
