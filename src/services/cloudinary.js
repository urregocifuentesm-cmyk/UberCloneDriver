// Code documentation: Cloudinary image upload service.
import { isDemoMode } from '../config/firebase';

// Subida sin firma (upload preset "unsigned"). No hay secretos en la app.
export async function uploadImage(uri) {
  if (isDemoMode) return uri;
  const data = new FormData();
  data.append('file', { uri, type: 'image/jpeg', name: 'upload.jpg' });
  data.append('upload_preset', process.env.EXPO_PUBLIC_CLOUDINARY_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD}/image/upload`,
    { method: 'POST', body: data },
  );
  const json = await res.json();
  if (!json.secure_url) throw new Error('No se pudo subir la imagen');
  return json.secure_url;
}

