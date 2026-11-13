/* Google Apps Script RSVP bridge. The request uses text/plain + no-cors to avoid a browser preflight. */
(function () {
    'use strict';

    function init() {
        var body = document.body;
        var endpoint = body.getAttribute('data-gas-url');
        var button = document.getElementById('rsvp-submit');
        var status = document.getElementById('rsvp-status');
        var nameInput = document.getElementById('form-name');
        var jumlahInput = document.getElementById('form-jumlah');
        var attendanceInput = document.getElementById('form-presence');
        var wishesInput = document.getElementById('form-comment');
        var query = new URLSearchParams(window.location.search);
        var guestId = query.get('gid') || '';
        var guestName = query.get('to') || '';
        var guestNum = query.get('num') || '';

        if (!endpoint || endpoint.indexOf('PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE') >= 0) {
            if (status) status.textContent = 'Admin: configure data-gas-url with your Apps Script Web App URL first.';
            if (button) button.disabled = true;
            return;
        }

        if (nameInput && guestName) nameInput.value = guestName;

        if (jumlahInput && guestNum) jumlahInput.value = guestNum;

        if (guestNum == "1") document.getElementById('rsvp-orang').disabled = true;

        if (!guestId) {
            if (status) status.textContent = 'Tautan undangan ini belum memiliki ID tamu. Silakan gunakan tautan dari admin.';
            if (button) button.disabled = true;
            return;
        }

        if (button) {
            button.addEventListener('click', function () {
                var name = nameInput ? nameInput.value.trim() : '';
                var jumlah = jumlahInput ? jumlahInput.value.trim() : '';
                var presence = attendanceInput ? attendanceInput.value : '0';
                var wishes = wishesInput ? wishesInput.value.trim() : '';

                if (name.length < 2) {
                    status.textContent = 'Nama minimal 2 karakter.';
                    return;
                }

                if (Number(jumlah) > Number(guestNum)) {
                    status.textContent = 'Jumlah Undangan lebih dari ' + guestNum + ' orang. Silakan konfirmasi dengan pasangan.';
                    return;
                }

                if (presence !== '1' && presence !== '2') {
                    status.textContent = 'Silakan pilih konfirmasi kehadiran.';
                    return;
                }
                if (wishes.length > 1000) {
                    status.textContent = 'Ucapan maksimal 1000 karakter.';
                    return;
                }

                button.disabled = true;
                status.textContent = 'Mengirim konfirmasi...';
                var payload = {
                    action: 'submitRsvp',
                    guestId: guestId,
                    name: name,
                    jumlah: jumlah,
                    kehadiran: presence === '1' ? 'Attending' : 'Not attending',
                    wishes: wishes
                };

                fetch(endpoint, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(payload)
                }).then(function () {
                    // no-cors returns an opaque response; the browser cannot confirm server-side success.
                    status.textContent = 'Konfirmasi kehadiran terkirim!';
                    if (wishesInput) wishesInput.value = '';
                }).catch(function () {
                    status.textContent = 'Gagal mengirim. Periksa koneksi internet lalu coba lagi.';
                }).finally(function () {
                    button.disabled = false;
                });
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
