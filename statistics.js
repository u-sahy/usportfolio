// REPLACE WITH YOUR DEPLOYMENT URL
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzf-rIDxYiGBfb2HOXWWWPcKupbBtlZH7BmTWs2skR-YNC6a4IKQLJtFpOjMNgu4ZOE/exec";

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CATEGORIES = [
    { name: 'Growth', color: '#FFD700', keywords: ['growth', 'investment', 'saving'] },
    { name: 'Transport', color: '#4A5568', keywords: ['transport', 'bus', 'train', 'taxi', 'uber', 'grab', 'fuel', 'petrol'] },
    { name: 'Groom', color: '#48BB78', keywords: ['groom', 'haircut', 'salon', 'barber', 'spa'] },
    { name: 'Food', color: '#2D3748', keywords: ['food', 'lunch', 'dinner', 'breakfast', 'snack', 'meal', 'restaurant', 'cafe'] },
    { name: 'Reload', color: '#E53E3E', keywords: ['reload', 'topup', 'recharge', 'mobile'] },
    { name: 'Hostel Reservation', color: '#9F7AEA', keywords: ['hostel', 'rent', 'reservation', 'accommodation'] },
    { name: 'Monthly Fee', color: '#00B5D8', keywords: ['monthly fee', 'subscription', 'membership', 'tuition'] },
    { name: 'Other', color: '#805AD5', keywords: [] }
];

let allRecords = [];
let monthlyChart = null;
let yearlyChart = null;

window.onload = function() {
    fetchData();
};

function showLoading(show, text = "Loading...") {
    const el = document.getElementById('loading');
    if(show) {
        document.getElementById('loading-text').innerText = text;
        el.style.display = 'flex';
    } else {
        el.style.display = 'none';
    }
}

function fetchData() {
    showLoading(true, "Loading Statistics...");
    fetch(SCRIPT_URL + "?op=read")
    .then(res => res.json())
    .then(data => {
        showLoading(false);
        allRecords = data.records;
        populateYearSelect();
        initializeMonthlyChart();
        initializeYearlyChart();
    })
    .catch(err => {
        showLoading(false);
        alert("Failed to load data: " + err);
    });
}

function categorizeTransaction(details) {
    const lowerDetails = details.toLowerCase();
    for(let cat of CATEGORIES) {
        if(cat.name === 'Other') continue;
        for(let keyword of cat.keywords) {
            if(lowerDetails.includes(keyword)) {
                return cat.name;
            }
        }
    }
    return 'Other';
}

function populateYearSelect() {
    const yearSelect = document.getElementById('yearSelect');
    const years = new Set();
    
    allRecords.forEach(row => {
        const year = new Date(row[0]).getFullYear();
        years.add(year);
    });
    
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    yearSelect.innerHTML = '';
    sortedYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.innerText = year;
        yearSelect.appendChild(option);
    });
    
    if(sortedYears.length > 0) {
        yearSelect.value = sortedYears[0];
    }
}

function initializeMonthlyChart() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const currentMonthData = getCategoryTotals(currentYear, currentMonth);
    const previousMonthData = getCategoryTotals(previousYear, previousMonth);
    
    const labels = CATEGORIES.map(cat => cat.name);
    const currentValues = labels.map(label => currentMonthData[label] || 0);
    const previousValues = labels.map(label => previousMonthData[label] || 0);
    const colors = CATEGORIES.map(cat => cat.color);
    
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    
    if(monthlyChart) monthlyChart.destroy();
    
    monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'This Month',
                    data: currentValues,
                    backgroundColor: colors,
                    borderRadius: 8,
                    barThickness: 40
                },
                {
                    label: 'Previous Month',
                    data: previousValues,
                    backgroundColor: colors.map(c => c + '40'),
                    borderColor: colors,
                    borderWidth: 2,
                    borderRadius: 8,
                    barThickness: 40
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function getCategoryTotals(year, month) {
    const totals = {};
    
    allRecords.forEach(row => {
        const dateObj = new Date(row[0]);
        if(dateObj.getFullYear() === year && dateObj.getMonth() === month) {
            const isDebit = row[5] !== "";
            if(isDebit) {
                const amount = Number(row[5]);
                const category = categorizeTransaction(row[3]);
                totals[category] = (totals[category] || 0) + amount;
            }
        }
    });
    
    return totals;
}

function initializeYearlyChart() {
    const checkboxContainer = document.getElementById('categoryCheckboxes');
    checkboxContainer.innerHTML = '';
    
    CATEGORIES.forEach((cat, index) => {
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'cat-' + index;
        checkbox.checked = true;
        checkbox.onchange = updateYearlyChart;
        
        const label = document.createElement('label');
        label.htmlFor = 'cat-' + index;
        label.innerHTML = `<span class="color-indicator" style="background:${cat.color}"></span> ${cat.name}`;
        
        div.appendChild(checkbox);
        div.appendChild(label);
        checkboxContainer.appendChild(div);
    });
    
    updateYearlyChart();
}

function updateYearlyChart() {
    const year = Number(document.getElementById('yearSelect').value);
    const datasets = [];
    
    CATEGORIES.forEach((cat, index) => {
        const checkbox = document.getElementById('cat-' + index);
        if(checkbox && checkbox.checked) {
            const monthlyData = [];
            for(let month = 0; month < 12; month++) {
                const totals = getCategoryTotals(year, month);
                monthlyData.push(totals[cat.name] || 0);
            }
            
            datasets.push({
                label: cat.name,
                data: monthlyData,
                borderColor: cat.color,
                backgroundColor: cat.color + '20',
                borderWidth: 2,
                tension: 0.3,
                fill: false
            });
        }
    });
    
    const ctx = document.getElementById('yearlyChart').getContext('2d');
    
    if(yearlyChart) yearlyChart.destroy();
    
    yearlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: MONTH_NAMES,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}