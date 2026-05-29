import { supabase } from "../utils/supabase.js";
import { createClient } from "@supabase/supabase-js";

export const userDeliveryAddress = async (req, res) => {
  try {
    // =========================
    // Get Auth Token
    // =========================
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: "Missing authorization header",
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // =========================
    // Validate User
    // =========================
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        error: "Invalid or expired token",
      });
    }

    // =========================
    // Create Authenticated Client
    // IMPORTANT FOR RLS
    // =========================
    const userClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // =========================
    // Get Request Data
    // =========================
    const { address, is_default } = req.body;

    if (!address || typeof address !== "string") {
      return res.status(400).json({
        error: "Valid address is required",
      });
    }

    // =========================
    // Remove Previous Default
    // =========================
    if (is_default) {
      const { error: updateError } = await userClient
        .from("customer_addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);

      if (updateError) {
        return res.status(400).json({
          error: updateError.message,
        });
      }
    }

    // =========================
    // Insert New Address
    // =========================
    const { data, error } = await userClient
      .from("customer_addresses")
      .insert({
        user_id: user.id,
        address: address.trim(),
        is_default: is_default || false,
      })
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error);

      return res.status(400).json({
        error: error.message,
      });
    }

    // =========================
    // Success Response
    // =========================
    return res.status(201).json({
      success: true,
      message: "Address saved successfully",
      address: data,
    });

  } catch (err) {
    console.error("Server error:", err);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};





// =========================
// GET USER ADDRESSES
// =========================
export const getUserAddresses = async (req, res) => {
  try {
    // =========================
    // Get Auth Token
    // =========================
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: "Missing authorization header",
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // =========================
    // Validate User
    // =========================
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        error: "Invalid or expired token",
      });
    }

    // =========================
    // Create Authenticated Client
    // IMPORTANT FOR RLS
    // =========================
    const userClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // =========================
    // Fetch User Addresses
    // =========================
    const { data, error } = await userClient
      .from("customer_addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch error:", error);

      return res.status(400).json({
        error: error.message,
      });
    }

    // =========================
    // Success Response
    // =========================
    return res.status(200).json({
      success: true,
      message: "Addresses fetched successfully",
      addresses: data || [],
    });

  } catch (err) {
    console.error("Server error:", err);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};




// =========================
// DELETE USER ADDRESS
// =========================
export const deleteUserAddress = async (req, res) => {
  try {
    // =========================
    // Get Auth Token
    // =========================
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: "Missing authorization header",
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // =========================
    // Validate User
    // =========================
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        error: "Invalid or expired token",
      });
    }

    // =========================
    // Create Authenticated Client (IMPORTANT FOR RLS)
    // =========================
    const userClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: "Address ID is required",
      });
    }

    // =========================
    // Check ownership of address
    // =========================
    const { data: existingAddress, error: fetchError } = await userClient
      .from("customer_addresses")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingAddress) {
      return res.status(404).json({
        error: "Address not found",
      });
    }

    // =========================
    // Delete Address
    // =========================
    const { error: deleteError } = await userClient
      .from("customer_addresses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Delete error:", deleteError);

      return res.status(400).json({
        error: deleteError.message,
      });
    }

    // =========================
    // If deleted address was default → assign new default
    // =========================
    if (existingAddress.is_default) {
      const { data: remaining } = await userClient
        .from("customer_addresses")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (remaining && remaining.length > 0) {
        await userClient
          .from("customer_addresses")
          .update({ is_default: true })
          .eq("id", remaining[0].id)
          .eq("user_id", user.id);
      }
    }

    // =========================
    // Success Response
    // =========================
    return res.status(200).json({
      success: true,
      message: "Address deleted successfully",
      deletedAddress: existingAddress,
    });

  } catch (err) {
    console.error("Server error:", err);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};


// update user address

// UPDATE TO SET ADDRESS TO DEFAULT
;

// =========================
// UPDATE USER ADDRESS
// =========================
export const updateUserAddress = async (req, res) => {
  try {
    // =========================
    // Get Auth Token
    // =========================
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: "Missing authorization header",
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // =========================
    // Validate User
    // =========================
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        error: "Invalid or expired token",
      });
    }

    // =========================
    // Create Authenticated Client (CRITICAL FOR RLS)
    // =========================
    const userClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const { id } = req.params;
    const { is_default, address } = req.body;

    if (!id) {
      return res.status(400).json({
        error: "Address ID is required",
      });
    }

    // =========================
    // Check if address exists AND belongs to user
    // =========================
    const { data: existingAddress, error: fetchError } = await userClient
      .from("customer_addresses")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingAddress) {
      return res.status(404).json({
        error: "Address not found",
      });
    }

    // =========================
    // Build update payload
    // =========================
    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (address !== undefined) {
      if (typeof address !== "string" || !address.trim()) {
        return res.status(400).json({
          error: "Valid address text is required",
        });
      }
      updateData.address = address.trim();
    }

    // =========================
    // Handle default address logic
    // =========================
    if (is_default === true) {
      await userClient
        .from("customer_addresses")
        .update({ is_default: false })
        .eq("user_id", user.id)
        .neq("id", id);

      updateData.is_default = true;
    } else if (is_default === false) {
      updateData.is_default = false;
    }

    // =========================
    // Update Address
    // =========================
    const { data: updatedAddress, error: updateError } = await userClient
      .from("customer_addresses")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Update error:", updateError);

      return res.status(400).json({
        error: updateError.message,
      });
    }

    // =========================
    // Success Response
    // =========================
    return res.status(200).json({
      success: true,
      message: "Address updated successfully",
      address: updatedAddress,
    });

  } catch (err) {
    console.error("Server error:", err);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};
