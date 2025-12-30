# Nextier Visual Dashboards

Beautiful Python-powered analytics dashboards for SMS campaigns, AI workers, and automation scheduling.

## Features

### 📊 SMS Analytics
- **Summary Metrics**: Total SMS, Delivered, Success, Undelivered, Received, Failed, Blacklist
- **Donut Charts**: Response classification breakdown
- **Area Charts**: Message volume trends over time
- **Delivery Performance**: Stacked bar charts for delivered vs failed

### 🤖 AI Workers
- **Worker Cards**: GIANNA, CATHY, SABRINA performance stats
- **Gauge Charts**: Response rate visualization per worker
- **Comparison Bars**: Side-by-side worker performance

### 📈 Campaigns
- **Campaign Cards**: Top performing campaigns with progress bars
- **Horizontal Bars**: Campaign comparison charts
- **Metrics**: Sent, Delivered, Responses, Response Rate

### ⚡ Automations
- **Rule Builder**: If-this-then-that automation designer
- **Active Rules**: Visual list of automation rules with match counts
- **Triggers**: Classification, Time-based, Data capture, Keyword match
- **Actions**: Send message, Assign worker, Move to queue, Add label, Suppress

### 📅 Schedule Calendar
- **Visual Calendar**: Monthly view of scheduled campaigns
- **Event Cards**: Campaign details on calendar days
- **Upcoming List**: Timeline of scheduled sends

## Quick Start

### 1. Install Dependencies
```bash
cd dashboards
pip install -r requirements.txt
```

### 2. Configure Database
```bash
cp .env.example .env
# Edit .env with your DATABASE_URL
```

### 3. Run Dashboard
```bash
streamlit run app.py
```

### 4. Open Browser
Navigate to http://localhost:8501

## Demo Mode

The dashboard includes a demo mode with sample data. Enable it in the sidebar:
- Check "Use Demo Data" to preview without database connection

## Deployment (Digital Ocean)

1. Create a new App on Digital Ocean App Platform
2. Point to the `dashboards` directory
3. Set run command: `streamlit run app.py --server.port 8080`
4. Add environment variable: `DATABASE_URL`

## Tech Stack

- **Streamlit**: Dashboard framework
- **Plotly**: Interactive charts and visualizations
- **Pandas**: Data manipulation
- **SQLAlchemy**: Database connectivity
- **PostgreSQL**: Data source (your existing DB)

## Customization

### Theme
Edit `.streamlit/config.toml` to customize colors:
```toml
[theme]
primaryColor = "#6366f1"      # Purple/Indigo
backgroundColor = "#0f172a"    # Dark slate
secondaryBackgroundColor = "#1e293b"
textColor = "#f8fafc"
```

### Colors
Edit the `COLORS` dict in `app.py`:
```python
COLORS = {
    'primary': '#6366f1',
    'gianna': '#ec4899',  # Pink
    'cathy': '#8b5cf6',   # Purple
    'sabrina': '#06b6d4', # Cyan
}
```

## Screenshots

The dashboard provides:
- Dark theme optimized for extended viewing
- Responsive layouts for desktop and tablet
- Interactive Plotly charts with hover tooltips
- Real-time data refresh (5-minute cache)

---

Built for OutreachGlobal
