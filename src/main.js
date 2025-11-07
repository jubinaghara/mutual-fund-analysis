// API Configuration
const API_BASE_URL = 'https://api.mfapi.in';

// State Management
let allFunds = [];
let selectedFunds = [];
let fundDataCache = {};

// DOM Elements
const fundSearch = document.getElementById('fundSearch');
const fundList = document.getElementById('fundList');
const selectedFundsSection = document.getElementById('selectedFundsSection');
const selectedFundsContainer = document.getElementById('selectedFunds');
const comparisonSection = document.getElementById('comparisonSection');
const comparisonTableBody = document.getElementById('comparisonTableBody');
const loadingIndicator = document.getElementById('loadingIndicator');

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    // Check if we should show landing page or analysis page
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('page') === 'analysis') {
        showAnalysisPage();
    }
    
    await loadAllFunds();
    setupEventListeners();
});

// Navigation functions
function showLandingPage() {
    document.getElementById('landingPage').classList.remove('hidden');
    document.getElementById('analysisPage').classList.add('hidden');
    window.history.pushState({}, '', window.location.pathname);
}

function showAnalysisPage() {
    document.getElementById('landingPage').classList.add('hidden');
    document.getElementById('analysisPage').classList.remove('hidden');
    window.history.pushState({}, '', window.location.pathname + '?page=analysis');
}

function scrollToFeatures() {
    document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
}

// Make navigation functions globally available
window.showLandingPage = showLandingPage;
window.showAnalysisPage = showAnalysisPage;
window.scrollToFeatures = scrollToFeatures;

// Load all mutual funds from API
async function loadAllFunds() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/mf`);
        const data = await response.json();
        allFunds = data || [];
        renderFundList(allFunds);
        hideLoading();
    } catch (error) {
        console.error('Error loading funds:', error);
        fundList.innerHTML = `
            <div class="p-4 text-center text-red-500">
                <span class="material-icons text-4xl mb-2">error</span>
                <p>Failed to load funds. Please try again later.</p>
            </div>
        `;
        hideLoading();
    }
}

// Setup event listeners
function setupEventListeners() {
    fundSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = allFunds.filter(fund => 
            fund.schemeName?.toLowerCase().includes(searchTerm) ||
            fund.schemeCode?.toString().includes(searchTerm)
        );
        renderFundList(filtered);
    });
}

// Render fund list
function renderFundList(funds) {
    if (funds.length === 0) {
        fundList.innerHTML = `
            <div class="p-4 text-center text-gray-500">
                <span class="material-icons text-4xl mb-2">search_off</span>
                <p>No funds found</p>
            </div>
        `;
        return;
    }

    fundList.innerHTML = funds.slice(0, 50).map(fund => `
        <div 
            class="p-3 border-b border-gray-200 hover:bg-material-blue/5 cursor-pointer transition-colors fund-card"
            onclick="selectFund('${fund.schemeCode}', '${fund.schemeName?.replace(/'/g, "\\'")}')"
        >
            <div class="flex items-center justify-between">
                <div class="flex-1">
                    <p class="font-medium text-gray-800">${fund.schemeName || 'N/A'}</p>
                    <p class="text-sm text-gray-500">Code: ${fund.schemeCode}</p>
                </div>
                <span class="material-icons text-material-blue">add_circle</span>
            </div>
        </div>
    `).join('');
}

// Select a fund
async function selectFund(schemeCode, schemeName) {
    if (selectedFunds.find(f => f.code === schemeCode)) {
        showNotification('Fund already selected', 'info');
        return;
    }

    if (selectedFunds.length >= 5) {
        showNotification('Maximum 5 funds can be compared at once', 'warning');
        return;
    }

    const fund = { code: schemeCode, name: schemeName };
    selectedFunds.push(fund);
    
    renderSelectedFunds();
    selectedFundsSection.classList.remove('hidden');
    
    await loadFundData(schemeCode);
    await updateComparison();
}

// Remove selected fund
function removeFund(schemeCode) {
    selectedFunds = selectedFunds.filter(f => f.code !== schemeCode);
    delete fundDataCache[schemeCode];
    
    if (selectedFunds.length === 0) {
        selectedFundsSection.classList.add('hidden');
        comparisonSection.classList.add('hidden');
    } else {
        renderSelectedFunds();
        updateComparison();
    }
}

// Render selected funds
function renderSelectedFunds() {
    selectedFundsContainer.innerHTML = selectedFunds.map(fund => `
        <div class="bg-material-green/10 border-2 border-material-green/30 rounded-lg px-4 py-2 flex items-center gap-3">
            <span class="font-medium text-gray-800 text-sm">${fund.name}</span>
            <button 
                onclick="removeFund('${fund.code}')"
                class="text-red-600 hover:text-red-800 transition-colors"
            >
                <span class="material-icons text-sm">close</span>
            </button>
        </div>
    `).join('');
}

// Load detailed fund data
async function loadFundData(schemeCode) {
    if (fundDataCache[schemeCode]) {
        return fundDataCache[schemeCode];
    }

    try {
        showLoading();
        
        // Fetch NAV data with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const navResponse = await fetch(`${API_BASE_URL}/mf/${schemeCode}`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!navResponse.ok) {
            throw new Error(`HTTP error! status: ${navResponse.status}`);
        }
        
        const navData = await navResponse.json();
        
        // Handle API errors
        if (navData.status === 'FAILED' || navData.status === 'ERROR') {
            throw new Error(navData.message || 'Failed to fetch fund data');
        }
        
        // Calculate metrics from NAV data
        const metrics = calculateMetrics(navData);
        
        // Get latest NAV by finding the entry with the most recent date
        let latestNAV = 0;
        if (navData.data && navData.data.length > 0) {
            // Parse all data entries with dates and NAV values
            const dataWithDates = navData.data
                .map(item => {
                    const nav = typeof item === 'object' 
                        ? parseFloat(item.nav || item.NAV || item.value || 0)
                        : parseFloat(item);
                    const dateStr = typeof item === 'object' 
                        ? (item.date || item.Date || item.DATE || '')
                        : '';
                    
                    // Parse date - handle different formats
                    let date = null;
                    if (dateStr) {
                        // Try parsing as ISO date first (YYYY-MM-DD)
                        date = new Date(dateStr);
                        // If invalid, try DD-MM-YYYY format
                        if (isNaN(date.getTime()) && dateStr.includes('-')) {
                            const parts = dateStr.split('-');
                            if (parts.length === 3) {
                                // Try DD-MM-YYYY
                                date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                            }
                        }
                    }
                    
                    return { nav, date, dateStr, original: item };
                })
                .filter(item => !isNaN(item.nav) && item.nav > 0);
            
            if (dataWithDates.length > 0) {
                // Sort by date (most recent first) if dates are available
                const hasValidDates = dataWithDates.some(item => item.date && !isNaN(item.date.getTime()));
                
                if (hasValidDates) {
                    dataWithDates.sort((a, b) => {
                        const dateA = a.date ? a.date.getTime() : 0;
                        const dateB = b.date ? b.date.getTime() : 0;
                        return dateB - dateA; // Most recent first
                    });
                } else {
                    // If no valid dates, assume data is already sorted (newest last or oldest first)
                    // Check both ends - typically newer NAVs are higher for growing funds
                    // But to be safe, we'll check if last element seems more recent
                    // For now, use the last element as it's typically the most recent in API responses
                    dataWithDates.reverse(); // Reverse to get last element first
                }
                
                latestNAV = dataWithDates[0].nav;
            }
        }
        
        // Fallback: Check meta for latest NAV if available
        if (latestNAV === 0 && navData.meta) {
            const metaNav = parseFloat(navData.meta.latest_nav || navData.meta.latestNAV || navData.meta.nav || 0);
            if (metaNav > 0) {
                latestNAV = metaNav;
            }
        }
        
        // Try to get AUM from meta or calculate from NAV data
        let aum = 0;
        if (navData.meta) {
            // Try different possible fields for AUM
            const aumFields = ['aum', 'AUM', 'fund_size', 'fundSize', 'assets', 'total_assets'];
            for (const field of aumFields) {
                if (navData.meta[field]) {
                    aum = parseFloat(navData.meta[field]) || 0;
                    break;
                }
            }
        }
        
        // If AUM not found, try to estimate (this is a fallback)
        if (aum === 0 && latestNAV > 0) {
            // Some funds might have AUM in different format, but we'll leave it as 0 if not available
        }
        
        const fundData = {
            code: schemeCode,
            name: selectedFunds.find(f => f.code === schemeCode)?.name || navData.meta?.scheme_name || 'Unknown',
            nav: navData.data || [],
            meta: navData.meta || {},
            latestNAV: latestNAV,
            ...metrics,
            aum: aum || metrics.aum // Use calculated AUM if meta AUM is not available
        };
        
        fundDataCache[schemeCode] = fundData;
        hideLoading();
        return fundData;
    } catch (error) {
        console.error(`Error loading fund ${schemeCode}:`, error);
        hideLoading();
        
        if (error.name === 'AbortError') {
            showNotification('Request timeout. Please try again.', 'error');
        } else {
            showNotification(`Failed to load fund data: ${error.message}`, 'error');
        }
        
        // Return default data structure
        return {
            code: schemeCode,
            name: selectedFunds.find(f => f.code === schemeCode)?.name || 'Unknown',
            latestNAV: 0,
            cagr: 0,
            cagr3y: 0,
            aum: 0,
            beta: 1.0,
            alpha: 0,
            sharpe: 0,
            sortino: 0,
            treynor: 0,
            maxDrawdown: 0,
            stdDev: 0,
            period: 'N/A'
        };
    }
}

// Calculate metrics from NAV data
function calculateMetrics(navData) {
    // Handle different API response structures
    let navs = [];
    if (Array.isArray(navData.data)) {
        navs = navData.data
            .map(d => {
                const nav = typeof d === 'object' ? parseFloat(d.nav || d.NAV || d.value) : parseFloat(d);
                return nav;
            })
            .filter(n => !isNaN(n) && n > 0);
    } else if (Array.isArray(navData)) {
        navs = navData
            .map(d => {
                const nav = typeof d === 'object' ? parseFloat(d.nav || d.NAV || d.value) : parseFloat(d);
                return nav;
            })
            .filter(n => !isNaN(n) && n > 0);
    }
    
    if (navs.length < 2) {
        return {
            cagr: 0,
            cagr3y: 0,
            aum: 0,
            beta: 0,
            alpha: 0,
            sharpe: 0,
            sortino: 0,
            treynor: 0,
            maxDrawdown: 0,
            stdDev: 0,
            period: 'N/A'
        };
    }

    // Reverse if needed (oldest to newest)
    if (navs[0] > navs[navs.length - 1]) {
        navs = navs.reverse();
    }

    // Use 3-year period (756 trading days) for calculations
    const threeYearDays = 756; // 3 years * 252 trading days
    const availableDays = navs.length - 1;
    const periodDays = Math.min(availableDays, threeYearDays);
    const periodStartIndex = Math.max(0, navs.length - periodDays - 1);
    const periodNavs = navs.slice(periodStartIndex);
    const periodYears = periodDays / 252;
    
    // Calculate CAGR for the period (3-year if available, else available period)
    const startNav = periodNavs[0];
    const endNav = periodNavs[periodNavs.length - 1];
    let cagr = 0;
    let cagr3y = 0;
    
    if (startNav > 0 && periodDays > 0) {
        cagr = ((endNav / startNav) ** (1 / periodYears) - 1) * 100;
        // Also calculate 3-year CAGR if we have enough data
        if (navs.length > 756) {
            const threeYearStartNav = navs[navs.length - 757];
            cagr3y = ((endNav / threeYearStartNav) ** (1 / 3) - 1) * 100;
        } else {
            cagr3y = cagr; // Use available period CAGR
        }
    }

    // Calculate daily returns for the period
    const returns = [];
    for (let i = 1; i < periodNavs.length; i++) {
        if (periodNavs[i - 1] > 0) {
            returns.push((periodNavs[i] - periodNavs[i - 1]) / periodNavs[i - 1]);
        }
    }

    if (returns.length === 0) {
        return {
            cagr: Math.round(cagr * 100) / 100,
            cagr3y: Math.round(cagr3y * 100) / 100,
            aum: 0,
            beta: 1.0,
            alpha: 0,
            sharpe: 0,
            sortino: 0,
            treynor: 0,
            maxDrawdown: 0,
            stdDev: 0,
            period: periodYears.toFixed(1) + 'Y'
        };
    }

    // Calculate Standard Deviation (annualized)
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized

    // Calculate Maximum Drawdown
    let maxDrawdown = 0;
    let peak = periodNavs[0];
    for (let i = 1; i < periodNavs.length; i++) {
        if (periodNavs[i] > peak) {
            peak = periodNavs[i];
        }
        const drawdown = ((peak - periodNavs[i]) / peak) * 100;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    }

    // Calculate Sortino Ratio (downside deviation only)
    const downsideReturns = returns.filter(r => r < 0);
    const downsideVariance = downsideReturns.length > 0 
        ? downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / returns.length
        : 0;
    const downsideDev = Math.sqrt(downsideVariance) * Math.sqrt(252) * 100;
    const riskFreeRate = 0.06; // 6% assumed risk-free rate
    const annualReturn = meanReturn * 252 * 100; // Convert to percentage
    const sortino = downsideDev > 0 ? (annualReturn - riskFreeRate * 100) / downsideDev : 0;

    // Calculate Sharpe Ratio (3-year)
    const sharpe = stdDev > 0 ? (annualReturn - riskFreeRate * 100) / stdDev : 0;

    // Beta estimation (using volatility relative to market)
    // For Indian market, average equity fund beta is around 0.8-1.2
    // We estimate based on volatility: higher volatility = higher beta
    const marketStdDev = 18; // Approximate Nifty 50 annual volatility
    const beta = stdDev > 0 ? Math.min(2.0, Math.max(0.3, stdDev / marketStdDev)) : 1.0;

    // Calculate Alpha (excess return over benchmark)
    // Alpha = Fund Return - (Risk-free Rate + Beta * (Market Return - Risk-free Rate))
    // Assuming market return of 12% (typical for Indian equity market)
    const marketReturn = 12; // Annual market return assumption
    const expectedReturn = riskFreeRate * 100 + beta * (marketReturn - riskFreeRate * 100);
    const alpha = annualReturn - expectedReturn;

    // Calculate Treynor Ratio (return per unit of systematic risk)
    const treynor = beta > 0 ? (annualReturn - riskFreeRate * 100) / beta : 0;

    // AUM - try to extract from meta or set to 0 if not available
    let aum = 0;
    if (navData.meta) {
        // Try different possible fields
        const aumFields = ['aum', 'AUM', 'fund_size', 'fundSize', 'assets'];
        for (const field of aumFields) {
            if (navData.meta[field]) {
                aum = parseFloat(navData.meta[field]) || 0;
                break;
            }
        }
    }

    return {
        cagr: Math.round(cagr * 100) / 100,
        cagr3y: Math.round(cagr3y * 100) / 100,
        aum: Math.round(aum),
        beta: Math.round(beta * 100) / 100,
        alpha: Math.round(alpha * 100) / 100,
        sharpe: Math.round(sharpe * 100) / 100,
        sortino: Math.round(sortino * 100) / 100,
        treynor: Math.round(treynor * 100) / 100,
        maxDrawdown: Math.round(maxDrawdown * 100) / 100,
        stdDev: Math.round(stdDev * 100) / 100,
        period: periodYears >= 2.5 ? '3Y' : periodYears.toFixed(1) + 'Y'
    };
}

// Update comparison table and charts
async function updateComparison() {
    if (selectedFunds.length === 0) {
        comparisonSection.classList.add('hidden');
        return;
    }

    comparisonSection.classList.remove('hidden');
    
    // Show loading state
    comparisonTableBody.innerHTML = `
        <tr>
            <td colspan="13" class="px-4 py-8 text-center">
                <div class="flex flex-col items-center gap-2">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-material-blue"></div>
                    <p class="text-gray-600">Loading comparison data...</p>
                </div>
            </td>
        </tr>
    `;
    
    // Load all fund data
    const fundDataList = await Promise.all(
        selectedFunds.map(fund => loadFundData(fund.code))
    );

    // Filter out funds with no data
    const validFundData = fundDataList.filter(fund => fund.nav && fund.nav.length > 0);
    
    if (validFundData.length === 0) {
        comparisonTableBody.innerHTML = `
            <tr>
                <td colspan="13" class="px-4 py-8 text-center text-gray-600">
                    <span class="material-icons text-4xl mb-2">info</span>
                    <p>No valid data available for comparison</p>
                </td>
            </tr>
        `;
        return;
    }

    // Render comparison table
    renderComparisonTable(validFundData);
    
    // Render charts
    renderCharts(validFundData);
}

// Render comparison table
function renderComparisonTable(fundDataList) {
    // Sort by CAGR for ranking
    const sortedData = [...fundDataList].sort((a, b) => b.cagr3y - a.cagr3y);
    
    comparisonTableBody.innerHTML = sortedData.map((fund, index) => {
        const performance = getPerformanceRating(fund);
        const performanceClass = `performance-${performance.level}`;
        
        return `
            <tr class="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                <td class="px-2 sm:px-3 py-2 sm:py-3">
                    <div class="flex items-center gap-1 sm:gap-2">
                        <span class="text-base sm:text-lg font-bold text-gray-400">#${index + 1}</span>
                        <div class="min-w-0">
                            <p class="font-medium text-gray-800 text-xs sm:text-sm truncate" title="${fund.name}">${fund.name.length > (window.innerWidth < 640 ? 20 : 25) ? fund.name.substring(0, (window.innerWidth < 640 ? 20 : 25)) + '...' : fund.name}</p>
                            <p class="text-xs text-gray-500 hidden sm:block">${fund.code} • ${fund.period || 'N/A'}</p>
                        </div>
                    </div>
                </td>
                <td class="px-1 sm:px-2 py-2 sm:py-3 text-center">
                    <span class="font-semibold text-xs sm:text-sm text-gray-800" title="Latest NAV">
                        ₹${fund.latestNAV > 0 ? fund.latestNAV.toFixed(2) : 'N/A'}
                    </span>
                </td>
                <td class="px-1 sm:px-2 py-2 sm:py-3 text-center">
                    <span class="font-semibold text-xs sm:text-sm ${fund.cagr3y >= 0 ? 'text-material-green' : 'text-red-600'}" title="3-Year CAGR">
                        ${fund.cagr3y > 0 ? '+' : ''}${fund.cagr3y.toFixed(2)}%
                    </span>
                </td>
                <td class="px-1 sm:px-2 py-2 sm:py-3 text-center text-gray-600 text-xs sm:text-sm hidden sm:table-cell">
                    ${fund.aum > 0 ? fund.aum.toLocaleString('en-IN') + ' Cr' : 'N/A'}
                </td>
                <td class="px-1 sm:px-2 py-2 sm:py-3 text-center text-gray-600 text-xs sm:text-sm">
                    ${fund.beta.toFixed(2)}
                </td>
                <td class="px-1 sm:px-2 py-2 sm:py-3 text-center">
                    <span class="font-semibold text-xs sm:text-sm ${fund.alpha > 0 ? 'text-material-green' : 'text-red-600'}" title="Alpha (excess return)">
                        ${fund.alpha > 0 ? '+' : ''}${fund.alpha.toFixed(2)}%
                    </span>
                </td>
                <td class="px-1 sm:px-2 py-2 sm:py-3 text-center">
                    <span class="font-semibold text-xs sm:text-sm ${fund.sharpe > 1 ? 'text-material-green' : fund.sharpe > 0 ? 'text-material-amber' : 'text-red-600'}" title="Sharpe Ratio (3Y)">
                        ${fund.sharpe.toFixed(2)}
                    </span>
                </td>
                <td class="px-1 sm:px-2 py-2 sm:py-3 text-center hidden md:table-cell">
                    <span class="font-semibold text-xs sm:text-sm ${fund.sortino > 1 ? 'text-material-green' : fund.sortino > 0 ? 'text-material-amber' : 'text-red-600'}" title="Sortino Ratio (3Y)">
                        ${fund.sortino.toFixed(2)}
                    </span>
                </td>
                <td class="px-1 sm:px-2 py-2 sm:py-3 text-center text-gray-600 text-xs sm:text-sm hidden lg:table-cell" title="Treynor Ratio (3Y)">
                    ${fund.treynor.toFixed(2)}
                </td>
                <td class="px-1 sm:px-2 py-2 sm:py-3 text-center text-gray-600 text-xs sm:text-sm hidden md:table-cell" title="Maximum Drawdown">
                    ${fund.maxDrawdown.toFixed(2)}%
                </td>
                <td class="px-1 sm:px-2 py-2 sm:py-3 text-center text-gray-600 text-xs sm:text-sm hidden lg:table-cell" title="Standard Deviation (3Y)">
                    ${fund.stdDev.toFixed(2)}%
                </td>
                <td class="px-1 sm:px-2 py-2 sm:py-3 text-center">
                    <span class="inline-block px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-white text-xs font-medium ${performanceClass}">
                        ${performance.label}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

// Get performance rating
function getPerformanceRating(fund) {
    // Enhanced scoring with multiple factors
    const score = (fund.cagr3y * 0.3) + 
                  (fund.alpha * 0.2) + 
                  (fund.sharpe * 15) + 
                  (fund.sortino * 10) - 
                  (fund.maxDrawdown * 0.15) - 
                  (fund.stdDev * 0.1);
    
    if (score >= 20) return { level: 'excellent', label: 'Excellent' };
    if (score >= 10) return { level: 'good', label: 'Good' };
    if (score >= 0) return { level: 'average', label: 'Average' };
    return { level: 'poor', label: 'Poor' };
}

// Render charts
function renderCharts(fundDataList) {
    renderCAGRChart(fundDataList);
    renderSharpeChart(fundDataList);
    renderAlphaChart(fundDataList);
    renderDrawdownChart(fundDataList);
}

// Render CAGR chart
function renderCAGRChart(fundDataList) {
    const sorted = [...fundDataList].sort((a, b) => b.cagr3y - a.cagr3y);
    const maxCAGR = Math.max(...sorted.map(f => Math.abs(f.cagr3y)), 1);
    
    if (maxCAGR === 0) {
        document.getElementById('cagrChart').innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <span class="material-icons text-4xl mb-2">bar_chart</span>
                <p>No CAGR data available</p>
            </div>
        `;
        return;
    }
    
    const isMobile = window.innerWidth < 640;
    const maxNameLength = isMobile ? 20 : 30;
    const chartHTML = `
        <div class="space-y-2 sm:space-y-3">
            ${sorted.map(fund => {
                const width = Math.min(100, (Math.abs(fund.cagr3y) / maxCAGR) * 100);
                const color = fund.cagr3y >= 0 ? 'bg-green-500' : 'bg-red-500';
                const displayName = fund.name.length > maxNameLength ? fund.name.substring(0, maxNameLength) + '...' : fund.name;
                
                return `
                    <div>
                        <div class="flex justify-between mb-1">
                            <span class="text-xs sm:text-sm font-medium text-gray-700 truncate flex-1" title="${fund.name}">${displayName}</span>
                            <span class="text-xs sm:text-sm font-semibold ${fund.cagr3y >= 0 ? 'text-green-600' : 'text-red-600'} ml-2 whitespace-nowrap">
                                ${fund.cagr3y > 0 ? '+' : ''}${fund.cagr3y.toFixed(2)}%
                            </span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-5 sm:h-6 overflow-hidden">
                            <div class="chart-bar ${color} h-5 sm:h-6 rounded-full flex items-center justify-end pr-1 sm:pr-2" style="width: ${width}%">
                                ${width > 20 ? '<span class="text-white text-xs font-medium">' + fund.cagr3y.toFixed(2) + '%</span>' : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    document.getElementById('cagrChart').innerHTML = chartHTML;
}

// Render Sharpe Ratio chart
function renderSharpeChart(fundDataList) {
    const sorted = [...fundDataList].sort((a, b) => b.sharpe - a.sharpe);
    const maxSharpe = Math.max(...sorted.map(f => Math.abs(f.sharpe)), 1);
    
    if (maxSharpe === 0) {
        document.getElementById('sharpeChart').innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <span class="material-icons text-4xl mb-2">bar_chart</span>
                <p>No Sharpe Ratio data available</p>
            </div>
        `;
        return;
    }
    
    const isMobile = window.innerWidth < 640;
    const maxNameLength = isMobile ? 20 : 30;
    const chartHTML = `
        <div class="space-y-2 sm:space-y-3">
            ${sorted.map(fund => {
                const width = Math.min(100, (Math.abs(fund.sharpe) / maxSharpe) * 100);
                let color = 'bg-gray-500';
                if (fund.sharpe > 1) color = 'bg-green-500';
                else if (fund.sharpe > 0) color = 'bg-yellow-500';
                else color = 'bg-red-500';
                
                const displayName = fund.name.length > maxNameLength ? fund.name.substring(0, maxNameLength) + '...' : fund.name;
                
                return `
                    <div>
                        <div class="flex justify-between mb-1">
                            <span class="text-xs sm:text-sm font-medium text-gray-700 truncate flex-1" title="${fund.name}">${displayName}</span>
                            <span class="text-xs sm:text-sm font-semibold ${fund.sharpe > 1 ? 'text-green-600' : fund.sharpe > 0 ? 'text-yellow-600' : 'text-red-600'} ml-2 whitespace-nowrap">
                                ${fund.sharpe.toFixed(2)}
                            </span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-5 sm:h-6 overflow-hidden">
                            <div class="chart-bar ${color} h-5 sm:h-6 rounded-full flex items-center justify-end pr-1 sm:pr-2" style="width: ${width}%">
                                ${width > 20 ? '<span class="text-white text-xs font-medium">' + fund.sharpe.toFixed(2) + '</span>' : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    document.getElementById('sharpeChart').innerHTML = chartHTML;
}

// Render Alpha chart
function renderAlphaChart(fundDataList) {
    const sorted = [...fundDataList].sort((a, b) => b.alpha - a.alpha);
    const maxAlpha = Math.max(...sorted.map(f => Math.abs(f.alpha)), 1);
    
    if (maxAlpha === 0) {
        document.getElementById('alphaChart').innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <span class="material-icons text-4xl mb-2">bar_chart</span>
                <p>No Alpha data available</p>
            </div>
        `;
        return;
    }
    
    const isMobile = window.innerWidth < 640;
    const maxNameLength = isMobile ? 20 : 30;
    const chartHTML = `
        <div class="space-y-2 sm:space-y-3">
            ${sorted.map(fund => {
                const width = Math.min(100, (Math.abs(fund.alpha) / maxAlpha) * 100);
                const color = fund.alpha > 0 ? 'bg-green-500' : 'bg-red-500';
                const displayName = fund.name.length > maxNameLength ? fund.name.substring(0, maxNameLength) + '...' : fund.name;
                
                return `
                    <div>
                        <div class="flex justify-between mb-1">
                            <span class="text-xs sm:text-sm font-medium text-gray-700 truncate flex-1" title="${fund.name}">${displayName}</span>
                            <span class="text-xs sm:text-sm font-semibold ${fund.alpha > 0 ? 'text-green-600' : 'text-red-600'} ml-2 whitespace-nowrap">
                                ${fund.alpha > 0 ? '+' : ''}${fund.alpha.toFixed(2)}%
                            </span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-5 sm:h-6 overflow-hidden">
                            <div class="chart-bar ${color} h-5 sm:h-6 rounded-full flex items-center justify-end pr-1 sm:pr-2" style="width: ${width}%">
                                ${width > 20 ? '<span class="text-white text-xs font-medium">' + fund.alpha.toFixed(2) + '%</span>' : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    document.getElementById('alphaChart').innerHTML = chartHTML;
}

// Render Maximum Drawdown chart
function renderDrawdownChart(fundDataList) {
    const sorted = [...fundDataList].sort((a, b) => a.maxDrawdown - b.maxDrawdown); // Lower is better
    const maxDD = Math.max(...sorted.map(f => f.maxDrawdown), 1);
    
    if (maxDD === 0) {
        document.getElementById('drawdownChart').innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <span class="material-icons text-4xl mb-2">bar_chart</span>
                <p>No Drawdown data available</p>
            </div>
        `;
        return;
    }
    
    const isMobile = window.innerWidth < 640;
    const maxNameLength = isMobile ? 20 : 30;
    const chartHTML = `
        <div class="space-y-2 sm:space-y-3">
            ${sorted.map(fund => {
                const width = Math.min(100, (fund.maxDrawdown / maxDD) * 100);
                let color = 'bg-green-500';
                if (fund.maxDrawdown > 30) color = 'bg-red-500';
                else if (fund.maxDrawdown > 20) color = 'bg-yellow-500';
                else if (fund.maxDrawdown > 10) color = 'bg-orange-500';
                
                const displayName = fund.name.length > maxNameLength ? fund.name.substring(0, maxNameLength) + '...' : fund.name;
                
                return `
                    <div>
                        <div class="flex justify-between mb-1">
                            <span class="text-xs sm:text-sm font-medium text-gray-700 truncate flex-1" title="${fund.name}">${displayName}</span>
                            <span class="text-xs sm:text-sm font-semibold ${fund.maxDrawdown > 30 ? 'text-red-600' : fund.maxDrawdown > 20 ? 'text-yellow-600' : 'text-green-600'} ml-2 whitespace-nowrap">
                                ${fund.maxDrawdown.toFixed(2)}%
                            </span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-5 sm:h-6 overflow-hidden">
                            <div class="chart-bar ${color} h-5 sm:h-6 rounded-full flex items-center justify-end pr-1 sm:pr-2" style="width: ${width}%">
                                ${width > 20 ? '<span class="text-white text-xs font-medium">' + fund.maxDrawdown.toFixed(2) + '%</span>' : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    document.getElementById('drawdownChart').innerHTML = chartHTML;
}

// Utility functions
function showLoading() {
    loadingIndicator.classList.remove('hidden');
}

function hideLoading() {
    loadingIndicator.classList.add('hidden');
}

function showNotification(message, type = 'info') {
    // Simple notification - can be enhanced
    const colors = {
        info: 'bg-material-blue',
        warning: 'bg-material-amber',
        error: 'bg-red-500',
        success: 'bg-material-green'
    };
    
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2`;
    notification.innerHTML = `
        <span class="material-icons">${type === 'info' ? 'info' : type === 'warning' ? 'warning' : type === 'error' ? 'error' : 'check_circle'}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Make functions globally available
window.selectFund = selectFund;
window.removeFund = removeFund;

