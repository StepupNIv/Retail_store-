// server.js - Backend API Server with Database and Chatbot
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// 🔥 serve frontend from public folder
app.use(express.static(path.join(__dirname, 'public')));

// 🔥 Homepage route (important)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize SQLite Database
const db = new sqlite3.Database('./provision_store.db', (err) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Create database tables
function initializeDatabase() {
    db.serialize(() => {

        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            barcode TEXT,
            cost REAL NOT NULL,
            price REAL NOT NULL,
            stock INTEGER NOT NULL,
            min_stock INTEGER DEFAULT 5,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            total REAL NOT NULL,
            profit REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS sale_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER,
            product_id INTEGER,
            product_name TEXT,
            quantity INTEGER,
            price REAL,
            cost REAL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message TEXT NOT NULL,
            response TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
            if (!err && row.count === 0) {
                insertSampleData();
            }
        });
    });
}

// Sample data
function insertSampleData() {
    const sampleProducts = [
        { name: 'Rice 1kg', category: 'Groceries', cost: 40, price: 50, stock: 100 },
        { name: 'Sugar 1kg', category: 'Groceries', cost: 35, price: 45, stock: 80 },
        { name: 'Milk 1L', category: 'Dairy', cost: 45, price: 60, stock: 30 },
        { name: 'Bread', category: 'Bakery', cost: 25, price: 35, stock: 40 }
    ];

    const stmt = db.prepare("INSERT INTO products (name, category, cost, price, stock) VALUES (?, ?, ?, ?, ?)");
    sampleProducts.forEach(p => {
        stmt.run(p.name, p.category, p.cost, p.price, p.stock);
    });
    stmt.finalize();
}

// ================= PRODUCT API =================
app.get('/api/products', (req, res) => {
    db.all("SELECT * FROM products", (err, rows) => {
        if (err) res.status(500).json(err);
        else res.json(rows);
    });
});

app.post('/api/products', (req, res) => {
    const { name, category, cost, price, stock } = req.body;

    db.run(
        "INSERT INTO products (name, category, cost, price, stock) VALUES (?, ?, ?, ?, ?)",
        [name, category, cost, price, stock],
        function(err) {
            if (err) res.status(500).json(err);
            else res.json({ message: "Product added", id: this.lastID });
        }
    );
});

// ================= CHATBOT =================
app.post('/api/chatbot', (req, res) => {
    const { message } = req.body;
    let response = "I am your store assistant 😊";

    if (message.toLowerCase().includes("stock")) {
        response = "Stock feature working!";
    }

    db.run("INSERT INTO chat_history (message, response) VALUES (?, ?)", 
    [message, response]);

    res.json({ response });
});

// ================= SERVER START =================
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

