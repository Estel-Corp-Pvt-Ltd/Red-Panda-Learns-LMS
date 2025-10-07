import { storage } from "@/firebaseConfig";
import { ref, uploadBytesResumable, UploadTask } from "firebase/storage";


class ImageService {
  uploadImage(uploadPath: string, file: File): UploadTask {
    // Create a reference (folder structure optional)
    const storageRef = ref(storage, uploadPath);

    // Upload the file
    const uploadTask = uploadBytesResumable(storageRef, file);

    return uploadTask;
  }
}

export const imageService = new ImageService();
