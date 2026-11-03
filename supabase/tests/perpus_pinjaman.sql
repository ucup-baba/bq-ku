-- Uji manual di SQL Editor setelah 0015. Berhasil = skrip selesai tanpa galat; semua data di-rollback.
-- Butuh dua profil bukan staf, satu SUPERADMIN aktif, dan satu buku aktif tanpa pinjaman.
begin;

select
  set_config('uji.a', (select id::text from public.profiles where not (roles && array['SUPERADMIN','PUSTAKAWAN']) order by id limit 1), true),
  set_config('uji.b', (select id::text from public.profiles where not (roles && array['SUPERADMIN','PUSTAKAWAN']) order by id offset 1 limit 1), true),
  set_config('uji.admin', (select id::text from public.profiles where aktif and 'SUPERADMIN' = any(roles) limit 1), true),
  set_config('uji.buku', (select id::text from public.perpus_buku where aktif order by id limit 1), true);

update public.perpus_buku set eksemplar = 1 where id = current_setting('uji.buku')::uuid;
insert into public.perpus_anggota ("userId", nama, "noWa") values
  (current_setting('uji.a')::uuid, 'Uji A', '6281200000001'),
  (current_setting('uji.b')::uuid, 'Uji B', '6281200000002')
on conflict ("userId") do nothing;

set local role authenticated;

do $$
declare
  v_a uuid; v_b uuid; v_n int; v_tersedia int;
  sebagai text := 'request.jwt.claims';
begin
  -- A mengajukan; B juga (stok masih 1 karena belum ada yang di-ACC).
  perform set_config(sebagai, json_build_object('sub', current_setting('uji.a'), 'role', 'authenticated')::text, true);
  v_a := (public.perpus_ajukan_pinjaman(current_setting('uji.buku')::uuid)).id;

  -- Pengajuan ganda ditolak.
  begin
    perform public.perpus_ajukan_pinjaman(current_setting('uji.buku')::uuid);
    raise exception 'HARUS GAGAL: ajukan ganda';
  exception when others then
    if sqlerrm <> 'perpus:sudah_diajukan' then raise; end if;
  end;

  -- Anggota tidak bisa mengubah pinjaman langsung (RLS: 0 baris) dan tidak bisa ACC.
  update public.perpus_pinjaman set status = 'dipinjam' where id = v_a;
  get diagnostics v_n = row_count;
  if v_n <> 0 then raise exception 'HARUS 0 BARIS: update langsung'; end if;
  begin
    perform public.perpus_acc_pinjaman(v_a);
    raise exception 'HARUS GAGAL: ACC oleh anggota';
  exception when others then
    if sqlerrm <> 'perpus:terlarang' then raise; end if;
  end;

  perform set_config(sebagai, json_build_object('sub', current_setting('uji.b'), 'role', 'authenticated')::text, true);
  v_b := (public.perpus_ajukan_pinjaman(current_setting('uji.buku')::uuid)).id;

  -- B tidak melihat pinjaman A.
  select count(*) into v_n from public.perpus_pinjaman where id = v_a;
  if v_n <> 0 then raise exception 'HARUS 0: baca pinjaman orang lain'; end if;
  select count(*) into v_n from public.perpus_pinjamanku;
  if v_n <> 1 then raise exception 'HARUS 1: view pinjamanku'; end if;

  -- B tidak bisa membatalkan milik A.
  begin
    perform public.perpus_batal_pinjaman(v_a);
    raise exception 'HARUS GAGAL: batal milik orang lain';
  exception when others then
    if sqlerrm <> 'perpus:pinjaman_tidak_ada' then raise; end if;
  end;

  -- Admin: ACC pertama berhasil dengan bawaan 14 hari, yang kedua kehabisan stok.
  perform set_config(sebagai, json_build_object('sub', current_setting('uji.admin'), 'role', 'authenticated')::text, true);
  if (public.perpus_acc_pinjaman(v_a))."jatuhTempo" <> (now() at time zone 'Asia/Jakarta')::date + 14 then
    raise exception 'HARUS 14 HARI';
  end if;
  begin
    perform public.perpus_acc_pinjaman(v_b);
    raise exception 'HARUS GAGAL: ACC eksemplar habis';
  exception when others then
    if sqlerrm <> 'perpus:stok_habis' then raise; end if;
  end;

  select tersedia into v_tersedia from public.perpus_katalog_publik where id = current_setting('uji.buku')::uuid;
  if v_tersedia <> 0 then raise exception 'HARUS 0: tersedia di katalog'; end if;

  -- A mengklaim kembali, lalu batal tidak sah lagi; eksemplar tetap terhitung sampai diverifikasi.
  perform set_config(sebagai, json_build_object('sub', current_setting('uji.a'), 'role', 'authenticated')::text, true);
  perform public.perpus_klaim_kembali(v_a);
  begin
    perform public.perpus_batal_pinjaman(v_a);
    raise exception 'HARUS GAGAL: batal setelah klaim';
  exception when others then
    if sqlerrm <> 'perpus:status_tidak_sah:menunggu_verifikasi' then raise; end if;
  end;
  select tersedia into v_tersedia from public.perpus_katalog_publik where id = current_setting('uji.buku')::uuid;
  if v_tersedia <> 0 then raise exception 'HARUS 0: tersedia saat menunggu verifikasi'; end if;
end $$;

rollback;

-- Harus galat: permission denied for view perpus_pinjamanku
begin;
set local role anon;
select * from public.perpus_pinjamanku;
rollback;

-- Harus galat: permission denied for function perpus_ajukan_pinjaman
begin;
set local role anon;
select public.perpus_ajukan_pinjaman(gen_random_uuid());
rollback;

-- Harus 0 baris (RLS)
begin;
set local role anon;
select count(*) from public.perpus_anggota;
rollback;
