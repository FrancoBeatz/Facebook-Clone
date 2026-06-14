import React, { useState, useRef } from "react";
import { Image, X, Smile, MapPin, Film, Calendar } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { PostService } from "../services/post";

export const CreatePostBox: React.FC = () => {
  const { userProfile } = useAuth();
  const [content, setContent] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList) => {
    const validFiles: File[] = [];
    const previews: string[] = [];

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        validFiles.push(file);
        previews.push(URL.createObjectURL(file));
      }
    });

    setImages((prev) => [...prev, ...validFiles]);
    setImagePreviews((prev) => [...prev, ...previews]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeImage = (index: number) => {
    const updatedImages = [...images];
    const updatedPreviews = [...imagePreviews];

    // Revoke object URL to avoid memory leaks
    URL.revokeObjectURL(updatedPreviews[index]);

    updatedImages.splice(index, 1);
    updatedPreviews.splice(index, 1);

    setImages(updatedImages);
    setImagePreviews(updatedPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0) return;
    if (!userProfile) return;

    setUploading(true);
    try {
      await PostService.createPost(
        userProfile.uid,
        userProfile.fullName,
        userProfile.profilePicture || "",
        content,
        images
      );

      // Clean state
      setContent("");
      setImagePreviews([]);
      setImages([]);
    } catch (err) {
      console.error("Failed standard feed post generation:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-[#242526] rounded-xl p-4 shadow-sm border border-neutral-200 dark:border-neutral-800">
      
      {/* Top Section: Avatar & Input */}
      <div className="flex items-center space-x-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
        <div className="w-10 h-10 rounded-full bg-[#3A3B3C] border border-neutral-200 dark:border-neutral-700 overflow-hidden shrink-0">
          {userProfile?.profilePicture ? (
            <img
              src={userProfile.profilePicture}
              alt={userProfile.fullName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-neutral-100 uppercase bg-[#1877F2]">
              {userProfile?.fullName[0] || "U"}
            </div>
          )}
        </div>

        <textarea
          placeholder={`What's on your mind, ${userProfile?.fullName.split(" ")[0]}?`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          className="flex-1 resize-none bg-neutral-100 dark:bg-[#3A3B3C] rounded-xl px-4 py-2.5 text-sm md:text-base text-neutral-900 dark:text-[#E4E6EB] placeholder-neutral-500 dark:placeholder-[#B0B3B8] focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
        />
      </div>

      {/* Drag & Drop Visual Area if images loaded or dragging */}
      {(imagePreviews.length > 0 || isDragOver) && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`my-3 p-3 border-2 border-dashed rounded-xl transition ${
            isDragOver
              ? "border-[#1877F2] bg-blue-50/20 dark:bg-blue-950/10"
              : "border-neutral-200 dark:border-neutral-800"
          }`}
        >
          <div className="flex flex-wrap gap-2">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border border-neutral-300 dark:border-neutral-700 shadow-sm animate-fade-in shrink-0">
                <img src={preview} alt="upload preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 p-0.5 bg-black/60 hover:bg-black/90 text-white rounded-full transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {isDragOver && (
              <div className="w-20 h-20 border border-dashed border-neutral-400 dark:border-neutral-600 rounded-lg flex items-center justify-center text-xs text-neutral-500">
                Drop here
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attachment Tools */}
      <div className="flex items-center justify-between pt-3">
        <div className="flex items-center space-x-1 sm:space-x-2">
          
          {/* Photos Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#3A3B3C] text-emerald-500 dark:text-emerald-400 transition"
          >
            <Image className="w-5 h-5 shrink-0" />
            <span className="hidden sm:inline text-xs font-semibold text-neutral-600 dark:text-[#B0B3B8]">
              Photo
            </span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept="image/*"
            className="hidden"
          />

          <button
            type="button"
            className="flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#3A3B3C] text-red-500 dark:text-red-400 transition cursor-not-allowed opacity-50"
          >
            <Film className="w-5 h-5 shrink-0" />
            <span className="hidden sm:inline text-xs font-semibold text-neutral-600 dark:text-[#B0B3B8]">
              Video
            </span>
          </button>

          <button
            type="button"
            className="flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#3A3B3C] text-amber-500 dark:text-amber-400 transition cursor-not-allowed opacity-50"
          >
            <Smile className="w-5 h-5 shrink-0" />
            <span className="hidden sm:inline text-xs font-semibold text-neutral-600 dark:text-[#B0B3B8]">
              Feeling
            </span>
          </button>
        </div>

        {/* Share Button */}
        <button
          onClick={handleSubmit}
          disabled={uploading || (!content.trim() && images.length === 0)}
          className="px-6 h-9 bg-[#1877F2] hover:bg-[#1565C0] disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow transition"
        >
          {uploading ? "Publishing..." : "Post"}
        </button>
      </div>
    </div>
  );
};
