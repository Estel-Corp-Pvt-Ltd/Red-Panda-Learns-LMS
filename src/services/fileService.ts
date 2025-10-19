import { storage } from "@/firebaseConfig";
import { logError } from "@/utils/logger";
import { ok, Result } from "@/utils/response";
import { getDownloadURL, ref, uploadBytes, uploadBytesResumable, UploadTask } from "firebase/storage";


class FileService {
  startResumableUpload(uploadPath: string, file: File): Result<UploadTask | null> {
    try {
      const storageRef = ref(storage, uploadPath);
      const uploadTask = uploadBytesResumable(storageRef, file);
      return ok(uploadTask);
    } catch (error) {
      logError("Error starting upload:", error);
      return fail(null);
    }
  }

  async uploadAttachment(uploadPath: string, file: File,): Promise<Result<string>> {
    try {
      const fileRef = ref(storage, `${uploadPath}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(fileRef);
      return ok(downloadUrl);
    } catch (error) {
      logError('Error uploading file:', error);
      return fail(null);
    }
  }
}

export const fileService = new FileService();
