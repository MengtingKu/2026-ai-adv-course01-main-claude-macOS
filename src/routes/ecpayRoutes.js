const express = require('express');
const db = require('../database');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getMerchantTradeNo,
  verifyCheckMacValue,
  buildCheckoutParams,
  queryTradeInfo,
} = require('../services/ecpayService');

const router = express.Router();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

/**
 * @openapi
 * /api/orders/{id}/ecpay-checkout:
 *   get:
 *     summary: 取得綠界 AIO 付款表單參數
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功，回傳 ECPay 表單 URL 與參數
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     ecpayUrl:
 *                       type: string
 *                     params:
 *                       type: object
 *                 error:
 *                   type: string
 *                   nullable: true
 *                 message:
 *                   type: string
 *       400:
 *         description: 訂單狀態不是 pending
 *       404:
 *         description: 訂單不存在
 */
router.get('/orders/:id/ecpay-checkout', authMiddleware, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);

  if (!order) {
    return res.status(404).json({ data: null, error: 'NOT_FOUND', message: '訂單不存在' });
  }

  if (order.status !== 'pending') {
    return res.status(400).json({
      data: null,
      error: 'INVALID_STATUS',
      message: '訂單狀態不是 pending，無法發起付款',
    });
  }

  const items = db.prepare('SELECT product_name, product_price, quantity FROM order_items WHERE order_id = ?').all(order.id);
  const { ecpayUrl, params } = buildCheckoutParams(order, items, BASE_URL);

  res.json({
    data: { ecpayUrl, params },
    error: null,
    message: '取得付款資訊成功',
  });
});

/**
 * @openapi
 * /api/ecpay/notify:
 *   post:
 *     summary: 綠界 ReturnURL 付款結果通知（Server-to-Server）
 *     tags: [ECPay]
 *     responses:
 *       200:
 *         description: 回傳 1|OK
 */
router.post('/ecpay/notify', (req, res) => {
  const params = req.body;

  // 無論驗證是否通過都必須回傳 1|OK，否則綠界會重試
  if (!verifyCheckMacValue(params)) {
    return res.type('text').send('1|OK');
  }

  // AIO Callback 的 RtnCode 為字串
  if (params.RtnCode === '1' && params.MerchantTradeNo) {
    const merchantTradeNo = params.MerchantTradeNo;
    const order = db.prepare(
      `SELECT id, order_no FROM orders WHERE status = 'pending'`
    ).all().find(o => getMerchantTradeNo(o.order_no) === merchantTradeNo);

    if (order) {
      db.prepare("UPDATE orders SET status = 'paid' WHERE id = ?").run(order.id);
    }
  }

  res.type('text').send('1|OK');
});

/**
 * @openapi
 * /api/orders/{id}/ecpay-verify:
 *   post:
 *     summary: 主動查詢綠界付款結果並更新訂單狀態
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功，回傳最新訂單資料
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                 error:
 *                   type: string
 *                   nullable: true
 *                 message:
 *                   type: string
 *       404:
 *         description: 訂單不存在
 */
router.post('/orders/:id/ecpay-verify', authMiddleware, async (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);

  if (!order) {
    return res.status(404).json({ data: null, error: 'NOT_FOUND', message: '訂單不存在' });
  }

  // 冪等：已有最終狀態直接回傳
  if (order.status === 'paid' || order.status === 'failed') {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    return res.json({
      data: { ...order, items },
      error: null,
      message: order.status === 'paid' ? '付款成功' : '付款失敗',
    });
  }

  try {
    const merchantTradeNo = getMerchantTradeNo(order.order_no);
    const tradeInfo = await queryTradeInfo(merchantTradeNo);

    // QueryTradeInfo 回傳的 TradeStatus：1=已付款
    const newStatus = tradeInfo.TradeStatus === '1' ? 'paid' : 'failed';
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(newStatus, order.id);

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

    res.json({
      data: { ...updated, items },
      error: null,
      message: newStatus === 'paid' ? '付款成功' : '付款失敗',
    });
  } catch (err) {
    res.status(500).json({
      data: null,
      error: 'ECPAY_QUERY_ERROR',
      message: '查詢付款狀態失敗，請稍後再試',
    });
  }
});

module.exports = router;
