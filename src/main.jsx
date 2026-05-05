import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TrendingUp, TrendingDown, Search, Wallet, Newspaper, Star, PieChart, AlertTriangle, Plus, Trash2, BarChart3, Target, RefreshCw } from 'lucide-react';
import './styles.css';

const recommendations = [
  { id:'2330', name:'台積電', type:'台股', price:980, trendScore:92, topicScore:88, signal:'偏多觀察', reason:'AI、先進製程、外資關注度高，短線量能仍強。', buyZone:'940 - 960', sellZone:'1030 - 1080', risk:'估值偏高，若跌破月線需降風險。'},
  { id:'0050', name:'元大台灣50', type:'ETF', price:185.4, trendScore:82, topicScore:73, signal:'穩健加碼', reason:'大盤權值股趨勢仍偏多，適合長期核心配置。', buyZone:'178 - 182', sellZone:'195 - 200', risk:'短線受大盤回檔影響較大。'},
  { id:'00878', name:'國泰永續高股息', type:'ETF', price:22.8, trendScore:68, topicScore:61, signal:'持有觀察', reason:'高股息題材穩定，但資金熱度較成長股弱。', buyZone:'21.8 - 22.2', sellZone:'24.0 - 24.5', risk:'配息政策、成分股調整會影響評價。'},
  { id:'科技基金A', name:'全球AI科技基金', type:'基金', price:36.2, trendScore:87, topicScore:94, signal:'分批布局', reason:'AI、半導體、雲端題材延續，但波動較高。', buyZone:'34 - 35.5', sellZone:'39 - 41', risk:'美股科技股修正時回檔幅度可能較大。'}
];
const topics = [
  { title:'AI 伺服器與半導體', heat:94, impact:'台積電、AI基金、電子權值股受惠' },
  { title:'降息預期與資金行情', heat:78, impact:'成長股與科技型基金評價上修' },
  { title:'高股息ETF配息變化', heat:66, impact:'高股息ETF需觀察填息與配息穩定性' }
];
const startHoldings = [
  { id:'2330', name:'台積電', type:'台股', shares:2, avgCost:920, currentPrice:980, weight:42 },
  { id:'00878', name:'國泰永續高股息', type:'ETF', shares:1000, avgCost:23.1, currentPrice:22.8, weight:30 },
  { id:'科技基金A', name:'全球AI科技基金', type:'基金', shares:80, avgCost:32, currentPrice:36.2, weight:28 }
];
const money = v => Number(v || 0).toLocaleString('zh-TW', { maximumFractionDigits: 2 });
function App(){
 const [keyword,setKeyword]=useState('');
 const [holdings,setHoldings]=useState(startHoldings);
 const [form,setForm]=useState({id:'',name:'',type:'台股',shares:'',avgCost:'',currentPrice:''});
 const recs=useMemo(()=>recommendations.filter(x=>!keyword||`${x.id}${x.name}${x.type}`.toLowerCase().includes(keyword.toLowerCase())),[keyword]);
 const pf=useMemo(()=>{const cost=holdings.reduce((s,h)=>s+h.shares*h.avgCost,0); const value=holdings.reduce((s,h)=>s+h.shares*h.currentPrice,0); const pnl=value-cost; const rate=cost? pnl/cost*100:0; const tech=holdings.filter(h=>/台積|科技|AI/i.test(h.name)).reduce((s,h)=>s+(h.weight||0),0); return {cost,value,pnl,rate,tech}},[holdings]);
 const adv=[]; if(pf.tech>60) adv.push(['風險提醒','科技與AI曝險偏高，若短線漲多可分批停利，降低單一題材回檔風險。']); if(holdings.some(h=>h.id==='00878'||h.name.includes('高股息'))) adv.push(['配置建議','高股息部位適合當防守核心，但若報酬落後大盤，可評估降低比重並轉向市值型ETF。']); adv.push(pf.rate>10?['獲利管理','整體已有不錯獲利，可設定移動停利，例如跌破20日線或回吐三分之一獲利時調節。']:pf.rate<-5?['停損檢查','整體虧損擴大，應檢查是否跌破原本買進理由，避免越跌越攤造成資金卡死。']:['持續觀察','目前損益接近中性，建議等待明確突破或回測支撐後再加碼。']);
 const add=()=>{if(!form.id||!form.name||!form.shares||!form.avgCost||!form.currentPrice)return;setHoldings([...holdings,{...form,shares:+form.shares,avgCost:+form.avgCost,currentPrice:+form.currentPrice,weight:0}]);setForm({id:'',name:'',type:'台股',shares:'',avgCost:'',currentPrice:''});};
 return <div><header><div><h1>台股・基金策略分析平台</h1><p>整合近期走勢、熱門題材、個人庫存與買賣點建議</p></div><button><RefreshCw size={16}/>更新分析</button></header><main>
 <section className="metrics"><Metric icon={<Wallet/>} title="庫存市值" value={`$${money(pf.value)}`} note="依目前價格估算"/><Metric icon={pf.pnl>=0?<TrendingUp/>:<TrendingDown/>} title="總損益" value={`${pf.pnl>=0?'+':''}${money(pf.pnl)}`} note={`${pf.rate.toFixed(2)}%`}/><Metric icon={<PieChart/>} title="科技題材曝險" value={`${pf.tech}%`} note="台積電 / 科技基金 / AI相關"/><Metric icon={<Target/>} title="推薦候選" value={`${recommendations.length} 檔`} note="依趨勢與話題分數排序"/></section>
 <section className="grid"><div className="card wide"><div className="title"><div><h2><Star size={20}/>推薦分析</h2><p>依最近走勢、題材熱度、風險提示產生候選清單</p></div><label className="search"><Search size={16}/><input placeholder="搜尋代號 / 名稱 / 類型" value={keyword} onChange={e=>setKeyword(e.target.value)}/></label></div>{recs.map(item=><div className="rec" key={item.id}><div className="recTop"><div><h3>{item.name} <span>{item.id}</span></h3><b>{item.type}</b><em>{item.signal}</em><p>{item.reason}</p></div><strong>{item.price}</strong></div><div className="mini"><Info title="走勢分數" value={`${item.trendScore}/100`}/><Info title="話題分數" value={`${item.topicScore}/100`}/><Info title="建議買進區" value={item.buyZone}/><Info title="建議停利區" value={item.sellZone}/></div><p className="risk"><AlertTriangle size={16}/>{item.risk}</p></div>)}</div>
 <div className="card"><h2><Newspaper size={20}/>近期市場話題</h2><p>後續可串新聞、PTT、Google Trends 或券商研究資料</p>{topics.map(t=><div className="topic" key={t.title}><div><b>{t.title}</b><strong>{t.heat}</strong></div><span><i style={{width:`${t.heat}%`}}/></span><p>{t.impact}</p></div>)}</div></section>
 <section className="grid"><div className="card wide"><h2><BarChart3 size={20}/>我的庫存</h2><p>可手動異動，後續可改成登入後儲存至資料庫</p><table><thead><tr><th>標的</th><th>類型</th><th>數量</th><th>均價</th><th>現價</th><th>損益</th><th>建議</th><th></th></tr></thead><tbody>{holdings.map(h=>{const pnl=h.shares*(h.currentPrice-h.avgCost); const rate=(h.currentPrice-h.avgCost)/h.avgCost*100; return <tr key={h.id}><td><b>{h.name}</b><small>{h.id}</small></td><td>{h.type}</td><td>{money(h.shares)}</td><td>{money(h.avgCost)}</td><td>{money(h.currentPrice)}</td><td className={pnl>=0?'up':'down'}>{pnl>=0?'+':''}{money(pnl)}<small>{rate.toFixed(2)}%</small></td><td>{rate>12?'分批停利':rate<-8?'檢查停損':'續抱觀察'}</td><td><button className="icon" onClick={()=>setHoldings(holdings.filter(x=>x.id!==h.id))}><Trash2 size={16}/></button></td></tr>})}</tbody></table></div>
 <div className="card"><h2><Plus size={20}/>新增庫存</h2>{['id:代號','name:名稱','shares:數量','avgCost:平均成本','currentPrice:目前價格'].map(x=>{const [k,l]=x.split(':');return <label key={k}>{l}<input type={['shares','avgCost','currentPrice'].includes(k)?'number':'text'} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>})}<label>類型<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>台股</option><option>ETF</option><option>基金</option></select></label><button onClick={add} className="full">加入庫存</button></div></section>
 <section className="card"><h2><Target size={20}/>庫存優化建議</h2><div className="advice">{adv.map(a=><div key={a[0]}><h3>{a[0]}</h3><p>{a[1]}</p></div>)}</div></section>
 </main></div>;
}
function Metric({icon,title,value,note}){return <div className="card metric"><span>{icon}</span><p>{title}</p><h2>{value}</h2><small>{note}</small></div>}
function Info({title,value}){return <div><small>{title}</small><b>{value}</b></div>}
createRoot(document.getElementById('root')).render(<App/>);
