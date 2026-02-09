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

// Serve frontend from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Homepage route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize SQLite Database
const db = new sqlite3.Database('./provision_store.db', (err) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('✅ Connected to SQLite database');
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
            FOREIGN KEY (sale_id) REFERENCES sales(id)
        )`);

        // Chat history table
        db.run(`CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message TEXT NOT NULL,
            response TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Check if products exist, if not add sample data
        db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
            if (!err && row.count === 0) {
                console.log('📦 Adding sample products...');
                insertSampleData();
            }
        });
    });
}

// Sample data
function insertSampleData() {
    const sampleProducts = [
        { name: 'Rice 1kg', category: 'Groceries', barcode: 'RICE001', cost: 40, price: 50, stock: 100 },
        { name: 'Sugar 1kg', category: 'Groceries', barcode: 'SUGAR001', cost: 35, price: 45, stock: 80 },
        { name: 'Milk 1L', category: 'Dairy', barcode: 'MILK001', cost: 45, price: 60, stock: 30 },
        { name: 'Bread', category: 'Bakery', barcode: 'BREAD001', cost: 25, price: 35, stock: 40 },
        { name: 'Eggs 12pcs', category: 'Dairy', barcode: 'EGG001', cost: 60, price: 80, stock: 50 },
        { name: 'Cooking Oil 1L', category: 'Groceries', barcode: 'OIL001', cost: 120, price: 150, stock: 25 }
    ];

    const stmt = db.prepare("INSERT INTO products (name, category, barcode, cost, price, stock) VALUES (?, ?, ?, ?, ?, ?)");
    sampleProducts.forEach(p => {
        stmt.run(p.name, p.category, p.barcode, p.cost, p.price, p.stock);
    });
    stmt.finalize();
    console.log('✅ Sample data inserted');
}

// ================= PRODUCT API =================

// Get all products
app.get('/api/products', (req, res) => {
    db.all("SELECT * FROM products ORDER BY name", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// Get single product
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

    if (!name || !category || cost === undefined || price === undefined || stock === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    db.run(
        "INSERT INTO products (name, category, barcode, cost, price, stock, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [name, category, barcode || null, cost, price, stock, min_stock || 5],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ message: "Product added successfully", id: this.lastID });
            }
        }
    );
});

// Update product
app.put('/api/products/:id', (req, res) => {
    const { name, category, barcode, cost, price, stock, min_stock } = req.body;
    const updates = [];
    const values = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (category !== undefined) { updates.push('category = ?'); values.push(category); }
    if (barcode !== undefined) { updates.push('barcode = ?'); values.push(barcode); }
    if (cost !== undefined) { updates.push('cost = ?'); values.push(cost); }
    if (price !== undefined) { updates.push('price = ?'); values.push(price); }
    if (stock !== undefined) { updates.push('stock = ?'); values.push(stock); }
    if (min_stock !== undefined) { updates.push('min_stock = ?'); values.push(min_stock); }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id);

    const sql = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;

    db.run(sql, values, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Product not found' });
        } else {
            res.json({ message: 'Product updated successfully' });
        }
    });
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
    db.all("SELECT * FROM products WHERE stock <= min_stock ORDER BY stock ASC", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// ================= SALES API =================

// Get all sales
app.get('/api/sales', (req, res) => {
    db.all(`
        SELECT s.*, COUNT(si.id) as item_count 
        FROM sales s 
        LEFT JOIN sale_items si ON s.id = si.sale_id 
        GROUP BY s.id 
        ORDER BY s.created_at DESC
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// Get single sale with items
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
                    sale.items = items;
                    res.json(sale);
                }
            });
        }
    });
});

// Create new sale
app.post('/api/sales', (req, res) => {
    const { items } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'No items in cart' });
    }

    let total = 0;
    let profit = 0;

    // Calculate totals
    items.forEach(item => {
        total += item.price * item.quantity;
        profit += (item.price - item.cost) * item.quantity;
    });

    // Insert sale
    db.run(
        "INSERT INTO sales (total, profit) VALUES (?, ?)",
        [total, profit],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
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
                message: 'Sale completed successfully',
                sale_id: saleId,
                total: total,
                profit: profit
            });
        }
    );
});

// ================= STATISTICS API =================

app.get('/api/stats', (req, res) => {
    const stats = {};

    // Total revenue and profit
    db.get("SELECT SUM(total) as revenue, SUM(profit) as profit, COUNT(*) as sales_count FROM sales", (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        stats.revenue = row.revenue || 0;
        stats.profit = row.profit || 0;
        stats.sales_count = row.sales_count || 0;

        // Total products
        db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            stats.total_products = row.count || 0;

            // Low stock count
            db.get("SELECT COUNT(*) as count FROM products WHERE stock <= min_stock", (err, row) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                stats.low_stock_count = row.count || 0;

                // Top selling products
                db.all(`
                    SELECT 
                        product_name,
                        SUM(quantity) as total_quantity,
                        SUM(price * quantity) as total_revenue
                    FROM sale_items
                    GROUP BY product_name
                    ORDER BY total_quantity DESC
                    LIMIT 5
                `, (err, rows) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    stats.top_products = rows || [];
                    res.json(stats);
                });
            });
        });
    });
});

// ================= CHATBOT API =================

app.post('/api/chatbot', (req, res) => {
    const { message } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    const msgLower = message.toLowerCase();
    let response = '';

    // Help command
    if (msgLower.includes('help')) {
        response = `I can help you with:
• Check stock: "stock of rice" or "how much milk"
• Check prices: "price of bread"
• Sales stats: "total sales" or "revenue"
• Low stock alerts: "low stock items"
• Top products: "best selling products"`;
    }
    // Stock queries
    else if (msgLower.includes('stock') || msgLower.includes('how much') || msgLower.includes('how many')) {
        const productMatch = msgLower.match(/stock (?:of |for )?(.+)|how (?:much|many) (.+)/);
        if (productMatch) {
            const productName = (productMatch[1] || productMatch[2]).trim();
            db.get("SELECT * FROM products WHERE LOWER(name) LIKE ?", [`%${productName}%`], (err, row) => {
                if (err) {
                    response = 'Error checking stock.';
                } else if (row) {
                    response = `${row.name}: ${row.stock} units in stock. Minimum: ${row.min_stock}`;
                    if (row.stock <= row.min_stock) {
                        response += ' ⚠️ LOW STOCK ALERT!';
                    }
                } else {
                    response = `Product "${productName}" not found.`;
                }
                saveAndRespond(message, response, res);
            });
            return;
        }
    }
    // Price queries
    else if (msgLower.includes('price') || msgLower.includes('cost')) {
        const productMatch = msgLower.match(/price (?:of |for )?(.+)|cost (?:of |for )?(.+)/);
        if (productMatch) {
            const productName = (productMatch[1] || productMatch[2]).trim();
            db.get("SELECT * FROM products WHERE LOWER(name) LIKE ?", [`%${productName}%`], (err, row) => {
                if (err) {
                    response = 'Error checking price.';
                } else if (row) {
                    response = `${row.name}: ₹${row.price} (Cost: ₹${row.cost})`;
                } else {
                    response = `Product "${productName}" not found.`;
                }
                saveAndRespond(message, response, res);
            });
            return;
        }
    }
    // Sales stats
    else if (msgLower.includes('sales') || msgLower.includes('revenue') || msgLower.includes('profit')) {
        db.get("SELECT SUM(total) as revenue, SUM(profit) as profit, COUNT(*) as count FROM sales", (err, row) => {
            if (err) {
                response = 'Error fetching sales data.';
            } else {
                response = `📊 Sales Summary:
Total Sales: ${row.count || 0}
Total Revenue: ₹${(row.revenue || 0).toFixed(2)}
Total Profit: ₹${(row.profit || 0).toFixed(2)}`;
            }
            saveAndRespond(message, response, res);
        });
        return;
    }
    // Low stock
    else if (msgLower.includes('low stock') || msgLower.includes('alert')) {
        db.all("SELECT * FROM products WHERE stock <= min_stock", (err, rows) => {
            if (err) {
                response = 'Error checking low stock.';
            } else if (rows.length === 0) {
                response = '✅ No low stock items!';
            } else {
                response = '⚠️ Low Stock Items:\n' + rows.map(p => `• ${p.name}: ${p.stock} units`).join('\n');
            }
            saveAndRespond(message, response, res);
        });
        return;
    }
    // Top products
    else if (msgLower.includes('top') || msgLower.includes('best') || msgLower.includes('popular')) {
        db.all(`
            SELECT product_name, SUM(quantity) as total 
            FROM sale_items 
            GROUP BY product_name 
            ORDER BY total DESC 
            LIMIT 5
        `, (err, rows) => {
            if (err) {
                response = 'Error fetching top products.';
            } else if (rows.length === 0) {
                response = 'No sales data available yet.';
            } else {
                response = '🏆 Top Selling Products:\n' + rows.map((p, i) => `${i+1}. ${p.product_name}: ${p.total} units`).join('\n');
            }
            saveAndRespond(message, response, res);
        });
        return;
    }
    // Default
    else {
        response = `I'm your store assistant! 😊 Try asking:
• "help" - see all commands
• "stock of rice" - check product stock
• "price of milk" - check product price
• "total sales" - view sales summary`;
    }

    saveAndRespond(message, response, res);
});

function saveAndRespond(message, response, res) {
    db.run("INSERT INTO chat_history (message, response) VALUES (?, ?)", [message, response], (err) => {
        if (err) console.error('Error saving chat:', err);
    });
    res.json({ response });
}

// ================= SERVER START =================

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════╗
║   🚀 PROVISION STORE SERVER RUNNING   ║
╠════════════════════════════════════════╣
║   Port: ${PORT}                         ║
║   URL: http://localhost:${PORT}         ║
║   Database: SQLite                     ║
╚════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('\n✅ Database connection closed.');
        process.exit(0);
    });
});
