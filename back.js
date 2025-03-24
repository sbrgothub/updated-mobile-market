const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = express();
const PORT = 5000;

// Middleware
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(bodyParser.json());

const SECRET_KEY = "swabir@123";

// Connect to MongoDB
mongoose
  .connect("mongodb://127.0.0.1:27017/swabir", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Define MongoDB Schema and Model

const userSchema = new mongoose.Schema({
  userType: { type: String, enum: ["customer", "storekeeper"], required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
  image: { type: String },
  location: { type: String, required: true },
  storekeeperEmail: { type: String, required: true },
  storekeeperName: { type: String, required: true },
});



const User = mongoose.model("User", userSchema);
const Product = mongoose.model("Product", productSchema);

// **Routes for Authentication**

// Register Route
const isValidEmail = (email) => /^[^\s@]+@[a-zA-Z]+\.com$/.test(email);

app.post("/auth/register", async (req, res) => {
  const { userType, email, password } = req.body;

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Invalid email format. Only '@.com' emails are allowed." });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ userType, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/auth/login", async (req, res) => {
  const { email, password, userType } = req.body;

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Invalid email format. Only '@.com' emails are allowed." });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    if (user.userType !== userType) {
      return res.status(400).json({ message: "Invalid login. Please check your user type." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign({ email: user.email, userType: user.userType }, SECRET_KEY, { expiresIn: "1h" });

    res.status(200).json({
      message: "Login successful",
      user: { email: user.email, userType: user.userType },
      token,
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
;

// **Live Location Update Route**
app.post("/update-location", async (req, res) => {
  try {
    const { email, location } = req.body;

    if (!email || !location) {
      return res.status(400).json({ message: "Email and location are required" });
    }

    // Update all products of this storekeeper with new location
    await Product.updateMany({ storekeeperEmail: email }, { $set: { location } });

    res.json({ message: "Location updated successfully" });
  } catch (error) {
    console.error("Error updating location:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//fetch module import
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args)); // Ensure fetch is available
const GEMINI_API_KEY = "AIzaSyCikEf0U0U17Nsn-gqIaY4hqNxxupBMJ_A"; // 🔑 Replace with your API key

const validateProductWithAI = async (productName) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `1. Is "${productName}" a commonly recognized product? Answer only "Yes" or "No".\n` +
                        `2. If it is a real product, is it sold by weight (kg) or by unit (piece)? Answer only "kg" or "unit".`
                }
              ]
            }
          ]
        }),
      }
    );

    // ✅ Check response status before parsing JSON
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Gemini API Error:", errorText);
      throw new Error(`Gemini API Error: ${response.statusText}`);
    }

    // ✅ Log raw response before parsing
    const rawText = await response.text();
    console.log("🔍 Gemini Raw Response:", rawText);

    if (!rawText || rawText.trim() === "") {
      throw new Error("❌ Gemini API returned an empty response.");
    }

    // ✅ Parse JSON safely
    const data = JSON.parse(rawText);

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("❌ Gemini API returned an empty candidates list.");
    }

    // ✅ Extract AI response text
    const aiResponseText = data.candidates[0].content.parts[0].text.trim().toLowerCase();
    const aiResponse = aiResponseText.split("\n");

    // ✅ Ensure at least one response exists
    const isValid = aiResponse.length > 0 && aiResponse[0].trim() === "yes";

    // ✅ Ensure stock type exists, otherwise default to "unit"
    const stockType = aiResponse.length > 1 ? aiResponse[1].trim() : "unit";

    return { valid: isValid, stockType: stockType };

  } catch (error) {
    console.error("❌ Error validating product with AI:", error.message);
    return { valid: false, stockType: "unit" };
  }
};



// ✅ Updated Route to Validate Product and Predict Stock Type
app.post("/products", async (req, res) => {
  try {
    const { name, price, stock, image, location, storekeeperEmail, storekeeperName } = req.body;

    if (!name || !price || !stock || !storekeeperEmail || !storekeeperName) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // 🔍 Validate Product Name & Predict Stock Type with Gemini AI
    const { valid, stockType } = await validateProductWithAI(name);

    if (!valid) {
      return res.status(400).json({ message: "Invalid product name. Only recognized products can be added." });
    }

    // ✅ Save Product to MongoDB with Predicted Stock Type
    const newProduct = new Product({
      name,
      price,
      stock,
      stockType,
      image,
      location,
      storekeeperEmail,
      storekeeperName,
    });

    await newProduct.save();
    res.status(201).json({ message: "Product added successfully", product: newProduct });

  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get Products for Storekeeper
app.get("/products", async (req, res) => {
  try {
    const { storekeeperEmail } = req.query;
    if (!storekeeperEmail) {
      return res.status(400).json({ message: "Storekeeper email is required" });
    }

    const products = await Product.find({ storekeeperEmail });
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Booking Route
app.post("/book", async (req, res) => {
  const { cart } = req.body;

  if (!cart || cart.length === 0) {
    return res.status(400).json({ message: "Cart is empty. Cannot book products." });
  }

  try {
    for (const booking of cart) {
      const product = await Product.findById(booking.productId);
      if (!product) {
        console.error(`❌ Product not found: ${booking.productId}`);
        continue;
      }

      if (product.stock < booking.quantity) {
        console.error(`❌ Not enough stock for ${product.name}. Requested: ${booking.quantity}, Available: ${product.stock}`);
        continue;
      }

      const newStock = product.stock - booking.quantity;

      if (newStock <= 0) {
        await Product.findByIdAndDelete(booking.productId);
        console.log(`🗑️ Product deleted: ${product.name} (Stock reached 0)`);
      } else {
        const updateResult = await Product.updateOne(
          { _id: booking.productId },
          { $set: { stock: newStock } }
        );
        console.log(`✅ Stock updated: ${product.name} - New Stock: ${newStock}`);
        console.log("🔍 MongoDB Update Result:", updateResult);
      }
    }

    res.status(200).json({ message: "Booking successful" });

  } catch (error) {
    console.error("❌ Error updating stock:", error);
    res.status(500).json({ message: "Failed to book products" });
  }
});


app.get("/search", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    // ✅ Find products that match the search query (case insensitive)
    const products = await Product.find({
      name: { $regex: query, $options: "i" } // Case-insensitive search
    });

    if (products.length === 0) {
      return res.status(404).json({ message: "No products found." });
    }

    res.json(products);
  } catch (error) {
    console.error("❌ Error searching products:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/propage", async (req, res) => {
  try {
    const { storekeeperEmail } = req.query; // Get storekeeper email

    if (!storekeeperEmail) {
      return res.status(400).json({ message: "Storekeeper email is required" });
    }

    // Fetch only products added by the specific storekeeper
    const products = await Product.find({ storekeeperEmail });

    if (!products || products.length === 0) {
      return res.status(404).json({ message: "No products found for this storekeeper." });
    }

    res.json(products);
  } catch (error) {
    console.error("Error fetching storekeeper products:", error);
    res.status(500).json({ message: "Server error." });
  }
});




app.delete("/products/:id", async (req, res) => {
  try {
   const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
