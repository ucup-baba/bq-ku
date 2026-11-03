export const BUCKET_SAMPUL = 'perpus-sampul';
export const pathSampul = (bukuId: string, waktu: number) => `${bukuId}/${waktu}.webp`;
export const urlSampul = (path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_SAMPUL}/${path}`;
