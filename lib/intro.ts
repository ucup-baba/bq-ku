export const INTRO_KEY = 'bq-intro';

// Skrip kepala halaman: lewati intro bila sudah tampil di sesi ini (mencegah kedip sebelum hidrasi)
// atau saat dijalankan oleh browser otomatis (tes e2e).
export const INTRO_HEAD_SCRIPT = `try{if(navigator.webdriver||sessionStorage.getItem('${INTRO_KEY}'))document.documentElement.dataset.intro='skip'}catch(e){document.documentElement.dataset.intro='skip'}`;
