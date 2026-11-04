-- 0018: tautkan buku dari sheet GM Children ke donasinya. Hanya data, tanpa perubahan skema.
-- Sumber: sheet "Book Collection" (Gate of Literacy). Hanya baris asal koleksi_awal yang diubah, jadi
-- buku berasal wakaf lain atau pengadaan tetap (Guru Aini, Si Anak Badai, Filosofi Teras, Baitul Maqdis For Dummies).
-- Eksemplar sengaja tidak diubah. Jumlah 173 = total sheet 178 dikurangi 5 "Big Sampul" (bukan buku).
-- Aman dijalankan ulang.
do $$
declare v_donasi uuid;
begin
  select id into v_donasi from public.perpus_donasi where nama = 'GM CHILDREN FOUNDATION' and jenis = 'buku';
  if v_donasi is null then raise exception 'Donasi GM CHILDREN FOUNDATION tidak ditemukan'; end if;

  update public.perpus_buku set asal = 'wakaf', "donasiId" = v_donasi, "updatedAt" = now()
  where asal = 'koleksi_awal' and id in (select id::uuid from (values
    ('dc07f2a4-73d4-4aff-bbae-e324d1cdf42a'), -- Rantau 1 Muara
    ('37472048-900c-4009-8056-5ebd8eacce2c'), -- Ranah 3 Warna
    ('14bf9826-f671-4374-a5fc-0bc6545ba470'), -- Negeri 5 Menara
    ('6e4b25e0-9703-4538-97a7-194295f06657'), -- Orang-orang biasa
    ('7c77b954-c142-4975-8255-9caa94e618fb'), -- Ayah dan sirkus pohon
    ('269a6268-889c-4aa3-8de5-4455abf3d623'), -- Melangkah
    ('db7d7df6-4134-44a9-ac42-de0d58c7f2b8'), -- Kami (Bukan) Sarjana Kertas
    ('e7d507e3-c3f3-490a-9287-6ce8d52f7f12'), -- Kami (Bukan) Jongos Berdasi
    ('2f27ad94-fdc3-4fbb-b4c0-10687dd22fe2'), -- Kami (Bukan) Generasi Bacot
    ('4650e40d-cc4c-46f4-b9ff-acb3ede0b910'), -- Kami (Bukan) Fakir Asmara
    ('8148571d-4f5d-41ed-af50-290d63f9ff74'), -- Seporsi Mie Ayam Sebelum Mati
    ('542989b8-8f3a-44bf-a0e6-f7f585bab68c'), -- Laut Bercerita
    ('82529e99-966e-4869-ba7f-99edfe59a800'), -- Atomic Habits
    ('7344d7c5-83ad-4a4c-9e56-42c0260eb7a6'), -- Ayah, ini arahnya kemana ya?
    ('db2842af-8f0d-4f32-81e7-10c31fee1690'), -- animal farm
    ('aa277499-0377-4115-aad1-08285e0aa054'), -- makanya mikir
    ('2b810e32-a9c3-45ec-93b8-504274122161'), -- Start With Why
    ('aadc5712-658c-4690-8a94-42cdbc3e53cc'), -- Madilog
    ('50d2cb8e-900a-4861-a6a7-aa49cffa447f'), -- The Art Of living
    ('ee8a6d3b-60a9-4c3e-a67c-e972ca1fbccd'), -- The Power of Now
    ('7965e09a-3dc9-4351-9c86-8db25382f2c7'), -- rich dad poor dad
    ('17b5818e-6a51-41d1-b348-601b5d28b31f'), -- second chance
    ('3235517f-f1bf-4ddb-8200-68e060d5a1c7'), -- maaf tuhan aku hampir menyerah
    ('1b630a1c-c64a-4927-af6b-93fc38503591'), -- ya allah, aku pulang
    ('c5c80deb-3e2d-4fdd-8c00-59661c7139de'), -- maaf tuhan, aku hampir porak-poranda karena perasaan
    ('f7262e4c-165e-476b-9822-9b6dab0b9197'), -- Tiga Malam Bersama Penghuni Surga
    ('7dc96c21-169a-420a-b690-cc5dd47a755c'), -- The Glory Story of Two Umars
    ('a399fea8-3376-4122-acc6-7b67a4446dcd'), -- Seribu Jalan Menuju Tuhan
    ('07d52b68-9020-45b9-8b1d-bf56733144da'), -- Wanita Berkarir Surga
    ('503842ae-31d0-4b37-8082-a92c6fbcc848'), -- Benyond the inspiration
    ('83be0f54-f76a-43db-ae7e-e1f907ed8b72'), -- how to you habbits
    ('806ee478-91e9-4016-9e97-ba1b80905736'), -- quest komik
    ('c1ebc656-d9f6-43aa-929f-7d2f55bd0980'), -- Ghazi 1
    ('8c083890-eb41-4086-922e-b75d938099db'), -- Ghazi 2
    ('47ffc225-abdc-4048-9d27-abb0d34e8556'), -- Ghazi 3
    ('819937b7-63ca-46f9-8ccb-409ac6a9d039'), -- Ghazi 4
    ('89cb2a20-df00-4142-a2f9-3eb6d9709215'), -- Ghazi 5
    ('82b44392-a263-41c0-a37b-79b94303240f'), -- Dia Adalah Kakakku
    ('20834663-4cae-4004-9cfb-992c8c3abbc9'), -- Pulang
    ('2bdb0a9d-1eb4-4a2e-9358-dbdf14c17bee'), -- Pergi
    ('d4e2f57e-8e6c-4092-bab7-d47d360754da'), -- Pulang Pergi
    ('1418f011-bf46-4443-921e-676729d6daf4'), -- Negeri di Ujung Tanduk
    ('86f62a23-55e2-46a4-a70c-d3de3d585aec'), -- Negeri Para Bedebah
    ('50ce622d-2fdd-4293-83df-27443506cc65'), -- Si Anak Spesial
    ('c5088a16-f088-42e4-85c2-46c2e2f0421b'), -- Si Anak Pintar
    ('849227fa-01ad-4718-af47-ef63f8758935'), -- Si Anak Pemberani
    ('b3873ee2-8bb6-4afd-a049-15044dc2932f'), -- Si Anak Kuat
    ('bd0915db-c823-4230-a28f-7eba67d31b0d'), -- Si Anak Cahaya
    ('a800c79c-0e27-4d97-bce5-ad38ccd44b0d'), -- Si Anak Pelangi
    ('e0fbb057-fff1-4fdf-b032-921b0fcb4e2d'), -- Si Anak Savana
    ('38f0bd97-b0aa-4b05-bacb-63d566917064'), -- Sepotong Kisah DI Balik 98
    ('80728bbc-7c08-44cc-9235-06751dc72cea'), -- Buya Hamka
    ('f12a36ef-06b4-49fd-b757-c2f725e5195b'), -- Aku punya kendala Allah punya kendali
    ('12b7c338-c872-4c90-8971-4f9ce0911fb6'), -- Ibumu Semakin Tua
    ('1dd78513-e642-4136-9372-d8380c9c3c07'), -- good with money
    ('987c631e-f1fd-4c8d-a1cc-f17fa4b5862b'), -- Inilah Kisah Sang Rasul
    ('6e44bfc9-6878-4aa0-b948-02771231e3ac'), -- Seikatsu Kaizen
    ('2e333187-53ed-4008-8324-e78893b8f2c5'), -- The Art of letting god
    ('f0f0d16c-0e60-445b-ad8c-61714cf26601'), -- Be The Alpha Muslimah
    ('7ec5dfb0-0241-46a6-92b1-18eed63fba29'), -- Agar Letih Berangsur Pulih
    ('fee4d8d5-db0a-4942-9580-c82563cc9840'), -- Journey To Allah
    ('c7921b0e-e400-4d67-9d93-5af9dbbb07c0'), -- Building Islamic with habbit
    ('5abeba03-8f1b-41b2-9700-85d2e0d35850'), -- Pemograman Scratch untuk pemula
    ('16281e0e-e719-4173-a7ac-fcf05e656b8c'), -- Penerbit Andi - Super Pintar Matematika SMP Kelas 7,8,9
    ('c15904fa-70b7-463a-b700-2cedc9adc304'), -- Penerbit Andi - Crazy Corel
    ('26d77b13-35aa-4db4-b456-68379a18dbea'), -- Penerbit Andi - Mudah Belajar Corel Draw
    ('26824d63-ebf3-4513-ba59-c4c08267a5aa'), -- Penerbit Andi - Siapa Saja Bisa Membuat Website
    ('b73f2b95-1be8-4bd8-9196-86c2187fc48c'), -- Penerbit Andi - The Best Bedah
    ('cb0958bf-549a-4bdd-89f0-4b01a998f96c'), -- Penerbit Andi - Sapu Bersih
    ('9ec11c26-47a1-4d6a-a967-ee27603dd0a3'), -- Penerbit Andi - SMS Terakhir
    ('21f7535a-cf4f-4289-99cd-5f40df7251a8'), -- Penerbit Andi - Membentuk Anak Jenius Sejak Dari Janin
    ('b1e253a6-0f84-4289-8a3b-78231b3b9fcd'), -- Buku Komputer Microsoft Excel 2021
    ('c03362f9-9ab6-4538-a130-e8e833409dfb'), -- Penerbit Andi - Aplikasi Pemrograman
    ('a1291797-3570-42b7-b767-0f387c35bca7'), -- Buku Teori Dan Praktik Desain Ui/Ux
    ('92d8a43b-35c0-43e9-9ee7-4effdae92720'), -- Penerbit Andi - Cara Cespleng Pintar
    ('e9962732-12b3-42e6-bb0a-632ed7f15be0'), -- Penerbit Andi - Panduan Aplikatif dan Solusi:
    ('b96b1b2e-c312-4852-8287-967fad8fc9b5'), -- Penerbit Andi - Teori Dan Aplikasi
    ('94b5bb10-4ab7-4a26-8ac1-1320101bf9e8'), -- Penerbit Andi - Mobile Web
    ('c10600fa-f044-49b7-bf1f-628d75df8714'), -- Penerbit Andi - Membuat Interface
    ('f90acedc-9e08-492f-a5a3-e375de88bb88'), -- Buku Komputer Microsoft Word 2021
    ('b1f51c22-568c-477b-9fa9-072edea7b024'), -- Penerbit Andi - Kreatif Membuat Desain
    ('8e987253-4043-47ed-aec7-6f1693cd8e61'), -- Penerbit Andi - Microsoft PowerPoint 2016 Untuk Pemula
    ('0313b171-528e-466d-a54b-f01398d13924'), -- Penerbit Andi - Teknik Mudah Membangun Website
    ('ea41e777-9724-4234-8a99-1f1ed5909d99'), -- Penerbit Andi - Menguasai Pemrograman Arduino
    ('408e14c5-11e1-4c67-ac43-a366c66f7f92'), -- Penerbit Andi - Mudah Menjadi Programmer Java+cd
    ('b0523b46-bf9d-429d-bbc4-e9c496cc871f'), -- Penerbit Andi - The Best Bedah Soal
    ('855691b7-5f9e-4863-ad75-999efa23757b'), -- Rene Turos Kitab Terjemahan (’Uqala` al-Majanin)
    ('fb9621f2-5aad-41d1-94de-089dfe3c223e'), -- [Mizan] Para Pencari Ilmu
    ('b7118319-fc9b-47d4-b765-e9566440876c'), -- Saksikan Bahwa Aku
    ('a700aa66-a5d0-449a-bb32-112ed1c3898f'), -- Sang Pangeran
    ('a8e8029f-3c07-4289-8653-cb02d6cce11a'), -- Pahlawan Nusantara
    ('86b6e18d-c9f1-4999-a244-0c7a8f41942d'), -- Buku Besar Peminum Kopi
    ('f0cfa55a-34e3-46a4-a711-127b6699dee9'), -- Pendidikan Kaum Tertindas
    ('0a3d8d54-ad3e-4ddd-97e4-be5685dc4e6c'), -- Kitab Al-Filaha
    ('27ae9a3d-57d9-4468-a8be-07ebf1331f97'), -- Dunia Sophie
    ('6c9a77ae-8f61-4780-a436-58639237ac83'), -- Sang Pemimpi
    ('b37acf65-6923-44ac-ae69-781fb75e18d8'), -- Laskar Pelangi
    ('1b71b037-87f9-4b7f-b1ab-2c79db58ad1f'), -- Novel 1984
    ('1454691f-c00b-4441-b679-8f9bd4fd46c3'), -- Moby Dick
    ('97b70a37-4266-44bf-b592-e447bd62ba3e'), -- Bagaimana Media Sosial Menghancurkanmu
    ('b7a4e964-61f2-4917-abf8-e1482a4ccb24'), -- Lelucon Para Koruptor
    ('614fede8-f721-40f1-a740-8f7ecb998a5e'), -- Sang Alkemis (The Alchemist)
    ('1c7d7a38-9bbd-4dec-a503-5226a7cf38e7'), -- Ensiklopedia Si Kecil-Paket Seri Musim
    ('e7432aba-f757-484d-8356-0b11bc43f299'), -- Ensiklopedia Tata Surya
    ('fe7170e1-d920-48d1-a583-847b5cf4e077'), -- Ensiklopedia Sains
    ('2dcfd173-b450-428e-a9c9-c3a411f2d40c'), -- Ensiklopedia si Kecil- Seri Hewan
    ('5131d2e8-53ac-47ae-9239-0685148a1a8b'), -- The Business of the 21st Century
    ('8857ed5d-4173-4645-af91-7b22dc8cd0e7'), -- The Businnes School
    ('09faf2bc-ea26-4eaf-96a3-2c9292da6111'), -- Increase Your Financial IQ
    ('4546ca0c-596f-4ec6-9d59-c158bc4f5420'), -- Why the Rich are Getting Richer
    ('3589e159-572f-4b43-81f5-6ba76c02eb45'), -- Cashflow Quadrant
    ('0ad776f8-69a1-45e0-9898-d030b0282062'), -- Sisi Tergelap Surga
    ('f7ce6ff4-146d-4191-a7fe-0c21f0ca6e45'), -- Seri Sherlock Holmes 1
    ('945540af-397b-4313-a973-afe31b9e6643'), -- Seri Sherlock Holmes 2
    ('0023b28e-e6bc-4acb-859c-dd89c59fa733'), -- Seri Sherlock Holmes 3
    ('d0442373-097d-433b-819f-e313c94d2682'), -- Seri Sherlock Holmes 4
    ('897dfebc-a991-40eb-bc0f-8144b5627959'), -- Seri Sherlock Holmes 5
    ('9f10ba98-a418-434e-b6c2-41419524e9d4'), -- Seri Sherlock Holmes 6
    ('816c03e2-a029-44fa-be23-c4348d16854d'), -- Seri Sherlock Holmes 7
    ('2b8bd97c-bbba-4de0-9f2d-76279a737b56'), -- Seri Sherlock Holmes 8
    ('0b8fec9a-14be-4e19-80ba-bb17271f0dd3') -- Seri Sherlock Holmes 9
  ) as pilihan(id));

  update public.perpus_donasi set "jumlahBuku" = 173 where id = v_donasi;
end $$;
