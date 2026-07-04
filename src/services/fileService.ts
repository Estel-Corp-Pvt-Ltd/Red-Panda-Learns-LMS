import { storage } from "@/firebaseConfig";
import { logError } from "@/utils/logger";
import { fail, ok, Result } from "@/utils/response";
import { getDownloadURL, ref, uploadBytes, uploadBytesResumable, UploadTask } from "firebase/storage";


class FileService {
  startResumableUpload(uploadPath: string, file: File): Result<UploadTask | null> {
    try {
      const storageRef = ref(storage, uploadPath);
      const uploadTask = uploadBytesResumable(storageRef, file);
      return ok(uploadTask);
    } catch (error) {
      logError("Error starting upload:", error);
      return fail("Error starting upload");
    }
  }

  // Uploads an image to Cloudinary via unsigned upload preset. Returns the secure URL.
  // onProgress (0-100) lets callers drive their existing progress bars.
  async uploadImage(file: File, onProgress?: (pct: number) => void): Promise<Result<string>> {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
      logError("Cloudinary env vars missing", { cloudName, uploadPreset });
      return fail("Image upload not configured");
    }

    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", uploadPreset);

    // XHR (not fetch) so we get upload progress events for the existing UI.
    return new Promise<Result<string>>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(ok(JSON.parse(xhr.responseText).secure_url as string));
        } else {
          logError("Cloudinary upload failed", xhr.responseText);
          resolve(fail("Error uploading image"));
        }
      };
      xhr.onerror = () => {
        logError("Cloudinary upload network error");
        resolve(fail("Error uploading image"));
      };
      xhr.send(form);
    });
  }

  async uploadAttachment(uploadPath: string, file: File,): Promise<Result<string>> {
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileRef = ref(storage, `${uploadPath}/${Date.now()}_${safeName}`);
      await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(fileRef);
      return ok(downloadUrl);
    } catch (error) {
      logError('Error uploading file:', error);
      return fail("Error uploading file");
    }
  }
}

export const fileService = new FileService();
