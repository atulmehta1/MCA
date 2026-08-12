const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const User = require("./models/User");
const Product = require("./models/Product");
const Order = require("./models/Order");

const app = express();
app.use(cors());
app.use(express.json());


connectDB();


async function seedProducts() {
  const count = await Product.countDocuments();

  if (count === 0) {
    console.log(" Seeding products...");

    await Product.insertMany([
      {
        name: "iPhone 13",
        brand: "Apple",
        category: "Electronics",
        description: "Latest Apple smartphone",
        price: 60000,
        originalPrice: 70000,
        rating: 4.5,
        reviews: 120,
        badge: "Best Seller",
        image: "https://m.media-amazon.com/images/I/61-r9zOKBCL._SX679_.jpg"
      },
      {
        name: "Samsung Galaxy S21",
        brand: "Samsung",
        category: "Electronics",
        description: "Android flagship phone",
        price: 50000,
        originalPrice: 60000,
        rating: 4.3,
        reviews: 95,
        badge: "Deal of the Day",
        image: "https://m.media-amazon.com/images/I/81kfA-GtWwL._SX679_.jpg"
      },
      {
        name: "Nike Running Shoes",
        brand: "Nike",
        category: "Fashion",
        description: "Comfortable sports shoes",
        price: 3000,
        originalPrice: 5000,
        rating: 4.4,
        reviews: 80,
        badge: "Best Seller",
        image: "https://static.nike.com/a/images/t_default/2b1b3e9f-3f3f-4c5e-9e6b-3c8f1e4c3a1f/air-max-running-shoes.jpg"
      },
      {
        name: "Cooking Pan",
        brand: "Prestige",
        category: "Home & Kitchen",
        description: "Non-stick cookware",
        price: 1200,
        originalPrice: 2000,
        rating: 4.2,
        reviews: 60,
        badge: "Deal of the Day",
        image: "https://m.media-amazon.com/images/I/71dE7j4yKVL._SX679_.jpg"
      },
      {
        name: "Cricket Bat",
        brand: "SG",
        category: "Sports",
        description: "Professional cricket bat",
        price: 2500,
        originalPrice: 3500,
        rating: 4.1,
        reviews: 40,
        badge: "Best Seller",
        image: "https://m.media-amazon.com/images/I/61XK6cQhHfL._SX679_.jpg"
      },
      {
        name: "Face Cream",
        brand: "Nivea",
        category: "Beauty",
        description: "Moisturizing cream",
        price: 300,
        originalPrice: 500,
        rating: 4.0,
        reviews: 30,
        badge: "Deal of the Day",
        image: "https://m.media-amazon.com/images/I/51l2Y4zX2EL._SX679_.jpg"
      }
    ]);

    console.log("✅ Products inserted!");
  }
}

seedProducts();

// ===== TOKEN HELPERS =====
function generateToken(user) {
  const payload = JSON.stringify({
    id: user._id,
    email: user.email,
    name: user.name,
  });
  return Buffer.from(payload).toString("base64");
}

function verifyToken(token) {
  try {
    return JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}

// ===== AUTH MIDDLEWARE =====
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  const user = verifyToken(token);

  if (!user) {
    return res.status(401).json({ message: "Invalid token" });
  }

  req.user = user;
  next();
}

// ===== AUTH ROUTES =====

// Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const newUser = await User.create({ name, email, password });
    const token = generateToken(newUser);

    res.status(201).json({ token, user: newUser });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, password });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);

    res.json({ token, user });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ===== PRODUCTS =====

// Get products
app.get("/api/products", async (req, res) => {
  try {
    const { search, category, sort } = req.query;

    let filter = {};

    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [
        { name: regex },
        { brand: regex },
        { category: regex },
        { description: regex },
      ];
    }

    if (category) {
      filter.category = { $regex: category, $options: "i" };
    }

    let query = Product.find(filter);

    if (sort === "price-low") query = query.sort({ price: 1 });
    if (sort === "price-high") query = query.sort({ price: -1 });
    if (sort === "rating") query = query.sort({ rating: -1 });

    const products = await query;

    res.json(products);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Single product
app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Categories
app.get("/api/categories", async (req, res) => {
  try {
    const categories = await Product.distinct("category");
    res.json(categories);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ===== ORDERS =====
app.post("/api/orders", authMiddleware, async (req, res) => {
  try {
    const { items, total, address } = req.body;

    const order = await Order.create({
      user: req.user.id,
      items,
      total,
      address,
    });

    res.status(201).json(order);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/orders", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ===== START SERVER =====
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});