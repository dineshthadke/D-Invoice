const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // Get all invoices
    const invoices = await db.query(`
      SELECT 
        i.*,
        c.name as client_name,
        c.company_name as client_company
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      ORDER BY i.id DESC
    `);

    let totalInvoices = invoices.length;
    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let draftCount = 0;

    let totalAmount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    let overdueAmount = 0;

    const normalizedInvoices = invoices.map(inv => {
      const amt = parseFloat(inv.total_amount) || 0;
      totalAmount += amt;

      let currentStatus = inv.status || 'pending';
      if (currentStatus === 'pending' && inv.due_date && inv.due_date < todayStr) {
        currentStatus = 'overdue';
      }

      if (currentStatus === 'paid') {
        paidCount++;
        paidAmount += amt;
      } else if (currentStatus === 'overdue') {
        overdueCount++;
        overdueAmount += amt;
      } else if (currentStatus === 'draft') {
        draftCount++;
      } else {
        pendingCount++;
        pendingAmount += amt;
      }

      return {
        ...inv,
        status: currentStatus
      };
    });

    const recentInvoices = normalizedInvoices.slice(0, 6);

    // Monthly breakdown for the past 6 months
    const monthlyStats = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
      monthlyStats[key] = { label: key, total: 0, paid: 0, count: 0 };
    }

    normalizedInvoices.forEach(inv => {
      if (inv.invoice_date) {
        const d = new Date(inv.invoice_date);
        const key = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
        if (monthlyStats[key]) {
          const amt = parseFloat(inv.total_amount) || 0;
          monthlyStats[key].total += amt;
          monthlyStats[key].count += 1;
          if (inv.status === 'paid') {
            monthlyStats[key].paid += amt;
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalInvoices,
          paidCount,
          pendingCount,
          overdueCount,
          draftCount,
          totalAmount,
          paidAmount,
          pendingAmount,
          overdueAmount
        },
        recentInvoices,
        monthlyTrend: Object.values(monthlyStats)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
