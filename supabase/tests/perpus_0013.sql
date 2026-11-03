-- Jalankan di SQL Editor setelah 0013. Setiap baris hasil harus bernilai true.
select 'role valid berisi PUSTAKAWAN' as cek,
  pg_get_constraintdef(oid) like '%PUSTAKAWAN%' as ok
  from pg_constraint where conname = 'profiles_roles_valid'
union all
select 'fitur AI klasifikasi_buku', pg_get_constraintdef(oid) like '%klasifikasi_buku%'
  from pg_constraint where conname = 'pemakaian_ai_fitur_check'
union all
select 'RLS aktif ' || relname, relrowsecurity
  from pg_class where relname in ('perpus_buku', 'perpus_donasi', 'perpus_pengadaan')
union all
select 'nomorPanggil unik', exists (
  select 1 from pg_indexes where tablename = 'perpus_buku' and indexdef like '%UNIQUE%nomorPanggil%')
union all
select 'fungsi terapkan nomor', exists (select 1 from pg_proc where proname = 'perpus_terapkan_nomor');
