import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import * as XLSX from 'xlsx'
import {
  TrendingUp,
  TrendingDown,
  Search,
  Wallet,
  Newspaper,
  Star,
  PieChart,
  AlertTriangle,
  Plus,
  Trash2,
  BarChart3,
  Target,
  RefreshCw,
  Upload,
  CheckCircle2,
  Pencil,
  LineChart,
} from 'lucide-react'
import './styles.css'

const STORAGE_KEY = 'tw-invest-dashboard-portfolio'

const recommendations = [
  {
    id: '2330',
    name: '台積電',
    type: '台股',
    price: 980,
    trendScore: 92,
    topicScore: 88,
    signal: '偏多觀察',
    reason: 'AI、先進製程、外資關注度高，短線量能仍強。',
    buyZone: '940 - 960',
    sellZone: '1030 - 1080',
    risk: '估值偏高，若跌破月線需降風險。',
  },
  {
    id: '0050',
    name: '元大台灣50',
    type: 'ETF',
    price: 185.4,
    trendScore: 82,
    topicScore: 73,
    signal: '穩健加碼',
    reason: '大盤權值股趨勢仍偏多，適合長期核心配置。',
    buyZone: '178 - 182',
    sellZone: '195 - 200',
    risk: '短線受大盤回檔影響較大。',
  },
  {
    id: '00878',
    name: '國泰永續高股息',
    type: 'ETF',
    price: 22.8,
    trendScore: 68,
    topicScore: 61,
    signal: '持有觀察',
    reason: '高股息題材穩定，但資金熱度較成長股弱。',
    buyZone: '21.8 - 22.2',
    sellZone: '24.0 - 24.5',
    risk: '配息政策、成分股調整會影響評價。',
  },
  {
    id: '科技基金A',
    name: '全球AI科技基金',
    type: '基金',
    price: 36.2,
    trendScore: 87,
    topicScore: 94,
    signal: '分批布局',
    reason: 'AI、半導體、雲端題材延續，但波動較高。',
    buyZone: '34 - 35.5',
    sellZone: '39 - 41',
    risk: '美股科技股修正時回檔幅度可能較大。',
  },
]

const defaultHoldings = [
  {
    id: '2330',
    name: '台積電',
    type: '台股',
    shares: 2,
    avgCost: 920,
    currentPrice: 980,
    weight: 42,
  },
  {
    id: '00878',
    name: '國泰永續高股息',
    type: 'ETF',
    shares: 1000,
    avgCost: 23.1,
    currentPrice: 22.8,
    weight: 30,
  },
  {
    id: '科技基金A',
    name: '全球AI科技基金',
    type: '基金',
    shares: 80,
    avgCost: 32,
    currentPrice: 36.2,
    weight: 28,
  },
]

const topics = [
  {
    title: 'AI 伺服器與半導體',
    heat: 94,
    impact: '台積電、AI基金、電子權值股受惠',
  },
  {
    title: '降息預期與資金行情',
    heat: 78,
    impact: '成長股與科技型基金評價上修',
  },
  {
    title: '高股息ETF配息變化',
    heat: 66,
    impact: '高股息ETF需觀察填息與配息穩定性',
  },
]

const klineData = [
  { date: '04/01', close: 890, ma5: 900, ma20: 875 },
  { date: '04/08', close: 915, ma5: 905, ma20: 882 },
  { date: '04/15', close: 940, ma5: 930, ma20: 895 },
  { date: '04/22', close: 965, ma5: 950, ma20: 910 },
  { date: '04/29', close: 980, ma5: 970, ma20: 925 },
]

function money(value) {
  return Number(value || 0).toLocaleString('zh-TW', {
    maximumFractionDigits: 2,
  })
}

function App() {
  const [keyword, setKeyword] = useState('')
  const [importPreview, setImportPreview] = useState([])
  const [holdings, setHoldings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : defaultHoldings
    } catch {
      return defaultHoldings
    }
  })

  const [form, setForm] = useState({
    id: '',
    name: '',
    type: '台股',
    shares: '',
    avgCost: '',
    currentPrice: '',
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings))
  }, [holdings])

  const filteredRecommendations = useMemo(() => {
    const text = keyword.trim().toLowerCase()
    if (!text) return recommendations

    return recommendations.filter(
      (item) =>
        item.id.toLowerCase().includes(text) ||
        item.name.toLowerCase().includes(text) ||
        item.type.toLowerCase().includes(text)
    )
  }, [keyword])

  const portfolio = useMemo(() => {
    const totalCost = holdings.reduce(
      (sum, h) => sum + Number(h.shares) * Number(h.avgCost),
      0
    )

    const totalValue = holdings.reduce(
      (sum, h) => sum + Number(h.shares) * Number(h.currentPrice),
      0
    )

    const pnl = totalValue - totalCost
    const pnlRate = totalCost === 0 ? 0 : (pnl / totalCost) * 100

    const techWeight = holdings
      .filter(
        (h) =>
          h.name.includes('台積') ||
          h.name.includes('科技') ||
          h.name.includes('AI')
      )
      .reduce((sum, h) => sum + Number(h.weight || 0), 0)

    return {
      totalCost,
      totalValue,
      pnl,
      pnlRate,
      techWeight,
    }
  }, [holdings])

  const healthScore = useMemo(() => {
    let score = 100

    if (portfolio.techWeight > 60) score -= 15
    if (portfolio.pnlRate < -10) score -= 20
    if (portfolio.pnlRate > 20) score += 5
    if (holdings.length < 3) score -= 10

    return Math.max(0, Math.min(100, score))
  }, [portfolio, holdings.length])

  const portfolioAdvice = useMemo(() => {
    const advice = []

    if (portfolio.techWeight > 60) {
      advice.push({
        level: '風險提醒',
        text: '科技與 AI 曝險偏高，若短線漲多可分批停利，降低單一題材回檔風險。',
      })
    }

    if (holdings.some((h) => h.id === '00878' || h.name.includes('高股息'))) {
      advice.push({
        level: '配置建議',
        text: '高股息部位適合當防守核心，但若報酬落後大盤，可評估降低比重並轉向市值型 ETF。',
      })
    }

    if (portfolio.pnlRate > 10) {
      advice.push({
        level: '獲利管理',
        text: '整體已有不錯獲利，可設定移動停利，例如跌破 20 日線或回吐三分之一獲利時調節。',
      })
    } else if (portfolio.pnlRate < -5) {
      advice.push({
        level: '停損檢查',
        text: '整體虧損擴大，應檢查是否跌破原本買進理由，避免越跌越攤造成資金卡死。',
      })
    } else {
      advice.push({
        level: '持續觀察',
        text: '目前損益接近中性，建議等待明確突破或回測支撐後再加碼。',
      })
    }

    return advice
  }, [holdings, portfolio])

  const addHolding = () => {
    if (!form.id || !form.name || !form.shares || !form.avgCost || !form.currentPrice) {
      alert('請完整填寫庫存資料')
      return
    }

    setHoldings((prev) => [
      ...prev,
      {
        ...form,
        shares: Number(form.shares),
        avgCost: Number(form.avgCost),
        currentPrice: Number(form.currentPrice),
        weight: 0,
      },
    ])

    setForm({
      id: '',
      name: '',
      type: '台股',
      shares: '',
      avgCost: '',
      currentPrice: '',
    })
  }

  const removeHolding = (id) => {
    setHoldings((prev) => prev.filter((item) => item.id !== id))
  }

  const updateHolding = (id, field, value) => {
    setHoldings((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: ['shares', 'avgCost', 'currentPrice', 'weight'].includes(field)
                ? Number(value)
                : value,
            }
          : item
      )
    )
  }

  const handleExcelImport = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet)

      const mapped = rows
        .map((row) => ({
          id: String(row['代號'] || row['Symbol'] || '').trim(),
          name: String(row['名稱'] || row['Name'] || '').trim(),
          type: String(row['類型'] || row['Type'] || '台股').trim(),
          shares: Number(row['數量'] || row['Shares'] || 0),
          avgCost: Number(row['平均成本'] || row['AvgCost'] || 0),
          currentPrice: Number(
            row['目前價格'] ||
              row['現價'] ||
              row['CurrentPrice'] ||
              0
          ),
          weight: Number(row['權重'] || row['Weight'] || 0),
        }))
        .filter((row) => row.id && row.name && row.shares > 0 && row.avgCost > 0)

      setImportPreview(mapped)
    }

    reader.readAsArrayBuffer(file)
    event.target.value = ''
  }

  const confirmImport = () => {
    setHoldings((prev) => [...prev, ...importPreview])
    setImportPreview([])
  }

  const resetDemoData = () => {
    setHoldings(defaultHoldings)
    setImportPreview([])
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>台股・基金策略分析平台</h1>
          <p>整合近期走勢、熱門題材、個人庫存與買賣點建議</p>
        </div>

        <div className="headerActions">
          <button className="btn secondary" onClick={resetDemoData}>
            <RefreshCw size={16} />
            重置 Demo
          </button>

          <button className="btn">
            <RefreshCw size={16} />
            更新分析
          </button>
        </div>
      </header>

      <main className="main">
        <section className="metrics">
          <Metric
            icon={<Wallet />}
            title="庫存市值"
            value={`$${money(portfolio.totalValue)}`}
            note="依目前價格估算"
          />

          <Metric
            icon={portfolio.pnl >= 0 ? <TrendingUp /> : <TrendingDown />}
            title="總損益"
            value={`${portfolio.pnl >= 0 ? '+' : ''}${money(portfolio.pnl)}`}
            note={`${portfolio.pnlRate.toFixed(2)}%`}
          />

          <Metric
            icon={<PieChart />}
            title="科技題材曝險"
            value={`${portfolio.techWeight}%`}
            note="台積電 / 科技基金 / AI 相關"
          />

          <Metric
            icon={<Target />}
            title="推薦候選"
            value={`${recommendations.length} 檔`}
            note="依趨勢與話題分數排序"
          />

          <Metric
            icon={<CheckCircle2 />}
            title="庫存健康度"
            value={`${healthScore} 分`}
            note={healthScore >= 80 ? '配置健康' : healthScore >= 60 ? '可再優化' : '風險偏高'}
          />
        </section>

        <section className="grid twoOne">
          <div className="card wide">
            <div className="sectionTitle">
              <div>
                <h2>
                  <Star size={20} />
                  推薦分析
                </h2>
                <p>依最近走勢、題材熱度、風險提示產生候選清單</p>
              </div>

              <div className="searchBox">
                <Search size={16} />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="搜尋代號 / 名稱 / 類型"
                />
              </div>
            </div>

            <div className="recommendList">
              {filteredRecommendations.map((item) => (
                <div className="recommendCard" key={item.id}>
                  <div className="recommendTop">
                    <div>
                      <h3>
                        {item.name}
                        <span>{item.id}</span>
                      </h3>

                      <div className="tags">
                        <span>{item.type}</span>
                        <span className="signal">{item.signal}</span>
                      </div>

                      <p>{item.reason}</p>
                    </div>

                    <div className="priceBox">
                      <small>目前價格</small>
                      <b>{item.price}</b>
                    </div>
                  </div>

                  <div className="infoGrid">
                    <Info title="走勢分數" value={`${item.trendScore}/100`} />
                    <Info title="話題分數" value={`${item.topicScore}/100`} />
                    <Info title="建議買進區" value={item.buyZone} />
                    <Info title="建議停利區" value={item.sellZone} />
                  </div>

                  <div className="risk">
                    <AlertTriangle size={16} />
                    {item.risk}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>
              <Newspaper size={20} />
              近期市場話題
            </h2>
            <p>後續可串新聞、PTT、Google Trends 或券商研究資料</p>

            <div className="topicList">
              {topics.map((topic) => (
                <div className="topic" key={topic.title}>
                  <div>
                    <b>{topic.title}</b>
                    <span>{topic.heat}</span>
                  </div>
                  <div className="bar">
                    <i style={{ width: `${topic.heat}%` }} />
                  </div>
                  <p>{topic.impact}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid twoOne">
          <div className="card wide">
            <div className="sectionTitle">
              <div>
                <h2>
                  <BarChart3 size={20} />
                  我的庫存
                </h2>
                <p>可手動異動，資料會自動保存到 localStorage</p>
              </div>

              <label className="uploadBtn">
                <Upload size={16} />
                匯入 Excel
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleExcelImport}
                />
              </label>
            </div>

            {importPreview.length > 0 && (
              <div className="importPreview">
                <div>
                  <b>匯入預覽：{importPreview.length} 筆</b>
                  <p>確認格式正確後再加入庫存。</p>
                </div>

                <div>
                  <button className="btn secondary" onClick={() => setImportPreview([])}>
                    取消
                  </button>
                  <button className="btn" onClick={confirmImport}>
                    確認匯入
                  </button>
                </div>
              </div>
            )}

            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>標的</th>
                    <th>類型</th>
                    <th>數量</th>
                    <th>均價</th>
                    <th>現價</th>
                    <th>損益</th>
                    <th>建議</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {holdings.map((h) => {
                    const pnl =
                      Number(h.shares) *
                      (Number(h.currentPrice) - Number(h.avgCost))

                    const pnlRate =
                      Number(h.avgCost) === 0
                        ? 0
                        : ((Number(h.currentPrice) - Number(h.avgCost)) /
                            Number(h.avgCost)) *
                          100

                    const advice =
                      pnlRate > 12
                        ? '分批停利'
                        : pnlRate < -8
                        ? '檢查停損'
                        : '續抱觀察'

                    return (
                      <tr key={h.id}>
                        <td>
                          <b>{h.name}</b>
                          <small>{h.id}</small>
                        </td>
                        <td>{h.type}</td>
                        <td>
                          <EditNumber
                            value={h.shares}
                            onChange={(v) => updateHolding(h.id, 'shares', v)}
                          />
                        </td>
                        <td>
                          <EditNumber
                            value={h.avgCost}
                            onChange={(v) => updateHolding(h.id, 'avgCost', v)}
                          />
                        </td>
                        <td>
                          <EditNumber
                            value={h.currentPrice}
                            onChange={(v) =>
                              updateHolding(h.id, 'currentPrice', v)
                            }
                          />
                        </td>
                        <td className={pnl >= 0 ? 'up' : 'down'}>
                          {pnl >= 0 ? '+' : ''}
                          {money(pnl)}
                          <small>{pnlRate.toFixed(2)}%</small>
                        </td>
                        <td>{advice}</td>
                        <td>
                          <button
                            className="iconBtn"
                            onClick={() => removeHolding(h.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h2>
              <Plus size={20} />
              新增庫存
            </h2>

            <div className="form">
              <Input
                label="代號"
                value={form.id}
                onChange={(v) => setForm({ ...form, id: v })}
              />

              <Input
                label="名稱"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
              />

              <label>
                類型
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option>台股</option>
                  <option>ETF</option>
                  <option>基金</option>
                </select>
              </label>

              <Input
                label="數量"
                type="number"
                value={form.shares}
                onChange={(v) => setForm({ ...form, shares: v })}
              />

              <Input
                label="平均成本"
                type="number"
                value={form.avgCost}
                onChange={(v) => setForm({ ...form, avgCost: v })}
              />

              <Input
                label="目前價格"
                type="number"
                value={form.currentPrice}
                onChange={(v) => setForm({ ...form, currentPrice: v })}
              />

              <button className="btn full" onClick={addHolding}>
                加入庫存
              </button>
            </div>
          </div>
        </section>

        <section className="card">
          <h2>
            <LineChart size={20} />
            K 線與策略雛形
          </h2>
          <p>目前先用示意資料，下一步可接 Python API 回傳真實 OHLC、MA、買賣點。</p>

          <div className="klineGrid">
            {klineData.map((item) => (
              <div className="klineCard" key={item.date}>
                <small>{item.date}</small>
                <b>收盤 {item.close}</b>
                <p>
                  MA5 {item.ma5} / MA20 {item.ma20}
                </p>
                <span className={item.close > item.ma20 ? 'up' : 'down'}>
                  {item.close > item.ma20 ? '站上月線，偏多' : '跌破月線，保守'}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>
            <Target size={20} />
            庫存優化建議
          </h2>

          <div className="adviceGrid">
            {portfolioAdvice.map((item) => (
              <div className="advice" key={item.level}>
                <h3>{item.level}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function Metric({ icon, title, value, note }) {
  return (
    <div className="card metric">
      <div className="metricIcon">{icon}</div>
      <small>{title}</small>
      <b>{value}</b>
      <span>{note}</span>
    </div>
  )
}

function Info({ title, value }) {
  return (
    <div className="info">
      <small>{title}</small>
      <b>{value}</b>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text' }) {
  return (
    <label>
      {label}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function EditNumber({ value, onChange }) {
  return (
    <div className="editNumber">
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} />
      <Pencil size={12} />
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)