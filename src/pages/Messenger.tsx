import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, Image, Sparkles, Smile, MessageCircle, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ChatService } from "../services/chat";
import { UserService } from "../services/user";
import { ChatRoom, Message, UserProfile } from "../types";

export const Messenger: React.FC = () => {
  const { userProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const directMessageTarget = searchParams.get("user");

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activePartner, setActivePartner] = useState<UserProfile | null>(null);

  // Message Send Fields
  const [draftText, setDraftText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Refs for auto-scroll and typing debounces
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load rooms and users
  useEffect(() => {
    if (!userProfile) return;

    // Load active partner search options
    UserService.getAllUsers().then((list) => {
      setAllUsers(list.filter((u) => u.uid !== userProfile.uid));
    });

    const unsub = ChatService.listenToChatRooms(userProfile.uid, (roomsList) => {
      setRooms(roomsList);
    });

    return unsub;
  }, [userProfile]);

  // Handle direct messaging redirect query
  useEffect(() => {
    if (directMessageTarget && userProfile && allUsers.length > 0) {
      const handleQueryTrigger = async () => {
        const partner = allUsers.find((u) => u.uid === directMessageTarget);
        if (partner) {
          const roomId = await ChatService.getOrCreateChatRoom(userProfile.uid, partner.uid);
          setActiveRoomId(roomId);
          setActivePartner(partner);
        }
      };
      handleQueryTrigger();
    }
  }, [directMessageTarget, allUsers, userProfile]);

  // Handle active room messages subscription
  useEffect(() => {
    if (!activeRoomId || !userProfile) {
      setMessages([]);
      return;
    }

    // Mark unread messages as seen
    ChatService.markMessagesSeen(activeRoomId, userProfile.uid);

    const unsub = ChatService.listenToMessages(activeRoomId, (msgs) => {
      setMessages(msgs);
    });

    return unsub;
  }, [activeRoomId, userProfile]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectRoom = (room: ChatRoom) => {
    if (!userProfile) return;
    const partnerId = room.participants.find((p) => p !== userProfile.uid);
    const partner = allUsers.find((u) => u.uid === partnerId);
    if (partner) {
      setActiveRoomId(room.roomId);
      setActivePartner(partner);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  // Typing debouncer triggers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraftText(e.target.value);
    if (!activeRoomId || !userProfile) return;

    // Trigger typing state to true
    ChatService.setTypingStatus(activeRoomId, userProfile.uid, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      ChatService.setTypingStatus(activeRoomId, userProfile.uid, false);
    }, 1500);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoomId || !userProfile) return;
    if (!draftText.trim() && !imageFile) return;

    setSending(true);
    const textToSend = draftText;
    const fileToUpload = imageFile;

    setDraftText("");
    clearImage();

    try {
      await ChatService.sendMessage(activeRoomId, userProfile.uid, textToSend, fileToUpload || undefined);
    } catch (err) {
      console.error("Standard Chat Send Issue:", err);
    } finally {
      setSending(false);
    }
  };

  // Helper to map room partner data
  const getRoomMeta = (room: ChatRoom) => {
    if (!userProfile) return { name: "", avatar: "", isTyping: false };
    const pId = room.participants.find((p) => p !== userProfile.uid);
    const pProfile = allUsers.find((u) => u.uid === pId);
    const typingState = room.typing && pId ? room.typing[pId] : false;

    return {
      uid: pId || "",
      name: pProfile?.fullName || "Facebook User",
      avatar: pProfile?.profilePicture || "",
      isTyping: typingState,
    };
  };

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] flex bg-neutral-100 dark:bg-[#18191A] overflow-hidden">
      
      {/* Conversations Left Rail Sidebar */}
      <div className={`w-full md:w-80 border-r border-neutral-200 dark:border-neutral-800 shrink-0 flex flex-col bg-white dark:bg-[#242526] h-full ${
        activeRoomId ? "hidden md:flex" : "flex"
      }`}>
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 select-none">
          <h2 className="text-xl font-extrabold text-[#1877F2]">Chats</h2>
        </div>

        {/* Existing Rooms List */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 p-2 space-y-1">
          {rooms.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <MessageCircle className="w-10 h-10 mx-auto text-neutral-300" />
              <p className="text-xs text-neutral-500">No active discussions found. Open suggestions in sidebar contacts.</p>
            </div>
          ) : (
            rooms.map((room) => {
              const meta = getRoomMeta(room);
              return (
                <button
                  key={room.roomId}
                  onClick={() => handleSelectRoom(room)}
                  className={`w-full p-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#3A3B3C] text-left transition flex items-center space-x-3 gap-1 ${
                    activeRoomId === room.roomId ? "bg-neutral-100 dark:bg-[#3A3B3C]" : ""
                  }`}
                >
                  <div className="relative shrink-0">
                    {meta.avatar ? (
                      <img src={meta.avatar} alt={meta.name} className="w-11 h-11 rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-neutral-300 dark:bg-neutral-800 flex items-center justify-center font-bold text-neutral-600 dark:text-[#E4E6EB]">
                        {meta.name[0].toUpperCase()}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-[#242526]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
                      {meta.name}
                    </div>
                    <p className={`text-xs truncate ${meta.isTyping ? "text-green-500 font-semibold" : "text-neutral-500"}`}>
                      {meta.isTyping ? "Typing..." : room.lastMessage || "Start standard chat"}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main chat window Area */}
      <div className={`flex-1 flex flex-col h-full bg-neutral-50 dark:bg-[#18191A] relative ${
        !activeRoomId ? "hidden md:flex justify-center items-center text-center p-6 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900" : "flex"
      }`}>
        
        {/* Guarding: Select a room state screen */}
        {!activeRoomId ? (
          <div className="space-y-4 max-w-sm">
            <div className="w-16 h-16 bg-[#1877F2]/10 dark:bg-[#1877F2]/20 rounded-full flex items-center justify-center mx-auto text-[#1877F2] shadow-xl">
              <MessageCircle className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-xl font-sans text-neutral-950 dark:text-[#E4E6EB]">
              Start a Conversation
            </h3>
            <p className="text-sm text-[#B0B3B8] leading-relaxed">
              Open suggestions in the Sidebar Right Contacts to create direct real-time communication rooms.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#18191A]">
            
            {/* Active Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 shadow-sm shrink-0 bg-white dark:bg-[#242526]">
              <div className="flex items-center space-x-3">
                {/* Back button on mobile */}
                <button onClick={() => setActiveRoomId(null)} className="md:hidden p-1 bg-neutral-100 dark:bg-[#3A3B3C] hover:bg-neutral-200 rounded-full text-neutral-600 mr-1.5 shrink-0">
                  <X className="w-4 h-4" />
                </button>

                <div className="relative shrink-0">
                  {activePartner?.profilePicture ? (
                    <img src={activePartner.profilePicture} alt={activePartner.fullName} className="w-9 h-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-[#3a3b3c] flex items-center justify-center font-bold text-neutral-600 dark:text-[#E4E6EB]">
                      {activePartner?.fullName[0] || "U"}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-[#242526]" />
                </div>

                <div>
                  <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                    {activePartner?.fullName}
                  </div>
                  <span className="text-[10px] text-green-500 font-semibold uppercase tracking-wider block">
                    Active Online
                  </span>
                </div>
              </div>
            </div>

            {/* Message Bubble Feed Timeline */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 bg-neutral-50 dark:bg-[#18191A]">
              {messages.length === 0 ? (
                <div className="text-center py-24 select-none">
                  <p className="text-sm text-neutral-400">Say hello! Direct messaging has been initialized.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMyMsg = msg.senderId === userProfile?.uid;
                  return (
                    <div key={msg.messageId} className={`flex items-start gap-2.5 ${isMyMsg ? "justify-end" : "justify-start"}`}>
                      {!isMyMsg && (
                        <div className="w-7 h-7 rounded-full bg-neutral-300 overflow-hidden shrink-0">
                          {activePartner?.profilePicture && (
                            <img src={activePartner.profilePicture} alt={activePartner.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          )}
                        </div>
                      )}

                      <div className="max-w-[70%] space-y-1">
                        {/* Bubble */}
                        <div className={`p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                          isMyMsg ? "bg-[#1877F2] text-white rounded-tr-none shadow" : "bg-white dark:bg-[#242526] text-neutral-950 dark:text-neutral-100 rounded-tl-none border border-neutral-100 dark:border-neutral-800 shadow-sm"
                        }`}>
                          {msg.image && (
                            <img src={msg.image} alt="shared file preview" className="rounded-lg max-h-48 mb-2 w-full object-cover border border-neutral-200 dark:border-neutral-800" referrerPolicy="no-referrer" />
                          )}
                          <p>{msg.text}</p>
                        </div>
                        {/* Timestamp */}
                        <span className={`text-[9px] text-neutral-400 block ${isMyMsg ? "text-right mr-1.5" : "ml-1.5"}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              {/* Typing Indicators element */}
              {rooms.find(r => r.roomId === activeRoomId) && getRoomMeta(rooms.find(r => r.roomId === activeRoomId)!).isTyping && (
                <div className="flex items-center space-x-1 ml-10 text-[11px] text-green-500 font-semibold animate-pulse select-none">
                  <Sparkles className="w-3.5 h-3.5 mr-0.5" />
                  <span>{activePartner?.fullName.split(" ")[0]} is typing...</span>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* Input Composer Panel */}
            <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 shrink-0 bg-white dark:bg-[#242526]">
              {imagePreview && (
                <div className="mb-3.5 p-2 bg-neutral-50 dark:bg-[#1C1D1E] rounded-xl border border-neutral-200 dark:border-neutral-800 relative inline-block">
                  <img src={imagePreview} alt="attachment thumb preview" className="w-24 h-24 rounded-lg object-cover" />
                  <button onClick={clearImage} className="absolute -top-1.5 -right-1.5 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSend} className="flex items-center space-x-2.5">
                <button type="button" onClick={() => document.getElementById("chat-image")?.click()} className="p-2.5 bg-neutral-100 dark:bg-[#3A3B3C] hover:bg-neutral-200 text-emerald-500 dark:text-emerald-400 rounded-full transition shadow-sm shrink-0">
                  <Image className="w-5 h-5" />
                </button>
                <input id="chat-image" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

                <input
                  type="text"
                  placeholder="Aa"
                  value={draftText}
                  onChange={handleInputChange}
                  className="flex-1 h-10 px-4 bg-neutral-100 dark:bg-[#3A3B3C] rounded-full text-sm text-neutral-950 dark:text-white placeholder-neutral-400 focus:outline-none"
                />

                <button type="submit" disabled={sending || (!draftText.trim() && !imageFile)} className="p-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white rounded-full transition shadow disabled:opacity-50 shrink-0">
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
