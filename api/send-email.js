// api/send-email.js
// Vercel Serverless Function for sending transactional emails via Brevo API (v3)

const DEFAULT_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'kritsanapong.dj@gmail.com';
const DEFAULT_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'LH Task-Flow System';
const FALLBACK_GAS_URL = 'https://script.google.com/macros/s/AKfycbxrAOQLMQ3l3PcB800hUeMly_oi-jL4s8ZjlWncuCx9seMqSHMeZb0D9CxjyKpOZuaEmw/exec';

const ACTION_COLORS = {
  'งานติดปัญหา/รออะไหล่': { bg: '#fffbeb', border: '#fde68a', text: '#b45309', badge: '#f59e0b', icon: '⚠️' },
  'ขอเลื่อนวันจบงาน': { bg: '#eef2ff', border: '#c7d2fe', text: '#3730a3', badge: '#6366f1', icon: '📅' },
  'ยกเลิกงาน': { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', badge: '#ef4444', icon: '❌' },
  'บันทึกงานเกินเวลา SLA': { bg: '#fff1f2', border: '#fecdd3', text: '#be123c', badge: '#f43f5e', icon: '🚨' },
  'ปิดงานล่าช้ากว่ากำหนด': { bg: '#faf5ff', border: '#e9d5ff', text: '#6b21a8', badge: '#a855f7', icon: '⏰' },
  'default': { bg: '#f8fafc', border: '#e2e8f0', text: '#1e293b', badge: '#0f2e4a', icon: '🔔' }
};

function buildHtmlEmail({ action, reason, details, project, task, taskId }) {
  const cfg = ACTION_COLORS[action] || ACTION_COLORS.default;
  const tId = taskId || (task && task.id) || '-';
  const proj = project || (task && task.project) || 'ไม่ระบุโครงการ';
  const taskDetails = details || (task && task.details) || '-';
  const requester = (task && task.requester) || '-';
  const period = task ? `${task.startDate || '-'} ถึง ${task.endDate || '-'}` : '-';

  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cfg.icon} ${action}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f2e4a 0%, #1e40af 100%); padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">
                🏢 LH TASK-FLOW SYSTEM
              </h1>
              <p style="margin: 6px 0 0 0; color: #93c5fd; font-size: 13px;">
                ระบบติดตามและบริหารจัดการงานซ่อมสาธารณูปโภค
              </p>
            </td>
          </tr>

          <!-- Action Badge -->
          <tr>
            <td style="padding: 24px 24px 12px 24px; text-align: center;">
              <span style="display: inline-block; background-color: ${cfg.bg}; border: 1px solid ${cfg.border}; color: ${cfg.text}; padding: 8px 18px; border-radius: 9999px; font-size: 14px; font-weight: 700;">
                ${cfg.icon} แจ้งเตือน: ${action}
              </span>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 12px 24px 24px 24px;">
              <div style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 18px; margin-bottom: 20px;">
                <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 13px; line-height: 1.6;">
                  <tr>
                    <td width="32%" style="color: #64748b; font-weight: 600;">รหัสงาน:</td>
                    <td style="color: #0f172a; font-weight: 700;">${tId}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; font-weight: 600;">โครงการ:</td>
                    <td style="color: #0f172a; font-weight: 700;">${proj}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; font-weight: 600;">ผู้แจ้ง / ประสานงาน:</td>
                    <td style="color: #0f172a;">${requester}</td>
                  </tr>
                  ${period !== '- ถึง -' ? `
                  <tr>
                    <td style="color: #64748b; font-weight: 600;">ช่วงเวลาปฏิบัติงาน:</td>
                    <td style="color: #0f172a;">${period}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="color: #64748b; font-weight: 600; vertical-align: top;">รายละเอียดงาน:</td>
                    <td style="color: #0f172a; white-space: pre-line;">${taskDetails}</td>
                  </tr>
                </table>
              </div>

              ${reason ? `
              <!-- Highlight Reason Box -->
              <div style="background-color: ${cfg.bg}; border-left: 4px solid ${cfg.badge}; border-radius: 4px; padding: 14px 16px; margin-bottom: 20px;">
                <div style="font-size: 12px; font-weight: 700; color: ${cfg.text}; text-transform: uppercase; margin-bottom: 4px;">
                  📌 สาเหตุ / รายละเอียดการแจ้งเตือน
                </div>
                <div style="font-size: 14px; color: #1e293b; line-height: 1.5; white-space: pre-line;">
                  ${reason}
                </div>
              </div>` : ''}

              <!-- Action Link -->
              <div style="text-align: center; margin-top: 24px;">
                <a href="https://taskflow.lh.co.th" target="_blank" style="display: inline-block; background-color: #0f2e4a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; box-shadow: 0 2px 4px rgba(15, 46, 74, 0.2);">
                  เปิดระบบ LH Task-Flow
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5;">
              อีเมลฉบับนี้ส่งโดยระบบอัตโนมัติจาก LH Task-Flow กรุณาอย่าตอบกลับอีเมลนี้<br>
              จัดส่งผ่าน Brevo Transactional Email Service • โควตาส่งผ่าน 100%
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const alert = body.alert || body;
    const task = body.task || {};

    const action = alert.action || 'แจ้งเตือนทั่วไป';
    const reason = alert.reason || '';
    const details = alert.details || task.details || '';
    const project = alert.project || task.project || 'ส่วนกลาง';
    const taskId = task.id || alert.taskId || '';

    // Collect and sanitize recipients
    let rawEmails = [];
    if (Array.isArray(alert.emails)) rawEmails = alert.emails;
    else if (typeof alert.emails === 'string') rawEmails = alert.emails.split(',');
    else if (Array.isArray(body.to)) rawEmails = body.to;
    else if (typeof body.to === 'string') rawEmails = body.to.split(',');

    const cleanedEmails = Array.from(
      new Set(
        rawEmails
          .map(e => String(e).trim().toLowerCase())
          .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      )
    );

    // If no valid recipient, fallback to default admin
    if (cleanedEmails.length === 0) {
      cleanedEmails.push(DEFAULT_SENDER_EMAIL);
    }

    const subject = `[LH Task-Flow] ${action}: ${project}${taskId ? ` (${taskId})` : ''}`;
    const htmlContent = buildHtmlEmail({ action, reason, details, project, task, taskId });
    const textContent = `[LH Task-Flow Alert]\nเหตุการณ์: ${action}\nโครงการ: ${project}\nรหัสงาน: ${taskId}\nรายละเอียด: ${details}\nเหตุผล: ${reason}`;

    const brevoApiKey = process.env.BREVO_API_KEY;

    // Check if Brevo API Key is configured
    if (brevoApiKey) {
      const brevoPayload = {
        sender: {
          name: DEFAULT_SENDER_NAME,
          email: DEFAULT_SENDER_EMAIL
        },
        to: cleanedEmails.map(email => ({ email })),
        subject: subject,
        htmlContent: htmlContent,
        textContent: textContent
      };

      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify(brevoPayload)
      });

      const brevoData = await brevoRes.json();

      if (brevoRes.ok) {
        return res.status(200).json({
          success: true,
          provider: 'brevo',
          messageId: brevoData.messageId,
          recipients: cleanedEmails
        });
      } else {
        console.error('Brevo API Error:', brevoData);
        // If Brevo rejects (e.g. authorized IP error or temporary quota), fallback to Google Apps Script
        try {
          await fetch(FALLBACK_GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ type: 'task', data: { id: taskId, project, details, emailAlert: alert } })
          });
          return res.status(200).json({
            success: true,
            provider: 'gas_fallback',
            brevoError: brevoData,
            recipients: cleanedEmails
          });
        } catch (gasErr) {
          return res.status(502).json({
            error: 'Failed to send email via Brevo and GAS fallback',
            brevoError: brevoData,
            gasError: gasErr.message
          });
        }
      }
    } else {
      // Fallback directly to Google Apps Script if Brevo key not provided
      await fetch(FALLBACK_GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ type: 'task', data: { id: taskId, project, details, emailAlert: alert } })
      });
      return res.status(200).json({
        success: true,
        provider: 'gas_only',
        note: 'BREVO_API_KEY not configured, used GAS fallback',
        recipients: cleanedEmails
      });
    }
  } catch (error) {
    console.error('Email API Server Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
