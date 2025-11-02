import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Remove the old applyLeave function and keep only the working one
export const applyLeave = async (user: any, leaveData: {
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  team_name: string;
}) => {
  try {
    if (!user) {
      throw new Error("User not authenticated. Please login again.");
    }

    if (!user.id) {
      throw new Error("User ID not found. Please login again.");
    }

    console.log('Authenticated user:', { id: user.id, email: user.email, full_name: user.full_name });

    // Prepare the leave data
    const leaveRecord = {
      user_id: user.id,
      full_name: user.full_name || user.user_metadata?.full_name || "",
      email: user.email,
      leave_type: leaveData.leave_type,
      start_date: leaveData.start_date,
      end_date: leaveData.end_date,
      reason: leaveData.reason,
      team_name: leaveData.team_name,
      status: "Pending"
    };

    console.log('Inserting leave record:', leaveRecord);

    // Insert leave request into database
    const { data, error } = await supabase
      .from("leaves")
      .insert([leaveRecord])
      .select();

    if (error) {
      console.error('Database insert error:', error);
      throw new Error('Failed to submit leave request: ' + error.message);
    }

    console.log('Leave request submitted successfully:', data);
    return { success: true, data };

  } catch (error: any) {
    console.error('Apply leave error:', error);
    throw error;
  }
};

// Helper function to get user leaves
export const getUserLeaves = async (userId: string) => {
  try {
    if (!userId) {
      throw new Error("User ID is required to fetch leaves");
    }

    console.log('Fetching leaves for user ID:', userId);

    const { data, error } = await supabase
      .from("leaves")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    console.log('Leaves fetched successfully, count:', data?.length);
    return data;

  } catch (error: any) {
    console.error('Get user leaves error:', error);
    throw error;
  }
};

// Optional: Get leave by ID
export const getLeaveById = async (leaveId: string) => {
  try {
    const { data, error } = await supabase
      .from("leaves")
      .select("*")
      .eq("id", leaveId)
      .single();

    if (error) throw error;
    return data;

  } catch (error: any) {
    console.error('Get leave by ID error:', error);
    throw error;
  }
};

// Optional: Update leave status
export const updateLeaveStatus = async (leaveId: string, status: string) => {
  try {
    const { data, error } = await supabase
      .from("leaves")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", leaveId)
      .select();

    if (error) throw error;
    return data;

  } catch (error: any) {
    console.error('Update leave status error:', error);
    throw error;
  }
};