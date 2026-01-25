// CRITICAL: REPLACE THIS URL WITH YOUR DEPLOYMENT URL
        const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzf-rIDxYiGBfb2HOXWWWPcKupbBtlZH7BmTWs2skR-YNC6a4IKQLJtFpOjMNgu4ZOE/exec"; 
        
        // **NEW: Password Variable**
        const ACCESS_PASSWORD = "ex1"; // << CHANGE THIS TO YOUR DESIRED PASSWORD
        
        // Global variable to hold all fetched records
        let allRecords = [];
        
        const MONTH_NAMES = [
            'January', 'February', 'March', 'April', 'May', 'June', 
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        
        
        // **NEW: Initialization Function (replaces window.onload)**
        function initializeApp() {
            document.getElementById('date').valueAsDate = new Date();
            autoSetDay();
            fetchDashboardData(); // Fetch initial data
        }

        // 1. Tab Switching
        function switchTab(tab) {
            document.getElementById('btnForm').classList.toggle('active', tab === 'form');
            document.getElementById('btnDash').classList.toggle('active', tab === 'dash');
            document.getElementById('page-form').classList.toggle('active', tab === 'form');
            document.getElementById('page-dash').classList.toggle('active', tab === 'dash');
            
            if(tab === 'dash' && allRecords.length === 0) fetchDashboardData();
        }

        // 2. Auto Day
        function autoSetDay() {
            const d = document.getElementById('date').value;
            if(!d) return;
            const days = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
            document.getElementById('day').value = days[new Date(d).getDay()];
        }

        // 3. Form Submit
        document.getElementById('expenseForm').addEventListener('submit', function(e) {
            e.preventDefault();
            showLoading(true, "Saving...");

            const params = new URLSearchParams({
                op: 'submit',
                date: document.getElementById('date').value,
                day: document.getElementById('day').value,
                location: document.getElementById('location').value,
                details: document.getElementById('details').value,
                type: document.getElementById('transType').value,
                amount: document.getElementById('amount').value
            });

            fetch(SCRIPT_URL + "?" + params.toString())
            .then(res => res.json())
            .then(data => {
                showLoading(false);
                alert("Submitted Successfully!");
                document.getElementById('expenseForm').reset();
                document.getElementById('date').valueAsDate = new Date();
                autoSetDay();
                // Force dashboard refresh on submission if needed
                if(document.getElementById('page-dash').classList.contains('active')) fetchDashboardData();
            })
            .catch(err => {
                showLoading(false);
                alert("Error: " + err);
            });
        });

        // 4. Fetch & Process Dashboard
        function fetchDashboardData() {
            showLoading(true, "Loading Data...");
            fetch(SCRIPT_URL + "?op=read")
            .then(res => res.json())
            .then(data => {
                showLoading(false);
                // Store all records globally
                allRecords = data.records;
                
                document.getElementById('d-bal').innerText = fmt(data.summary.bal);
                
                // Populate the new year and month filter dropdowns
                populateYearAndMonthFilters(allRecords); 
                
                // Initial render: use currently selected filter values (default to 'all' and current year/month)
                filterMonthlyView(); 
                
                // Render recent transactions
                renderRecentTransactions(allRecords);
            })
            .catch(err => {
                showLoading(false);
                document.getElementById('monthly-container').innerHTML = "<p style='text-align:center'>Failed to load data. Check URL and access permissions.</p>";
            });
        }
        
        // 5. Populate Year and Month Filters
        function populateYearAndMonthFilters(records) {
            const yearFilter = document.getElementById('yearFilter');
            const monthSelect = document.getElementById('monthSelect');
            const pdfYearSelect = document.getElementById('pdfYear'); // For PDF modal

            // Clear previous options
            yearFilter.innerHTML = '<option value="all">All Years</option>';
            pdfYearSelect.innerHTML = '';
            monthSelect.innerHTML = '<option value="all">All</option>';

            if (!records || records.length === 0) return;
            
            const uniqueYears = new Set();
            const uniqueMonths = new Set();
            const today = new Date();
            let currentYearKey = today.getFullYear();
            let currentMonthKey = today.getMonth() + 1; // 1-indexed

            records.forEach(row => {
                const dateObj = new Date(row[0]);
                const year = dateObj.getFullYear();
                const month = dateObj.getMonth() + 1; // 1-indexed
                
                uniqueYears.add(year);
                uniqueMonths.add(month); // Used just to get all months that exist
            });

            // Populate Year Filters
            const sortedYears = Array.from(uniqueYears).sort((a, b) => b - a);
            sortedYears.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.innerText = year;
                yearFilter.appendChild(option.cloneNode(true));
                pdfYearSelect.appendChild(option);
            });
            
            // Set default year to current year or latest year in data
            const defaultYear = sortedYears.includes(currentYearKey) ? currentYearKey : sortedYears[0];
            if (defaultYear) {
                yearFilter.value = defaultYear;
                pdfYearSelect.value = defaultYear;
            }

            // Populate Month Select (full month list, 1-12)
            MONTH_NAMES.forEach((name, index) => {
                const monthValue = index + 1;
                const option = document.createElement('option');
                option.value = monthValue;
                option.innerText = name;
                monthSelect.appendChild(option);
            });
            
            // Set default month to current month
            monthSelect.value = currentMonthKey;
        }

        // 6. Handler for the Year/Month Filter dropdowns
        function filterMonthlyView() {
            if (allRecords.length === 0) return;
            
            const year = document.getElementById('yearFilter').value;
            const month = document.getElementById('monthSelect').value;
            
            renderMonthlySummaries(allRecords, year, month);
        }
        
        // 7. Render Monthly Summaries
        function renderMonthlySummaries(records, filterYear, filterMonth) {
            const container = document.getElementById('monthly-container');
            container.innerHTML = "";

            if (!records || records.length === 0) {
                container.innerHTML = "<p style='text-align:center'>No transactions to summarize.</p>";
                return;
            }
            
            // Filter records based on selection
            let recordsToProcess = records;
            
            if (filterYear !== 'all') {
                const yearNum = Number(filterYear);
                recordsToProcess = recordsToProcess.filter(row => new Date(row[0]).getFullYear() === yearNum);
            }
            
            if (filterMonth !== 'all') {
                const monthNum = Number(filterMonth) - 1; // JS month is 0-indexed
                recordsToProcess = recordsToProcess.filter(row => new Date(row[0]).getMonth() === monthNum);
            }
            
            if (recordsToProcess.length === 0) {
                container.innerHTML = "<p style='text-align:center'>No transactions found for the selected period.</p>";
                return;
            }
            
            // Group and Summarize
            const groups = {};
            
            // Only group by month if 'All' month is selected AND 'All' year is NOT selected, OR if 'All' year IS selected
            // If a specific month and year are selected, we only need one summary card.
            const shouldGroup = filterMonth === 'all' || filterYear === 'all';

            recordsToProcess.forEach(row => {
                const dateObj = new Date(row[0]);
                
                let monthKey;
                if (shouldGroup) {
                    // Group by Year-Month
                    monthKey = dateObj.getFullYear() + "-" + dateObj.getMonth();
                } else {
                    // Specific month/year selected, use a single key for the one card
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

                // Category/Detail breakdown
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

            // Sorting (newest month first)
            const sortedKeys = Object.keys(groups).sort((a,b) => {
                const [y1, m1] = a.split('-').map(Number);
                const [y2, m2] = b.split('-').map(Number);
                return (y2 - y1) || (m2 - m1); 
            });

            // Build HTML
            sortedKeys.forEach(key => {
                const g = groups[key];
                
                // 1. Sort and prepare Credit Details (Income Sources)
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
                
                // 2. Sort and prepare Debit Details (Expense Categories)
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

                // Combine details sections
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

        // 8. Render Recent Transactions
        function renderRecentTransactions(records) {
            const tbody = document.getElementById('tableBody');
            tbody.innerHTML = "";
            
            if (!records || records.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No records found.</td></tr>';
                return;
            }

            // Show top 20 recent records
            // NOTE: The server-side script should return records sorted by date descending (newest first).
            records.slice(0, 20).forEach(row => {
                // row indices: [Date, Day, Location, Details, Credit, Debit, Balance]
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
        
        // 9. Jump to Recent Transactions
        function jumpToRecentTransactions() {
            const header = document.getElementById('recent-transactions-header');
            if (header) {
                header.scrollIntoView({ behavior: 'smooth' });
            }
        }

        // 10. PDF Modal and Generation
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
                // 1. Filter data for the specific month/year
                const monthNum = Number(month) - 1; // 0-indexed month
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

                // 2. Prepare content HTML for rendering (Header Only)
                const pdfContentDiv = document.getElementById('pdfContent');
                pdfContentDiv.innerHTML = `
                    <div style="text-align:center; padding: 20px 0; border-bottom: 2px solid #007bff; margin-bottom: 20px;">
                        <h1 style="color:#007bff; margin:0;">Expense Tracker Pro Transaction Report</h1>
                        <p style="margin: 5px 0 0; font-size:14px;">Detailed Transactions for <strong>${MONTH_NAMES[monthNum]}, ${yearNum}</strong></p>
                    </div>
                `;

                // A. Generate Transaction Table HTML for the PDF
                let tableRows = '';
                
                // Sort filteredRecords by Date ASCENDING for chronological balance calculation
                const sortedForPdf = filteredRecords.sort((a, b) => new Date(a[0]) - new Date(b[0]));
                
                // Find the balance *before* this month's first transaction
                const lastRecordBeforeMonth = allRecords.filter(row => new Date(row[0]) < new Date(sortedForPdf[0][0])).pop();
                let initialBalance = lastRecordBeforeMonth ? Number(lastRecordBeforeMonth[6]) : 0;

                // Re-calculate running balance for the PDF's table
                let currentRunningBalance = initialBalance;
                
                sortedForPdf.forEach(row => {
                    const isCred = row[4] !== ""; 
                    const amtVal = Number(isCred ? row[4] : row[5] || 0);
                    
                    // Update running balance
                    if (isCred) {
                        currentRunningBalance += amtVal;
                    } else {
                        currentRunningBalance -= amtVal;
                    }

                    const cls = isCred ? '#28a745' : '#dc3545';
                    const sign = isCred ? "+" : "-";

                    const dateParts = new Date(row[0]); 
                    const niceDate = dateParts.getDate().toString().padStart(2, '0') + "/" + (dateParts.getMonth()+1).toString().padStart(2, '0') + "/" + dateParts.getFullYear();

                    tableRows += `
                        <tr>
                            <td style="color:#666">${niceDate}</td>
                            <td>${row[3]} <span style="font-size:10px; color:#999">(${row[2]})</span></td>
                            <td style="text-align:right; color:${cls};"><b>${sign}${fmt(amtVal)}</b></td>
                            <td style="text-align:right; color:#666">${fmt(currentRunningBalance)}</td>
                        </tr>
                    `;
                });

                const tableHtml = `
                    <h3 style="margin-top:20px; border-bottom: 1px solid #ccc; padding-bottom: 5px; font-size:16px;">Detailed Transactions</h3>
                    <table style="width:100%; border-collapse: collapse; margin-bottom: 30px;">
                        <thead>
                            <tr style="background-color: #f8f9fa;">
                                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #eee;">Date</th>
                                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #eee;">Details / Location</th>
                                <th style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">Amount</th>
                                <th style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td colspan="4" style="padding: 10px; text-align: right; border-bottom: 1px solid #eee; background:#eee; font-weight:bold;">Initial Balance (Start of Month): ${fmt(initialBalance)}</td></tr>
                            ${tableRows}
                            <tr><td colspan="4" style="padding: 10px; text-align: right; border-top: 2px solid #333; background:#f0f0f0; font-weight:bold;">Final Balance (End of Month): ${fmt(currentRunningBalance)}</td></tr>
                        </tbody>
                    </table>
                `;
                
                // Append the table to the content div
                pdfContentDiv.innerHTML += tableHtml;
                
                // 3. Generate PDF from the HTML content
                const { jsPDF } = window.jspdf;
                const canvas = await html2canvas(pdfContentDiv, { 
                    scale: 2, 
                    useCORS: true, 
                    logging: false,
                    allowTaint: true,
                    backgroundColor: '#fff', 
                });

                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const imgWidth = 210; 
                const pageHeight = 295;
                const imgHeight = canvas.height * imgWidth / canvas.width;
                let heightLeft = imgHeight;
                let position = 0;

                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;

                while (heightLeft >= 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }
                
                pdf.save(`ExpenseReport_${year}_${month}.pdf`);

            } catch(error) {
                alert("Error generating PDF. Please ensure all data is loaded and try again. Error: " + error.message);
                console.error("PDF Generation Error:", error);
            } finally {
                showLoading(false);
                // Clear the temporary content
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
        
        // This makes the enter key work on the password field
        document.getElementById('passwordInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                checkPassword();
            }
        });