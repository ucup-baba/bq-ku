-- 0014: Perpus BQ tahap 2 — view publik (dibaca role anon) & bucket sampul.
-- View berjalan dengan hak pemilik (security_invoker = false) sehingga melewati RLS tabel dasar;
-- karena itu daftar kolom di sini adalah batas privasinya: JANGAN menambah perpus_donasi.jumlah.
-- Aman dijalankan ulang.

-- A. Katalog. `tersedia` sementara = eksemplar; tahap 3 mengurangi pinjaman aktif (kolom tetap sama).
create or replace view public.perpus_katalog_publik with (security_invoker = false) as
select
  b.id,
  left(b.id::text, 8) as "idPendek",
  b.judul,
  b.penulis,
  case when b."nomorPanggil" ~ '^(TMP|AUDIT)-' then null else b."nomorPanggil" end as "nomorPanggil",
  b."kelasDdc",
  b.eksemplar,
  b.eksemplar as tersedia,
  b."sampulPath",
  b.asal,
  case when b.asal = 'wakaf' then d.nama end as "namaDonatur",
  b."createdAt"
from public.perpus_buku b
left join public.perpus_donasi d on d.id = b."donasiId"
where b.aktif;

-- B. Donatur, tanpa jumlah & catatan.
create or replace view public.perpus_donasi_publik with (security_invoker = false) as
select
  d.id,
  d.tanggal,
  d."tanggalTeks",
  d.nama,
  d.jenis,
  d."jumlahBuku",
  coalesce((
    select jsonb_agg(jsonb_build_object('idPendek', left(b.id::text, 8), 'judul', b.judul) order by b.judul)
    from public.perpus_buku b
    where b."donasiId" = d.id and b.aktif
  ), '[]'::jsonb) as buku
from public.perpus_donasi d;

-- C. Ringkasan: satu baris.
create or replace view public.perpus_ringkasan_publik with (security_invoker = false) as
with infaq as (
  select coalesce(sum(jumlah), 0)::bigint as total from public.perpus_donasi where jenis = 'uang'
), belanja as (
  select coalesce(sum(total), 0)::bigint as total from public.perpus_pengadaan
)
select
  (select count(*) from public.perpus_buku where aktif)::int as judul,
  (select coalesce(sum(eksemplar), 0) from public.perpus_buku where aktif)::int as eksemplar,
  (select count(distinct lower(trim(nama))) from public.perpus_donasi)::int as donatur,
  infaq.total as "totalInfaq",
  belanja.total as "totalPengadaan",
  infaq.total - belanja.total as saldo
from infaq, belanja;

-- D. Hak akses: hanya baca.
do $$
declare v text;
begin
  foreach v in array array['perpus_katalog_publik', 'perpus_donasi_publik', 'perpus_ringkasan_publik'] loop
    execute format('revoke all on public.%I from anon, authenticated', v);
    execute format('grant select on public.%I to anon, authenticated', v);
  end loop;
end $$;

-- E. Bucket sampul: baca publik lewat URL, tulis hanya pustakawan.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('perpus-sampul', 'perpus-sampul', true, 2097152, array['image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/webp'];

drop policy if exists "perpus-sampul: kelola" on storage.objects;
create policy "perpus-sampul: kelola" on storage.objects for all to authenticated
  using (bucket_id = 'perpus-sampul' and (public.has_role('SUPERADMIN') or public.has_role('PUSTAKAWAN')))
  with check (bucket_id = 'perpus-sampul' and (public.has_role('SUPERADMIN') or public.has_role('PUSTAKAWAN')));
