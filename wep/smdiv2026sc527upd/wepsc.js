let lastCalculation = null;

// Number format
function formatNumber(num) {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Date parser
function parseLocalDate(dateString) {
  if (!dateString) return new Date("Invalid");
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  return date.toLocaleDateString('en-GB');
}

// Main calculation
function calculateSurcharge() {
  const fee = parseFloat(document.getElementById("licenseFee").value);
  const expiryDate = parseLocalDate(document.getElementById("expiryDate").value);
  const settlementDate = parseLocalDate(document.getElementById("settlementDate").value);
  const cutoffDate = new Date(2024, 6, 17);
  const resultDiv = document.getElementById("result");

  resultDiv.innerHTML = "";

  if (
    isNaN(fee) ||
    isNaN(expiryDate.getTime()) ||
    isNaN(settlementDate.getTime())
  ) {
    resultDiv.innerHTML =
      "<span style='color:red;'>Please enter valid inputs.</span>";
    document.getElementById("pdfBtn").style.display = "none";
    lastCalculation = null;
    return;
  }

  if (fee <= 0) {
    resultDiv.innerHTML =
      "<span style='color:red;'>License fee must be greater than zero.</span>";
    document.getElementById("pdfBtn").style.display = "none";
    lastCalculation = null;
    return;
  }

  if (settlementDate < expiryDate) {
    resultDiv.innerHTML =
      "<span style='color:red;'>Settlement date cannot be before expiry date.</span>";
    document.getElementById("pdfBtn").style.display = "none";
    lastCalculation = null;
    return;
  }

  let surchargeStartDate;
  let message = "";

  if (expiryDate < cutoffDate) {
    if (settlementDate <= cutoffDate) {
      resultDiv.innerHTML =
        "<span style='color:green;'>No surcharge applicable.</span>";
      document.getElementById("pdfBtn").style.display = "none";
      lastCalculation = null;
      return;
    }

    surchargeStartDate = cutoffDate;
    message = "Surcharge applicable from 2024-07-17.";
  } else {
    surchargeStartDate = expiryDate;
    message = "Surcharge applicable from expiry date.";
  }

  let durationMonths =
    (settlementDate.getFullYear() - surchargeStartDate.getFullYear()) * 12 +
    (settlementDate.getMonth() - surchargeStartDate.getMonth());

  if (settlementDate.getDate() >= surchargeStartDate.getDate()) {
    durationMonths += 1;
  }

  if (durationMonths <= 0) {
    durationMonths = 1;
  }

  let perfactor =
    durationMonths > 1
      ? `${10 + ((durationMonths - 1) * 2)}%`
      : `10%`;

  let surcharge =
    durationMonths > 1
      ? (fee * 0.10) + (fee * 0.02 * (durationMonths - 1))
      : fee * 0.10;

  const bp = surcharge * 0.20;
  const st = surcharge + bp;
  const vat = st * 0.18;
  const total = st + vat;

  lastCalculation = {
    fee,
    expiryDate,
    settlementDate,
    surchargeStartDate,
    durationMonths,
    perfactor,
    surcharge,
    bp,
    st,
    vat,
    total,
    message
  };

  resultDiv.innerHTML = `
    <p>${message}</p>

    <div class="row"><span>License Expiry:</span><span>${formatDate(expiryDate)}</span></div>
    <div class="row"><span>Payment Settled:</span><span>${formatDate(settlementDate)}</span></div>
    <div class="row"><span>Surcharge Start:</span><span>${formatDate(surchargeStartDate)}</span></div>
    <div class="row"><span>Duration:</span><span>${durationMonths} month(s)</span></div>
    <div class="row"><span>Surcharge Percentage :</span><span>${perfactor}</span></div>

    <hr>

    <div class="row">
      <span><b>Description</b></span>
      <span><b>Total (Rs.)</b></span>
    </div>

    <hr>

    <div class="row"><span>Surcharge</span><span>${formatNumber(surcharge)}</span></div>
    <div class="row"><span>Budget Proposal 2023 (20%)</span><span>${formatNumber(bp)}</span></div>
    <div class="row"><span>Sub Total</span><span>${formatNumber(st)}</span></div>
    <div class="row"><span>VAT (18%)</span><span>${formatNumber(vat)}</span></div>

    <hr>

    <div class="row">
      <span><b>Total</b></span>
      <span><b>${formatNumber(total)}</b></span>
    </div>
  `;

  document.getElementById("pdfBtn").style.display = "block";
}

// PDF Download
function downloadPDF() {
  if (!lastCalculation) {
    alert("Please calculate surcharge first.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  const left = 18;
  const right = 18;
  const contentWidth = pageWidth - left - right;
  const labelX = left + 4;
  const valueX = pageWidth - right - 4;
  let y = 18;

  const data = lastCalculation;

  function drawSectionTitle(title) {
    doc.setFillColor(0, 74, 173);
    doc.roundedRect(left, y, contentWidth, 10, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(title, left + 4, y + 6.7);
    y += 14;
  }

  function drawRow(label, value, bold = false) {
    doc.setDrawColor(220, 220, 220);
    doc.line(left, y, pageWidth - right, y);
    y += 6;

    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text(label, labelX, y);
    doc.text(String(value), valueX, y, { align: "right" });
    y += 4;
  }

  function drawInfoBox() {
    doc.setFillColor(245, 249, 255);
    doc.setDrawColor(200, 220, 245);
    doc.roundedRect(left, y, contentWidth, 38, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 74, 173);
    doc.text("Calculation Summary", left + 4, y + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(60, 60, 60);

    doc.text(`License Fee: Rs. ${formatNumber(data.fee)}`, left + 4, y + 14);
    doc.text(`License Expiry: ${formatDate(data.expiryDate)}`, left + 4, y + 20);
    doc.text(`Payment Settled: ${formatDate(data.settlementDate)}`, left + 4, y + 26);
    doc.text(`Surcharge Start: ${formatDate(data.surchargeStartDate)}`, left + 4, y + 32);

    y += 46;
  }

  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 74, 173);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Surcharge Calculator Report", pageWidth / 2, y, { align: "center" });

  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Generated by Surcharge Calculator © SM Division", pageWidth / 2, y, { align: "center" });

  y += 10;

  drawInfoBox();

  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  const msgLines = doc.splitTextToSize(data.message, contentWidth - 8);
  doc.text(msgLines, left + 4, y);
  y += msgLines.length * 5 + 4;

  drawSectionTitle("Calculation Details");
  drawRow("Surcharge Duration", `${data.durationMonths} month(s)`);
  drawRow("Surcharge Percentage ", data.perfactor);

  y += 6;
  drawSectionTitle("Charge Breakdown");
  drawRow("Surcharge", formatNumber(data.surcharge));
  drawRow("Budget Proposal 2023 (20%)", formatNumber(data.bp));
  drawRow("Sub Total", formatNumber(data.st));
  drawRow("VAT (18%)", formatNumber(data.vat));

  y += 8;

  doc.setFillColor(230, 242, 255);
  doc.setDrawColor(0, 74, 173);
  doc.roundedRect(left, y, contentWidth, 14, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(0, 50, 120);
  doc.text("Grand Total", labelX, y + 8.8);
  doc.text(`Rs. ${formatNumber(data.total)}`, valueX, y + 8.8, { align: "right" });

  y += 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Generated on: ${new Date().toLocaleString("en-GB")}`,
    left,
    287
  );

  doc.save("Surcharge_Report.pdf");
}

// Auto-fill today's date
window.onload = function () {
  document.getElementById("settlementDate").value =
    new Date().toISOString().split("T")[0];
};