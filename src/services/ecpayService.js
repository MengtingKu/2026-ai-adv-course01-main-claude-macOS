const crypto = require('crypto');

const MERCHANT_ID = process.env.ECPAY_MERCHANT_ID;
const HASH_KEY = process.env.ECPAY_HASH_KEY;
const HASH_IV = process.env.ECPAY_HASH_IV;
const IS_STAGING = process.env.ECPAY_ENV !== 'production';

const ECPAY_CHECKOUT_URL = IS_STAGING
  ? 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5'
  : 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5';

const ECPAY_QUERY_URL = IS_STAGING
  ? 'https://payment-stage.ecpay.com.tw/Cashier/QueryTradeInfo/V5'
  : 'https://payment.ecpay.com.tw/Cashier/QueryTradeInfo/V5';

function getMerchantTradeNo(orderNo) {
  return orderNo.replace(/[^A-Za-z0-9]/g, '').slice(0, 20);
}

function getMerchantTradeDate() {
  return new Date().toLocaleString('sv-SE', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).replace(/-/g, '/');
}

// AIO CheckMacValue 專用 URL encode（與 AES 的 aesUrlEncode 不同，不可混用）
function ecpayUrlEncode(str) {
  let encoded = encodeURIComponent(str)
    .replace(/%20/g, '+')
    .replace(/~/g, '%7e')
    .replace(/'/g, '%27');

  encoded = encoded.toLowerCase();

  // .NET 特殊字元還原
  const netReplacements = { '%2d': '-', '%5f': '_', '%2e': '.', '%21': '!', '%2a': '*', '%28': '(', '%29': ')' };
  for (const [from, to] of Object.entries(netReplacements)) {
    encoded = encoded.split(from).join(to);
  }
  return encoded;
}

function generateCheckMacValue(params) {
  const filtered = Object.fromEntries(
    Object.entries(params).filter(([k]) => k !== 'CheckMacValue')
  );

  const sorted = Object.keys(filtered)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  const paramStr = sorted.map(k => `${k}=${filtered[k]}`).join('&');
  const raw = `HashKey=${HASH_KEY}&${paramStr}&HashIV=${HASH_IV}`;

  const encoded = ecpayUrlEncode(raw);
  return crypto.createHash('sha256').update(encoded, 'utf8').digest('hex').toUpperCase();
}

function verifyCheckMacValue(params) {
  const received = params.CheckMacValue || '';
  const calculated = generateCheckMacValue(params);
  const bufA = Buffer.from(received);
  const bufB = Buffer.from(calculated);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function buildCheckoutParams(order, items, baseUrl) {
  const itemName = items
    .map(i => `${i.product_name} x${i.quantity}`)
    .join('#')
    .slice(0, 400);

  const merchantTradeNo = getMerchantTradeNo(order.order_no);
  const orderId = order.id;

  const params = {
    MerchantID: MERCHANT_ID,
    MerchantTradeNo: merchantTradeNo,
    MerchantTradeDate: getMerchantTradeDate(),
    PaymentType: 'aio',
    TotalAmount: String(order.total_amount),
    TradeDesc: '花卉電商訂單',
    ItemName: itemName,
    ReturnURL: `${baseUrl}/api/ecpay/notify`,
    ClientBackURL: `${baseUrl}/orders/${orderId}?from=ecpay`,
    ChoosePayment: 'Credit',
    EncryptType: '1',
  };

  params.CheckMacValue = generateCheckMacValue(params);

  return { ecpayUrl: ECPAY_CHECKOUT_URL, params };
}

async function queryTradeInfo(merchantTradeNo) {
  const timeStamp = String(Math.floor(Date.now() / 1000));

  const queryParams = {
    MerchantID: MERCHANT_ID,
    MerchantTradeNo: merchantTradeNo,
    TimeStamp: timeStamp,
  };
  queryParams.CheckMacValue = generateCheckMacValue(queryParams);

  const body = new URLSearchParams(queryParams);

  const response = await fetch(ECPAY_QUERY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`ECPay QueryTradeInfo HTTP ${response.status}`);
  }

  const text = await response.text();
  const result = Object.fromEntries(new URLSearchParams(text));

  if (!verifyCheckMacValue(result)) {
    throw new Error('QueryTradeInfo CheckMacValue 驗證失敗');
  }

  return result;
}

module.exports = {
  getMerchantTradeNo,
  generateCheckMacValue,
  verifyCheckMacValue,
  buildCheckoutParams,
  queryTradeInfo,
};
