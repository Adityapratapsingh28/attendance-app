import { supabase } from './supabase';
import CryptoJS from 'crypto-js';

// Hash password using SHA256
const hashPassword = (password: string): string => {
    return CryptoJS.SHA256(password).toString();
};

// Sign up with email and password
export async function signUpWithEmail(
    email: string,
    password: string,
    name: string,
    phone?: string,
    employeeId?: string
) {
    try {
        console.log('Starting custom signup...', { email, name, phone, employeeId });

        // Validate inputs
        if (!email || !password || !name) {
            return { ok: false, error: 'All fields are required' };
        }

        // Hash the password
        const hashedPassword = hashPassword(password);
        console.log('Password hashed successfully');

        // Prepare user data
        const userData: any = {
            full_name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: 'user'
        };

        // Add optional fields if provided
        if (phone && phone.trim()) {
            userData.phone = phone.trim();
        }

        if (employeeId && employeeId.trim()) {
            userData.employee_id = employeeId.trim();
        }

        console.log('User data to insert:', userData);

        // Insert new user
        const { data, error } = await supabase
            .from('users')
            .insert([userData])
            .select('id, full_name, email, phone, employee_id, role, created_at, last_login')
            .single();

        if (error) {
            console.error('Error creating user:', error);

            // Handle specific Supabase errors
            if (error.code === '23505') { // Unique violation
                return { ok: false, error: 'User with this email already exists' };
            }

            return { ok: false, error: error.message || 'Failed to create account' };
        }

        console.log('User created successfully:', data.id);
        return {
            ok: true,
            user: {
                id: data.id,
                full_name: data.full_name,
                email: data.email,
                phone: data.phone,
                employee_id: data.employee_id,
                role: data.role,
                created_at: data.created_at,
                last_login: data.last_login
            }
        };
    } catch (err: any) {
        console.error('Unexpected error signing up:', err);
        return {
            ok: false,
            error: err.message || 'An unexpected error occurred during signup'
        };
    }
}

// Sign in with email and password
// Sign in with email and password
export async function signInWithEmail(email: string, password: string) {
    try {
        console.log('Starting custom sign in...', { email });

        // Validate inputs
        if (!email || !password) {
            return { ok: false, error: 'Email and password are required' };
        }

        // Hash the password
        const hashedPassword = hashPassword(password);
        console.log('Password hashed for signin');

        // Query user with matching email and password
        const { data, error } = await supabase
            .from('users')
            .select('id, full_name, email, phone, employee_id, role, created_at, last_login')
            .eq('email', email.toLowerCase())
            .eq('password', hashedPassword)
            .maybeSingle(); // Use maybeSingle to avoid errors

        if (error) {
            console.error('Sign in error:', error);
            return { ok: false, error: 'Authentication error. Please try again.' };
        }

        if (!data) {
            return { ok: false, error: 'Invalid email or password' };
        }

        // Update last login timestamp
        await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', data.id);

        console.log('User signed in successfully:', data.id);

        return {
            ok: true,
            user: data
        };
    } catch (err: any) {
        console.error('Unexpected error signing in:', err);
        return {
            ok: false,
            error: err.message || 'An unexpected error occurred during signin'
        };
    }
}

// Get user by ID
export async function getUserById(userId: string) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, full_name, email, phone, employee_id, role, created_at, last_login')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching user:', error);
            return null;
        }

        return data;
    } catch (err) {
        console.error('Unexpected error fetching user:', err);
        return null;
    }
}

// Update user profile
export async function updateUserProfile(userId: string, updates: {
    full_name?: string;
    phone?: string;
    employee_id?: string;
}) {
    try {
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select('id, full_name, email, phone, employee_id, role, created_at, last_login')
            .single();

        if (error) {
            console.error('Error updating user:', error);
            return { ok: false, error: error.message };
        }

        return { ok: true, user: data };
    } catch (err: any) {
        console.error('Unexpected error updating user:', err);
        return { ok: false, error: err.message || 'Failed to update profile' };
    }
}

// Change password
export async function changePassword(userId: string, oldPassword: string, newPassword: string) {
    try {
        const hashedOldPassword = hashPassword(oldPassword);
        const hashedNewPassword = hashPassword(newPassword);

        // Verify old password
        const { data: user, error: verifyError } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .eq('password', hashedOldPassword)
            .single();

        if (verifyError || !user) {
            return { ok: false, error: 'Current password is incorrect' };
        }

        // Update password
        const { error: updateError } = await supabase
            .from('users')
            .update({ password: hashedNewPassword })
            .eq('id', userId);

        if (updateError) {
            console.error('Error updating password:', updateError);
            return { ok: false, error: updateError.message };
        }

        return { ok: true };
    } catch (err: any) {
        console.error('Unexpected error changing password:', err);
        return { ok: false, error: err.message || 'Failed to change password' };
    }
}

// Reset password (without old password - for forgot password flow)
export async function resetPassword(email: string, newPassword: string) {
    try {
        const hashedPassword = hashPassword(newPassword);

        const { error } = await supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('email', email.toLowerCase());

        if (error) {
            console.error('Error resetting password:', error);
            return { ok: false, error: error.message };
        }

        return { ok: true };
    } catch (err: any) {
        console.error('Unexpected error resetting password:', err);
        return { ok: false, error: err.message || 'Failed to reset password' };
    }
}