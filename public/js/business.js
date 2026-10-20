// ============================================================
// D-INVOICE BUSINESS PROFILE CONTROLLER
// ============================================================

const Business = {
  currentData: null,
  uploadedLogoUrl: null,

  async init() {
    this.populateStateDropdown();
    await this.loadProfile();
  },

  populateStateDropdown() {
    const select = document.getElementById('bizState');
    if (!select) return;
    select.innerHTML = INDIAN_STATES.map(s => `<option value="${s}">${s}</option>`).join('');
  },

  async loadProfile() {
    try {
      const res = await API.getBusiness();
      if (!res.success) throw new Error(res.error || 'Failed to load business profile');

      this.currentData = res.data || {};
      const b = this.currentData;

      document.getElementById('bizName').value = b.name || '';
      document.getElementById('bizEmail').value = b.email || '';
      document.getElementById('bizPhone').value = b.phone || '';
      document.getElementById('bizGstin').value = b.gstin || '';
      document.getElementById('bizPan').value = b.pan || '';

      document.getElementById('bizAddress1').value = b.address_line1 || '';
      document.getElementById('bizAddress2').value = b.address_line2 || '';
      document.getElementById('bizCity').value = b.city || '';
      document.getElementById('bizState').value = b.state || 'Karnataka';
      document.getElementById('bizPincode').value = b.pincode || '';
      document.getElementById('bizCountry').value = b.country || 'India';

      document.getElementById('bizBankName').value = b.bank_name || '';
      document.getElementById('bizAccountName').value = b.account_name || '';
      document.getElementById('bizAccountNumber').value = b.account_number || '';
      document.getElementById('bizIfsc').value = b.ifsc_code || '';
      document.getElementById('bizUpi').value = b.upi_id || '';

      document.getElementById('bizNotes').value = b.default_notes || '';
      document.getElementById('bizTerms').value = b.default_terms || '';

      this.uploadedLogoUrl = b.logo_url || null;
      this.updateLogoPreview(this.uploadedLogoUrl);

    } catch (err) {
      console.error('Error loading business profile:', err);
      showToast('Error loading business profile: ' + err.message, 'error');
    }
  },

  updateLogoPreview(url) {
    const img = document.getElementById('logoPreviewImg');
    const placeholder = document.getElementById('logoPlaceholder');
    const btnRemove = document.getElementById('btnRemoveLogo');

    if (url && url.trim() !== '') {
      img.src = url;
      img.style.display = 'block';
      placeholder.style.display = 'none';
      btnRemove.style.display = 'inline-block';
    } else {
      img.src = '';
      img.style.display = 'none';
      placeholder.style.display = 'flex';
      btnRemove.style.display = 'none';
    }
  },

  async onLogoFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'warning');
      return;
    }

    try {
      showToast('Uploading logo...', 'info');
      const res = await API.uploadLogo(file);
      if (res.success && res.logo_url) {
        this.uploadedLogoUrl = res.logo_url;
        this.updateLogoPreview(this.uploadedLogoUrl);
        showToast('Logo uploaded successfully!', 'success');
      } else {
        throw new Error(res.error || 'Logo upload failed');
      }
    } catch (err) {
      console.error('Logo upload error:', err);
      showToast('Logo upload failed: ' + err.message, 'error');
    }
  },

  removeLogo() {
    this.uploadedLogoUrl = '';
    this.updateLogoPreview('');
    document.getElementById('logoFileInput').value = '';
    showToast('Logo removed. Click Save to persist.', 'info');
  },

  async save() {
    const name = document.getElementById('bizName').value.trim();
    if (!name) {
      showToast('Business name is required', 'warning');
      return;
    }

    const payload = {
      name,
      logo_url: this.uploadedLogoUrl || '',
      email: document.getElementById('bizEmail').value.trim(),
      phone: document.getElementById('bizPhone').value.trim(),
      gstin: document.getElementById('bizGstin').value.trim().toUpperCase(),
      pan: document.getElementById('bizPan').value.trim().toUpperCase(),

      address_line1: document.getElementById('bizAddress1').value.trim(),
      address_line2: document.getElementById('bizAddress2').value.trim(),
      city: document.getElementById('bizCity').value.trim(),
      state: document.getElementById('bizState').value,
      pincode: document.getElementById('bizPincode').value.trim(),
      country: document.getElementById('bizCountry').value.trim() || 'India',

      bank_name: document.getElementById('bizBankName').value.trim(),
      account_name: document.getElementById('bizAccountName').value.trim(),
      account_number: document.getElementById('bizAccountNumber').value.trim(),
      ifsc_code: document.getElementById('bizIfsc').value.trim().toUpperCase(),
      upi_id: document.getElementById('bizUpi').value.trim(),

      default_notes: document.getElementById('bizNotes').value.trim(),
      default_terms: document.getElementById('bizTerms').value.trim()
    };

    try {
      const res = await API.updateBusiness(payload);
      if (res.success) {
        this.currentData = res.data;
        showToast('Business profile updated successfully!', 'success');
      } else {
        throw new Error(res.error || 'Failed to update business profile');
      }
    } catch (err) {
      console.error('Error saving business:', err);
      showToast(err.message, 'error');
    }
  }
};
