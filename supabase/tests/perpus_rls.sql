-- Uji manual di SQL Editor setelah 0014. Setiap kueri punya hasil yang diharapkan di komentarnya.
begin;
set local role anon;
select count(*) from public.perpus_katalog_publik;    -- > 0
select count(*) from public.perpus_donasi_publik;     -- > 0
select * from public.perpus_ringkasan_publik;         -- 1 baris
select count(*) from public.perpus_buku;              -- 0 (RLS)
select count(*) from public.perpus_donasi;            -- 0 (RLS)
select count(*) from public.perpus_pengadaan;         -- 0 (RLS)
rollback;

-- Harus galat: column "jumlah" does not exist
begin;
set local role anon;
select jumlah from public.perpus_donasi_publik;
rollback;

-- Harus galat: view tidak bisa diubah (permission denied atau "not automatically updatable")
begin;
set local role anon;
delete from public.perpus_katalog_publik;
rollback;
