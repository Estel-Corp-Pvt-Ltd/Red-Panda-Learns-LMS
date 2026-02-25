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
