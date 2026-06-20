/* ============================================================
   ECHO FILES — CredentialPage: PCA Terminal Authentication
   全黑底色 · 绿色单色终端光标 · 伪造命令行加载日志
   ============================================================ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudio } from '../hooks/useAudio';

// ── Boot log lines (fake terminal boot sequence) ──
const BOOT_LOGS = [
  { text: 'PCA CENTRAL NETWORK v3.7.1', delay: 0 },
  { text: 'INITIALIZING SECURE CHANNEL...', delay: 300 },
  { text: 'CONNECTING TO NODE ALPHA-7...', delay: 700 },
  { text: 'HANDSHAKE: AES-256-GCM ESTABLISHED', delay: 1100 },
  { text: 'VERIFYING OPERATOR CREDENTIALS...', delay: 1500 },
  { text: '', delay: 1900 }, // blank line before prompt
];

const VALID_CREDENTIAL = 'ECHO-7';

export default function CredentialPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { play, startAmbient } = useAudio();
  const [bootPhase, setBootPhase] = useState(true);
  const [visibleLogs, setVisibleLogs] = useState<number>(0);
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'error' | 'success'>('idle');
  const [errorShake, setErrorShake] = useState(false);

  // ── Boot sequence: reveal logs one by one ──
  useEffect(() => {
    startAmbient('menu'); // Play menu BGM on credential page

    let timer: ReturnType<typeof setTimeout>;
    BOOT_LOGS.forEach((log, idx) => {
      timer = setTimeout(() => {
        setVisibleLogs((prev) => prev + 1);
        if (idx === BOOT_LOGS.length - 1) {
          // Last log → show input after brief pause
          setTimeout(() => {
            setBootPhase(false);
            inputRef.current?.focus();
          }, 400);
        }
      }, log.delay);
    });
    return () => clearTimeout(timer);
  }, [startAmbient]);

  // ── Submit handler ──
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputValue.trim()) return;

      if (inputValue.trim().toUpperCase() === VALID_CREDENTIAL) {
        setStatus('success');
        play('reboot'); // Access granted chime
        // Delay then navigate to archive hub
        setTimeout(() => navigate('/archive-hub', { replace: true }), 1500);
      } else {
        setStatus('error');
        setErrorShake(true);
        play('error'); // Auth error buzz
        setInputValue('');
        setTimeout(() => setErrorShake(false), 500);
        setTimeout(() => {
          setStatus('idle');
          inputRef.current?.focus();
        }, 2200);
      }
    },
    [inputValue, navigate],
  );

  return (
    <div className="relative h-screen overflow-hidden bg-black flex items-center justify-center font-mono">
      {/* CRT scanlines */}
      <div className="crt-scanlines" />

      {/* Subtle vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.8) 100%)',
        }}
      />

      {/* Terminal container */}
      <motion.div
        className="relative z-10 w-full max-w-2xl px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Terminal header */}
        <div className="border-b border-green-900/50 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] tracking-[0.3em] text-green-700 uppercase">
              PCA Secure Access Terminal
            </span>
            <span className="ml-auto text-[9px] text-green-900/60 font-mono">
              ENCRYPTED SESSION
            </span>
          </div>
        </div>

        {/* Boot logs */}
        <div className="space-y-1 min-h-[200px]">
          {BOOT_LOGS.slice(0, visibleLogs).map((log, i) => (
            <motion.p
              key={i}
              className={`text-xs ${i === BOOT_LOGS.length - 2 ? '' : 'text-green-600/80'}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
            >
              {log.text || '\u00A0'}
            </motion.p>
          ))}

          {/* Input area (appears after boot) */}
          <AnimatePresence>
            {!bootPhase && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2">
                  <motion.span
                    className="text-xs text-green-500 whitespace-nowrap"
                    animate={
                      errorShake
                        ? { x: [-4, 4, -3, 3, -2, 2, 0] }
                        : {}
                    }
                    transition={{ duration: 0.4 }}
                  >
                    {'>'} ENTER CREDENTIALS:{' '}
                  </motion.span>

                  {status === 'success' ? (
                    <motion.span
                      className="text-xs text-green-400 font-bold"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      [ 验证通过。欢迎回来，操作员。 ]
                    </motion.span>
                  ) : status === 'error' ? (
                    <motion.span
                      className="text-xs text-red-500 font-bold"
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: [0, 1, 1, 1],
                      }}
                      transition={{ duration: 2.2 }}
                    >
                      [ 凭证错误：未授权的访问已被记录 ]
                    </motion.span>
                  ) : (
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      autoFocus
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      className="flex-1 bg-transparent border-none outline-none text-sm text-green-400 placeholder-green-900/40 caret-green-500 font-mono"
                      style={{ textShadow: '0 0 8px rgba(34,197,94,0.4)' }}
                    />
                  )}

                  {/* Blinking cursor when idle and typing */}
                  {status === 'idle' && (
                    <motion.span
                      className="w-1.5 h-4 bg-green-500"
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
                    />
                  )}
                </form>

                {/* Hint text */}
                {status === 'idle' && !inputValue && (
                  <p className="mt-3 text-[9px] text-green-900/40 tracking-wider">
                    TIP: YOUR OPERATOR ID IS REQUIRED FOR ACCESS
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom decoration bar */}
        <div className="mt-6 h-[1px] bg-gradient-to-r from-transparent via-green-900/30 to-transparent" />
        <p className="mt-2 text-[8px] text-green-900/20 text-right font-mono tracking-wider">
          SESSION_ID: {Math.random().toString(36).slice(2, 10).toUpperCase()}
        </p>
      </motion.div>
    </div>
  );
}
