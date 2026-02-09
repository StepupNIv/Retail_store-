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
app.use(express.static('public'));

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
        // Products table
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

        // Sales table
        db.run(`CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            total REAL NOT NULL,
            profit REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Sale items table
        db.run(`CREATE TABLE IF NOT EXISTS sale_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER,
            product_id INTEGER,
            product_name TEXT,
            quantity INTEGER,
            price REAL,
            cost REAL,
            FOREIGN KEY (sale_id) REFERENCES sales(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )`);

        // Chat history table
        db.run(`CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message TEXT NOT NULL,
            response TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Insert sample data if products table is empty
        db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
            if (!err && row.count === 0) {
                insertSampleData();
            }
        });
    });
}

// Insert sample data
function insertSampleData() {
    const sampleProducts = [
        { name: 'Rice 1kg', category: 'Groceries', barcode: '001', cost: 40, price: 50, stock: 100, min_stock: 20 },
        { name: 'Sugar 1kg', category: 'Groceries', barcode: '002', cost: 35, price: 45, stock: 80, min_stock: 15 },
        { name: 'Cooking Oil 1L', category: 'Groceries', barcode: '003', cost: 120, price: 150, stock: 50, min_stock: 10 },
        { name: 'Tea Powder 250g', category: 'Beverages', barcode: '004', cost: 80, price: 100, stock: 60, min_stock: 15 },
        { name: 'Milk 1L', category: 'Dairy', barcode: '005', cost: 45, price: 60, stock: 30, min_stock: 10 },
        { name: 'Bread', category: 'Bakery', barcode: '006', cost: 25, price: 35, stock: 40, min_stock: 10 },
        { name: 'Eggs (12pcs)', category: 'Dairy', barcode: '007', cost: 60, price: 75, stock: 50, min_stock: 15 },
        { name: 'Soap Bar', category: 'Personal Care', barcode: '008', cost: 20, price: 30, stock: 100, min_stock: 20 }
    ];

    const stmt = db.prepare("INSERT INTO products (name, category, barcode, cost, price, stock, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?)");
    sampleProducts.forEach(p => {
        stmt.run(p.name, p.category, p.barcode, p.cost, p.price, p.stock, p.min_stock);
    });
    stmt.finalize();
    console.log('Sample data inserted');
}

// ============ PRODUCT ENDPOINTS ============

// Get all products
app.get('/api/products', (req, res) => {
    const { search } = req.query;
    let query = "SELECT * FROM products";
    let params = [];

    if (search) {
        query += " WHERE name LIKE ? OR barcode LIKE ? OR category LIKE ?";
        const searchTerm = `%${search}%`;
        params = [searchTerm, searchTerm, searchTerm];
    }

    query += " ORDER BY name";

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// Get product by ID
app.get('/api/products/:id', (req, res) => {
    db.get("SELECT * FROM products WHERE id = ?", [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (!row) {
            res.status(404).json({ error: 'Product not found' });
        } else {
            res.json(row);
        }
    });
});

// Add new product
app.post('/api/products', (req, res) => {
    const { name, category, barcode, cost, price, stock, min_stock } = req.body;

    if (!name || !category || !cost || !price || stock === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    db.run(
        "INSERT INTO products (name, category, barcode, cost, price, stock, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [name, category, barcode || null, cost, price, stock, min_stock || 5],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ id: this.lastID, message: 'Product added successfully' });
            }
        }
    );
});

// Update product
app.put('/api/products/:id', (req, res) => {
    const { name, category, barcode, cost, price, stock, min_stock } = req.body;

    db.run(
        `UPDATE products SET 
            name = COALESCE(?, name),
            category = COALESCE(?, category),
            barcode = COALESCE(?, barcode),
            cost = COALESCE(?, cost),
            price = COALESCE(?, price),
            stock = COALESCE(?, stock),
            min_stock = COALESCE(?, min_stock),
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, category, barcode, cost, price, stock, min_stock, req.params.id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else if (this.changes === 0) {
                res.status(404).json({ error: 'Product not found' });
            } else {
                res.json({ message: 'Product updated successfully' });
            }
        }
    );
});

// Delete product
app.delete('/api/products/:id', (req, res) => {
    db.run("DELETE FROM products WHERE id = ?", [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Product not found' });
        } else {
            res.json({ message: 'Product deleted successfully' });
        }
    });
});

// Get low stock products
app.get('/api/products/alerts/low-stock', (req, res) => {
    db.all("SELECT * FROM products WHERE stock <= min_stock ORDER BY stock", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// ============ SALES ENDPOINTS ============

// Create new sale
app.post('/api/sales', (req, res) => {
    const { items } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'No items in sale' });
    }

    db.serialize(() => {
        let total = 0;
        let totalCost = 0;

        // Check stock availability first
        const checkPromises = items.map(item => {
            return new Promise((resolve, reject) => {
                db.get("SELECT stock FROM products WHERE id = ?", [item.product_id], (err, row) => {
                    if (err) reject(err);
                    else if (!row) reject(new Error(`Product ${item.product_id} not found`));
                    else if (row.stock < item.quantity) reject(new Error(`Insufficient stock for product ${item.product_id}`));
                    else resolve();
                });
            });
        });

        Promise.all(checkPromises)
            .then(() => {
                // Calculate totals
                items.forEach(item => {
                    total += item.price * item.quantity;
                    totalCost += item.cost * item.quantity;
                });

                const profit = total - totalCost;

                // Insert sale
                db.run(
                    "INSERT INTO sales (total, profit) VALUES (?, ?)",
                    [total, profit],
                    function(err) {
                        if (err) {
                            res.status(500).json({ error: err.message });
                            return;
                        }

                        const saleId = this.lastID;

                        // Insert sale items and update stock
                        const stmt = db.prepare("INSERT INTO sale_items (sale_id, product_id, product_name, quantity, price, cost) VALUES (?, ?, ?, ?, ?, ?)");
                        const updateStmt = db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?");

                        items.forEach(item => {
                            stmt.run(saleId, item.product_id, item.product_name, item.quantity, item.price, item.cost);
                            updateStmt.run(item.quantity, item.product_id);
                        });

                        stmt.finalize();
                        updateStmt.finalize();

                        res.json({ 
                            id: saleId, 
                            total, 
                            profit,
                            message: 'Sale completed successfully' 
                        });
                    }
                );
            })
            .catch(err => {
                res.status(400).json({ error: err.message });
            });
    });
});

// Get all sales
app.get('/api/sales', (req, res) => {
    const query = `
        SELECT s.*, 
               COUNT(si.id) as item_count,
               GROUP_CONCAT(si.product_name || ' x' || si.quantity) as items_summary
        FROM sales s
        LEFT JOIN sale_items si ON s.id = si.sale_id
        GROUP BY s.id
        ORDER BY s.created_at DESC
    `;

    db.all(query, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// Get sale details
app.get('/api/sales/:id', (req, res) => {
    db.get("SELECT * FROM sales WHERE id = ?", [req.params.id], (err, sale) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (!sale) {
            res.status(404).json({ error: 'Sale not found' });
        } else {
            db.all("SELECT * FROM sale_items WHERE sale_id = ?", [req.params.id], (err, items) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                } else {
                    res.json({ ...sale, items });
                }
            });
        }
    });
});

// Get sales statistics
app.get('/api/stats', (req, res) => {
    const stats = {};

    db.serialize(() => {
        // Total revenue and profit
        db.get("SELECT SUM(total) as revenue, SUM(profit) as profit, COUNT(*) as sales_count FROM sales", (err, row) => {
            if (!err) {
                stats.revenue = row.revenue || 0;
                stats.profit = row.profit || 0;
                stats.sales_count = row.sales_count || 0;
            }
        });

        // Total products
        db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
            if (!err) {
                stats.total_products = row.count || 0;
            }
        });

        // Low stock count
        db.get("SELECT COUNT(*) as count FROM products WHERE stock <= min_stock", (err, row) => {
            if (!err) {
                stats.low_stock_count = row.count || 0;
            }
        });

        // Top selling products
        db.all(`
            SELECT product_name, 
                   SUM(quantity) as total_quantity,
                   SUM(price * quantity) as total_revenue
            FROM sale_items
            GROUP BY product_name
            ORDER BY total_revenue DESC
            LIMIT 5
        `, (err, rows) => {
            if (!err) {
                stats.top_products = rows;
            }
            res.json(stats);
        });
    });
});

// ============ CHATBOT ENDPOINTS ============

// Process chatbot query
app.post('/api/chatbot', (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    const lowerMessage = message.toLowerCase();
    let response = '';

    // Check stock query
    if (lowerMessage.includes('stock') || lowerMessage.includes('available') || lowerMessage.includes('how many')) {
        const productMatch = extractProductName(lowerMessage);
        if (productMatch) {
            db.get("SELECT name, stock FROM products WHERE name LIKE ?", [`%${productMatch}%`], (err, row) => {
                if (err) {
                    response = "Sorry, I encountered an error checking the stock.";
                } else if (row) {
                    response = `We currently have ${row.stock} units of ${row.name} in stock.`;
                } else {
                    response = `I couldn't find any product matching "${productMatch}".`;
                }
                saveAndRespond(message, response, res);
            });
            return;
        }
    }

    // Check price query
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much')) {
        const productMatch = extractProductName(lowerMessage);
        if (productMatch) {
            db.get("SELECT name, price FROM products WHERE name LIKE ?", [`%${productMatch}%`], (err, row) => {
                if (err) {
                    response = "Sorry, I encountered an error checking the price.";
                } else if (row) {
                    response = `The price of ${row.name} is ₹${row.price}.`;
                } else {
                    response = `I couldn't find any product matching "${productMatch}".`;
                }
                saveAndRespond(message, response, res);
            });
            return;
        }
    }

    // Low stock alert
    if (lowerMessage.includes('low stock') || lowerMessage.includes('restock') || lowerMessage.includes('alert')) {
        db.all("SELECT name, stock, min_stock FROM products WHERE stock <= min_stock", (err, rows) => {
            if (err) {
                response = "Sorry, I encountered an error checking low stock items.";
            } else if (rows.length === 0) {
                response = "Great news! No products are currently low on stock.";
            } else {
                response = `We have ${rows.length} products low on stock:\n`;
                rows.forEach(r => {
                    response += `• ${r.name}: ${r.stock} units (minimum: ${r.min_stock})\n`;
                });
            }
            saveAndRespond(message, response, res);
        });
        return;
    }

    // Sales statistics
    if (lowerMessage.includes('sales') || lowerMessage.includes('revenue') || lowerMessage.includes('profit')) {
        db.get("SELECT SUM(total) as revenue, SUM(profit) as profit, COUNT(*) as count FROM sales", (err, row) => {
            if (err) {
                response = "Sorry, I encountered an error fetching sales data.";
            } else {
                response = `Here are your sales statistics:\n`;
                response += `• Total Sales: ${row.count || 0}\n`;
                response += `• Total Revenue: ₹${(row.revenue || 0).toFixed(2)}\n`;
                response += `• Total Profit: ₹${(row.profit || 0).toFixed(2)}`;
            }
            saveAndRespond(message, response, res);
        });
        return;
    }

    // Product search
    if (lowerMessage.includes('search') || lowerMessage.includes('find') || lowerMessage.includes('show me')) {
        const productMatch = extractProductName(lowerMessage);
        if (productMatch) {
            db.all("SELECT * FROM products WHERE name LIKE ? OR category LIKE ?", 
                [`%${productMatch}%`, `%${productMatch}%`], (err, rows) => {
                if (err) {
                    response = "Sorry, I encountered an error searching for products.";
                } else if (rows.length === 0) {
                    response = `I couldn't find any products matching "${productMatch}".`;
                } else {
                    response = `I found ${rows.length} product(s):\n`;
                    rows.forEach(r => {
                        response += `• ${r.name} - ₹${r.price} (Stock: ${r.stock})\n`;
                    });
                }
                saveAndRespond(message, response, res);
            });
            return;
        }
    }

    // Category query
    if (lowerMessage.includes('category') || lowerMessage.includes('categories')) {
        db.all("SELECT DISTINCT category FROM products ORDER BY category", (err, rows) => {
            if (err) {
                response = "Sorry, I encountered an error fetching categories.";
            } else {
                response = `We have the following categories:\n`;
                rows.forEach(r => {
                    response += `• ${r.category}\n`;
                });
            }
            saveAndRespond(message, response, res);
        });
        return;
    }

    // Help
    if (lowerMessage.includes('help') || lowerMessage === 'hi' || lowerMessage === 'hello') {
        response = `Hello! I'm your store assistant. I can help you with:\n`;
        response += `• Check stock: "How many rice do we have?"\n`;
        response += `• Check prices: "What's the price of milk?"\n`;
        response += `• Low stock alerts: "Show low stock items"\n`;
        response += `• Sales stats: "Show sales statistics"\n`;
        response += `• Search products: "Find all beverages"\n`;
        response += `• Categories: "Show all categories"\n\n`;
        response += `What would you like to know?`;
        saveAndRespond(message, response, res);
        return;
    }

    // Default response
    response = "I'm not sure I understand. Try asking about stock levels, prices, sales statistics, or type 'help' for more options.";
    saveAndRespond(message, response, res);
});

// Helper function to extract product name from message
function extractProductName(message) {
    const words = message.toLowerCase().split(' ');
    const stopWords = ['the', 'of', 'stock', 'price', 'cost', 'how', 'many', 'much', 'is', 'are', 'do', 'we', 'have', 'show', 'me', 'find', 'search', 'for', 'what', 'whats'];
    const filteredWords = words.filter(w => !stopWords.includes(w) && w.length > 2);
    return filteredWords.join(' ');
}

// Save chat and send response
function saveAndRespond(message, response, res) {
    db.run("INSERT INTO chat_history (message, response) VALUES (?, ?)", [message, response], (err) => {
        if (err) console.error('Error saving chat history:', err);
        res.json({ response });
    });
}

// Get chat history
app.get('/api/chatbot/history', (req, res) => {
    db.all("SELECT * FROM chat_history ORDER BY created_at DESC LIMIT 50", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows.reverse());
        }
    });
});

// ============ SERVER START ============

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('\nDatabase connection closed.');
        process.exit(0);
    });
});
