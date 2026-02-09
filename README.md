# Provision Store Management System

A full-stack desktop application for managing a provision store with inventory management, point-of-sale, sales tracking, and an AI chatbot assistant.

## Features

### 🎯 Core Features
- **Point of Sale (POS)** - Quick billing with cart management
- **Inventory Management** - Track products, stock levels, and categories
- **Sales History** - Complete transaction records with detailed breakdowns
- **Reports & Analytics** - Revenue, profit, and business insights
- **AI Chatbot Assistant** - Get instant answers about stock, prices, and sales

### 🤖 Chatbot Capabilities
- Check product stock levels
- Get product prices
- View low stock alerts
- Access sales statistics
- Search products by name or category
- List product categories
- Get helpful suggestions

### 📊 Backend Features
- SQLite database for reliable data storage
- RESTful API for all operations
- Automatic stock updates on sales
- Real-time low stock alerts
- Sales analytics and reporting
- Chat history tracking

## Technology Stack

**Backend:**
- Node.js
- Express.js
- SQLite3
- CORS enabled for local development

**Frontend:**
- Pure HTML5, CSS3, JavaScript
- Responsive design
- Real-time updates
- Interactive chatbot UI

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (Node Package Manager)

### Step 1: Install Dependencies

```bash
npm install
```

This will install:
- express - Web server framework
- sqlite3 - Database
- cors - Cross-origin resource sharing
- body-parser - Request body parsing

### Step 2: Start the Backend Server

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

You should see:
```
🚀 Server running on http://localhost:3000
📊 API endpoints available at http://localhost:3000/api
Connected to SQLite database
```

### Step 3: Open the Frontend

Open `index.html` in your web browser. You should see:
- ✓ Connected to Server (green indicator in top-right)

## Usage Guide

### Adding Products
1. Go to **Inventory** tab
2. Fill in product details:
   - Product Name (required)
   - Category (required)
   - Barcode/SKU (optional)
   - Cost Price (required)
   - Selling Price (required)
   - Stock Quantity (required)
   - Minimum Stock Alert (optional, default: 5)
3. Click "Add Product to Database"

### Making a Sale
1. Go to **Point of Sale** tab
2. Search for products using the search box
3. Select product and quantity
4. Click "Add to Cart"
5. Review cart items
6. Click "Complete Sale" to finalize

### Viewing Reports
1. Go to **Reports** tab
2. View statistics:
   - Total Revenue
   - Total Profit
   - Total Sales Count
   - Total Products
   - Low Stock Items
3. Check Low Stock Alerts table
4. View Top Selling Products

### Using the Chatbot
1. Click the chat icon (💬) in the bottom-right corner
2. Ask questions like:
   - "How many rice do we have?"
   - "What's the price of milk?"
   - "Show low stock items"
   - "Show sales statistics"
   - "Find all beverages"
   - "help" - for all available commands

## API Endpoints

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Add new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/products/alerts/low-stock` - Get low stock products

### Sales
- `GET /api/sales` - Get all sales
- `GET /api/sales/:id` - Get sale details
- `POST /api/sales` - Create new sale

### Statistics
- `GET /api/stats` - Get business statistics

### Chatbot
- `POST /api/chatbot` - Send message to chatbot
- `GET /api/chatbot/history` - Get chat history

## Database Schema

### Products Table
```sql
- id: INTEGER PRIMARY KEY
- name: TEXT
- category: TEXT
- barcode: TEXT
- cost: REAL
- price: REAL
- stock: INTEGER
- min_stock: INTEGER
- created_at: DATETIME
- updated_at: DATETIME
```

### Sales Table
```sql
- id: INTEGER PRIMARY KEY
- total: REAL
- profit: REAL
- created_at: DATETIME
```

### Sale Items Table
```sql
- id: INTEGER PRIMARY KEY
- sale_id: INTEGER
- product_id: INTEGER
- product_name: TEXT
- quantity: INTEGER
- price: REAL
- cost: REAL
```

### Chat History Table
```sql
- id: INTEGER PRIMARY KEY
- message: TEXT
- response: TEXT
- created_at: DATETIME
```

## Sample Data

The system comes with pre-loaded sample data:
- Rice 1kg
- Sugar 1kg
- Cooking Oil 1L
- Tea Powder 250g
- Milk 1L
- Bread
- Eggs (12pcs)
- Soap Bar

## Troubleshooting

### Server won't start
- Make sure port 3000 is not already in use
- Check if Node.js is installed: `node --version`
- Reinstall dependencies: `npm install`

### Frontend shows "Server Offline"
- Make sure the backend server is running
- Check console for errors (F12 in browser)
- Verify server is running on http://localhost:3000

### Database errors
- Delete `provision_store.db` file and restart server
- Server will create a fresh database with sample data

### Chatbot not responding
- Check backend server console for errors
- Verify API endpoint: http://localhost:3000/api/chatbot
- Check browser console for network errors

## File Structure

```
provision-store/
├── server.js           # Backend API server
├── index.html          # Frontend application
├── package.json        # Dependencies and scripts
├── provision_store.db  # SQLite database (auto-created)
└── README.md          # This file
```

## Development

### Adding New Features
1. Backend: Add new routes in `server.js`
2. Frontend: Add UI elements in `index.html`
3. Test with sample data

### Database Queries
Access database directly:
```bash
sqlite3 provision_store.db
```

Common queries:
```sql
SELECT * FROM products;
SELECT * FROM sales;
SELECT * FROM sale_items;
```

## Security Notes

⚠️ **Important:** This is a local development application. For production use:
- Add authentication
- Use environment variables for configuration
- Implement proper error handling
- Add input validation and sanitization
- Use HTTPS
- Implement rate limiting
- Add backup functionality

## Future Enhancements

Potential features to add:
- [ ] Customer management
- [ ] Supplier tracking
- [ ] Barcode scanner integration
- [ ] Receipt printing
- [ ] Export reports to PDF/Excel
- [ ] Multi-user support
- [ ] Cloud backup
- [ ] Mobile app version
- [ ] Payment method tracking
- [ ] Discount and promotion management

## License

MIT License - Free to use and modify

## Support

For issues or questions:
1. Check the Troubleshooting section
2. Review API endpoints in server.js
3. Check browser console for errors
4. Verify backend server is running

---

**Enjoy managing your provision store! 🏪**
