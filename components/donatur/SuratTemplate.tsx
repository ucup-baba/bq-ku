import type { SuratData } from '@/lib/surat/data';
import { labelSapaan } from '@/lib/surat/data';
import type { SuratAssets } from '@/lib/surat/assets';

const HIJAU = '#0E9F54';
const BIRU = '#0B5FA5';

export function SuratTemplate({ data, assets }: { data: SuratData; assets: SuratAssets }) {
  const garis = (isi: string) => (
    <div style={{ display: 'flex', borderBottom: '2px dashed #555', minWidth: 420, paddingBottom: 2, fontSize: 26, fontWeight: 700 }}>{isi}</div>
  );

  return (
    <div style={{ width: 1240, height: 1754, display: 'flex', flexDirection: 'column', backgroundColor: '#fff', color: '#111', fontFamily: 'Jakarta', padding: '56px 72px' }}>
      {/* KOP */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <img src={assets.logo} width={132} height={132} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Baris Arab dipra-render sebagai PNG (lihat lib/surat/assets.ts) karena
              Satori tidak mendukung bidi/shaping Arab. */}
          <img src={assets.kopArab} width={242} height={26} style={{ objectFit: 'contain' }} />
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, color: HIJAU, letterSpacing: -0.5 }}>PANTI ASUHAN</div>
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, color: BIRU, letterSpacing: -0.5 }}>BAITUL QOWWAM</div>
          <div style={{ display: 'flex', fontSize: 16, color: '#333' }}>Izin operasional No. 466/0574/P2/2020 · akte notaris m. gunardi widyastuti no.02/2010</div>
          <div style={{ display: 'flex', fontSize: 16, color: '#333' }}>Plumbon Mororejo Tempel Sleman Yogyakarta 55552</div>
        </div>
      </div>
      <div style={{ display: 'flex', height: 4, backgroundColor: HIJAU, margin: '18px 0 28px' }} />

      {/* Nomor & tanggal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex' }}>No&nbsp;&nbsp;: {data.nomorSurat}</div>
          <div style={{ display: 'flex' }}>Hal&nbsp;: Ucapan Terima Kasih</div>
        </div>
        <div style={{ display: 'flex' }}>Tempel, {data.tanggalTeks}</div>
      </div>

      {/* Tujuan */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 36, fontSize: 24 }}>
        <div style={{ display: 'flex' }}>Kepada Yth.</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex' }}>{labelSapaan(data.sapaan)} :</div>
          {garis(data.namaDonatur)}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex' }}>Di</div>
          {garis('Tempat')}
        </div>
      </div>

      {/* Isi */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 36, fontSize: 24, lineHeight: 1.5 }}>
        <div style={{ display: 'flex' }}>Assalammu’alaikum Wr. Wb</div>
        <div style={{ display: 'flex' }}>
          Dengan surat ini kami mengucapkan banyak terima kasih kepada {labelSapaan(data.sapaan)} {data.namaDonatur} atas penyaluran zakat/infaq/shadaqah kepada Panti Asuhan BAITUL QOWWAM, sebesar:
        </div>

        {data.barisNilai.tipe === 'UANG' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 60 }}>
            <div style={{ display: 'flex', gap: 12 }}><div style={{ display: 'flex', width: 140 }}>Rp.</div>{garis(data.barisNilai.rupiah)}</div>
            <div style={{ display: 'flex', gap: 12 }}><div style={{ display: 'flex', width: 140 }}>Terbilang</div>{garis(`${data.barisNilai.terbilang} Rupiah`)}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, paddingLeft: 60 }}>
            <div style={{ display: 'flex', width: 140 }}>Berupa</div>{garis(data.barisNilai.deskripsi)}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 12 }}>
          <div style={{ display: 'flex', fontSize: 22 }}>Teriring Do’a</div>
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: HIJAU }}>JAZAKUMULLAHU KHAIRAN JAZAA</div>
          <img src={assets.doaArab} width={525} height={30} style={{ objectFit: 'contain', marginTop: 4 }} />
          <div style={{ display: 'flex', fontSize: 20, fontStyle: 'italic', textAlign: 'center', marginTop: 8, maxWidth: 880 }}>
            “Semoga Allah memberi pahala dengan apa yang engkau berikan dan Allah memberkahi apa saja yang masih ada pada diri engkau dan semoga Allah menjadikannya suci bagi engkau” Aamiin...
          </div>
        </div>

        <div style={{ display: 'flex' }}>
          Dana yang kami terima dialokasikan untuk penyelenggaraan Panti Asuhan Baitul Qowwam. Demikian surat ini kami sampaikan, atas perhatian dan kepercayaannya kami ucapkan banyak terima kasih.
        </div>
        <div style={{ display: 'flex' }}>Wassalammu’alaikum Wr. Wb</div>
      </div>

      {/* Tanda tangan */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', width: 420 }}>
          <div style={{ display: 'flex', fontSize: 22 }}>Pengurus Panti Asuhan</div>
          <div style={{ display: 'flex', fontSize: 22 }}>Baitul Qowwam</div>
          <div style={{ display: 'flex', position: 'relative', height: 150, width: 380, alignItems: 'center', justifyContent: 'center' }}>
            <img src={assets.stempel} width={210} height={210} style={{ position: 'absolute', left: 20, top: -20, opacity: 0.9 }} />
            <img src={assets.ttd} width={150} height={150} style={{ position: 'absolute', left: 150, top: -6 }} />
          </div>
          <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, borderTop: '1px solid #111', paddingTop: 6 }}>Dr. H. Agus Triyanta</div>
        </div>
      </div>

      {/* NB */}
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto', fontSize: 18, color: '#333' }}>
        <div style={{ display: 'flex' }}>NB :</div>
        <div style={{ display: 'flex' }}>No.Telpon : 08121 5520 406 dan 0813 7297 3706</div>
        <div style={{ display: 'flex' }}>No. Rek : BSI 0307075359</div>
        <div style={{ display: 'flex' }}>A.n Agus T. QQ. Baitul Qowwam</div>
      </div>
    </div>
  );
}
