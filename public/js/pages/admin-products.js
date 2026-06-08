const { createApp, ref, onMounted, nextTick } = Vue;

// 開啟對話框時，把焦點移離觸發按鈕，避免按鈕仍保有鍵盤焦點
// 而在 Enter/Space/重新整理（瀏覽器還原焦點）時被再次觸發而重開對話框。
function moveFocusToDialog(selector) {
  if (document.activeElement && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur();
  }
  nextTick(function () {
    const target = document.querySelector(selector);
    if (target) target.focus();
  });
}

createApp({
  setup() {
    const products = ref([]);
    const pagination = ref({ total: 0, page: 1, limit: 10, totalPages: 0 });
    const loading = ref(true);

    const modalVisible = ref(false);
    const editingProduct = ref(null);
    const saving = ref(false);
    const form = ref({ name: '', description: '', price: 0, stock: 0, image_url: '' });

    const confirmVisible = ref(false);
    const deleteId = ref('');

    async function loadProducts(page) {
      page = page || 1;
      loading.value = true;
      try {
        const res = await apiFetch('/api/admin/products?page=' + page + '&limit=10');
        products.value = res.data.products;
        pagination.value = res.data.pagination;
      } catch (e) {
        Notification.show('載入商品失敗', 'error');
      } finally {
        loading.value = false;
      }
    }

    function openCreate() {
      editingProduct.value = null;
      form.value = { name: '', description: '', price: 0, stock: 0, image_url: '' };
      modalVisible.value = true;
      moveFocusToDialog('#product-modal [data-autofocus]');
    }

    function openEdit(product) {
      editingProduct.value = product;
      form.value = {
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        image_url: product.image_url,
      };
      modalVisible.value = true;
      moveFocusToDialog('#product-modal [data-autofocus]');
    }

    async function handleSave() {
      if (!form.value.name.trim() || form.value.price <= 0) {
        Notification.show('請填寫必要欄位', 'warning');
        return;
      }
      saving.value = true;
      try {
        if (editingProduct.value) {
          await apiFetch('/api/admin/products/' + editingProduct.value.id, {
            method: 'PUT',
            body: JSON.stringify(form.value)
          });
          Notification.show('商品已更新', 'success');
        } else {
          await apiFetch('/api/admin/products', {
            method: 'POST',
            body: JSON.stringify(form.value)
          });
          Notification.show('商品已新增', 'success');
        }
        modalVisible.value = false;
        await loadProducts(pagination.value.page);
      } catch (e) {
        Notification.show('儲存失敗', 'error');
      } finally {
        saving.value = false;
      }
    }

    function confirmDeleteFn(id) {
      deleteId.value = id;
      confirmVisible.value = true;
      moveFocusToDialog('#confirm-dialog [data-autofocus]');
    }

    async function handleDelete() {
      confirmVisible.value = false;
      try {
        await apiFetch('/api/admin/products/' + deleteId.value, { method: 'DELETE' });
        Notification.show('商品已刪除', 'success');
        await loadProducts(pagination.value.page);
      } catch (e) {
        Notification.show('刪除失敗', 'error');
      }
    }

    function onKeydown(e) {
      if (e.key === 'Escape') {
        confirmVisible.value = false;
        modalVisible.value = false;
      }
    }

    onMounted(function () {
      loadProducts();
      document.addEventListener('keydown', onKeydown);
    });

    return {
      products, pagination, loading,
      modalVisible, editingProduct, saving, form,
      confirmVisible,
      loadProducts, openCreate, openEdit, handleSave,
      confirmDeleteFn, handleDelete
    };
  }
}).mount('#app');
