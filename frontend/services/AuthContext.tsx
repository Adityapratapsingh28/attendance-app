import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from "./supabase";
import { signInWithEmail, signUpWithEmail } from "./authService"; // Import your custom auth service

interface User {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    employee_id?: string;
    role: "admin" | "user";
    created_at: string;
    last_login?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    role: "admin" | "user" | null;
    initialized: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, name: string, phone?: string, employeeId?: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = '@user_session';

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState<"admin" | "user" | null>(null);
    const [initialized, setInitialized] = useState(false);

    // Load user session on mount
    useEffect(() => {
        loadUserSession();
    }, []);

    const loadUserSession = async () => {
        try {
            console.log("🔄 Loading user session from storage...");
            const userJson = await AsyncStorage.getItem(USER_STORAGE_KEY);

            if (userJson) {
                const userData = JSON.parse(userJson);
                console.log("📦 Found stored user:", userData.email);

                // Verify user still exists in database using custom auth
                const { data: dbUser, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userData.id)
                    .single();

                if (error || !dbUser) {
                    console.log("❌ User no longer exists in database, clearing session");
                    // User no longer exists in database, clear session
                    await AsyncStorage.removeItem(USER_STORAGE_KEY);
                    setUser(null);
                    setRole(null);
                } else {
                    console.log("✅ User session loaded successfully");
                    setUser(dbUser);
                    setRole(dbUser.role);
                }
            } else {
                console.log("ℹ️ No stored user session found");
            }
        } catch (error) {
            console.error('❌ Error loading user session:', error);
            // Clear corrupted session
            await AsyncStorage.removeItem(USER_STORAGE_KEY);
        } finally {
            setLoading(false);
            setInitialized(true);
            console.log("🎯 Auth initialization completed");
        }
    };

    const signIn = async (email: string, password: string) => {
        try {
            console.log("🔐 Attempting sign in with custom authentication...");
            console.log("📧 Email:", email);

            // Use your custom authentication service
            const result = await signInWithEmail(email, password);
            console.log("📊 Custom auth result:", result);

            if (!result.ok || !result.user) {
                throw new Error(result.error || 'Sign in failed');
            }

            console.log("✅ Custom authentication successful");

            // Store the complete user data
            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));
            setUser(result.user);
            setRole(result.user.role);

            console.log('✅ User signed in and session stored:', result.user.email);

        } catch (error: any) {
            console.error('❌ Error during sign in:', error);
            throw error;
        }
    };

    const signUp = async (email: string, password: string, name: string, phone?: string, employeeId?: string) => {
        try {
            console.log("📝 Attempting sign up with custom authentication...");

            // Use your custom authentication service
            const result = await signUpWithEmail(email, password, name, phone, employeeId);
            console.log("📊 Custom signup result:", result);

            if (!result.ok || !result.user) {
                throw new Error(result.error || 'Sign up failed');
            }

            console.log("✅ Custom signup successful");

            // Store the complete user data
            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));
            setUser(result.user);
            setRole(result.user.role);

            console.log('✅ User signed up and session stored:', result.user.email);

        } catch (error: any) {
            console.error('❌ Error during sign up:', error);
            throw error;
        }
    };

    const refreshUser = async () => {
        if (!user) {
            console.log("ℹ️ No user to refresh");
            return;
        }

        try {
            console.log("🔄 Refreshing user data...");
            const { data: userData, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            if (userData) {
                await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
                setUser(userData);
                setRole(userData.role);
                console.log("✅ User data refreshed successfully");
            }
        } catch (error) {
            console.error('❌ Error refreshing user data:', error);
        }
    };

    const signOut = async () => {
        try {
            console.log("🚪 Signing out...");

            // No need to call supabase.auth.signOut() since we're using custom auth
            // Just clear local storage
            await AsyncStorage.removeItem(USER_STORAGE_KEY);
            setUser(null);
            setRole(null);

            console.log('✅ User signed out successfully');
        } catch (error) {
            console.error('❌ Error during sign out:', error);
            throw error;
        }
    };

    const value: AuthContextType = {
        user,
        loading,
        role,
        initialized,
        signIn,
        signUp,
        signOut,
        refreshUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}