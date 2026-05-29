import { supabase } from "../utils/supabase.js";
import { createClient } from '@supabase/supabase-js';

export const createOrder = async (req, res) => {
 
  
  try {
    // 1️⃣ Check for Authorization Header
    const authHeader = req.headers.authorization;
   
    
    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // 2️⃣ Create authenticated Supabase client
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

    // 3️⃣ Get authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      console.error("User auth error:", userError);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    
    

    // 4️⃣ Extract data from request body
    const {
      customer,
      delivery_address,
      items,
      summary,
      payment,
      created_at
    } = req.body;

    // 5️⃣ Validate required fields
    if (!customer || !customer.name || !customer.email || !customer.phone) {
      console.error("Missing customer info");
      return res.status(400).json({ error: "Complete customer information is required" });
    }

    if (!delivery_address || !delivery_address.full_address) {
      console.error("Missing delivery address");
      return res.status(400).json({ error: "Delivery address is required" });
    }

    if (!items || items.length === 0) {
      console.error("Missing items");
      return res.status(400).json({ error: "Order items are required" });
    }

    if (!summary || !summary.total) {
      console.error("Missing summary");
      return res.status(400).json({ error: "Order summary is required" });
    }

    if (!payment || !payment.method) {
      console.error("Missing payment method");
      return res.status(400).json({ error: "Payment method is required" });
    }

    // 6️⃣ Format items for JSONB storage
    const formattedItems = items.map(item => ({
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
      color: item.color || null,
      image: item.image || null
    }));



    // 7️⃣ Insert order into orders table
    const orderDataToInsert = {
      user_id: user.id,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      customer_address: delivery_address.full_address,
      items: formattedItems,
      order_total: summary.total,
      status: 'pending',
      order_id: `RJM-${Math.floor(100000 + Math.random() * 900000) + 'abcdef'.charAt(Math.floor(Math.random() * 6))}`,
      payment_method: payment.method,
      created_at: created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
   

    const { data: orderData, error: orderError } = await supabaseUser
      .from('orders')
      .insert(orderDataToInsert)
      .select()
      .single();

    if (orderError) {
      console.error('Error inserting order:', orderError);
      return res.status(500).json({ error: "Failed to create order", details: orderError.message });
    }

   

    // 8️⃣ Return success response
    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: {
        id: orderData.order_id,
        customer_name: orderData.customer_name,
        customer_email: orderData.customer_email,
        customer_phone: orderData.customer_phone,
        customer_address: orderData.customer_address,
        items: orderData.items,
        order_total: orderData.order_total,
        status: orderData.status,
        payment_method: orderData.payment_method,
        created_at: orderData.created_at
      }
    });

  } catch (err) {
    console.error('Unexpected error creating order:', err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};





// Get user orders
export const getOrders = async (req, res) => {
  try {
    // 1️⃣ Check for Authorization Header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // 2️⃣ Create authenticated Supabase client
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

    // 3️⃣ Get authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      console.error("User auth error:", userError);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    
   

    // 4️⃣ Get all orders for this user, ordered by newest first
    const { data: orders, error: ordersError } = await supabaseUser
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return res.status(500).json({ error: "Failed to fetch orders", details: ordersError.message });
    }

    // 5️⃣ Return success response
    return res.status(200).json({
      success: true,
      orders: orders
    });

  } catch (err) {
    console.error('Unexpected error fetching orders:', err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};



// Get ALL orders for admin (no user_id filter)
export const getAllOrders = async (req, res) => {
  try {
    // 1️⃣ Check for Authorization Header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // 2️⃣ Create authenticated Supabase client
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

    // 3️⃣ Get authenticated user to verify they are admin
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // 4️⃣ Check if user is admin (you need to verify admin role)
    const { data: profile, error: profileError } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    // 5️⃣ Get ALL orders (no user_id filter) - only for admin
    const { data: orders, error: ordersError } = await supabaseUser
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return res.status(500).json({ error: "Failed to fetch orders", details: ordersError.message });
    }

    // 6️⃣ Return success response
    return res.status(200).json({
      success: true,
      orders: orders,
      count: orders.length
    });

  } catch (err) {
    console.error('Unexpected error fetching orders:', err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};



export const updateOrderStatus = async (req, res) => {
  try {
    // 1️⃣ Check for Authorization Header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // 2️⃣ Create authenticated Supabase client
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

    // 3️⃣ Get authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      console.error("User auth error:", userError);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // 4️⃣ Check if user is admin (optional - only allow admins to update status)
    const { data: profile, error: profileError } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    // 5️⃣ Get order ID from params and status from body
    const { orderId } = req.params;
    const { status } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    // Valid status values
    const validStatuses = ['pending', 'processing', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    // 6️⃣ Update order status
    const { data: order, error: orderError } = await supabaseUser
      .from('orders')
      .update({ 
        status: status.toLowerCase(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (orderError) {
      console.error('Error updating order status:', orderError);
      return res.status(500).json({ error: "Failed to update order status", details: orderError.message });
    }

    // 7️⃣ Return success response
    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order: {
        id: order.id,
        status: order.status,
        updated_at: order.updated_at
      }
    });

  } catch (err) {
    console.error('Unexpected error updating order status:', err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};
