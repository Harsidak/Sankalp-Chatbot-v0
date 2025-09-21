import React, { useState } from 'react';
import { useNotification } from '../hooks/useNotification';
import { 
    signInWithGoogle, 
    signInWithEmail, 
    signUpWithEmail, 
    signInAnonymously,
    sendPasswordReset
} from '../services/firebaseService';

const GoogleIcon: React.FC = () => (
    <svg className="w-5 h-5" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C39.99,35.531,44,28.717,44,20C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
);


const AuthPage: React.FC = () => {
    const [isSignIn, setIsSignIn] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { addNotification } = useNotification();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!isSignIn && password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setIsLoading(true);
        try {
            if (isSignIn) {
                await signInWithEmail(email, password);
                addNotification("Welcome back!", "success");
            } else {
                await signUpWithEmail(email, password);
                addNotification("Account created successfully! Welcome.", "success");
            }
        } catch (err) {
            const firebaseError = err as { code?: string, message: string };
            console.error("Firebase Auth Error:", firebaseError.code, firebaseError.message);
            setError(firebaseError.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        try {
            await signInWithGoogle();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnonymousSignIn = async () => {
        setIsLoading(true);
        try {
            await signInAnonymously();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePasswordReset = async () => {
        if (!email) {
            setError("Please enter your email to reset your password.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await sendPasswordReset(email);
            addNotification("Password reset email sent! Check your inbox.", "success");
        } catch (err) {
             setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto animate-fade-in">
            <div className="glass-panel interactive-glare p-8 flex flex-col items-center text-center gap-6 relative">
                 <h1 className="text-4xl font-bold tracking-tight text-primary">
                    Welcome to <span className="bg-gradient-to-r from-purple-400 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">Sankalp</span>
                </h1>
                <p className="text-secondary">{isSignIn ? 'Sign in to continue your journey.' : 'Create an account to get started.'}</p>
                
                <div className="w-full flex flex-col gap-4">
                    <button onClick={handleGoogleSignIn} disabled={isLoading} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white/90 hover:bg-white text-gray-800 font-semibold transition-colors shadow-md disabled:opacity-50">
                        <GoogleIcon />
                        Sign in with Google
                    </button>
                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-divider"></div>
                        <span className="flex-shrink mx-4 text-xs text-secondary">OR</span>
                        <div className="flex-grow border-t border-divider"></div>
                    </div>

                     <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4 text-left">
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required className="auth-input w-full p-3 rounded-lg focus:ring-2 focus:outline-none transition-all text-primary"/>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required className="auth-input w-full p-3 rounded-lg focus:ring-2 focus:outline-none transition-all text-primary"/>
                        {!isSignIn && <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm Password" required className="auth-input w-full p-3 rounded-lg focus:ring-2 focus:outline-none transition-all text-primary"/>}
                        
                        {error && <p className="text-sm text-center text-error-color animate-fade-in">{error}</p>}
                        
                        <button type="submit" disabled={isLoading} className="start-button w-full text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center">
                             {isLoading && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>}
                            {isSignIn ? 'Sign In' : 'Sign Up'}
                        </button>
                    </form>
                    
                     <div className="text-center text-sm">
                        <button onClick={() => { setIsSignIn(!isSignIn); setError(null); }} className="text-secondary hover:text-primary transition-colors">
                            {isSignIn ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                        </button>
                        {isSignIn && (
                            <button onClick={handlePasswordReset} className="block mx-auto mt-2 text-xs text-secondary hover:text-primary transition-colors">
                                Forgot Password?
                            </button>
                        )}
                    </div>
                </div>

                <div className="w-full border-t border-divider pt-4 mt-2">
                    <button onClick={handleAnonymousSignIn} disabled={isLoading} className="w-full text-secondary hover:text-primary text-sm font-semibold transition-colors">
                        Continue as Guest
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;