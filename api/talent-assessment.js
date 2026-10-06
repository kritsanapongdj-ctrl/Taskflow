// api/talent-assessment.js
// Vercel Serverless Function for AI Talent Assessment using Google Gemini
import { analyzeTalentWithGemini } from './_services/geminiService.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { staff, stats, roleName, archAnalysis, featurePacket } = req.body || {};
    if (!staff || !stats) {
      return res.status(400).json({ error: 'Missing required parameters: staff and stats' });
    }

    const aiResult = await analyzeTalentWithGemini({ staff, stats, roleName, archAnalysis, featurePacket });
    if (aiResult) {
      return res.status(200).json({
        success: true,
        data: aiResult
      });
    }

    return res.status(200).json({
      success: false,
      fallback: true,
      message: 'Gemini service unavailable or quota reached; fallback to heuristic diagnostic'
    });
  } catch (error) {
    console.error('Talent Assessment API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
      fallback: true
    });
  }
}
