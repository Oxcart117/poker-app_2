import { useState, useCallback } from "react";

/* ─── CHIP DATA ───────────────────────────────────────────────────────────── */
const CHIP_COLORS = [
  { value:1,    color:"#FFFFFF", border:"#BDBDBD", text:"#333",    label:"1",   shadow:"rgba(255,255,255,0.4)" },
  { value:5,    color:"#E53935", border:"#B71C1C", text:"#fff",    label:"5",   shadow:"rgba(229,57,53,0.5)" },
  { value:10,   color:"#1E88E5", border:"#0D47A1", text:"#fff",    label:"10",  shadow:"rgba(30,136,229,0.5)" },
  { value:25,   color:"#43A047", border:"#1B5E20", text:"#fff",    label:"25",  shadow:"rgba(67,160,71,0.5)" },
  { value:50,   color:"#FB8C00", border:"#E65100", text:"#fff",    label:"50",  shadow:"rgba(251,140,0,0.5)" },
  { value:100,  color:"#212121", border:"#000",    text:"#FFD700", label:"100", shadow:"rgba(0,0,0,0.6)" },
  { value:500,  color:"#8E24AA", border:"#4A148C", text:"#fff",    label:"500", shadow:"rgba(142,36,170,0.5)" },
  { value:1000, color:"#FFD700", border:"#FF8F00", text:"#333",    label:"1K",  shadow:"rgba(255,215,0,0.6)" },
];
const CHIP_VALUES_DESC = [1000, 500, 100, 50, 25, 10, 5, 1];

/* ─── HELPERS ─────────────────────────────────────────────────────────────── */
const EMPTY   = () => ({ 1:0, 5:0, 10:0, 25:0, 50:0, 100:0, 500:0, 1000:0 });
const totalOf = s  => Object.entries(s).reduce((a,[v,c]) => a + Number(v)*c, 0);
const addS    = (a,b) => { const r={...a}; Object.entries(b).forEach(([v,c])=>{ r[v]=(r[v]||0)+c; }); return r; };
const subS    = (a,b) => { const r={...a}; Object.entries(b).forEach(([v,c])=>{ r[v]=(r[v]||0)-c; }); return r; };

/**
 * Decomposes `amount` from `pool` chips.
 * Uses greedy from largest. If a remainder is left (can't make exact change
 * with smaller chips), tries to use one chip just above the remainder.
 * Returns { chips, ok, overpay }
 *   ok=true  → exact or overpay (change needed)
 *   ok=false → pool genuinely insufficient
 *   overpay  → how much over the requested amount (needs manual change back)
 */
function smartDecompose(amount, pool) {
  if (amount <= 0) return { chips: EMPTY(), ok: true, overpay: 0 };

  // Phase 1: greedy from largest
  const chips = EMPTY();
  let rem = amount;
  for (const val of CHIP_VALUES_DESC) {
    if (rem <= 0) break;
    const have = pool[val] || 0;
    if (have === 0) continue;
    const take = Math.min(Math.floor(rem / val), have);
    chips[val] = take;
    rem -= take * val;
  }

  if (rem === 0) return { chips, ok: true, overpay: 0 };

  // Phase 2: try to fill remainder with additional small chips
  for (const val of CHIP_VALUES_DESC) {
    if (rem <= 0) break;
    const alreadyUsed = chips[val] || 0;
    const available   = (pool[val] || 0) - alreadyUsed;
    if (available <= 0) continue;
    const take = Math.min(Math.floor(rem / val), available);
    if (take > 0) { chips[val] = alreadyUsed + take; rem -= take * val; }
  }

  if (rem === 0) return { chips, ok: true, overpay: 0 };

  // Phase 3: remainder > 0 → need one chip larger than rem
  // Find the smallest chip that covers rem
  const ascending = [...CHIP_VALUES_DESC].reverse();
  for (const val of ascending) {
    if (val < rem) continue;                        // too small
    const alreadyUsed = chips[val] || 0;
    const available   = (pool[val] || 0) - alreadyUsed;
    if (available > 0) {
      chips[val] = alreadyUsed + 1;
      const overpay = val - rem;
      return { chips, ok: true, overpay };
    }
  }

  // Phase 4: truly can't cover
  return { chips, ok: false, remainder: rem };
}

/* ─── STYLE TOKENS ────────────────────────────────────────────────────────── */
const PAGE_BG = "#0a0908";
const btnBase = {
  border:"none", borderRadius:8, cursor:"pointer",
  fontFamily:"'Bebas Neue', sans-serif", letterSpacing:2,
  transition:"all 0.18s", padding:"8px 16px", fontSize:14,
};
const btnPrimary   = { ...btnBase, background:"linear-gradient(135deg,#FFD700,#FF8F00)", color:"#111" };
const btnSecondary = { ...btnBase, background:"rgba(255,255,255,0.07)", color:"#bbb", border:"1.5px solid rgba(255,255,255,0.13)" };
const btnDanger    = { ...btnBase, background:"rgba(220,50,50,0.18)",   color:"#ff6b6b", border:"1.5px solid rgba(220,50,50,0.3)" };
const btnInfo      = { ...btnBase, background:"rgba(30,136,229,0.18)",  color:"#64b5f6", border:"1.5px solid rgba(30,136,229,0.3)" };
const btnSuccess   = { ...btnBase, background:"rgba(67,160,71,0.18)",   color:"#81c784", border:"1.5px solid rgba(67,160,71,0.3)" };
const btnPurple    = { ...btnBase, background:"rgba(142,36,170,0.25)",  color:"#ce93d8", border:"1.5px solid rgba(142,36,170,0.4)" };
const inputStyle   = {
  background:"rgba(255,255,255,0.06)", border:"1.5px solid rgba(255,255,255,0.12)",
  borderRadius:8, color:"#fff", padding:"8px 12px", fontSize:14,
  fontFamily:"monospace", outline:"none", width:"100%", boxSizing:"border-box",
};
const microBtn = {
  ...btnBase, padding:"1px 6px", fontSize:11, borderRadius:4,
  background:"rgba(255,255,255,0.07)", color:"#aaa",
  border:"1px solid rgba(255,255,255,0.12)",
};

/* ─── CHIP COMPONENT ──────────────────────────────────────────────────────── */
function Chip({ chip, size=52, onClick, pulse }) {
  return (
    <div onClick={onClick} style={{
      position:"relative", width:size, height:size,
      cursor:onClick?"pointer":"default",
      transition:"transform 0.15s",
      transform:pulse?"scale(1.2) translateY(-4px)":"scale(1)",
      userSelect:"none", flexShrink:0,
    }}>
      <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:chip.border,
        boxShadow:`0 4px 14px ${chip.shadow}, 0 2px 4px rgba(0,0,0,0.5)` }}/>
      <div style={{ position:"absolute", inset:3, borderRadius:"50%", background:chip.color,
        display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ position:"absolute", inset:4, borderRadius:"50%",
          border:`2.5px dashed ${chip.border}`, opacity:0.65 }}/>
        <span style={{
          fontFamily:"'Bebas Neue', sans-serif", fontSize:size*0.27,
          color:chip.text, fontWeight:700, letterSpacing:1,
          position:"relative", zIndex:1, textShadow:"0 1px 3px rgba(0,0,0,0.3)",
        }}>{chip.label}</span>
      </div>
      <div style={{
        position:"absolute", top:"12%", left:"18%", width:"35%", height:"22%",
        borderRadius:"50%", background:"rgba(255,255,255,0.22)", transform:"rotate(-30deg)",
        pointerEvents:"none",
      }}/>
    </div>
  );
}

/* ─── NUMERIC BET INPUT ───────────────────────────────────────────────────── */
function NumericBetInput({ pool, maxAmount, onConfirm, confirmLabel="💰 Punta", quickAmounts=[] }) {
  const [raw, setRaw] = useState("");
  const amount  = parseInt(raw, 10) || 0;
  const overMax = maxAmount && amount > maxAmount;

  // Use unlimited pool when pool is null (setup screen)
  const effectivePool = pool || {1:9999,5:9999,10:9999,25:9999,50:9999,100:9999,500:9999,1000:9999};
  const preview = amount > 0 ? smartDecompose(amount, effectivePool) : null;

  const previewChips = preview?.chips ?? null;
  const previewTotal = previewChips ? totalOf(previewChips) : 0;
  const chipsForPreview = previewChips ? CHIP_COLORS.filter(c => (previewChips[c.value]||0) > 0) : [];

  const canConfirm = preview?.ok && !overMax && amount > 0;

  const doConfirm = () => {
    if (!canConfirm) return;
    onConfirm(preview.chips, previewTotal);
    setRaw("");
  };

  return (
    <div>
      {quickAmounts.length > 0 && (
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
          {quickAmounts.map(q => (
            <button key={q} onClick={()=>setRaw(String(q))} style={{
              ...microBtn, fontSize:12, padding:"4px 10px",
              background: raw===String(q)?"rgba(255,215,0,0.15)":undefined,
              border: raw===String(q)?"1px solid #FFD700":undefined,
              color: raw===String(q)?"#FFD700":undefined,
            }}>{q.toLocaleString()}</button>
          ))}
        </div>
      )}

      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:10 }}>
        <input
          type="number" min={1} max={maxAmount||undefined}
          value={raw} placeholder="Inserisci importo..."
          onChange={e => setRaw(e.target.value)}
          onKeyDown={e => { if(e.key==="Enter") doConfirm(); }}
          style={{ ...inputStyle, fontSize:18, padding:"10px 14px", flex:1 }}
        />
        <button onClick={doConfirm} disabled={!canConfirm}
          style={{ ...btnPrimary, opacity:!canConfirm?0.4:1, padding:"10px 18px", fontSize:14, whiteSpace:"nowrap" }}>
          {confirmLabel}
        </button>
      </div>

      {/* preview */}
      {amount > 0 && (
        <div style={{
          background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
          borderRadius:10, padding:"10px 12px", minHeight:50,
        }}>
          {overMax && (
            <div style={{ color:"#ff6b6b", fontFamily:"monospace", fontSize:12 }}>
              ⚠ Importo superiore allo stack ({maxAmount?.toLocaleString()})
            </div>
          )}
          {!overMax && preview?.ok && (
            <>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, alignItems:"center", marginBottom:6 }}>
                {chipsForPreview.map(chip => (
                  <div key={chip.value} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                    <Chip chip={chip} size={32}/>
                    <span style={{ color:"#666", fontSize:9, fontFamily:"monospace" }}>×{previewChips[chip.value]}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontFamily:"monospace", fontSize:12, display:"flex", gap:12, flexWrap:"wrap" }}>
                <span style={{ color:"#FFD700" }}>= {previewTotal.toLocaleString()} fiches</span>
                {preview.overpay > 0 && (
                  <span style={{ color:"#FB8C00" }}>
                    ⚠ Resto {preview.overpay.toLocaleString()} (da rendere manualmente)
                  </span>
                )}
              </div>
            </>
          )}
          {!overMax && preview && !preview.ok && (
            <div style={{ color:"#ff6b6b", fontFamily:"monospace", fontSize:12 }}>
              ⚠ Fiches insufficienti per coprire {amount.toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── CHIP PICKER (manuale) ───────────────────────────────────────────────── */
function ChipPicker({ available, selected, onChange }) {
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
        {CHIP_COLORS.map(chip => {
          const avail = available ? (available[chip.value]??0) : 999;
          const sel   = selected[chip.value]??0;
          return (
            <div key={chip.value} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, opacity:avail===0?0.3:1 }}>
              <Chip chip={chip} size={36} onClick={avail>0?()=>onChange(chip.value,1):undefined}/>
              <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                <button onClick={()=>onChange(chip.value,-1)} disabled={sel===0}
                  style={{ ...microBtn, opacity:sel===0?0.3:1 }}>−</button>
                <span style={{ color:sel>0?"#FFD700":"#555", fontFamily:"monospace", fontSize:12, minWidth:18, textAlign:"center" }}>{sel}</span>
                <button onClick={()=>onChange(chip.value,1)} disabled={avail===0||sel>=avail}
                  style={{ ...microBtn, opacity:(avail===0||sel>=avail)?0.3:1 }}>+</button>
              </div>
              {available && <span style={{ color:"#444", fontSize:9, fontFamily:"monospace" }}>{avail}</span>}
            </div>
          );
        })}
      </div>
      <div style={{ color:"#FFD700", fontFamily:"monospace", fontSize:14, marginTop:10, textAlign:"right" }}>
        Totale: <strong>{totalOf(selected).toLocaleString()}</strong>
      </div>
    </div>
  );
}

/* ─── POT DISPLAY ─────────────────────────────────────────────────────────── */
function PotDisplay({ stacks }) {
  const total = totalOf(stacks);
  const chips = CHIP_COLORS.filter(c => stacks[c.value] > 0);
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
      {chips.length === 0 ? (
        <div style={{ color:"rgba(255,255,255,0.18)", fontSize:14, fontStyle:"italic", padding:"8px 0", letterSpacing:2, fontFamily:"monospace" }}>
          — piatto vuoto —
        </div>
      ) : (
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center" }}>
          {chips.map(chip => (
            <div key={chip.value} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
              <Chip chip={chip} size={44}/>
              <span style={{ color:"#aaa", fontSize:10, fontFamily:"monospace" }}>×{stacks[chip.value]}</span>
            </div>
          ))}
        </div>
      )}
      {total > 0 && (
        <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:26, color:"#FFD700", letterSpacing:4, textShadow:"0 0 20px rgba(255,215,0,0.4)" }}>
          💰 {total.toLocaleString()} FICHES
        </div>
      )}
    </div>
  );
}

/* ─── BADGES ──────────────────────────────────────────────────────────────── */
function RoleBadge({ role }) {
  const cfg = { dealer:{bg:"#FFD700",text:"#111",icon:"D",label:"DEALER"}, sb:{bg:"#1E88E5",text:"#fff",icon:"SB",label:"SMALL BLIND"}, bb:{bg:"#E53935",text:"#fff",icon:"BB",label:"BIG BLIND"} };
  const s = cfg[role]; if (!s) return null;
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:4, background:s.bg, color:s.text, borderRadius:20, padding:"2px 8px 2px 4px", fontSize:10, fontFamily:"'Bebas Neue',sans-serif", letterSpacing:2, boxShadow:"0 2px 8px rgba(0,0,0,0.4)" }}>
      <div style={{ width:16, height:16, borderRadius:"50%", background:"rgba(0,0,0,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:900 }}>{s.icon}</div>
      {s.label}
    </div>
  );
}
function DealerDisc({ size=28 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:"linear-gradient(135deg,#FFD700,#FF8F00)", border:"3px solid #fff", boxShadow:"0 2px 10px rgba(255,215,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:size*0.38, color:"#111", letterSpacing:1, flexShrink:0 }}>D</div>
  );
}
function StatusBadge({ status }) {
  const cfg = { allin:{bg:"linear-gradient(135deg,#E53935,#B71C1C)",text:"#fff",label:"ALL IN 🔥"}, check:{bg:"linear-gradient(135deg,#43A047,#1B5E20)",text:"#fff",label:"CHECK ✓"}, fold:{bg:"rgba(80,80,80,0.5)",text:"#aaa",label:"FOLD"} };
  const s = cfg[status]; if (!s) return null;
  return (
    <div style={{ display:"inline-flex", alignItems:"center", background:s.bg, color:s.text, borderRadius:6, padding:"2px 8px", fontSize:10, fontFamily:"'Bebas Neue',sans-serif", letterSpacing:2, boxShadow:"0 2px 8px rgba(0,0,0,0.4)" }}>{s.label}</div>
  );
}

/* ─── LAYOUT HELPERS ──────────────────────────────────────────────────────── */
function Section({ title, children, gold }) {
  return (
    <div style={{ background:gold?"rgba(255,215,0,0.04)":"rgba(255,255,255,0.025)", border:gold?"1.5px solid rgba(255,215,0,0.2)":"1.5px solid rgba(255,255,255,0.07)", borderRadius:16, padding:"16px 18px", marginBottom:14 }}>
      {title && <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:12, letterSpacing:3, color:gold?"rgba(255,215,0,0.7)":"#555", marginBottom:12 }}>{title}</div>}
      {children}
    </div>
  );
}
function Modal({ children, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, backdropFilter:"blur(6px)" }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#111009", border:"2px solid rgba(255,215,0,0.18)", borderRadius:20, padding:"26px 22px", maxWidth:460, width:"92%", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 0 80px rgba(0,0,0,0.9)" }}>
        {children}
      </div>
    </div>
  );
}
function ModalTitle({ children }) {
  return <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"#FFD700", letterSpacing:4, marginBottom:18 }}>{children}</div>;
}
function ModalActions({ children }) {
  return <div style={{ display:"flex", gap:8, marginTop:18, flexWrap:"wrap" }}>{children}</div>;
}
function Divider({ label }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, margin:"16px 0 12px" }}>
      <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.07)" }}/>
      {label && <span style={{ color:"#444", fontSize:10, letterSpacing:3, fontFamily:"monospace" }}>{label}</span>}
      <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.07)" }}/>
    </div>
  );
}
function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display:"flex", gap:6, marginBottom:14 }}>
      {tabs.map(t=>(
        <button key={t.key} onClick={()=>onChange(t.key)} style={{
          ...microBtn, fontSize:12, padding:"5px 14px",
          background:active===t.key?"rgba(255,215,0,0.12)":"",
          border:active===t.key?"1px solid #FFD700":"",
          color:active===t.key?"#FFD700":"#777",
        }}>{t.label}</button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   SETUP SCREEN
══════════════════════════════════════════════════════════════════════════════ */
function SetupScreen({ onCreate }) {
  const [players,  setPlayers]  = useState(["","",""]);
  const [dist,     setDist]     = useState("standard");
  const [sbValue,  setSbValue]  = useState(5);
  const [bbValue,  setBbValue]  = useState(10);
  const [customNum,setCustomNum]= useState("");
  const presets = {
    standard: {1:5,5:5,10:4,25:4,50:2,100:2,500:0,1000:0},
    deep:     {1:0,5:5,10:5,25:5,50:4,100:4,500:1,1000:1},
    tourney:  {1:0,5:10,10:6,25:4,50:2,100:0,500:0,1000:0},
    custom:   {1:0,5:0,10:0,25:0,50:0,100:0,500:0,1000:0},
  };
  const [custom, setCustom] = useState({...presets.standard});
  const cur   = dist==="custom" ? custom : presets[dist];
  const total = totalOf(cur);
  const valid = players.filter(p=>p.trim());

  const applyNumericDistrib = () => {
    const n = parseInt(customNum,10);
    if (!n||n<=0) return;
    const pool = {1:9999,5:9999,10:9999,25:9999,50:9999,100:9999,500:9999,1000:9999};
    const { chips } = smartDecompose(n, pool);
    setCustom(chips); setDist("custom");
  };

  return (
    <div style={{ maxWidth:540, margin:"0 auto" }}>
      <div style={{ textAlign:"center", marginBottom:40 }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:56, letterSpacing:10, background:"linear-gradient(135deg,#FFD700,#FF8F00)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
          POKER FICHES
        </div>
        <div style={{ color:"#444", fontSize:11, letterSpacing:5, fontFamily:"monospace" }}>GESTIONE FICHES VIRTUALI</div>
      </div>

      <Section title="👥 GIOCATORI">
        {players.map((p,i)=>(
          <div key={i} style={{ display:"flex", gap:8, marginBottom:8 }}>
            <input value={p} placeholder={`Giocatore ${i+1}`} onChange={e=>{ const n=[...players]; n[i]=e.target.value; setPlayers(n); }} style={inputStyle}/>
            {players.length>2 && <button onClick={()=>setPlayers(players.filter((_,j)=>j!==i))} style={{ ...btnDanger, padding:"6px 12px" }}>✕</button>}
          </div>
        ))}
        <button onClick={()=>setPlayers([...players,""])} style={btnSecondary}>+ Aggiungi</button>
      </Section>

      <Section title="🎰 DISTRIBUZIONE INIZIALE">
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
          {["standard","deep","tourney","custom"].map(d=>(
            <button key={d} onClick={()=>{ setDist(d); if(d!=="custom") setCustom({...presets[d]}); }} style={{
              ...btnSecondary, fontSize:12,
              background:dist===d?"rgba(255,215,0,0.1)":"rgba(255,255,255,0.04)",
              border:dist===d?"1.5px solid #FFD700":"1.5px solid rgba(255,255,255,0.09)",
              color:dist===d?"#FFD700":"#777",
            }}>{d.charAt(0).toUpperCase()+d.slice(1)}</button>
          ))}
        </div>

        {/* Numeric quick-set */}
        <div style={{ marginBottom:14 }}>
          <div style={{ color:"#555", fontSize:10, letterSpacing:3, fontFamily:"monospace", marginBottom:6 }}>
            CONVERTI NUMERO → FICHES AUTOMATICHE
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <input type="number" min={1} value={customNum} placeholder="es. 1000"
              onChange={e=>setCustomNum(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter") applyNumericDistrib(); }}
              style={{ ...inputStyle, flex:1 }}/>
            <button onClick={applyNumericDistrib} style={{ ...btnSecondary, whiteSpace:"nowrap" }}>🎲 Converti</button>
          </div>
          {customNum && parseInt(customNum)>0 && (
            <div style={{ marginTop:8, display:"flex", flexWrap:"wrap", gap:6, alignItems:"center" }}>
              {CHIP_COLORS.filter(c=>{
                const pool={1:9999,5:9999,10:9999,25:9999,50:9999,100:9999,500:9999,1000:9999};
                const {chips}=smartDecompose(parseInt(customNum)||0,pool);
                return chips[c.value]>0;
              }).map(c=>{
                const pool={1:9999,5:9999,10:9999,25:9999,50:9999,100:9999,500:9999,1000:9999};
                const {chips}=smartDecompose(parseInt(customNum)||0,pool);
                return (
                  <div key={c.value} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                    <Chip chip={c} size={28}/>
                    <span style={{ color:"#666", fontSize:9, fontFamily:"monospace" }}>×{chips[c.value]}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {dist==="custom" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
            {CHIP_COLORS.map(chip=>(
              <div key={chip.value} style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.04)", borderRadius:8, padding:"6px 10px" }}>
                <Chip chip={chip} size={30}/>
                <input type="number" min={0} max={99} value={custom[chip.value]}
                  onChange={e=>setCustom({...custom,[chip.value]:Math.max(0,+e.target.value)})}
                  style={{ ...inputStyle, width:60, padding:"4px 8px", fontSize:13 }}/>
              </div>
            ))}
          </div>
        )}

        <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:8 }}>
          {CHIP_COLORS.filter(c=>cur[c.value]>0).map(chip=>(
            <div key={chip.value} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <Chip chip={chip} size={32}/><span style={{ color:"#666", fontSize:9 }}>×{cur[chip.value]}</span>
            </div>
          ))}
        </div>
        <div style={{ color:"#FFD700", fontFamily:"monospace", fontSize:13 }}>
          Per giocatore: <strong>{total.toLocaleString()}</strong> fiches
        </div>
      </Section>

      <Section title="🎯 BUCHI (BLINDS)">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div>
            <div style={{ color:"#1E88E5", fontSize:11, letterSpacing:3, fontFamily:"'Bebas Neue',sans-serif", marginBottom:6 }}>SMALL BLIND</div>
            <input type="number" min={1} value={sbValue} onChange={e=>setSbValue(Math.max(1,+e.target.value))} style={inputStyle}/>
          </div>
          <div>
            <div style={{ color:"#E53935", fontSize:11, letterSpacing:3, fontFamily:"'Bebas Neue',sans-serif", marginBottom:6 }}>BIG BLIND</div>
            <input type="number" min={1} value={bbValue} onChange={e=>setBbValue(Math.max(1,+e.target.value))} style={inputStyle}/>
          </div>
        </div>
      </Section>

      <button onClick={()=>{
        if(valid.length<2)   return alert("Servono almeno 2 giocatori!");
        if(total===0)        return alert("Seleziona almeno una fiches!");
        if(sbValue>=bbValue) return alert("Small blind deve essere minore del big blind!");
        onCreate(valid, cur, sbValue, bbValue);
      }} style={{ ...btnPrimary, width:"100%", padding:16, fontSize:20, letterSpacing:6 }}>
        🃏 INIZIA
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [phase,  setPhase]  = useState("setup");
  const [config, setConfig] = useState(null);
  const pageStyle = { minHeight:"100vh", background:PAGE_BG, padding:"32px 16px", color:"#fff" };
  if (phase==="setup") return (
    <div style={pageStyle}>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet"/>
      <SetupScreen onCreate={(p,d,sb,bb)=>{ setConfig({players:p,dist:d,sb,bb}); setPhase("game"); }}/>
    </div>
  );
  return (
    <div style={pageStyle}>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet"/>
      <GameScreen players={config.players} distribution={config.dist} sbValue={config.sb} bbValue={config.bb} onReset={()=>{ setConfig(null); setPhase("setup"); }}/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   GAME SCREEN
══════════════════════════════════════════════════════════════════════════════ */
function GameScreen({ players:initNames, distribution, sbValue, bbValue, onReset }) {
  const [players,   setPlayers]   = useState(()=>initNames.map((name,i)=>({ id:i, name, stacks:{...distribution}, status:null })));
  const [pot,       setPot]       = useState(EMPTY());
  const [bets,      setBets]      = useState({});
  const [dealerIdx, setDealerIdx] = useState(0);
  const [modal,     setModal]     = useState(null);
  const [mData,     setMData]     = useState({});
  const [flash,     setFlash]     = useState(null);
  const [log,       setLog]       = useState([]);
  const [showLog,   setShowLog]   = useState(false);

  const addLog    = msg => setLog(l=>[{msg,id:Date.now()+Math.random()},...l.slice(0,79)]);
  const doFlash   = id  => { setFlash(id); setTimeout(()=>setFlash(null),700); };
  const openModal = (type,data={}) => { setModal(type); setMData(data); };
  const closeModal= () => setModal(null);
  const potTotal  = totalOf(pot);
  const n         = players.length;
  const sbIdx     = (dealerIdx+1)%n;
  const bbIdx     = (dealerIdx+2)%n;
  const getRole   = idx => {
    if (n===2) { if(idx===dealerIdx) return "dealer"; if(idx===sbIdx) return "sb"; return null; }
    if (idx===dealerIdx) return "dealer";
    if (idx===sbIdx)     return "sb";
    if (idx===bbIdx)     return "bb";
    return null;
  };

  /* ── post blind ─────────────────────────────────────────────────────── */
  const doPostBlind = (pIdx, amount, label) => {
    const p   = players[pIdx];
    const res = smartDecompose(amount, p.stacks);
    if (!res.ok && !res.overpay) { alert(`${p.name} non ha abbastanza fiches!`); return; }
    const chips = res.chips;
    const paid  = totalOf(chips);
    if (paid===0) { alert(`${p.name} non ha fiches!`); return; }
    setPlayers(prev=>prev.map((x,i)=>i===pIdx?{...x,stacks:subS(x.stacks,chips)}:x));
    setPot(prev=>addS(prev,chips));
    setBets(prev=>({...prev,[p.id]:addS(prev[p.id]||EMPTY(),chips)}));
    addLog(`🎯 ${p.name} posta ${label} (${paid.toLocaleString()})`);
    doFlash("pot");
  };
  const handlePostBlinds = () => {
    doPostBlind(sbIdx, sbValue, `SB ${sbValue}`);
    doPostBlind(bbIdx, bbValue, `BB ${bbValue}`);
  };

  /* ── bet ─────────────────────────────────────────────────────────────── */
  const confirmBet = (playerId, chips) => {
    const p   = players.find(x=>x.id===playerId);
    const amt = totalOf(chips);
    if (amt===0) return;
    for (const [v,c] of Object.entries(chips)) {
      if (c>(p.stacks[v]||0)) { alert(`${p.name} non ha abbastanza fiches da ${v}!`); return; }
    }
    setPlayers(prev=>prev.map(x=>x.id===playerId?{...x,stacks:subS(x.stacks,chips),status:null}:x));
    setPot(prev=>addS(prev,chips));
    setBets(prev=>({...prev,[playerId]:addS(prev[playerId]||EMPTY(),chips)}));
    addLog(`🎲 ${p.name} punta ${amt.toLocaleString()}`);
    doFlash("pot"); closeModal();
  };

  /* ── all-in ──────────────────────────────────────────────────────────── */
  const doAllIn = (playerId) => {
    const p={...players.find(x=>x.id===playerId)};
    const chips={...p.stacks};
    const amt=totalOf(chips);
    if(amt===0){alert("Nessuna fiches!"); return;}
    setPlayers(prev=>prev.map(x=>x.id===playerId?{...x,stacks:EMPTY(),status:"allin"}:x));
    setPot(prev=>addS(prev,chips));
    setBets(prev=>({...prev,[playerId]:addS(prev[playerId]||EMPTY(),chips)}));
    addLog(`🔥 ${p.name} ALL IN! (${amt.toLocaleString()})`);
    doFlash("pot"); doFlash(playerId); closeModal();
  };

  /* ── check / fold ────────────────────────────────────────────────────── */
  const doCheck = (playerId) => {
    const p=players.find(x=>x.id===playerId);
    setPlayers(prev=>prev.map(x=>x.id===playerId?{...x,status:"check"}:x));
    addLog(`✓ ${p.name} fa check`); doFlash(playerId); closeModal();
  };
  const doFold = (playerId) => {
    const p=players.find(x=>x.id===playerId);
    setPlayers(prev=>prev.map(x=>x.id===playerId?{...x,status:"fold"}:x));
    addLog(`🃏 ${p.name} fold`); closeModal();
  };

  /* ── win ─────────────────────────────────────────────────────────────── */
  const confirmWin = (winnerId, chips) => {
    const w=players.find(x=>x.id===winnerId);
    const amt=totalOf(chips);
    setPlayers(prev=>prev.map(x=>x.id===winnerId?{...x,stacks:addS(x.stacks,chips),status:null}:x));
    setPot(prev=>subS(prev,chips));
    if(totalOf(subS(pot,chips))<=0) setBets({});
    addLog(`🏆 ${w.name} vince ${amt.toLocaleString()}!`);
    doFlash(winnerId); closeModal();
  };

  /* ── split ───────────────────────────────────────────────────────────── */
  const confirmSplit = (winnerIds) => {
    const share=Math.floor(potTotal/winnerIds.length);
    const names=winnerIds.map(id=>players.find(p=>p.id===id)?.name).join(" & ");
    let remaining={...pot};
    winnerIds.forEach(wid=>{
      let toGive=share; const shareStacks=EMPTY();
      for(const chip of [...CHIP_COLORS].reverse()){
        if(toGive<=0) break;
        const take=Math.min(remaining[chip.value]||0,Math.floor(toGive/chip.value));
        shareStacks[chip.value]=take; remaining[chip.value]=(remaining[chip.value]||0)-take; toGive-=take*chip.value;
      }
      setPlayers(prev=>prev.map(p=>p.id===wid?{...p,stacks:addS(p.stacks,shareStacks),status:null}:p));
      doFlash(wid);
    });
    setPot(remaining); setBets({});
    addLog(`🤝 Diviso tra ${names} (~${share.toLocaleString()} cad.)`);
    closeModal();
  };

  /* ── return bets ─────────────────────────────────────────────────────── */
  const returnBets = () => {
    Object.entries(bets).forEach(([idStr,chips])=>{
      const id=Number(idStr);
      setPlayers(prev=>prev.map(p=>p.id===id?{...p,stacks:addS(p.stacks,chips)}:p)); doFlash(id);
    });
    addLog("↩️ Puntate restituite"); setPot(EMPTY()); setBets({});
  };

  /* ── transfer ────────────────────────────────────────────────────────── */
  const confirmTransfer = (fromId, toId, chips) => {
    const from=players.find(p=>p.id===fromId), to=players.find(p=>p.id===toId);
    const amt=totalOf(chips);
    for(const [v,c] of Object.entries(chips)){ if(c>(from.stacks[v]||0)){alert(`${from.name} non ha abbastanza fiches!`); return;} }
    setPlayers(prev=>prev.map(p=>{
      if(p.id===fromId) return{...p,stacks:subS(p.stacks,chips)};
      if(p.id===toId)   return{...p,stacks:addS(p.stacks,chips)};
      return p;
    }));
    addLog(`💸 ${from.name} → ${to.name}: ${amt.toLocaleString()}`);
    doFlash(toId); closeModal();
  };

  /* ── next hand ───────────────────────────────────────────────────────── */
  const nextHand = () => {
    const nd=(dealerIdx+1)%n;
    setDealerIdx(nd);
    setPlayers(prev=>prev.map(p=>({...p,status:null})));
    setPot(EMPTY()); setBets({});
    addLog(`🃏 Nuova mano — Dealer: ${players[nd].name}`);
  };

  /* ══ MODALS ══════════════════════════════════════════════════════════ */

  const PlayerActionModal = () => {
    const p=players.find(x=>x.id===mData.playerId); if(!p) return null;
    const pTotal=totalOf(p.stacks);
    const idx=players.findIndex(x=>x.id===p.id);
    const role=getRole(idx);
    const [tab,setTab]=useState("numero");
    const [sel,setSel]=useState(EMPTY());
    const onChangeSel=(v,delta)=>setSel(prev=>({...prev,[v]:Math.max(0,Math.min((p.stacks[v]||0),(prev[v]||0)+delta))}));
    const quickAmts=[sbValue,bbValue,bbValue*2,bbValue*3,Math.floor(potTotal/2),potTotal].filter((v,i,a)=>v>0&&v<=pTotal&&a.indexOf(v)===i).slice(0,6);

    return (
      <Modal onClose={closeModal}>
        <ModalTitle>🎲 {p.name}</ModalTitle>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div style={{ color:"#777", fontFamily:"monospace", fontSize:12 }}>Stack: <span style={{ color:"#FFD700" }}>{pTotal.toLocaleString()}</span></div>
          {role&&<RoleBadge role={role}/>}
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:18 }}>
          <button onClick={()=>doAllIn(p.id)} style={{ ...btnDanger, fontSize:12 }}>🔥 ALL IN ({pTotal.toLocaleString()})</button>
          <button onClick={()=>doCheck(p.id)} style={{ ...btnSuccess, fontSize:12 }}>✓ CHECK</button>
          <button onClick={()=>doFold(p.id)}  style={{ ...btnSecondary, fontSize:12 }}>🃏 FOLD</button>
          {["sb","bb"].includes(role)&&(
            <button onClick={()=>{ doPostBlind(idx,role==="sb"?sbValue:bbValue,role==="sb"?`SB ${sbValue}`:`BB ${bbValue}`); closeModal(); }}
              style={{ ...btnInfo, fontSize:12 }}>🎯 POSTA {role==="sb"?"SB":"BB"}</button>
          )}
        </div>
        <Divider label="PUNTATA"/>
        <TabBar tabs={[{key:"numero",label:"🔢 Numero"},{key:"manuale",label:"🎰 Manuale"}]} active={tab} onChange={setTab}/>
        {tab==="numero" && (
          <NumericBetInput pool={p.stacks} maxAmount={pTotal} quickAmounts={quickAmts} confirmLabel="💰 Punta" onConfirm={(chips)=>confirmBet(p.id,chips)}/>
        )}
        {tab==="manuale" && (
          <>
            <ChipPicker available={p.stacks} selected={sel} onChange={onChangeSel}/>
            <ModalActions>
              <button onClick={()=>confirmBet(p.id,sel)} style={btnPrimary}>💰 Punta</button>
              <button onClick={closeModal} style={btnSecondary}>Annulla</button>
            </ModalActions>
          </>
        )}
      </Modal>
    );
  };

  const WinModal = () => {
    const [winnerId,setWinnerId]=useState(players[0]?.id);
    return (
      <Modal onClose={closeModal}>
        <ModalTitle>🏆 ASSEGNA VINCITORE</ModalTitle>
        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:16 }}>
          {players.map(p=>(
            <button key={p.id} onClick={()=>setWinnerId(p.id)} style={{
              ...btnSecondary, textAlign:"left",
              background:winnerId===p.id?"rgba(255,215,0,0.12)":"rgba(255,255,255,0.04)",
              border:winnerId===p.id?"1.5px solid #FFD700":"",
              color:winnerId===p.id?"#FFD700":"#aaa",
              display:"flex", alignItems:"center", gap:10,
            }}>
              <span style={{flex:1}}>{p.name}</span>
              <span style={{ fontSize:12, color:"#666" }}>{totalOf(p.stacks).toLocaleString()} ft</span>
            </button>
          ))}
        </div>
        <ModalActions>
          <button onClick={()=>confirmWin(winnerId,{...pot})} style={btnPrimary}>🏆 Vince tutto ({potTotal.toLocaleString()})</button>
          <button onClick={closeModal} style={btnSecondary}>Annulla</button>
        </ModalActions>
      </Modal>
    );
  };

  const SplitModal = () => {
    const [winners,setWinners]=useState([]);
    const toggle=id=>setWinners(w=>w.includes(id)?w.filter(x=>x!==id):[...w,id]);
    return (
      <Modal onClose={closeModal}>
        <ModalTitle>🤝 DIVIDI PIATTO</ModalTitle>
        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:16 }}>
          {players.map(p=>(
            <button key={p.id} onClick={()=>toggle(p.id)} style={{
              ...btnSecondary, textAlign:"left",
              background:winners.includes(p.id)?"rgba(255,215,0,0.12)":"rgba(255,255,255,0.04)",
              border:winners.includes(p.id)?"1.5px solid #FFD700":"",
              color:winners.includes(p.id)?"#FFD700":"#aaa",
              display:"flex", alignItems:"center", gap:10,
            }}>
              <span>{winners.includes(p.id)?"☑ ":"☐ "}{p.name}</span>
              {winners.includes(p.id)&&winners.length>0&&<span style={{ fontSize:12, color:"#888", marginLeft:"auto" }}>~{Math.floor(potTotal/winners.length).toLocaleString()} ft</span>}
            </button>
          ))}
        </div>
        <ModalActions>
          <button onClick={()=>{ if(winners.length<2){alert("Seleziona ≥2 giocatori!"); return;} confirmSplit(winners); }} style={btnPrimary}>🤝 Dividi</button>
          <button onClick={closeModal} style={btnSecondary}>Annulla</button>
        </ModalActions>
      </Modal>
    );
  };

  const TransferModal = () => {
    const [fromId,setFromId]=useState(players[0]?.id);
    const [toId,setToId]=useState(players[1]?.id);
    const [tab,setTab]=useState("numero");
    const [sel,setSel]=useState(EMPTY());
    const fromP=players.find(p=>p.id===fromId);
    const onChange=(v,delta)=>setSel(prev=>({...prev,[v]:Math.max(0,Math.min((fromP?.stacks[v]||0),(prev[v]||0)+delta))}));
    return (
      <Modal onClose={closeModal}>
        <ModalTitle>💸 TRASFERISCI FICHES</ModalTitle>
        <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:8, alignItems:"start", marginBottom:16 }}>
          <div>
            <div style={{ color:"#555", fontSize:10, letterSpacing:2, fontFamily:"monospace", marginBottom:6 }}>DA</div>
            {players.map(p=>(
              <button key={p.id} onClick={()=>{setFromId(p.id);setSel(EMPTY());}} style={{ ...btnSecondary, width:"100%", marginBottom:4, textAlign:"left", fontSize:12, background:fromId===p.id?"rgba(255,215,0,0.1)":"", border:fromId===p.id?"1.5px solid #FFD700":"", color:fromId===p.id?"#FFD700":"#aaa" }}>{p.name}</button>
            ))}
          </div>
          <div style={{ color:"#FFD700", fontFamily:"'Bebas Neue',sans-serif", fontSize:20, marginTop:28 }}>→</div>
          <div>
            <div style={{ color:"#555", fontSize:10, letterSpacing:2, fontFamily:"monospace", marginBottom:6 }}>A</div>
            {players.map(p=>(
              <button key={p.id} onClick={()=>setToId(p.id)} style={{ ...btnSecondary, width:"100%", marginBottom:4, textAlign:"left", fontSize:12, background:toId===p.id?"rgba(67,160,71,0.15)":"", border:toId===p.id?"1.5px solid #43A047":"", color:toId===p.id?"#81c784":"#aaa" }}>{p.name}</button>
            ))}
          </div>
        </div>
        <TabBar tabs={[{key:"numero",label:"🔢 Numero"},{key:"manuale",label:"🎰 Manuale"}]} active={tab} onChange={setTab}/>
        {tab==="numero"&&fromP&&(
          <NumericBetInput pool={fromP.stacks} maxAmount={totalOf(fromP.stacks)} confirmLabel="💸 Trasferisci"
            onConfirm={(chips)=>{ if(fromId===toId){alert("Stesso giocatore!"); return;} confirmTransfer(fromId,toId,chips); }}/>
        )}
        {tab==="manuale"&&fromP&&(
          <>
            <ChipPicker available={fromP.stacks} selected={sel} onChange={onChange}/>
            <ModalActions>
              <button onClick={()=>{ if(fromId===toId){alert("Stesso giocatore!"); return;} confirmTransfer(fromId,toId,sel); }} style={btnPrimary}>💸 Trasferisci</button>
              <button onClick={closeModal} style={btnSecondary}>Annulla</button>
            </ModalActions>
          </>
        )}
      </Modal>
    );
  };

  const DealerModal = () => {
    const [nd,setNd]=useState(dealerIdx);
    return (
      <Modal onClose={closeModal}>
        <ModalTitle>🃏 SPOSTA DEALER</ModalTitle>
        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:16 }}>
          {players.map((p,i)=>(
            <button key={p.id} onClick={()=>setNd(i)} style={{ ...btnSecondary, textAlign:"left", background:nd===i?"rgba(255,215,0,0.12)":"", border:nd===i?"1.5px solid #FFD700":"", color:nd===i?"#FFD700":"#aaa", display:"flex", alignItems:"center", gap:10 }}>
              {nd===i&&<DealerDisc size={20}/>}
              <span style={{flex:1}}>{p.name}</span>
              <span style={{ fontSize:10, color:"#555" }}>SB→{players[(i+1)%n]?.name}  BB→{players[(i+2)%n]?.name}</span>
            </button>
          ))}
        </div>
        <ModalActions>
          <button onClick={()=>{ setDealerIdx(nd); addLog(`🃏 Dealer → ${players[nd].name}`); closeModal(); }} style={btnPrimary}>Conferma</button>
          <button onClick={closeModal} style={btnSecondary}>Annulla</button>
        </ModalActions>
      </Modal>
    );
  };

  /* ══ RENDER ══════════════════════════════════════════════════════════ */
  return (
    <div style={{ maxWidth:740, margin:"0 auto" }}>
      {/* header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:6, color:"#FFD700" }}>🃏 POKER FICHES</div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>setShowLog(!showLog)} style={{ ...btnSecondary, fontSize:11 }}>📋 {showLog?"Nascondi":"Log"}</button>
          <button onClick={onReset} style={{ ...btnSecondary, fontSize:11 }}>↩ Nuova</button>
        </div>
      </div>

      {/* round bar */}
      <div style={{ background:"rgba(255,255,255,0.03)", border:"1.5px solid rgba(255,255,255,0.07)", borderRadius:14, padding:"12px 16px", marginBottom:14, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        <button onClick={()=>openModal("dealer")} style={{ ...btnSecondary, fontSize:12, display:"flex", alignItems:"center", gap:6 }}><DealerDisc size={18}/> {players[dealerIdx]?.name}</button>
        <button onClick={handlePostBlinds} style={{ ...btnInfo, fontSize:12 }}>🎯 Posta bui ({sbValue}/{bbValue})</button>
        <button onClick={nextHand} style={{ ...btnPurple, fontSize:12 }}>⏭ Mano successiva</button>
        <button onClick={()=>{ setPlayers(prev=>prev.map(p=>({...p,status:null}))); addLog("🔄 Status azzerati"); }} style={{ ...btnSecondary, fontSize:11 }}>🔄 Reset status</button>
        <button onClick={()=>openModal("transfer")} style={{ ...btnSecondary, fontSize:11 }}>💸 Trasferisci</button>
      </div>

      {/* blinds strip */}
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        {[
          {label:"DEALER",name:players[dealerIdx]?.name,color:"#FFD700",bg:"rgba(255,215,0,0.06)"},
          {label:`SB · ${sbValue}`,name:players[sbIdx]?.name,color:"#64b5f6",bg:"rgba(30,136,229,0.06)"},
          {label:`BB · ${bbValue}`,name:players[bbIdx]?.name,color:"#ef9a9a",bg:"rgba(229,57,53,0.06)"},
        ].map(({label,name,color,bg})=>(
          <div key={label} style={{ flex:1, background:bg, border:`1px solid ${color}22`, borderRadius:10, padding:"7px 12px" }}>
            <div style={{ color, fontFamily:"'Bebas Neue',sans-serif", fontSize:10, letterSpacing:3 }}>{label}</div>
            <div style={{ color:"#ddd", fontFamily:"monospace", fontSize:13 }}>{name}</div>
          </div>
        ))}
      </div>

      {/* pot */}
      <div style={{
        background:"rgba(10,25,12,0.8)",
        border:`2.5px solid ${flash==="pot"?"rgba(255,215,0,0.5)":"rgba(255,215,0,0.18)"}`,
        borderRadius:24, padding:"24px 20px 20px", marginBottom:18, position:"relative",
        boxShadow:flash==="pot"?"0 0 50px rgba(255,215,0,0.15)":"none",
        transition:"border 0.3s, box-shadow 0.3s",
      }}>
        <div style={{ position:"absolute", inset:14, borderRadius:18, border:"1.5px solid rgba(255,255,255,0.03)", pointerEvents:"none" }}/>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:11, letterSpacing:6, color:"rgba(255,215,0,0.35)", textAlign:"center", marginBottom:18 }}>🎯 PIATTO COMUNE</div>
        <PotDisplay stacks={pot}/>
        {Object.keys(bets).length>0&&(
          <div style={{ marginTop:16, borderTop:"1px solid rgba(255,255,255,0.05)", paddingTop:12 }}>
            <div style={{ color:"rgba(255,255,255,0.22)", fontSize:10, letterSpacing:3, fontFamily:"monospace", marginBottom:8 }}>PUNTATE</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center" }}>
              {Object.entries(bets).map(([idStr,chips])=>{
                const p=players.find(x=>x.id===Number(idStr)); const t=totalOf(chips);
                return t>0?(<div key={idStr} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:8, padding:"3px 10px", color:"#bbb", fontSize:12, fontFamily:"monospace" }}>{p?.name}: <span style={{ color:"#FFD700" }}>{t.toLocaleString()}</span></div>):null;
              })}
            </div>
          </div>
        )}
        <div style={{ display:"flex", gap:8, marginTop:18, justifyContent:"center", flexWrap:"wrap" }}>
          <button onClick={()=>openModal("win")} disabled={potTotal===0} style={{ ...btnPrimary, opacity:potTotal===0?0.35:1, fontSize:13, padding:"9px 20px", letterSpacing:2 }}>🏆 Assegna vincitore</button>
          <button onClick={()=>openModal("split")} disabled={potTotal===0} style={{ ...btnSecondary, opacity:potTotal===0?0.35:1, fontSize:12 }}>🤝 Dividi</button>
          <button onClick={returnBets} disabled={potTotal===0} style={{ ...btnSecondary, opacity:potTotal===0?0.35:1, fontSize:12 }}>↩️ Restituisci</button>
        </div>
      </div>

      {/* players */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px,1fr))", gap:12, marginBottom:18 }}>
        {players.map((player,idx)=>{
          const pTotal=totalOf(player.stacks);
          const isFlash=flash===player.id;
          const playerBet=bets[player.id]?totalOf(bets[player.id]):0;
          const role=getRole(idx);
          const isAllin=player.status==="allin";
          const isFolded=player.status==="fold";
          return (
            <div key={player.id} style={{
              background:isFlash?"rgba(255,215,0,0.06)":isFolded?"rgba(0,0,0,0.25)":"rgba(255,255,255,0.03)",
              border:isFlash?"2px solid rgba(255,215,0,0.45)":isAllin?"2px solid rgba(220,50,50,0.45)":isFolded?"1.5px solid rgba(255,255,255,0.03)":"1.5px solid rgba(255,255,255,0.07)",
              borderRadius:16, padding:"15px 16px",
              boxShadow:isFlash?"0 0 22px rgba(255,215,0,0.1)":isAllin?"0 0 16px rgba(220,50,50,0.1)":"none",
              transition:"all 0.35s", position:"relative", opacity:isFolded?0.5:1,
            }}>
              {(isFlash||isAllin)&&<div style={{ position:"absolute", top:-1, left:16, right:16, height:2, background:`linear-gradient(90deg,transparent,${isFlash?"#FFD700":"#E53935"},transparent)`, borderRadius:1 }}/>}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    {role==="dealer"&&n>2&&<DealerDisc size={20}/>}
                    <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:17, letterSpacing:2, color:isFlash?"#FFD700":isFolded?"#444":"#ddd" }}>{player.name}</span>
                  </div>
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                    {role==="sb"&&<RoleBadge role="sb"/>}
                    {role==="bb"&&<RoleBadge role="bb"/>}
                    {role==="dealer"&&n===2&&<RoleBadge role="dealer"/>}
                    {player.status&&<StatusBadge status={player.status}/>}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2, color:pTotal===0?"#333":isAllin?"#ff6b6b":"#FFD700" }}>{pTotal.toLocaleString()}</div>
                  {playerBet>0&&<div style={{ color:"#777", fontFamily:"monospace", fontSize:10 }}>puntato: {playerBet.toLocaleString()}</div>}
                </div>
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:12, minHeight:28 }}>
                {CHIP_COLORS.filter(c=>player.stacks[c.value]>0).map(chip=>(
                  <div key={chip.value} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
                    <Chip chip={chip} size={26}/><span style={{ color:"#444", fontSize:8, fontFamily:"monospace" }}>×{player.stacks[chip.value]}</span>
                  </div>
                ))}
                {pTotal===0&&<span style={{ color:"#333", fontSize:11, fontFamily:"monospace", alignSelf:"center" }}>— nessuna fiches —</span>}
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {!isFolded&&<button onClick={()=>openModal("playerAction",{playerId:player.id})} disabled={isAllin} style={{ ...btnPrimary, flex:1, fontSize:12, padding:"7px 10px", opacity:isAllin?0.4:1 }}>🎲 Azione</button>}
                {!isFolded&&<button onClick={()=>doAllIn(player.id)} disabled={isAllin||pTotal===0} style={{ ...btnDanger, fontSize:12, padding:"7px 12px", opacity:(isAllin||pTotal===0)?0.3:1 }}>🔥</button>}
                {!isFolded&&<button onClick={()=>doCheck(player.id)} disabled={isAllin} style={{ ...btnSuccess, fontSize:12, padding:"7px 12px", opacity:isAllin?0.3:1 }}>✓</button>}
                {!isFolded&&<button onClick={()=>doFold(player.id)} disabled={isAllin} style={{ ...btnSecondary, fontSize:12, padding:"7px 12px", opacity:isAllin?0.3:1 }}>🃏</button>}
                {isFolded&&<button onClick={()=>setPlayers(prev=>prev.map(p=>p.id===player.id?{...p,status:null}:p))} style={{ ...btnSecondary, fontSize:11, padding:"6px 10px" }}>↩ Riattiva</button>}
              </div>
            </div>
          );
        })}
      </div>

      {/* log */}
      {showLog&&(
        <Section title="📋 LOG">
          <div style={{ maxHeight:180, overflowY:"auto", display:"flex", flexDirection:"column", gap:4 }}>
            {log.length===0&&<div style={{ color:"#333", fontFamily:"monospace", fontSize:12 }}>— vuoto —</div>}
            {log.map((e,i)=>(
              <div key={e.id} style={{ color:i===0?"#ccc":"#555", fontFamily:"monospace", fontSize:11, borderBottom:"1px solid rgba(255,255,255,0.03)", paddingBottom:3 }}>{e.msg}</div>
            ))}
          </div>
        </Section>
      )}

      {modal==="playerAction"&&<PlayerActionModal/>}
      {modal==="win"         &&<WinModal/>}
      {modal==="split"       &&<SplitModal/>}
      {modal==="transfer"    &&<TransferModal/>}
      {modal==="dealer"      &&<DealerModal/>}
    </div>
  );
}