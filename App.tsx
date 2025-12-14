import React, { useState, useRef, useEffect } from 'react';
import { Message, Role, ChildProfile } from './types';
import { initializeChat, sendMessageToAI, getAudioContext } from './services/ai';
import ProfileForm from './components/ProfileForm';
import ChatMessage from './components/ChatMessage';

// Simple ID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [viewMode, setViewMode] = useState<'landing' | 'form'>('landing'); // 'landing' = buttons, 'form' = input fields
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Computed active profile
  const activeProfile = profiles.find(p => p.id === activeProfileId) || null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // When active profile changes, re-initialize chat
  useEffect(() => {
    if (activeProfile) {
      initializeChat(activeProfile);
      // Reset messages with a greeting for the specific child
      const initialMessage: Message = {
        id: generateId(),
        role: Role.MODEL,
        text: `你好！我是肖恩老師。關於 **${activeProfile.name} (${activeProfile.age}歲)**，最近有什麼讓我能幫您的嗎？`,
        timestamp: new Date()
      };
      setMessages([initialMessage]);
      setIsSidebarOpen(false); // Close sidebar on selection on mobile
    }
  }, [activeProfileId]);

  const handleCreateProfile = (profileData: Omit<ChildProfile, 'id'>) => {
    const newProfile: ChildProfile = {
      ...profileData,
      id: generateId(),
    };
    
    setProfiles(prev => [...prev, newProfile]);
    setActiveProfileId(newProfile.id);
    setShowAddProfileModal(false);
    setViewMode('landing');
  };

  const handleQuickStart = () => {
    const demoProfile: ChildProfile = {
      id: generateId(),
      name: '小朋友',
      age: 6,
      gender: 'other',
      temperament: '一般'
    };
    setProfiles(prev => [...prev, demoProfile]);
    setActiveProfileId(demoProfile.id);
  };

  const handleSwitchProfile = (id: string) => {
    if (id === activeProfileId) return;
    setActiveProfileId(id);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isLoading || !activeProfile) return;

    // IMPORTANT: Resume audio context on user interaction (click/enter)
    // This allows subsequent auto-play to work without being blocked by browser
    try {
      getAudioContext().resume();
    } catch (err) {
      console.warn("Audio context resume failed", err);
    }

    const userMessage: Message = {
      id: generateId(),
      role: Role.USER,
      text: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const responseText = await sendMessageToAI(userMessage.text);
      
      const aiMessage: Message = {
        id: generateId(),
        role: Role.MODEL,
        text: responseText,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error in chat loop", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (text: string) => {
    setInputText(text);
  };

  // --- Render: Landing Page (No Profiles) ---
  if (profiles.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 bg-[url('https://picsum.photos/1920/1080?blur=5')] bg-cover bg-center relative">
        <div className="absolute inset-0 bg-stone-50/90 backdrop-blur-sm"></div>
        
        {viewMode === 'landing' ? (
          // Option Selection View - Compact Version
          <div className="relative z-10 w-full max-w-md bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-white/50 text-center animate-fade-in-up">
             <div className="mb-6">
                <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg text-white">
                  🌱
                </div>
                <h1 className="text-2xl font-bold text-emerald-900 tracking-tight">肖恩老師</h1>
                <p className="text-stone-600 mt-1 font-medium text-sm">NLP x 心理營養 x 兒童發展</p>
             </div>
             
             <div className="space-y-3">
               <button 
                 onClick={handleQuickStart}
                 className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 group"
               >
                 <span>🚀</span>
                 <div className="text-left">
                   <div className="text-base">立即開始諮詢</div>
                   <div className="text-[10px] font-normal opacity-80">跳過設定，直接對話</div>
                 </div>
                 <svg className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
               </button>

               <button 
                 onClick={() => setViewMode('form')}
                 className="w-full bg-white hover:bg-emerald-50 text-stone-700 font-medium py-3 px-6 rounded-xl border border-stone-200 hover:border-emerald-200 shadow-sm transition-colors flex items-center justify-center gap-2 text-sm"
               >
                 <span>📝</span>
                 建立專屬檔案
               </button>
             </div>
             
             <p className="mt-6 text-xs text-stone-400">
               協助您解決育兒難題，建立親密親子關係
             </p>
          </div>
        ) : (
          // Form View
          <div className="relative z-10 w-full max-w-md animate-fade-in-up">
            <ProfileForm 
              onSave={handleCreateProfile} 
              onCancel={() => setViewMode('landing')}
              isInitial={true} 
            />
          </div>
        )}
      </div>
    );
  }

  // --- Render: Main Chat Interface ---
  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden relative">
      
      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside 
        className={`
          absolute md:relative z-40 h-full w-72 bg-white border-r border-stone-200 shadow-xl md:shadow-none flex flex-col transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-bold text-stone-800 text-lg">我的寶貝</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-stone-400 p-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          <div className="space-y-2">
            {profiles.map(profile => (
              <button
                key={profile.id}
                onClick={() => handleSwitchProfile(profile.id)}
                className={`
                  w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left
                  ${activeProfileId === profile.id 
                    ? 'bg-emerald-50 border-emerald-200 border text-emerald-900 shadow-sm' 
                    : 'hover:bg-stone-50 text-stone-600 border border-transparent'
                  }
                `}
              >
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm
                  ${activeProfileId === profile.id ? 'bg-emerald-200 text-emerald-800' : 'bg-stone-200 text-stone-500'}
                `}>
                  {profile.gender === 'boy' ? '👦' : profile.gender === 'girl' ? '👧' : '👶'}
                </div>
                <div>
                  <div className="font-bold text-sm">{profile.name}</div>
                  <div className="text-xs opacity-70">{profile.age} 歲</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-stone-100">
          <button
            onClick={() => {
              setShowAddProfileModal(true);
              setIsSidebarOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-stone-800 text-white rounded-xl hover:bg-stone-700 transition-colors shadow-md text-sm font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            新增孩子檔案
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full w-full">
        {/* Header */}
        <header className="bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm h-[64px]">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 text-stone-500 hover:bg-stone-100 rounded-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-xl text-emerald-700 shadow-sm border border-emerald-50">
              🌱
            </div>
            <div>
              <h1 className="font-bold text-stone-800 leading-tight">肖恩老師</h1>
              {activeProfile && (
                <p className="text-xs text-stone-500 flex items-center gap-1">
                  正在關注: <span className="font-medium text-emerald-700 bg-emerald-50 px-1.5 rounded-md">{activeProfile.name}</span>
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={() => {
              if (window.confirm('確定要清除當前對話紀錄嗎？')) {
                setMessages([]);
                // Re-trigger greeting
                if (activeProfile) {
                  const initialMessage: Message = {
                    id: generateId(),
                    role: Role.MODEL,
                    text: `(對話已重置)\n\n你好！我是肖恩老師。我們重新開始吧，關於 **${activeProfile.name}**，有什麼我可以幫您的？`,
                    timestamp: new Date()
                  };
                  setMessages([initialMessage]);
                }
              }
            }} 
            className="text-stone-400 hover:text-emerald-600 transition-colors text-xs md:text-sm px-3 py-1.5 rounded-full border border-stone-200 hover:border-emerald-200 hover:bg-emerald-50"
          >
            重置對話
          </button>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto p-4 custom-scrollbar scroll-smooth bg-stone-50">
          <div className="max-w-3xl mx-auto">
            {messages.map((msg, index) => (
              <ChatMessage 
                key={msg.id} 
                message={msg} 
                isLast={index === messages.length - 1}
              />
            ))}
            
            {isLoading && (
              <div className="flex justify-start mb-6 animate-fade-in">
                <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-stone-100 shadow-sm ml-14">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  <span className="text-sm text-stone-400 ml-2">肖恩老師正在思考...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input Area */}
        <footer className="bg-white border-t border-stone-200 p-3 md:p-4 z-20">
          <div className="max-w-3xl mx-auto">
            {/* Quick Prompts - only show when chat is short */}
            {messages.length < 3 && !isLoading && (
              <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-1">
                {['情緒崩潰怎麼辦？', '不肯睡覺', '愛打人', '不專心'].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleQuickPrompt(prompt)}
                    className="whitespace-nowrap px-4 py-1.5 bg-stone-100 text-stone-600 text-xs md:text-sm rounded-full hover:bg-emerald-50 hover:text-emerald-700 transition-colors border border-transparent hover:border-emerald-100"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={activeProfile ? `描述 ${activeProfile.name} 的情況...` : "請輸入..."}
                  className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none h-[52px] max-h-[120px] focus:bg-white transition-all custom-scrollbar text-sm md:text-base"
                  style={{ minHeight: '52px' }}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !inputText.trim()}
                className={`
                  h-[52px] w-[52px] md:w-auto md:px-6 rounded-xl font-medium flex items-center justify-center transition-all flex-shrink-0
                  ${isLoading || !inputText.trim() 
                    ? 'bg-stone-100 text-stone-300 cursor-not-allowed' 
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md active:scale-95'
                  }
                `}
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    <span className="hidden md:inline">發送</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:hidden"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                  </>
                )}
              </button>
            </form>
          </div>
        </footer>
      </div>

      {/* Add Profile Modal */}
      {showAddProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setShowAddProfileModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
            <ProfileForm 
              onSave={handleCreateProfile} 
              onCancel={() => setShowAddProfileModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;