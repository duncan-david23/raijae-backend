import { supabase } from "../utils/supabase.js";
import { createClient } from '@supabase/supabase-js';

export const insertProfile = async (req, res) => {
  try {
    // 1️⃣ Check for Authorization Header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // 2️⃣ Create authenticated Supabase client with the user's token
    const supabaseUser = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // 3️⃣ Extract data from request body - only name, email, role
    const {
      email,
      full_name,
      role
    } = req.body;

    // 4️⃣ Get the authenticated user to get their ID
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // 5️⃣ Insert profile with id, email, full_name, role
    const { data, error } = await supabaseUser
      .from('profiles')
      .insert({
        id: user.id,
        email: email,
        full_name: full_name,
        role: role || 'customer',
        profile_image: null,
        phone_number: null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting profile:', error);
      return res.status(500).json({ error: "Failed to create profile" });
    }

    // 6️⃣ Return success
    return res.status(201).json({
      success: true,
      message: "Profile created successfully",
      profile: data
    });

  } catch (err) {
    console.error('Unexpected error inserting profile:', err);
    return res.status(500).json({ error: "Internal server error" });
  }
};



// Update user profile
export const updateProfile = async (req, res) => {
  try {
    // 1️⃣ Check for Authorization Header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // 2️⃣ Create authenticated Supabase client with the user's token
    const supabaseUser = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // 3️⃣ Extract data from request body
    const {
      full_name,
      phone_number,
      profile_image
    } = req.body;

    // 4️⃣ Get the authenticated user to get their ID
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // 5️⃣ Build update object (only include fields that are provided)
    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone_number !== undefined) updateData.phone_number = phone_number;
    if (profile_image !== undefined) updateData.profile_image = profile_image;
    
    // Add updated timestamp
    updateData.updated_at = new Date().toISOString();

    // 6️⃣ Update profile in database
    const { data, error } = await supabaseUser
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return res.status(500).json({ error: "Failed to update profile" });
    }

    // 7️⃣ Return success response
    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      profile: data
    });

  } catch (err) {
    console.error('Unexpected error updating profile:', err);
    return res.status(500).json({ error: "Internal server error" });
  }
};







// fetch user proile
export const getProfile = async (req, res) => {
  try {
    // Get token from authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // Create authenticated Supabase client
    const supabaseUser = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Get user profile from profiles table
    const { data: profile, error: profileError } = await supabaseUser
      .from('profiles')
      .select('role, full_name, email, profile_image, phone_number, created_at')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return res.status(500).json({ error: "Failed to fetch user profile" });
    }

    // Return user profile
    return res.status(200).json({
      success: true,
      role: profile.role,
      full_name: profile.full_name,
      email: profile.email,
      profile_image: profile.profile_image || null,
      phone_number: profile.phone_number || null,
      created_at: profile.created_at || null
    });

  } catch (err) {
    console.error('Error fetching user profile:', err);
    return res.status(500).json({ error: "Internal server error" });
  }
};




// api/users/check-role.js or add to your existing routes

export const checkUserRole = async (req, res) => {
  try {
    // Get token from authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // Create authenticated Supabase client
    const supabaseUser = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Get user profile from profiles table
    const { data: profile, error: profileError } = await supabaseUser
      .from('profiles')
      .select('role, full_name, email')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return res.status(500).json({ error: "Failed to fetch user role" });
    }

    // Return user role
    return res.status(200).json({
      success: true,
      role: profile.role,
      full_name: profile.full_name,
      email: profile.email,
      profile_image: profile.profile_image || null,
      phone_number: profile.phone_number || null,
      created_at: profile.created_at || null
    });

  } catch (err) {
    console.error('Error checking user role:', err);
    return res.status(500).json({ error: "Internal server error" });
  }
};




export const getAllProfiles = async (req, res) => {
  try {
    // 1️⃣ Check for Authorization Header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // 2️⃣ Create authenticated Supabase client to check admin status
    const supabaseUser = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // 3️⃣ Get authenticated user and check if they are admin
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Check if user is admin using the authenticated client
    const { data: adminProfile, error: adminError } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || !adminProfile || adminProfile.role !== 'admin') {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    // ✅ IMPORTANT: Use SERVICE ROLE client to bypass RLS and fetch ALL profiles
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,  // Use SERVICE ROLE KEY (not anon key)
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 4️⃣ Fetch ALL profiles using admin client (bypasses RLS)
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, profile_image, phone_number, created_at')
      .neq('id', user.id)  // Exclude the logged-in admin
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return res.status(500).json({ error: "Failed to fetch profiles", details: profilesError.message });
    }

    // 5️⃣ Calculate additional stats for each customer using admin client
    const profilesWithStats = await Promise.all(profiles.map(async (profile) => {
      // Get order count and total spent for each customer using admin client
      const { data: orders, error: ordersError } = await supabaseAdmin
        .from('orders')
        .select('order_total, status')
        .eq('user_id', profile.id);

      const totalOrders = orders?.length || 0;
      const totalSpent = orders?.reduce((sum, order) => {
        if (order.status !== 'cancelled') {
          return sum + (order.order_total || 0);
        }
        return sum;
      }, 0) || 0;

      return {
        ...profile,
        total_orders: totalOrders,
        total_spent: totalSpent
      };
    }));

    // 6️⃣ Return success response
    return res.status(200).json({
      success: true,
      customers: profilesWithStats,
      count: profilesWithStats.length
    });

  } catch (err) {
    console.error('Unexpected error fetching profiles:', err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};