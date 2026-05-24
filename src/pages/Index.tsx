import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";

interface Chat {
  id: string;
  name: string;
  messages: Message[];
  generatedCode: string;
  createdAt: Date;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const DEMO_CODE = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>NeonForge Demo</title>
<style>
  body { margin:0; background:#080a0e; display:flex; align-items:center; justify-content:center; height:100vh; font-family:monospace; overflow:hidden; flex-direction:column; gap:20px; }
  canvas { display:block; }
  .label { color:#00e676; font-size:12px; text-align:center; text-shadow:0 0 20px rgba(0,230,118,0.8); }
  .sub { color:#3a4060; font-size:10px; text-align:center; }
</style>
</head>
<body>
<canvas id="c" width="280" height="200"></canvas>
<div class="label">✦ NeonForge AI ✦</div>
<div class="sub">Опишите задачу в чате для генерации</div>
<script>
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let t = 0;
function draw() {
  ctx.fillStyle = 'rgba(8,10,14,0.15)';
  ctx.fillRect(0,0,280,200);
  ctx.save(); ctx.translate(140,100);
  for(let i = 0; i < 8; i++){
    const angle = (i/8)*Math.PI*2 + t;
    const x = Math.cos(angle)*70;
    const y = Math.sin(angle)*50;
    const hue = (i/8*360 + t*40) % 360;
    ctx.beginPath(); ctx.arc(x,y,5+Math.sin(t*2+i)*2,0,Math.PI*2);
    ctx.fillStyle = 'hsl('+hue+',100%,65%)';
    ctx.shadowBlur=18; ctx.shadowColor='hsl('+hue+',100%,65%)';
    ctx.fill();
    if(i>0){
      const pa = ((i-1)/8)*Math.PI*2+t;
      ctx.beginPath(); ctx.moveTo(Math.cos(pa)*70,Math.sin(pa)*50); ctx.lineTo(x,y);
      ctx.strokeStyle='hsla('+hue+',100%,65%,0.25)'; ctx.lineWidth=1; ctx.shadowBlur=8; ctx.stroke();
    }
  }
  ctx.restore();
  t += 0.014;
  requestAnimationFrame(draw);
}
draw();
</script>
</body>
</html>`;

const EXAMPLE_PROMPTS = [
  "Создай 3D игру — космический корабль уворачивается от астероидов",
  "Сделай лендинг для IT-стартапа с анимированными секциями",
  "Создай игру Snake с неоновой графикой в стиле ретро",
  "Сделай интерактивную визуализацию частиц с управлением мышью",
];

function generateId() {
  return Math.random().toString(36).slice(2);
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}

export default function Index() {
  const [chats, setChats] = useState<Chat[]>([
    {
      id: "1",
      name: "Новый проект",
      messages: [],
      generatedCode: DEMO_CODE,
      createdAt: new Date(),
    },
  ]);
  const [activeChatId, setActiveChatId] = useState("1");
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [contextMenu, setContextMenu] = useState<{ chatId: string; x: number; y: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [previewKey, setPreviewKey] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const activeChat = chats.find((c) => c.id === activeChatId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages]);

  useEffect(() => {
    if (editingChatId) editInputRef.current?.focus();
  }, [editingChatId]);

  useEffect(() => {
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  const createChat = () => {
    const id = generateId();
    setChats((prev) => [
      { id, name: `Проект ${prev.length + 1}`, messages: [], generatedCode: DEMO_CODE, createdAt: new Date() },
      ...prev,
    ]);
    setActiveChatId(id);
  };

  const deleteChat = (id: string) => {
    setChats((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      if (activeChatId === id && updated.length > 0) setActiveChatId(updated[0].id);
      return updated.length > 0 ? updated : prev;
    });
    setContextMenu(null);
  };

  const startRename = (chat: Chat) => {
    setEditingChatId(chat.id);
    setEditingName(chat.name);
    setContextMenu(null);
  };

  const saveRename = () => {
    if (!editingName.trim()) return;
    setChats((prev) => prev.map((c) => (c.id === editingChatId ? { ...c, name: editingName.trim() } : c)));
    setEditingChatId(null);
  };

  const sendMessage = async () => {
    if (!input.trim() || isGenerating || !activeChat) return;
    const userInput = input.trim();
    const userMsg: Message = { id: generateId(), role: "user", content: userInput, timestamp: new Date() };
    setInput("");
    setIsGenerating(true);
    setChats((prev) => prev.map((c) => (c.id === activeChatId ? { ...c, messages: [...c.messages, userMsg] } : c)));

    await new Promise((r) => setTimeout(r, 1800));

    const aiMsg: Message = {
      id: generateId(),
      role: "assistant",
      content: `Готово! Сгенерировал код по вашему запросу: «${userInput}». Превью обновлено справа — можете скопировать или скачать HTML-файл.`,
      timestamp: new Date(),
    };
    const newCode = generateMockCode(userInput);

    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? {
              ...c,
              name: c.messages.length === 0 ? userInput.slice(0, 28) + (userInput.length > 28 ? "…" : "") : c.name,
              messages: [...c.messages, aiMsg],
              generatedCode: newCode,
            }
          : c
      )
    );
    setIsGenerating(false);
    setPreviewKey((k) => k + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyCode = async () => {
    if (!activeChat) return;
    await navigator.clipboard.writeText(activeChat.generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCode = () => {
    if (!activeChat) return;
    const blob = new Blob([activeChat.generatedCode], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeChat.name.replace(/\s+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openContextMenu = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ chatId, x: e.clientX, y: e.clientY });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#080a0e] font-golos">
      {/* ── SIDEBAR ── */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r border-[#1e2332] bg-[#080a0e]">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-[#1e2332] flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#00e676] flex items-center justify-center flex-shrink-0">
            <span className="text-[#080a0e] text-[10px] font-bold font-mono leading-none">NF</span>
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">NeonForge</div>
            <div className="text-[10px] text-[#00e676] font-mono">AI · HTML5 · 3D</div>
          </div>
        </div>

        {/* New chat */}
        <div className="px-3 py-3 border-b border-[#1e2332]">
          <button
            onClick={createChat}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-[#00e676] hover:bg-[#00c853] text-[#080a0e] text-xs font-bold transition-all duration-200 hover:shadow-[0_0_20px_rgba(0,230,118,0.35)]"
          >
            <Icon name="Plus" size={14} />
            Новый чат
          </button>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          <div className="text-[10px] font-mono text-[#3a4060] uppercase tracking-widest px-2 py-1">
            Проекты ({chats.length})
          </div>
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => { setActiveChatId(chat.id); setContextMenu(null); }}
              onContextMenu={(e) => openContextMenu(e, chat.id)}
              className={`group relative flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-all duration-150 ${
                activeChatId === chat.id
                  ? "bg-[#0d1a12] border border-[#00e676]/25 text-white"
                  : "hover:bg-[#0d0f14] text-[#8899aa] border border-transparent"
              }`}
            >
              <Icon
                name="FileCode"
                size={13}
                className={activeChatId === chat.id ? "text-[#00e676] flex-shrink-0" : "text-[#3a4060] flex-shrink-0"}
              />
              {editingChatId === chat.id ? (
                <input
                  ref={editInputRef}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={saveRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRename();
                    if (e.key === "Escape") setEditingChatId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-transparent text-white text-xs font-mono outline-none border-b border-[#00e676] min-w-0"
                />
              ) : (
                <span className="flex-1 text-xs truncate font-mono">{chat.name}</span>
              )}
              <button
                onClick={(e) => openContextMenu(e, chat.id)}
                className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
              >
                <Icon name="MoreHorizontal" size={13} />
              </button>
            </div>
          ))}
        </div>

        {/* Status */}
        <div className="px-3 py-3 border-t border-[#1e2332]">
          <div className="flex items-center gap-2 text-[10px] font-mono text-[#3a4060]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00e676] pulse-dot" />
            AI готов к работе
          </div>
        </div>
      </aside>

      {/* ── CHAT ── */}
      <div className="flex flex-col border-r border-[#1e2332] bg-[#0a0c10]" style={{ width: "420px", flexShrink: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1e2332] flex-shrink-0">
          <Icon name="MessageSquare" size={14} className="text-[#00e676]" />
          <span className="text-sm font-semibold text-white truncate flex-1">{activeChat?.name || "—"}</span>
          <span className="text-[10px] font-mono text-[#3a4060]">{activeChat?.messages.length || 0} сообщ.</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 grid-bg">
          {activeChat?.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-5 animate-fade-in">
              <div className="text-center">
                <div className="w-11 h-11 rounded-xl bg-[#0d1a12] border border-[#00e676]/20 flex items-center justify-center mx-auto mb-3">
                  <Icon name="Sparkles" size={20} className="text-[#00e676]" />
                </div>
                <p className="text-[#8899aa] text-xs font-mono mb-1">Что создадим?</p>
                <p className="text-[#3a4060] text-[11px]">Опишите сайт или игру на русском</p>
              </div>
              <div className="w-full space-y-1.5">
                {EXAMPLE_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(p)}
                    className="w-full text-left px-3 py-2 rounded-md bg-[#0d0f14] border border-[#1e2332] hover:border-[#00e676]/35 text-[#8899aa] hover:text-white text-[11px] font-mono transition-all duration-150 hover:bg-[#0d1a12]"
                  >
                    <span className="text-[#00e676] mr-2">›</span>{p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeChat?.messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2.5 msg-in ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-[10px] font-bold font-mono ${
                  msg.role === "assistant"
                    ? "bg-[#0d1a12] border border-[#00e676]/30 text-[#00e676]"
                    : "bg-[#1e2332] text-[#8899aa]"
                }`}
              >
                {msg.role === "assistant" ? "AI" : "Я"}
              </div>
              <div
                className={`flex-1 rounded-lg px-3 py-2 ${
                  msg.role === "assistant"
                    ? "bg-[#0d0f14] border border-[#1e2332] text-[#c8d8e8]"
                    : "bg-[#0d1a12] border border-[#00e676]/15 text-white"
                }`}
              >
                <p className="text-xs font-mono leading-relaxed">{msg.content}</p>
                <div className="text-[9px] text-[#3a4060] mt-1 font-mono">{formatTime(msg.timestamp)}</div>
              </div>
            </div>
          ))}

          {isGenerating && (
            <div className="flex gap-2.5 msg-in">
              <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 bg-[#0d1a12] border border-[#00e676]/30 text-[#00e676] text-[10px] font-bold font-mono">AI</div>
              <div className="bg-[#0d0f14] border border-[#1e2332] rounded-lg px-4 py-3 flex items-center gap-1.5">
                <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-[#00e676]" />
                <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-[#00e676]" />
                <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-[#00e676]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-3 border-t border-[#1e2332] flex-shrink-0">
          <div className={`flex gap-2 items-end bg-[#0d0f14] border rounded-lg px-3 py-2 transition-all duration-200 focus-within:border-[#00e676]/40 focus-within:shadow-[0_0_0_1px_rgba(0,230,118,0.08)] ${isGenerating ? "border-[#1e2332]" : "border-[#1e2332]"}`}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Опишите что создать..."
              disabled={isGenerating}
              rows={1}
              className="flex-1 bg-transparent text-white text-xs font-mono resize-none outline-none placeholder-[#3a4060] max-h-28"
              style={{ lineHeight: "1.5", minHeight: "20px" }}
              onInput={(e) => {
                const el = e.target as HTMLTextAreaElement;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 112) + "px";
              }}
            />
            <button
              onClick={sendMessage}
              disabled={isGenerating || !input.trim()}
              className="flex-shrink-0 w-7 h-7 rounded-md bg-[#00e676] disabled:bg-[#1e2332] disabled:text-[#3a4060] text-[#080a0e] flex items-center justify-center transition-all duration-200 hover:bg-[#00c853] disabled:cursor-not-allowed"
            >
              <Icon name="ArrowUp" size={13} />
            </button>
          </div>
          <div className="text-[9px] text-[#3a4060] font-mono mt-1.5 px-1">Enter — отправить · Shift+Enter — новая строка</div>
        </div>
      </div>

      {/* ── PREVIEW ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#080a0e]">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1e2332] bg-[#0a0c10] flex-shrink-0">
          <div className="flex gap-0.5 bg-[#0d0f14] border border-[#1e2332] rounded-md p-0.5">
            {(["preview", "code"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-mono transition-all duration-150 ${
                  activeTab === tab ? "bg-[#00e676] text-[#080a0e] font-bold" : "text-[#8899aa] hover:text-white"
                }`}
              >
                <Icon name={tab === "preview" ? "Play" : "Code"} size={10} />
                {tab === "preview" ? "Превью" : "Код"}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setPreviewKey((k) => k + 1)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#1e2332] hover:border-[#00e676]/35 text-[#8899aa] hover:text-white text-[11px] font-mono transition-all duration-150 bg-[#0d0f14]"
            >
              <Icon name="RefreshCw" size={11} />
            </button>
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#1e2332] hover:border-[#00e676]/35 text-[#8899aa] hover:text-white text-[11px] font-mono transition-all duration-150 bg-[#0d0f14]"
            >
              <Icon name={copied ? "Check" : "Copy"} size={11} className={copied ? "text-[#00e676]" : ""} />
              {copied ? "Скопировано!" : "Копировать"}
            </button>
            <button
              onClick={downloadCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#00e676] hover:bg-[#00c853] text-[#080a0e] text-[11px] font-mono font-bold transition-all duration-200 hover:shadow-[0_0_16px_rgba(0,230,118,0.3)]"
            >
              <Icon name="Download" size={11} />
              Скачать HTML
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
          {activeTab === "preview" ? (
            <iframe
              key={previewKey}
              srcDoc={activeChat?.generatedCode || ""}
              className="w-full h-full"
              sandbox="allow-scripts allow-same-origin"
              title="preview"
            />
          ) : (
            <div className="w-full h-full overflow-auto bg-[#080a0e]">
              <pre className="p-5 text-[11px] font-mono text-[#8899aa] leading-relaxed">
                <code>{activeChat?.generatedCode || ""}</code>
              </pre>
            </div>
          )}

          {/* Live badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-[#080a0e]/90 border border-[#1e2332] rounded-md px-2 py-1 backdrop-blur-sm pointer-events-none">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00e676] pulse-dot" />
            <span className="text-[9px] font-mono text-[#8899aa]">live</span>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="context-menu fixed z-50 bg-[#0d0f14] border border-[#1e2332] rounded-lg shadow-2xl py-1 min-w-[148px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { const c = chats.find((ch) => ch.id === contextMenu.chatId); if (c) startRename(c); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-mono text-[#c8d8e8] hover:bg-[#1e2332] transition-colors"
          >
            <Icon name="Pencil" size={12} className="text-[#00e676]" />
            Переименовать
          </button>
          <div className="h-px bg-[#1e2332] mx-2" />
          <button
            onClick={() => deleteChat(contextMenu.chatId)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-mono text-[#ff5555] hover:bg-[#150808] transition-colors"
          >
            <Icon name="Trash2" size={12} />
            Удалить чат
          </button>
        </div>
      )}
    </div>
  );
}

function generateMockCode(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes("snake") || lower.includes("змейк")) return getSnakeCode();
  if (lower.includes("3d") || lower.includes("игр") || lower.includes("астероид") || lower.includes("корабл")) return get3DCode();
  if (lower.includes("частиц") || lower.includes("particle")) return getParticlesCode();
  if (lower.includes("лендинг") || lower.includes("сайт") || lower.includes("страниц")) return getLandingCode(prompt);
  return getDefaultCode();
}

function get3DCode(): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Space Game</title>
<style>body{margin:0;overflow:hidden;background:#000;font-family:monospace;}canvas{display:block;}
#ui{position:fixed;top:16px;left:16px;color:#00e676;font-size:13px;text-shadow:0 0 10px rgba(0,230,118,0.8);}
#tip{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);color:#8899aa;font-size:11px;}</style></head>
<body><canvas id="c"></canvas>
<div id="ui">СЧЁТ: <span id="score">0</span></div>
<div id="tip">← → ↑ ↓ управление · ПРОБЕЛ выстрел</div>
<script>
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
cv.width=window.innerWidth;cv.height=window.innerHeight;
window.onresize=()=>{cv.width=window.innerWidth;cv.height=window.innerHeight;};
let score=0;
const ship={x:cv.width/2,y:cv.height*0.78,sp:5};
const bullets=[],asteroids=[],stars=[];
const keys={};
for(let i=0;i<80;i++)stars.push({x:Math.random()*cv.width,y:Math.random()*cv.height,s:Math.random()*1.5+0.3,sp:Math.random()*0.4+0.1});
function spawnAsteroid(){asteroids.push({x:Math.random()*cv.width,y:-20,r:Math.random()*22+10,sp:Math.random()*1.5+0.8,angle:0,rot:0.025});}
for(let i=0;i<4;i++)spawnAsteroid();
setInterval(spawnAsteroid,1600);
document.addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='Space'){e.preventDefault();bullets.push({x:ship.x,y:ship.y-16,sp:10});}});
document.addEventListener('keyup',e=>keys[e.code]=false);
function loop(){
  ctx.fillStyle='rgba(0,0,0,0.2)';ctx.fillRect(0,0,cv.width,cv.height);
  stars.forEach(s=>{s.y+=s.sp;if(s.y>cv.height)s.y=0;ctx.fillStyle='rgba(200,220,255,0.5)';ctx.fillRect(s.x,s.y,s.s,s.s);});
  if(keys['ArrowLeft'])ship.x=Math.max(18,ship.x-ship.sp);
  if(keys['ArrowRight'])ship.x=Math.min(cv.width-18,ship.x+ship.sp);
  if(keys['ArrowUp'])ship.y=Math.max(18,ship.y-ship.sp);
  if(keys['ArrowDown'])ship.y=Math.min(cv.height-18,ship.y+ship.sp);
  ctx.save();ctx.translate(ship.x,ship.y);
  ctx.shadowBlur=20;ctx.shadowColor='#00e5ff';ctx.strokeStyle='#00e5ff';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(12,14);ctx.lineTo(0,8);ctx.lineTo(-12,14);ctx.closePath();ctx.stroke();
  ctx.fillStyle='rgba(0,229,255,0.12)';ctx.fill();ctx.restore();
  for(let i=bullets.length-1;i>=0;i--){
    bullets[i].y-=bullets[i].sp;
    ctx.shadowBlur=12;ctx.shadowColor='#00e676';ctx.fillStyle='#00e676';ctx.fillRect(bullets[i].x-1.5,bullets[i].y-7,3,14);
    if(bullets[i].y<-10){bullets.splice(i,1);continue;}
    for(let j=asteroids.length-1;j>=0;j--){
      if(bullets[i]&&Math.hypot(bullets[i].x-asteroids[j].x,bullets[i].y-asteroids[j].y)<asteroids[j].r){
        bullets.splice(i,1);asteroids.splice(j,1);score+=10;document.getElementById('score').textContent=score;break;
      }
    }
  }
  for(let i=asteroids.length-1;i>=0;i--){
    const a=asteroids[i];a.y+=a.sp;a.angle+=a.rot;
    ctx.save();ctx.translate(a.x,a.y);ctx.rotate(a.angle);
    ctx.shadowBlur=14;ctx.shadowColor='#7c4dff';ctx.strokeStyle='#7c4dff';ctx.lineWidth=1.5;
    ctx.beginPath();for(let k=0;k<7;k++){const ang=(k/7)*Math.PI*2,r=a.r*(0.8+Math.sin(k*2.3)*0.2);k===0?ctx.moveTo(Math.cos(ang)*r,Math.sin(ang)*r):ctx.lineTo(Math.cos(ang)*r,Math.sin(ang)*r);}ctx.closePath();ctx.stroke();
    ctx.restore();if(a.y>cv.height+a.r)asteroids.splice(i,1);
  }
  requestAnimationFrame(loop);
}
loop();
</script></body></html>`;
}

function getSnakeCode(): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Snake</title>
<style>body{margin:0;background:#080a0e;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:monospace;}
canvas{border:1px solid rgba(0,230,118,0.4);box-shadow:0 0 30px rgba(0,230,118,0.2);}
#ui{color:#00e676;font-size:13px;margin-bottom:12px;text-shadow:0 0 10px rgba(0,230,118,0.6);}
#tip{color:#3a4060;font-size:11px;margin-top:10px;}</style></head>
<body><div id="ui">СЧЁТ: <span id="s">0</span></div>
<canvas id="c" width="400" height="400"></canvas>
<div id="tip">← → ↑ ↓ управление · ENTER рестарт</div>
<script>
const cv=document.getElementById('c'),ctx=cv.getContext('2d'),SZ=20,W=20,H=20;
let snake,dir,food,score,alive,loop;
function init(){snake=[{x:10,y:10}];dir={x:1,y:0};score=0;alive=true;document.getElementById('s').textContent=0;placeFood();clearInterval(loop);loop=setInterval(tick,130);}
function placeFood(){food={x:Math.floor(Math.random()*W),y:Math.floor(Math.random()*H)};}
function tick(){
  if(!alive)return;
  const h={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
  if(h.x<0||h.x>=W||h.y<0||h.y>=H||snake.some(s=>s.x===h.x&&s.y===h.y)){alive=false;draw();return;}
  snake.unshift(h);
  if(h.x===food.x&&h.y===food.y){score+=10;document.getElementById('s').textContent=score;placeFood();}else snake.pop();
  draw();
}
function draw(){
  ctx.fillStyle='#080a0e';ctx.fillRect(0,0,400,400);
  snake.forEach((s,i)=>{const t=1-i/snake.length;ctx.shadowBlur=i===0?22:8;ctx.shadowColor='#00e676';ctx.fillStyle='rgba(0,230,118,'+(0.25+t*0.75)+')';ctx.fillRect(s.x*SZ+1,s.y*SZ+1,SZ-2,SZ-2);});
  ctx.shadowBlur=20;ctx.shadowColor='#ff4466';ctx.fillStyle='#ff4466';ctx.beginPath();ctx.arc(food.x*SZ+SZ/2,food.y*SZ+SZ/2,6,0,Math.PI*2);ctx.fill();
  if(!alive){ctx.fillStyle='rgba(0,0,0,0.72)';ctx.fillRect(0,0,400,400);ctx.shadowBlur=20;ctx.shadowColor='#00e676';ctx.fillStyle='#00e676';ctx.font='bold 26px monospace';ctx.textAlign='center';ctx.fillText('GAME OVER',200,185);ctx.fillStyle='#8899aa';ctx.font='12px monospace';ctx.fillText('ENTER — сыграть снова',200,214);}
}
document.addEventListener('keydown',e=>{
  if(e.key==='ArrowUp'&&dir.y===0)dir={x:0,y:-1};
  else if(e.key==='ArrowDown'&&dir.y===0)dir={x:0,y:1};
  else if(e.key==='ArrowLeft'&&dir.x===0)dir={x:-1,y:0};
  else if(e.key==='ArrowRight'&&dir.x===0)dir={x:1,y:0};
  else if(e.key==='Enter')init();
  e.preventDefault();
});
init();
</script></body></html>`;
}

function getParticlesCode(): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Частицы</title>
<style>body{margin:0;overflow:hidden;background:#080a0e;cursor:crosshair;}
#tip{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);color:#3a4060;font:11px monospace;}</style></head>
<body><canvas id="c"></canvas><div id="tip">Двигайте мышью · Нажмите для взрыва</div>
<script>
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
cv.width=window.innerWidth;cv.height=window.innerHeight;
window.onresize=()=>{cv.width=window.innerWidth;cv.height=window.innerHeight;};
const particles=[];
class P{constructor(x,y,burst=false){this.x=x;this.y=y;const a=Math.random()*Math.PI*2,sp=burst?(Math.random()*8+3):(Math.random()*2+0.4);this.vx=Math.cos(a)*sp;this.vy=Math.sin(a)*sp;this.life=1;this.decay=burst?0.016:0.006;this.r=Math.random()*3+1;this.color='hsl('+(Math.random()*60+120)+',100%,65%)';}
update(){this.x+=this.vx;this.y+=this.vy;this.vy+=0.03;this.vx*=0.99;this.life-=this.decay;}
draw(){ctx.globalAlpha=this.life;ctx.shadowBlur=12;ctx.shadowColor=this.color;ctx.fillStyle=this.color;ctx.beginPath();ctx.arc(this.x,this.y,this.r*this.life,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}}
document.addEventListener('mousemove',e=>{for(let i=0;i<3;i++)particles.push(new P(e.clientX+(Math.random()-0.5)*8,e.clientY+(Math.random()-0.5)*8));});
document.addEventListener('click',e=>{for(let i=0;i<65;i++)particles.push(new P(e.clientX,e.clientY,true));});
function loop(){ctx.fillStyle='rgba(8,10,14,0.2)';ctx.fillRect(0,0,cv.width,cv.height);for(let i=particles.length-1;i>=0;i--){particles[i].update();particles[i].draw();if(particles[i].life<=0)particles.splice(i,1);}requestAnimationFrame(loop);}
loop();
</script></body></html>`;
}

function getLandingCode(prompt: string): string {
  return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="UTF-8"><title>Лендинг</title>
<link href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;700;900&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box;}
body{background:#080a0e;color:#c8d8e8;font-family:'Golos Text',sans-serif;overflow-x:hidden;}
.hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 20px;position:relative;background:radial-gradient(ellipse at 50% 0%,rgba(0,230,118,0.07) 0%,transparent 60%);}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(0,230,118,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,230,118,0.025) 1px,transparent 1px);background-size:40px 40px;}
.badge{display:inline-flex;align-items:center;gap:8px;padding:6px 16px;border:1px solid rgba(0,230,118,0.3);border-radius:100px;font-size:12px;color:#00e676;margin-bottom:32px;position:relative;z-index:1;}
.dot{width:6px;height:6px;border-radius:50%;background:#00e676;animation:p 2s infinite;}
@keyframes p{0%,100%{opacity:1;}50%{opacity:0.4;transform:scale(1.5);}}
h1{font-size:clamp(38px,8vw,84px);font-weight:900;line-height:1.05;position:relative;z-index:1;margin-bottom:24px;}
.g{background:linear-gradient(135deg,#00e676,#00e5ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
p.sub{font-size:18px;color:#8899aa;max-width:500px;line-height:1.7;margin-bottom:40px;position:relative;z-index:1;}
.row{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;position:relative;z-index:1;}
.btn1{padding:14px 32px;background:#00e676;color:#080a0e;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;transition:all 0.2s;box-shadow:0 0 30px rgba(0,230,118,0.25);}
.btn1:hover{transform:translateY(-2px);box-shadow:0 0 50px rgba(0,230,118,0.45);}
.btn2{padding:14px 32px;background:transparent;color:#c8d8e8;border:1px solid #1e2332;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;transition:all 0.2s;}
.btn2:hover{border-color:rgba(0,230,118,0.4);color:#00e676;}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:18px;padding:60px 40px;max-width:1000px;margin:0 auto;}
.card{background:#0d0f14;border:1px solid #1e2332;border-radius:12px;padding:26px;transition:all 0.2s;}
.card:hover{border-color:rgba(0,230,118,0.25);transform:translateY(-3px);}
.icon{font-size:26px;margin-bottom:14px;}
.card h3{font-size:16px;font-weight:700;color:#fff;margin-bottom:8px;}
.card p{font-size:13px;color:#8899aa;line-height:1.6;}
footer{text-align:center;padding:28px;color:#3a4060;font-size:12px;border-top:1px solid #1e2332;}
</style></head><body>
<section class="hero"><div class="grid"></div>
<div class="badge"><span class="dot"></span>Платформа нового поколения</div>
<h1>Создавай<br><span class="g">без границ</span></h1>
<p class="sub">Мощный инструмент для тех, кто хочет больше — быстрее, красивее, умнее.</p>
<div class="row"><button class="btn1">Начать бесплатно</button><button class="btn2">Узнать больше</button></div>
</section>
<div class="cards">
<div class="card"><div class="icon">⚡</div><h3>Молниеносно</h3><p>Скорость на уровне идей — без задержек и ожиданий.</p></div>
<div class="card"><div class="icon">🎨</div><h3>Красиво</h3><p>Продуманный дизайн для любого устройства.</p></div>
<div class="card"><div class="icon">🔒</div><h3>Надёжно</h3><p>Данные под защитой. Uptime 99.9%.</p></div>
<div class="card"><div class="icon">🚀</div><h3>Масштабируемо</h3><p>Растёт вместе с вашим проектом.</p></div>
</div>
<footer>© 2025 · Сделано с ♥</footer>
</body></html>`;
}

function getDefaultCode(): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Генерация</title>
<style>body{margin:0;background:#080a0e;overflow:hidden;display:flex;align-items:center;justify-content:center;height:100vh;}</style></head>
<body><canvas id="c"></canvas>
<script>
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
cv.width=window.innerWidth;cv.height=window.innerHeight;
const cx=cv.width/2,cy=cv.height/2;let t=0;
function draw(){
  ctx.fillStyle='rgba(8,10,14,0.12)';ctx.fillRect(0,0,cv.width,cv.height);
  for(let i=0;i<10;i++){
    const r=36+i*24,a=t*(1+i*0.07)+Math.sin(t*0.4+i)*0.3;
    const x=cx+Math.cos(a)*Math.sin(t*0.3+i)*18,y=cy+Math.sin(a)*Math.cos(t*0.3+i)*18;
    const h=(i/10*180+t*25)%360;
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
    ctx.strokeStyle='hsla('+h+',100%,62%,'+(0.12-i*0.008)+')';
    ctx.lineWidth=1.5;ctx.shadowBlur=18;ctx.shadowColor='hsl('+h+',100%,62%)';ctx.stroke();
    const dots=5+i*2;
    for(let d=0;d<dots;d++){
      const da=(d/dots)*Math.PI*2+t*(0.5+i*0.06),px=x+Math.cos(da)*r,py=y+Math.sin(da)*r;
      ctx.beginPath();ctx.arc(px,py,2,0,Math.PI*2);ctx.fillStyle='hsl('+h+',100%,70%)';ctx.shadowBlur=14;ctx.fill();
    }
  }
  t+=0.016;requestAnimationFrame(draw);
}
draw();
</script></body></html>`;
}
