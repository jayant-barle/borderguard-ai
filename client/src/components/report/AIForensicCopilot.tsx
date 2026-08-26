import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
  FileCheck,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  CornerDownLeft,
  User
} from 'lucide-react';
import { VerificationResult, AIChatMessage, AIForensicAnalysis, OllamaStatus } from '../../../../shared/types';
import { api } from '../../services/api';

interface AIForensicCopilotProps {
  result: VerificationResult;
}

export const AIForensicCopilot: React.FC<AIForensicCopilotProps> = ({ result }) => {
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [loadingChat, setLoadingChat] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<AIForensicAnalysis | null>(result.ollamaAnalysis || null);
  const [generatingAnalysis, setGeneratingAnalysis] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [expandedBrief, setExpandedBrief] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch Ollama health status on mount
  useEffect(() => {
    async function checkOllama() {
      try {
        const status = await api.ai.getStatus();
        setOllamaStatus(status);
      } catch {
        setOllamaStatus({
          connected: false,
          baseUrl: 'http://localhost:11434',
          activeModel: 'llama3.2:1b',
          availableModels: [],
          error: 'Connection unreachable'
        });
      }
    }
    checkOllama();
  }, []);

  // Initialize initial greeting or load existing analysis
  useEffect(() => {
    if (result && messages.length === 0) {
      const isHighRisk = result.risk.level === 'HIGH' || result.tampering?.detected;
      const initialAssistantMessage: AIChatMessage = {
        role: 'assistant',
        content: isHighRisk
          ? `⚠️ **Security Alert: Dossier ${result.id}** for **${result.holderName}** is flagged as **HIGH RISK** (${result.risk.score}/100).\n\n` +
            `• Primary forensic concern: **${result.tampering?.summary || 'Identity / Biometric divergence'}**.\n` +
            `• Facial similarity: **${result.faceVerification?.similarityScore}%**.\n\n` +
            `I am your local Ollama AI Forensic Advisor. You can ask me for targeted cross-examination questions, legal admissibility guidelines, or to draft an escalation memo.`
          : `🛡️ **Dossier ${result.id}** for **${result.holderName}** is cleared as **LOW RISK / VERIFIED**.\n\n` +
            `• MRZ check digits: **Passed**.\n` +
            `• Biometric face match: **${result.faceVerification?.similarityScore}%**.\n` +
            `• Registry status: **${result.databaseVerification?.status || 'Active'}**.\n\n` +
            `How can I assist you with this traveler's clearance dossier?`,
        timestamp: new Date().toISOString()
      };
      setMessages([initialAssistantMessage]);
    }
  }, [result]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingChat]);

  const handleSendMessage = async (customText?: string) => {
    const text = customText || inputMessage;
    if (!text.trim() || loadingChat) return;

    const userMsg: AIChatMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!customText) setInputMessage('');
    setLoadingChat(true);

    try {
      const response = await api.ai.chat(newMessages, result);
      setMessages((prev) => [...prev, response.message]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error contacting Ollama LLM (${err.message}). Using local rule engine evaluation.`,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleReanalyze = async () => {
    setGeneratingAnalysis(true);
    try {
      const res = await api.ai.analyze({
        holderName: result.holderName,
        documentNumber: result.documentNumber,
        documentType: result.documentType,
        ocr: result.ocr,
        mrz: result.mrz,
        tampering: result.tampering,
        face: result.faceVerification,
        database: result.databaseVerification,
        risk: result.risk,
        scenario: result.scenarioDetected
      });
      setAnalysis(res);
    } catch (err) {
      console.error('Failed to regenerate AI analysis', err);
    } finally {
      setGeneratingAnalysis(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const quickPrompts = [
    { label: '🎯 Interview Questions', text: 'Generate targeted border control interview questions for this traveler to test authenticity.' },
    { label: '🔍 Explain Tampering', text: 'Explain the forensic photo substitution and substrate anomalies detected on this passport.' },
    { label: '⚖️ Draft Incident Memo', text: 'Draft a formal secondary inspection escalation memo for the shift supervisor.' },
    { label: '🛡️ ICAO & Watchlist Check', text: 'Summarize MRZ ICAO 9303 compliance and central database watchlist findings.' }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg text-white">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <span>SatyaShield AI Copilot</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </h3>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Ollama Engine
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Live AI Forensic Intelligence & Real-Time Decision Support
            </p>
          </div>
        </div>

        {/* Ollama Connection Pill */}
        <div className="flex items-center space-x-2 text-xs">
          <div
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono ${
              ollamaStatus?.connected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                ollamaStatus?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>
              {ollamaStatus?.connected
                ? `Ollama: ${ollamaStatus.activeModel}`
                : 'Ollama: Connecting / Hybrid'}
            </span>
          </div>

          <button
            onClick={handleReanalyze}
            disabled={generatingAnalysis}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Refresh AI Analysis"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generatingAnalysis ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Forensic Intelligence Briefing Accordion */}
      {analysis && (
        <div className="border-b border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setExpandedBrief(!expandedBrief)}
              className="flex items-center space-x-2 text-xs font-bold text-slate-200 hover:text-white"
            >
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>Ollama Threat Assessment Briefing</span>
              <span className="text-[10px] text-slate-500 font-mono">
                (Model: {analysis.model} • Confidence: {analysis.confidenceScore}%)
              </span>
              {expandedBrief ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            <button
              onClick={() =>
                copyToClipboard(
                  `[SatyaShield Intelligence Brief]\nHolder: ${result.holderName} (${result.documentNumber})\nSummary: ${analysis.executiveSummary}\nThreat: ${analysis.threatAssessment}\nDirective: ${analysis.recommendedProtocol}`
                )
              }
              className="inline-flex items-center text-[10px] text-slate-400 hover:text-slate-200 space-x-1"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy Brief'}</span>
            </button>
          </div>

          {expandedBrief && (
            <div className="mt-3 space-y-3 text-xs">
              {/* Executive Summary */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                  Executive Forensic Summary
                </span>
                <p className="text-slate-200 leading-relaxed">{analysis.executiveSummary}</p>
              </div>

              {/* Threat & Directive Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
                  <div className="flex items-center space-x-1.5 text-amber-400 font-bold text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Identified Threat Profile</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    {analysis.threatAssessment}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
                  <div className="flex items-center space-x-1.5 text-blue-400 font-bold text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Officer Action Directive</span>
                  </div>
                  <p className="font-mono text-emerald-400 text-[11px] font-semibold">
                    {analysis.recommendedProtocol}
                  </p>
                </div>
              </div>

              {/* Suggested Interview Questions */}
              {analysis.interviewQuestions && analysis.interviewQuestions.length > 0 && (
                <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-900/40 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                    Recommended Traveler Interrogation Protocol
                  </span>
                  <ul className="space-y-1 pl-4 list-disc text-slate-300 text-[11px]">
                    {analysis.interviewQuestions.map((q, idx) => (
                      <li key={idx} className="leading-snug">{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Live Interactive Chat Area */}
      <div className="p-4 space-y-3">
        <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
          <span>Ask Copilot about this case:</span>
          <span className="text-[10px] text-slate-500">
            Powered by Ollama ({ollamaStatus?.activeModel || 'llama3.2:1b'})
          </span>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip.text)}
              disabled={loadingChat}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-900/50 hover:border-indigo-500/50 border border-slate-700/60 text-slate-300 hover:text-white transition-all disabled:opacity-50"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Chat History Box */}
        <div className="h-56 overflow-y-auto space-y-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80 font-sans text-xs scrollbar-thin scrollbar-thumb-slate-800">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start space-x-2.5 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-md bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 text-indigo-300 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                {msg.timestamp && (
                  <div
                    className={`text-[9px] mt-1 ${
                      msg.role === 'user' ? 'text-blue-200' : 'text-slate-500'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center shrink-0 text-white mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {loadingChat && (
            <div className="flex items-center space-x-2 text-indigo-400 text-xs p-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Ollama AI is reasoning over dossier forensics...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your question for the AI Forensic Copilot..."
            disabled={loadingChat}
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white text-xs px-3.5 py-2.5 rounded-xl outline-none placeholder-slate-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || loadingChat}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
