import { useEffect, useState, useCallback } from 'react';
import {
  Monitor,
  Package,
  Globe,
  Wallet,
  Printer,
  Scale,
  ChevronLeft,
  ChevronRight,
  Wifi,
  Zap,
  CheckCircle2,
  Clock,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

/* ── Tabs ── */
const TABS = [
  { id: 'salon',   Icon: Monitor,  label: 'Salon'   },
  { id: 'paket',   Icon: Package,  label: 'Paket'   },
  { id: 'online',  Icon: Globe,    label: 'Online'  },
  { id: 'kasa',    Icon: Wallet,   label: 'Kasa'    },
  { id: 'mutfak',  Icon: Printer,  label: 'Mutfak'  },
  { id: 'rapor',   Icon: Scale,    label: 'Rapor'   },
] as const;
type TabId = typeof TABS[number]['id'];

/* ── Salon data ── */
const TABLES = [
  { id:1, st:'empty'   },
  { id:2, st:'occupied', amt:285, g:4 },
  { id:3, st:'occupied', amt:420, g:2 },
  { id:4, st:'reserved', g:6 },
  { id:5, st:'occupied', amt:580, g:5 },
  { id:6, st:'paying',   amt:320, g:3 },
  { id:7, st:'empty' },
  { id:8, st:'occupied', amt:156, g:2 },
  { id:9, st:'occupied', amt:890, g:8 },
  { id:10, st:'empty' },
  { id:11, st:'occupied', amt:245, g:3 },
  { id:12, st:'paying',  amt:512, g:4 },
] as const;

function tClass(st: string, active: boolean) {
  const b = 'rounded-lg p-1.5 text-center text-white transition-all duration-300';
  if (active) return `${b} ring-2 ring-white ring-offset-1 ring-offset-stone-950 bg-orange-500`;
  if (st === 'occupied') return `${b} bg-green-600`;
  if (st === 'paying')   return `${b} bg-amber-500`;
  if (st === 'reserved') return `${b} bg-yellow-500`;
  return `${b} bg-stone-700/60 border border-stone-600`;
}

/* ── Online orders ── */
const ONLINE_ORDERS = [
  { id:'#4821', platform:'Getir',        color:'bg-purple-600', amt:148, status:'Yeni' },
  { id:'#1092', platform:'Yemeksepeti',  color:'bg-red-500',    amt:220, status:'Onaylandı' },
  { id:'#7734', platform:'Trendyol',     color:'bg-orange-500', amt:95,  status:'Hazırlanıyor' },
  { id:'#3301', platform:'Migros',       color:'bg-red-700',    amt:175, status:'Teslimatta' },
] as const;

/* ── Bar chart mini data ── */
const BAR_DATA = [
  { day:'Pzt', v:62 }, { day:'Sal', v:81 }, { day:'Çar', v:74 },
  { day:'Per', v:93 }, { day:'Cum', v:100 }, { day:'Cmt', v:88 },
  { day:'Paz', v:71 },
];

/* ── Screens ── */
function SalonScreen({ active }: { active: number }) {
  const openCount = TABLES.filter(t => t.st !== 'empty').length;
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div>
          <p className="text-[10px] text-stone-400 uppercase tracking-wide font-semibold">Masa Haritası</p>
          <p className="text-[9px] text-stone-500">{openCount}/12 masa dolu</p>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
          <span className="text-[9px] text-green-400 font-semibold">Canlı</span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1 flex-1 content-start">
        {TABLES.map(t => (
          <div key={t.id} className={tClass(t.st, active === t.id)}>
            <p className="font-bold text-[10px]">M{t.id}</p>
            {'amt' in t && <p className="text-[8px] opacity-90">₺{'amt' in t ? (t as any).amt : ''}</p>}
            {'g' in t && t.st !== 'empty' && <p className="text-[8px] opacity-70">{'g' in t ? (t as any).g : ''}kişi</p>}
            {t.st === 'paying' && <p className="text-[7px] text-white/80">Ödeme</p>}
            {t.st === 'reserved' && <p className="text-[7px] text-white/80">Rez.</p>}
          </div>
        ))}
      </div>
      <div className="mt-2 pt-1.5 border-t border-stone-800 flex justify-between text-[9px] text-stone-400 shrink-0">
        <span>37 misafir</span>
        <span className="text-orange-400">₺5.840 ciro</span>
      </div>
    </div>
  );
}

function PaketScreen() {
  return (
    <div className="flex flex-col h-full gap-2">
      <p className="text-[10px] text-stone-400 uppercase tracking-wide font-semibold shrink-0">Paket & Teslimat</p>
      <div className="bg-orange-950/60 border border-orange-700/50 rounded-lg p-2 shrink-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="w-5 h-5 rounded bg-orange-500/30 flex items-center justify-center text-orange-400 text-[9px]">📞</span>
          <p className="text-[10px] font-bold text-orange-200">Caller ID — Gelen Çağrı</p>
        </div>
        <p className="text-[9px] text-stone-300 pl-6">0532 ••• 48 21 — Ahmet Yılmaz</p>
        <p className="text-[8px] text-stone-400 pl-6 mt-0.5">Son sipariş: 12 gün önce · ₺145</p>
      </div>
      <div className="flex flex-col gap-1 flex-1 overflow-auto">
        {[
          { no:'#104', addr:'Atatürk Cad. 12/3', amt:186, st:'Hazırlanıyor', color:'text-amber-400' },
          { no:'#105', addr:'Yıldırım Sk. 7',    amt:92,  st:'Teslimatta',   color:'text-green-400' },
          { no:'#106', addr:'İstasyon Cad. 45',  amt:240, st:'Yeni',         color:'text-orange-400' },
        ].map(p => (
          <div key={p.no} className="bg-stone-800 rounded-lg px-2 py-1.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-white">Paket {p.no}</p>
              <p className="text-[8px] text-stone-400">{p.addr}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-orange-300">₺{p.amt}</p>
              <p className={`text-[8px] font-medium ${p.color}`}>{p.st}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OnlineScreen({ highlight }: { highlight: number }) {
  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-[10px] text-stone-400 uppercase tracking-wide font-semibold">Online Siparişler</p>
        <span className="text-[9px] bg-orange-500/20 text-orange-300 rounded px-1.5 py-0.5 font-semibold">4 aktif</span>
      </div>
      <div className="flex flex-col gap-1.5 flex-1">
        {ONLINE_ORDERS.map((o, i) => (
          <div
            key={o.id}
            className={`rounded-lg px-2 py-1.5 border transition-all duration-500 ${
              i === highlight
                ? 'bg-stone-700 border-orange-500 shadow-sm shadow-orange-900/40'
                : 'bg-stone-800 border-stone-700 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${o.color}`}/>
                <p className="text-[10px] font-bold text-white">{o.platform}</p>
                <p className="text-[8px] text-stone-400">{o.id}</p>
              </div>
              <p className="text-[9px] font-bold text-orange-300">₺{o.amt}</p>
            </div>
            <div className="flex items-center justify-between mt-0.5 pl-3.5">
              <span className={`text-[8px] font-medium ${
                o.status === 'Yeni' ? 'text-orange-400' :
                o.status === 'Onaylandı' ? 'text-blue-400' :
                o.status === 'Hazırlanıyor' ? 'text-amber-400' : 'text-green-400'
              }`}>{o.status}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="pt-1 border-t border-stone-800 flex justify-between text-[9px] text-stone-400 shrink-0">
        <span>Toplam: ₺638</span>
        <span className="text-green-400">+12% bugün</span>
      </div>
    </div>
  );
}

function KasaScreen() {
  return (
    <div className="flex flex-col h-full gap-2">
      <p className="text-[10px] text-stone-400 uppercase tracking-wide font-semibold shrink-0">Kasa & Ödeme</p>
      <div className="bg-stone-800 rounded-lg p-2 shrink-0">
        <p className="text-[9px] text-stone-400 mb-1">Masa 5 — Adisyon</p>
        <div className="space-y-0.5">
          {[
            { name:'Izgara Köfte (2)', price:200 },
            { name:'Mercimek Çorbası', price:65 },
            { name:'Ayran (2)', price:30 },
          ].map(i => (
            <div key={i.name} className="flex justify-between text-[9px]">
              <span className="text-stone-300">{i.name}</span>
              <span className="text-orange-300 font-semibold">₺{i.price}</span>
            </div>
          ))}
          <div className="pt-1 mt-0.5 border-t border-stone-700 flex justify-between text-[10px] font-bold">
            <span className="text-white">Toplam</span>
            <span className="text-orange-400">₺295</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5 flex-1">
        {[
          { m:'Nakit', icon:'💵', color:'bg-green-600/20 border-green-600/40 text-green-300' },
          { m:'Kart', icon:'💳', color:'bg-blue-600/20 border-blue-600/40 text-blue-300' },
          { m:'Parçalı', icon:'✂️', color:'bg-amber-600/20 border-amber-600/40 text-amber-300' },
          { m:'Açık Hesap', icon:'📋', color:'bg-purple-600/20 border-purple-600/40 text-purple-300' },
        ].map(p => (
          <div key={p.m} className={`rounded-lg p-2 border text-center flex flex-col items-center gap-1 ${p.color}`}>
            <span className="text-base">{p.icon}</span>
            <p className="text-[9px] font-semibold">{p.m}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MutfakScreen() {
  const items = [
    { table:'M5', item:'Izgara Köfte x2', time:'3 dk', done:false },
    { table:'M3', item:'Mercimek Çorbası x1', time:'1 dk', done:true },
    { table:'M9', item:'Tavuk Şiş x3', time:'6 dk', done:false },
    { table:'Online', item:'Pizza Margherita x1', time:'8 dk', done:false },
    { table:'M6', item:'Baklava x2', time:'1 dk', done:true },
  ];
  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-[10px] text-stone-400 uppercase tracking-wide font-semibold">Mutfak Ekranı</p>
        <span className="flex items-center gap-1 text-[9px] text-amber-400">
          <Clock className="w-3 h-3" /> 3 bekliyor
        </span>
      </div>
      <div className="flex flex-col gap-1 flex-1 overflow-auto">
        {items.map((it, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 border ${
              it.done
                ? 'bg-green-900/20 border-green-700/40 opacity-60'
                : 'bg-stone-800 border-stone-700'
            }`}
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[8px] font-bold ${
              it.done ? 'bg-green-600 text-white' : 'bg-orange-500/30 text-orange-300'
            }`}>
              {it.done ? <CheckCircle2 className="w-3 h-3"/> : '!'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-semibold text-white truncate">{it.item}</p>
              <p className="text-[8px] text-stone-400">{it.table}</p>
            </div>
            <span className={`text-[8px] font-semibold shrink-0 ${it.done ? 'text-green-400' : 'text-amber-400'}`}>{it.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RaporScreen() {
  const max = Math.max(...BAR_DATA.map(d => d.v));
  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-[10px] text-stone-400 uppercase tracking-wide font-semibold">Haftalık Rapor</p>
        <span className="flex items-center gap-1 text-[9px] text-green-400 font-semibold">
          <TrendingUp className="w-3 h-3"/>+14%
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 shrink-0">
        {[
          { label:'Günlük ciro', val:'₺5.840', icon:Wallet, color:'text-orange-400' },
          { label:'Sipariş',    val:'137',     icon:BarChart3, color:'text-blue-400' },
          { label:'Ort. sepet', val:'₺42,6',   icon:TrendingUp, color:'text-green-400' },
        ].map(s => (
          <div key={s.label} className="bg-stone-800 rounded-lg p-1.5 text-center">
            <s.icon className={`w-3.5 h-3.5 mx-auto mb-0.5 ${s.color}`}/>
            <p className={`text-[11px] font-bold ${s.color}`}>{s.val}</p>
            <p className="text-[7px] text-stone-500 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="flex-1 flex flex-col justify-end gap-1">
        <p className="text-[8px] text-stone-500 shrink-0">Son 7 gün</p>
        <div className="flex items-end gap-1 flex-1">
          {BAR_DATA.map(d => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className="w-full rounded-sm bg-gradient-to-t from-orange-600 to-orange-400 transition-all duration-700"
                style={{ height: `${(d.v / max) * 100}%`, minHeight: 4 }}
              />
              <p className="text-[7px] text-stone-500">{d.day}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main component ── */
export function HeroDashboard() {
  const [tab, setTab] = useState<TabId>('salon');
  const [activeTable, setActiveTable] = useState(2);
  const [orderHighlight, setOrderHighlight] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [animating, setAnimating] = useState(false);

  const tabIndex = TABS.findIndex(t => t.id === tab);

  const goTo = useCallback((id: TabId) => {
    if (id === tab || animating) return;
    setAnimating(true);
    setTimeout(() => { setTab(id); setAnimating(false); }, 180);
  }, [tab, animating]);

  const prev = () => { setAutoPlay(false); goTo(TABS[(tabIndex - 1 + TABS.length) % TABS.length].id); };
  const next = () => { setAutoPlay(false); goTo(TABS[(tabIndex + 1) % TABS.length].id); };

  /* auto-rotate tabs */
  useEffect(() => {
    if (!autoPlay) return;
    const t = setInterval(() => {
      goTo(TABS[(TABS.findIndex(x => x.id === tab) + 1) % TABS.length].id);
    }, 4500);
    return () => clearInterval(t);
  }, [autoPlay, tab, goTo]);

  /* salon: active table */
  useEffect(() => {
    const occupied = [2,3,5,6,8,9,11,12];
    let i = 0;
    const t = setInterval(() => { i = (i+1) % occupied.length; setActiveTable(occupied[i]); }, 2500);
    return () => clearInterval(t);
  }, []);

  /* online: highlight */
  useEffect(() => {
    const t = setInterval(() => setOrderHighlight(h => (h+1) % ONLINE_ORDERS.length), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="h-full flex flex-col bg-stone-950 text-white overflow-hidden select-none">
      {/* ── Top bar ── */}
      <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-red-600 px-3 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse"/>
          <div>
            <p className="font-bold text-[11px] text-white leading-tight">ŞefPOS</p>
            <p className="text-[8px] text-orange-100 leading-tight">Yönetim Paneli</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[8px] text-orange-100 uppercase tracking-wide">Günlük ciro</p>
            <p className="text-sm font-bold tabular-nums text-white">₺5.840</p>
          </div>
          <div className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-0.5">
            <Wifi className="w-3 h-3 text-green-300"/>
            <span className="text-[8px] text-green-200 font-semibold">Çevrimiçi</span>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex bg-stone-900 border-b border-stone-800 px-1 pt-1 shrink-0 gap-0.5">
        {TABS.map(({ id, Icon, label }) => (
          <button
            key={id}
            onClick={() => { setAutoPlay(false); goTo(id); }}
            className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-t-md text-[8px] font-semibold transition-all duration-200 ${
              tab === id
                ? 'bg-stone-950 text-orange-400 border-t-2 border-orange-500 -mb-px pb-[calc(0.375rem+1px)]'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            <Icon className="w-3 h-3"/>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ── Screen ── */}
      <div className={`flex-1 min-h-0 p-3 transition-opacity duration-200 ${animating ? 'opacity-0' : 'opacity-100'}`}>
        {tab === 'salon'  && <SalonScreen active={activeTable}/>}
        {tab === 'paket'  && <PaketScreen/>}
        {tab === 'online' && <OnlineScreen highlight={orderHighlight}/>}
        {tab === 'kasa'   && <KasaScreen/>}
        {tab === 'mutfak' && <MutfakScreen/>}
        {tab === 'rapor'  && <RaporScreen/>}
      </div>

      {/* ── Bottom controls ── */}
      <div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-t border-stone-800 bg-stone-900/80">
        <button
          onClick={prev}
          className="w-6 h-6 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5"/>
        </button>

        <div className="flex items-center gap-1">
          {TABS.map(({ id }) => (
            <button
              key={id}
              onClick={() => { setAutoPlay(false); goTo(id); }}
              className={`rounded-full transition-all duration-300 ${
                tab === id ? 'w-5 h-2 bg-orange-500' : 'w-2 h-2 bg-stone-600 hover:bg-stone-500'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setAutoPlay(p => !p)}
            className={`flex items-center gap-1 text-[8px] font-semibold transition-colors ${autoPlay ? 'text-orange-400' : 'text-stone-500'}`}
          >
            <Zap className="w-3 h-3"/>
            {autoPlay ? 'Oto' : 'Manuel'}
          </button>
          <button
            onClick={next}
            className="w-6 h-6 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5"/>
          </button>
        </div>
      </div>
    </div>
  );
}
