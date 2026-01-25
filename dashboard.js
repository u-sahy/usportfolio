// CRITICAL: REPLACE THIS URL WITH YOUR DEPLOYMENT URL
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzf-rIDxYiGBfb2HOXWWWPcKupbBtlZH7BmTWs2skR-YNC6a4IKQLJtFpOjMNgu4ZOE/exec";

// Global variable to hold all fetched records
let allRecords = [];

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
];

// Initialize on page load
window.onload = function() {
    fetchDashboardData();
};

// Fetch & Process Dashboard Data
function fetchDashboardData() {
    showLoading(true, "Loading Data...");
    fetch(SCRIPT_URL + "?op=read")
    .then(res => res.json())
    .then(data => {
        showLoading(false);
        allRecords = data.records;
        
        document.getElementById('d-bal').innerText = fmt(data.summary.bal);
        
        populateYearAndMonthFilters(allRecords); 
        filterMonthlyView(); 
        renderRecentTransactions(allRecords);
    })
    .catch(err => {
        showLoading(false);
        document.getElementById('monthly-container').innerHTML = "<p style='text-align:center'>Failed to load data. Check URL and access permissions.</p>";
    });
}

// Populate Year and Month Filters
function populateYearAndMonthFilters(records) {
    const yearFilter = document.getElementById('yearFilter');
    const monthSelect = document.getElementById('monthSelect');
    const pdfYearSelect = document.getElementById('pdfYear');

    yearFilter.innerHTML = '<option value="all">All Years</option>';
    pdfYearSelect.innerHTML = '';
    monthSelect.innerHTML = '<option value="all">All</option>';

    if (!records || records.length === 0) return;
    
    const uniqueYears = new Set();
    const today = new Date();
    let currentYearKey = today.getFullYear();
    let currentMonthKey = today.getMonth() + 1;

    records.forEach(row => {
        const dateObj = new Date(row[0]);
        const year = dateObj.getFullYear();
        uniqueYears.add(year);
    });

    const sortedYears = Array.from(uniqueYears).sort((a, b) => b - a);
    sortedYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.innerText = year;
        yearFilter.appendChild(option.cloneNode(true));
        pdfYearSelect.appendChild(option);
    });
    
    const defaultYear = sortedYears.includes(currentYearKey) ? currentYearKey : sortedYears[0];
    if (defaultYear) {
        yearFilter.value = defaultYear;
        pdfYearSelect.value = defaultYear;
    }

    MONTH_NAMES.forEach((name, index) => {
        const monthValue = index + 1;
        const option = document.createElement('option');
        option.value = monthValue;
        option.innerText = name;
        monthSelect.appendChild(option);
    });
    
    monthSelect.value = currentMonthKey;
}

// Handler for the Year/Month Filter dropdowns
function filterMonthlyView() {
    if (allRecords.length === 0) return;
    
    const year = document.getElementById('yearFilter').value;
    const month = document.getElementById('monthSelect').value;
    
    renderMonthlySummaries(allRecords, year, month);
}

// Render Monthly Summaries
function renderMonthlySummaries(records, filterYear, filterMonth) {
    const container = document.getElementById('monthly-container');
    container.innerHTML = "";

    if (!records || records.length === 0) {
        container.innerHTML = "<p style='text-align:center'>No transactions to summarize.</p>";
        return;
    }
    
    let recordsToProcess = records;
    
    if (filterYear !== 'all') {
        const yearNum = Number(filterYear);
        recordsToProcess = recordsToProcess.filter(row => new Date(row[0]).getFullYear() === yearNum);
    }
    
    if (filterMonth !== 'all') {
        const monthNum = Number(filterMonth) - 1;
        recordsToProcess = recordsToProcess.filter(row => new Date(row[0]).getMonth() === monthNum);
    }
    
    if (recordsToProcess.length === 0) {
        container.innerHTML = "<p style='text-align:center'>No transactions found for the selected period.</p>";
        return;
    }
    
    const groups = {};
    const shouldGroup = filterMonth === 'all' || filterYear === 'all';

    recordsToProcess.forEach(row => {
        const dateObj = new Date(row[0]);
        
        let monthKey;
        if (shouldGroup) {
            monthKey = dateObj.getFullYear() + "-" + dateObj.getMonth();
        } else {
            monthKey = filterYear + "-" + (Number(filterMonth) - 1); 
        }

        if (!groups[monthKey]) {
            groups[monthKey] = {
                label: dateObj.toLocaleString('default', { month: 'long', year: 'numeric' }),
                totalCred: 0,
                totalDeb: 0,
                details: {
                    credit: {}, 
                    debit: {}  
                } 
            };
        }

        const isCred = row[4] !== "";
        const amt = Number(isCred ? row[4] : row[5] || 0);
        
        if (isCred) groups[monthKey].totalCred += amt;
        else groups[monthKey].totalDeb += amt;

        let detailName = row[3].trim();
        detailName = detailName.charAt(0).toUpperCase() + detailName.slice(1).toLowerCase();

        if (isCred) {
            if (!groups[monthKey].details.credit[detailName]) groups[monthKey].details.credit[detailName] = 0;
            groups[monthKey].details.credit[detailName] += amt;
        } else {
            if (!groups[monthKey].details.debit[detailName]) groups[monthKey].details.debit[detailName] = 0;
            groups[monthKey].details.debit[detailName] += amt;
        }
    });

    const sortedKeys = Object.keys(groups).sort((a,b) => {
        const [y1, m1] = a.split('-').map(Number);
        const [y2, m2] = b.split('-').map(Number);
        return (y2 - y1) || (m2 - m1); 
    });

    sortedKeys.forEach(key => {
        const g = groups[key];
        
        const sortedCreditDetails = Object.entries(g.details.credit).sort((a,b) => b[1] - a[1]);
        let creditDetailsHtml = "";
        sortedCreditDetails.forEach(([name, val]) => {
            creditDetailsHtml += `
                <div class="detail-row">
                    <span class="detail-name">${name}</span>
                    <span class="detail-amt green">${fmt(val)}</span>
                </div>
            `;
        });
        
        const sortedDebitDetails = Object.entries(g.details.debit).sort((a,b) => b[1] - a[1]);
        let debitDetailsHtml = "";
        sortedDebitDetails.forEach(([name, val]) => {
            debitDetailsHtml += `
                <div class="detail-row">
                    <span class="detail-name">${name}</span>
                    <span class="detail-amt red">${fmt(val)}</span>
                </div>
            `;
        });

        let allDetailsHtml = "";
        
        if (creditDetailsHtml) {
            allDetailsHtml += `<h5 style="padding: 0 20px 0; margin: 5px 0 0; font-size: 14px; color:#28a745;">Income Sources:</h5><div class="month-details">${creditDetailsHtml}</div>`;
        }

        if (debitDetailsHtml) {
            allDetailsHtml += `<h5 style="padding: 0 20px 0; margin: 5px 0 0; font-size: 14px; color:#dc3545;">Expense Categories:</h5><div class="month-details">${debitDetailsHtml}</div>`;
        }
        
        if (allDetailsHtml === "") allDetailsHtml = '<div style="padding: 15px; text-align: center; color:#999; font-style:italic;">No detailed transactions this month.</div>';

        const html = `
            <div class="month-section">
                <div class="month-header">
                    ${g.label}
                </div>
                <div class="month-card">
                    <div class="month-totals">
                        <div class="m-stat green">
                            Credit
                            <span>${fmt(g.totalCred)}</span>
                        </div>
                        <div class="m-stat red">
                            Debit
                            <span>${fmt(g.totalDeb)}</span>
                        </div>
                        <div class="m-stat" style="color:#007bff">
                            Net
                            <span>${fmt(g.totalCred - g.totalDeb)}</span>
                        </div>
                    </div>
                    ${allDetailsHtml}
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

// Render Recent Transactions
function renderRecentTransactions(records) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = "";
    
    if (!records || records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No records found.</td></tr>';
        return;
    }

    records.slice(0, 20).forEach(row => {
        const isCred = row[4] !== ""; 
        const amt = isCred ? row[4] : row[5];
        const cls = isCred ? "green" : "red";
        const sign = isCred ? "+" : "-";

        const dateParts = new Date(row[0]); 
        const niceDate = dateParts.getDate().toString().padStart(2, '0') + "/" + (dateParts.getMonth()+1).toString().padStart(2, '0');

        const tr = `<tr>
            <td class="date-col">${niceDate} <br><small style="color:#999">${row[1]}</small></td>
            <td>${row[3]} <br><small style="color:#999">${row[2]}</small></td>
            <td class="amount-col ${cls}"><b>${sign}${fmt(amt)}</b></td>
            <td class="amount-col" style='color:#666'>${fmt(row[6])}</td>
        </tr>`;
        tbody.innerHTML += tr;
    });
}

// Jump to Recent Transactions
function jumpToRecentTransactions() {
    const header = document.getElementById('recent-transactions-header');
    if (header) {
        header.scrollIntoView({ behavior: 'smooth' });
    }
}

// PDF Modal and Generation
function showPdfModal() {
    document.getElementById('pdfModal').style.display = 'flex';
}

async function generatePDF() {
    const year = document.getElementById('pdfYear').value;
    const month = document.getElementById('pdfMonth').value;
    
    if (!year || !month) {
        alert("Please select a valid year and month.");
        return;
    }

    document.getElementById('pdfModal').style.display = 'none';
    showLoading(true, `Generating PDF Report for ${MONTH_NAMES[Number(month)-1]} ${year}...`);

    try {
        const monthNum = Number(month) - 1;
        const yearNum = Number(year);

        const filteredRecords = allRecords.filter(row => {
            const dateObj = new Date(row[0]);
            return dateObj.getFullYear() === yearNum && dateObj.getMonth() === monthNum;
        });
        
        if (filteredRecords.length === 0) {
            showLoading(false);
            alert(`No records found for ${MONTH_NAMES[monthNum]} ${yearNum} to generate a report.`);
            return;
        }

        const pdfContentDiv = document.getElementById('pdfContent');
        // Get current date and time for the "Printed" timestamp
const now = new Date();
const printedDate = now.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
});
const printedTime = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
});

pdfContentDiv.innerHTML = `
    <div style="padding: 15px 0; border-bottom: 3px solid #007bff; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center;">
        <div style="text-align: left;">
            <h1 style="color:#007bff; margin:0; font-size:24px; font-family: Arial, sans-serif;">Expense Tracker Pro</h1>
            <p style="margin: 8px 0 0; font-size:14px; color:#333; font-family: Arial, sans-serif;">Report - <strong>${MONTH_NAMES[monthNum]}, ${yearNum}</strong></p>
        </div>
        <div style="text-align: right; color: #666; font-family: Arial, sans-serif;">
            <p style="margin: 0; font-size: 11px; line-height: 1.4;">
                Printed: ${printedDate}<br>
                ${printedTime}
            </p>
        </div>
    </div>
`;

        let tableRows = '';
        const sortedForPdf = filteredRecords.sort((a, b) => new Date(a[0]) - new Date(b[0]));
        
        const lastRecordBeforeMonth = allRecords.filter(row => new Date(row[0]) < new Date(sortedForPdf[0][0])).pop();
        let initialBalance = lastRecordBeforeMonth ? Number(lastRecordBeforeMonth[6]) : 0;
        let currentRunningBalance = initialBalance;
        
        sortedForPdf.forEach(row => {
            const isCred = row[4] !== ""; 
            const creditAmt = isCred ? Number(row[4]) : 0;
            const debitAmt = !isCred ? Number(row[5] || 0) : 0;
            
            if (isCred) {
                currentRunningBalance += creditAmt;
            } else {
                currentRunningBalance -= debitAmt;
            }

            const dateParts = new Date(row[0]); 
            const niceDate = dateParts.getDate().toString().padStart(2, '0') + "/" + (dateParts.getMonth()+1).toString().padStart(2, '0');

            tableRows += `
                <tr>
                    <td style="padding: 6px 4px; color:#444; border-bottom: 1px solid #eee; font-size:11px; font-family: Arial, sans-serif;">${niceDate}</td>
                    <td style="padding: 6px 4px; color:#444; border-bottom: 1px solid #eee; font-size:11px; font-family: Arial, sans-serif;">${row[3]}<br><span style="font-size:9px; color:#888;">${row[2]}</span></td>
                    <td style="padding: 6px 4px; text-align:right; color:#28a745; border-bottom: 1px solid #eee; font-size:11px; font-weight:600; font-family: Arial, sans-serif; white-space: nowrap;">${creditAmt > 0 ? fmt(creditAmt) : ''}</td>
                    <td style="padding: 6px 4px; text-align:right; color:#dc3545; border-bottom: 1px solid #eee; font-size:11px; font-weight:600; font-family: Arial, sans-serif; white-space: nowrap;">${debitAmt > 0 ? fmt(debitAmt) : ''}</td>
                    <td style="padding: 6px 4px; text-align:right; color:#333; border-bottom: 1px solid #eee; font-size:11px; font-family: Arial, sans-serif; white-space: nowrap;">${fmt(currentRunningBalance)}</td>
                </tr>
            `;
        });

        const tableHtml = `
            <h3 style="margin-top:20px;/* border-bottom: 2px solid #007bff; */padding-bottom: 6px; font-size:16px; color:#333; font-family: Arial, sans-serif;">Transactions</h3>
            <table style="width:100%; border-collapse: collapse; margin-top:15px; margin-bottom: 25px; font-family: Arial, sans-serif; table-layout: fixed;">
                <thead>
                    <tr style="background-color: #f5f5f5;">
                        <th style="padding: 10px 4px; text-align: left; border-bottom: 2px solid #007bff; font-size:12px; color:#333; font-weight:600; width:12%;">Date</th>
                        <th style="padding: 10px 4px; text-align: left; border-bottom: 2px solid #007bff; font-size:12px; color:#333; font-weight:600; width:30%;">Details</th>
                        <th style="padding: 10px 4px; text-align: right; border-bottom: 2px solid #007bff; font-size:12px; color:#28a745; font-weight:600; width:18%;">Credit</th>
                        <th style="padding: 10px 4px; text-align: right; border-bottom: 2px solid #007bff; font-size:12px; color:#dc3545; font-weight:600; width:18%;">Debit</th>
                        <th style="padding: 10px 4px; text-align: right; border-bottom: 2px solid #007bff; font-size:12px; color:#333; font-weight:600; width:22%;">Balance</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="background:#f9f9f9;">
                        <td colspan="5" style="padding: 10px 4px; text-align: right; border-bottom: 1px solid #ddd; font-weight:bold; font-size:12px; color:#333; font-family: Arial, sans-serif;">
                            Initial Balance: ${fmt(initialBalance)}
                        </td>
                    </tr>
                    ${tableRows}
                    <tr style="background:#e6f2ff;">
                        <td colspan="5" style="padding: 10px 4px; text-align: right; border-top: 3px solid #007bff; font-weight:bold; font-size:14px; color:#007bff; font-family: Arial, sans-serif;">
                            Final Balance: ${fmt(currentRunningBalance)}
                        </td>
                    </tr>
                </tbody>
            </table>
        `;
        
        pdfContentDiv.innerHTML += tableHtml;
        
        const { jsPDF } = window.jspdf;
        const canvas = await html2canvas(pdfContentDiv, { 
            scale: 3,
            useCORS: true, 
            logging: false,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: 700,
            windowWidth: 700,
            height: pdfContentDiv.scrollHeight
        });

        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const pdfWidth = 210;
        const pdfHeight = 297;
        const imgWidth = pdfWidth - 16;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 8;
        let pageNumber = 1;

        // Add first page
        pdf.addImage(imgData, 'PNG', 8, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 16);

        // Add subsequent pages with proper spacing
        while (heightLeft > 0) {
            pdf.addPage();
            pageNumber++;
            
            // Calculate position for next page - this creates proper page breaks
            position = -(imgHeight - heightLeft) + 8;
            
            pdf.addImage(imgData, 'PNG', 8, position, imgWidth, imgHeight);
            heightLeft -= (pdfHeight - 16);
        }
        
        pdf.save(`ExpenseReport_${MONTH_NAMES[monthNum]}_${year}.pdf`);

    } catch(error) {
        alert("Error generating PDF. Please ensure all data is loaded and try again. Error: " + error.message);
        console.error("PDF Generation Error:", error);
    } finally {
        showLoading(false);
        pdfContentDiv.innerHTML = '';
    }
}

// Helper Functions
function fmt(num) {
    return Number(num).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function showLoading(show, text) {
    const el = document.getElementById('loading');
    if(show) {
        document.getElementById('loading-text').innerText = text;
        el.style.display = 'flex';
    } else {
        el.style.display = 'none';
    }
}