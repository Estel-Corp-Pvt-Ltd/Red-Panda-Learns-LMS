import { storage } from "@/firebaseConfig";
import { ref, uploadBytesResumable, UploadTask } from "firebase/storage";

class ImageService {
  uploadImage(uploadPath: string, file: File): UploadTask | null {
    try {
      const storageRef = ref(storage, uploadPath);
      const uploadTask = uploadBytesResumable(storageRef, file);
      return uploadTask;
    } catch (error) {
      console.error("Error starting upload:", error);
      return null;
    }
  }
}

export const imageService = new ImageService();
