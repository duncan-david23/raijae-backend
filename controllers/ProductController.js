import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { supabase } from "../utils/supabase.js";
import { createClient } from '@supabase/supabase-js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer (in-memory)
const upload = multer({ storage: multer.memoryStorage() });
export const uploadMiddleware = upload.array("product_images", 5); // up to 5 images

export const addProduct = async (req, res) => {
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

    // 3️⃣ Validate User Token
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      console.error("Invalid or expired token:", userError);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // 4️⃣ Extract product details
    const {
      skuid,
      product_name,
      product_description,
      product_price,
      product_discount,
      product_discount_type,
      brand,
      product_stock,
      status,
      product_categories,
      product_colors,
      existing_images,
    } = req.body;

    // 5️⃣ Validate required fields
    if (!product_name || !product_name.trim()) {
      return res.status(400).json({ error: "Product name is required" });
    }
    if (!product_price || parseFloat(product_price) <= 0) {
      return res.status(400).json({ error: "Price must be greater than 0" });
    }
    if (!product_stock || parseInt(product_stock) < 0) {
      return res.status(400).json({ error: "Stock must be a valid number" });
    }

    // 6️⃣ Parse JSON strings back to arrays
    let parsedCategories = [];
    let parsedColors = [];
    let parsedExistingImages = [];

    try {
      if (product_categories) {
        parsedCategories = typeof product_categories === 'string' 
          ? JSON.parse(product_categories) 
          : product_categories;
      }
    
      if (product_colors) {
        parsedColors = typeof product_colors === 'string' 
          ? JSON.parse(product_colors) 
          : product_colors;
      }
      if (existing_images) {
        parsedExistingImages = typeof existing_images === 'string' 
          ? JSON.parse(existing_images) 
          : existing_images;
      }
    } catch (parseError) {
      console.error("Error parsing JSON fields:", parseError);
      return res.status(400).json({ error: "Invalid JSON data in one or more fields" });
    }

    // 7️⃣ Upload new product images to Cloudinary
    const uploadedUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const base64String = file.buffer.toString('base64');
          const dataURI = `data:${file.mimetype};base64,${base64String}`;
          
          const result = await cloudinary.uploader.upload(dataURI, {
            folder: "products"
          });
          
          uploadedUrls.push(result.secure_url);
        } catch (uploadError) {
          console.error("Cloudinary upload error:", uploadError);
        }
      }
    }

    // 8️⃣ Combine existing images with newly uploaded ones
    const allProductImages = [...parsedExistingImages, ...uploadedUrls];
    console.log("User ID:", user.id);

    // 9️⃣ Insert product using AUTHENTICATED Supabase client
    const { data, error: insertError } = await supabaseUser
      .from("products")
      .insert([
        {
          user_id: user.id,
          skuid: skuid || `RAIJAM${Math.floor(100000 + Math.random() * 900000)}`,
          product_name: product_name.trim(),
          product_description: product_description || "",
          product_brand: brand || "",
          product_price: parseFloat(product_price),
          discount: product_discount ? parseInt(product_discount) : 0,
          discount_type: product_discount_type || "",
          product_stock: parseInt(product_stock),
          status: status || (parseInt(product_stock) > 0 ? "In Stock" : "Out of Stock"),
          product_categories: parsedCategories,
          product_colors: parsedColors,
          product_images: allProductImages,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return res.status(400).json({ error: insertError.message });
    }

    // 🔟 Success response
    return res.status(201).json({ message: "Product created successfully", product: data });
    
  } catch (err) {
    console.error("Unexpected error in addProduct:", err);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
};





// GET /api/products - For everyone (customers & admins)
export const getAllProducts = async (req, res) => {
  try {
    // Optional: Check for auth token (if user is logged in)
    // const authHeader = req.headers.authorization;
    // let supabaseClient = supabase; // Use default client for public access
    
    // // If token provided, create authenticated client
    // if (authHeader) {
    //   const token = authHeader.replace("Bearer ", "").trim();
    //   supabaseClient = createClient(
    //     process.env.SUPABASE_URL,
    //     process.env.SUPABASE_ANON_KEY,
    //     {
    //       global: {
    //         headers: {
    //           Authorization: `Bearer ${token}`
    //         }
    //       }
    //     }
    //   );
    // }
    
    // Fetch all products (RLS will handle visibility)
    const { data: products, error: fetchError } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Supabase fetch error:", fetchError);
      return res.status(400).json({ error: fetchError.message });
    }

    return res.status(200).json({ products });
    
  } catch (err) {
    console.error("Unexpected error in getAllProducts:", err);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
};





// GET /api/products/product/:id - For everyone (customers & admins)

export const getProductById = async (req, res) => {
  try {
    // 1️⃣ Get product ID from params
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    // Optional: Check for auth token (if user is logged in)
    // const authHeader = req.headers.authorization;
    // let supabaseClient = supabase;
    
    // if (authHeader) {
    //   const token = authHeader.replace("Bearer ", "").trim();
    //   supabaseClient = createClient(
    //     process.env.SUPABASE_URL,
    //     process.env.SUPABASE_ANON_KEY,
    //     {
    //       global: {
    //         headers: {
    //           Authorization: `Bearer ${token}`
    //         }
    //       }
    //     }
    //   );
    // }
    
    // 2️⃣ Fetch single product by ID
    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Supabase fetch error:", fetchError);
      return res.status(404).json({ error: "Product not found" });
    }

    // 3️⃣ Success response
    return res.status(200).json({ product });
    
  } catch (err) {
    console.error("Unexpected error in getProductById:", err);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
};



// PUT /api/products/product/:id - Update product (admin only)

export const updateProduct = async (req, res) => {
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

    // 3️⃣ Validate User Token
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      console.error("Invalid or expired token:", userError);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // 4️⃣ Get product ID from params
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    // 5️⃣ Extract product details from request body
    const {
      skuid,
      product_name,
      product_description,
      product_price,
      product_discount,
      product_discount_type,
      brand,
      product_stock,
      status,
      product_categories,
      product_colors,
      existing_images,
    } = req.body;

    // 6️⃣ Validate required fields
    if (!product_name || !product_name.trim()) {
      return res.status(400).json({ error: "Product name is required" });
    }
    if (!product_price || parseFloat(product_price) <= 0) {
      return res.status(400).json({ error: "Price must be greater than 0" });
    }
    if (!product_stock || parseInt(product_stock) < 0) {
      return res.status(400).json({ error: "Stock must be a valid number" });
    }

    // 7️⃣ Parse JSON strings back to arrays
    let parsedCategories = [];
    let parsedColors = [];
    let parsedExistingImages = [];

    try {
      if (product_categories) {
        parsedCategories = typeof product_categories === 'string' 
          ? JSON.parse(product_categories) 
          : product_categories;
      }
    
      if (product_colors) {
        parsedColors = typeof product_colors === 'string' 
          ? JSON.parse(product_colors) 
          : product_colors;
      }
      if (existing_images) {
        parsedExistingImages = typeof existing_images === 'string' 
          ? JSON.parse(existing_images) 
          : existing_images;
      }
    } catch (parseError) {
      console.error("Error parsing JSON fields:", parseError);
      return res.status(400).json({ error: "Invalid JSON data in one or more fields" });
    }

    // 8️⃣ Upload new product images to Cloudinary (if any)
    const uploadedUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const base64String = file.buffer.toString('base64');
          const dataURI = `data:${file.mimetype};base64,${base64String}`;
          
          const result = await cloudinary.uploader.upload(dataURI, {
            folder: "products"
          });
          
          uploadedUrls.push(result.secure_url);
        } catch (uploadError) {
          console.error("Cloudinary upload error:", uploadError);
        }
      }
    }

    // 9️⃣ Combine existing images with newly uploaded ones
    const allProductImages = [...parsedExistingImages, ...uploadedUrls];

    // 🔟 Update product in Supabase
    const { data, error: updateError } = await supabaseUser
      .from("products")
      .update({
        product_name: product_name.trim(),
        product_description: product_description || "",
        product_brand: brand || "",
        product_price: parseFloat(product_price),
        discount: product_discount ? parseInt(product_discount) : 0,
        discount_type: product_discount_type || "",
        product_stock: parseInt(product_stock),
        status: status || (parseInt(product_stock) > 0 ? "In Stock" : "Out of Stock"),
        product_categories: parsedCategories,
        product_colors: parsedColors,
        product_images: allProductImages,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return res.status(400).json({ error: updateError.message });
    }

    // 1️⃣1️⃣ Success response
    return res.status(200).json({ message: "Product updated successfully", product: data });
    
  } catch (err) {
    console.error("Unexpected error in updateProduct:", err);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
};




export const deleteProduct = async (req, res) => {
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

    // 3️⃣ Validate User Token
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      console.error("Invalid or expired token:", userError);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // 4️⃣ Get product ID from params
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    // 5️⃣ First, get the product to check if it exists and get image URLs
    const { data: product, error: fetchError } = await supabaseUser
      .from("products")
      .select("product_images")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Product not found:", fetchError);
      return res.status(404).json({ error: "Product not found" });
    }

    // 6️⃣ Optional: Delete images from Cloudinary to save storage
    if (product.product_images && product.product_images.length > 0) {
      for (const imageUrl of product.product_images) {
        try {
          // Extract public_id from Cloudinary URL
          const urlParts = imageUrl.split('/');
          const filename = urlParts[urlParts.length - 1];
          const publicId = `products/${filename.split('.')[0]}`;
          
          await cloudinary.uploader.destroy(publicId);
          console.log(`Deleted image: ${publicId}`);
        } catch (cloudinaryError) {
          console.error("Error deleting image from Cloudinary:", cloudinaryError);
          // Continue with product deletion even if image deletion fails
        }
      }
    }

    // 7️⃣ Delete product from Supabase
    const { data, error: deleteError } = await supabaseUser
      .from("products")
      .delete()
      .eq("id", id)
      .select()
      .single();

    if (deleteError) {
      console.error("Supabase delete error:", deleteError);
      return res.status(400).json({ error: deleteError.message });
    }

    // 8️⃣ Success response
    return res.status(200).json({ 
      message: "Product deleted successfully", 
      product: data 
    });
    
  } catch (err) {
    console.error("Unexpected error in deleteProduct:", err);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
};









