const { createApp, ref, onMounted } = Vue;

createApp({
  setup() {
    if (!Auth.requireAuth()) return {};

    const el = document.getElementById('app');
    const orderId = el.dataset.orderId;
    const paymentResult = ref(null);

    const order = ref(null);
    const loading = ref(true);
    const paying = ref(false);

    const statusMap = {
      pending: { label: '待付款', cls: 'bg-apricot/20 text-apricot' },
      paid: { label: '已付款', cls: 'bg-sage/20 text-sage' },
      failed: { label: '付款失敗', cls: 'bg-red-100 text-red-600' },
    };

    const paymentMessages = {
      success: { text: '付款成功！感謝您的購買。', cls: 'bg-sage/10 text-sage border border-sage/20' },
      failed: { text: '付款失敗，請重試。', cls: 'bg-red-50 text-red-600 border border-red-100' },
      cancel: { text: '付款已取消。', cls: 'bg-apricot/10 text-apricot border border-apricot/20' },
    };

    async function handleEcpayCheckout() {
      if (!order.value || paying.value) return;
      paying.value = true;
      try {
        const res = await apiFetch('/api/orders/' + order.value.id + '/ecpay-checkout');
        const { ecpayUrl, params } = res.data;

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = ecpayUrl;

        for (const [key, value] of Object.entries(params)) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value;
          form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit();
      } catch (e) {
        Notification.show('無法建立付款，請稍後再試', 'error');
        paying.value = false;
      }
    }

    async function verifyEcpayPayment() {
      paying.value = true;
      // 移除 URL query param，避免重新整理重複驗證
      const cleanUrl = window.location.pathname;
      window.history.replaceState(null, '', cleanUrl);
      try {
        const res = await apiFetch('/api/orders/' + orderId + '/ecpay-verify', { method: 'POST' });
        order.value = res.data;
        paymentResult.value = res.data.status === 'paid' ? 'success' : 'failed';
      } catch (e) {
        Notification.show('查詢付款結果失敗，請重新整理頁面', 'error');
      } finally {
        paying.value = false;
      }
    }

    onMounted(async function () {
      try {
        const res = await apiFetch('/api/orders/' + orderId);
        order.value = res.data;
      } catch (e) {
        Notification.show('載入訂單失敗', 'error');
      } finally {
        loading.value = false;
      }

      // 從綠界付款頁返回時自動驗證
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('from') === 'ecpay') {
        await verifyEcpayPayment();
      }
    });

    return { order, loading, paying, paymentResult, statusMap, paymentMessages, handleEcpayCheckout };
  }
}).mount('#app');
