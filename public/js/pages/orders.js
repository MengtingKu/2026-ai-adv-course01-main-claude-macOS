const { createApp, ref, computed, onMounted } = Vue;

createApp({
  setup() {
    if (!Auth.requireAuth()) return {};

    const orders = ref([]);
    const loading = ref(true);
    const filterTab = ref('all');

    const statusMap = {
      pending: { label: '待付款', cls: 'status-pending' },
      paid:    { label: '已付款', cls: 'status-paid' },
      failed:  { label: '付款失敗', cls: 'status-failed' },
    };

    const filteredOrders = computed(function () {
      if (filterTab.value === 'all') return orders.value;
      return orders.value.filter(function (o) { return o.status === filterTab.value; });
    });

    onMounted(async function () {
      try {
        const res = await apiFetch('/api/orders');
        orders.value = res.data.orders;
      } catch (e) {
        orders.value = [];
      } finally {
        loading.value = false;
      }
    });

    return { orders, filteredOrders, loading, statusMap, filterTab };
  }
}).mount('#app');
