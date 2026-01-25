// CRITICAL: REPLACE THIS URL WITH YOUR DEPLOYMENT URL
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzf-rIDxYiGBfb2HOXWWWPcKupbBtlZH7BmTWs2skR-YNC6a4IKQLJtFpOjMNgu4ZOE/exec";

// Initialize on page load
window.onload = function() {
    document.getElementById('date').valueAsDate = new Date();
    autoSetDay();
};

// Auto Set Day based on selected date
function autoSetDay() {
    const d = document.getElementById('date').value;
    if(!d) return;
    const days = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
    document.getElementById('day').value = days[new Date(d).getDay()];
}

// Form Submit Handler
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
    })
    .catch(err => {
        showLoading(false);
        alert("Error: " + err);
    });
});

// Loading indicator
function showLoading(show, text) {
    const el = document.getElementById('loading');
    if(show) {
        document.getElementById('loading-text').innerText = text;
        el.style.display = 'flex';
    } else {
        el.style.display = 'none';
    }
}