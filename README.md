# India Mutual Fund Analysis Web Application

A modern, user-friendly web application for analyzing and comparing Indian Mutual Funds in real-time. Built with Vite, Tailwind CSS, and Material Design.

## Features

- 🔍 **Search & Select Funds**: Easy-to-use search interface to find and select mutual funds
- 📊 **Real-time Metrics**: View CAGR, AUM, Beta, Sharpe Ratio, and Standard Deviation
- 📈 **Comparative Analysis**: Compare up to 5 funds side-by-side
- 🎨 **Modern UI**: Clean, intuitive interface designed for users of all ages
- 📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

## Tech Stack

- **Vite**: Fast build tool and development server
- **HTML5 & JavaScript**: Vanilla JS for simplicity and performance
- **Tailwind CSS**: Utility-first CSS framework
- **Google Material Icons & Fonts**: Material Design components
- **MFAPI.in**: Free API for Indian Mutual Fund data

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

The built files will be in the `dist` directory, ready to be deployed to S3.

## Deployment to AWS S3

1. Build the application:
```bash
npm run build
```

2. Upload the `dist` folder contents to your S3 bucket

3. Enable static website hosting in S3 bucket settings:
   - Set index document to `index.html`
   - Set error document to `index.html` (for SPA routing)

4. (Optional) Set up CloudFront for better performance and HTTPS

## Usage

1. **Search Funds**: Type in the search box to find mutual funds
2. **Select Funds**: Click on a fund to add it to comparison (max 5 funds)
3. **View Metrics**: See detailed metrics for each selected fund
4. **Compare Performance**: Visual charts and tables show comparative performance
5. **Remove Funds**: Click the X button on selected funds to remove them

## Metrics Explained (All calculated for 3-year period)

- **CAGR (3Y)**: 3-Year Compound Annual Growth Rate - Average annual return over 3 years
- **AUM**: Assets Under Management (in Crores) - Total value of assets managed
- **Beta**: Volatility relative to market (1.0 = market average, <1 = less volatile, >1 = more volatile)
- **Alpha**: Excess return over benchmark - Positive alpha indicates outperformance
- **Sharpe Ratio (3Y)**: Risk-adjusted return measure (higher is better, >1 is considered good)
- **Sortino Ratio (3Y)**: Downside risk-adjusted return - Better than Sharpe as it only considers negative volatility
- **Treynor Ratio (3Y)**: Return per unit of systematic risk (Beta) - Measures risk-adjusted return
- **Maximum Drawdown**: Largest peak-to-trough decline - Lower is better, shows worst-case scenario
- **Standard Deviation (3Y)**: Measure of return volatility - Lower indicates less risk

## API

This application uses the free [MFAPI.in](https://www.mfapi.in) API for mutual fund data. The API provides:
- Real-time NAV data
- Historical fund information
- Fund metadata

## License

MIT License - Feel free to use and modify as needed.

## Disclaimer

This application is for educational and informational purposes only. Investment decisions should be made after consulting with a qualified financial advisor.

