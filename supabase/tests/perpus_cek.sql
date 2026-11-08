-- Uji manual di SQL Editor setelah 0019. Berhasil = skrip selesai tanpa galat; semua data di-rollback.
-- Butuh satu SUPERADMIN aktif, satu profil bukan staf, dan satu buku aktif.
begin;
select
  set_config('uji.admin', (select id::text from public.profiles where aktif and 'SUPERADMIN' = any(roles) limit 1), true),
  set_config('uji.biasa', (select id::text from public.profiles where not (roles && array['SUPERADMIN','PUSTAKAWAN']) limit 1), true),
  set_config('uji.buku', (select id::text from public.perpus_buku where aktif order by id limit 1), true);
set local role authenticated;

do $$
declare v_cek uuid; v_n int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', current_setting('uji.admin'))::text, true);
  insert into public.perpus_cek (periode) values ('2099-01') returning id into v_cek;
  insert into public.perpus_cek_item ("cekId", "bukuId", hasil, "jumlahAda") values (v_cek, current_setting('uji.buku')::uuid, 'ada', 1);
  -- Satu judul hanya satu baris per sesi: simpan ulang = update.
  insert into public.perpus_cek_item ("cekId", "bukuId", hasil) values (v_cek, current_setting('uji.buku')::uuid, 'hilang')
    on conflict ("cekId", "bukuId") do update set hasil = excluded.hasil;
  select count(*) into v_n from public.perpus_cek_item where "cekId" = v_cek and hasil = 'hilang';
  if v_n <> 1 then raise exception 'HARUS 1 baris hilang'; end if;
  begin
    insert into public.perpus_cek (periode) values ('2099-13');
    raise exception 'HARUS GAGAL: periode tidak sah';
  exception when check_violation then null;
  end;
  begin
    insert into public.perpus_cek (periode) values ('2099-01');
    raise exception 'HARUS GAGAL: periode ganda';
  exception when unique_violation then null;
  end;

  -- Profil bukan staf tidak melihat dan tidak bisa menulis.
  perform set_config('request.jwt.claims', json_build_object('sub', current_setting('uji.biasa'))::text, true);
  select count(*) into v_n from public.perpus_cek;
  if v_n <> 0 then raise exception 'HARUS 0: baca cek'; end if;
  begin
    insert into public.perpus_cek (periode) values ('2099-02');
    raise exception 'HARUS GAGAL: tulis oleh bukan staf';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- Harus 0 baris (RLS)
begin;
set local role anon;
select count(*) from public.perpus_cek_item;
rollback;
