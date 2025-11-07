# Quick Start Guide

Get the India Mutual Fund Analysis application up and running in minutes!

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   The app will automatically open at `http://localhost:3000`

## Usage

### Step 1: Search for Funds
- Type in the search box to find mutual funds
- You can search by fund name or scheme code
- Click on any fund to add it to your comparison

### Step 2: Compare Funds
- Select up to 5 funds to compare
- The app will automatically fetch and calculate:
  - **CAGR** (Compound Annual Growth Rate)
  - **AUM** (Assets Under Management)
  - **Beta** (Volatility measure)
  - **Sharpe Ratio** (Risk-adjusted return)
  - **Standard Deviation** (Volatility)

### Step 3: Analyze Performance
- View the comparison table with all metrics
- Check the visual charts for CAGR and Sharpe Ratio
- See performance ratings (Excellent, Good, Average, Poor)
- Funds are automatically ranked by CAGR

### Step 4: Remove Funds
- Click the X button on any selected fund to remove it
- The comparison will update automatically

## Building for Production

```bash
npm run build
```

This creates a `dist` folder with optimized files ready for deployment.

## Preview Production Build

```bash
npm run preview
```

## Features

✅ **Real-time Data**: Fetches live data from MFAPI.in  
✅ **Smart Calculations**: Automatically calculates financial metrics  
✅ **Visual Comparisons**: Easy-to-understand charts and graphs  
✅ **User-Friendly**: Designed for users of all ages  
✅ **Responsive**: Works on desktop, tablet, and mobile  
✅ **Fast**: Optimized for quick loading and smooth interactions  

## Troubleshooting

### API Not Working
- Check your internet connection
- Verify MFAPI.in is accessible
- Some funds may not have historical data

### Funds Not Loading
- Wait a few seconds for the API to respond
- Try refreshing the page
- Check browser console for errors

### Metrics Showing Zero
- The fund may not have enough historical data
- Try selecting a different fund
- Some newer funds may have limited data

## Need Help?

- Check the main README.md for detailed information
- Review DEPLOYMENT.md for S3 deployment instructions
- Ensure all dependencies are installed correctly

## Next Steps

1. **Customize**: Modify colors, fonts, or layout in `src/style.css` and `tailwind.config.js`
2. **Deploy**: Follow DEPLOYMENT.md to host on AWS S3
3. **Enhance**: Add more features like fund categories, filters, or export functionality

Enjoy analyzing mutual funds! 📊

