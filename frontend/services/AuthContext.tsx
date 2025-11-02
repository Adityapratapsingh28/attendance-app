import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from "./supabase"; // Add this import

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
    signIn: (email: string, password: string) => Promise<void>; // Updated signature
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>; // Add this method
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
            const userJson = await AsyncStorage.getItem(USER_STORAGE_KEY);
            if (userJson) {
                const userData = JSON.parse(userJson);

                // Verify user still exists in database
                const { data: dbUser, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userData.id)
                    .single();

                if (error || !dbUser) {
                    // User no longer exists in database, clear session
                    await AsyncStorage.removeItem(USER_STORAGE_KEY);
                    setUser(null);
                    setRole(null);
                } else {
                    setUser(dbUser);
                    setRole(dbUser.role);
                    console.log('User session loaded:', dbUser.email);
                }
            }
        } catch (error) {
            console.error('Error loading user session:', error);
            // Clear corrupted session
            await AsyncStorage.removeItem(USER_STORAGE_KEY);
        } finally {
            setLoading(false);
            setInitialized(true);
        }
    };

    const signIn = async (email: string, password: string) => {
        try {
            // First, authenticate with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('No user data returned');

            // Then get user profile from users table
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', authData.user.id)
                .single();

            if (userError) throw userError;
            if (!userData) throw new Error('User profile not found');

            // Store the complete user data with proper ID
            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
            setUser(userData);
            setRole(userData.role);
            console.log('User signed in:', userData.email);

        } catch (error) {
            console.error('Error during sign in:', error);
            throw error;
        }
    };

    const refreshUser = async () => {
        if (!user) return;

        try {
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
            }
        } catch (error) {
            console.error('Error refreshing user data:', error);
        }
    };

    const signOut = async () => {
        try {
            // Sign out from Supabase Auth
            await supabase.auth.signOut();
            // Clear local storage
            await AsyncStorage.removeItem(USER_STORAGE_KEY);
            setUser(null);
            setRole(null);
            console.log('User signed out');
        } catch (error) {
            console.error('Error during sign out:', error);
            throw error;
        }
    };

    const value: AuthContextType = {
        user,
        loading,
        role,
        initialized,
        signIn,
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