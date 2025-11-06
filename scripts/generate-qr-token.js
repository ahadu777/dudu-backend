#!/usr/bin/env node
/**
 * QR Token Generator for Testing
 * Generates valid QR tokens for PRD-003 testing
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const QR_SIGNER_SECRET = process.env.QR_SIGNER_SECRET || 'qr-signing-secret-change-in-production';

function generateQRToken(ticketCode) {
  const now = Math.floor(Date.now() / 1000);
  const jti = crypto.randomUUID();
  
  const payload = {
    tid: ticketCode,
    jti: jti,
    iat: now,
    exp: now + 300 // 5 minutes
  };
  
  const token = jwt.sign(payload, QR_SIGNER_SECRET, {
    algorithm: 'HS256'
  });
  
  return { token, jti };
}

// Get ticket code from command line or use default
const ticketCode = process.argv[2] || 'TKT-123-001';

const { token, jti } = generateQRToken(ticketCode);

console.log(JSON.stringify({
  ticket_code: ticketCode,
  qr_token: token,
  jti: jti,
  expires_in: 300
}, null, 2));

