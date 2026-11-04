-- Uji manual di SQL Editor setelah 0016. Berhasil = skrip selesai tanpa galat; semua data di-rollback.
-- Butuh dua profil bukan staf, satu SUPERADMIN aktif, dan satu buku aktif.
begin;

select
  set_config('uji.a', (select id::text from public.profiles where not (roles && array['SUPERADMIN','PUSTAKAWAN']) order by id limit 1), true),
  set_config('uji.b', (select id::text from public.profiles where not (roles && array['SUPERADMIN','PUSTAKAWAN']) order by id offset 1 limit 1), true),
  set_config('uji.admin', (select id::text from public.profiles where aktif and 'SUPERADMIN' = any(roles) limit 1), true),
  set_config('uji.buku', (select id::text from public.perpus_buku where aktif order by id limit 1), true);

insert into public.perpus_anggota ("userId", nama, "noWa") values
  (current_setting('uji.a')::uuid, 'Aisyah Rahma Putri', '6281200000001'),
  (current_setting('uji.b')::uuid, 'Budi', '6281200000002')
on conflict ("userId") do update set nama = excluded.nama;
insert into public.perpus_pinjaman ("anggotaId", "bukuId", status)
values (current_setting('uji.a')::uuid, current_setting('uji.buku')::uuid, 'dikembalikan');

set local role authenticated;

do $$
declare
  v_id uuid; v_n int; v_nama text; v_baru boolean;
  sebagai text := 'request.jwt.claims';
  buku uuid := current_setting('uji.buku')::uuid;
begin
  -- B belum pernah meminjam.
  perform set_config(sebagai, json_build_object('sub', current_setting('uji.b'))::text, true);
  begin
    perform public.perpus_simpan_catatan(buku, 'Halo');
    raise exception 'HARUS GAGAL: belum pernah pinjam';
  exception when others then
    if sqlerrm <> 'perpus:belum_pernah_pinjam' then raise; end if;
  end;

  -- A menulis; bawaan publik; nama publik disingkat.
  perform set_config(sebagai, json_build_object('sub', current_setting('uji.a'))::text, true);
  v_id := (public.perpus_simpan_catatan(buku, 'Bagus sekali')).id;
  select "namaSingkat" into v_nama from public.perpus_catatan_publik where id = v_id;
  if v_nama <> 'Aisyah R.' then raise exception 'HARUS Aisyah R.: %', v_nama; end if;

  -- Simpan ulang mengedit baris yang sama; privat hilang dari publik.
  if (public.perpus_simpan_catatan(buku, 'Rahasia', false)).id <> v_id then raise exception 'HARUS baris sama'; end if;
  select count(*) into v_n from public.perpus_catatan_publik where id = v_id;
  if v_n <> 0 then raise exception 'HARUS 0: privat tampil publik'; end if;

  -- B tidak melihat & tidak bisa menghapus milik A; update langsung 0 baris.
  perform set_config(sebagai, json_build_object('sub', current_setting('uji.b'))::text, true);
  select count(*) into v_n from public.perpus_catatan where id = v_id;
  if v_n <> 0 then raise exception 'HARUS 0: baca catatan orang lain'; end if;
  begin
    perform public.perpus_hapus_catatan(v_id);
    raise exception 'HARUS GAGAL: hapus milik orang lain';
  exception when others then
    if sqlerrm <> 'perpus:catatan_tidak_ada' then raise; end if;
  end;

  -- Super admin tidak melihat & tidak bisa memoderasi catatan privat.
  perform set_config(sebagai, json_build_object('sub', current_setting('uji.admin'))::text, true);
  select count(*) into v_n from public.perpus_catatan where id = v_id;
  if v_n <> 0 then raise exception 'HARUS 0: admin membaca privat'; end if;
  begin
    perform public.perpus_moderasi_catatan(v_id);
    raise exception 'HARUS GAGAL: moderasi privat';
  exception when others then
    if sqlerrm <> 'perpus:catatan_tidak_ada' then raise; end if;
  end;

  -- A menjadikannya publik; anggota biasa tidak bisa memoderasi; admin bisa.
  perform set_config(sebagai, json_build_object('sub', current_setting('uji.a'))::text, true);
  perform public.perpus_simpan_catatan(buku, 'Publik lagi', true);
  begin
    perform public.perpus_moderasi_catatan(v_id);
    raise exception 'HARUS GAGAL: moderasi oleh anggota';
  exception when others then
    if sqlerrm <> 'perpus:terlarang' then raise; end if;
  end;
  perform set_config(sebagai, json_build_object('sub', current_setting('uji.admin'))::text, true);
  perform public.perpus_moderasi_catatan(v_id, 'Tidak pantas');

  -- Hilang dari publik; penulis melihat pemberitahuan lalu menutupnya, dan bisa menulis lagi.
  select count(*) into v_n from public.perpus_catatan_publik where id = v_id;
  if v_n <> 0 then raise exception 'HARUS 0: dihapus tampil publik'; end if;
  perform set_config(sebagai, json_build_object('sub', current_setting('uji.a'))::text, true);
  select count(*) into v_n from public.perpus_catatanku where id = v_id and "alasanHapus" = 'Tidak pantas' and "pemberitahuanDitutupAt" is null;
  if v_n <> 1 then raise exception 'HARUS 1: pemberitahuan'; end if;
  perform public.perpus_tutup_pemberitahuan(v_id);
  if (public.perpus_simpan_catatan(buku, 'Baru')).id = v_id then raise exception 'HARUS baris baru'; end if;

  -- Penulis menghapus miliknya sendiri.
  select id into v_id from public.perpus_catatanku where "dihapusAt" is null;
  perform public.perpus_hapus_catatan(v_id);
  select count(*) into v_n from public.perpus_catatan where id = v_id;
  if v_n <> 0 then raise exception 'HARUS 0: terhapus'; end if;
end $$;

rollback;

-- Harus galat: column "anggotaId" does not exist
begin;
set local role anon;
select "anggotaId" from public.perpus_catatan_publik;
rollback;

-- Harus galat: permission denied for view perpus_catatanku
begin;
set local role anon;
select * from public.perpus_catatanku;
rollback;

-- Harus galat: permission denied for function perpus_simpan_catatan
begin;
set local role anon;
select public.perpus_simpan_catatan(gen_random_uuid(), 'x');
rollback;
