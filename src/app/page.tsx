"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell, ChevronRight, Clock3, Mic, Package, Search, ShieldCheck,
  Sparkles, UserRound, MapPin, Phone, Navigation, ArrowLeft,
  CheckCircle2, AlertTriangle, Volume2, StopCircle
} from "lucide-react";
import { orders, type Order } from "@/lib/data";

type TimelineItem = { label: string; detail: string; kind: "action" | "policy" | "ok" };
type SpeechRecognitionEventLike = Event & { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> };
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
};

const indianLanguages = [
  "English", "Hindi", "Hinglish", "Tanglish", "Tamil", "Telugu", "Kannada", "Malayalam",
  "Marathi", "Bengali", "Gujarati", "Punjabi", "Urdu", "Odia", "Assamese", "Konkani",
  "Maithili", "Nepali", "Sanskrit", "Santali", "Sindhi", "Kashmiri", "Dogri", "Bodo",
  "Manipuri",
];

export default function Home() {
  const [selected, setSelected] = useState<Order>(orders[0]);
  const [query, setQuery] = useState("");
  const [screen, setScreen] = useState<"dashboard" | "active" | "dispatcher">("dashboard");
  const [status, setStatus] = useState("Listening");
  const [transcript, setTranscript] = useState([
    { role: "Rider", text: "Customer bol rahe hain ki abhi office mein hain." },
  ]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([
    { label: "Intent detected", detail: "Reschedule + landmark update", kind: "action" },
  ]);
  const [confirmation, setConfirmation] = useState(true);
  const [language, setLanguage] = useState("Tanglish");
  const [escalated, setEscalated] = useState(false);
  const [draftText, setDraftText] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const visibleOrders = orders.filter((order) =>
    `${order.id} ${order.phone} ${order.customerName}`.toLowerCase().includes(query.toLowerCase())
  );

  async function execute(name: string, input: Record<string, unknown>, label: string) {
    setStatus("Thinking");
    setTimeline((items) => [...items, { label, detail: "Calling secure action API…", kind: "action" }]);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, input }),
      });
      const result = await response.json();
      if (result.order) setSelected({ ...result.order });
      setTimeline((items) => [
        ...items,
        ...(result.policy ? [{ label: "Policy retrieved", detail: result.policy[0] || "Policy check complete", kind: "policy" as const }] : []),
        { label: result.ok ? "Action completed" : "Action needs review", detail: result.message, kind: result.ok ? "ok" : "policy" },
      ]);
      setStatus(result.ok ? "Action Completed" : "Needs Dispatcher Review");
      if (!result.ok) setEscalated(true);
    } catch {
      setTimeline((items) => [...items, { label: "Offline mode", detail: "Could not reach the action API", kind: "policy" }]);
      setStatus("Offline");
    }
  }

  async function runJudgeDemo() {
    setScreen("active");
    setConfirmation(true);
    setEscalated(false);
    setLanguage("Hinglish");
    setStatus("Listening");
    setTranscript([
      { role: "Rider", text: "Customer bol rahe hain ki abhi office mein hain. Delivery shaam ko karna hai." },
    ]);
    setTimeline([{ label: "Intent detected", detail: "Reschedule + landmark update", kind: "action" }]);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setStatus("Speaking");
    setTranscript((items) => [
      ...items,
      { role: "RouteSaathi", text: "Samajh gaya. Shaam ka slot aur temple ke paas wala landmark add karna hai. Main confirm kar doon?" },
    ]);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setTranscript((items) => [
      ...items,
      { role: "Rider", text: "Ruko, customer bol rahe hain neighbour ko de sakte ho." },
    ]);
    setStatus("Listening");
    setConfirmation(false);
    await execute("updateDeliveryLandmark", { orderId: selected.id, landmark: "Temple ke paas" }, "updateDeliveryLandmark");
  }

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    window.speechSynthesis.cancel();
  }

  async function sendGeminiText(text: string) {
    if (!text.trim()) return;
    setStatus("Thinking");
    setTranscript((items) => [...items, { role: "Rider", text }]);
    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language, orderId: selected.id }),
      });
      const result = await response.json();
      setTranscript((items) => [...items, { role: "RouteSaathi", text: result.text || result.message }]);
      setStatus(response.ok ? "Speaking" : "Demo Provider");
      if (response.ok && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(result.text);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      setStatus("Offline");
    }
  }

  function startListening() {
    if (status === "Listening" && recognitionRef.current) {
      stopListening();
      setStatus("Stopped");
      return;
    }
    const SpeechRecognitionConstructor = (
      window as typeof window & {
        SpeechRecognition?: new () => SpeechRecognitionLike;
        webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      }
    ).SpeechRecognition || (
      window as typeof window & { webkitSpeechRecognition?: new () => SpeechRecognitionLike }
    ).webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) {
      setStatus("Text fallback");
      return;
    }
    const recognition = new SpeechRecognitionConstructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === "Hindi" || language === "Hinglish"
      ? "hi-IN"
      : language === "Tamil" || language === "Tanglish"
        ? "ta-IN"
        : "en-IN";
    recognition.onresult = (event) => {
      const latest = event.results[event.results.length - 1];
      const text = latest[0].transcript;
      setTranscript((items) => {
        const withoutPartial = items[items.length - 1]?.role === "Rider (live)" ? items.slice(0, -1) : items;
        return [...withoutPartial, { role: "Rider (live)", text }];
      });
      window.speechSynthesis.cancel();
      if (latest.isFinal) void sendGeminiText(text);
    };
    recognition.onerror = () => setStatus("Microphone unavailable");
    recognition.onend = () => {
      if (recognitionRef.current === recognition) setStatus("Stopped");
    };
    recognitionRef.current = recognition;
    setStatus("Listening");
    recognition.start();
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-[#f4f7fb] pb-24 md:max-w-5xl md:pb-8">
      {screen === "dashboard" && (
        <Dashboard
          query={query}
          setQuery={setQuery}
          visibleOrders={visibleOrders}
          setSelected={(order) => { setSelected(order); setScreen("active"); }}
          setDispatcher={() => setScreen("dispatcher")}
          runJudgeDemo={runJudgeDemo}
        />
      )}

      {screen === "active" && (
        <ActiveOrder
          order={selected}
          status={status}
          transcript={transcript}
          timeline={timeline}
          language={language}
          confirmation={confirmation}
          escalated={escalated}
          languages={indianLanguages}
          setLanguage={setLanguage}
          draftText={draftText}
          setDraftText={setDraftText}
          startListening={startListening}
          sendGeminiText={sendGeminiText}
          setConfirmation={setConfirmation}
          setScreen={setScreen}
          runDemo={runJudgeDemo}
          onAction={(name, input, label) => execute(name, input, label)}
        />
      )}

      {screen === "dispatcher" && (
        <Dispatcher setScreen={setScreen} />
      )}

      {screen !== "active" && (
        <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 items-center justify-around border-t border-slate-200 bg-white px-4 py-3 md:absolute md:max-w-5xl" aria-label="Main navigation">
          <button onClick={() => setScreen("dashboard")} className="flex flex-col items-center gap-1 text-xs font-bold text-blue-700"><Navigation size={20} />Today</button>
          <button onClick={() => setScreen("active")} className="flex flex-col items-center gap-1 text-xs text-slate-500"><Package size={20} />Orders</button>
          <button onClick={() => setScreen("dispatcher")} className="flex flex-col items-center gap-1 text-xs text-slate-500"><ShieldCheck size={20} />Review</button>
        </nav>
      )}
    </main>
  );
}

function Dashboard({ query, setQuery, visibleOrders, setSelected, setDispatcher, runJudgeDemo }: {
  query: string; setQuery: (value: string) => void; visibleOrders: Order[];
  setSelected: (order: Order) => void; setDispatcher: () => void; runJudgeDemo: () => void;
}) {
  return (
    <>
      <header className="bg-[#10233f] px-5 pb-6 pt-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-full bg-teal-400 text-[#10233f]"><UserRound size={22} /></div><div><p className="text-xs text-blue-200">Good morning</p><h1 className="font-bold">Ravi Kumar</h1></div></div>
          <button aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-full bg-white/10"><Bell size={19} /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-400" /></button>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Metric value="6" label="Assigned" />
          <Metric value="4" label="In progress" />
          <Metric value="₹18.4k" label="Cash to collect" />
        </div>
      </header>
      <section className="px-4 pt-5">
        <label className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm">
          <Search size={18} className="text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order ID or phone" className="w-full outline-none text-sm" aria-label="Search orders" />
        </label>
        <button onClick={runJudgeDemo} className="mt-3 flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-blue-700 to-teal-500 p-4 text-left text-white shadow-lg shadow-blue-900/15">
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-full bg-white/20"><Mic size={22} /></div><div><p className="text-xs text-blue-100">Judge Demo</p><p className="font-bold">Start 3-minute voice scenario</p></div></div><ChevronRight size={20} />
        </button>
        <div className="mt-5 flex items-center justify-between"><h2 className="font-bold text-[#10233f]">Today&apos;s deliveries</h2><button onClick={setDispatcher} className="text-xs font-bold text-blue-700">View 2 reviews</button></div>
        <div className="mt-3 space-y-3">
          {visibleOrders.map((order) => (
            <button key={order.id} onClick={() => setSelected(order)} className="w-full rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm">
              <div className="flex items-start justify-between"><div><div className="flex items-center gap-2"><span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{order.id}</span><span className="h-1.5 w-1.5 rounded-full bg-teal-500" /></div><h3 className="mt-2 font-bold">{order.customerName}</h3><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin size={13} />{order.address}</p></div><div className="text-right"><p className="font-bold">₹{order.value.toLocaleString("en-IN")}</p><p className="mt-2 text-xs text-slate-500">{order.slot}</p></div></div>
            </button>
          ))}
          {visibleOrders.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No matching deliveries found.</div>}
        </div>
      </section>
    </>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div className="rounded-xl bg-white/8 px-3 py-3"><p className="text-lg font-bold">{value}</p><p className="mt-0.5 text-[11px] text-blue-100">{label}</p></div>;
}

function ActiveOrder({ order, status, transcript, timeline, language, confirmation, escalated, languages, setLanguage, draftText, setDraftText, startListening, sendGeminiText, setConfirmation, setScreen, onAction }: {
  order: Order; status: string; transcript: { role: string; text: string }[]; timeline: TimelineItem[];
  language: string; confirmation: boolean; escalated: boolean;
  languages: string[]; setLanguage: (language: string) => void;
  draftText: string; setDraftText: (text: string) => void;
  startListening: () => void; sendGeminiText: (text: string) => void;
  setConfirmation: (value: boolean) => void; setScreen: (screen: "dashboard" | "active" | "dispatcher") => void;
  runDemo: () => void; onAction: (name: string, input: Record<string, unknown>, label: string) => void;
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between"><button onClick={() => setScreen("dashboard")} aria-label="Back to dashboard" className="grid h-9 w-9 place-items-center rounded-full bg-slate-100"><ArrowLeft size={18} /></button><div className="text-center"><p className="text-xs font-bold text-slate-400">{order.id}</p><p className="text-sm font-bold">{status}</p></div><span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700">{language}</span></div>
      </header>
      <section className="p-4">
        <label className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          <span className="font-bold text-slate-500">Conversation language</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value)} className="max-w-40 rounded-lg bg-slate-50 px-2 py-2 font-bold text-[#10233f]" aria-label="Conversation language">
            {languages.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        {escalated && <div className="mb-3 flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900"><AlertTriangle size={20} /><div><p className="font-bold">Needs Dispatcher Review</p><p className="text-xs">High-value or policy exception detected</p></div></div>}
        <div className="rounded-2xl bg-[#10233f] p-4 text-white">
          <div className="flex items-start justify-between"><div><p className="text-xs text-blue-200">Customer</p><h2 className="mt-1 text-lg font-bold">{order.customerName}</h2></div><span className="rounded-full bg-white/10 px-2.5 py-1 text-xs">{order.status}</span></div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><p className="flex items-center gap-2 text-blue-100"><Phone size={14} />{order.phone}</p><p className="flex items-center gap-2 font-bold text-white"><Clock3 size={14} />{order.slot}</p><p className="col-span-2 flex items-start gap-2 text-blue-100"><MapPin size={14} className="mt-0.5" />{order.address}<br />{order.landmark}</p></div>
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3"><span className="text-xs text-blue-200">Order value</span><span className="font-bold">₹{order.value.toLocaleString("en-IN")}</span></div>
        </div>

        <div className="my-4 text-center">
          <motion.button whileTap={{ scale: 0.94 }} onClick={startListening} aria-label={status === "Listening" ? "Stop voice assistant" : "Start voice assistant"} className="relative mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-teal-400 text-white shadow-xl shadow-blue-900/20">
            {status === "Listening" ? <StopCircle size={30} /> : <Mic size={30} />}
            {status === "Listening" && <span className="absolute inset-[-7px] -z-10 animate-pulse rounded-full border-4 border-blue-200" />}
          </motion.button>
          <p className="mt-2 text-xs font-bold text-slate-500">{status === "Listening" ? "Listening… speak naturally" : status}</p>
        </div>

        <form onSubmit={(event) => { event.preventDefault(); sendGeminiText(draftText); setDraftText(""); }} className="mb-4 flex gap-2">
          <label className="sr-only" htmlFor="demo-text">Demo text input</label>
          <input id="demo-text" value={draftText} onChange={(event) => setDraftText(event.target.value)} placeholder="Type in Hinglish, Tamil, Hindi…" className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none" />
          <button type="submit" className="h-11 rounded-xl bg-[#10233f] px-4 text-sm font-bold text-white">Send</button>
        </form>

        {confirmation && <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4"><div className="flex items-center gap-2 text-sm font-bold text-blue-900"><Sparkles size={17} />Confirm action</div><p className="mt-2 text-sm text-slate-700">Reschedule to evening slot and add “Temple ke paas”?</p><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => setConfirmation(false)} className="h-10 rounded-lg border border-slate-300 bg-white text-sm font-bold">Edit</button><button onClick={() => { setConfirmation(false); onAction("rescheduleDelivery", { orderId: order.id, date: "Today", timeSlot: "5 PM–8 PM", reason: "Customer at office" }, "rescheduleDelivery"); }} className="h-10 rounded-lg bg-blue-700 text-sm font-bold text-white">Confirm</button></div></div>}

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <ManualButton label="Reschedule" icon={<Clock3 size={16} />} onClick={() => onAction("rescheduleDelivery", { orderId: order.id, date: "Today", timeSlot: "5 PM–8 PM", reason: "Rider manual update" }, "rescheduleDelivery")} />
          <ManualButton label="Landmark" icon={<MapPin size={16} />} onClick={() => onAction("updateDeliveryLandmark", { orderId: order.id, landmark: "Near temple" }, "updateDeliveryLandmark")} />
          <ManualButton label="Safe handoff" icon={<ShieldCheck size={16} />} onClick={() => onAction("requestSafeHandoff", { orderId: order.id, neighbourName: "Neighbour", neighbourPhone: "+91 99999 00000", otp: "123456" }, "requestSafeHandoff")} />
          <ManualButton label="Escalate" icon={<AlertTriangle size={16} />} onClick={() => onAction("escalateToDispatcher", { orderId: order.id, reason: "Rider requested escalation", conversationSummary: "Rider requested human dispatcher assistance." }, "escalateToDispatcher")} />
        </div>

        <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><h3 className="font-bold">Live transcript</h3><span className="flex items-center gap-1 text-xs text-slate-400"><Volume2 size={13} />Live</span></div><div className="mt-3 max-h-44 space-y-3 overflow-y-auto">{transcript.map((item, index) => <div key={index} className={`rounded-xl p-3 ${item.role === "RouteSaathi" ? "ml-6 bg-blue-50" : "mr-6 bg-slate-100"}`}><p className="text-[10px] font-bold uppercase text-slate-400">{item.role}</p><p className="mt-1 text-sm">{item.text}</p></div>)}</div></section>

        <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm"><h3 className="font-bold">Action timeline</h3><div className="mt-3 space-y-3">{timeline.map((item, index) => <div key={`${item.label}-${index}`} className="flex gap-3"><div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${item.kind === "ok" ? "bg-teal-100 text-teal-700" : "bg-blue-100 text-blue-700"}`}>{item.kind === "ok" ? <CheckCircle2 size={15} /> : <Sparkles size={15} />}</div><div><p className="text-sm font-bold">{item.label}</p><p className="text-xs text-slate-500">{item.detail}</p></div></div>)}</div></section>
      </section>
    </div>
  );
}

function ManualButton({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-sm">{icon}{label}</button>;
}

function Dispatcher({ setScreen }: { setScreen: (screen: "dashboard" | "active" | "dispatcher") => void }) {
  const [resolved, setResolved] = useState(false);
  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-3 bg-[#10233f] px-4 py-4 text-white">
        <button onClick={() => setScreen("dashboard")} aria-label="Back" className="grid h-9 w-9 place-items-center rounded-full bg-white/10"><ArrowLeft size={18} /></button>
        <div><p className="text-xs text-blue-200">Human oversight</p><h1 className="font-bold">Dispatcher Queue</h1></div>
      </header>
      <section className="p-4">
        <div className="flex items-center justify-between"><h2 className="font-bold">Open escalations</h2><span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-700">{resolved ? 0 : 2}</span></div>
        {!resolved ? (
          <div className="mt-3 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between"><div><span className="rounded-md bg-orange-100 px-2 py-1 text-[10px] font-bold text-orange-700">HIGH PRIORITY</span><h3 className="mt-2 font-bold">ORD-2026-10031</h3><p className="text-sm text-slate-500">Arjun Reddy · Bengaluru</p></div><span className="text-xs text-slate-400">2 min ago</span></div>
            <div className="mt-3 rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-400">AI SUMMARY</p><p className="mt-1 text-sm">Customer requested neighbour handoff for a ₹7,800 order. Hinglish. Calm. High-value policy requires approval and OTP verification.</p></div>
            <div className="mt-3 text-xs text-slate-500"><p><b>Language:</b> English</p><p className="mt-1"><b>Suggested action:</b> Approve only after OTP verification</p></div>
            <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => setResolved(true)} className="h-11 rounded-lg border border-slate-300 text-sm font-bold">Decline</button><button onClick={() => setResolved(true)} className="h-11 rounded-lg bg-teal-600 text-sm font-bold text-white">Approve with OTP</button></div>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-teal-200 bg-teal-50 p-8 text-center"><CheckCircle2 className="mx-auto text-teal-600" /><p className="mt-2 font-bold text-teal-900">Case resolved</p><p className="mt-1 text-sm text-teal-700">Decision recorded in the audit timeline.</p></div>
        )}
      </section>
    </div>
  );
}
