import { storage } from "@/firebaseConfig";
import { getDownloadURL, ref, uploadBytes, uploadBytesResumable, UploadTask } from "firebase/storage";


class FileService {
  uploadFileChunk(uploadPath: string, file: File): UploadTask | null {
    try {
      const storageRef = ref(storage, uploadPath);
      const uploadTask = uploadBytesResumable(storageRef, file);
      return uploadTask;
    } catch (error) {
      console.error("Error starting upload:", error);
      return null;
    }
  }

  async uploadAttachment(uploadPath: string, file: File,): Promise<string> {
    try {
      const fileRef = ref(storage, `${uploadPath}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(fileRef);
      return downloadUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('File upload failed');
    }
  }
}

export const fileService = new FileService();
