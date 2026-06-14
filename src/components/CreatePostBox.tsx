import React, { useState, useRef, useEffect } from "react";
import { Image, X, Smile, Film, Sparkles, Wand2, RefreshCw, CheckCheck, Languages, BookOpen, Quote } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { PostService } from "../services/post";

// Recreate a File object from saved storage DataURL
function dataURLtoFile(dataurl: string, filename: string): File {
  try {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "";
    const bstr = atob(arr[arr.length - 1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  } catch (e) {
    console.error("Error decoding base64 file", e);
    return new File([], filename);
  }
}

interface PostIdea {
  headline: string;
  draft: string;
  hashtags: string[];
}

interface AICaption {
  caption: string;
  hashtags: string[];
}

export const CreatePostBox: React.FC = () => {
  const { userProfile } = useAuth();
  const [content, setContent] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // AI Assistant States
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiTone, setAiTone] = useState("professional");
  const [aiIdeas, setAiIdeas] = useState<PostIdea[]>([]);
  const [aiCaptions, setAiCaptions] = useState<AICaption[]>([]);
  const [aiResult, setAiResult] = useState("");
  const [aiError, setAiError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore draft content on mount or profile load
  useEffect(() => {
    if (!userProfile) return;
    const txtKey = `fb_draft_content_${userProfile.uid}`;
    const imgKey = `fb_draft_images_${userProfile.uid}`;

    const savedTxt = localStorage.getItem(txtKey);
    if (savedTxt) {
      setContent(savedTxt);
    }

    const savedImgs = localStorage.getItem(imgKey);
    if (savedImgs) {
      try {
        const parsed = JSON.parse(savedImgs) as { name: string; dataUrl: string }[];
        const loadedFiles: File[] = [];
        const loadedPreviews: string[] = [];

        parsed.forEach((item) => {
          if (item.dataUrl) {
            const file = dataURLtoFile(item.dataUrl, item.name);
            loadedFiles.push(file);
            loadedPreviews.push(URL.createObjectURL(file));
          }
        });

        setImages(loadedFiles);
        setImagePreviews(loadedPreviews);
      } catch (err) {
        console.error("Failed parsing draft images from localStorage:", err);
      }
    }
  }, [userProfile]);

  // Synchronize dynamic files list to localStorage (with Base64 conversion)
  const saveImagesToLocalStorage = (filesList: File[]) => {
    if (!userProfile) return;
    const key = `fb_draft_images_${userProfile.uid}`;
    
    if (filesList.length === 0) {
      localStorage.removeItem(key);
      return;
    }

    const promises = filesList.map((file) => {
      return new Promise<{ name: string; dataUrl: string }>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            name: file.name,
            dataUrl: reader.result as string,
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then((serialized) => {
      localStorage.setItem(key, JSON.stringify(serialized));
    });
  };

  const handleContentChange = (val: string) => {
    setContent(val);
    if (userProfile) {
      localStorage.setItem(`fb_draft_content_${userProfile.uid}`, val);
    }
  };

  const handleFiles = (files: FileList) => {
    const validFiles: File[] = [];
    const previews: string[] = [];

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        validFiles.push(file);
        previews.push(URL.createObjectURL(file));
      }
    });

    const nextImages = [...images, ...validFiles];
    setImages(nextImages);
    setImagePreviews((prev) => [...prev, ...previews]);

    saveImagesToLocalStorage(nextImages);
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

    URL.revokeObjectURL(updatedPreviews[index]);

    updatedImages.splice(index, 1);
    updatedPreviews.splice(index, 1);

    setImages(updatedImages);
    setImagePreviews(updatedPreviews);

    saveImagesToLocalStorage(updatedImages);
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

      setContent("");
      setImagePreviews([]);
      setImages([]);
      
      localStorage.removeItem(`fb_draft_content_${userProfile.uid}`);
      localStorage.removeItem(`fb_draft_images_${userProfile.uid}`);
    } catch (err) {
      console.error("Failed standard feed post generation:", err);
    } finally {
      setUploading(false);
    }
  };

  // AI Content Assistant Methods
  const generateIdeas = async () => {
    if (!aiTopic.trim()) {
      setAiError("Please type a topic outline first!");
      return;
    }
    setAiLoading(true);
    setAiError("");
    setAiResult("");
    setAiIdeas([]);
    setAiCaptions([]);
    try {
      const res = await fetch("/api/gemini/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: aiTopic }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiIdeas(data.ideas);
    } catch (err: any) {
      setAiError(err.message || "Failed generating viral thoughts");
    } finally {
      setAiLoading(false);
    }
  };

  const improveDraft = async () => {
    if (!content.trim()) {
      setAiError("Please type a draft in his post text box to improve!");
      return;
    }
    setAiLoading(true);
    setAiError("");
    setAiResult("");
    setAiIdeas([]);
    setAiCaptions([]);
    try {
      const res = await fetch("/api/gemini/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content, tone: aiTone }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      handleContentChange(data.improvedText);
      setAiResult("Draft successfully optimized and written above!");
    } catch (err: any) {
      setAiError(err.message || "Failed rewording text draft");
    } finally {
      setAiLoading(false);
    }
  };

  const generateCaptions = async () => {
    if (!content.trim()) {
      setAiError("Draft content must be typed first so the AI can craft captions!");
      return;
    }
    setAiLoading(true);
    setAiError("");
    setAiResult("");
    setAiIdeas([]);
    setAiCaptions([]);
    try {
      const res = await fetch("/api/gemini/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: content }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiCaptions(data.captions);
    } catch (err: any) {
      setAiError(err.message || "Trouble baking custom tags/captions");
    } finally {
      setAiLoading(false);
    }
  };

  const generalAssist = async (action: "summarize" | "expand" | "translate") => {
    if (!content.trim()) {
      setAiError("Draft content must be loaded first!");
      return;
    }
    setAiLoading(true);
    setAiError("");
    setAiResult("");
    setAiIdeas([]);
    setAiCaptions([]);
    try {
      const res = await fetch("/api/gemini/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content, action }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      handleContentChange(data.result);
      setAiResult(`Draft successfully ${action}d in the feed writerabove!`);
    } catch (err: any) {
      setAiError(err.message || `Failed to perform ${action}`);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-[#242526] rounded-xl p-4 shadow-sm border border-neutral-200 dark:border-neutral-800">
      
      {/* Top Section: Avatar & Input */}
      <div className="flex items-start space-x-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
        <div className="w-10 h-10 rounded-full bg-[#3A3B3C] border border-neutral-200 dark:border-neutral-700 overflow-hidden shrink-0 mt-1">
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
          onChange={(e) => handleContentChange(e.target.value)}
          rows={3}
          className="flex-1 resize-none bg-neutral-100 dark:bg-[#3A3B3C] rounded-xl px-4 py-2.5 text-sm md:text-base text-neutral-900 dark:text-[#E4E6EB] placeholder-neutral-500 dark:placeholder-[#B0B3B8] focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
        />
      </div>

      {/* Drag & Drop Visual Area */}
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

      {/* Expandable AI content assistant container widget */}
      {showAIPanel && (
        <div className="my-3 p-4 bg-[#1877F2]/5 dark:bg-[#1C1D1E]/80 rounded-xl border border-[#1877F2]/20 dark:border-neutral-800 flex flex-col space-y-3 animate-slide-down">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#1877F2]" />
              <span className="text-xs font-bold text-neutral-800 dark:text-[#E4E6EB] tracking-wide uppercase">AI Post Sparkle Engine</span>
            </div>
            
            <button 
              onClick={() => {
                setShowAIPanel(false);
                setAiError("");
                setAiResult("");
                setAiIdeas([]);
                setAiCaptions([]);
              }}
              className="text-[10px] text-neutral-500 hover:text-red-500 p-0.5 px-2 bg-neutral-100 dark:bg-neutral-800 border rounded-md"
            >
              Hide Engine
            </button>
          </div>

          <p className="text-[11px] text-neutral-500">
            Use the secure server-proxied Gemini models to craft fine-tuned outlines, generate viral ideas, reword, summarize, expand or translate drafts.
          </p>

          {/* Action Tabs Grid selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            
            {/* Sector A: Grammar & Rewording */}
            <div className="p-3 bg-white dark:bg-[#242526] rounded-xl border space-y-2 text-xs">
              <span className="font-bold text-neutral-800 dark:text-neutral-100 flex items-center space-x-1">
                <Wand2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Optimize Text Pitch & Tone</span>
              </span>
              <div className="flex space-x-2">
                <select 
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value)}
                  className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 px-2 py-1 rounded-lg flex-1 text-[11px]"
                >
                  <option value="professional">🎓 Professional</option>
                  <option value="witty">😆 Witty & Punchy</option>
                  <option value="energetic">🔥 Energetic</option>
                  <option value="poetic">✨ Poetic & Immersive</option>
                </select>
                <button 
                  onClick={improveDraft}
                  disabled={aiLoading || !content.trim()}
                  className="bg-[#1877F2] text-white px-3 py-1 rounded-lg font-bold hover:bg-[#1565C0] text-[10px] disabled:opacity-40"
                >
                  Improve
                </button>
              </div>
            </div>

            {/* Sector B: Fast ideator */}
            <div className="p-3 bg-white dark:bg-[#242526] rounded-xl border space-y-2 text-xs">
              <span className="font-bold text-neutral-800 dark:text-neutral-100 flex items-center space-x-1">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-500 animate-spin-slow" />
                <span>Get Post Ideas</span>
              </span>
              <div className="flex space-x-2">
                <input 
                  type="text"
                  placeholder="Outline e.g., Nextjs dev tips"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 px-2 py-1 rounded-lg flex-1 text-[11px] focus:outline-none"
                />
                <button 
                  onClick={generateIdeas}
                  disabled={aiLoading || !aiTopic.trim()}
                  className="bg-emerald-500 text-white px-3 py-1 rounded-lg font-bold hover:bg-emerald-600 text-[10px] disabled:opacity-40"
                >
                  Ideate
                </button>
              </div>
            </div>

            {/* Sector C: Helper services buttons */}
            <div className="p-3 bg-white dark:bg-[#242526] rounded-xl border md:col-span-2 space-y-2">
              <span className="font-bold text-[11px] text-neutral-800 dark:text-neutral-100 block">Social Actions</span>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={generateCaptions}
                  disabled={aiLoading || !content.trim()}
                  className="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border hover:bg-neutral-100 rounded-lg text-[10px] font-bold text-neutral-700 dark:text-neutral-200 flex items-center space-x-1 shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  <Quote className="w-3 h-3 text-sky-500" />
                  <span>Suggest Captions</span>
                </button>
                <button 
                  onClick={() => generalAssist("expand")}
                  disabled={aiLoading || !content.trim()}
                  className="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border hover:bg-neutral-100 rounded-lg text-[10px] font-bold text-neutral-700 dark:text-neutral-200 flex items-center space-x-1 shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  <BookOpen className="w-3 h-3 text-purple-500" />
                  <span>Rich Expansion</span>
                </button>
                <button 
                  onClick={() => generalAssist("summarize")}
                  disabled={aiLoading || !content.trim()}
                  className="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border hover:bg-neutral-100 rounded-lg text-[10px] font-bold text-neutral-700 dark:text-neutral-200 flex items-center space-x-1 shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  <CheckCheck className="w-3 h-3 text-amber-500" />
                  <span>Summarize Draft</span>
                </button>
                <button 
                  onClick={() => generalAssist("translate")}
                  disabled={aiLoading || !content.trim()}
                  className="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border hover:bg-neutral-100 rounded-lg text-[10px] font-bold text-neutral-700 dark:text-neutral-200 flex items-center space-x-1 shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  <Languages className="w-3 h-3 text-indigo-500" />
                  <span>Translate to Spanish</span>
                </button>
              </div>
            </div>

          </div>

          {/* AI Loader feedback inline indicator */}
          {aiLoading && (
            <div className="flex items-center space-x-2 text-xs text-neutral-500 py-1 font-semibold animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1877F2]" />
              <span>Gemini is brewing high-impact words... Please stand by</span>
            </div>
          )}

          {/* AI Error display */}
          {aiError && (
            <div className="text-xs text-red-500 bg-red-100/50 outline outline-red-200 p-2 rounded-lg font-semibold select-none">
              ⚠️ {aiError}
            </div>
          )}

          {/* AI Generic success statement */}
          {aiResult && (
            <div className="text-xs text-emerald-600 bg-emerald-500/5 dark:text-[#39FF14] outline border-emerald-500/20 p-2 rounded-lg font-semibold">
              ✓ {aiResult}
            </div>
          )}

          {/* AI Generated ideas suggestions carousel list */}
          {aiIdeas.length > 0 && (
            <div className="space-y-2 border-t pt-2">
              <span className="text-[10px] font-extrabold text-neutral-400 block uppercase">Generated ideas (Click to use list item)</span>
              <div className="grid grid-cols-1 gap-2">
                {aiIdeas.map((idea, idx) => (
                  <button 
                    key={idx}
                    onClick={() => {
                      const complete = `${idea.headline}\n\n${idea.draft}\n\n${idea.hashtags.map(t => `#${t}`).join(" ")}`;
                      handleContentChange(complete);
                      setAiResult("Idea loaded into drafts!");
                      setAiIdeas([]);
                    }}
                    type="button"
                    className="w-full text-left bg-white dark:bg-[#242526] p-3 rounded-xl border text-xs leading-relaxed hover:border-[#1877F2] transition cursor-pointer"
                  >
                    <strong className="block text-neutral-900 dark:text-neutral-100 font-extrabold mb-1">💡 {idea.headline}</strong>
                    <p className="text-neutral-600 dark:text-neutral-300 italic truncate max-w-full">{idea.draft}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {idea.hashtags.map(t => (
                        <span key={t} className="text-[9px] bg-sky-500/10 text-sky-500 font-semibold px-1 rounded">#{t}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI Generated Captions suggestions list */}
          {aiCaptions.length > 0 && (
            <div className="space-y-2 border-t pt-2">
              <span className="text-[10px] font-extrabold text-neutral-400 block uppercase">Suggested caption variants (Click to append variant)</span>
              <div className="grid grid-cols-1 gap-2">
                {aiCaptions.map((cap, idx) => (
                  <button 
                    key={idx}
                    onClick={() => {
                      const combined = `${content}\n\n${cap.caption} ${cap.hashtags.map(t => `#${t}`).join(" ")}`;
                      handleContentChange(combined);
                      setAiResult("Caption Variant successfully appended to drafts above!");
                      setAiCaptions([]);
                    }}
                    type="button"
                    className="w-full text-left bg-white dark:bg-[#242526] p-3 rounded-xl border text-xs leading-relaxed hover:border-[#1877F2] transition cursor-pointer"
                  >
                    <strong className="block text-neutral-800 dark:text-neutral-200">Variant #{idx + 1}</strong>
                    <p className="text-neutral-600 dark:text-neutral-300 italic line-clamp-2 mt-1">{cap.caption}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {cap.hashtags.map(t => (
                        <span key={t} className="text-[9px] bg-indigo-500/10 text-indigo-500 font-bold px-1 rounded">#{t}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Attachment Tools footer bar */}
      <div className="flex items-center justify-between pt-3">
        <div className="flex items-center space-x-1 sm:space-x-2">
          
          {/* Photos Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#3A3B3C] text-emerald-500 dark:text-emerald-400 transition cursor-pointer"
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

          {/* AI content expansion button */}
          <button
            type="button"
            onClick={() => setShowAIPanel(!showAIPanel)}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl transition duration-150 cursor-pointer ${
              showAIPanel 
                ? "bg-[#1877F2]/10 text-[#1877F2] border border-[#1877F2]/20" 
                : "hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-[#1877F2] dark:text-sky-400 font-bold"
            }`}
          >
            <Sparkles className="w-5 h-5 shrink-0 animate-pulse text-sky-500" />
            <span className="inline text-xs font-extrabold">
              AI Assistant
            </span>
          </button>
        </div>

        {/* Share Button */}
        <button
          onClick={handleSubmit}
          disabled={uploading || (!content.trim() && images.length === 0)}
          className="px-6 h-9 bg-[#1877F2] hover:bg-[#1565C0] disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow transition cursor-pointer"
        >
          {uploading ? "Publishing..." : "Post"}
        </button>
      </div>
    </div>
  );
};
